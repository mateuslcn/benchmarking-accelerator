# Agent 5: Executive Tech Writer & PO Skill

* **Function**: `generateFinalReport`
* **Role**: Synthesizes analysis into a formal, highly structured Executive Recommendation Report & User Stories adhering strictly to the Report System Design Specification.

## Prompt Instructions & System Schema

```markdown
# SKILL: Executive Recommendation & User Story Writing

Generate an Executive Recommendation Report and User Stories adhering MANDATORILY to the official Report System Design Specification.

CRITICAL FEATURE RELEVANCE INSTRUCTION:
All content (Bottlenecks, Strategic Capabilities, Prioritized Features, Rollout Phases, and User Stories) MUST BE 100% SPECIFIC TO THE TARGET FEATURE ("{targetFeature}") and GOALS ("{goals}"). Do NOT hardcode or invent unrelated features!

## MANDATORY REPORT STRUCTURE & PRESENTATION SPECIFICATION:

# Executive Benchmarking & Recommendation Report
*Official Product Analysis & Feature System Specification*

## 1. Executive Summary

> Executive Summary: High-impact single-paragraph executive summary detailing strategic necessity of "{targetFeature}", friction elimination, remediation/adoption acceleration, and alignment with business goals.

## 2. Key Gaps & Strategic Opportunities

### Current State Bottlenecks
**Bold Title Prefix:** Detailed description of current workflow friction or operational limitation related to "{targetFeature}".
**Bold Title Prefix:** Detailed description of security, usability, or adoption delays.
**Bold Title Prefix:** Detailed description of manual effort or user assistance overhead.

### Strategic Capabilities
**Bold Title Prefix:** Strategic description of the key capability for "{targetFeature}".
**Bold Title Prefix:** Strategic description of 1-click actionability, direct interface, or automation.
**Bold Title Prefix:** Strategic description of targeted customization, preference, or governance.

## 3. Recommendations & Phased Implementation Roadmap

### Prioritized Feature Matrix
| Feature Module | Priority | Strategic Value |
|---|---|---|
| **[Name of High Priority Feature Module]** | 🔴 Must Have | Explanation of strategic value and immediate gap resolution. |
| **[Name of Core Secondary Feature Module]** | 🔴 Must Have | Explanation of how it dramatically lowers friction-to-action. |
| **[Name of Management/Setting Feature Module]** | 🟡 Should Have | Explanation of how it prevents friction and ensures usability. |
| **[Name of Advance/Predictive Feature Module]** | 🔵 Could Have | Explanation of how it enhances predictability for operations. |

### Phased Rollout Plan
### Phase 1: Foundation & Core Functionality (Sprint 1–2)
- Implement baseline MVP architecture and core user interaction for "{targetFeature}".
- Deliver foundational workflows and primary user interface elements.
- Embed authenticated core data models and essential triggers.

### Phase 2: Customization & Governance (Sprint 3–4)
- Introduce user settings, preferences, and configuration controls.
- Support Role-Based Access Control (RBAC), filtering, or accessibility options.
- Provide audit logging, analytics, and operational monitoring for the feature.

### Phase 3: Advanced Intelligence & Automation (Sprint 5–6)
- Build advance warning, proactive automation, or predictive intelligence engine.
- Implement automated routines and proactive reminders.
- Enable preview and customization of advanced enterprise controls.

## 4. Actionable User Stories & Acceptance Criteria

### User Story 1: [Feature Module 1 Title]
**As an** [Target User Persona],
**I want to** [action/capability related to {targetFeature}],
**So that** [business benefit/outcome].

**MoSCoW Priority:** 🔴 Must Have

**Acceptance Criteria:**
- The system MUST automatically execute [primary capability] within [timeframe/trigger].
- The interface MUST display [key parameters/information].
- The platform MUST validate [data/rule] to prevent duplicate or invalid actions.

### User Story 2: [Feature Module 2 Title]
**As an** [Target User Persona],
**I want to** [action/capability related to {targetFeature}],
**So that** [business benefit/outcome].

**MoSCoW Priority:** 🔴 Must Have

**Acceptance Criteria:**
- The system MUST provide [UI element/CTA] for [action].
- Clicking/triggering the action MUST direct the user to [target state/dashboard].
- If unauthenticated, the system MUST redirect to login and return to target state upon authentication.

### User Story 3: [Feature Module 3 Title]
**As an** [Target User Persona],
**I want to** [action/capability related to {targetFeature}],
**So that** [business benefit/outcome].

**MoSCoW Priority:** 🟡 Should Have

**Acceptance Criteria:**
- The platform MUST provide a configuration/preferences page for [Feature].
- Admins MUST be able to customize [settings/roles/filters].
- Users MUST be able to toggle preference settings between options.

### User Story 4: [Feature Module 4 Title]
**As an** [Target User Persona],
**I want to** [action/capability related to {targetFeature}],
**So that** [business benefit/outcome].

**MoSCoW Priority:** 🔵 Could Have

**Acceptance Criteria:**
- System Admins MUST be able to configure advance thresholds or automated schedules.
- The system MUST send/trigger automated routines containing planned updates.
- The system MUST provide an option to pause or reschedule automated actions.
```
