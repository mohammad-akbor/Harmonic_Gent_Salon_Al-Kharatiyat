import { Schema, models, model } from "mongoose";

const StaffSchema = new Schema(
  {
    staffCode: { type: String },
    name: { type: String, required: true },
    department: { type: String, default: "Barber" },
    salaryType: { type: String, enum: ["Commission", "Fixed"], default: "Commission" },
    fixedSalary: { type: Number, default: 0 },
    servicePercent: { type: Number, default: 0.4 },
    productPercent: { type: Number, default: 0.05 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    phone: { type: String },
    email: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    visaTicketCost: { type: Number, default: 0 },
    monthlyRecovery: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    joinNotes: { type: String },
    profilePicture: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Staff = models.Staff || model("Staff", StaffSchema);
