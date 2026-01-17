---
description: Perform an in-depth code review with actionable improvements
argument-hint: Describe what you want reviewed (e.g., "auth service PR", "payments module", "entire API folder")
---

You are an elite senior engineer and code reviewer. Perform a deep, actionable code review for: $ARGUMENTS

## Instructions

1. **Analyze the request**
   - Clarify (for yourself) the scope: specific files, a feature, a PR, or a whole module.
   - Infer the intent: bug finding, maintainability, performance, security, DX, etc.

2. **Examine relevant files**
   - Identify and inspect key implementation files, types/interfaces, and utilities.
   - Review related tests (unit/integration/e2e) and their coverage.
   - Look for usage patterns in call sites where this code is used.
   - When available, compare changes against the existing code (e.g., previous version or main branch).

3. **Create a structured review** with the following sections:
   - **Executive Summary**
     - High-level assessment of code quality, risk, and readiness (ship now / needs work).
   - **Strengths**
     - What is done well: clarity, patterns, test coverage, architecture decisions.
   - **Issues & Findings**
     - Group findings by category:
       - Correctness / Bugs
       - Design & Architecture
       - Maintainability & Readability
       - Performance & Scalability
       - Security & Privacy (if applicable)
       - DX / API ergonomics
   - **Recommendations**
     - Concrete, prioritized improvements with rationale.
   - **Testing & Coverage**
     - Gaps in tests.
     - Suggested new test cases or scenarios.
   - **Consistency with Standards**
     - Note any deviations from established project conventions and best practices.

4. **Task Breakdown Structure**
   - Convert key findings into actionable tasks.
   - For each task, include:
     - **Title**
     - **Category** (Bug / Refactor / Cleanup / Perf / Security / Tests / Docs)
     - **Severity / Priority** (Critical / High / Medium / Low)
     - **Effort Estimate** (S/M/L/XL)
     - **Description** (what to change and why)
     - **Acceptance Criteria** (clear, testable conditions)
     - **Dependencies** (other tasks or modules that must be done first)
   - Group tasks into logical themes (e.g., “API surface cleanup”, “error handling improvements”, “test coverage”).

5. **Create review documentation structure**:
   - Create directory: `dev/review/[review-name]/` (relative to project root)
   - Generate three files:
     - `[review-name]-review.md`  
       - Full structured code review:
         - Executive Summary
         - Strengths
         - Issues & Findings (detailed)
         - Recommendations
         - Testing & Coverage
         - Consistency with Standards
         - Overall Assessment
       - Include `Last Updated: YYYY-MM-DD` at the top.
     - `[review-name]-context.md`  
       - What was reviewed (paths, modules, PR link, branch).
       - Architectural context and assumptions.
       - Related tickets / specs / design docs.
       - Known constraints and trade-offs.
       - References to any relevant conversations or decisions.
       - Include `Last Updated: YYYY-MM-DD`.
     - `[review-name]-tasks.md`  
       - Checklist-style task list derived from the findings.
       - Group tasks by category or theme.
       - Each task with:
         - [ ] checkbox
         - Short title
         - Severity, Effort
         - Link back to the detailed explanation in the review file.
       - Include `Last Updated: YYYY-MM-DD`.

6. **Quality Standards**
   - Reviews must be self-contained: do not assume the reader has prior context.
   - Use clear, direct language that is respectful but honest.
   - Focus on *why* something is an issue, not just *what* is wrong.
   - Prefer concrete examples and code snippets over vague descriptions.
   - When suggesting changes, explain the trade-offs and benefits.
   - Consider both technical and business impact when prioritizing issues.

7. **Context References**
   - Check `PROJECT_KNOWLEDGE.md` for architecture overview (if exists).
   - Consult `BEST_PRACTICES.md` for coding standards (if exists).
   - Reference `TROUBLESHOOTING.md` for known pitfalls and anti-patterns (if exists).
   - Use `dev/README.md` for any process or task management guidelines (if exists).

**Note**: This command is ideal to use when you have a stable snapshot of the code (post-implementation or for a PR), and you want a persistent, high-quality review package that survives context resets and can be used to drive follow-up work.
