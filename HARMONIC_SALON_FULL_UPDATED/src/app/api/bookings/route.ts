import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Service } from "@/models/Service";
import { Staff } from "@/models/Staff";
import { sendBookingWhatsApp } from "@/lib/whatsapp";
import { sendBookingSms, sendStaffBookingSms } from "@/lib/sms";
import { publishBookingEvent } from "@/lib/realtime";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/bookings?date=&staffId=&customerId=&status=&mine=1 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const staffId = searchParams.get("staffId");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const mine = searchParams.get("mine");

    const session = await getServerSession(authOptions);
    const q: Record<string, unknown> = {};

    if (date) q.date = date;
    if (staffId) q.staffId = staffId;
    if (customerId) q.customerId = customerId;
    if (status) q.status = status;
    else if (!mine) q.status = { $in: ["confirmed", "completed"] };

    // Customer can only see own bookings when mine=1
    if (mine === "1" && session?.user) {
      q.customerId = (session.user as any).id;
    }

    // Staff can filter by own staffId
    if (mine === "staff" && session?.user && (session.user as any).staffId) {
      q.staffId = (session.user as any).staffId;
    }

    const list = await Booking.find(q).sort({ date: -1, startTime: 1 }).lean();
    return NextResponse.json({ ok: true, bookings: list });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/bookings
 * Supports single service OR multi-service cart
 * Body single: { customerName, customerPhone,
      customerArea, serviceId, staffId, date, startTime, notes? }
 * Body multi:  { customerName, customerPhone,
      customerArea, serviceIds: string[], staffId, date, startTime, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerArea,
      customerEmail,
      serviceId,
      serviceIds,
      staffId,
      date,
      startTime,
      notes,
      customerId,
      branchId,
    } = body;

    if (!customerName || !customerPhone || !staffId || !date || !startTime) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const ids: string[] = Array.isArray(serviceIds) && serviceIds.length
      ? serviceIds
      : serviceId
      ? [serviceId]
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "At least one service required" }, { status: 400 });
    }

    const staff = await Staff.findById(staffId);
    if (!staff || staff.status !== "Active") {
      return NextResponse.json({ ok: false, error: "Staff not available" }, { status: 400 });
    }
    if (staff.salaryType === "Fixed") {
      return NextResponse.json({
        ok: false,
        error: "This staff is Fixed salary and cannot take customer appointments",
      }, { status: 400 });
    }
    const serviceDocs = await Service.find({ _id: { $in: ids }, status: "Active" });
    if (serviceDocs.length !== ids.length) {
      return NextResponse.json({ ok: false, error: "One or more services not available" }, { status: 400 });
    }

    // Total duration & amount
    let totalDuration = 0;
    let totalAmount = 0;
    const servicesPayload = serviceDocs.map((s) => {
      totalDuration += s.durationMin || 30;
      totalAmount += s.price || 0;
      return {
        serviceId: s._id,
        serviceName: s.name,
        price: s.price,
        durationMin: s.durationMin || 30,
      };
    });

    const primary = serviceDocs[0];

    const [hh, mm] = startTime.split(":").map(Number);
    const endDate = new Date(2000, 0, 1, hh, mm + totalDuration);
    const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

    // 🔒 SLOT LOCK check
    const clash = await Booking.findOne({
      staffId,
      date,
      startTime,
      status: "confirmed",
    });
    if (clash) {
      return NextResponse.json(
        { ok: false, error: "This slot is already booked. Choose another time or staff." },
        { status: 409 }
      );
    }

    // Attach logged-in customer if available
    const session = await getServerSession(authOptions);
    const finalCustomerId = customerId || (session?.user ? (session.user as any).id : undefined);

    let booking;
    try {
      booking = await Booking.create({
        customerId: finalCustomerId,
        customerName,
        customerPhone,
        customerArea: customerArea || "",
        customerEmail: customerEmail || (session?.user as any)?.email,
        serviceId: primary._id,
        serviceName: primary.name,
        price: primary.price,
        services: servicesPayload,
        staffId,
        staffName: staff.name,
        branchId: branchId || staff.branchId || undefined,
        date,
        startTime,
        endTime,
        durationMin: totalDuration,
        totalAmount,
        status: "confirmed",
        notes,
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
        return NextResponse.json(
          { ok: false, error: "Slot just got booked. Please choose another." },
          { status: 409 }
        );
      }
      throw err;
    }

    const serviceNames = servicesPayload.map((s) => s.serviceName).join(", ");
    const wa = await sendBookingWhatsApp({
      toPhone: customerPhone,
      customerName,
      serviceName: serviceNames,
      staffName: staff.name,
      date,
      time: `${startTime} - ${endTime}`,
      status: "confirmed",
      totalAmount,
    });

    if (wa.ok) {
      booking.whatsappSent = true;
      await booking.save();
    }

    // SMS → Customer
    let sms = { ok: false as boolean, error: undefined as string | undefined };
    try {
      sms = await sendBookingSms({
        toPhone: customerPhone,
        kind: "confirmed",
        customerName,
        serviceName: serviceNames,
        staffName: staff.name,
        date,
        time: `${startTime}`,
        amount: totalAmount,
      });
    } catch (_) {}

    // SMS → Staff (new booking alert)
    let staffSms = { ok: false as boolean, error: undefined as string | undefined };
    if (staff.phone) {
      try {
        staffSms = await sendStaffBookingSms({
          toPhone: staff.phone,
          kind: "new",
          customerName,
          customerPhone,
          serviceName: serviceNames,
          date,
          time: `${startTime}`,
          amount: totalAmount,
        });
      } catch (_) {}
    }

    // Realtime WebSocket (Pusher) → Admin/Staff dashboards
    try {
      await publishBookingEvent({
        type: "created",
        booking: {
          _id: String(booking._id),
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          serviceName: booking.serviceName,
          services: booking.services,
          staffName: booking.staffName,
          staffId: booking.staffId ? String(booking.staffId) : undefined,
          date: booking.date,
          startTime: booking.startTime,
          status: booking.status,
          totalAmount: booking.totalAmount,
        },
        at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      ok: true,
      booking,
      whatsapp: wa,
      sms,
      staffSms,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
