# NextAuth v5 → GA Migration Plan

**Last updated:** 2026-04-05  
**Current status:** v5 beta (production-ready, but not officially GA)  
**Portal version:** `next-auth@5.0.0-beta.30` (as of last audit)

---

## Executive Summary

The portal currently uses NextAuth v5 (beta), which is production-ready and actively maintained. However, it remains in beta status pending a formal GA release. This document tracks:

1. **Current state:** v5 beta integration, known working patterns
2. **Monitoring points:** When to check for GA announcements
3. **Migration readiness:** What we need before GA drops
4. **Migration procedure:** Step-by-step plan for upgrading

---

## Current State

### What's Working

- ✅ **Google OAuth integration:** Fully functional via `next-auth/providers/google`
- ✅ **JWT callbacks:** Custom token enrichment (`googleId` added to JWT)
- ✅ **Session callbacks:** Custom session enrichment
- ✅ **Server Components:** Works seamlessly with Next.js 16 App Router
- ✅ **Prisma integration:** Custom patron upsert in `signIn` callback
- ✅ **Pages override:** Custom sign-in page at `/`

### Integration Points

| File | What it does | Beta-specific? |
|------|-------------|-----------------|
| `portal/lib/auth.ts` | OAuth config, callbacks | No — pure callbacks API |
| `portal/app/layout.tsx` | Session provider (if using legacy) | Check v5 GA |
| `portal/app/api/auth/[...nextauth]/route.ts` | (Not present — using next-auth 5 new patterns) | N/A |
| `portal/middleware.ts` | (Not present — using auth() helper instead) | No |

### Known Risks

- **v5 beta deprecations:** Once GA drops, some beta APIs may be removed or renamed
- **Peer dependencies:** Ensure `react`, `next`, and supporting libs stay compatible
- **Auth.js rebrand:** NextAuth was rebranded to "Auth.js" — npm package name may change

---

## Monitoring Checklist

### Where to Watch

1. **Official releases:** https://github.com/nextauthjs/next-auth/releases
   - Check monthly for GA announcement
   - Subscribe to releases feed if possible

2. **NextAuth Discord:** https://discord.com/invite/nextauth (community updates)

3. **Auth.js documentation:** https://authjs.dev/
   - Breaking changes in release notes

4. **npm package:** `npm view next-auth versions`
   - Watch for non-beta version (e.g., `5.0.0` instead of `5.0.0-beta.XX`)

### Check Frequency

- **Monthly:** Quick npm check for GA release
- **Before releases:** Review changelog before upgrading minor versions
- **Annually:** Full migration readiness audit

---

## What Triggers Migration

**MUST migrate within 30 days if:**
- ✅ NextAuth v5 reaches official GA (e.g., v5.0.0 or v5.1.0)
- ✅ Security patch released for GA version that's not backported to beta
- ✅ Critical bug fix in GA that breaks our use case

**SHOULD migrate within 3 months if:**
- ✅ Performance improvements in GA version
- ✅ Enhanced compatibility with latest Next.js version

**OK to defer if:**
- ❌ GA is released but we have no breaking changes
- ❌ Current beta version is stable for our use case
- ❌ Release notes show minor features/enhancements only

---

## Pre-Migration Checklist

Before upgrading to GA, ensure:

### Code Readiness
- [ ] Read full v5 GA release notes and changelog
- [ ] Check Auth.js migration guide: https://authjs.dev/getting-started/migrating-to-v5
- [ ] Review breaking changes document
- [ ] Check for deprecated beta APIs in `portal/lib/auth.ts`

### Dependency Compatibility
- [ ] `next@16.2.1` or later — check v5 GA requires
- [ ] `react@19.2.4` or later — check v5 GA requires
- [ ] `prisma@7.5.0` or later — check v5 GA requires
- [ ] Google OAuth credentials still valid in Google Cloud Console

### Testing Plan
- [ ] Local dev: Test Google OAuth login flow
- [ ] Local dev: Test custom JWT callback (googleId enrichment)
- [ ] Local dev: Test session persistence across navigation
- [ ] Local dev: Test sign-out flow
- [ ] Staging: Run against staging database
- [ ] Staging: Test with actual Google OAuth (not sandbox)
- [ ] Review: Ensure no console errors or warnings

### Documentation
- [ ] Update this file with v5 GA date and version
- [ ] Update package.json comments if needed
- [ ] Update portal/README.md if NextAuth section changes

---

## Migration Procedure (When GA Arrives)

### Step 1: Preparation (Day 1)

```bash
# Create a new branch
git checkout -b chore/nextauth-v5-ga-migration

# Read the release notes and migration guide
# 1. https://github.com/nextauthjs/next-auth/releases (look for v5.0.0 or v5.X.0 without -beta)
# 2. https://authjs.dev/getting-started/migrating-to-v5
# 3. Compare to current implementation in portal/lib/auth.ts
```

### Step 2: Update Dependencies (Day 1)

```bash
cd portal

# Check current version
npm list next-auth

# Update to GA version (example: v5.0.0)
npm install next-auth@latest

# Verify it's GA, not beta
npm list next-auth
# Should show: next-auth@5.0.0 (not 5.0.0-beta.XX)

# Update other dependencies if needed
npm install
npm audit fix
```

### Step 3: Code Review (Day 1)

Compare `portal/lib/auth.ts` against the v5 GA migration guide:

```typescript
// Check these patterns:
// 1. NextAuth() vs Auth() constructor (Auth.js rebrand)
// 2. Provider syntax (Google({ ... }))
// 3. Callback signatures (signIn, jwt, session)
// 4. JWT token structure (still includes googleId?)
// 5. Session type augmentation (is it still valid?)
```

If any beta APIs are removed, update `auth.ts` accordingly.

### Step 4: Local Testing (Day 2)

```bash
# Start dev server
npm run dev

# Test OAuth flow
# 1. Navigate to http://localhost:3000
# 2. Click "Sign in with Google"
# 3. Complete Google OAuth
# 4. Verify: Patron created in database with googleId
# 5. Verify: Session contains googleId
# 6. Verify: Can access protected pages
# 7. Navigate to /console (patron dashboard)
# 8. Click "Sign out"
# 9. Verify: Redirected to home, session cleared
```

### Step 5: Staging Deployment (Day 3)

```bash
# If staging is available:
# 1. Deploy to staging environment
# 2. Run full OAuth flow against staging DB
# 3. Test character list, hash generation
# 4. Monitor for errors in logs

# OR
# 1. Create a preview deployment (if using Vercel)
# 2. Test against production DB (read-only)
```

### Step 6: Production Deployment (Day 5)

```bash
# Merge to main (after code review approval)
git commit -m "chore: upgrade NextAuth to v5.0.0 (GA)

- Update next-auth from v5.0.0-beta.30 to v5.0.0
- No API changes required — migration transparent
- Tested: Google OAuth, JWT enrichment, session persistence
- See NEXTAUTH_V5_MIGRATION_PLAN.md for details"

git push origin chore/nextauth-v5-ga-migration

# Create PR, get review, merge to main
# Vercel auto-deploys to production
```

### Step 7: Post-Deployment Monitoring (Week 1)

- Monitor production logs for auth errors
- Watch for increased 401/403 responses (session failures)
- Check Sentry for auth-related exceptions
- Verify patrons can still log in
- Confirm character data loads correctly

---

## Known Breaking Changes (Will Update on GA)

When v5 reaches GA, check for:

- [ ] Package rename (`next-auth` → `@auth/next` or similar?)
- [ ] Constructor name change (`NextAuth()` → `Auth()`?)
- [ ] Callback signature changes
- [ ] Session type structure
- [ ] JWT token structure
- [ ] Provider API changes

**Placeholder notes:**
- As of beta.30, no breaking changes expected to our usage
- Our callbacks are standard patterns that should survive GA
- Prisma integration is via standard signIn callback — should be stable

---

## Rollback Plan

If migration breaks production:

```bash
# Revert the commit
git revert <commit-hash>
git push origin main

# Vercel auto-redeploys with previous version
# Production immediately returns to v5.0.0-beta.30

# Investigation (parallel):
# 1. Check error logs in Sentry
# 2. Review what changed in auth.ts
# 3. Compare to v5 GA release notes
# 4. File issue on GitHub if it's a v5 bug
```

**Expected rollback time:** < 5 minutes
**User impact:** Brief login failures, then recovery

---

## Timeline

| Date | Milestone | Owner | Status |
|------|-----------|-------|--------|
| 2026-04-05 | Current state audit | Code review | ✅ Done |
| 2026-05-05 | Monthly check for GA | TBD | Pending |
| 2026-06-05 | Quarterly audit | TBD | Pending |
| TBD | NextAuth v5 GA released | — | 📍 Monitoring |
| TBD+7d | Code review + migration prep | TBD | — |
| TBD+14d | Merge to main + deploy | TBD | — |
| TBD+21d | Monitor production | TBD | — |

---

## Resources

### Official Documentation
- [Auth.js (NextAuth) Website](https://authjs.dev/)
- [NextAuth.js GitHub Releases](https://github.com/nextauthjs/next-auth/releases)
- [Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [TypeScript Types](https://authjs.dev/reference/nextjs/types)

### Portal-Specific
- `portal/lib/auth.ts` — current implementation
- `portal/README.md` — setup instructions
- `portal/package.json` — dependency versions

### Related Docs
- CLAUDE.md — project guidelines
- portal/README.md — deployment notes

---

## Questions & Decisions

**Q: Can we stay on beta indefinitely?**  
A: Not recommended. Once GA releases, beta versions won't receive security patches. We should migrate within 30 days of GA.

**Q: What if v5 GA has breaking changes we can't support?**  
A: Consider these options in order:
1. File an issue on GitHub — might get fix within days
2. Fork and patch locally (not ideal)
3. Downgrade to v4 (large effort, not recommended)
4. Switch to alternative (Clerk, Auth0) — significant refactor

**Q: Will the package name change?**  
A: Uncertain. NextAuth was rebranded to "Auth.js" in discussions, but npm package is still `next-auth`. Watch the GA release notes.

**Q: Do we need to change any code now?**  
A: No. Current implementation is stable. Monitor only.

---

## Assigned Responsibility

- **Monitoring:** Quarterly check (first check: 2026-05-05)
- **Migration lead:** TBD (assign when GA is announced)
- **Code review:** TBD
- **Deployment:** Automated (Vercel)
- **Post-deployment monitoring:** TBD (assign on deploy day)

---

**Next action:** Set calendar reminder for 2026-05-05 to check https://github.com/nextauthjs/next-auth/releases
