import { Schema, models, model } from "mongoose";

const OfferSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    code: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Offer = models.Offer || model("Offer", OfferSchema);
