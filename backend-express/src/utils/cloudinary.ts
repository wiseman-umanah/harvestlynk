import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
  api_key: process.env["CLOUDINARY_API_KEY"],
  api_secret: process.env["CLOUDINARY_API_SECRET"],
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "auto" }, (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve(result.secure_url);
      })
      .end(buffer);
  });
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  const parts = url.split("/");
  const filename = parts.at(-1)?.split(".")[0];
  const folder = parts.at(-2);
  if (filename && folder) {
    await cloudinary.uploader.destroy(`${folder}/${filename}`);
  }
}
