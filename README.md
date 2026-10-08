# CertiTrack

**One portal for every government certificate, tracked live from application to doorstep.**

CertiTrack is a frontend prototype (React, TypeScript, Vite, Tailwind CSS) of a single portal for government certificate applications. Citizens apply, see every stage with timestamps, receive an AI-assisted document pre-check, and collect certificates in a locker. Department officers review files in their own department only. Super Admins see portfolio analytics and the audit trail.

> **Prototype / Demo.** All people, documents, certificates and analytics are fictional. The AI check, e-sign and courier steps are simulated in the browser. WhatsApp and e-mail are previews only and nothing is sent. Certificates have no legal validity.

## Quick start

Requirements: Node.js 20.19+ or 22.12+ (tested on Node 22.22) and npm 10.

```bash
npm ci                 # or: npm install --legacy-peer-deps
npm run dev            # http://localhost:5173 (binds 0.0.0.0)
```

If `npm install` fails with a `Cannot read properties of null (reading 'edgesOut')` error, use `npm install --legacy-peer-deps`. The lockfile already pins a tested dependency tree.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on 0.0.0.0:5173 |
| `npm run build` | Type-checks (`tsc --noEmit`) and produces the production bundle in `dist/` |
| `npm run preview` | Serves `dist/` on 0.0.0.0:4173 |
| `npm run typecheck` | TypeScript strict mode, no emit |
| `npm run lint` | ESLint flat config with typescript-eslint and React Hooks rules |
| `npm test` | Vitest unit tests for seed data, access rules, AI engine, validation and the workflow |

## Demo accounts

Sign-in is at `/login`. Each role has a one-click demo button. Manual sign-in uses the shared demo password `Demo@2026`, which is stored only as a SHA-256 digest. It is a prototype credential, not a real one.

| Role | Account | What to try |
| --- | --- | --- |
| Citizen | Citizen Demo (Meera Krishnan) | Dashboard, apply wizard, APP-10294 courier in transit, APP-10329 needs changes, locker |
| Department officer | Officer Demo (Caste Certificate Department) | Queue, split-screen review of APP-10388 (AI warnings), request changes, approve, AI verification queue. Opening APP-10421 (income) is blocked and audit-logged |
| Super Admin | Super Admin Demo | Portfolio dashboard, applications, departments, analytics (Demo Data), audit logs, system activity, settings and demo reset |

The Help page includes a guided walkthrough of the flows above.

## What is implemented

- **Public:** landing (hero, problem, how it works, AI document check, live tracking, locker, WhatsApp preview, role-based security, impact, roadmap, FAQ), sign-in with demo accounts, citizen sign-up, forgot password, help and FAQs, public tracking by Application ID and mobile digits, and certificate verification by code.
- **Citizen:** dashboard with live status, six-step apply wizard (certificate, personal details, certificate-specific fields, drag-and-drop uploads with progress, preview, replace and remove, sample files, AI pre-check, review and declaration, success screen with Application ID), application list and detail with timeline and document re-upload, "Where is my file?" tracker, certificate locker (view, download, share with consent, verify), notifications, and profile.
- **Department officer:** dashboard, filterable queue (status, certificate, date, AI result, priority, search, CSV), pending review, split-screen review with document previews, AI findings and accept/flag controls, and approve, request changes and reject. Each decision requires a confirmation step and a reason where specified. Also AI verification queue, processed applications (CSV), department analytics, notifications and profile.
- **Super Admin:** portfolio dashboard with Recharts charts, applications with metadata only (document contents are restricted), departments with officer access controls and service-standard editing, analytics with 7/30/90-day ranges, audit logs with filters and CSV export, system activity, settings (simulation speed, channel previews, integration status) and demo reset.

Cross-cutting behaviour: the Simulated real-time updates keep e-sign and courier progress moving. Changes made in one browser tab appear in other tabs immediately. Loading, empty, error and success states exist on every major page. Toasts, skeletons and confirmation dialogs are used throughout. Forms validate inline (required, mobile, email, date, file type by content, file size).

## Architecture

```
src/
  types/        Domain types shared by data, store, services and UI
  config/       Certificate-type registry (extension point), workflow stages, navigation, audit labels, demo accounts
  data/         Seed data: curated demo story, deterministic synthetic generator, factories, FAQ
  store/        Single application store: transactional commits, persistence, cross-tab sync
  services/     Async service layer (swap for real REST calls without touching UI)
                auth, applications, documents, notifications, certificates, deliveries,
                departments, analytics, audit, users, system, search, AI engine, simulation
  utils/        Formatting, validation, rules (access, priority, filters), analytics, stages, PDF/CSV
  hooks/        useAppState (useSyncExternalStore), useQuery, media queries, focus trap, persistence
  context/      AuthProvider (session + roles), ToastProvider
  components/
    ui/         Accessible primitives: buttons, forms, modal/drawer, popover, tables, feedback states
    layout/     Sidebar, mobile bottom nav and drawer, top bar, global search, notifications, guards
    domain/     Stage timeline, document review, AI panel, uploader, certificates, delivery, charts
  layouts/      AppShell (signed-in), PublicLayout, SessionLayout
  pages/        public, citizen, officer, admin and shared pages (lazy-loaded per route)
```

**State and persistence.** All business data lives in one store (`src/store/appStore.ts`). Services call `appStore.commit(mutator)`. A mutator is a pure function applied to the latest persisted state, so audit entries, notifications and timeline events for one action land together. The state is saved to `localStorage` under a versioned key. Each commit bumps `rev`, and the `storage` event keeps other tabs in sync. Sessions live in `sessionStorage` so several roles can run in different tabs. "Keep me signed in" moves the session to `localStorage`. Demo data is regenerated on load when the saved copy is more than 24 hours old, so dates stay current. Use **Reset demo data** for an immediate reset.

**Access control.** `services/access.ts` is the single source of truth. Citizens see their own records. Officers see their department only, and every attempt to open another department's file is refused and audit-logged. Super Admins see all records but not document contents. Route guards also audit wrong-role access.

**Workflow.** Statuses are `ai_checking`, `in_review`, `changes_requested`, `rejected`, `esign_pending`, `issued` and `delivered`. The six visible stages are Apply, AI Check, Review, e-Sign, Issued and Delivered. Stage progress is derived from status and delivery (`src/utils/stages.ts`).

**AI pre-check.** `src/services/aiEngine.ts` runs nine deterministic checks (document type, readability, OCR, name match, DOB match, completeness, duplicates, tampering indicators, seal and date consistency). It is rule-based and reads file names and metadata, not pixels. Results are advisory and always labelled as decision support.

**Adding a certificate type.** Add the id to `CertificateTypeId`, add a department in `data/mockDepartments.ts`, and add a definition in `config/certificateTypes.ts`. Forms, uploads, AI checks, analytics and the locker pick it up.

**Connecting a real backend.** Replace the bodies of functions in `src/services/*` with API calls. The signatures are already async and return plain data. Keep the access rules on the server.

## Simulated versus production integration

| Capability | In this prototype | Needed for production |
| --- | --- | --- |
| Document AI (OCR, forensics) | Rule-based simulation, advisory only | Licensed OCR and forensics service |
| Digital signature | Simulated sign step, no legal effect | Licensed e-signature provider and authority integration |
| Courier and dispatch | Timed status steps | Courier partner API |
| WhatsApp | Preview card, never sent | WhatsApp Business API account and template approval |
| E-mail | Preview only | Transactional e-mail provider |
| DigiLocker-style record linking | Not connected | Government integration approval |
| Authentication | Local demo accounts, digests in browser storage | Identity provider, server-side salted hashing, MFA, session management |
| File storage | Browser IndexedDB | Encrypted object storage with malware scanning |
| Audit logging | Client-side append-only list | Server-side, tamper-evident log store |

## QA performed

- **Static:** `tsc --noEmit` in strict mode (no errors), ESLint with React Hooks v7 rules (no warnings), Vitest (23 unit tests covering seed integrity, access scoping, AI checks, validation and the approve-to-issue transition).
- **Responsive sweep:** every route for every role, at 1440, 1280, 1024, 768, 430, 390 and 375 px, in headless Chromium. Checked for console errors, page-level horizontal overflow, sidebar overlap with content, leaked placeholder text and missing headings.
- **End-to-end flows:** apply wizard to submission with sample files, officer approval and e-sign, live update of the citizen's open tab without reload, change requests with validation, role denial, notifications, locker preview with the demo-only disclaimer, global search, admin dashboard, audit log, demo reset, public tracking and the mobile drawer.
- **Failure paths:** AI flags a blurred document, the wizard shows "Application needs changes", offers Fix document and Upload again, blocks Continue until resolved, and returns to the upload step.

Issues found and fixed during QA included an infinite render loop in a store selector, an access-denied query that re-ran forever, horizontal overflow from absolutely positioned screen-reader text inside scroll containers, and implicit single-column grids overflowing on phones.

## Accessibility

Semantic landmarks and one `h1` per page, skip link, labelled form controls with `aria-invalid` and `aria-describedby`, visible focus rings, modal and drawer focus traps with Escape handling and focus return, status shown with text and icons (not colour alone), `aria-current` for navigation, chart data available as tables, and reduced-motion support.

## Known limitations

- Single-browser prototype. Data is per browser profile, and cross-user sharing needs the real backend.
- The AI and e-sign steps are simulations. Their outcomes must not be read as real verification.
- Password hashing uses SHA-256 in the browser for demonstration only. It requires HTTPS or localhost.
- Mobile layouts were checked in headless Chromium, not on physical devices.

## Project conventions

- Branch: `arena/99fdc625-certitrack`. Do not commit generated artefacts. `dist/`, `node_modules/` and QA outputs are git-ignored.
- Dates are shown in the user's local time zone. Currency uses Indian rupee formatting.
