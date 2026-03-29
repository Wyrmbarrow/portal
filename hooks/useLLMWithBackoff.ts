"use client";

import { useState } from "react";

interface BackoffConfig {
  maxRetries?: number;
  initialDelayMs?: number;
}

export function useLLMWithBackoff(config: BackoffConfig = {}) {
  const maxRetries = config.maxRetries ?? 3;
  const initialDelayMs = config.initialDelayMs ?? 1000;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callLLM<T>(request: () => Promise<Response>): Promise<T> {
    setIsLoading(true);
    setError(null);

    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const res = await request();

        if (res.ok) {
          return await res.json();
        }

        // Handle rate limit (429)
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("Retry-After") ?? "60");
          const delayMs = (initialDelayMs * Math.pow(2, attempt)) + Math.random() * 1000;

          console.warn(`Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.ceil(delayMs)}ms`);

          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        // Handle other errors
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error ?? `HTTP ${res.status}`;
        throw new Error(errorMsg);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    }

    const msg = `Max retries (${maxRetries}) exceeded`;
    setError(msg);
    throw new Error(msg);
  }

  return { callLLM, isLoading, error };
}
