# RankForge MVP: Admin Dashboard + Payment System

## Overview

Two missing pieces to make RankForge a real SaaS:
1. **Admin Dashboard** — User management, system stats, audit oversight
2. **Payment/Membership** — Stripe integration, subscription tiers, usage limits

---

## Phase 1: Admin Dashboard (`/admin`)

### Route Protection
- Middleware checks JWT for `role: "admin"` claim
- Non-admins → redirect to `/audit`
- New field: `User.role` (enum: `"user"` | `"admin"`)

### DB Schema Changes
```prisma
enum Role {
  USER
  ADMIN
}

model User {
  // ...existing fields
  role       Role     @default(USER)
  credits    Int      @default(3)  // Free tier: 3 audits/month
  stripeCustomerId String?
  subscriptionStatus String?  // active, canceled, past_due
  subscriptionTier  String?   // free, pro, enterprise
}
```

### Admin Pages

#### `/admin` — Dashboard Overview
- Total users count
- Total audits run
- Average score across all audits
- Recent signups (last 7 days)
- Error rate (audits with status=error)
- Stripe revenue summary (MRR)

#### `/admin/users` — User Management
- Table: name, email, role, credits remaining, subscription status, created
- Actions: delete user, change role, reset credits, view user's audits
- Search by email
- Pagination (20 per page)

#### `/admin/audits` — All Audits
- All audits across all users
- Filter by status (done, error, running)
- Filter by domain
- Delete any audit

### API Routes
```
GET    /api/admin/users          — list users (admin only)
DELETE /api/admin/users/:id      — delete user
PATCH  /api/admin/users/:id/role — change role
GET    /api/admin/audits         — all audits
DELETE /api/admin/audits/:id     — delete any audit
GET    /api/admin/stats          — dashboard stats
```

---

## Phase 2: Payment System (Stripe)

### Subscription Tiers

| Tier | Price | Credits/Month | Features |
|------|-------|---------------|----------|
| **Free** | €0 | 3 | Basic SEO audit, PDF export |
| **Pro** | €29/mo | 30 | Full audit + AI recommendations + compare |
| **Enterprise** | €99/mo | Unlimited | Everything + API access + bulk + priority |

### Stripe Integration Flow

1. **Checkout** — User clicks upgrade → POST `/api/billing/create-checkout` → Stripe Checkout Session → redirect to Stripe
2. **Success** — Stripe webhook → `invoice.paid` → increment credits, update `subscriptionStatus=active`
3. **Failure/Cancel** — Stripe webhook → `invoice.payment_failed` / `customer.subscription.deleted` → update status
4. **Portal** — User clicks "Manage Billing" → POST `/api/billing/portal` → Stripe Customer Portal → redirect

### Webhook Handler
```
POST /api/webhooks/stripe
```
Handles events:
- `checkout.session.completed` — activate subscription
- `invoice.paid` — refresh credits
- `invoice.payment_failed` — notify user, downgrade
- `customer.subscription.deleted` — downgrade to free
- `customer.subscription.updated` — tier change

### Credit System
- Credits reset monthly (via cron job)
- Credits stored in DB: `User.credits`
- On audit creation: check credits > 0, decrement
- If credits exhausted: return 402 with upgrade prompt

### Paywall on Audit Creation
```typescript
// POST /api/audit
if (user.credits <= 0 && user.subscriptionTier === 'free') {
  return NextResponse.json({ 
    error: 'No credits remaining', 
    code: 'UPGRADE_REQUIRED',
    upgradeUrl: '/upgrade' 
  }, { status: 402 })
}
```

### User-Facing Billing Page (`/upgrade`)
- Pricing table (Free / Pro / Enterprise)
- Feature comparison
- Current usage (credits remaining)
- "Manage Subscription" button → Stripe Portal

---

## Phase 3: User Dashboard Enhancements

### `/profile` Page
- Update name, email, password
- View subscription status + tier
- Credits remaining (visual progress bar)
- "Upgrade" CTA if on free tier

### Audit List Improvements
- Show credit cost per audit
- Warning badge when credits < 3
- Upsell banner when credits = 0

---

## Implementation Order

```
Step 1: DB Migration
  - Add Role enum + role field to User
  - Add credits, stripeCustomerId, subscriptionStatus, subscriptionTier

Step 2: Admin Middleware + Routes
  - Auth middleware: admin check
  - GET /api/admin/stats
  - GET /api/admin/users
  - DELETE /api/admin/users/:id
  - GET /api/admin/audits

Step 3: Admin UI Pages
  - /admin (overview)
  - /admin/users
  - /admin/audits

Step 4: Stripe Setup (test mode)
  - Create Stripe account + products
  -.env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
  - POST /api/billing/create-checkout
  - POST /api/billing/portal
  - POST /api/webhooks/stripe

Step 5: Credit Enforcement
  - Check credits on audit create
  - Decrement on success
  - Show credit usage on audit list

Step 6: /upgrade Page
  - Pricing table
  - Usage meter
  - Stripe Checkout trigger

Step 7: Make First User Admin
  - Script to set initial admin
```

---

## Files to Create/Modify

### New Files
```
src/app/admin/page.tsx                    — admin dashboard
src/app/admin/users/page.tsx             — user management
src/app/admin/audits/page.tsx            — audit oversight
src/app/upgrade/page.tsx                 — pricing + checkout
src/app/profile/page.tsx                 — user settings + billing
src/app/api/admin/stats/route.ts
src/app/api/admin/users/route.ts
src/app/api/admin/users/[id]/route.ts
src/app/api/admin/audits/route.ts
src/app/api/billing/create-checkout/route.ts
src/app/api/billing/portal/route.ts
src/app/api/webhooks/stripe/route.ts
src/lib/admin.ts                         — admin auth helper
src/lib/stripe.ts                        — Stripe client
prisma/migrations/add_billing_*          — migration files
```

### Modified Files
```
prisma/schema.prisma                      — add billing fields
src/middleware.ts                         — add admin route protection
src/app/api/audit/route.ts               — credit check + 402
src/app/api/auth/register/route.ts        — initialize credits=3
src/components/layout.tsx                — admin nav link
```

---

## Environment Variables (Hetzner)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Test Plan
1. Create test user → should have 3 credits
2. Run 3 audits → credits → 0, 4th audit → 402 upgrade required
3. Checkout Pro → Stripe test mode → credits become 30
4. Login as admin → /admin shows all users + stats
5. Delete user → audits also deleted (cascade)
6. Stripe webhook → credits update correctly
