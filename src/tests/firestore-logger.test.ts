import { vi, describe, it, expect, beforeEach } from "vitest";
import { convertFirestoreDoc, convertFirestoreQuery } from "@/lib/firestore-utils";
import { logger } from "@/lib/logger";
import { DocumentSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";

describe("firestore-utils.ts Unit Tests", () => {
  it("convertFirestoreDoc: should return null if doc doesn't exist", () => {
    const mockSnap = {
      exists: () => false,
      id: "id-1",
      data: () => undefined,
    } as unknown as DocumentSnapshot<DocumentData>;

    const result = convertFirestoreDoc(mockSnap);
    expect(result).toBeNull();
  });

  it("convertFirestoreDoc: should return null if data is null", () => {
    const mockSnap = {
      exists: () => true,
      id: "id-1",
      data: () => null,
    } as unknown as DocumentSnapshot<DocumentData>;

    const result = convertFirestoreDoc(mockSnap);
    expect(result).toBeNull();
  });

  it("convertFirestoreDoc: should convert firestore Timestamps recursively to Dates", () => {
    const mockDate = new Date();
    const mockTimestamp = {
      toDate: () => mockDate,
    };
    const mockSnap = {
      exists: () => true,
      id: "id-123",
      data: () => ({
        name: "test",
        created: mockTimestamp,
        nested: {
          other: "value",
        },
      }),
    } as unknown as DocumentSnapshot<DocumentData>;

    const result = convertFirestoreDoc<{ id: string; name: string; created: Date }>(mockSnap);
    expect(result).toBeDefined();
    expect(result?.id).toBe("id-123");
    expect(result?.name).toBe("test");
    expect(result?.created).toBe(mockDate);
  });

  it("convertFirestoreQuery: should parse snapshot list", () => {
    const mockDoc = {
      exists: () => true,
      id: "id-1",
      data: () => ({ val: 10 }),
    };

    const mockQuery = {
      forEach: (cb: (doc: { exists: () => boolean; id: string; data: () => { val: number } }) => void) => {
        cb(mockDoc);
      },
    } as unknown as QuerySnapshot<DocumentData>;

    const result = convertFirestoreQuery<{ id: string; val: number }>(mockQuery);
    expect(result).toEqual([{ id: "id-1", val: 10 }]);
  });
});

describe("logger.ts Unit Tests", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("info: should log with and without context", () => {
    logger.info("message info");
    expect(logSpy).toHaveBeenCalledWith("[INFO] message info");

    logger.info("message info context", { a: 1 });
    expect(logSpy).toHaveBeenCalledWith("[INFO] message info context", JSON.stringify({ a: 1 }));
  });

  it("warn: should log with and without context", () => {
    logger.warn("message warn");
    expect(warnSpy).toHaveBeenCalledWith("[WARN] message warn");

    logger.warn("message warn context", { b: 2 });
    expect(warnSpy).toHaveBeenCalledWith("[WARN] message warn context", JSON.stringify({ b: 2 }));
  });

  it("error: should format and log errors", () => {
    logger.error("message error");
    expect(errorSpy).toHaveBeenCalledWith("[ERROR] message error");

    const err = new Error("something failed");
    logger.error("message error with stack", err);
    expect(errorSpy).toHaveBeenCalledWith(
      "[ERROR] message error with stack",
      JSON.stringify({ error: { message: err.message, stack: err.stack } })
    );

    logger.error("message error custom object", { detail: "failed" });
    expect(errorSpy).toHaveBeenCalledWith(
      "[ERROR] message error custom object",
      JSON.stringify({ error: { detail: "failed" } })
    );

    logger.error("message error with context and error", err, { metadata: "info" });
    expect(errorSpy).toHaveBeenCalledWith(
      "[ERROR] message error with context and error",
      JSON.stringify({
        metadata: "info",
        error: { message: err.message, stack: err.stack }
      })
    );
  });
});
