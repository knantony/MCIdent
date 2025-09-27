// Types for the Config Compare AI application

export interface ComparisonResult {
  key: string;
  devValue: string;
  prodValue: string;
  problematicValue?: string;  // The actual problematic value to display
  problematicEnvironment?: 'dev' | 'prod' | 'both';  // Which env has the issue
  observation: string;
  suggestion: string;
  risk: 'Low' | 'Medium' | 'High';
}

export interface ComparisonApiResponse {
  success: boolean;
  data?: ComparisonResult[];
  error?: string;
}

// New types for individual file analysis
export interface FileIssue {
  key: string;
  value: string;
  observation: string;
  suggestion: string;
  risk: 'Low' | 'Medium' | 'High';
}

export interface FileAnalysisRequest {
  config: string;
  environment: 'dev' | 'prod';
}

export interface FileAnalysisResponse {
  success: boolean;
  environment: string;
  issues: FileIssue[];
  error?: string;
  healthScore?: {
    score: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

export interface AnalysisRequest {
  devConfig: string;
  prodConfig: string;
}

export interface HealthScore {
  score: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
}

export interface FileUploadState {
  devFile: File | null;
  prodFile: File | null;
}

export interface AnalysisState {
  isLoading: boolean;
  results: ComparisonResult[] | null;
  error: string | null;
  healthScore: HealthScore | null;
}