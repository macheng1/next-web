"use client";
import { useRef, useState } from "react";
import { HttpError } from "@/src/lib/http/types";
import { useFoundation } from "../Providers";
import { authCopy } from "@/src/lib/auth/copy";
export function useAuthTask() {
  const { locale } = useFoundation();
  const t = authCopy(locale);
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run(work: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError("");
    try {
      await work();
    } catch (cause) {
      setError(
        cause instanceof HttpError &&
          cause.kind !== "network" &&
          cause.kind !== "timeout"
          ? cause.message
          : t.serviceUnavailable,
      );
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return { run, pending, error, setError, t, locale };
}
