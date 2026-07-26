import React, { useState } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { AppState, BenchmarkInputs } from './types';
import { generateScopeAndBenchmarks, generateMatrixWithSearch, generateSynthesis, generateFinalReport } from './services/geminiService';
import { exportReportToDOCX } from './utils/docxExporter';
import { Loader2, ArrowRight, ArrowLeft, Search, FileText, Target, Lightbulb, AlertCircle, Printer, Key, RotateCcw, Download, ExternalLink, Star } from 'lucide-react';
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
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);
  const [modelName, setModelName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('GEMINI_MODEL_NAME') || 'gemini-flash-latest' : 'gemini-flash-latest'));

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
    console.error(error);
    const msg = error?.message || String(error) || '';
    const isKeyIssue = !apiKey.trim() || /API Key|API_KEY_INVALID|invalid API key|API key not valid|400|401|403|unauthenticated/i.test(msg);
    
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

    const toggleBenchmark = (b: string) => {
      setState(prev => ({
        ...prev,
        selectedBenchmarks: prev.selectedBenchmarks.includes(b)
          ? prev.selectedBenchmarks.filter(item => item !== b)
          : [...prev.selectedBenchmarks, b],
        matrixData: null,
        synthesisData: null,
        reportData: null
      }));
    };

    const renderBenchmarkCheckbox = (b: string, type: string) => (
      <label key={b} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${state.selectedBenchmarks.includes(b) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
        <input
          type="checkbox"
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          checked={state.selectedBenchmarks.includes(b)}
          onChange={() => toggleBenchmark(b)}
        />
        <span className="text-sm font-medium text-gray-800">{b}</span>
        <span className="text-xs text-gray-500 ml-auto bg-gray-100 px-2 py-1 rounded-full">{type}</span>
      </label>
    );

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" /> Scope & Selected Benchmarks
          </h2>
          <p className="text-sm text-gray-600 mb-6">AI has generated the scope of analysis and suggested competitors based on your objectives. Select the ones you want to include in the deep analysis.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 text-sm">Analysis Scope</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimension</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  <tr>
                    <td className="px-6 py-3.5 font-medium text-gray-900 whitespace-nowrap bg-gray-50/50">Target Feature</td>
                    <td className="px-6 py-3.5 text-gray-700">{state.scopeData.scope.targetFeature}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-medium text-gray-900 whitespace-nowrap bg-gray-50/50">Analyzed Flow</td>
                    <td className="px-6 py-3.5 text-gray-700">{state.scopeData.scope.analyzedFlow}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-medium text-gray-900 whitespace-nowrap bg-gray-50/50">Impacted User</td>
                    <td className="px-6 py-3.5 text-gray-700">{state.scopeData.scope.impactedUser}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-medium text-gray-900 whitespace-nowrap bg-gray-50/50">Usage Scenario</td>
                    <td className="px-6 py-3.5 text-gray-700">{state.scopeData.scope.usageScenario}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-medium text-gray-900 whitespace-nowrap bg-gray-50/50">Testing Method</td>
                    <td className="px-6 py-3.5 text-gray-700">{state.scopeData.scope.testingMethod}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2 text-sm">Suggested Benchmarks</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 flex-1">
              {state.scopeData.benchmarks.direct.map(b => renderBenchmarkCheckbox(b, 'Direct'))}
              {state.scopeData.benchmarks.market.map(b => renderBenchmarkCheckbox(b, 'Market'))}
              {state.scopeData.benchmarks.adjacent.map(b => renderBenchmarkCheckbox(b, 'Adjacent'))}
            </div>
            <p className="text-xs text-gray-500 mt-4 italic">* We recommend selecting up to 4 benchmarks for optimal analysis quality.</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setState(prev => ({ ...prev, step: 1 }))} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-3 py-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleStartNewAnalysis} className="text-gray-500 hover:text-blue-600 font-medium px-3 py-2 text-sm transition-colors flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Start New Analysis
            </button>
          </div>
          <div className="flex items-center gap-3">
            {state.isLoading && state.agentStatus && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 animate-pulse flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                {state.agentStatus}
              </span>
            )}
            <button 
              onClick={handleNextStep}
              disabled={state.isLoading || state.selectedBenchmarks.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm shadow-sm"
            >
              {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Run Multi-Agent Analysis (Web Search)'}
              {!state.isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    if (!state.matrixData) return null;
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Comparison Matrix
          </h2>
          <p className="text-sm text-gray-600">AI has searched the web to build this comparison based on your criteria.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <table className="min-w-full divide-y divide-gray-200" {...props} />
                ),
                thead: ({ node, ...props }) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-gray-200 text-sm" {...props} />,
                tr: ({ node, children, ...props }: any) => {
                  const childrenArray = React.Children.toArray(children);
                  return (
                    <tr className="hover:bg-gray-50/60 transition-colors border-b border-gray-100" {...props}>
                      {childrenArray.map((child, index) => {
                        if (!React.isValidElement(child)) return child;
                        return React.cloneElement(child as React.ReactElement<any>, { columnIndex: index });
                      })}
                    </tr>
                  );
                },
                th: ({ node, children, columnIndex, ...props }: any) => {
                  let titleText = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
                  const isOurProduct = columnIndex === 1 || /Our Product/i.test(titleText);
                  
                  // Clean up title to remove "(Motorola)", "/Motorola", "/Current" if present
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
                },
              }}
            >
              {state.matrixData.markdownTable}
            </ReactMarkdown>
          </div>
        </div>

        {state.matrixData.sources.length > 0 && (() => {
          const formatSourceLabel = (source: { uri: string; title: string }) => {
            try {
              const urlObj = new URL(source.uri);
              const domain = urlObj.hostname.replace(/^www\./, '');
              const path = urlObj.pathname.replace(/\/$/, '');
              
              let mainTitle = source.title && source.title.trim().length > 0 ? source.title.trim() : domain;
              if (mainTitle.length > 40) {
                mainTitle = mainTitle.substring(0, 37) + '...';
              }
              
              const pathBadge = path && path !== '' && path !== '/' ? (path.length > 25 ? path.substring(0, 22) + '...' : path) : '';

              return { mainTitle, domain, pathBadge };
            } catch (e) {
              return { mainTitle: source.title || source.uri, domain: '', pathBadge: '' };
            }
          };

          return (
            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 shadow-2xs">
              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Search className="w-3.5 h-3.5 text-blue-600" /> Evidence Sources ({state.matrixData.sources.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {state.matrixData.sources.map((source, idx) => {
                  const { mainTitle, pathBadge } = formatSourceLabel(source);
                  return (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${source.title ? source.title + ' - ' : ''}${source.uri}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-medium text-gray-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all shadow-2xs group"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-600 flex-shrink-0" />
                      <span className="font-semibold text-gray-900">{mainTitle}</span>
                      {pathBadge && (
                        <span className="text-[11px] font-mono text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200/50">
                          {pathBadge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setState(prev => ({ ...prev, step: 2 }))} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-3 py-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleStartNewAnalysis} className="text-gray-500 hover:text-blue-600 font-medium px-3 py-2 text-sm transition-colors flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Start New Analysis
            </button>
          </div>
          <button 
            onClick={handleNextStep}
            disabled={state.isLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Synthesize Findings'}
            {!state.isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    if (!state.synthesisData) return null;
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" /> Synthesis & Prioritization
          </h2>
          <p className="text-sm text-gray-600">Evaluating strengths, weaknesses, identifying gaps, and prioritizing features.</p>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Identified Gaps & Strategic Opportunities</h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Need</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Product Gap</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategic Opportunity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {state.synthesisData.gaps.map((gap, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900 align-top">{gap.need}</td>
                      <td className="px-6 py-4 text-red-700 bg-red-50/40 align-top">{gap.gap}</td>
                      <td className="px-6 py-4 text-green-800 bg-green-50/40 font-medium align-top">{gap.opportunity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {state.synthesisData.swot && state.synthesisData.swot.length > 0 && (
            <section>
              <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Competitor SWOT & Takeaways</h3>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competitor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strengths</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weaknesses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key Takeaways</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    {state.synthesisData.swot.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-gray-900 align-top bg-gray-50/30">{item.competitor}</td>
                        <td className="px-6 py-4 text-gray-700 align-top">
                          <ul className="list-disc pl-4 space-y-1">
                            {item.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </td>
                        <td className="px-6 py-4 text-gray-700 align-top">
                          <ul className="list-disc pl-4 space-y-1">
                            {item.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </td>
                        <td className="px-6 py-4 align-top space-y-2">
                          {item.reuse && item.reuse.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-green-800 bg-green-100 px-2 py-0.5 rounded">Reuse / Adopt:</span>
                              <p className="text-xs text-gray-700 mt-1">{item.reuse.join(', ')}</p>
                            </div>
                          )}
                          {item.avoid && item.avoid.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-red-800 bg-red-100 px-2 py-0.5 rounded">Avoid:</span>
                              <p className="text-xs text-gray-700 mt-1">{item.avoid.join(', ')}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Prioritization (MoSCoW)</h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {state.synthesisData.prioritization.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${item.priority.includes('Must') ? 'bg-red-100 text-red-800' : 
                            item.priority.includes('Should') ? 'bg-yellow-100 text-yellow-800' : 
                            item.priority.includes('Could') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setState(prev => ({ ...prev, step: 3 }))} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-3 py-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleStartNewAnalysis} className="text-gray-500 hover:text-blue-600 font-medium px-3 py-2 text-sm transition-colors flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Start New Analysis
            </button>
          </div>
          <button 
            onClick={handleNextStep}
            disabled={state.isLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Final Report'}
            {!state.isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    if (!state.reportData) return null;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                    if (typeof child === 'string' && /Acceptance Criteria/i.test(child)) {
                      const parts = child.split(/(Acceptance Criteria:?)/gi);
                      return parts.map((part, i) =>
                        /Acceptance Criteria:?/i.test(part) ? (
                          <strong key={i} className="font-bold text-gray-900">{part}</strong>
                        ) : (
                          part
                        )
                      );
                    }
                    return child;
                  });
                };
                return <p {...props}>{processBoldText(children)}</p>;
              },
              li: ({ node, children, ...props }) => {
                const processBoldText = (c: React.ReactNode): React.ReactNode => {
                  return React.Children.map(c, (child) => {
                    if (typeof child === 'string' && /Acceptance Criteria/i.test(child)) {
                      const parts = child.split(/(Acceptance Criteria:?)/gi);
                      return parts.map((part, i) =>
                        /Acceptance Criteria:?/i.test(part) ? (
                          <strong key={i} className="font-bold text-gray-900">{part}</strong>
                        ) : (
                          part
                        )
                      );
                    }
                    return child;
                  });
                };
                return <li {...props}>{processBoldText(children)}</li>;
              }
            }}
          >
            {state.reportData}
          </ReactMarkdown>
        </div>

        <div className="flex justify-between items-center pt-4 print:hidden">
          <button onClick={() => setState(prev => ({ ...prev, step: 4 }))} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Synthesis
          </button>
          <button onClick={handleStartNewAnalysis} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium px-4 py-2 text-sm transition-colors">
            <RotateCcw className="w-4 h-4" /> Start New Analysis
          </button>
        </div>
      </div>
    );
  };

  return (
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

        {/* API Key Configuration Bar */}
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
                <option value="gemini-flash-latest">gemini-flash-latest (Recommended)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                <option value="gemini-pro-latest">gemini-pro-latest (Pro)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
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
  );
}

