import React, { useState, useEffect } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { AppState, BenchmarkInputs } from './types';
import { generateScopeAndBenchmarks, generateMatrixWithSearch, generateSynthesis, generateFinalReport } from './services/geminiService';
import { exportReportToDOCX } from './utils/docxExporter';
import { 
  Loader2, ArrowRight, ArrowLeft, Search, FileText, Target, Lightbulb, 
  AlertCircle, Printer, Key, RotateCcw, Download, ExternalLink, Star,
  Home, ShieldCheck, TrendingUp, Clock, Sparkles, ChevronDown, ChevronRight,
  Menu, X, Layers, Zap
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCompetitivenessExpanded, setIsCompetitivenessExpanded] = useState(true);

  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);
  const [modelName, setModelName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('GEMINI_MODEL_NAME') || 'gemini-3.6-flash' : 'gemini-3.6-flash'));

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Define Objective & Context</h2>
        <p className="text-sm text-gray-500">Provide details about the business problem and product goals to guide the analysis.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What business problem are we trying to solve?
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            rows={3}
            placeholder="Elderly users often struggle with the complexity of Smart TV interfaces and settings, reducing their independence and requiring frequent assistance from family members or caregivers for everyday tasks."
            value={state.inputs.businessProblem}
            onChange={(e) => updateInputs('businessProblem', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Product Context
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            rows={3}
            placeholder="Our Current Smart TV interfaces and configuration workflows can be difficult for elderly users to navigate, making simple actions such as changing channels, adjusting settings, or opening applications unnecessarily challenging when they are home alone."
            value={state.inputs.currentContext}
            onChange={(e) => updateInputs('currentContext', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What are we looking for?
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            rows={3}
            placeholder="Develop an AI-powered virtual assistant that enables elderly users to control and interact with their Smart TV using simple voice commands, making common tasks more intuitive while increasing their autonomy and reducing the need for external assistance."
            value={state.inputs.goals}
            onChange={(e) => updateInputs('goals', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleNextStep}
          disabled={state.isLoading || !state.inputs.businessProblem.trim() || !state.inputs.currentContext.trim() || !state.inputs.goals.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Objective...</span>
            </>
          ) : (
            <>
              <span>Next: Scope & Benchmarks</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
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
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Scope & Benchmark Selection</h2>
          <p className="text-sm text-gray-500">Review the extracted feature scope and select which competitors to include in the live web benchmarking matrix.</p>
        </div>

        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Analysis Scope Definition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div><span className="font-bold text-gray-700">Target Feature:</span> <span className="text-gray-900">{scope.targetFeature}</span></div>
            <div><span className="font-bold text-gray-700">Analyzed Flow:</span> <span className="text-gray-900">{scope.analyzedFlow}</span></div>
            <div><span className="font-bold text-gray-700">Impacted User:</span> <span className="text-gray-900">{scope.impactedUser}</span></div>
            <div><span className="font-bold text-gray-700">Usage Scenario:</span> <span className="text-gray-900">{scope.usageScenario}</span></div>
            <div className="md:col-span-2"><span className="font-bold text-gray-700">Testing Methodology:</span> <span className="text-gray-900">{scope.testingMethod}</span></div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Select Competitor Benchmarks ({state.selectedBenchmarks.length} selected)</h3>

          {[
            { label: 'Direct Competitors', list: benchmarks.direct, color: 'bg-blue-50/30 border-blue-200' },
            { label: 'Market Reference (Best-in-Class)', list: benchmarks.market, color: 'bg-emerald-50/30 border-emerald-200' },
            { label: 'Adjacent SaaS / B2B Solutions', list: benchmarks.adjacent, color: 'bg-purple-50/30 border-purple-200' }
          ].map((group, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${group.color} space-y-2`}>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{group.label}</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {group.list.map(name => {
                  const selected = state.selectedBenchmarks.includes(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleBenchmark(name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        selected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span>{selected ? '✓' : '+'}</span>
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4">
          <button onClick={() => setState(prev => ({ ...prev, step: 1 }))} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Objective
          </button>
          <button
            onClick={handleNextStep}
            disabled={state.isLoading || state.selectedBenchmarks.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{state.agentStatus || 'Mining Live Web Data...'}</span>
              </>
            ) : (
              <>
                <span>Next: Analysis Matrix</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    if (!state.matrixData) return null;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Competitor Analysis Matrix</h2>
          <p className="text-sm text-gray-500">Live web data evaluated across competitor criteria with 1-pass critic auditing.</p>
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
          <button onClick={() => setState(prev => ({ ...prev, step: 2 }))} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Benchmarks
          </button>
          <button
            onClick={handleNextStep}
            disabled={state.isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Strategic Synthesis...</span>
              </>
            ) : (
              <>
                <span>Next: Synthesis & SWOT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    if (!state.synthesisData) return null;
    const { swot, gaps, prioritization } = state.synthesisData;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Strategic Synthesis & SWOT</h2>
          <p className="text-sm text-gray-500">Synthesized competitor SWOT, identified feature gaps, and MoSCoW priorities.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Competitor SWOT Analysis</h3>
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
          <button onClick={() => setState(prev => ({ ...prev, step: 3 }))} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Matrix
          </button>
          <button
            onClick={handleNextStep}
            disabled={state.isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Writing Executive Report...</span>
              </>
            ) : (
              <>
                <span>Next: Executive Report</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    if (!state.reportData) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" /> Executive Recommendations & User Stories
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Synthesis
          </button>
          <button 
            onClick={handleStartNewAnalysis}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium px-4 py-2 text-sm transition-colors"
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

          {activeView === 'home' && (
            <div className="text-xs text-gray-500 font-medium hidden sm:block">
              Select a pillar below or open the menu ☰ to launch tools
            </div>
          )}

          {activeView === 'benchmarking' && (
            <button
              onClick={navigateToHome}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" /> Back to Suite Home
            </button>
          )}
        </div>
      </header>

      {/* Conventional Off-Canvas Overlay Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Conventional Slide-over Sidebar Container */}
          <aside className="relative z-50 w-72 bg-slate-900 text-white min-h-screen shadow-2xl flex flex-col p-5 animate-in slide-in-from-left duration-300 border-r border-slate-800">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm leading-tight">Cloud Services AI</h2>
                  <p className="text-3xs text-slate-400">Navigation Drawer</p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Close Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">Main View</span>
                <button
                  onClick={() => {
                    navigateToHome();
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeView === 'home'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home Dashboard</span>
                </button>
              </div>

              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">Strategic Pillars</span>
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
                        <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-semibold">Soon</span>
                      </div>
                    );
                  })}

                  {/* Competitiveness Expandable Accordion Item */}
                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => setIsCompetitivenessExpanded(!isCompetitivenessExpanded)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
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
                          onClick={() => {
                            navigateToBenchmarking();
                            setIsSidebarOpen(false);
                          }}
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

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 text-3xs text-slate-500">
              <p>Cloud Services AI Suite v1.0</p>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        {activeView === 'home' ? (
          <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderHomePage()}
          </main>
        ) : (
          /* Exact 100% Original Benchmarking Accelerator Layout from main branch */
          <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12 print:mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-2">
                  Benchmarking Accelerator
                </h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto print:hidden">
                  Streamline your product analysis workflow from objective definition to actionable user stories, and generate an executive report on feature value.
                </p>
              </div>

              {/* API Key Configuration Bar (Exact original design) */}
              <div className={`mb-6 p-4 rounded-xl border transition-all flex flex-col gap-3 print:hidden ${
                isApiKeyInvalid || (state.error && !apiKey.trim())
                  ? 'bg-red-50/80 border-red-300 shadow-md ring-2 ring-red-400'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isApiKeyInvalid || !apiKey.trim() 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-800">Gemini API Key</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          apiKey.trim() && !isApiKeyInvalid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800 font-bold'
                        }`}>
                          {apiKey.trim() && !isApiKeyInvalid ? 'Direct Mode (Ready)' : 'API Key Required'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {apiKey.trim() 
                          ? 'Direct client-side execution via Google AI Studio API.' 
                          : 'Enter your Google AI Studio API key to run without a local backend server.'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <select
                      value={modelName}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      title="Gemini Model"
                    >
                      <optgroup label="Gemini 3.x Series">
                        <option value="gemini-3.6-flash">gemini-3.6-flash (Latest)</option>
                        <option value="gemini-3.5-pro">gemini-3.5-pro (SOTA)</option>
                        <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                        <option value="gemini-3-pro">gemini-3-pro</option>
                        <option value="gemini-3-flash">gemini-3-flash</option>
                      </optgroup>
                      <optgroup label="Gemini 2.x Series">
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                        <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                        <option value="gemini-2.0-pro-exp-02-05">gemini-2.0-pro-exp-02-05</option>
                      </optgroup>
                      <optgroup label="Gemini 1.5 Series & Aliases">
                        <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                        <option value="gemini-flash-latest">gemini-flash-latest</option>
                      </optgroup>
                    </select>
                    <input
                      type="password"
                      placeholder="Enter API Key..."
                      className={`w-full sm:w-64 p-2 border rounded-lg text-sm outline-none transition-all ${
                        isApiKeyInvalid || (state.error && !apiKey.trim())
                          ? 'border-red-500 ring-2 ring-red-400 bg-red-100/50 text-red-900 font-semibold placeholder-red-400'
                          : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                    />
                    {apiKey.trim() && (
                      <button
                        onClick={handleClearKey}
                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium transition-colors"
                        title="Remove saved API key"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {(isApiKeyInvalid || (state.error && !apiKey.trim())) && (
                  <div className="w-full bg-red-100/90 border border-red-300 text-red-800 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>
                      {isApiKeyInvalid 
                        ? 'Invalid or Rejected API Key. Please enter a valid Google AI Studio API Key in the highlighted field above.' 
                        : 'API Key Field is Empty. You must enter a valid Google AI Studio API Key before generating an analysis.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Exact Original Outer Container from main branch */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10 min-h-[600px] print:shadow-none print:border-none print:p-0">
                <div className="print:hidden">
                  <StepIndicator currentStep={state.step} maxStepReached={maxStepReached} onStepClick={handleStepClick} />
                </div>
                
                {state.error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md flex items-start gap-3 print:hidden">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{state.error}</p>
                    </div>
                  </div>
                )}

                <div className="mt-8 print:mt-0">
                  {state.step === 1 && renderStep1()}
                  {state.step === 2 && renderStep2()}
                  {state.step === 3 && renderStep3()}
                  {state.step === 4 && renderStep4()}
                  {state.step === 5 && renderStep5()}
                </div>
              </div>
            </div>
          </div>
        )}
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
