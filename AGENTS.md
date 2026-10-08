# Marketplace safety

- Persist the Stripe environment on marketplace orders and connected accounts; transfer and capture operations must validate that environment instead of deriving it from background execution, preventing sandbox/live crossovers.
- Tax identifiers and bank account details must be collected only by Stripe onboarding; local write endpoints and database triggers reject new sensitive financial data while preserving historical rows.
- Authenticated end-to-end tests require an authorized test session; never bypass authentication or elevate real users to fabricate test results.