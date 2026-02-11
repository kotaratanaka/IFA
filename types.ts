
export interface Asset {
  id: string;
  name: string;
  code?: string;
  ticker?: string;
  type: 'Stock' | 'Bond' | 'Mutual Fund' | 'ETF' | 'Insurance' | 'Cash' | 'Other' | string;
  amount: number; // Total Current Value
  quantity?: number;
  currentPrice?: number;
  profitLoss?: number;
  currency: string;
  allocation?: number;
  confidence?: number; // 0.0 to 1.0. If < 0.8, show warning.
  
  // Fundamental Data
  per?: number;
  pbr?: number;
  revenueGrowth?: number;
  grossMargin?: number;
  operatingMargin?: number;
  description?: string;
  
  // AI Analysis Scores (1-10)
  analysisScores?: {
    suitability: number;
    market: number;
    growth: number;
    valuation: number;
    risk: number; // 10 is low risk (safe), 1 is high risk
  };
}

export interface ClientProfile {
  age: number;
  gender: string;
  region: string;
  riskTolerance: string;
  investmentHorizon: string;
  goals: string;
  familyStructure: string;
  currentHoldings: Asset[];
}

export interface ProposalSettings {
  // Key is the asset type (e.g., 'Stock'), value is the number of proposals requested
  proposalCounts: Record<string, number>;
  // Key is asset type, value is list of selected sub-categories (e.g., 'Tech', 'US')
  proposalDetails?: Record<string, string[]>;
}

export interface SlideContent {
  id: string;
  type: 'Title' 
    | 'ExecutiveSummary' 
    | 'AssetOverview' 
    | 'IndividualAnalysis' 
    | 'RiskAnalysis' 
    | 'ScenarioAnalysis' 
    | 'ConclusionPart1' 
    | 'ProposalList' 
    | 'RebalanceProposal' 
    | 'ExpectedEffect' 
    | 'SelectionReason' 
    | 'MarketGrowth' 
    | 'FundamentalAnalysis' // Deep Dive: Comps table
    | 'BusinessStrength' // Deep Dive: Moat/USP
    | 'Disclaimer';
  title: string;
  subtitle?: string;
  bodyText?: string;
  bulletPoints?: string[];
  tableData?: any[]; // Flexible for various table structures
  chartData?: any[];
  notes?: string;
  sources?: SourceReference[]; // For traceability
  aiAnalysis?: string; // For "Deep Dive" sidebar
}

export interface SourceReference {
  title: string;
  url?: string;
  page?: string; // "p.14"
  snippet?: string; // "Operating margin increased by 5%..."
}

export interface PresentationData {
  title: string;
  clientName: string;
  slides: SlideContent[];
}

export const ASSET_TYPES = {
  Stock: '株式',
  Bond: '債券',
  'Mutual Fund': '投資信託',
  ETF: 'ETF',
  Insurance: '保険',
  Cash: '現金',
  Other: 'その他'
} as const;
