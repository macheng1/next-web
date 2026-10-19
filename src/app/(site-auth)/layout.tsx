import type { Metadata } from "next";
import { AuthShell } from "@/src/components/auth/AuthShell";
export const metadata: Metadata = {
  title: "ManuLink",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}
