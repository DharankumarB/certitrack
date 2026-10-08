# CertiTrack

**One portal for every government certificate, tracked live from application to doorstep.**

CertiTrack is a frontend prototype (React, TypeScript, Vite, Tailwind CSS) of a single portal for government certificate applications. Citizens apply, see every stage with timestamps, receive an AI-assisted document pre-check, and collect certificates in a locker. Department officers review files in their own department only. Super Admins see portfolio analytics and the audit trail.

> **Prototype.** Sample people, documents, certificates and analytics are fictional. Authentication and account records are stored in this browser only. The AI check, e-sign and courier steps are simulated. WhatsApp and e-mail are previews only and nothing is sent. Certificates have no legal validity. Browser-based authentication is not production security.

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

## Local prototype accounts

The local prototype seeds one shared administrator for evaluation:

| Role | Email | Password |
| --- | --- | --- |
| Demo administrator | `admin@gmail.com` | `admin@123` |

This credential is intentionally weak and public in the client bundle; it is for fictional local testing only. Do not use it in production or with real data. Citizens can register at `/signup`. Department staff register at `/staff/register` and remain pending until administrator approval. Staff can use the department-neutral `/staff/login` entry, which routes an approved account to its assigned department; department-specific login links remain available. Other administrator accounts must be provisioned by the signed-in administrator.

Browser local/session storage and client-side role checks can be inspected or changed by the user. Use a trusted server-side identity provider, server-side authorization, and secure session handling before any real deployment.

Fictional workflow examples remain available as sample application records. They are not login accounts. Resetting sample data preserves local accounts.

## What is implemented

- **Public:** landing (hero, problem, how it works, AI document check, live tracking, locker, WhatsApp preview, role-based security, impact, roadmap, FAQ), role-specific sign-in, citizen and staff registration, first-administrator setup, pending staff approval, forgot password, help and FAQs, public tracking by Application ID and mobile digits, and certificate verification by code.
- **Citizen:** dashboard with live status, six-step apply wizard (certificate, personal details, certificate-specific fields, drag-and-drop uploads with progress, preview, replace and remove, sample files, AI pre-check, review and declaration, success screen with Application ID), application list and detail with timeline and document re-upload, "Where is my file?" tracker, certificate locker (view, download, share with consent, verify), notifications, and profile.
- **Department staff:** department-scoped dashboard, filterable queue (status, certificate, date, AI result, priority, search, CSV), pending review, split-screen review with document previews, AI findings and accept/flag controls, and approve, request changes and reject. Each decision requires a confirmation step and a reason where specified. Also AI verification queue, processed applications (CSV), department analytics, notifications and profile.
- **Administrator:** portfolio dashboard with Recharts charts, applications with metadata only (document contents are restricted), departments with staff access controls and service-standard editing, analytics with 7/30/90-day ranges, audit logs with filters and CSV export, system activity, staff approval/provisioning, and settings (simulation speed, channel previews, integration status) with sample-data reset.

Cross-cutting behaviour: the Simulated real-time updates keep e-sign and courier progress moving. Changes made in one browser tab appear in other tabs immediately. Loading, empty, error and success states exist on every major page. Toasts, skeletons and confirmation dialogs are used throughout. Forms validate inline (required, mobile, email, date, file type by content, file size).

## Architecture

```
src/
  types/        Domain types shared by data, store, services and UI
  config/      Certificate-type registry (extension point), workflow stages, navigation and audit labels
  data/        Fictional sample data, deterministic synthetic generator, factories and FAQ
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

**State and persistence.** Application and locally registered account data share the versioned `localStorage` store (`src/store/appStore.ts`). Sessions live in `sessionStorage`; "Keep me signed in" moves the session to `localStorage`. These browser-managed values are user-editable and must not be treated as trusted. Sample data is not refreshed in a way that overwrites account registrations. The administrator-only sample reset restores fictional workflow records while preserving local accounts.

**Access control.** `services/access.ts` centralizes client-side access rules. Citizens see their own records. Approved staff see their assigned department only, and cross-department access attempts are refused and audit-logged. Administrators see all records but not document contents. Route guards add a user-interface check, not a security boundary; production authorization must be enforced server-side.

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
| Authentication | Browser-only local accounts and client-side checks | Trusted identity provider, server-side authorization, secure session management and MFA |
| File storage | Browser IndexedDB | Encrypted object storage with malware scanning |
| Audit logging | Client-side append-only list | Server-side, tamper-evident log store |

## Accessibility

Semantic landmarks and one `h1` per page, skip link, labelled form controls with `aria-invalid` and `aria-describedby`, visible focus rings, modal and drawer focus traps with Escape handling and focus return, status shown with text and icons (not colour alone), `aria-current` for navigation, chart data available as tables, and reduced-motion support.

## Known limitations

- Single-browser prototype. Data is per browser profile, and cross-user sharing needs the real backend.
- The AI and e-sign steps are simulations. Their outcomes must not be read as real verification.
- Password verifiers use salted PBKDF2 in the browser for this prototype only. This does not make local authentication secure: account records and session state are accessible and modifiable by the browser user.
- The seeded administrator credential is intentionally shared and insecure. Production admin provisioning and all authorization must be server-side.
- Mobile layouts were checked in headless Chromium, not on physical devices.

## Project conventions

- Branch: `arena/99fdc625-certitrack`. Do not commit generated artefacts. `dist/`, `node_modules/` and QA outputs are git-ignored.
- Dates are shown in the user's local time zone. Currency uses Indian rupee formatting.
