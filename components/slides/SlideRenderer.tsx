import React from 'react';
import { SlideContent } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Info, ArrowRight, TrendingUp, ShieldCheck, Scale, Target, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface SlideRendererProps {
  slide: SlideContent;
}

const COLORS = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export const SlideRenderer: React.FC<SlideRendererProps> = ({ slide }) => {
  
  const CommonHeader = () => (
    <div className="mb-6 border-b-4 border-blue-900 pb-2 flex justify-between items-end">
      <div>
         <h2 className="text-3xl font-bold text-slate-900">{slide.title}</h2>
         {slide.subtitle && <p className="text-slate-500 font-medium mt-1">{slide.subtitle}</p>}
      </div>
      <div className="text-right">
        {slide.sources && slide.sources.length > 0 && (
            <div className="text-xs text-slate-400 mb-1">
                Source: {slide.sources.map(s => s.title + (s.page ? ` (${s.page})` : '')).join(', ')}
            </div>
        )}
        <span className="text-slate-400 text-sm font-light">社外秘 (CONFIDENTIAL)</span>
      </div>
    </div>
  );

  const renderContent = () => {
      switch (slide.type) {
        case 'Title':
          return (
            <div className="h-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-8 h-full bg-blue-900"></div>
               <div className="text-center z-10 p-12 max-w-4xl">
                  <div className="mb-8 flex justify-center"><Target className="w-16 h-16 text-blue-900"/></div>
                  <h1 className="text-5xl font-extrabold text-blue-900 mb-6 leading-tight">{slide.title}</h1>
                  <p className="text-2xl text-slate-600 font-light mb-12">{slide.subtitle}</p>
                  <div className="inline-block bg-white px-12 py-6 shadow-xl rounded-lg border-l-4 border-blue-600">
                    <p className="text-slate-500 text-sm tracking-widest uppercase mb-2">Prepared For</p>
                    <p className="text-2xl font-bold text-slate-800">お客様名</p>
                  </div>
               </div>
            </div>
          );

        case 'ScenarioAnalysis':
           return (
             <div className="grid grid-cols-2 gap-8 h-[80%]">
                <div className="flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">ポートフォリオ将来予測</h3>
                    <p className="text-slate-600 mb-6 leading-relaxed">{slide.bodyText || "市場環境の変化に応じた3つのシナリオ分析です。"}</p>
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded shadow-sm">
                            <span className="font-bold text-green-800 block text-lg mb-1">Bull (楽観)</span>
                            <span className="text-sm text-green-700">世界的な景気拡大とAI需要の爆発的成長、円安の進行を想定。</span>
                        </div>
                        <div className="p-4 bg-gray-50 border-l-4 border-gray-400 rounded shadow-sm">
                            <span className="font-bold text-gray-800 block text-lg mb-1">Base (基本)</span>
                            <span className="text-sm text-gray-700">緩やかなインフレ鎮静化と安定的成長、為替の横ばいを想定。</span>
                        </div>
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded shadow-sm">
                            <span className="font-bold text-red-800 block text-lg mb-1">Bear (悲観)</span>
                            <span className="text-sm text-red-700">リセッション入りによる株価調整と、急激な円高進行を想定。</span>
                        </div>
                    </div>
                </div>
                <div className="h-full bg-slate-50 rounded-xl p-4 border shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={slide.chartData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={50} tick={{fontWeight: 'bold'}} />
                            <Tooltip 
                                formatter={(value: number) => [`${value}%`, '予想リターン']}
                                contentStyle={{ borderRadius: '8px' }}
                            />
                            <Bar dataKey="value" barSize={40} radius={[0, 4, 4, 0]}>
                                {slide.chartData?.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name.includes('Bull') ? '#4ade80' : entry.name.includes('Bear') ? '#f87171' : '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>
           );

        case 'FundamentalAnalysis':
            return (
                <div className="h-full flex flex-col">
                     <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100 flex items-start gap-3">
                        <Scale className="w-6 h-6 text-blue-700 shrink-0 mt-0.5"/>
                        <p className="text-slate-700 leading-relaxed text-sm"><span className="font-bold text-blue-800">Comps Analysis (類似会社比較):</span> {slide.bodyText || "対象銘柄と競合他社の主要指標を比較し、現在のバリュエーションの妥当性を検証します。"}</p>
                     </div>
                     <div className="flex-1 overflow-auto rounded-lg shadow border border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white sticky top-0 z-10">
                                    <th className="p-3 w-1/6 font-semibold text-sm">指標 (Metric)</th>
                                    <th className="p-3 w-1/5 font-semibold bg-blue-900 border-l border-blue-700 text-sm">提案/保有銘柄 (Target)</th>
                                    <th className="p-3 w-1/5 font-semibold border-l border-slate-600 text-sm">競合他社 (Competitor)</th>
                                    <th className="p-3 w-1/3 font-semibold border-l border-slate-600 text-sm">乖離要因分析 (Why the Gap?)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-sm">
                                {slide.tableData?.map((row, i) => (
                                    <tr key={i} className={i%2===0 ? "bg-white hover:bg-slate-50" : "bg-slate-50 hover:bg-slate-100"}>
                                        <td className="p-3 font-bold text-slate-700 border-r border-slate-100">{row.metric}</td>
                                        <td className="p-3 font-bold text-blue-700 bg-blue-50/30 border-r border-slate-100">
                                            <div className="text-xs text-slate-400 mb-0.5">{row.label}</div>
                                            <div className="text-base">{row.value1}</div>
                                        </td>
                                        <td className="p-3 text-slate-700 border-r border-slate-100">
                                             <div className="text-xs text-slate-400 mb-0.5">Industry / Peer</div>
                                             <div className="text-base font-medium">{row.value2}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-slate-700 leading-relaxed flex items-start gap-2">
                                                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>
                                                {row.explanation}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            );

        case 'RebalanceProposal':
            return (
                <div className="h-full flex flex-col">
                    <p className="text-slate-600 mb-6">{slide.bodyText}</p>
                    <div className="flex-1 grid grid-cols-2 gap-8 items-start">
                        {/* Sell Side */}
                        <div className="bg-red-50 rounded-xl border border-red-100 overflow-hidden shadow-sm">
                            <div className="bg-red-100 p-3 border-b border-red-200 flex items-center justify-between">
                                <h3 className="text-red-800 font-bold flex items-center gap-2"><ArrowDownRight className="w-5 h-5"/> 売却 (Sell)</h3>
                                <span className="text-xs bg-white text-red-600 px-2 py-0.5 rounded font-bold">資金捻出</span>
                            </div>
                            <div className="p-4 space-y-3">
                                {slide.tableData?.filter(r => r.label.includes('売却') || (r.value1 && r.value1.startsWith('-'))).map((r, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded border border-red-100 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <span className="font-bold text-slate-700">{r.label.replace('売却: ', '').replace('Sell: ', '')}</span>
                                        </div>
                                        <span className="font-bold text-red-600 text-lg">{r.value1}</span>
                                    </div>
                                ))}
                                {(!slide.tableData?.some(r => r.label.includes('売却') || r.value1?.startsWith('-'))) && (
                                    <div className="text-center text-gray-400 py-4 text-sm">売却対象なし</div>
                                )}
                            </div>
                        </div>

                        {/* Buy Side */}
                        <div className="bg-blue-50 rounded-xl border border-blue-100 overflow-hidden shadow-sm">
                             <div className="bg-blue-100 p-3 border-b border-blue-200 flex items-center justify-between">
                                <h3 className="text-blue-800 font-bold flex items-center gap-2"><ArrowUpRight className="w-5 h-5"/> 購入 (Buy)</h3>
                                <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded font-bold">新規投資</span>
                            </div>
                            <div className="p-4 space-y-3">
                                {slide.tableData?.filter(r => r.label.includes('購入') || (r.value1 && !r.value1.startsWith('-'))).map((r, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded border border-blue-100 shadow-sm">
                                         <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                            <span className="font-bold text-slate-700">{r.label.replace('購入: ', '').replace('Buy: ', '')}</span>
                                        </div>
                                        <span className="font-bold text-blue-600 text-lg">+{r.value1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'MarketGrowth':
             return (
                 <div className="h-full flex flex-col">
                     <div className="flex-1 grid grid-cols-12 gap-8">
                         <div className="col-span-7 flex flex-col gap-4">
                             <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="text-blue-600"/> 市場環境・成長性分析</h3>
                             <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">{slide.bodyText}</p>
                             
                             {slide.bulletPoints && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-2">
                                    <h4 className="font-bold text-sm text-slate-700 mb-2">Key Drivers</h4>
                                    <ul className="space-y-2">
                                        {slide.bulletPoints.map((bp, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5"/>
                                                {bp}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                             )}
                         </div>
                         <div className="col-span-5 flex flex-col items-center justify-center bg-white border rounded-xl shadow-lg p-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full blur-2xl -z-10"></div>
                             {/* Attempt to visualize data if available in tableData, otherwise generic placeholder */}
                             {slide.tableData && slide.tableData.length > 0 ? (
                                 <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={slide.tableData} layout="vertical">
                                         <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                         <XAxis type="number" hide />
                                         <YAxis dataKey="label" type="category" width={80} tick={{fontSize: 10}}/>
                                         <Tooltip />
                                         <Bar dataKey="value1" fill="#3b82f6" radius={[0,4,4,0]} name="CAGR/Size" />
                                     </BarChart>
                                 </ResponsiveContainer>
                             ) : (
                                 <div className="text-center">
                                     <TrendingUp className="w-16 h-16 text-blue-200 mx-auto mb-4"/>
                                     <p className="text-slate-400 font-bold">Market Growth Data</p>
                                     <p className="text-xs text-slate-300">CAGR / TAM</p>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             );

        case 'Disclaimer':
            return (
                <div className="h-full flex flex-col justify-center items-center p-12 text-slate-500">
                    <h2 className="text-2xl font-bold mb-8">免責事項</h2>
                    <div className="text-xs text-justify leading-relaxed max-w-4xl border p-8 rounded bg-slate-50 shadow-inner">
                        <p>{slide.bodyText || "本資料は、情報提供を目的として作成されたものであり、証券その他の金融商品の売買の勧誘を目的としたものではありません。本資料に含まれる情報は、信頼できると判断した情報源から入手したものですが、その正確性・完全性を保証するものではありません。投資判断は、最終的にはお客様ご自身で行っていただきますようお願いいたします。過去の実績は将来の運用成果を保証するものではありません。"}</p>
                    </div>
                </div>
            );

        // Standard List / Chart Layouts
        default:
             return (
                <div className="grid grid-cols-12 gap-8 h-[85%]">
                    <div className="col-span-7 flex flex-col gap-6 overflow-y-auto pr-2">
                        {slide.bodyText && <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">{slide.bodyText}</p>}
                        
                        {slide.bulletPoints && (
                            <ul className="space-y-4 mt-2">
                                {slide.bulletPoints.map((bp, i) => (
                                <li key={i} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</div>
                                    <span className="text-slate-700 font-medium">{bp}</span>
                                </li>
                                ))}
                            </ul>
                        )}

                        {/* Generic Table Handler for types like IndividualAnalysis or MarketGrowth (fallback) */}
                         {slide.tableData && !['FundamentalAnalysis', 'RebalanceProposal', 'MarketGrowth'].includes(slide.type) && (
                             <div className="mt-4 border rounded-lg overflow-hidden shadow-sm">
                                 <table className="w-full text-sm">
                                     <thead className="bg-gray-100">
                                         <tr>
                                             <th className="p-3 text-left font-semibold text-slate-600">項目</th>
                                             <th className="p-3 text-left font-semibold text-slate-600">内容 / 値</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gray-200">
                                         {slide.tableData.map((r,i)=>(
                                             <tr key={i} className="bg-white">
                                                 <td className="p-3 font-medium text-slate-800 bg-gray-50/50 w-1/3">{r.label}</td>
                                                 <td className="p-3 text-slate-700">{r.value1 || r.metric}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         )}
                    </div>
                    
                    <div className="col-span-5 flex flex-col">
                        <div className="flex-1 bg-white rounded-xl p-4 shadow-lg border border-slate-100 flex flex-col justify-center items-center relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10"></div>
                            
                            {slide.chartData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    {slide.type === 'RiskAnalysis' || slide.type === 'AssetOverview' ? (
                                        <PieChart>
                                            <Pie 
                                                data={slide.chartData} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={60} 
                                                outerRadius={90} 
                                                fill="#8884d8" 
                                                paddingAngle={2}
                                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {slide.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    ) : (
                                        <BarChart data={slide.chartData} margin={{top:20, right:20, left:0, bottom:20}}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                                            <YAxis />
                                            <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => value.toLocaleString()} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center p-8">
                                    <Scale className="w-16 h-16 text-slate-200 mx-auto mb-4"/>
                                    <div className="text-slate-400 font-medium">No Visual Data Available</div>
                                </div>
                            )}
                        </div>
                        
                        {/* Key Insight Box if space permits */}
                        <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-100 shadow-sm">
                             <h4 className="font-bold text-yellow-800 text-sm flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4"/> Key Insight</h4>
                             <p className="text-xs text-yellow-800 leading-relaxed">
                                 {slide.aiAnalysis || "AIによる分析: ポートフォリオの分散効果と長期的な成長ポテンシャルを最大化するための構成となっています。"}
                             </p>
                        </div>
                    </div>
                </div>
             );
      }
  };

  if (slide.type === 'Title') return renderContent();

  return (
    <div className="h-full p-12 bg-white relative font-sans">
      <CommonHeader />
      {renderContent()}
    </div>
  );
};
