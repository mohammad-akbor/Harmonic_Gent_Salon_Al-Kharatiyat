import mongoose, { Schema, models, model } from "mongoose";

/**
 * Public media for premium website.
 * type: background_video | gallery_image | hero_image | promo_video
 * Only Admin uploads. Public can view.
 * videoUrl / imageUrl can be direct CDN link, YouTube embed, or /uploads/...
 */
const MediaSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["background_video", "gallery_image", "hero_image", "promo_video", "story"],
      required: true,
    },
    title: { type: String, default: "" },
    url: { type: String, required: true }, // video or image URL
    thumbnailUrl: { type: String, default: "" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    branchName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    // for rotating background: higher priority / latest active wins
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

MediaSchema.index({ type: 1, isActive: 1, sortOrder: 1 });

export const Media = models.Media || model("Media", MediaSchema);
