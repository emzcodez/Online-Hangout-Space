import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#faf8ff]" />}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}

async function AuthenticatedDashboard({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8ff] p-6 text-[#29213c]">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">Please sign in to continue</h1>
          <Link href="/" className="mt-4 inline-block font-semibold text-[#7655c9]">Return to login</Link>
        </div>
      </main>
    );
  }
  return children;
}
