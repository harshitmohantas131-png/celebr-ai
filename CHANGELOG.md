# Changelog

All notable changes to the CelebrAI application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-01

### Added
- **AI Planning Engine**: Integrated Google Gemini (`POST /api/plan`) for event plan synthesis with structured JSON schemas and rate limiting.
- **Smart Budget Calculator**: Deterministic integer minor-unit arithmetic (cents/paise), payment status tracking, and dynamic safety contingency modeling.
- **Timeline Planner**: Milestone tracking, timezone-safe overdue detection, archetype starter milestones, and day-of run sheet orchestration.
- **Vendor Management & Checklist**: Vendor directory, deliverable tracking, starter deliverables generation, and budget line-item linking without double counting.
- **Plan Refinement**: Interactive iterative AI refinement (`POST /api/plan/refine`) with section targeting and automatic plan versioning.
- **Local Persistence**: Zero-auth local-first client storage via `planStorage` with React 19 `useSyncExternalStore` for referential stability.
- **Export & Print**: Formatted Markdown export (.md) and dedicated print stylesheet.
- **Test Automation Suite**: 235 unit/component tests in Vitest and 10 end-to-end browser tests in Playwright (100% pass rate).
