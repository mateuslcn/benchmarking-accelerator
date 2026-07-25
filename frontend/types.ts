export interface BenchmarkInputs {
  businessProblem: string;
  currentContext: string;
  goals: string;
}

export interface ScopeAndBenchmarks {
  scope: {
    targetFeature: string;
    analyzedFlow: string;
    impactedUser: string;
    usageScenario: string;
    testingMethod: string;
  };
  benchmarks: {
    direct: string[];
    market: string[];
    adjacent: string[];
  };
}

export interface MatrixResult {
  markdownTable: string;
  sources: { title: string; uri: string }[];
}

export interface SynthesisResult {
  swot: {
    competitor: string;
    strengths: string[];
    weaknesses: string[];
    reuse: string[];
    avoid: string[];
  }[];
  gaps: {
    need: string;
    gap: string;
    opportunity: string;
  }[];
  prioritization: {
    item: string;
    priority: 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have';
    reason: string;
  }[];
}

export interface AppState {
  step: number;
  inputs: BenchmarkInputs;
  scopeData: ScopeAndBenchmarks | null;
  selectedBenchmarks: string[];
  matrixData: MatrixResult | null;
  synthesisData: SynthesisResult | null;
  reportData: string | null;
  isLoading: boolean;
  agentStatus?: string | null;
  error: string | null;
}
