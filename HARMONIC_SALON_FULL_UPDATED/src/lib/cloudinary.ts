/**
 * Cloudinary signed upload via REST (no cloudinary npm package required).
 * Env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

export type CloudinaryUploadResult = {
  ok: boolean;
  url?: string;
  publicId?: string;
  error?: string;
};

export function isCloudinaryReady(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function sha1(message: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha1").update(message).digest("hex");
}

export async function uploadToCloudinary(
  file: Buffer | string,
  opts?: { folder?: string; resourceType?: "image" | "video" | "auto" }
): Promise<CloudinaryUploadResult> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !key || !secret) {
    return { ok: false, error: "Cloudinary not configured" };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = opts?.folder || process.env.CLOUDINARY_FOLDER || "harmonic-salon";
    const resourceType = opts?.resourceType || "auto";

    // Cloudinary signature: sort params alphabetically, exclude file/cloud_name/resource_type/api_key
    const params: Record<string, string | number> = { folder, timestamp };
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&") + secret;
    const signature = sha1(toSign);

    const form = new FormData();
    const blob = typeof file === "string" ? file : new Blob([new Uint8Array(file as Buffer)]);
    form.append("file", blob);
    form.append("api_key", key);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`;
    const res = await fetch(endpoint, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error?.message || JSON.stringify(data) };
    }
    return { ok: true, url: data.secure_url, publicId: data.public_id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload error" };
  }
}
