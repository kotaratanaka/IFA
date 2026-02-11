import React, { useState } from 'react';
import InputSection from './components/InputSection';
import RebalanceSection from './components/RebalanceSection';
import SlideEditor from './components/SlideEditor';
import { ClientProfile, Asset, PresentationData, ProposalSettings } from './types';
import { generateInvestmentProposal } from './services/geminiService';
import { exportToPPT } from './utils/pptxExport';
import { Loader2 } from 'lucide-react';

type Step = 'input' | 'rebalance' | 'editor';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('input');
  
  // State for all steps
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [settings, setSettings] = useState<ProposalSettings | null>(null);
  const [proposedAssets, setProposedAssets] = useState<Asset[]>([]);
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Step 1 -> Step 2
  const handleInputComplete = (p: ClientProfile, s: ProposalSettings) => {
    setProfile(p);
    setSettings(s);
    setStep('rebalance');
  };

  // Step 2 -> Step 3
  const handleRebalanceComplete = async (assets: Asset[]) => {
    if (!profile || !settings) return;
    
    setProposedAssets(assets);
    setIsGenerating(true);
    setLoadingMessage("Deep Research Agentを起動中...");

    try {
      // Deep Research & Report Generation
      // The service now handles the agent interaction internally
      const data = await generateInvestmentProposal(profile, assets, settings);
      
      setPresentationData(data);
      setStep('editor');
    } catch (error) {
      console.error("Generation failed", error);
      alert("レポート生成中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdate = (newData: PresentationData) => {
    setPresentationData(newData);
  };

  const handleExport = () => {
    if (presentationData) {
      exportToPPT(presentationData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
      <div className="container mx-auto p-4 md:p-8 h-screen flex flex-col">
        {step !== 'editor' && (
             <header className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IFA Portfolio Architect <span className="text-blue-600">AI</span></h1>
             </header>
        )}

        <div className="flex-1 min-h-0">
            {step === 'input' && (
                <InputSection 
                  onNext={handleInputComplete} 
                  initialProfile={profile} 
                  initialSettings={settings}
                />
            )}

            {step === 'rebalance' && profile && settings && (
                <RebalanceSection 
                    profile={profile} 
                    settings={settings} 
                    onBack={() => setStep('input')}
                    onGenerateReport={handleRebalanceComplete}
                    isGenerating={isGenerating}
                />
            )}

            {step === 'editor' && presentationData && (
                <SlideEditor 
                    data={presentationData} 
                    onUpdate={handleUpdate} 
                    onExportPPT={handleExport} 
                    onBack={() => setStep('rebalance')}
                />
            )}
        </div>
      </div>

      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <h2 className="text-2xl font-bold">Deep Research 実行中</h2>
          <p className="text-lg font-medium mt-2 mb-1">{loadingMessage}</p>
          <p className="text-sm opacity-80 mt-2 text-center leading-relaxed">
            AIエージェントが複数の情報源をクロールして詳細調査を行っています。<br/>
            これには数分かかる場合があります...
          </p>
        </div>
      )}
    </div>
  );
};

export default App;