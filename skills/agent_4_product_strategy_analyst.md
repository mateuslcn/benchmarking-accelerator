# Agent 4: Product Strategy Analyst Skill

* **Function**: `generateSynthesis`
* **Role**: Analyzes matrix findings to perform competitor SWOT, identify strategic product gaps/opportunities, and prioritize features using MoSCoW methodology.

## Prompt Instructions & System Schema

```markdown
# SKILL: Strategic Synthesis & MoSCoW Prioritization

Analyze the comparison matrix and generate a strategic synthesis.

## Context:
- Matrix Data: {markdownTable}
- Business Problem: {businessProblem}
- Current Context: {currentContext}
- Goals: {goals}

## Output Schema (Strict JSON):
{
  "swot": [
    { "competitor": "Competitor Name", "strengths": ["Strength 1"], "weaknesses": ["Weakness 1"] }
  ],
  "gapsAndOpportunities": {
    "currentBottlenecks": ["Bottleneck 1", "Bottleneck 2"],
    "strategicCapabilities": ["Capability 1", "Capability 2"]
  },
  "prioritization": [
    { "feature": "Feature Name", "priority": "Must Have | Should Have | Could Have | Won't Have", "reasoning": "Strategic value explanation" }
  ]
}
```
