import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { logger } from "@/lib/logger";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "carbonwise_super_secret_key_123456789_at_least_32_chars"
);

const FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// Create remote JWKS to verify Firebase tokens signed by Google
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
try {
  JWKS = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
} catch (e) {
  logger.error("Failed to initialize remote JWK Set for Firebase", e);
}

/**
 * Signs a payload with HS256 to create a session token.
 * 
 * @param payload - Object containing userId and email.
 * @returns A promise resolving to the signed JWT token.
 */
export async function signToken(payload: { userId: string; email: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token. Handles Firebase verification if Firebase is configured,
 * otherwise falls back to local JWT signature checks.
 * 
 * @param token - The JWT string to verify.
 * @returns A promise resolving to decoded token payload or null if invalid/expired.
 */
export async function verifyToken(token: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const isFirebase = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && projectId);

  if (isFirebase && JWKS) {
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });
      return { 
        userId: payload.sub as string, 
        email: payload.email as string 
      };
    } catch (error) {
      logger.error("Firebase ID Token verification error", error);
      return null;
    }
  } else {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as { userId: string; email: string };
    } catch {
      return null;
    }
  }
}
