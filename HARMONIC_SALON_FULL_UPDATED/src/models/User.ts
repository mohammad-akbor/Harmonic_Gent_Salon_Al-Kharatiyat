import { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "staff", "customer"], default: "staff" },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    phone: { type: String },
    area: { type: String, default: "" },
    /** Profile picture URL (Cloudinary or /uploads/...) — Admin, Staff, Customer */
    profilePicture: { type: String, default: "" },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
