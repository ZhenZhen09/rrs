# Security remediation record — 2026-10-05

## Changes made

- Public signup now accepts only `personnel` and `rider`, and reserves `admin@company.com` case-insensitively.
- MFA setup, MFA login, and forced password changes now use short-lived, purpose-bound, one-time server challenges. Challenge tokens are random; only hashes are stored. The login UI submits the challenge rather than a caller-selected user ID or MFA secret.
- The existing special `admin@company.com` login continues to use the same account row, password, and stored MFA fields. Its login no longer prompts for MFA per the user's request. No account database operation was performed; the stored MFA factor remains present and unchanged.
- Notification creation is limited to admins, validates message/type/recipient fields, confirms the recipient exists, and is rate limited. Internal notification producers are unaffected.
- Production now requires separate non-placeholder `JWT_SECRET` and `JWT_REFRESH_SECRET` values of at least 32 characters. Socket.IO, auth routes, and middleware share the same getters. Password reset has an auth rate limit.
- Authentication failure logging no longer writes token fragments to `api_debug.log` or includes token-derived details in console logs.

## Verification

- Lint: unavailable; neither root nor backend package defines a lint script or local ESLint command.
- `npx tsc --noEmit`: passed.
- `npx vitest run`: passed, 48 files and 262 tests.
- `npm run build:frontend`: passed. Vite reports an existing large main chunk (1.2 MB minified) and stale Browserslist data.
- `npm --prefix server run build`: passed.
- `graphify update .`: completed; reported missing generated Expo cache paths and JSON/config files with no graph nodes.

## Deployment follow-up and residual risk

- Configure two independent high-entropy production secrets before deploying; otherwise startup intentionally fails. Do not reuse the previous fallback secrets.
- Staging or production HTTP flows were not exercised. Verify with dedicated test accounts after deployment.
- The admin MFA factor remains in storage but is bypassed for login. This preserves its account data while applying the requested no-MFA login behavior; re-enabling MFA requires a separate deliberate policy change.
- Historical entries in the existing `server/api_debug.log` may contain token prefixes from before this change. The application no longer writes them. Review and rotate/remove that historical log through the normal operational retention process.
