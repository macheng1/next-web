# Google sign-in

完整中文步骤与关键代码见 [制造帮 Google 登录接入与排错指南](./google-sign-in-guide.md)。

Login and registration expose the shared Google button when GOOGLE_CLIENT_ID is configured. GOOGLE_REDIRECT_URI must match the public site origin and `/api/auth/google/callback` exactly. Only the public client ID belongs on this frontend; the client secret and Google token verification remain in wx-backend.

The authorization start uses document navigation with random state, PKCE and nonce. Each attempt has a separate HttpOnly callback cookie so callbacks cannot consume a different attempt. The callback verifies expiry and the initiating session fingerprint, exchanges the code through wx-backend and removes the matching cookie. Redirects contain no Google codes, backend session tokens, pending grants or binding grants.

Verified existing identities receive the normal HttpOnly website session cookie. A pending identity is kept in a separate HttpOnly cookie for ten minutes. `/google/complete` loads its profile through the BFF: new accounts must accept the currently published terms; server-required email verification uses the code flow. An existing account with the same email must prove ownership with its password or, where permitted, a code sent to its already verified email. Matching email addresses never automatically connect accounts. Pending profile responses include a nonsecret hash identifier; sending a code and completing the form must match that identifier to the current HttpOnly pending cookie, preventing a second tab from silently replacing the identity being completed.

Account and buyer settings show Google connection status. Connecting Google requires a password or verified-email code, then a five-minute HttpOnly binding grant tied to the current member and session. Sensitive BFF requests verify the expected member before forwarding bearer credentials. Unlinking requires a remaining email/password login; unlink and initial password setup invalidate sessions and return the browser to sign-in.

All POST BFF routes enforce the existing origin, body-size, rate-limit and localized error handling. Pending and binding credentials are never returned to browser JavaScript. Backend identity, code, grant, transaction and concurrency checks remain authoritative.

Configure the exact callback URL in the Google Cloud Web OAuth client. Development commonly uses `http://localhost:3000/api/auth/google/callback`; production must use its actual HTTPS site domain. When Google consent is in testing, add the eligible test accounts in Google Cloud.

Offline unit tests cover callback validation, cookie isolation, session switching, token redaction, binding proof and mutation boundaries. No live Google account, real mail delivery, HTTP listener, server restart, push or deployment is part of this verification. Complete consent and account lifecycle verification against the deployed domain and configured backend before release.
