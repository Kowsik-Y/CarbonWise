import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";

export interface UseApiResult<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  request: (url: string, init?: RequestInit) => Promise<T>;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
}

/**
 * Reusable client-side data fetching hook.
 * Manages loading, error, and data state, and logs errors via the structured logger.
 */
export function useApi<T>(initialData: T | null = null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (url: string, init?: RequestInit): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      const json = await res.json();
      if (!res.ok) {
        const errorMsg = json?.error || `Request failed with status ${res.status}`;
        setError(errorMsg);
        logger.error(`API request error on ${url}`, new Error(errorMsg));
        throw new Error(errorMsg);
      }
      setData(json as T);
      return json as T;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected network or client error occurred";
      setError(errorMsg);
      logger.error(`Request to ${url} failed`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, data, request, setData, setError };
}
