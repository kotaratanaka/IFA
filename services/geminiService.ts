import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ClientProfile, ProposalSettings, PresentationData, Asset, ASSET_TYPES } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Use Gemini 3.0 Pro for complex Report Generation
const REPORT_MODEL = "gemini-3-pro-preview";
// Use Gemini 3.0 Flash for faster, lighter tasks (Recommendations, Parsing, Chat, Research)
const FAST_MODEL = "gemini-3-flash-preview"; 

// Helper function to handle 429 errors with exponential backoff
const generateWithRetry = async (params: any, retries = 3, initialDelay = 2000) => {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      // Robust error checking for various SDK/API error formats
      const errorBody = error.response || error;
      const errorCode = error.status || error.code || errorBody?.error?.code;
      const errorMessage = error.message || errorBody?.error?.message || JSON.stringify(error);
      const errorStatus = error.statusText || errorBody?.error?.status;

      const isQuotaError = errorCode === 429 || 
                           errorMessage.includes('429') || 
                           errorMessage.toLowerCase().includes('quota') ||
                           errorMessage.includes('RESOURCE_EXHAUSTED') ||
                           errorStatus === 'RESOURCE_EXHAUSTED';
      
      if (isQuotaError) {
        if (i < retries - 1) {
            console.warn(`Gemini API Quota Exceeded (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
        } else {
             console.error("Max retries reached for Gemini API Quota.");
        }
      }
      throw error;
    }
  }
};

// New Function: Perform Deep Research using standard Google Search Tool
const performDeepResearch = async (profile: ClientProfile, proposedAssets: Asset[]): Promise<string> => {
    console.log(`[Deep Research] Starting standard search research...`);
    
    const assetNames = proposedAssets.map(a => `${a.name} (${a.code || ''})`).join(', ');
    
    // Prompt specifically designed for Search Grounding
    const researchPrompt = `
    You are a financial research assistant. Please find the latest financial data and market trends for the following assets to prepare an investment proposal.
    
    Target Assets: ${assetNames}
    
    Required Information:
    1. **Financial Fundamentals**: Find the latest PER (Price-to-Earnings), PBR (Price-to-Book), ROE, and Operating Margin for each company.
    2. **Competitor Comparison**: Identify 1-2 key competitors for each target asset and find their PER/PBR for comparison.
    3. **Market Trends**: Search for the market size (CAGR) and growth drivers for the sectors these assets belong to (e.g., Semiconductor, Automotive, Healthcare).
    4. **Risk Factors**: Identify specific recent risks (geopolitical, regulatory, or economic) relevant to these assets.

    Please summarize the findings in a structured text format.
    `;

    try {
        const response: any = await generateWithRetry({
            model: FAST_MODEL, // Use Flash for research to save quota and time
            contents: researchPrompt,
            config: {
                tools: [{ googleSearch: {} }], // Enable Google Search
                responseMimeType: "text/plain"
            }
        });

        // Extract text and grounding metadata (URLs)
        const text = response.text || "";
        const grounding = response.candidates?.[0]?.groundingMetadata;
        
        let sourceLinks = "";
        if (grounding?.groundingChunks) {
            const urls = grounding.groundingChunks
                .map((c: any) => c.web?.uri)
                .filter((uri: string) => uri)
                .slice(0, 5); // Limit to top 5 sources
            if (urls.length > 0) {
                sourceLinks = "\n\nReferenced Sources:\n" + urls.join("\n");
            }
        }

        return text + sourceLinks;
    } catch (error) {
        console.error("[Deep Research] Error during search:", error);
        return "Deep research could not be completed due to network or API issues. Using internal knowledge base.";
    }
};

export const generateInvestmentProposal = async (
  profile: ClientProfile,
  proposedAssets: Asset[],
  settings: ProposalSettings
): Promise<PresentationData> => {
  
  // 1. Run Deep Research (Standard Search)
  let deepResearchReport = "";
  try {
      deepResearchReport = await performDeepResearch(profile, proposedAssets);
  } catch (e) {
      console.warn("Skipping deep research due to error", e);
  }

  // 2. Generate Slides using Research Data
  const systemInstruction = `
    あなたは、超富裕層向けプライベートバンクに所属するトップTierのIFA（資産アドバイザー）です。
    提供された「Deep Research Report」の情報を最大限に活用し、論理的かつ数値的根拠に基づいた資産運用提案書を作成してください。
    
    【レポート構成 (以下の順序でJSONを生成)】
    
    == 第1部: 現状分析 (Current Analysis) ==
    1. Title: 表紙
    2. ExecutiveSummary: 現状ポートフォリオの要約と課題
    3. AssetOverview: 現在の保有資産の状況
    4. IndividualAnalysis: 保有銘柄の分析
    5. RiskAnalysis: リスク分析
    6. ScenarioAnalysis: 市場シナリオ分析
    7. ConclusionPart1: 現状分析の結論

    == 第2部: 組み換え提案 (Rebalancing Proposal) ==
    8. ProposalList: 提案銘柄一覧
    9. RebalanceProposal: 具体的な売買計画
    10. ExpectedEffect: 期待効果分析
    11. SelectionReason: 選定理由
    12. MarketGrowth: 市場の成長性 (Deep Researchの市場データを引用すること)
    13. FundamentalAnalysis: 類似会社比較 (Deep Researchの競合比較データを引用すること)
        - 提案銘柄と競合他社のPER, PBR, 成長率などを表形式で比較。
        - 乖離理由を明確に記述。
    14. BusinessStrength: 事業の強み
    15. Disclaimer: 免責事項
  `;

  const prompt = `
    【顧客情報】
    - 年齢: ${profile.age}歳, 性別: ${profile.gender}, 居住地: ${profile.region}
    - リスク許容度: ${profile.riskTolerance}
    - 投資目標: ${profile.goals}
    
    【現在の保有資産】
    ${JSON.stringify(profile.currentHoldings)}
    
    【提案する資産】
    ${JSON.stringify(proposedAssets)}
    
    【Deep Research 調査結果 (このデータを最優先で使用してください)】
    ${deepResearchReport || "Deep research data unavailable. Please use internal knowledge."}
    
    上記情報を基に、PresentationData形式のJSONを生成してください。
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      clientName: { type: Type.STRING },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: [
              'Title', 'ExecutiveSummary', 'AssetOverview', 'IndividualAnalysis', 
              'RiskAnalysis', 'ScenarioAnalysis', 'ConclusionPart1',
              'ProposalList', 'RebalanceProposal', 'ExpectedEffect', 
              'SelectionReason', 'MarketGrowth', 'FundamentalAnalysis', 'BusinessStrength', 
              'Disclaimer'
            ]},
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            bodyText: { type: Type.STRING },
            bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            tableData: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: {
                  label: { type: Type.STRING },
                  metric: { type: Type.STRING },
                  value1: { type: Type.STRING },
                  value2: { type: Type.STRING },
                  explanation: { type: Type.STRING } 
                }
              } 
            },
            chartData: { 
              type: Type.ARRAY, 
              items: {
                type: Type.OBJECT, 
                properties: {
                   name: { type: Type.STRING },
                   value: { type: Type.NUMBER },
                   value2: { type: Type.NUMBER },
                   fill: { type: Type.STRING }
                }
              }
            },
            notes: { type: Type.STRING },
            sources: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  page: { type: Type.STRING }
                }
              } 
            },
            aiAnalysis: { type: Type.STRING }
          },
          required: ['id', 'type', 'title']
        }
      }
    },
    required: ['title', 'slides']
  };

  try {
    const response: any = await generateWithRetry({
      model: REPORT_MODEL, // Keep Pro for high quality report
      contents: prompt,
      config: {
        // tools: [{googleSearch: {}}], // Search is already done in step 1. Disable here to save tokens/latency if context is passed.
        // Actually, keeping search enabled here can help if the summary missed something, but it adds latency.
        // Let's rely on the deepResearchReport context and disable search here for speed, 
        // OR enable it as a fallback. Let's disable to reduce complexity and quota usage since we passed the context.
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text) as PresentationData;
  } catch (error) {
    console.error("Report Generation Error:", error);
    return getMockProposal(); // Fallback
  }
};

export const getAssetRecommendations = async (
  profile: ClientProfile,
  settings: ProposalSettings
): Promise<Asset[]> => {
    const requests = Object.entries(settings.proposalCounts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => {
          const typeLabel = ASSET_TYPES[type as keyof typeof ASSET_TYPES] || type;
          const details = settings.proposalDetails?.[type]?.join('、');
          const detailStr = details ? ` (特に希望するセクター/種別: ${details})` : '';
          return `${typeLabel} (${type}): ${count}銘柄${detailStr}`;
      })
      .join(', ');

    const prompt = `
    【顧客プロファイル】
    - 年齢: ${profile.age}歳
    - 性別: ${profile.gender}
    - 居住地: ${profile.region}
    - リスク許容度: ${profile.riskTolerance}
    
    【提案リクエスト】
    以下のカテゴリで具体的な推奨銘柄を挙げてください: ${requests}
    
    各銘柄について、プロのIFAとして【5つの観点】に基づき推奨理由を具体的に記述してください。
    出力形式(JSON): 
    [{ 
      "name": "銘柄名", "code": "コード", "type": "Stock", 
      "currentPrice": 数値, "currency": "JPY/USD", 
      "reason": "1. 適合性: ...",
      "analysisScores": { "suitability": 8, "market": 9, "growth": 7, "valuation": 8, "risk": 6 }
    }]
    `;

    try {
        const response: any = await generateWithRetry({
            model: FAST_MODEL, // Use Flash for faster/cheaper recommendations
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Recommendation Error:", e);
        throw e; // Propagate error so UI can show retry button
    }
}

export const aiTextEdit = async (currentText: string, instruction: string): Promise<string> => {
    const prompt = `オリジナル: "${currentText}"\n指示: ${instruction}\n書き直した日本語テキストのみを返してください。`;
    try {
        const response: any = await generateWithRetry({ model: FAST_MODEL, contents: prompt }); // Use Flash for chat
        return response.text || currentText;
    } catch (e) { return currentText; }
}

export interface ParseResult {
    assets: Asset[];
    extractedProfile?: Partial<ClientProfile>;
}

export const parsePortfolioDocument = async (base64Data: string, mimeType: string): Promise<ParseResult> => {
    const prompt = `
      このドキュメントに含まれる情報を読み取り、JSONデータとして抽出してください。
      「顧客情報」と「保有金融資産情報(銘柄名、コード、保有数量(株数/口数)、評価額、損益)」を抽出してください。
      
      出力フォーマット:
      Strict Valid JSON. Do not use Markdown code blocks.
      { 
        "profile": { "age": number, "gender": "string", "region": "string", "riskTolerance": "string", "goals": "string" }, 
        "assets": [
            { "name": "string", "code": "string", "type": "Stock", "quantity": number, "amount": number, "profitLoss": number, "currency": "JPY" }
        ] 
      }
    `;

    try {
        const response: any = await generateWithRetry({
            model: FAST_MODEL, // Use Flash for parsing (multimodal supported and cheaper)
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
            }
        });
        
        let text = response.text;
        if (!text) return { assets: [] };

        // Cleaning Markdown wrapper if present
        text = text.trim();
        if (text.startsWith("```json")) {
            text = text.replace(/^```json/, "").replace(/```$/, "");
        } else if (text.startsWith("```")) {
            text = text.replace(/^```/, "").replace(/```$/, "");
        }

        return JSON.parse(text) as ParseResult;
    } catch (error) {
        console.error("Parse Error:", error);
        // Error is logged but empty result returned to prevent app crash
        return { assets: [] };
    }
}

const getMockProposal = (): PresentationData => ({
  title: "資産運用提案書",
  clientName: "お客様",
  slides: [
    { id: "1", type: "Title", title: "資産運用分析レポート", subtitle: "システムエラーが発生しました" }
  ]
});