# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ Actively maintained |
| Older branches | ❌ Not supported |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

If you discover a security vulnerability, please report it responsibly:

1. **Email:** Send details to the project maintainers privately.
2. **Include in your report:**
   - A clear description of the vulnerability.
   - Steps to reproduce the issue.
   - Potential impact assessment.
   - Any suggested mitigations (optional but appreciated).

We aim to respond to all security reports within **48 hours** and will work to issue a fix within **7 days** for critical vulnerabilities.

---

## Security Architecture

### Authentication

- **Firebase Authentication** handles all user identity management using Google's production-hardened auth infrastructure.
- Firebase ID tokens are short-lived (1 hour) and automatically refreshed by the Firebase SDK.
- Tokens are verified server-side against **Google's JWKS endpoint** (`securetoken.google.com`) using the `jose` library — no private service account key is required or stored.

### Session Management

- After Firebase authentication, a **server-issued JWT** is stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- `HttpOnly` prevents any client-side JavaScript (including injected scripts) from reading the session token.
- `SameSite=Lax` mitigates cross-site request forgery (CSRF) attacks on state-changing requests.
- Session tokens expire after **7 days** and are invalidated on logout via explicit cookie clearing.

### Input Validation

- All API route bodies are parsed and validated using **Zod schemas** at the request boundary.
- Validation runs before any business logic, database queries, or AI calls execute.
- Malformed, oversized, or unexpected input is rejected with `400 Bad Request`.

### Database Security

- **Firestore Security Rules** enforce that users can only read and write their own documents (`request.auth.uid == resource.data.userId`).
- **Prisma ORM** (SQLite fallback mode) uses parameterized queries exclusively — SQL injection is structurally prevented.

### Secrets & Environment Variables

| Variable type | Where it lives |
|---|---|
| `GEMINI_API_KEY` | Server-only (never sent to browser) |
| `JWT_SECRET` | Server-only |
| `DATABASE_URL` | Server-only |
| `NEXT_PUBLIC_FIREBASE_*` | Client-safe (Firebase design; contain no secrets) |

No private keys, service account credentials, or sensitive tokens are exposed to the client bundle.

### Dependency Security

- Dependencies are managed via `npm` with `package-lock.json` lockfile pinning.
- Run `npm audit` regularly to check for known vulnerabilities in the dependency tree.

```bash
npm audit
npm audit fix
```

---

## Security Checklist

- [x] Firebase Authentication with Google-managed token lifecycle
- [x] JWKS-based Firebase ID token server verification (no private key needed)
- [x] HttpOnly + Secure + SameSite session cookies
- [x] Zod schema validation on all API boundaries
- [x] Firestore Security Rules (user-scoped data access)
- [x] Parameterized queries via Prisma (SQL injection prevention)
- [x] bcryptjs password hashing (10 salt rounds) for fallback auth mode
- [x] No secrets in `NEXT_PUBLIC_*` environment variables
- [x] Auth-loading guard on client pages (prevents flash of unauthenticated UI)
- [x] Input-validated carbon assessment data before emission calculation
- [ ] Rate limiting on auth endpoints (recommended for production)
- [ ] Content Security Policy (CSP) headers (recommended for production)
- [ ] Playwright E2E auth flow security tests (planned)

---

## Recommended Production Hardening

For production deployments, the following additional controls are recommended:

### 1. Tighten Firestore Security Rules

Replace the permissive public rules with user-scoped rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Assessments, goals, challenges, achievements — owner-only
    match /{collection}/{docId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 2. Add Next.js Security Headers

Add to `next.config.ts`:

```ts
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
```

### 3. Rate Limit Auth Endpoints

Use an edge middleware or an upstream proxy (e.g. Vercel Edge Middleware, Cloudflare) to rate-limit `/api/auth/login` and `/api/auth/signup` to prevent brute-force attacks.

### 4. Rotate JWT_SECRET

If using the Prisma/SQLite fallback auth mode, ensure `JWT_SECRET` is a cryptographically random string of at least 32 characters and is rotated periodically.

---

## Acknowledgements

We appreciate responsible disclosure of security vulnerabilities. Contributors who report valid security issues will be credited in release notes (with their permission).
