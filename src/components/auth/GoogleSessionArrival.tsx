"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signalSessionChange } from "@/src/lib/auth/session-events";
import { useAuthTask } from "./use-auth-task";
export function GoogleSessionArrival({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const { t } = useAuthTask();
  useEffect(() => {
    signalSessionChange();
    router.replace(returnTo);
    router.refresh();
  }, [returnTo, router]);
  return <p role="status">{t.loading}</p>;
}
