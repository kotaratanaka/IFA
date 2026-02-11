import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Upload, AlertTriangle, FileText, Image as ImageIcon, Search, Loader2, ChevronDown, ChevronUp, MapPin, Users, Sparkles } from 'lucide-react';
import { ClientProfile, Asset, ProposalSettings, ASSET_TYPES } from '../types';
import { POPULAR_ASSETS, StockDefinition } from '../utils/assetList';
import { parsePortfolioDocument } from '../services/geminiService';

interface InputSectionProps {
  onNext: (profile: ClientProfile, settings: ProposalSettings) => void;
  initialProfile?: ClientProfile | null;
  initialSettings?: ProposalSettings | null;
}

const SUB_CATEGORIES: Record<string, string[]> = {
  'Stock': [
      'テクノロジー', '半導体', 
      '自動車', '機械', '電機・精密', 
      '商社', '銀行', '金融', '不動産', 
      '医薬品', 'ヘルスケア', 
      '食品', '小売', '消費財', 'サービス',
      'エネルギー', '素材', '化学', '鉄鋼', 
      '建設', '運輸', '通信', '電力・ガス',
      '高配当株', 'バリュー株', 'グロース株'
  ],
  'Mutual Fund': ['全世界株式', '米国株式 (S&P500)', '先進国株式', '新興国株式', '国内株式', 'バランス型', '債券型', 'REIT'],
  'Bond': ['米国国債', '国内国債', '先進国社債', 'ハイイールド債'],
  'ETF': ['高配当', 'グロース', 'セクター別', 'コモディティ (金など)', '債券ETF'],
  'Insurance': ['終身保険', '医療保険', '個人年金保険', '変額保険']
};

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

const FAMILY_OPTIONS = [
    "独身",
    "独身 (子供あり)",
    "既婚 (子供なし)",
    "既婚 (子供あり)",
    "既婚 (子供独立済)",
    "高齢夫婦のみ",
    "二世帯同居",
    "その他"
];

const InputSection: React.FC<InputSectionProps> = ({ onNext, initialProfile, initialSettings }) => {
  const [profile, setProfile] = useState<ClientProfile>(initialProfile || {
    age: 50,
    gender: '男性',
    region: '東京都',
    riskTolerance: '中 (バランス)',
    investmentHorizon: '中期 (3-10年)',
    goals: '資産保全と適度な成長',
    familyStructure: '既婚 (子供あり)',
    currentHoldings: []
  });

  const [settings, setSettings] = useState<ProposalSettings>(initialSettings || {
    proposalCounts: {
      'Stock': 3,
      'Mutual Fund': 0,
      'Bond': 0,
      'Insurance': 0,
      'ETF': 0
    },
    proposalDetails: {
      'Stock': [],
      'Mutual Fund': [],
      'Bond': [],
      'Insurance': [],
      'ETF': []
    }
  });

  const [newHolding, setNewHolding] = useState<Partial<Asset>>({ 
    name: '', code: '', type: 'Stock', amount: 0, quantity: 0, profitLoss: 0, currency: 'JPY' 
  });
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRegionSuggestions, setShowRegionSuggestions] = useState(false);
  const [filteredAssets, setFilteredAssets] = useState<StockDefinition[]>([]);
  const [filteredPrefectures, setFilteredPrefectures] = useState<string[]>(PREFECTURES);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Totals Calculation
  const totalAmount = profile.currentHoldings.reduce((sum, h) => sum + (h.amount || 0), 0);
  const totalProfitLoss = profile.currentHoldings.reduce((sum, h) => sum + (h.profitLoss || 0), 0);
  const totalInvested = totalAmount - totalProfitLoss;
  const totalReturnPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
        const base64Data = await fileToBase64(file);
        const parseResult = await parsePortfolioDocument(base64Data, file.type);
        
        // Merge Assets
        const extractedAssets = parseResult.assets || [];
        const newAssetsWithIds = extractedAssets.map((a, index) => ({
            ...a,
            id: `imported-${Date.now()}-${index}`,
            description: `Imported from ${file.name}`
        }));

        if (newAssetsWithIds.length === 0) {
             alert("資産情報を読み取れませんでした。画像が鮮明か、または対応している形式かご確認ください。");
        }

        setProfile(prev => {
            // Merge Profile Info if available
            const newProfile = { ...prev };
            if (parseResult.extractedProfile) {
               const p = (parseResult as any).profile;
               if (p) {
                   if (p.age) newProfile.age = p.age;
                   if (p.gender) newProfile.gender = p.gender;
                   
                   // Attempt to match fuzzy region to prefecture list
                   if (p.region) {
                       const match = PREFECTURES.find(pref => p.region.includes(pref) || pref.includes(p.region));
                       newProfile.region = match || p.region;
                   }
                   
                   // Attempt to match family structure
                   if (p.familyStructure) {
                        const match = FAMILY_OPTIONS.find(f => p.familyStructure.includes(f));
                        newProfile.familyStructure = match || p.familyStructure;
                   }

                   if (p.riskTolerance) newProfile.riskTolerance = p.riskTolerance;
                   if (p.goals) newProfile.goals = p.goals;
               }
            }
            
            return { 
                ...newProfile, 
                currentHoldings: [...prev.currentHoldings, ...newAssetsWithIds] 
            };
        });

    } catch (error) {
        console.error("Upload failed", error);
        alert("ファイルの解析に失敗しました。");
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // File Import Handler (Gemini 3.0 Pro)
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFile(files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
          await processFile(files[0]);
      }
  };

  const handleAssetSearch = (input: string) => {
    setNewHolding(prev => ({ ...prev, name: input }));
    if (!input) { setShowSuggestions(false); return; }
    const lower = input.toLowerCase();
    
    const filtered = POPULAR_ASSETS.filter(a => 
      a.name.toLowerCase().includes(lower) || 
      a.code.toLowerCase().includes(lower)
    );
    
    setFilteredAssets(filtered);
    setShowSuggestions(true);
  };

  const handleRegionChange = (input: string) => {
      setProfile({...profile, region: input});
      const filtered = PREFECTURES.filter(p => p.includes(input));
      setFilteredPrefectures(filtered);
      setShowRegionSuggestions(true);
  };

  const selectRegion = (pref: string) => {
      setProfile({...profile, region: pref});
      setShowRegionSuggestions(false);
  };

  const selectAsset = (asset: StockDefinition) => {
    setNewHolding({ ...newHolding, name: asset.name, code: asset.code, type: asset.type, currency: asset.currency });
    setShowSuggestions(false);
  };

  const addHolding = () => {
    if (!newHolding.name) return;
    setProfile(prev => ({
      ...prev,
      currentHoldings: [...prev.currentHoldings, { ...newHolding, id: Date.now().toString(), confidence: 1.0 } as Asset]
    }));
    setNewHolding({ name: '', code: '', type: 'Stock', amount: 0, quantity: 0, profitLoss: 0, currency: 'JPY' });
  };

  const handleProposalCountChange = (type: string, count: number) => {
    setSettings(prev => ({
      ...prev,
      proposalCounts: {
        ...prev.proposalCounts,
        [type]: count
      }
    }));
  };

  const toggleProposalType = (type: string) => {
    setSettings(prev => {
      const currentCount = prev.proposalCounts[type] || 0;
      return {
        ...prev,
        proposalCounts: {
          ...prev.proposalCounts,
          [type]: currentCount > 0 ? 0 : 1 // Toggle between 0 and 1 (default)
        }
      };
    });
  };

  const toggleSubCategory = (type: string, sub: string) => {
      setSettings(prev => {
          const currentDetails = prev.proposalDetails?.[type] || [];
          const newDetails = currentDetails.includes(sub)
            ? currentDetails.filter(d => d !== sub)
            : [...currentDetails, sub];
          
          return {
              ...prev,
              proposalDetails: {
                  ...prev.proposalDetails,
                  [type]: newDetails
              }
          };
      });
  };

  const handleAmountChange = (val: string, field: string, updateFn: (v: number) => void) => {
    // Convert full-width numbers to half-width
    const normalized = val.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/,/g, '');
    
    if (normalized === '' || normalized === '-') {
        updateFn(0);
        return;
    }
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
        updateFn(num);
    }
  };

  const updateHoldingRow = (id: string, field: keyof Asset, value: any) => {
      setProfile(prev => ({
          ...prev,
          currentHoldings: prev.currentHoldings.map(h => 
              h.id === id ? { ...h, [field]: value } : h
          )
      }));
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) {
          setShowRegionSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="bg-slate-800 p-4 text-white">
        <h2 className="text-xl font-bold">Step 1: 基本情報・現状ポートフォリオ入力</h2>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-8">
        
        {/* Quick Import with Drag & Drop */}
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-100' : 'border-blue-200 bg-blue-50'
            }`}
        >
            <h3 className="font-bold text-blue-900 mb-2">クイックインポート (Gemini 3.0 AI解析)</h3>
            <p className="text-sm text-blue-600 mb-4">顧客情報や資産レポートの画像/PDF/CSVをドラッグ＆ドロップ、またはアップロード</p>
            <div className="flex gap-4">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept=".csv,.pdf,image/*"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded shadow text-sm hover:bg-gray-50 text-slate-700 disabled:opacity-70 transition-all"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} 
                    {isUploading ? "AI解析中..." : "ファイルを選択"}
                </button>
                <div className="flex gap-2 text-slate-400 items-center">
                    <FileText className="w-5 h-5"/>
                    <ImageIcon className="w-5 h-5"/>
                </div>
            </div>
        </div>

        {/* Basic Info */}
        <section>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">基本情報</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">年齢</label>
                    <input type="number" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">性別</label>
                    <select className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})}>
                        <option value="男性">男性</option>
                        <option value="女性">女性</option>
                        <option value="その他">その他</option>
                    </select>
                </div>
                
                {/* Region Autocomplete */}
                <div ref={regionRef} className="relative">
                    <label className="text-xs font-bold text-slate-500 block mb-1">居住地域 (都道府県)</label>
                    <div className="relative">
                        <MapPin className="w-4 h-4 text-gray-400 absolute left-2 top-2.5 pointer-events-none"/>
                        <input 
                            type="text" 
                            className="w-full border rounded p-2 pl-8 text-sm focus:ring-2 focus:ring-blue-100 outline-none" 
                            value={profile.region} 
                            onChange={e => handleRegionChange(e.target.value)} 
                            onFocus={() => { setFilteredPrefectures(PREFECTURES); setShowRegionSuggestions(true); }}
                            placeholder="例: 東京都"
                        />
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-2.5 pointer-events-none"/>
                    </div>
                    {showRegionSuggestions && (
                        <div className="absolute z-20 w-full bg-white border shadow-xl max-h-60 overflow-auto rounded mt-1">
                            {filteredPrefectures.map(pref => (
                                <div 
                                    key={pref} 
                                    onClick={() => selectRegion(pref)} 
                                    className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                >
                                    {pref}
                                </div>
                            ))}
                            {filteredPrefectures.length === 0 && (
                                <div className="p-2 text-xs text-gray-400">候補が見つかりません</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Family Structure Select */}
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">家族構成</label>
                    <div className="relative">
                        <Users className="w-4 h-4 text-gray-400 absolute left-2 top-2.5 pointer-events-none"/>
                        <select 
                            className="w-full border rounded p-2 pl-8 text-sm appearance-none focus:ring-2 focus:ring-blue-100 outline-none" 
                            value={profile.familyStructure} 
                            onChange={e => setProfile({...profile, familyStructure: e.target.value})}
                        >
                            {FAMILY_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-2.5 pointer-events-none"/>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">リスク許容度</label>
                    <select className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={profile.riskTolerance} onChange={e => setProfile({...profile, riskTolerance: e.target.value})}>
                        <option value="低 (保守的)">低 (保守的)</option>
                        <option value="中 (バランス)">中 (バランス)</option>
                        <option value="高 (積極的)">高 (積極的)</option>
                    </select>
                </div>
                <div className="col-span-1 md:col-span-1">
                    {/* Spacer */}
                </div>
                <div className="col-span-2 md:col-span-3">
                    <label className="text-xs font-bold text-slate-500 block mb-1">投資目標</label>
                    <textarea 
                        className="w-full border rounded p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-blue-100 outline-none" 
                        value={profile.goals} 
                        onChange={e => setProfile({...profile, goals: e.target.value})}
                        placeholder="例: 老後資金の形成のため、安定的なインカムゲインと長期的な成長を狙いたい。"
                    />
                </div>
            </div>
        </section>

        {/* Current Holdings */}
        <section>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">保有資産 (手入力 / 修正)</h3>
            
            {/* Input Row */}
            <div className="bg-gray-50 p-3 rounded mb-2 grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3 relative" ref={autocompleteRef}>
                     <label className="text-xs font-bold text-gray-500">銘柄名 / コード</label>
                     <div className="relative">
                        <input 
                            type="text" 
                            className="w-full border rounded p-1" 
                            value={newHolding.name} 
                            onChange={e => handleAssetSearch(e.target.value)} 
                            placeholder="例: トヨタ または 7203"
                            onFocus={() => { if(newHolding.name) setShowSuggestions(true) }}
                        />
                        {showSuggestions && filteredAssets.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border shadow-lg max-h-60 overflow-auto rounded mt-1">
                                {filteredAssets.slice(0, 50).map(a => (
                                    <div 
                                        key={a.code} 
                                        onClick={() => selectAsset(a)} 
                                        className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                    >
                                        <div className="font-bold text-slate-700">{a.name}</div>
                                        <div className="text-xs text-slate-400 flex justify-between">
                                            <span>{a.code}</span>
                                            <span className="bg-gray-100 px-1 rounded">{a.type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showSuggestions && filteredAssets.length === 0 && newHolding.name && (
                             <div className="absolute z-10 w-full bg-white border shadow-lg p-2 text-xs text-gray-400 rounded mt-1">
                                候補が見つかりません
                             </div>
                        )}
                     </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500">種類</label>
                  <select className="w-full border rounded p-1" value={newHolding.type} onChange={e => setNewHolding({...newHolding, type: e.target.value})}>
                    {Object.entries(ASSET_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500">数量 (口/株)</label>
                    <input 
                        type="text" 
                        className="w-full border rounded p-1 text-right" 
                        value={(newHolding.quantity || 0).toLocaleString()} 
                        onChange={e => handleAmountChange(e.target.value, 'quantity', (v) => setNewHolding({ ...newHolding, quantity: v }))}
                        placeholder="0"
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500">評価額</label>
                    <input 
                        type="text" 
                        className="w-full border rounded p-1 text-right" 
                        value={(newHolding.amount || 0).toLocaleString()} 
                        onChange={e => handleAmountChange(e.target.value, 'amount', (v) => setNewHolding({ ...newHolding, amount: v }))}
                        placeholder="0"
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500">評価損益</label>
                    <input 
                        type="text" 
                        className="w-full border rounded p-1 text-right" 
                        value={(newHolding.profitLoss || 0).toLocaleString()} 
                        onChange={e => handleAmountChange(e.target.value, 'profitLoss', (v) => setNewHolding({ ...newHolding, profitLoss: v }))}
                        placeholder="0"
                    />
                </div>
                <div className="col-span-1"><button onClick={addHolding} disabled={!newHolding.name} className="w-full bg-green-600 text-white rounded p-1"><Plus className="mx-auto w-4 h-4"/></button></div>
            </div>

            {/* List with Editable Rows */}
            <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">銘柄</th><th className="p-2">種類</th><th className="p-2 text-right">数量</th><th className="p-2 text-right">評価額</th><th className="p-2 text-right">損益</th><th className="p-2"></th></tr></thead>
                    <tbody>
                        {profile.currentHoldings.map(h => {
                            const invested = (h.amount || 0) - (h.profitLoss || 0);
                            const returnPct = invested > 0 ? ((h.profitLoss || 0) / invested) * 100 : 0;
                            return (
                                <tr key={h.id} className={`border-b ${h.confidence && h.confidence < 0.8 ? 'bg-orange-50' : ''}`}>
                                    <td className="p-2">
                                        <div className="flex items-center gap-2">
                                            {h.confidence && h.confidence < 0.8 && (
                                                <div className="group relative">
                                                    <AlertTriangle className="w-4 h-4 text-orange-500 cursor-help"/>
                                                    <div className="absolute left-0 bottom-full mb-1 w-48 bg-white border border-orange-200 shadow p-2 rounded text-xs hidden group-hover:block z-10">
                                                        読み取り精度が低いです。<br/>「{h.name}」で合っていますか？
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <input 
                                                type="text" 
                                                value={h.name} 
                                                onChange={(e) => updateHoldingRow(h.id, 'name', e.target.value)}
                                                className="w-full font-bold bg-transparent border-none focus:ring-1 focus:ring-blue-300 rounded px-1"
                                                />
                                                <input 
                                                type="text" 
                                                value={h.code || ''} 
                                                onChange={(e) => updateHoldingRow(h.id, 'code', e.target.value)}
                                                className="w-full text-xs text-gray-500 bg-transparent border-none focus:ring-1 focus:ring-blue-300 rounded px-1"
                                                placeholder="コード"
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center text-xs rounded">
                                    <select 
                                        value={h.type} 
                                        onChange={(e) => updateHoldingRow(h.id, 'type', e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-300 rounded p-1 text-center"
                                    >
                                        {Object.entries(ASSET_TYPES).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                    </td>
                                    <td className="p-2 text-right">
                                        <input 
                                        type="text" 
                                        value={(h.quantity || 0).toLocaleString()} 
                                        onChange={(e) => handleAmountChange(e.target.value, 'quantity', (v) => updateHoldingRow(h.id, 'quantity', v))}
                                        className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-blue-300 rounded px-1"
                                        placeholder="-"
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <input 
                                        type="text" 
                                        value={(h.amount || 0).toLocaleString()} 
                                        onChange={(e) => handleAmountChange(e.target.value, 'amount', (v) => updateHoldingRow(h.id, 'amount', v))}
                                        className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-blue-300 rounded px-1"
                                        />
                                        <span className="text-xs text-gray-400 block">{h.currency}</span>
                                    </td>
                                    <td className="p-2 text-right">
                                        <input 
                                            type="text" 
                                            value={(h.profitLoss || 0).toLocaleString()} 
                                            onChange={(e) => handleAmountChange(e.target.value, 'profitLoss', (v) => updateHoldingRow(h.id, 'profitLoss', v))}
                                            className={`w-full text-right bg-transparent border-none focus:ring-1 focus:ring-blue-300 rounded px-1 ${h.profitLoss! > 0 ? 'text-green-600' : 'text-red-600'}`}
                                        />
                                        {h.profitLoss !== undefined && (h.amount || 0) > 0 && (
                                            <span className={`text-xs block ${returnPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {returnPct > 0 ? '+' : ''}{returnPct.toFixed(1)}%
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2 text-right"><button onClick={() => setProfile(p => ({...p, currentHoldings: p.currentHoldings.filter(x => x.id !== h.id)}))}><Trash2 className="w-4 h-4 text-gray-400"/></button></td>
                                </tr>
                            );
                        })}
                        {profile.currentHoldings.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">資産が登録されていません。<br/>上のフォームから追加するか、ファイルをインポートしてください。</td></tr>
                        )}
                    </tbody>
                    {/* Total Footer Row */}
                    {profile.currentHoldings.length > 0 && (
                         <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                            <tr>
                                <td colSpan={3} className="p-3 text-right text-slate-600">合計 (Total)</td>
                                <td className="p-3 text-right text-slate-800">
                                    {(totalAmount || 0).toLocaleString()}
                                    <span className="block text-xs font-normal text-gray-500">JPY</span>
                                </td>
                                <td className="p-3 text-right">
                                    <div className={`${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {totalProfitLoss > 0 ? '+' : ''}{(totalProfitLoss || 0).toLocaleString()}
                                    </div>
                                    <div className={`text-xs ${totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {totalReturnPct > 0 ? '+' : ''}{totalReturnPct.toFixed(1)}%
                                    </div>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </section>

        {/* Proposal Scope */}
        <section>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">提案設定</h3>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-bold text-gray-600 block mb-2">提案するアセットクラスと詳細設定</label>
                    <div className="grid grid-cols-1 gap-4">
                        {['Stock', 'Mutual Fund', 'Bond', 'Insurance', 'ETF'].map(type => {
                            const count = settings.proposalCounts[type] || 0;
                            const isChecked = count > 0;
                            const label = ASSET_TYPES[type as keyof typeof ASSET_TYPES] || type;
                            const subCategories = SUB_CATEGORIES[type] || [];
                            const selectedDetails = settings.proposalDetails?.[type] || [];

                            return (
                              <div key={type} className={`border rounded-lg transition-colors overflow-hidden ${isChecked ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}`}>
                                  {/* Header */}
                                  <div className={`flex items-center justify-between px-4 py-3 bg-white ${isChecked ? 'bg-blue-50' : ''}`}>
                                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                                          <input 
                                            type="checkbox" 
                                            checked={isChecked} 
                                            onChange={() => toggleProposalType(type)} 
                                            className="w-4 h-4 text-blue-600"
                                          />
                                          <span className="font-medium text-slate-700">{label}</span>
                                      </label>
                                      {isChecked && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500">提案数:</span>
                                          <input 
                                            type="number" 
                                            min="1" 
                                            max="10" 
                                            value={count} 
                                            onChange={(e) => handleProposalCountChange(type, Math.max(1, parseInt(e.target.value) || 1))} 
                                            className="border rounded p-1 w-16 text-center text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      )}
                                  </div>

                                  {/* Sub-categories (Expanded when checked) */}
                                  {isChecked && subCategories.length > 0 && (
                                      <div className="px-8 py-3 bg-white border-t border-blue-100 animate-in slide-in-from-top-2 duration-200">
                                          <div className="text-xs font-bold text-gray-500 mb-2">希望するセクター・種別 (任意選択)</div>
                                          <div className="flex flex-wrap gap-2">
                                              {subCategories.map(sub => {
                                                  const isSelected = selectedDetails.includes(sub);
                                                  return (
                                                      <button 
                                                        key={sub}
                                                        onClick={() => toggleSubCategory(type, sub)}
                                                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                                      >
                                                          {sub}
                                                      </button>
                                                  )
                                              })}
                                          </div>
                                      </div>
                                  )}
                              </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>

        <div className="flex justify-end pt-4">
            <button 
                onClick={() => onNext(profile, settings)} 
                disabled={profile.currentHoldings.length === 0} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-lg shadow-lg font-bold hover:shadow-xl hover:scale-[1.02] transform transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Sparkles className="w-5 h-5" /> レポート生成 (実行)
            </button>
        </div>
      </div>
    </div>
  );
};
export default InputSection;