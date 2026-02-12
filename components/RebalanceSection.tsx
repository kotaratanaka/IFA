import React, { useState, useEffect, useRef } from 'react';
import { ClientProfile, Asset, ProposalSettings, ASSET_TYPES } from '../types';
import { getAssetRecommendations } from '../services/geminiService';
import { Sparkles, ArrowRight, Plus, Trash2, Loader2, ArrowLeft, Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { POPULAR_ASSETS, StockDefinition } from '../utils/assetList';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';

interface RebalanceSectionProps {
  profile: ClientProfile;
  settings: ProposalSettings;
  initialProposedAssets: Asset[];
  onBack: () => void;
  onGenerateReport: (proposedAssets: Asset[]) => void;
  isGenerating: boolean;
}

const RebalanceSection: React.FC<RebalanceSectionProps> = ({ profile, settings, initialProposedAssets, onBack, onGenerateReport, isGenerating }) => {
  const [recommendations, setRecommendations] = useState<Asset[]>([]);
  const [proposedAssets, setProposedAssets] = useState<Asset[]>(initialProposedAssets || []);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Manual Search State
  const [manualQuery, setManualQuery] = useState('');
  const [showManualSuggestions, setShowManualSuggestions] = useState(false);
  const [filteredManualAssets, setFilteredManualAssets] = useState<StockDefinition[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchRecs = async () => {
    setLoadingRecs(true);
    setError(null);
    try {
        // Passing a timestamp implies a fresh request logic in the service if needed, 
        // or simply re-calling the API allows the LLM to generate variations.
        const recs = await getAssetRecommendations(profile, settings);
        setRecommendations(recs.map(r => ({ ...r, id: `rec-${Math.random()}` })));
    } catch (e) {
        console.error(e);
        setError("AI推奨の取得に失敗しました。しばらく待ってから再試行してください。");
    } finally {
        setLoadingRecs(false);
    }
  };

  useEffect(() => {
    // Only fetch recommendations if we don't have existing ones, or just fetch fresh ones every time.
    // Given the user flow, fetching fresh recommendations on mount is usually desired unless explicitly cached.
    fetchRecs();
  }, []);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
              setShowManualSuggestions(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addToProposal = (asset: Asset) => {
    setProposedAssets([...proposedAssets, { ...asset, id: `prop-${Math.random()}`, amount: 1000000 }]); // Default amount
  };

  const handleManualSearch = (query: string) => {
      setManualQuery(query);
      if (!query) {
          setShowManualSuggestions(false);
          return;
      }
      const lower = query.toLowerCase();
      const filtered = POPULAR_ASSETS.filter(a => 
          a.name.toLowerCase().includes(lower) || 
          a.code.toLowerCase().includes(lower)
      );
      setFilteredManualAssets(filtered);
      setShowManualSuggestions(true);
  };

  const selectManualAsset = (stock: StockDefinition) => {
      const newAsset: Asset = {
          id: `manual-${Date.now()}`,
          name: stock.name,
          code: stock.code,
          type: stock.type,
          currency: stock.currency,
          amount: 1000000,
          confidence: 1.0,
          description: "手動追加"
      };
      setProposedAssets([...proposedAssets, newAsset]);
      setManualQuery('');
      setShowManualSuggestions(false);
  };

  const updateProposedAmount = (id: string, val: string) => {
    // Convert full-width numbers to half-width and remove commas
    const normalized = val.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/,/g, '');
    
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
       setProposedAssets(prev => prev.map(p => p.id === id ? { ...p, amount: num } : p));
    } else if (val === '') {
       setProposedAssets(prev => prev.map(p => p.id === id ? { ...p, amount: 0 } : p));
    }
  };

  const removeProposed = (id: string) => {
    setProposedAssets(prev => prev.filter(p => p.id !== id));
  };

  // Helper to format chart data
  const getRadarData = (scores?: Asset['analysisScores']) => {
    if (!scores) return [];
    return [
        { subject: '適合性', A: scores.suitability, fullMark: 10 },
        { subject: '市場環境', A: scores.market, fullMark: 10 },
        { subject: '成長性', A: scores.growth, fullMark: 10 },
        { subject: '割安性', A: scores.valuation, fullMark: 10 },
        { subject: '安全性', A: scores.risk, fullMark: 10 },
    ];
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full">
       <div className="bg-indigo-900 p-4 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400"/> Step 2: ポートフォリオ調整 (AIレコメンド)</h2>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Recommendations */}
          <div className="w-full md:w-1/2 p-6 border-r bg-indigo-50 overflow-y-auto">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-indigo-900 flex items-center gap-2">AI おすすめ候補 {loadingRecs && <Loader2 className="animate-spin w-4 h-4"/>}</h3>
                 <button 
                    onClick={fetchRecs} 
                    disabled={loadingRecs}
                    className="flex items-center gap-1 text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-1.5 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50"
                 >
                     <RotateCcw className={`w-3 h-3 ${loadingRecs ? 'animate-spin' : ''}`}/> 再提案
                 </button>
             </div>
             
             <div className="space-y-4">
                 {error && (
                     <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                         <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2"/>
                         <p className="text-sm text-red-700 font-bold mb-2">{error}</p>
                         <button 
                            onClick={fetchRecs}
                            className="text-xs bg-white border border-red-300 text-red-700 px-3 py-1 rounded hover:bg-red-50"
                         >
                             再試行する
                         </button>
                     </div>
                 )}

                 {!error && recommendations.map(rec => (
                     <div key={rec.id} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 hover:shadow-md transition-shadow">
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                 <div className="font-bold text-slate-800 text-lg">{rec.name}</div>
                                 <div className="text-xs text-slate-500 font-mono">
                                   {rec.code} | {ASSET_TYPES[rec.type as keyof typeof ASSET_TYPES] || rec.type}
                                 </div>
                             </div>
                             <button onClick={() => addToProposal(rec)} className="bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700 flex-shrink-0"><Plus className="w-5 h-5"/></button>
                         </div>
                         
                         <div className="flex flex-col xl:flex-row gap-4">
                             <div className="flex-1 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-wrap leading-relaxed">
                                <span className="text-xs font-bold text-indigo-400 block mb-1">推奨理由 (5つの観点):</span>
                                {(rec as any).reason || "AIによる分析に基づき、リスク分散と成長が見込める銘柄です。"}
                             </div>
                             
                             {/* Radar Chart */}
                             {rec.analysisScores && (
                                 <div className="w-full xl:w-48 h-48 flex-shrink-0 flex items-center justify-center bg-slate-50 rounded border border-slate-100">
                                     <ResponsiveContainer width="100%" height="100%">
                                         <RadarChart cx="50%" cy="50%" outerRadius="65%" data={getRadarData(rec.analysisScores)}>
                                             <PolarGrid stroke="#e2e8f0" />
                                             <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                             <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                             <Radar name="Score" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                                         </RadarChart>
                                     </ResponsiveContainer>
                                 </div>
                             )}
                         </div>

                         <div className="mt-2 text-right font-mono text-sm font-bold text-slate-600">参考価格: {(rec.currentPrice || 0).toLocaleString()} {rec.currency}</div>
                     </div>
                 ))}
                 {!loadingRecs && !error && recommendations.length === 0 && <div className="text-center text-slate-400 mt-10">条件に合う候補が見つかりませんでした</div>}
             </div>
          </div>

          {/* Right: Proposal Construction */}
          <div className="w-full md:w-1/2 p-6 flex flex-col bg-white">
              <div className="flex justify-between items-end mb-4">
                  <h3 className="font-bold text-slate-800">構築するポートフォリオ案</h3>
                  
                  {/* Manual Search Box */}
                  <div className="relative w-64" ref={searchContainerRef}>
                      <div className="flex items-center border rounded-md bg-gray-50 px-2 focus-within:ring-2 ring-indigo-200">
                        <Search className="w-4 h-4 text-gray-400"/>
                        <input 
                            ref={searchInputRef}
                            type="text"
                            className="bg-transparent border-none focus:ring-0 text-sm p-1.5 w-full"
                            placeholder="銘柄を追加..."
                            value={manualQuery}
                            onChange={(e) => handleManualSearch(e.target.value)}
                            onFocus={() => { if(manualQuery) setShowManualSuggestions(true) }}
                        />
                      </div>
                      {showManualSuggestions && filteredManualAssets.length > 0 && (
                          <div className="absolute right-0 z-20 w-80 bg-white border shadow-xl max-h-60 overflow-auto rounded mt-1">
                              {filteredManualAssets.slice(0, 30).map(a => (
                                  <div 
                                      key={a.code} 
                                      onClick={() => selectManualAsset(a)} 
                                      className="p-2 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                  >
                                      <div className="font-bold text-slate-700">{a.name}</div>
                                      <div className="text-xs text-slate-400 flex justify-between">
                                          <span>{a.code}</span>
                                          <span className="bg-gray-100 px-1 rounded">{ASSET_TYPES[a.type as keyof typeof ASSET_TYPES] || a.type}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto border rounded-lg mb-4 shadow-inner bg-gray-50/50 relative">
                  {proposedAssets.length > 0 ? (
                      <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0 shadow-sm z-10">
                              <tr>
                                  <th className="p-3 text-left font-semibold text-slate-600">銘柄</th>
                                  <th className="p-3 text-right font-semibold text-slate-600">提案額 (目標保有額) <span className="text-xs font-normal">JPY</span></th>
                                  <th className="p-3"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                              {proposedAssets.map(p => (
                                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="p-3">
                                          <div className="font-medium text-slate-800">{p.name}</div>
                                          <div className="flex gap-2 mt-0.5">
                                            <span className="text-xs text-slate-500">{p.code}</span>
                                            <span className="text-xs bg-gray-100 px-1.5 rounded text-slate-600">
                                                {ASSET_TYPES[p.type as keyof typeof ASSET_TYPES] || p.type}
                                            </span>
                                          </div>
                                      </td>
                                      <td className="p-3 text-right">
                                          <div className="flex justify-end items-center">
                                            <input 
                                                type="text" 
                                                className="border border-gray-300 rounded p-1.5 w-32 text-right focus:ring-2 focus:ring-indigo-200 outline-none" 
                                                value={(p.amount || 0).toLocaleString()} 
                                                onChange={e => updateProposedAmount(p.id, e.target.value)}
                                            />
                                          </div>
                                      </td>
                                      <td className="p-3 text-center">
                                          <button onClick={() => removeProposed(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"><Trash2 className="w-4 h-4"/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  ) : (
                      <div className="h-full flex flex-col justify-center items-center p-6 text-slate-400 text-sm">
                          左側のAI候補から追加、または上の検索ボックスから銘柄を選択してください
                      </div>
                  )}
              </div>

              <div className="border-t pt-4 bg-white">
                  <div className="flex justify-between gap-4">
                      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 px-4 py-2 hover:bg-gray-100 rounded transition-colors"><ArrowLeft className="w-4 h-4"/> 戻る</button>
                      <button 
                        onClick={() => onGenerateReport(proposedAssets)} 
                        disabled={isGenerating || proposedAssets.length === 0}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg py-3.5 font-bold shadow hover:shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                      >
                          {isGenerating ? <Loader2 className="animate-spin"/> : <><Sparkles className="w-5 h-5"/> レポート生成 (Step 3)</>}
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
export default RebalanceSection;