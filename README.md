# CelebrAI — GenAI-Powered Celebration & Event Planner

> **Prompt Wars Virtual Challenge 5** · Production Release & Layer 6 Quality Audit

CelebrAI helps users plan weddings, birthdays, and community events with the help of Google Gemini. It generates personalised ideas, budgets, timelines, run-of-show schedules, and interactive vendor coordination checklists — all in one accessible, high-performance web experience.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 22 (LTS) |
| npm | ≥ 10 |

---

## Getting Started & Configuration

### 1. Obtain a Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Generate an API Key under the **Get API key** menu.

### 2. Configure Environment Variables

Copy the template to your local `.env.local`:

```bash
cp .env.example .env.local
```

Set the following server-side environment variables:

```ini
# Google Gemini API key (server-side only, never committed or exposed to client)
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini model identifier (optional, defaults to gemini-3.5-flash-lite)
GEMINI_MODEL=gemini-3.5-flash-lite
```

> **Note on `GEMINI_MODEL`**: CelebrAI defaults to `gemini-3.5-flash-lite` for high throughput, low latency (~2-5 seconds), and reliable structured JSON output schema support. You may also configure `gemini-3-flash-preview` by setting `GEMINI_MODEL`.

### 3. Install Dependencies & Run

```bash
# Install dependencies
npm install

# Run the local development server
npm run dev
# The application will be ready at http://localhost:3000
```

---

## Vercel Deployment Guide

CelebrAI is designed for zero-config deployment on [Vercel](https://vercel.com):

### 1. Project Configuration
- **Framework Preset**: Next.js (detected automatically)
- **Root Directory**: `5-Celebr_AI` (if deploying from a monorepo) or root directory (if deploying from a dedicated repository)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 2. Production Environment Variables
Configure the following in your Vercel Project Settings (**Settings → Environment Variables**):

| Variable | Required | Description | Default |
|:---|:---:|:---|:---|
| `GEMINI_API_KEY` | **Yes** | Server-side Google Gemini API key from Google AI Studio | None |
| `GEMINI_MODEL` | No | Model identifier for AI generation and refinement | `gemini-3.5-flash-lite` |

> **Build-Time Note**: `GEMINI_API_KEY` is **not** required during the Next.js build phase. The API routes execute purely on demand as dynamic serverless functions.
>
> **Serverless Rate Limiting Note**: The built-in in-memory rate limiter throttles clients per serverless instance (5 requests/minute). In high-concurrency production deployments across distributed regions, connecting an edge-compatible store (e.g., Upstash Redis) provides unified cross-instance tracking.

---

## Layer 5 Planning Experience & Features

### 1. Interactive Results Dashboard (`/plans/[id]`)
- **Executive Vision & Overview**: Event archetype, target date, guest count, planning currency (`USD` or `INR`), curated color palette chips, and creative concept summary. Clear disclaimers indicating prices are estimates.
- **Deterministic Financial Model**: Total budget, category subtotal, 10% safety contingency reserve, remaining cushion / over-budget variance, and budget utilization progress bar. Expandable category accordions reveal granular line items with priority badges (`high`, `medium`, `low`).
- **Preparation Timeline**: Chronological milestones calculated relative to the event date (`daysBeforeEvent`), with interactive completion toggles.
- **Event-Day Run-of-Show**: Minute-by-minute timeline schedule with location, activity description, and designated lead coordinator.
- **Interactive Checklist**: Real-time progress tracker with status filters (`all`, `pending`, `completed`), priority filters (`all`, `high`, `medium`, `low`), and interactive checkoff buttons that immediately persist state to local storage.
- **Creative Personalization Ideas**: Signature curated cues tailored to the celebration concept.
- **Export & Print**: One-click formatted Markdown export download (`.md`) and browser print optimization (`window.print()` with print-specific layout styling).

### 2. AI Plan Refinement (`POST /api/plan/refine`)
- Interactive collapsible refinement panel with quick suggestion pills (e.g., *"Reduce catering costs by 10%"*, *"Make activities family-friendly"*).
- Optional target section focus (`budget`, `timeline`, `schedule`, `checklist`, or entire plan).
- Server-side validation with rate limiting (5 req/min) and payload size limit (64 KB).
- Safe fallback: if refinement fails or errors, previous plan data is preserved without corruption.
- Version incrementing (`v1` → `v2` badge) and deterministic budget recalculation.

### 3. Local-First Client Persistence (`planStorage`)
- **Zero Database / Zero Auth**: Uses browser `localStorage` (`celebr_ai_saved_plans_v1`) to store full event plans safely on the user's device.
- **Strict Schema Validation**: Validates all plans against `eventPlanSchema` before storing and upon retrieval; safely isolates or drops corrupted entries.
- **Reactive State via `useSyncExternalStore`**: Referential stability with zero cascading renders or hydration mismatch errors in Next.js 16 and React 19.
- **Dashboard Integration**: Saved celebrations appear in "Recent Celebrations" on the homepage (`/`) with inline renaming, one-click plan loading, and delete confirmation safeguards.
- *Documented Limitation*: Plans stored locally remain private to the browser profile and do not automatically sync across devices or external cloud databases.

---

## Layer 7 Timeline Planner (`/timeline`)

The dedicated **Timeline Planner** provides interactive, live preparation tracking and run-of-show orchestration:

### 1. Milestone Tracking & Metrics
- **Dynamic Event Switcher**: Allows selecting between any saved celebration plans, or initiating a quick custom celebration timeline.
- **Real-Time KPI Summaries**: Total milestones count, completed tasks (with percentage progress bar), active tasks (pending/in progress), and overdue task alerts.
- **Accurate Overdue Detection**: Pure calendar date comparisons against today's local date (`targetDate < today` for uncompleted tasks).

### 2. Full Milestone CRUD & Interactive Flow
- **Add & Edit Milestones**: Accessible modal forms with title, description, due date (enforces `targetDate <= eventDate`), optional 24-hour time, category, priority (`high`, `medium`, `low`), and status.
- **Instant Completion Toggle**: One-click checkmark toggling that synchronizes `completed` boolean and `status` ("completed" vs "pending").
- **Delete Safeguards**: Accessible confirmation dialog (`role="alertdialog"`) prevents accidental deletions.
- **Filter & Sort**: Filter by status (All, Pending, In Progress, Completed, Overdue), category, or sort by due date, priority, or status.

### 3. Sensible Starter Timeline Generation
- **Archetype-Specific Starter Timelines**: Auto-generates deliverables counting backwards from event date (180, 120, 90, 60, 30, 14, 7, 1, 0 days) tailored to Weddings, Birthdays, and Community events.
- **Duplicate Prevention Warning**: Detects existing milestones and prompts the user before appending or replacing deliverables.

### 4. Day-of Run Sheet View
- Chronological time-block run of show with start/end time, duration, activity description, location, and coordinator role.
- Add and edit run-sheet activities with schedule validation (detects overlapping blocks or reversed intervals).

---

## Layer 8 Smart Budget Calculator (`/budget`)

The dedicated **Smart Budget Calculator** provides a complete, accessible, production-quality financial workstation for tracking planned allocations, vendor invoices, payment distributions, and safety contingency reserves:

### 1. Pure Integer Minor-Unit Engine
- **Zero Floating-Point Drift**: Calculations use integer minor units (cents/paise via `toMinorUnits` and `fromMinorUnits`, scale factor 100).
- **Comprehensive Distinction**: Clearly distinguishes declared spending ceiling (`totalBudget`), planned estimate (`categorySubtotal`), recorded actual spend (`totalActualSpent`), unspent actual cushion (`actualRemaining`), and safety contingency (`contingencyAmount`).
- **Safe Handling of Pending Quotes**: Never treats unrecorded actual costs as zero spending; explicitly tracks `missingActualsCount` and computes projected exposure as `actualSpent + unrecordedEstimated + contingency`.

### 2. Real Expense Management & Visual Statuses
- **Add & Edit Modal (`ExpenseModal`)**: Validates expense names, categories, positive amounts, priority, payment status, vendor names, and due dates via strict Zod schema (`expenseFormSchema`).
- **Delete Confirmation Safeguards (`DeleteExpenseDialog`)**: Accessible `role="alertdialog"` prevents accidental loss of expenses and triggers instant recalculation upon deletion.
- **Overrun Indicators**: Clear badges highlight items where actual quotes exceed estimates (`+Over Estimate`) alongside visual alerts for categories exceeding their planned envelope.
- **Interactive Filtering & Sorting**: One-click status filter pills (`All Items`, `Unpaid`, `Partially Paid`, `Fully Paid`, `Over Estimate`), category selector, and 6 sorting criteria.

### 3. Dynamic Safety Contingency & Storage
- **Adjustable Safety Cushion (`ContingencyModal`)**: Quick preset buttons (`5%`, `10%`, `15%`, `20%`) plus an interactive slider (0–50%) with real-time financial impact preview.
- **Local-First Persistence**: Fully integrates with `planStorage` (`celebr_ai_saved_plans_v1`) with instant reactivity through `useSyncExternalStore`.
- **Zero-State Quick Starter**: Allows users without pre-existing AI plans to initialize a celebration budget with curated starter categories and sample line items.

---

## Layer 9 Vendor Checklist & Directory (`/vendors`)

The dedicated **Vendor Checklist & Directory** provides a complete vendor coordination workflow, deliverable tracking, contract management, and budget reconciliation:

### 1. Vendor Management & Directory Flow
- **Active Navigation & Routing**: Dedicated `/vendors` route with active sidebar highlight, accessible header title synchronization, and event switcher.
- **Summary Metrics (KPI Cards)**: Displays Total Vendors, Booked Vendors (with booking progress %), Outstanding Checklist Tasks, and Overdue Deliverables.
- **Search & Multi-Dimensional Filtering**: Real-time search across vendor names, contact persons, phone numbers, and emails; category filter pills; and booking status filters (`All`, `Shortlisted`, `Contacted`, `Booked`, `Cancelled`).
- **Complete Vendor CRUD**: Accessible dialogs (`role="dialog"`) for creating and editing vendors with business contact details, category classifications, and contract notes.
- **Safe Cancellation & Deletion**: Quick inline booking status dropdowns allow marking vendors as `cancelled` (retaining full history while excluding from active deliverable metrics) or permanent deletion via an accessible confirmation dialog (`role="alertdialog"`).

### 2. Deliverables Checklist & Auto-Generated Starter Tasks
- **Granular Task Management**: Per-vendor checklist with title, description, due date, completion toggle, and notes.
- **Smart Starter Tasks Generation**: When creating a new vendor, CelebrAI automatically generates 7 category-specific starter deliverables (e.g., initial consultation, tasting/portfolio review, formal proposal review, contract execution, deposit payment, final briefing, and final invoice settlement). Users can toggle, edit, or remove any starter item.
- **Timezone-Safe Overdue Tracking**: Strict ISO calendar date comparisons (`dueDate < today` in local event time) flag overdue deliverables with high-visibility warnings.
- **Progress Tracking**: Real-time progress bar and percentage per vendor (`completed / total` tasks).

### 3. Smart Budget Integration
- **Direct Budget Line-Item Linking**: Vendors can be linked to existing budget expenses (`budgetLineItemId`) to track quoted vs. agreed contract costs.
- **No Double Counting**: Calculations maintain single-source-of-truth reconciliation: vendor actual costs update the linked expense line item without inflating or duplicating total planned budget amounts.
- **Zero-Auth Local Persistence**: Stored client-side inside `planStorage` under `celebr_ai_saved_plans_v1` with seamless backward compatibility for older plans.

---

## API Contracts

### 1. `POST /api/plan` (Synthesis)

Synthesizes a full event plan from validated event parameters.

#### Request Body (`application/json`)
```json
{
  "name": "Maya & Leo's Autumn Wedding",
  "eventType": "wedding",
  "eventDate": "2027-06-15",
  "location": "Napa Valley, CA",
  "guestCount": 100,
  "totalBudget": 35000,
  "currency": "USD",
  "theme": "Rustic elegance with eucalyptus accents",
  "culturalPreferences": ["Traditional Sangeet celebration"],
  "dietaryRequirements": ["Vegetarian", "Gluten-Free"],
  "planningPriorities": ["Scenic Venue", "Live Acoustic Music"],
  "additionalInstructions": "Allocate budget for local wine pairings."
}
```

### 2. `POST /api/plan/refine` (Refinement)

Accepts an existing validated plan and user refinement instructions, returning an updated plan.

#### Request Body (`application/json`)
```json
{
  "plan": { ... },
  "instructions": "Reduce catering costs by 15% and add an acoustic bonfire afterparty.",
  "targetSection": "budget"
}
```

#### Validation Constraints:
- `instructions`: Required string, 1 to 1,000 characters.
- `targetSection`: Optional enum (`"overview" | "budget" | "timeline" | "schedule" | "checklist"`).
- `plan`: Validated against `finalEventPlanSchema`.

#### Error Codes & Status Codes:

| HTTP Status | Code | Description |
|:---|:---|:---|
| `400 Bad Request` | `VALIDATION_ERROR` | Request payload failed strict Zod schema validation. |
| `400 Bad Request` | `MALFORMED_JSON` | Request body could not be parsed as valid JSON. |
| `413 Payload Too Large` | `PAYLOAD_TOO_LARGE` | Request body exceeds 64 KB limit. |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Client rate limit exceeded (5 requests/minute). |
| `502 Bad Gateway` | `PROVIDER_ERROR` | Upstream Gemini API error. |
| `502 Bad Gateway` | `INVALID_MODEL_OUTPUT` | Gemini returned unparseable or schema-invalid plan data. |
| `503 Service Unavailable` | `CONFIGURATION_ERROR` | `GEMINI_API_KEY` is not configured on the server. |
| `504 Gateway Timeout` | `TIMEOUT_ERROR` | Gemini synthesis request exceeded the 30-second timeout. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected server execution failure. |

---

## Financial Estimates Disclaimer

> [!IMPORTANT]
> **Estimates Disclaimer**: All monetary calculations, proposed line item costs, vendor rates, and budget allocations generated by CelebrAI are algorithmic estimates for planning purposes only. They do not constitute verified vendor quotes, binding contracts, or guaranteed market availability.

---

## Security & API Protections

- **Server-Only Execution**: The Google Gemini SDK and API keys run strictly in Node.js server route handlers and are never bundled into client-side code.
- **Untrusted Input Boundaries**: User prompts wrap input data in `<event_context>` and `<refinement_context>` boundary markers and use system instructions to reject prompt injection or attempts to extract system instructions.
- **In-Memory Rate Limiting**: An in-memory token bucket rate limiter restricts requests to **5 requests per minute** per client IP.
- **Sanitized Error Logging**: Stack traces, API keys (`AIza...`), and raw provider URLs are scrubbed from client responses and server logs.
- **Deterministic Budget Arithmetic**: Financial totals, contingency splits, and remaining balances are never trusted from the LLM; they are authoritatively recalculated using minor currency units (cents/paise) to eliminate floating-point drift.

---

## Quality Checks & Testing

CelebrAI maintains a comprehensive automated testing suite:

```bash
# Run unit, component, and API tests (20 test files, 235 tests in Vitest)
npm test

# Run TypeScript type checker
npm run type-check

# Run ESLint linter
npm run lint

# Run end-to-end browser tests (10 Playwright tests across 5 suites)
npm run test:e2e

# Run Next.js production build
npm run build
```

---

## Layer Roadmap

| Layer | Status | Description |
|:---:|:---:|:---|
| **1** | ✅ Done | Project foundation, dependencies, folder structure, test configuration |
| **2** | ✅ Done | CelebrAI design system, accessible UI primitives, dashboard & event archetype selection |
| **3** | ✅ Done | Strongly typed domain models, deterministic budget calculator, timeline & checklist engine, strict Zod schemas |
| **4** | ✅ Done | Secure server-side Google Gemini integration (`POST /api/plan`), structured output schemas, rate limiting |
| **5** | ✅ Done | Plan results dashboard, interactive checklist, AI refinement endpoint (`POST /api/plan/refine`), local-first persistence (`planStorage`), markdown export & print |
| **6** | ✅ Done | Final quality audit, security & secrets review, print stylesheet, Vercel readiness, test suite verification |
| **7** | ✅ Done | Fully functional Timeline Planner (`/timeline`), milestones CRUD, overdue tracking, starter generation, and day-of run sheet |
| **8** | ✅ Done | Fully functional Smart Budget Calculator (`/budget`), integer minor units, actual cost tracking, payment status filters, and contingency adjustments |
| **9** | ✅ Done | Fully functional Vendor Checklist & Directory (`/vendors`), vendor CRUD, booking workflows, deliverables checklist, starter tasks, and budget line-item linking |
