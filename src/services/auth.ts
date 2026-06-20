import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { logger } from "@/lib/logger";

let secretKey: Uint8Array;
if (process.env.JWT_SECRET) {
  secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
} else {
  const randomBuffer = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBuffer);
  } else {
    for (let i = 0; i < 32; i++) {
      randomBuffer[i] = Math.floor(Math.random() * 256);
    }
  }
  secretKey = randomBuffer;
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    logger.warn("JWT_SECRET environment variable is not set. A random secret key has been generated for this session. Session tokens will not persist across restarts.");
  }
}
const JWT_SECRET = secretKey;

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
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
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
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as { userId: string; email: string };
    } catch {
      return null;
    }
  }
}
