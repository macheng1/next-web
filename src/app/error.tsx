"use client";
import { StatusState } from "@/src/components/StatusState";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <StatusState kind="error" onRetry={reset} />;
}
