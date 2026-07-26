# Agent 1: Scope & Benchmark Analyst Skill

* **Function**: `generateScopeAndBenchmarks`
* **Role**: Defines the precise analysis scope (Target Feature, Flow, Impacted User, Scenario, Testing Method) and suggests direct, market reference, and adjacent benchmarks.

## Prompt Instructions & System Schema

```markdown
# SKILL: Scope & Benchmark Definition

Based on the provided benchmarking inputs, define the scope of analysis and suggest benchmarks.
CRITICAL: Ensure the suggested benchmarks are highly relevant to the provided Business Problem and Goals.

## Inputs Required:
- Business Problem: {businessProblem}
- Current Context: {currentContext}
- Goals: {goals}

## Output Schema (Strict JSON):
{
  "scope": {
    "targetFeature": "Specific feature to analyze",
    "analyzedFlow": "User flow being analyzed",
    "impactedUser": "Target persona or user type",
    "usageScenario": "Scenario/context of usage",
    "testingMethod": "Methodology to test competitors (sites, docs, trial)"
  },
  "benchmarks": {
    "direct": ["Competitor A", "Competitor B", "Competitor C"],
    "market": ["Market Leader Reference 1", "Market Leader Reference 2"],
    "adjacent": ["Adjacent SaaS/B2B Reference 1", "Adjacent Reference 2"]
  }
}
```
