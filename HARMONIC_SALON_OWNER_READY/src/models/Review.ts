import mongoose, { Schema, models, model } from "mongoose";

const ReviewSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    status: { type: String, enum: ["Visible", "Hidden"], default: "Visible" },
  },
  { timestamps: true }
);

export const Review = models.Review || model("Review", ReviewSchema);
