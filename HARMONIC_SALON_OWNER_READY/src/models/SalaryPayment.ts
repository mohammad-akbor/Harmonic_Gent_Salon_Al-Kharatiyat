import mongoose, { Schema, models, model } from "mongoose";

/**
 * Salary payout record.
 * When Admin clicks "Pay done" for a month:
 *  - one document per staff for that period
 *  - period locked against double-pay
 */
const SalaryPaymentSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    periodStart: { type: String, required: true }, // YYYY-MM-DD
    periodEnd: { type: String, required: true },
    periodKey: { type: String, required: true }, // YYYY-MM for easy lock lookup
    fixedAmount: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    serviceCommission: { type: Number, default: 0 },
    productCommission: { type: Number, default: 0 },
    tipsAmount: { type: Number, default: 0 },
    penaltyDeduction: { type: Number, default: 0 },
    visaDeduction: { type: Number, default: 0 },
    otherDeduction: { type: Number, default: 0 },
    totalCuts: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    netPaid: { type: Number, required: true },
    date: { type: String, required: true }, // payment date
    locked: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Prevent double pay same staff same month
SalaryPaymentSchema.index({ staffId: 1, periodKey: 1 }, { unique: true });

export const SalaryPayment = models.SalaryPayment || model("SalaryPayment", SalaryPaymentSchema);
