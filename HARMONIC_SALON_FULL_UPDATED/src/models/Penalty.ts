import { Schema, models, model } from "mongoose";

/**
 * Penalty / rule break.
 * Amount is DEDUCTED from staff earnings AND ADDED to salon profit.
 * Example: late, no-show handling fail, rule violation.
 */
const PenaltySchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    date: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Penalty = models.Penalty || model("Penalty", PenaltySchema);
