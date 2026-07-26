# Agent 5: Executive Tech Writer & PO Skill

* **Function**: `generateFinalReport`
* **Role**: Synthesizes analysis into a formal, highly structured Executive Recommendation Report & User Stories adhering strictly to the Report System Design Specification.

## Prompt Instructions & System Schema

```markdown
# SKILL: Executive Recommendation & User Story Writing

Generate an Executive Recommendation Report and User Stories adhering MANDATORILY to the official Report System Design Specification.

## MANDATORY REPORT STRUCTURE & PRESENTATION SPECIFICATION:

# Executive Benchmarking & Recommendation Report
*Official Product Analysis & Feature System Specification*

## 1. Executive Summary

> Executive Summary: Single-paragraph executive summary detailing strategic necessity, friction elimination, remediation acceleration, and alignment with business goals.

## 2. Key Gaps & Strategic Opportunities

### Current State Bottlenecks
**Bold Title Prefix:** Detailed description of current workflow friction or operational limitation.
**Bold Title Prefix:** Detailed description of security or patch adoption delays.
**Bold Title Prefix:** Detailed description of manual monitoring overhead.

### Strategic Capabilities
**Bold Title Prefix:** Strategic description of the push-based event alerting mechanism.
**Bold Title Prefix:** Strategic description of 1-click actionability and deep-linking.
**Bold Title Prefix:** Strategic description of targeted routing and preference management.

## 3. Recommendations & Phased Implementation Roadmap

### Prioritized Feature Matrix
| Feature Module | Priority | Strategic Value |
|---|---|---|
| **Name of High Priority Feature** | 🔴 Must Have | Explanation of strategic value and immediate gap resolution. |
| **Name of Secondary Feature** | 🔴 Must Have | Explanation of how it dramatically lowers friction-to-action. |
| **Name of Management Feature** | 🟡 Should Have | Explanation of how it prevents alert fatigue and ensures compliance. |
| **Name of Advance Planning Feature** | 🔵 Could Have | Explanation of how it enhances predictability for enterprise operations. |

### Phased Rollout Plan
### Phase 1: Foundation & Core Alerting (Sprint 1–2)
Implement event-driven triggers on publish actions.
Deliver standardized, branded transactional email notifications for critical updates.
Embed authenticated direct deep links to the target management dashboard.

### Phase 2: Targeted Routing & Preferences (Sprint 3–4)
Introduce admin settings for notification preferences (Immediate vs. Daily Digest).
Support Role-Based Access Control (RBAC) filtering and custom Recipient Groups.
Provide subscription management and audit logging for sent notifications.

### Phase 3: Proactive Planning & Scheduling (Sprint 5–6)
Build advance maintenance notification engine supporting 7-day and 14-day pre-update windows.
Implement automated reminder sequences before scheduled auto-deployment windows.
Enable preview and customization of maintenance impact notices for enterprise admins.

## 4. Actionable User Stories & Acceptance Criteria

### User Story 1: [Feature Title]
**As an** [User Persona],
**I want to** [action/capability],
**So that** [business benefit/outcome].

**MoSCoW Priority:** 🔴 Must Have

**Acceptance Criteria:**

The notification service MUST automatically trigger an email within 5 minutes of a new release being published.
The email MUST display version number, release type, target device model(s), and brief release summary.
The system MUST suppress duplicate emails for the same release to the same user.

[Repeat structure for User Story 2, 3, and 4!]
```
