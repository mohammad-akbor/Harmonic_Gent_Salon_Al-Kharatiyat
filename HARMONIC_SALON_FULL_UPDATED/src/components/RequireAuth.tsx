"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Role = "admin" | "manager" | "staff" | "customer";

/**
 * Client-side route guard (like React Router <ProtectedRoute>)
 * Usage: <RequireAuth roles={["admin"]}><AdminPage /></RequireAuth>
 */
export default function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role as Role | undefined;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (roles && role && !roles.includes(role)) {
      if (role === "admin") router.replace("/admin");
      else if (role === "staff" || role === "manager") router.replace("/dashboard");
      else router.replace("/");
    }
  }, [status, role, roles, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Checking access...
      </div>
    );
  }
  if (status === "unauthenticated") return null;
  if (roles && role && !roles.includes(role)) return null;

  return <>{children}</>;
}
