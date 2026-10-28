# Implementation Plan - AuthModal Redesign with Split-Screen Layout (mfisca-tasks)

## User Request & Context
- Redesign the authentication/signup page (`AuthModal.tsx`) for a superior visual experience.
- On desktop, implement a split-screen layout featuring a left welcome panel (with **mfisca-tasks** branding, cabinet highlights, security, and RGPD compliance features) and a right form panel for login/signup.
- Maintain the current high-contrast dark emerald / Supabase-style theme.

---

## Proposed Changes

### 1. `components/AuthModal.tsx`
- **Layout Redesign (Desktop Split-Screen)**:
  - Expand modal maximum width (e.g. `max-w-4xl` or `max-w-5xl`) on desktop.
  - Divide into a 2-column grid on `md:` screens:
    - **Left Column (Welcome & Highlights Panel)**:
      - App branding: **mfisca-tasks** (PWA task manager, calendar & review workflow).
      - Welcome message for cabinet professionals & team members.
      - Key highlights:
        - 🔒 Sécurité & Chiffrement de bout en bout
        - 🛡️ Conformité RGPD & Traçabilité des rôles (RBAC)
        - ⚡ Synchronisation temps réel PostgreSQL & Mode Hors-ligne
    - **Right Column (Form Panel)**:
      - Clean tab switching between "Connexion" (`signin`) and "Inscription" (`signup`).
      - Refined form inputs with crisp border highlights, icons, and clear error/success alerts.
- **Branding Sync**:
  - Update any references from "PlanIt" to **mfisca-tasks**.

---

## Verification Plan
- **Automated Tests**:
  - Run `npm test` to ensure all 76 unit tests pass.
- **Build Verification**:
  - Run `compile_applet` to verify TypeScript compilation and Next.js build.
