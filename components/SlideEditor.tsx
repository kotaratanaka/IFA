import React, { useState } from 'react';
import { SlideContent, PresentationData } from '../types';
import { SlideRenderer } from './slides/SlideRenderer';
import { MessageSquare, Send, Lightbulb, FileText, Download, Printer } from 'lucide-react';
import { aiTextEdit } from '../services/geminiService';

interface SlideEditorProps {
  data: PresentationData;
  onUpdate: (newData: PresentationData) => void;
  onExportPPT: () => void;
  onBack: () => void;
}

const SlideEditor: React.FC<SlideEditorProps> = ({ data, onUpdate, onExportPPT, onBack }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);

  const currentSlide = data.slides[currentSlideIndex];

  const handleChatSubmit = async () => {
    if (!chatInput) return;
    setIsProcessing(true);
    
    // Simulate updating the slide based on chat
    // In real app, this would pass the entire slide JSON + instruction to Gemini
    const updatedText = await aiTextEdit(currentSlide.bodyText || "", chatInput);
    
    const newSlides = [...data.slides];
    newSlides[currentSlideIndex] = { ...currentSlide, bodyText: updatedText };
    onUpdate({ ...data, slides: newSlides });
    
    setChatInput("");
    setIsProcessing(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      {/* 1. Slide Thumbnails (Left) */}
      <div className="w-48 bg-white border-r flex flex-col overflow-y-auto hidden md:flex">
         <div className="p-4 border-b">
             <button onClick={onBack} className="text-xs text-gray-500 mb-2 hover:underline">← 戻る</button>
             <h3 className="font-bold text-xs truncate">{data.clientName}様向け</h3>
         </div>
         <div className="flex-1 p-2 space-y-2">
            {data.slides.map((slide, idx) => (
                <div 
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`p-2 rounded cursor-pointer border-2 transition-all ${idx === currentSlideIndex ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
                >
                    <div className="aspect-video bg-gray-200 mb-1 rounded flex items-center justify-center text-[8px] text-gray-400 overflow-hidden">
                        {slide.type}
                    </div>
                    <div className="text-[10px] font-medium truncate">{idx+1}. {slide.title}</div>
                </div>
            ))}
         </div>
      </div>

      {/* 2. Main Editor (Center) */}
      <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="h-14 bg-white border-b flex items-center justify-between px-4 shadow-sm z-10">
              <span className="font-bold text-slate-700">Slide {currentSlideIndex + 1}</span>
              <div className="flex gap-2">
                  <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><Printer className="w-4 h-4"/> PDF / 印刷</button>
                  <button onClick={onExportPPT} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"><Download className="w-4 h-4"/> PPTX出力</button>
              </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-100 p-8 overflow-auto flex justify-center items-start">
             <div id="slide-canvas" className="aspect-video w-full max-w-5xl bg-white shadow-2xl rounded overflow-hidden">
                 <SlideRenderer slide={currentSlide} />
             </div>
          </div>
      </div>

      {/* 3. AI Assistant & Deep Dive (Right) */}
      <div className="w-80 bg-white border-l flex flex-col">
          {/* Tabs/Header */}
          <div className="flex border-b">
              <button 
                onClick={() => setShowAiAnalysis(false)} 
                className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 ${!showAiAnalysis ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                  <MessageSquare className="w-4 h-4"/> 指示出し
              </button>
              <button 
                onClick={() => setShowAiAnalysis(true)} 
                className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 ${showAiAnalysis ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                  <Lightbulb className="w-4 h-4"/> 深掘り
              </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {!showAiAnalysis ? (
                  <div className="space-y-4">
                      <div className="bg-white p-3 rounded shadow-sm text-sm text-slate-600">
                          <p>スライドの修正指示を出してください。</p>
                          <p className="text-xs text-slate-400 mt-2">例：「タイトルのフォントを大きくして」「グラフの色を青系に変更して」</p>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-4">
                      {currentSlide.tableData?.some(r => r.explanation) ? (
                          <div className="bg-white p-3 rounded shadow-sm border border-yellow-100">
                              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1"><Lightbulb className="w-4 h-4 text-yellow-500"/> Why the difference?</h4>
                              <p className="text-xs text-slate-600 mb-2">AIがIR資料から分析した背景情報：</p>
                              {currentSlide.tableData.filter(r => r.explanation).map((r, i) => (
                                  <div key={i} className="mb-2 last:mb-0 border-l-2 border-yellow-400 pl-2">
                                      <div className="font-bold text-xs">{r.label}</div>
                                      <div className="text-xs">{r.explanation}</div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center text-sm text-slate-400 mt-10">
                              このスライドには深掘り情報がありません。
                          </div>
                      )}
                      
                      {currentSlide.sources && (
                           <div className="bg-white p-3 rounded shadow-sm mt-4">
                               <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1"><FileText className="w-4 h-4 text-gray-500"/> 参照ソース</h4>
                               <ul className="text-xs text-slate-600 space-y-1">
                                   {currentSlide.sources.map((s, i) => (
                                       <li key={i} className="hover:text-blue-600 cursor-pointer underline">
                                           {s.title} {s.page && <span className="text-gray-400">({s.page})</span>}
                                       </li>
                                   ))}
                               </ul>
                           </div>
                      )}
                  </div>
              )}
          </div>

          {/* Chat Input */}
          {!showAiAnalysis && (
              <div className="p-4 border-t bg-white">
                  <div className="relative">
                      <textarea 
                        className="w-full border rounded-lg p-2 pr-10 text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none" 
                        rows={3}
                        placeholder="修正指示を入力..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                      />
                      <button 
                        onClick={handleChatSubmit} 
                        disabled={isProcessing}
                        className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300"
                      >
                         {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send className="w-4 h-4"/>}
                      </button>
                  </div>
              </div>
          )}
      </div>

    </div>
  );
};

export default SlideEditor;