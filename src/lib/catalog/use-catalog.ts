"use client";
import { useEffect, useState } from "react";
import { requestJson } from "../http/request";
import { useFoundation } from "@/src/components/Providers";
import { HttpError } from "../http/types";
export function useCatalog<T>(inputPath: string): {
  data?: T;
  error?: HttpError;
  loading: boolean;
  retry: () => void;
} {
  const {locale}=useFoundation();
  const [target,query]=inputPath.split("?");
  const params=new URLSearchParams(query); params.set("locale",locale);
  const path=target+"?"+params.toString();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    path: string;
    data?: T;
    error?: HttpError;
    loading: boolean;
  }>({ path, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    requestJson<T>(`/api/catalog/${path}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ path, data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ path, error, loading: false });
      });
    return () => controller.abort();
  }, [path, attempt]);
  return {
    ...(state.path === path ? state : { loading: true }),
    retry: () => {
      setState({ path, loading: true });
      setAttempt((v) => v + 1);
    },
  };
}
