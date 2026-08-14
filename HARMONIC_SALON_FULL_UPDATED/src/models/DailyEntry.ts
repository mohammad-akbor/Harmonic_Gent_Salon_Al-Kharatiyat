import { Schema, models, model } from "mongoose";

/**
 * Excel "Daily Entry" equivalent.
 * One row per staff per day.
 * Staff Earnings (auto) = serviceSales * servicePercent + productSales * productPercent + tips
 * Cash + Card + Online should match serviceSales + productSales (within 1 QAR)
 */
const DailyEntrySchema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },

    totalClients: { type: Number, default: 0 },
    serviceSales: { type: Number, default: 0 },
    productSales: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },

    // payment split (must sum ≈ serviceSales + productSales)
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    online: { type: Number, default: 0 },

    // snapshot of rates used that day
    servicePercent: { type: Number, default: 0.4 },
    productPercent: { type: Number, default: 0.05 },

    // auto: serviceSales*svc% + productSales*prod% + tips
    staffEarnings: { type: Number, default: 0 },

    paymentMethod: { type: String, default: "Mixed" }, // Cash | Card | Online | Mixed
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One entry per staff per day
DailyEntrySchema.index({ date: 1, staffId: 1 }, { unique: true });

export const DailyEntry = models.DailyEntry || model("DailyEntry", DailyEntrySchema);
