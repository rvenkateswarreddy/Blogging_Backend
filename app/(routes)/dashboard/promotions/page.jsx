"use client";

import React, { useRef, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FiUploadCloud } from "react-icons/fi";
import { db, storage } from "../../../../FIrebaseConfig";

const PromotionsPage = () => {
  const [promotionName, setPromotionName] = useState("");
  const [promoUrl, setPromoUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!promotionName.trim() || !promoUrl.trim() || !imageFile) {
      setError("Please fill in all fields and select an image.");
      return;
    }

    setLoading(true);
    try {
      // Upload image to Firebase Storage
      const storageRef = ref(
        storage,
        `promotions/${Date.now()}_${imageFile.name}`
      );
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      // Store promotion data in Firestore
      await addDoc(collection(db, "promotions"), {
        name: promotionName,
        url: promoUrl,
        image: imageUrl,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg("Promotion posted successfully!");
      setPromotionName("");
      setPromoUrl("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError("Failed to post promotion. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-cyan-100 to-blue-200 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-blue-600 bg-clip-text text-transparent mb-8">
          Post a New Promotion
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Promotion Name
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none text-black placeholder-gray-400"
              placeholder="Enter promotion name"
              value={promotionName}
              disabled={loading}
              onChange={(e) => setPromotionName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Website/Promotion URL
            </label>
            <input
              type="url"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none text-black placeholder-gray-400"
              placeholder="https://yourwebsite.com"
              value={promoUrl}
              disabled={loading}
              onChange={(e) => setPromoUrl(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Promotion Image
            </label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="promo-image"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-semibold cursor-pointer hover:from-fuchsia-600 hover:to-cyan-600 transition"
              >
                <FiUploadCloud className="w-5 h-5" />
                {imageFile ? "Change Image" : "Upload Image"}
                <input
                  ref={fileInputRef}
                  type="file"
                  id="promo-image"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={loading}
                />
              </label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-fuchsia-400 shadow"
                />
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-2 text-sm text-center">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-green-700 bg-green-50 border border-green-200 rounded-md p-2 text-sm text-center">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white font-semibold text-lg shadow-md hover:from-blue-600 hover:to-fuchsia-600 transition-all focus:ring-2 focus:ring-fuchsia-400 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Posting..." : "Post Promotion"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PromotionsPage;
