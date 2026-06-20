import { describe, it, expect } from "vitest";
import { ZodError, z } from "zod";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from "@/lib/errors";

describe("handleApiError Unit Tests", () => {
  it("should handle ValidationError correctly", async () => {
    const err = new ValidationError("Custom validation error");
    const res = handleApiError(err);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Custom validation error");
  });

  it("should handle UnauthorizedError correctly", async () => {
    const err = new UnauthorizedError("Custom unauthorized error");
    const res = handleApiError(err);
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Custom unauthorized error");
  });

  it("should handle NotFoundError correctly", async () => {
    const err = new NotFoundError("Custom not found error");
    const res = handleApiError(err);
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Custom not found error");
  });

  it("should handle ConflictError correctly", async () => {
    const err = new ConflictError("Custom conflict error");
    const res = handleApiError(err);
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Custom conflict error");
  });

  it("should handle RateLimitError correctly", async () => {
    const err = new RateLimitError("Custom rate limit error");
    const res = handleApiError(err);
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Custom rate limit error");
  });

  it("should handle ZodError correctly by joining all issue messages", async () => {
    const schema = z.object({
      email: z.string().min(1, { message: "Email must be a string" }),
      password: z.string().min(5, { message: "Password too short" }),
    });

    const result = schema.safeParse({ email: "", password: "123" });
    expect(result.success).toBe(false);
    
    const zodError = (result as { error: ZodError }).error;
    const res = handleApiError(zodError);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Validation error: Email must be a string, Password too short");
  });

  it("should handle plain Error with status 500 and the error message", async () => {
    const err = new Error("Something unexpectedly broke");
    const res = handleApiError(err);
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Something unexpectedly broke");
  });

  it("should handle non-Error thrown values with status 500 and the fallback message", async () => {
    const res = handleApiError("raw string error");
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("An unexpected error occurred");
  });
});
