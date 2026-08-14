import { Schema, models, model } from "mongoose";

/**
 * Tips.
 * type "to_staff"  → goes to staff earnings (salon may or may not keep share)
 * type "to_salon"  → stays in salon revenue/profit
 * For simplicity:
 *   - tip received from customer can be assigned to staff or shared
 *   - amountToStaff + amountToSalon = total tip
 */
const TipSchema = new Schema(
  {
    amount: { type: Number, required: true },
    amountToStaff: { type: Number, default: 0 },
    amountToSalon: { type: Number, default: 0 },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    staffName: { type: String },
    customerName: { type: String },
    date: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    notes: { type: String },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Tip = models.Tip || model("Tip", TipSchema);
