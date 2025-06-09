// components/ConfessBox.js
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ConfessBox({ irysUploader, address, onUpload }) {
  const [uploadText, setUploadText] = useState("");
  const [uploadResult, setUploadResult] = useState("");

  const encryptConfession = (plaintext) => {
    return btoa(plaintext);
  };

  const handleUpload = async () => {
    if (!uploadText || !irysUploader) return;

    const encrypted = encryptConfession(uploadText);

    try {
      const receipt = await irysUploader.upload(encrypted);
      const tx_id = receipt.id;

      await supabase.from("confessions").insert({
        tx_id,
        encrypted,
        address,
      });

      setUploadResult("✅ Uploaded anonymously");
      setUploadText("");
      if (onUpload) onUpload();
    } catch (e) {
      console.error("Upload error:", e);
      setUploadResult("❌ Upload failed");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-[#111] p-6 rounded-lg border border-gray-700">
      <textarea
        placeholder="Write your confession..."
        rows="4"
        value={uploadText}
        onChange={(e) => setUploadText(e.target.value)}
        className="w-full p-3 mb-4 bg-black text-white border border-irysAccent rounded-md focus:outline-none focus:ring-2 focus:ring-irysAccent"
      />
      <button onClick={handleUpload} className="btn-irys w-full">
        Upload Confession
      </button>
      {uploadResult && (
        <p className="text-sm text-center mt-2 text-gray-400">{uploadResult}</p>
      )}
    </div>
  );
}
