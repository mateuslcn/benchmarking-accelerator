import { GoogleGenAI, Type } from '@google/genai';
import { BenchmarkInputs, ScopeAndBenchmarks, MatrixResult, SynthesisResult } from '../types';

import agent1SkillRaw from '../../skills/agent_1_scope_analyst.md?raw';
import agent2SkillRaw from '../../skills/agent_2_live_web_researcher.md?raw';
import agent3SkillRaw from '../../skills/agent_3_matrix_critic.md?raw';
import agent4SkillRaw from '../../skills/agent_4_product_strategy_analyst.md?raw';
import agent5SkillRaw from '../../skills/agent_5_executive_tech_writer.md?raw';

/**
 * Extracts inner prompt from skill markdown file and interpolates variables.
 */
function getSkillPrompt(rawMarkdown: string, variables: Record<string, string>): string {
  let body = rawMarkdown;
  const match = rawMarkdown.match(/```markdown([\s\S]*?)```/);
  if (match && match[1]) {
    body = match[1].trim();
  }

  for (const [key, val] of Object.entries(variables)) {
    body = body.replaceAll(`{${key}}`, val || '');
  }
  return body;
}

const getModelName = (): string => {
  if (typeof window !== 'undefined') {
    const savedModel = localStorage.getItem('GEMINI_MODEL_NAME');
    if (savedModel && savedModel.trim().length > 0) {
      return savedModel.trim();
    }
  }
  return 'gemini-2.5-flash';
};

const getAIClient = (): GoogleGenAI => {
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
  if (savedKey && savedKey.trim().length > 0) {
    return new GoogleGenAI({ apiKey: savedKey.trim() });
  }
  if (process.env.API_KEY && process.env.API_KEY.trim().length > 0) {
    return new GoogleGenAI({ apiKey: process.env.API_KEY.trim() });
  }
  throw new Error("API Key missing. Please enter a valid Google AI Studio API Key in the top configuration field.");
};

export const generateScopeAndBenchmarks = async (inputs: BenchmarkInputs): Promise<ScopeAndBenchmarks> => {
  const ai = getAIClient();
  const prompt = getSkillPrompt(agent1SkillRaw, {
    businessProblem: inputs.businessProblem,
    currentContext: inputs.currentContext,
    goals: inputs.goals
  });

  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scope: {
            type: Type.OBJECT,
            properties: {
              targetFeature: { type: Type.STRING, description: 'The specific feature to analyze' },
              analyzedFlow: { type: Type.STRING, description: 'The user flow being analyzed' },
              impactedUser: { type: Type.STRING, description: 'The type of user impacted' },
              usageScenario: { type: Type.STRING, description: 'The scenario in which it is used' },
              testingMethod: { type: Type.STRING, description: 'How to test competitors (e.g., Sites, docs)' },
            },
            required: ['targetFeature', 'analyzedFlow', 'impactedUser', 'usageScenario', 'testingMethod']
          },
          benchmarks: {
            type: Type.OBJECT,
            properties: {
              direct: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Direct competitors (up to 3)' },
              market: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Market references (best in class)' },
              adjacent: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Adjacent products (SAAS, B2B, etc.)' },
            },
            required: ['direct', 'market', 'adjacent']
          }
        },
        required: ['scope', 'benchmarks']
      }
    }
  });

  return JSON.parse(response.text) as ScopeAndBenchmarks;
};

export const reviewAndRefineMatrix = async (
  rawMatrix: string,
  inputs: BenchmarkInputs,
  scopeData: ScopeAndBenchmarks,
  selectedBenchmarks: string[]
): Promise<{ refinedMatrix: string; criticSources: { title: string; uri: string }[] }> => {
  const ai = getAIClient();
  const competitorsToAnalyze = selectedBenchmarks.join(', ');

  const criticPrompt = getSkillPrompt(agent3SkillRaw, {
    targetFeature: scopeData.scope.targetFeature,
    businessProblem: inputs.businessProblem,
    currentContext: inputs.currentContext,
    goals: inputs.goals,
    competitorsToAnalyze: competitorsToAnalyze,
    rawMatrix: rawMatrix
  });

  let criticSources: { title: string; uri: string }[] = [];

  try {
    const response = await ai.models.generateContent({
      model: getModelName(),
      contents: criticPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      }
    });

    const metadata = response.candidates?.[0]?.groundingMetadata;
    const chunks = metadata?.groundingChunks || [];
    criticSources = chunks
      .map(chunk => chunk.web)
      .filter((web): web is { uri: string; title: string } => web !== undefined && !!web.uri);

    if (response.text && response.text.includes('|')) {
      return { refinedMatrix: response.text.trim(), criticSources };
    }
  } catch (err) {
    console.warn('Agent 3 critic review fallback to raw matrix:', err);
  }

  return { refinedMatrix: rawMatrix, criticSources: [] };
};

export const generateMatrixWithSearch = async (
  inputs: BenchmarkInputs,
  scopeData: ScopeAndBenchmarks,
  selectedBenchmarks: string[],
  onStatusUpdate?: (status: string) => void
): Promise<MatrixResult> => {
  const ai = getAIClient();
  const competitorsToAnalyze = selectedBenchmarks.join(', ');
  
  if (onStatusUpdate) onStatusUpdate('Agent 2 (Web Researcher): Mining live web data...');

  const prompt = getSkillPrompt(agent2SkillRaw, {
    competitorsToAnalyze: competitorsToAnalyze,
    targetFeature: scopeData.scope.targetFeature,
    businessProblem: inputs.businessProblem,
    currentContext: inputs.currentContext,
    goals: inputs.goals
  });

  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    }
  });

  const metadata = response.candidates?.[0]?.groundingMetadata;
  const chunks = metadata?.groundingChunks || [];
  let sources = chunks
    .map(chunk => chunk.web)
    .filter((web): web is { uri: string; title: string } => web !== undefined && !!web.uri);

  if (sources.length === 0) {
    const webQueries = (metadata as any)?.webSearchQueries || [];
    if (webQueries.length > 0) {
      sources = webQueries.map((q: string) => ({
        uri: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        title: `Google Search: ${q}`
      }));
    } else {
      sources = selectedBenchmarks.map(b => ({
        uri: `https://www.google.com/search?q=${encodeURIComponent(b + ' ' + scopeData.scope.targetFeature)}`,
        title: `${b} - ${scopeData.scope.targetFeature}`
      }));
    }
  }

  const rawMatrix = response.text || '';

  if (onStatusUpdate) onStatusUpdate('Agent 3 (Matrix Critic): Auditing precision & executing targeted searches...');
  const { refinedMatrix, criticSources } = await reviewAndRefineMatrix(rawMatrix, inputs, scopeData, selectedBenchmarks);

  const combinedSources = [...sources, ...criticSources];
  const uniqueSources = Array.from(new Map(combinedSources.map(item => [item.uri, item])).values());

  return {
    markdownTable: refinedMatrix,
    sources: uniqueSources
  };
};

export const generateSynthesis = async (matrixText: string, inputs: BenchmarkInputs): Promise<SynthesisResult> => {
  const ai = getAIClient();
  const prompt = getSkillPrompt(agent4SkillRaw, {
    markdownTable: matrixText,
    businessProblem: inputs.businessProblem,
    currentContext: inputs.currentContext,
    goals: inputs.goals
  });

  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          swot: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                competitor: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                reuse: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What we can reuse/learn' },
                avoid: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What we should avoid' }
              },
              required: ['competitor', 'strengths', 'weaknesses', 'reuse', 'avoid']
            }
          },
          gaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                need: { type: Type.STRING, description: 'Business need' },
                gap: { type: Type.STRING, description: 'Identified gap in our product' },
                opportunity: { type: Type.STRING, description: 'Opportunity for improvement' }
              },
              required: ['need', 'gap', 'opportunity']
            }
          },
          prioritization: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING, description: 'Feature or improvement' },
                priority: { type: Type.STRING, description: 'Must Have, Should Have, Could Have, or Won\'t Have' },
                reason: { type: Type.STRING }
              },
              required: ['item', 'priority', 'reason']
            }
          }
        },
        required: ['swot', 'gaps', 'prioritization']
      }
    }
  });

  return JSON.parse(response.text) as SynthesisResult;
};

export const generateFinalReport = async (
  inputs: BenchmarkInputs,
  scope: ScopeAndBenchmarks,
  synthesis: SynthesisResult,
  matrixText?: string
): Promise<string> => {
  const ai = getAIClient();
  const prompt = getSkillPrompt(agent5SkillRaw, {
    businessProblem: inputs.businessProblem,
    currentContext: inputs.currentContext,
    goals: inputs.goals,
    targetFeature: scope.scope.targetFeature,
    markdownTable: matrixText || '',
    synthesisJSON: JSON.stringify(synthesis)
  });

  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: prompt,
    config: {
      temperature: 0.2,
    }
  });

  return response.text || '';
};
