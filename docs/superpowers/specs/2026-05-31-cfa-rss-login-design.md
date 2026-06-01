# CFA RSS Web Login Redesign Spec

**Status:** Approved
**Project:** CFA RSS (Web Rebranding)
**Date:** 2026-05-31

## 1. Objective
Redesign the web login experience to establish the "CFA RSS" brand identity while maintaining existing system functionality (authentication, MFA, password reset). The design focuses on a "minimalist errands rider scheduling system" aesthetic.

## 2. Visual Identity (CFA RSS)
- **Primary Color:** `#f3bc2c` (Golden Yellow)
- **Accent Color:** `#0f172a` (Slate 900 / Dark Contrast)
- **Background:** White (`#ffffff`) for form areas, Golden Yellow for the branding panel.
- **Typography:** Bold, clean sans-serif (Inter or IBM Plex Sans).

## 3. UI/UX Structure (Modern Minimalist Split)

### Left Panel (Branding)
- **Background:** Solid Golden Yellow (`#f3bc2c`).
- **Logo:** High-contrast typographical logo: **CFA RSS**.
- **Slogan:** *"Errands. Scheduled. Simplified."*
- **Animation:** Subtle fade-in of the branding text on load. No 3D imagery or complex illustrations.

### Right Panel (Login Form)
- **Background:** Pure White (`#ffffff`).
- **Form Card:** Minimalist design with lots of padding.
- **Primary Button:** Golden Yellow background with Black text (font-black) for high visibility and brand alignment.
- **Input Fields:** 
  - Subtle borders (`border-slate-100`).
  - Active focus state: Golden Yellow border (`border-[#f3bc2c]`) with a soft glow.
- **Footer Branding:** "Authorized Personnel Gateway • CFA RSS".

## 4. System-Wide Web Rebranding
- **HTML Title:** Change from "GoFinance" to "CFA RSS".
- **Dashboard Header:** Update title to **CFA <span class="text-amber-600">RSS</span>**.
- **Admin Sidebar:** Update all "GoFinance" or "Rider System" references to "CFA RSS".
- **System Info:** Update dialog title and descriptions.

## 5. Functional Integrity
- **Authentication:** No changes to login API or session management.
- **MFA Flow:** Re-skin the MFA verification screens to match the minimalist white/yellow theme.
- **Password Reset:** Ensure the `PasswordResetOverlay` remains functional but is styled with the new brand colors.

## 6. Constraints
- **Mobile App:** The mobile app will **NOT** be affected by these changes and will keep its "GoFinance" identity.
- **Vite Bundling:** Use direct imports for any new assets to ensure production availability.

## 7. Next Steps
1. Create implementation plan.
2. Update `.gitignore` and asset folders if new SVG icons are added.
3. Refactor `Login.tsx` with the approved split layout.
4. Search and replace all "GoFinance" strings in the `src/` directory with "CFA RSS".