import mongoose, { Schema, models, model } from "mongoose";

/**
 * Any salon expense: rent, utilities, supplies (non-stock), marketing, etc.
 * These reduce salon profit.
 */
const ExpenseSchema = new Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["Rent", "Utility", "Salary", "Marketing", "Maintenance", "Supply", "Other"],
      default: "Other",
    },
    amount: { type: Number, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    notes: { type: String },
    paidTo: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Expense = models.Expense || model("Expense", ExpenseSchema);
