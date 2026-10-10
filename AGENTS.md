# Marketplace safety

- Cookie checkout charges the exact payable amount automatically and validates the product subtotal before writes; marketplace authorization remains separate to avoid charging cookie orders twice.
- All cookie shopping surfaces read the shared product catalog with a Spanish display-name adapter; public bestseller output exposes only aggregate product order, never buyer records.
- New orders persist a driver pricing model while historical orders keep their existing amounts; database assignment triggers serialize driver capacity checks across cookie routes and store stops.
- Browser cart and preferred language hydrate only after mounting so their first render matches server output.

- Persist the Stripe environment on marketplace orders and connected accounts; transfer and capture operations must validate that environment instead of deriving it from background execution, preventing sandbox/live crossovers.
- Tax identifiers and bank account details must be collected only by Stripe onboarding; local write endpoints and database triggers reject new sensitive financial data while preserving historical rows.
- Authenticated end-to-end tests require an authorized test session; never bypass authentication or elevate real users to fabricate test results.
- Public merchant reads use the security-invoker commercial view and column-restricted anonymous base-table grants; registration starts pending and connected-account fields are server-managed to prevent disclosure and self-approval.
- Affiliate withdrawal requests serialize per authenticated affiliate and lock eligible commission rows before calculating totals, preventing simultaneous requests from claiming the same balance twice.
- Referral rewards and wallet spending are atomic database operations scoped to persisted payment environment; capture grants rewards, while delivery creates cookie tip payout rows, preventing reservation bonuses and duplicate spending.
- New referral associations use profiles with immutable links; historical customer links are read only so checkout never writes customer or auth data.
- Referral withdrawals use authenticated server functions and manual admin settlement with a non-sensitive reference; recording payment does not initiate a transfer.
- Manual withdrawal destinations are validated with a shared client/server schema and SQL guard, inserted atomically with the reservation, and immutable afterward to prevent redirected payouts; SQL regression tests use disposable PostgreSQL, never production data.
- Order credit is capped before capture to preserve merchant/driver funds and minimum card capture; cancellation and downward adjustments return unused credit atomically and idempotently.