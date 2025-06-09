"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";
import { db, storage } from "@/FIrebaseConfig";

const PostedPromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: "", url: "" });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch promotions
  const fetchPromotions = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const querySnapshot = await getDocs(collection(db, "promotions"));
      const promos = [];
      querySnapshot.forEach((docSnap) => {
        promos.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPromotions(promos);
    } catch (err) {
      setError("Failed to fetch promotions.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  // Delete promotion
  const handleDelete = async (promoId, imageUrl) => {
    setError("");
    setSuccessMsg("");
    if (!window.confirm("Are you sure you want to delete this promotion?"))
      return;
    try {
      // Delete Firestore doc
      await deleteDoc(doc(db, "promotions", promoId));
      // Delete image from storage if possible
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(() => {}); // Ignore if not found
      }
      setPromotions((prev) => prev.filter((p) => p.id !== promoId));
      setSuccessMsg("Promotion deleted successfully.");
    } catch (err) {
      setError("Failed to delete promotion.");
    }
  };

  // Begin editing
  const handleEdit = (promo) => {
    setEditId(promo.id);
    setEditData({ name: promo.name, url: promo.url });
    setError("");
    setSuccessMsg("");
  };

  // Save edit
  const handleSave = async (promoId) => {
    setError("");
    setSuccessMsg("");
    if (!editData.name.trim() || !editData.url.trim()) {
      setError("Please provide both name and URL.");
      return;
    }
    try {
      await updateDoc(doc(db, "promotions", promoId), {
        name: editData.name,
        url: editData.url,
        updatedAt: serverTimestamp(),
      });
      setPromotions((prev) =>
        prev.map((promo) =>
          promo.id === promoId
            ? { ...promo, name: editData.name, url: editData.url }
            : promo
        )
      );
      setEditId(null);
      setSuccessMsg("Promotion updated successfully.");
    } catch (err) {
      setError("Failed to update promotion.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-cyan-100 to-blue-200 px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white/90 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-blue-600 bg-clip-text text-transparent mb-8">
          Posted Promotions
        </h2>

        {error && (
          <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-md p-2 text-sm text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded-md p-2 text-sm text-center">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center text-xl text-cyan-600 py-20">
            Loading...
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center text-lg text-gray-500 py-20">
            No promotions found.
          </div>
        ) : (
          <div className="space-y-8">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-col md:flex-row items-center bg-gradient-to-r from-white via-fuchsia-50 to-blue-50 border border-cyan-200 shadow rounded-xl p-4 gap-6"
              >
                <img
                  src={promo.image}
                  alt={promo.name}
                  className="w-28 h-28 object-cover rounded-lg border-2 border-fuchsia-400 shadow"
                />
                <div className="flex-1 flex flex-col gap-2">
                  {editId === promo.id ? (
                    <>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) =>
                          setEditData((d) => ({ ...d, name: e.target.value }))
                        }
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none text-black mb-2"
                        placeholder="Promotion Name"
                      />
                      <input
                        type="url"
                        value={editData.url}
                        onChange={(e) =>
                          setEditData((d) => ({ ...d, url: e.target.value }))
                        }
                        className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none text-black"
                        placeholder="Promotion URL"
                      />
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-fuchsia-700">
                        {promo.name}
                      </h3>
                      <a
                        href={promo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline break-all"
                      >
                        {promo.url}
                      </a>
                    </>
                  )}
                </div>
                <div className="flex flex-row md:flex-col gap-2 mt-4 md:mt-0">
                  {editId === promo.id ? (
                    <>
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-semibold hover:from-fuchsia-600 hover:to-cyan-600 transition"
                        onClick={() => handleSave(promo.id)}
                        title="Save"
                      >
                        <FiSave /> Save
                      </button>
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                        onClick={() => setEditId(null)}
                        title="Cancel"
                      >
                        <FiX /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded bg-gradient-to-r from-blue-500 to-fuchsia-500 text-white font-semibold hover:from-blue-600 hover:to-fuchsia-600 transition"
                        onClick={() => handleEdit(promo)}
                        title="Edit"
                      >
                        <FiEdit /> Edit
                      </button>
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                        onClick={() => handleDelete(promo.id, promo.image)}
                        title="Delete"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostedPromotionsPage;
