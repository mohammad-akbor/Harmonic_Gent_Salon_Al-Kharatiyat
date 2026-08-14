import { Schema, models, model } from "mongoose";

/**
 * Stock purchase / inventory buy.
 * Increases product stock. Cost goes into COGS / expense side of P&L.
 */
const PurchaseSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    date: { type: String, required: true },
    supplier: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Purchase = models.Purchase || model("Purchase", PurchaseSchema);
