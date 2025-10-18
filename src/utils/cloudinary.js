// src/utils/cloudinary.js
export async function uploadToCloudinary(files) {
  const uploadedUrls = [];
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("⚠️ Missing Cloudinary config in .env.local");
  }

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.secure_url) {
      uploadedUrls.push(data.secure_url);
    } else {
      console.error("❌ Upload failed:", data);
    }
  }

  return uploadedUrls;
}
