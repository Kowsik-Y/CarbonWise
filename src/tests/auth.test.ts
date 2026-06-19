/* eslint-disable */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { signToken, verifyToken } from "@/services/auth";
import { withAuth } from "@/lib/proxy";
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

// Mock jose globally to support mocking jwtVerify in ESM
vi.mock("jose", async (importOriginal) => {
  const original = await importOriginal<typeof import("jose")>();
  return {
    ...original,
    jwtVerify: vi.fn().mockImplementation((token, keyOrJwks, options) => {
      if (token === "firebase-id-token") {
        return Promise.resolve({
          payload: { sub: "firebase-uid", email: "firebase@user.com" },
          protectedHeader: { alg: "RS256" },
        });
      }
      if (token === "invalid-firebase-token") {
        return Promise.reject(new Error("Invalid Firebase token"));
      }
      return original.jwtVerify(token, keyOrJwks, options);
    }),
  };
});

describe("Auth JWT Service Tests", () => {
  beforeEach(() => {
    // Ensure we reset environment variables
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  });

  it("should sign and verify local JWT tokens correctly", async () => {
    const payload = { userId: "test-user-id", email: "test@carbonwise.com" };
    
    // Sign token
    const token = await signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Verify token
    const verified = await verifyToken(token);
    expect(verified).toBeDefined();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
  });

  it("should return null for invalid or tampered tokens", async () => {
    const verified = await verifyToken("invalid-token-string");
    expect(verified).toBeNull();
  });

  it("should attempt Firebase JWT verification if environment is configured", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "mock-key";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "mock-project";

    const verified = await verifyToken("firebase-id-token");
    expect(verified).toEqual({
      userId: "firebase-uid",
      email: "firebase@user.com",
    });

    // Test the failure path
    const failedVerified = await verifyToken("invalid-firebase-token");
    expect(failedVerified).toBeNull();
  });
});

describe("Proxy withAuth helper", () => {
  it("should parse params if they are a promise or raw object", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    // Test with Promise params
    const req1 = new NextRequest("http://localhost/api/test", {
      headers: { "x-user-id": "u1", "x-user-email": "u1@test.com" }
    });
    const promiseParams = Promise.resolve({ id: "abc" });
    await wrapped(req1, { params: promiseParams });
    expect(handler).toHaveBeenCalledWith(req1, {
      userId: "u1",
      email: "u1@test.com",
      params: { id: "abc" }
    });

    // Test with raw object params
    const req2 = new NextRequest("http://localhost/api/test", {
      headers: { "x-user-id": "u1", "x-user-email": "u1@test.com" }
    });
    const rawParams = { id: "xyz" };
    await wrapped(req2, { params: rawParams });
    expect(handler).toHaveBeenCalledWith(req2, {
      userId: "u1",
      email: "u1@test.com",
      params: { id: "xyz" }
    });
  });

  it("should return 500 if an error is thrown in proxy logic", async () => {
    const handler = vi.fn();
    const wrapped = withAuth(handler);

    // Pass request that throws when accessing headers to trigger catch
    const req = {
      headers: {
        get: () => { throw new Error("Header crash"); }
      }
    } as any;

    const res = await wrapped(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("wrong during authorization check");
  });
});
