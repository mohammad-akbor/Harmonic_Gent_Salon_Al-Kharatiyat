import mongoose, { Schema, models, model } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String },
    category: { type: String, default: "Hair Care" },
    costPrice: { type: Number, default: 0 }, // purchase cost
    sellPrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 }, // low-stock alert below this
    unit: { type: String, default: "pcs" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

export const Product = models.Product || model("Product", ProductSchema);
