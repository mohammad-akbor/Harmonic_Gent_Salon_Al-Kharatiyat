import mongoose, { Schema, models, model } from "mongoose";

const BranchSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    address: { type: String },
    phone: { type: String },
    city: { type: String, default: "Doha" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Branch = models.Branch || model("Branch", BranchSchema);
