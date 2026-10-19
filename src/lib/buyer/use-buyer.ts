"use client";
import { useEffect, useState, useCallback } from "react";
import { buyerApi } from "./api";
export function useBuyer<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    path: string;
    data?: T;
    loading: boolean;
    error?: Error;
  }>({ path, loading: true });
  useEffect(() => {
    const c = new AbortController();
    buyerApi
      .get<T>(path, c.signal)
      .then((data) => {
        if (!c.signal.aborted) setState({ path, data, loading: false });
      })
      .catch((error) => {
        if (!c.signal.aborted) setState({ path, error, loading: false });
      });
    return () => c.abort();
  }, [path, attempt]);
  const retry = useCallback(() => {
    setState((previous) => ({
      path,
      data: previous.path === path ? previous.data : undefined,
      loading: !previous.data,
    }));
    setAttempt((n) => n + 1);
  }, [path]);
  return { ...(state.path === path ? state : { path, loading: true }), retry };
}
