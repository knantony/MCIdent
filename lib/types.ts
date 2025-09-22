// Types for the Config Compare AI application

export interface ComparisonResult {
  key: string;
  devValue: string;
  prodValue: string;
  observation: string;
  suggestion: string;
  risk: 'Low' | 'Medium' | 'High';
}

export interface ComparisonApiResponse {
  success: boolean;
  data?: ComparisonResult[];
  error?: string;
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