# Vercel Google identity migration

Approved design: Next.js performs code exchange and Google ID-token verification; NestJS retains all member/link/session decisions. No UI or DB schema changes. No commits, pushes, deployments or business-service starts in this task.

1. Add failing tests for signed identity transport: Ed25519 fixed algorithm/issuer/audience, client ID, callback and request-context binding, 60-second validity, one-time Redis lock, malformed/expired/tampered/replayed input, no direct-mode fallback.
2. Implement backend verifier, optional assertion DTO, explicit GOOGLE_AUTH_MODE=direct|vercel (default direct for staged rollout), retain existing member path and Redis fail-closed behavior. Redact assertion from logs.
3. Add Next.js server-only exchange using official Google SDK with bounded requests; validate nonce, email and sub; sign verified identity. Integrate only after callback/state/session checks. Preserve bindingGrant and pending/session response handling.
4. Update both env examples and deployment guide; private key only on Vercel, public key only on backend; never reuse website JWT secret. Deploy backend in direct mode first, switch backend to vercel and deploy matching frontend, disable old direct path in vercel mode.
5. Run unit/type/lint/isolated builds and offline interaction checks. Real Google/Vercel/production acceptance remains explicit external verification.
