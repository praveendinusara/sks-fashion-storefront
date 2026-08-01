# Security Checklist

- Use `ADMIN_PASSWORD_HASH`, generated with `npm run auth:hash -- "a-new-long-password"`.
- Remove the legacy `ADMIN_PASSWORD` after the hash is verified.
- Keep `ADMIN_SESSION_SECRET`, Blob, Turso and Google webhook secrets only in Vercel environment variables.
- Increase `ADMIN_SESSION_VERSION` to invalidate every active admin session.
- Require owner or administrator roles for catalogue and theme changes.
- Keep HTTP-only, Secure and SameSite=Strict session cookies enabled.
- Keep CSRF, same-origin, upload signature, MIME and 4 MB size checks enabled.
- Review the stored audit log after important catalogue or sales changes.
- Limit Google Sheet sharing to authorised accounts.
- Run `npm run check` before every deployment.
- Back up the current state before migrations or storage-provider changes.

The in-memory login limiter is useful but not globally durable across every serverless instance. For stronger distributed brute-force protection, enable Vercel Firewall rate limiting or move login-attempt state to a durable rate-limit store.
