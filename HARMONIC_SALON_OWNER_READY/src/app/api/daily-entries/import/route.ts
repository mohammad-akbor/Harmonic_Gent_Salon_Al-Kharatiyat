import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyEntry } from "@/models/DailyEntry";
import { Staff } from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST { csv: string }
 * Header: Date,Staff Name,Total Clients,Service Sales,Product Sales,Tips,Cash,Card,Online,Notes
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin/Manager only" }, { status: 403 });
    }

    const body = await req.json();
    const csv: string = body.csv || "";
    if (!csv.trim()) {
      return NextResponse.json({ ok: false, error: "csv text required" }, { status: 400 });
    }

    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ ok: false, error: "Need header + data rows" }, { status: 400 });
    }

    const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const idx = (names: string[]) => {
      for (const n of names) {
        const i = header.findIndex((h) => h.includes(n));
        if (i >= 0) return i;
      }
      return -1;
    };

    const iDate = idx(["date"]);
    const iStaff = idx(["staff name", "staff"]);
    const iClients = idx(["total clients", "clients"]);
    const iService = idx(["service sales", "service"]);
    const iProduct = idx(["product sales", "product"]);
    const iTips = idx(["tips", "tip"]);
    const iCash = idx(["cash"]);
    const iCard = idx(["card"]);
    const iOnline = idx(["online"]);
    const iNotes = idx(["notes", "note"]);

    if (iDate < 0 || iStaff < 0) {
      return NextResponse.json({ ok: false, error: "Need Date and Staff Name columns", header }, { status: 400 });
    }

    const allStaff = await Staff.find({}).lean();
    const staffByName = Object.fromEntries(allStaff.map((s) => [s.name.toLowerCase().trim(), s]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let r = 1; r < lines.length; r++) {
      const cols = splitCsvLine(lines[r]);
      const rawDate = cols[iDate]?.trim();
      const rawStaff = cols[iStaff]?.trim();
      if (!rawDate || !rawStaff) { skipped++; continue; }

      const date = normalizeDate(rawDate);
      if (!date) { errors.push(`Row ${r + 1}: bad date "${rawDate}"`); skipped++; continue; }

      const staff = staffByName[rawStaff.toLowerCase()];
      if (!staff) { errors.push(`Row ${r + 1}: staff not found "${rawStaff}"`); skipped++; continue; }

      const serviceSales = num(cols[iService]);
      const productSales = num(cols[iProduct]);
      const tips = num(cols[iTips]);
      const sp = staff.servicePercent ?? 0.4;
      const pp = staff.productPercent ?? 0.05;
      const staffEarnings = serviceSales * sp + productSales * pp + tips;

      await DailyEntry.findOneAndUpdate(
        { date, staffId: staff._id },
        {
          date,
          staffId: staff._id,
          staffName: staff.name,
          totalClients: num(cols[iClients]),
          serviceSales,
          productSales,
          tips,
          cash: num(cols[iCash]),
          card: num(cols[iCard]),
          online: num(cols[iOnline]),
          servicePercent: sp,
          productPercent: pp,
          staffEarnings,
          paymentMethod: "Mixed",
          notes: iNotes >= 0 ? cols[iNotes] || "" : "",
          createdBy: (session.user as any).id,
        },
        { upsert: true }
      );
      imported++;
    }

    return NextResponse.json({
      ok: true,
      imported,
      skipped,
      errors: errors.slice(0, 20),
      message: `Imported ${imported} rows, skipped ${skipped}`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { result.push(cur); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function normalizeDate(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m1 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
