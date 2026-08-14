import { NextRequest, NextResponse } from "next/server";
import { calcProfitLoss, calcStaffEarnings, getDashboardSummary } from "@/lib/finance";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager", "staff"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "summary";
    const from = searchParams.get("from") || new Date().toISOString().slice(0, 8) + "01";
    const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const branchId = searchParams.get("branchId") || undefined;
    const staffId = searchParams.get("staffId") || undefined;

    if (mode === "summary") {
      const data = await getDashboardSummary(branchId);
      return NextResponse.json({ ok: true, ...data });
    }

    if (mode === "pl") {
      const pl = await calcProfitLoss({ from, to, branchId });
      return NextResponse.json({ ok: true, pl });
    }

    if (mode === "staff") {
      if (!staffId) {
        return NextResponse.json({ ok: false, error: "staffId required" }, { status: 400 });
      }
      if ((session.user as any).role === "staff" && (session.user as any).staffId !== staffId) {
        return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
      }
      const earnings = await calcStaffEarnings(staffId, from, to);
      return NextResponse.json({ ok: true, earnings });
    }

    return NextResponse.json({ ok: false, error: "Unknown mode" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
