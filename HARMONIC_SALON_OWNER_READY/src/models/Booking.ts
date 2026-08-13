import mongoose, { Schema, models, model } from "mongoose";

/**
 * SLOT LOCK:
 * Unique index on staffId + date + startTime + status(confirmed)
 * Prevents two customers booking the same staff at the same time.
 * When status → completed / cancelled → slot frees automatically.
 */
export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

const BookingSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String },
    customerArea: { type: String, default: "" },

    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    serviceName: { type: String, required: true },
    price: { type: Number, default: 0 },

    // Multi-service cart support
    services: [
      {
        serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
        serviceName: String,
        price: Number,
        durationMin: Number,
      },
    ],

    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },

    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    durationMin: { type: Number, default: 30 },

    status: {
      type: String,
      enum: ["confirmed", "completed", "cancelled", "no_show"],
      default: "confirmed",
    },
    notes: { type: String },
    whatsappSent: { type: Boolean, default: false },
    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["Cash", "Card", "Online", "Mixed"], default: "Cash" },
    cashAmount: { type: Number, default: 0 },
    cardAmount: { type: Number, default: 0 },
    onlineAmount: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// 🔒 SLOT LOCK — only one confirmed booking per staff + date + startTime
BookingSchema.index(
  { staffId: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "confirmed" },
    name: "unique_active_slot",
  }
);

export const Booking = models.Booking || model("Booking", BookingSchema);
