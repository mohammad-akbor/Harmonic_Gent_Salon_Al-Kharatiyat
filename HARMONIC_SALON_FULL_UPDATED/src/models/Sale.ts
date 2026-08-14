import { Schema, models, model } from "mongoose";

/**
 * Product sale (POS).
 * Staff gets productPercent commission on sellPrice.
 * Example: 100 QAR product, staff productPercent 0.05 → staff earns 5 QAR
 */
const SaleSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    costTotal: { type: Number, default: 0 }, // for COGS
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    staffName: { type: String },
    staffCommission: { type: Number, default: 0 }, // calculated productPercent * totalAmount
    commissionRate: { type: Number, default: 0.05 },
    customerName: { type: String },
    customerPhone: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    date: { type: String, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Sale = models.Sale || model("Sale", SaleSchema);
