import { Schema, models, model } from "mongoose";

const OtpCodeSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode = models.OtpCode || model("OtpCode", OtpCodeSchema);
