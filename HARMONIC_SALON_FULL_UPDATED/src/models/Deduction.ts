import { Schema, models, model } from "mongoose";

/**
 * Excel "Deductions" sheet.
 * Types:
 *  - Penalty → staff cut, salon keeps
 *  - Visa → visa/ticket recovery, staff cut, salon keeps
 *  - Advance → advance recovery, staff cut, salon keeps
 *  - Other → other cut, staff cut, salon keeps
 * All of these REDUCE staff net payable and INCREASE salon retained deductions (profit side).
 */
const DeductionSchema = new Schema(
  {
    date: { type: String, required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    type: {
      type: String,
      enum: ["Penalty", "Visa", "Advance", "Other"],
      required: true,
    },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    monthKey: { type: String }, // YYYY-MM for salary sheet grouping
    paymentMethod: { type: String, default: "Salary Deduction" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Deduction = models.Deduction || model("Deduction", DeductionSchema);
