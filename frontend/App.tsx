import React, { useState, useEffect } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { AppState, BenchmarkInputs } from './types';
import { generateScopeAndBenchmarks, generateMatrixWithSearch, generateSynthesis, generateFinalReport } from './services/geminiService';
import { exportReportToDOCX } from './utils/docxExporter';
import { 
  Loader2, ArrowRight, ArrowLeft, Search, FileText, Target, Lightbulb, 
  AlertCircle, Printer, Key, RotateCcw, Download, ExternalLink, Star,
  Home, ShieldCheck, TrendingUp, Clock, Sparkles, ChevronDown, ChevronRight,
  Menu, X, Layers, Zap, CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const INITIAL_STATE: AppState = {
  step: 1,
  inputs: {
    businessProblem: '',
    currentContext: '',
    goals: ''
  },
  scopeData: null,
  selectedBenchmarks: [],
  matrixData: null,
  synthesisData: null,
  reportData: null,
  isLoading: false,
  error: null
};

export default function App() {
  const [activeView, setActiveView] = useState<'home' | 'benchmarking'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompetitivenessExpanded, setIsCompetitivenessExpanded] = useState(true);

  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);
  const [modelName, setModelName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('GEMINI_MODEL_NAME') || 'gemini-2.5-flash' : 'gemini-2.5-flash'));

  // Automatically scroll to the top of the page whenever step or activeView changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.step, activeView]);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    setIsApiKeyInvalid(false);
    if (val.trim()) {
      localStorage.setItem('GEMINI_API_KEY', val.trim());
      if (state.error && /API Key/i.test(state.error)) {
        setState(prev => ({ ...prev, error: null }));
      }
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }
  };

  const handleModelChange = (val: string) => {
    setModelName(val);
    localStorage.setItem('GEMINI_MODEL_NAME', val);
  };

  const handleClearKey = () => {
    setApiKey('');
    setIsApiKeyInvalid(false);
    localStorage.removeItem('GEMINI_API_KEY');
  };

  const handleStartNewAnalysis = () => {
    setState(INITIAL_STATE);
    setMaxStepReached(1);
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= maxStepReached) {
      setState(prev => ({ ...prev, step: targetStep, error: null }));
    }
  };

  const handleExportDOCX = async () => {
    if (!state.reportData) return;
    try {
      await exportReportToDOCX(state.reportData, state.inputs);
    } catch (err) {
      console.error("DOCX Export error:", err);
      alert("Failed to generate DOCX export.");
    }
  };

  const updateInputs = (field: keyof BenchmarkInputs, value: string) => {
    setState(prev => ({ 
      ...prev, 
      inputs: { ...prev.inputs, [field]: value },
      scopeData: null,
      matrixData: null,
      synthesisData: null,
      reportData: null
    }));
    setMaxStepReached(1);
  };

  const handleError = (error: any) => {
    console.error('Error during execution:', error);
    const msg = error?.message || String(error);
    const isKeyIssue = /API Key|API_KEY|apiKey/i.test(msg);

    if (isKeyIssue) {
      setIsApiKeyInvalid(true);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'API Key missing or invalid. Please enter a valid Google AI Studio API Key in the top configuration field before proceeding.'
      }));
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: msg || 'An unexpected error occurred.'
      }));
    }
  };

  const handleNextStep = async () => {
    if (!apiKey.trim()) {
      setIsApiKeyInvalid(true);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'API Key is missing. Please enter your Google AI Studio API Key in the configuration bar at the top before running the analysis.'
      }));
      return;
    }
    setIsApiKeyInvalid(false);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      if (state.step === 1) {
        if (state.scopeData) {
          setState(prev => ({ ...prev, step: 2, isLoading: false }));
          setMaxStepReached(prev => Math.max(prev, 2));
          return;
        }
        const scopeData = await generateScopeAndBenchmarks(state.inputs);
        const allBenchmarks = [
          ...scopeData.benchmarks.direct,
          ...scopeData.benchmarks.market,
          ...scopeData.benchmarks.adjacent
        ];
        setState(prev => ({ ...prev, scopeData, selectedBenchmarks: allBenchmarks, step: 2, isLoading: false }));
        setMaxStepReached(prev => Math.max(prev, 2));
      } else if (state.step === 2) {
        if (!state.scopeData) throw new Error("Scope data missing");
        if (state.selectedBenchmarks.length === 0) throw new Error("Please select at least one benchmark to analyze.");
        if (state.matrixData) {
          setState(prev => ({ ...prev, step: 3, isLoading: false }));
          setMaxStepReached(prev => Math.max(prev, 3));
          return;
        }
        const matrixData = await generateMatrixWithSearch(
          state.inputs, 
          state.scopeData, 
          state.selectedBenchmarks,
          (status) => setState(prev => ({ ...prev, agentStatus: status }))
        );
        setState(prev => ({ ...prev, matrixData, step: 3, isLoading: false, agentStatus: null }));
        setMaxStepReached(prev => Math.max(prev, 3));
      } else if (state.step === 3) {
        if (!state.matrixData) throw new Error("Matrix data missing");
        if (state.synthesisData) {
          setState(prev => ({ ...prev, step: 4, isLoading: false }));
          setMaxStepReached(prev => Math.max(prev, 4));
          return;
        }
        const synthesisData = await generateSynthesis(state.matrixData.markdownTable, state.inputs);
        setState(prev => ({ ...prev, synthesisData, step: 4, isLoading: false }));
        setMaxStepReached(prev => Math.max(prev, 4));
      } else if (state.step === 4) {
        if (!state.scopeData || !state.synthesisData) throw new Error("Required data missing");
        if (state.reportData) {
          setState(prev => ({ ...prev, step: 5, isLoading: false }));
          setMaxStepReached(prev => Math.max(prev, 5));
          return;
        }
        const reportData = await generateFinalReport(
          state.inputs, 
          state.scopeData, 
          state.synthesisData, 
          state.matrixData?.markdownTable
        );
        setState(prev => ({ ...prev, reportData, step: 5, isLoading: false }));
        setMaxStepReached(prev => Math.max(prev, 5));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const navigateToHome = () => {
    setActiveView('home');
  };

  const navigateToBenchmarking = () => {
    setActiveView('benchmarking');
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" /> Define the Objective
        </h2>
        <p className="text-sm text-gray-600 mb-4">Before analyzing competitors, let's establish what we are trying to achieve.</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">What business problem are we trying to solve?</label>
          <textarea 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            rows={3}
            placeholder="Currently Users are not proactively informed when new firmware updates become available for their managed devices, which can delay update adoption, increase security and compliance risks, and require manual monitoring of the web platform."
            value={state.inputs.businessProblem}
            onChange={(e) => updateInputs('businessProblem', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Product Context</label>
          <textarea 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            rows={3}
            placeholder="B2B web platform for firmware control and software customization, enabling organizations to manage firmware updates and software configurations across their enterprise device fleet."
            value={state.inputs.currentContext}
            onChange={(e) => updateInputs('currentContext', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">What are we looking for?</label>
          <textarea 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            rows={3}
            placeholder="Create an email notification feature that automatically informs users when a firmware update becomes available for their registered devices, allowing them to take timely action without continuously monitoring the web platform."
            value={state.inputs.goals}
            onChange={(e) => updateInputs('goals', e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-between items-center pt-4">
        <button onClick={handleStartNewAnalysis} className="text-gray-500 hover:text-blue-600 font-medium px-2 py-1 text-sm transition-colors flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4" /> Start New Analysis
        </button>
        <button 
          onClick={handleNextStep}
          disabled={!state.inputs.businessProblem || !state.inputs.currentContext || !state.inputs.goals || state.isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Scope & Benchmarks'}
          {!state.isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (!state.scopeData) return null;
    const { scope, benchmarks } = state.scopeData;

    const toggleBenchmark = (name: string) => {
      setState(prev => {
        const current = prev.selectedBenchmarks;
        const next = current.includes(name) 
          ? current.filter(b => b !== name)
          : [...current, name];
        return { ...prev, selectedBenchmarks: next, matrixData: null, synthesisData: null, reportData: null };
      });
      setMaxStepReached(2);
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" /> Scope & Benchmark Selection
          </h2>
          <p className="text-sm text-gray-600 mb-4">Agent 1 has analyzed your objective and defined the feature scope and target competitors.</p>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Analysis Scope</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold text-gray-700">Target Feature:</span> <span className="text-gray-900">{scope.targetFeature}</span></div>
            <div><span className="font-semibold text-gray-700">Analyzed Flow:</span> <span className="text-gray-900">{scope.analyzedFlow}</span></div>
            <div><span className="font-semibold text-gray-700">Impacted User:</span> <span className="text-gray-900">{scope.impactedUser}</span></div>
            <div><span className="font-semibold text-gray-700">Usage Scenario:</span> <span className="text-gray-900">{scope.usageScenario}</span></div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Select Competitors to Analyze</h3>
          
          {[
            { label: 'Direct Competitors', list: benchmarks.direct, color: 'border-blue-200 bg-blue-50/30' },
            { label: 'Market Reference (Best-in-Class)', list: benchmarks.market, color: 'border-emerald-200 bg-emerald-50/30' },
            { label: 'Adjacent SaaS / B2B Products', list: benchmarks.adjacent, color: 'border-purple-200 bg-purple-50/30' }
          ].map((cat, i) => (
            <div key={i} className={`border rounded-xl p-4 ${cat.color}`}>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">{cat.label}</h4>
              <div className="flex flex-wrap gap-2">
                {cat.list.map((name) => {
                  const isSelected = state.selectedBenchmarks.includes(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleBenchmark(name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, step: 1 }))}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Objective
          </button>
          <button 
            onClick={handleNextStep}
            disabled={state.selectedBenchmarks.length === 0 || state.isLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Analysis Matrix'}
            {!state.isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    if (!state.matrixData) return null;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Competitor Benchmark Matrix
          </h2>
          <p className="text-sm text-gray-600 mb-4">Agent 2 mined live web documentation, and Agent 3 executed an automated 1-pass quality audit with 2nd targeted search refinement.</p>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs bg-white">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node, ...props }) => (
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs" {...props} />
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-gray-50 border-b border-gray-200" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="divide-y divide-gray-100 bg-white" {...props} />
              ),
              tr: ({ node, children, ...props }: any) => {
                return (
                  <tr className="hover:bg-gray-50/80 transition-colors" {...props}>
                    {React.Children.map(children, (child, idx) => {
                      if (React.isValidElement(child)) {
                        return React.cloneElement(child, { columnIndex: idx } as any);
                      }
                      return child;
                    })}
                  </tr>
                );
              },
              th: ({ node, children, columnIndex, ...props }: any) => {
                let titleText = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
                const isOurProduct = columnIndex === 1 || /Our Product/i.test(titleText);
                const displayTitle = titleText ? titleText.replace(/\(Motorola\)|\/Motorola|\/Current/gi, '').trim() : children;
                
                if (isOurProduct) {
                  return (
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider bg-blue-600 text-white border-x-2 border-x-blue-700 shadow-xs" {...props}>
                      <span>{displayTitle}</span>
                    </th>
                  );
                }
                return (
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-b border-gray-200" {...props}>
                    {displayTitle}
                  </th>
                );
              },
              td: ({ node, children, columnIndex, ...props }: any) => {
                const getChildText = (c: any): string => {
                  if (typeof c === 'string') return c;
                  if (typeof c === 'number') return String(c);
                  if (Array.isArray(c)) return c.map(getChildText).join('');
                  if (c && c.props && c.props.children) return getChildText(c.props.children);
                  return '';
                };
                const rawText = getChildText(children);
                const isCriterion = columnIndex === 0;
                const isOurProduct = columnIndex === 1;

                let badge = null;
                let cleanText = rawText;

                if (/\[FULL\]/i.test(rawText)) {
                  badge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 mb-1.5 shadow-2xs">
                      FULL
                    </span>
                  );
                  cleanText = rawText.replace(/\[FULL\]|🟢/gi, '').trim();
                } else if (/\[PARTIAL\]/i.test(rawText)) {
                  badge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-1.5 shadow-2xs">
                      PARTIAL
                    </span>
                  );
                  cleanText = rawText.replace(/\[PARTIAL\]|🟡/gi, '').trim();
                } else if (/\[NONE\]/i.test(rawText)) {
                  badge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 mb-1.5 shadow-2xs">
                      NONE
                    </span>
                  );
                  cleanText = rawText.replace(/\[NONE\]|🔴/gi, '').trim();
                }

                return (
                  <td 
                    className={`px-5 py-3.5 text-xs align-top leading-relaxed min-w-[200px] max-w-[280px] ${
                      isCriterion 
                        ? 'font-bold text-gray-900 bg-gray-50/50' 
                        : isOurProduct 
                          ? 'bg-blue-50/70 border-x-2 border-x-blue-200 text-gray-700 font-normal shadow-2xs' 
                          : 'text-gray-700 font-normal'
                    }`} 
                    {...props}
                  >
                    <div className="max-h-32 overflow-y-auto pr-1">
                      {badge}
                      <div className={`text-xs ${isCriterion ? 'font-bold text-gray-900' : 'font-normal text-gray-700'}`}>
                        {cleanText || children}
                      </div>
                    </div>
                  </td>
                );
              }
            }}
          >
            {state.matrixData.markdownTable}
          </ReactMarkdown>
        </div>

        {state.matrixData.sources && state.matrixData.sources.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> Cited Grounding Web Sources ({state.matrixData.sources.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {state.matrixData.sources.map((s, idx) => (
                <a
                  key={idx}
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 hover:border-blue-500 rounded-md text-xs text-blue-600 hover:underline transition-colors shadow-2xs"
                >
                  <span className="truncate max-w-[220px]">{s.title || s.uri}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, step: 2 }))}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Benchmarks
          </button>
          <button 
            onClick={handleNextStep}
            disabled={state.isLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Synthesis'}
            {!state.isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    if (!state.synthesisData) return null;
    const { swot, gaps, prioritization } = state.synthesisData;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" /> Strategic Synthesis & SWOT
          </h2>
          <p className="text-sm text-gray-600 mb-4">Agent 4 synthesized matrix findings into competitor SWOT, gaps, and MoSCoW priorities.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Competitor SWOT</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {swot.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <h4 className="font-bold text-gray-900 text-sm border-b pb-1 border-gray-100">{item.competitor}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-emerald-700 block mb-1">Strengths</span>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      {item.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-rose-700 block mb-1">Weaknesses</span>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      {item.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">MoSCoW Feature Prioritization</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Feature Module</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Priority</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Strategic Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prioritization.map((p, idx) => {
                  let badgeColor = 'bg-gray-100 text-gray-800';
                  let icon = '⚪';
                  if (/Must/i.test(p.priority)) { badgeColor = 'bg-red-100 text-red-800 font-semibold'; icon = '🔴'; }
                  else if (/Should/i.test(p.priority)) { badgeColor = 'bg-amber-100 text-amber-800 font-semibold'; icon = '🟡'; }
                  else if (/Could/i.test(p.priority)) { badgeColor = 'bg-blue-100 text-blue-800 font-semibold'; icon = '🔵'; }

                  return (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.item}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${badgeColor}`}>
                          <span>{icon}</span> {p.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, step: 3 }))}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Matrix
          </button>
          <button 
            onClick={handleNextStep}
            disabled={state.isLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Executive Report'}
            {!state.isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    if (!state.reportData) return null;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" /> Executive Recommendations
            </h2>
            <p className="text-sm text-gray-600 mt-1">Final report and actionable user stories.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportDOCX}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Export DOCX
            </button>
          </div>
        </div>

        <div id="report-content" className="bg-white p-8 sm:p-12 rounded-xl border border-gray-200 shadow-sm report-system-spec print:border-none print:shadow-none print:p-0">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ node, children, ...props }) => {
                const processBoldText = (c: React.ReactNode): React.ReactNode => {
                  return React.Children.map(c, (child) => {
                    if (typeof child === 'string') {
                      const regex = /(\*\*(?:As an|I want to|So that|MoSCoW Priority:|Acceptance Criteria:)\*\*)/gi;
                      const parts = child.split(regex);
                      if (parts.length > 1) {
                        return parts.map((part, index) => {
                          if (part.match(regex)) {
                            return <strong key={index} className="font-bold text-gray-900">{part.replace(/\*\*/g, '')}</strong>;
                          }
                          return part;
                        });
                      }
                    }
                    return child;
                  });
                };
                return <p className="mb-4 leading-relaxed text-gray-800 text-sm" {...props}>{processBoldText(children)}</p>;
              },
              strong: ({ node, children, ...props }) => (
                <strong className="font-bold text-gray-900" {...props}>{children}</strong>
              ),
              table: ({ node, ...props }) => (
                <div className="my-6 overflow-x-auto border border-gray-200 rounded-lg shadow-2xs">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-[#0F172A] text-white" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="divide-y divide-gray-200 bg-white" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider text-xs" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="px-4 py-3 text-gray-700 align-top text-xs" {...props} />
              ),
              blockquote: ({ node, children, ...props }) => (
                <blockquote className="my-6 border-l-4 border-[#0F172A] bg-[#F8FAFC] p-4 rounded-r-lg shadow-2xs text-gray-800 text-sm leading-relaxed" {...props}>
                  {children}
                </blockquote>
              )
            }}
          >
            {state.reportData}
          </ReactMarkdown>
        </div>

        <div className="flex justify-between items-center pt-4 print:hidden">
          <button 
            onClick={() => setState(prev => ({ ...prev, step: 4 }))}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Synthesis
          </button>
          <button 
            onClick={handleStartNewAnalysis}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Start New Analysis
          </button>
        </div>
      </div>
    );
  };

  const renderHomePage = () => {
    const pillars = [
      {
        id: 'quality',
        title: 'Quality',
        subtitle: 'Shifting Left to Target Zero Escaped Defects',
        icon: ShieldCheck,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        borderColor: 'border-gray-200',
        description: 'Achieve zero customer-found escaped defects by shifting left, auditing defects across component and platform tests, and leveraging AI-driven automated testing early.',
        status: 'Planned',
        isActive: false
      },
      {
        id: 'productivity',
        title: 'Productivity',
        subtitle: 'Scaling Output with AI-Assisted Engineering',
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        borderColor: 'border-gray-200',
        description: 'Accelerate feature velocity by integrating AI tools into daily coding, debugging, testing, and documentation workflows while tracking quantifiable efficiency gains.',
        status: 'Planned',
        isActive: false
      },
      {
        id: 'cycle-time',
        title: 'Cycle Time',
        subtitle: 'Driving Delivery Velocity and Agility',
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        borderColor: 'border-gray-200',
        description: 'Drastically reduce time-to-market by streamlining end-to-end workflows across feature delivery, platform upgrades, and test execution.',
        status: 'Planned',
        isActive: false
      },
      {
        id: 'innovation',
        title: 'Innovation',
        subtitle: 'Fostering Engineering-Led Feature Ideation',
        icon: Sparkles,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        borderColor: 'border-gray-200',
        description: 'Shift to active innovators by using AI to brainstorm, prototype, and inject customer-centric, monetizable engineering features directly into product roadmaps.',
        status: 'Planned',
        isActive: false
      },
      {
        id: 'competitiveness',
        title: 'Competitiveness',
        subtitle: 'Outpacing the Market & Industry Leaders',
        icon: Target,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        borderColor: 'border-blue-500 ring-2 ring-blue-500/20',
        description: 'Conduct rigorous competitive analysis against market leaders to build market-differentiating features that actively outpace competition.',
        status: 'Active Tool',
        isActive: true,
        toolName: 'Benchmarking Acceleration'
      }
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-500 py-2">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-8 sm:p-10 text-white shadow-md relative overflow-hidden">
          <div className="max-w-2xl space-y-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Zap className="w-3.5 h-3.5 text-blue-400" /> Enterprise Performance Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Accelerate Strategic Excellence
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Select a strategic pillar below to access specialized AI-driven benchmark tools, performance frameworks, and operational acceleration suites.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
        </div>

        {/* 5 Strategic Pillar Rounded Cards */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" /> Strategic Pillar Suite
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">Click on Competitiveness to launch the Benchmarking Acceleration engine.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars.map((p) => {
              const IconComp = p.icon;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (p.isActive) {
                      navigateToBenchmarking();
                    }
                  }}
                  className={`rounded-2xl border ${p.borderColor} bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group ${
                    p.isActive ? 'cursor-pointer hover:border-blue-600' : 'cursor-default opacity-85'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center`}>
                        <IconComp className={`w-6 h-6 ${p.color}`} />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-2xs font-semibold ${
                        p.isActive 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-xs font-semibold text-blue-600 mt-0.5">
                        {p.subtitle}
                      </p>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  {p.isActive ? (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToBenchmarking();
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-xs hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        <span>Launch {p.toolName}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-2xs text-gray-400 font-medium">
                      <span>Module in Roadmap</span>
                      <LockIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Top Configuration Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle Sidebar Menu"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div 
              onClick={navigateToHome}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors">
                  Cloud Services AI Suite
                </h1>
                <p className="text-2xs text-gray-500 leading-none">Enterprise Intelligence Portal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="hidden sm:flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
              <span className="text-2xs text-gray-500 font-medium uppercase">Model:</span>
              <select
                value={modelName}
                onChange={(e) => handleModelChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer"
              >
                <optgroup label="Gemini 3.x Series">
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (Latest Fast & Intelligent)</option>
                  <option value="gemini-3.5-pro">Gemini 3.5 Pro (State-of-the-Art)</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3-pro">Gemini 3 Pro (Advanced Reasoning)</option>
                  <option value="gemini-3-flash">Gemini 3 Flash</option>
                </optgroup>
                <optgroup label="Gemini 2.x Series">
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro (Experimental)</option>
                </optgroup>
                <optgroup label="Gemini 1.5 Series & Aliases">
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-flash-latest">Gemini Flash (Latest Alias)</option>
                </optgroup>
              </select>
            </div>

            {/* API Key Input Field */}
            <div className="flex items-center gap-2">
              <div className={`relative flex items-center rounded-lg border transition-all ${
                isApiKeyInvalid 
                  ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' 
                  : 'border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white'
              }`}>
                <Key className={`w-4 h-4 ml-2.5 flex-shrink-0 ${isApiKeyInvalid ? 'text-red-500' : 'text-gray-400'}`} />
                <input
                  type="password"
                  placeholder="Google AI Studio API Key..."
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="w-40 sm:w-56 px-2.5 py-1.5 text-xs bg-transparent outline-none text-gray-900 placeholder:text-gray-400 font-mono"
                />
                {apiKey && (
                  <button
                    onClick={handleClearKey}
                    className="p-1 text-gray-400 hover:text-gray-600 mr-1 text-2xs"
                    title="Clear API Key"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Sidebar Menu */}
        {isSidebarOpen && (
          <aside className="w-64 flex-shrink-0 space-y-6 animate-in slide-in-from-left-4 duration-300">
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-4">
              <div className="px-2 pt-1 pb-2 border-b border-slate-800">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Navigation Menu</span>
                <button
                  onClick={navigateToHome}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeView === 'home'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home Dashboard</span>
                </button>
              </div>

              <div>
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">Strategic Pillars</span>
                <nav className="space-y-1">
                  {[
                    { title: 'Quality', icon: ShieldCheck },
                    { title: 'Productivity', icon: TrendingUp },
                    { title: 'Cycle Time', icon: Clock },
                    { title: 'Innovation', icon: Sparkles }
                  ].map((p, idx) => {
                    const IconComp = p.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800/50 cursor-not-allowed transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComp className="w-4 h-4 text-slate-500" />
                          <span>{p.title}</span>
                        </div>
                        <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Soon</span>
                      </div>
                    );
                  })}

                  {/* Competitiveness Expandable Accordion Item */}
                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => setIsCompetitivenessExpanded(!isCompetitivenessExpanded)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Target className="w-4 h-4 text-blue-400" />
                        <span>Competitiveness</span>
                      </div>
                      {isCompetitivenessExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    {isCompetitivenessExpanded && (
                      <div className="pl-4 space-y-1 animate-in fade-in duration-200">
                        <button
                          onClick={navigateToBenchmarking}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            activeView === 'benchmarking'
                              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span className="truncate">Benchmarking Acceleration</span>
                        </button>
                      </div>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* API Key Missing Alert Toast Banner */}
          {state.error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800 text-xs shadow-xs animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{state.error}</div>
              <button 
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="text-red-500 hover:text-red-700 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeView === 'home' ? (
            renderHomePage()
          ) : (
            <div className="space-y-6">
              {/* Breadcrumb Header */}
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <button onClick={navigateToHome} className="hover:text-blue-600 font-medium flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" /> Home
                  </button>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span>Competitiveness</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="font-semibold text-blue-600">Benchmarking Acceleration</span>
                </div>

                <button
                  onClick={navigateToHome}
                  className="text-xs font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                </button>
              </div>

              {/* Step Navigation Indicator Bar */}
              <StepIndicator 
                currentStep={state.step} 
                maxStepReached={maxStepReached}
                onStepClick={handleStepClick}
              />

              {/* Step Content */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs min-h-[500px]">
                {state.step === 1 && renderStep1()}
                {state.step === 2 && renderStep2()}
                {state.step === 3 && renderStep3()}
                {state.step === 4 && renderStep4()}
                {state.step === 5 && renderStep5()}
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="bg-white border-t border-gray-200 py-4 mt-auto text-xs text-gray-500 text-center">
        <p>Benchmarking Accelerator Engine • Multi-Agent System Architecture</p>
      </footer>
    </div>
  );
}

function LockIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
