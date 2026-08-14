import { Schema, models, model } from "mongoose";

const ServiceSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "Barber" },
    price: { type: Number, required: true },
    durationMin: { type: Number, default: 30 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

export const Service = models.Service || model("Service", ServiceSchema);
