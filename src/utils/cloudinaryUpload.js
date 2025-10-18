// src/utils/cloudinaryUpload.js
export const uploadToCloudinary = async (file) => {
  const cloudName = "dbvdjqeke"; 
  const uploadPreset = "warranty_claims"; 

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.secure_url; // URL ảnh/pdf để lưu vào DB
};
