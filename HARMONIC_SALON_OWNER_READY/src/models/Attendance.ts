import mongoose, { Schema, models, model } from "mongoose";

/**
 * Staff attendance — one open session per staff (check-in without check-out).
 * Logic:
 *  - checkIn: create row status=Open
 *  - checkOut: set checkOutAt, hours, status=Closed
 *  - Admin can view by date range
 */
const AttendanceSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date },
    hoursWorked: { type: Number, default: 0 },
    status: { type: String, enum: ["Open", "Closed"], default: "Open" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    notes: { type: String, default: "" },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AttendanceSchema.index({ staffId: 1, date: 1, status: 1 });

export const Attendance = models.Attendance || model("Attendance", AttendanceSchema);
