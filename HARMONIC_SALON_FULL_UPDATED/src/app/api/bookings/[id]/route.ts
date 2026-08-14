import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendBookingWhatsApp } from "@/lib/whatsapp";
import { sendBookingSms, sendStaffBookingSms } from "@/lib/sms";
import { publishBookingEvent } from "@/lib/realtime";
import { Staff } from "@/models/Staff";

/** PATCH /api/bookings/[id] — update status (complete / cancel / no_show)
 *  When status leaves "confirmed" → unique index no longer applies → slot frees
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const body = await req.json();
    const { status, notes, paymentMethod, cashAmount, cardAmount, onlineAmount } = body;

    const allowed = ["confirmed", "completed", "cancelled", "no_show"];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const booking = await Booking.findById(params.id);
    if (!booking) {
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }

    if (role === "staff") {
      const staffId = (session.user as any).staffId;
      if (!staffId || booking.staffId.toString() !== staffId) {
        return NextResponse.json({ ok: false, error: "Not your booking" }, { status: 403 });
      }
    } else if (role === "customer") {
      if (booking.customerId?.toString() !== (session.user as any).id) {
        return NextResponse.json({ ok: false, error: "Not your booking" }, { status: 403 });
      }
      if (status && status !== "cancelled") {
        return NextResponse.json({ ok: false, error: "Customers can only cancel" }, { status: 403 });
      }
    }
    // admin / manager can do anything

    if (status) booking.status = status;
    if (notes !== undefined) booking.notes = notes;
    if (status === "completed") {
      booking.completedAt = new Date();
      const total = booking.totalAmount || booking.price || 0;
      if (paymentMethod) booking.paymentMethod = paymentMethod;
      if (cashAmount != null || cardAmount != null || onlineAmount != null) {
        booking.cashAmount = Number(cashAmount) || 0;
        booking.cardAmount = Number(cardAmount) || 0;
        booking.onlineAmount = Number(onlineAmount) || 0;
      } else if (paymentMethod === "Card") {
        booking.cardAmount = total;
        booking.cashAmount = 0;
        booking.onlineAmount = 0;
      } else if (paymentMethod === "Online") {
        booking.onlineAmount = total;
        booking.cashAmount = 0;
        booking.cardAmount = 0;
      } else {
        booking.cashAmount = total;
        booking.cardAmount = 0;
        booking.onlineAmount = 0;
        booking.paymentMethod = booking.paymentMethod || "Cash";
      }
    }
    await booking.save();

    let whatsapp = null;
    let sms = null;
    let staffSms = null;
    if (status === "completed" || status === "cancelled") {
      try {
        whatsapp = await sendBookingWhatsApp({
          toPhone: booking.customerPhone,
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          staffName: booking.staffName,
          date: booking.date,
          time: booking.startTime,
          status: status as "completed" | "cancelled",
          totalAmount: booking.totalAmount || booking.price,
        });
      } catch (_) {}
      try {
        sms = await sendBookingSms({
          toPhone: booking.customerPhone,
          kind: status as "completed" | "cancelled",
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          staffName: booking.staffName,
          date: booking.date,
          time: booking.startTime,
          amount: booking.totalAmount || booking.price,
        });
      } catch (_) {}

      // Notify staff on CANCEL only (complete is done by staff themselves)
      if (status === "cancelled") {
        try {
          const staffDoc = await Staff.findById(booking.staffId).select("phone").lean();
          if (staffDoc?.phone) {
            staffSms = await sendStaffBookingSms({
              toPhone: staffDoc.phone,
              kind: "cancelled",
              customerName: booking.customerName,
              customerPhone: booking.customerPhone,
              serviceName: booking.serviceName,
              date: booking.date,
              time: booking.startTime,
              amount: booking.totalAmount || booking.price,
            });
          }
        } catch (_) {}
      }
    }

        try {
      const t =
        status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "updated";
      await publishBookingEvent({
        type: t as "completed" | "cancelled" | "updated",
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

    return NextResponse.json({ ok: true, booking, whatsapp, sms, staffSms });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/bookings/[id] — admin only */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "manager"].includes((session.user as any).role)) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    await Booking.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
