"use client";
import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/FIrebaseConfig";

const CATEGORIES = [
  "AI & Tech",
  "Programming",
  "Machine Learning",
  "Data Science",
  "Web Development",
  "Cloud",
  "DevOps",
  "Mobile Apps",
  "Cybersecurity",
  "UI/UX",
  "Productivity",
  "Business",
  "Startup",
  "Blockchain",
  "Healthcare",
  "Education",
  "Finance",
  "Marketing",
  "Gaming",
  "Other",
];

export default function BlogForm() {
  const [form, setForm] = useState({
    title: "",
    summary: "",
    description: "",
    category: CATEGORIES[0],
    trending: false,
    date: "",
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      let imgUrl = "";
      if (image) {
        const imgRef = ref(storage, `blog-images/${Date.now()}_${image.name}`);
        await uploadBytes(imgRef, image);
        imgUrl = await getDownloadURL(imgRef);
      }
      // Save to Firestore
      await addDoc(collection(db, "blogs"), {
        ...form,
        image: imgUrl,
        date: form.date
          ? Timestamp.fromDate(new Date(form.date))
          : Timestamp.now(),
      });
      setMsg("✅ Blog post added successfully!");
      setForm({
        title: "",
        summary: "",
        description: "",
        category: CATEGORIES[0],
        trending: false,
        date: "",
      });
      setImage(null);
    } catch (err) {
      setMsg("❌ Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <form
      className="bg-gradient-to-br from-fuchsia-50 via-cyan-50 to-blue-50 text-black p-8 rounded-xl shadow-2xl border border-fuchsia-100 max-w-2xl mx-auto mb-12 mt-6"
      onSubmit={handleSubmit}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <h2 className="text-3xl font-extrabold mb-6 text-center bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow">
        Create a New Blog Post
      </h2>
      {msg && (
        <div
          className={`mb-4 text-center font-semibold px-4 py-2 rounded-lg shadow-sm ${
            msg.startsWith("✅")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {msg}
        </div>
      )}
      <div className="grid grid-cols-1 gap-5">
        <div>
          <label className="block mb-1 font-semibold">Title</label>
          <input
            type="text"
            name="title"
            placeholder="Enter blog title"
            className="w-full px-4 py-2 rounded-lg border border-fuchsia-300 bg-white focus:ring-2 focus:ring-fuchsia-400 outline-none transition-all text-black font-medium"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Summary</label>
          <textarea
            name="summary"
            placeholder="Write a short summary"
            className="w-full px-4 py-2 rounded-lg border border-cyan-300 bg-white focus:ring-2 focus:ring-cyan-400 outline-none transition-all text-black font-medium resize-none"
            rows={2}
            value={form.summary}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Full Description</label>
          <textarea
            name="description"
            placeholder="Full blog description"
            className="w-full px-4 py-2 rounded-lg border border-blue-300 bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all text-black font-medium resize-none"
            rows={4}
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Category</label>
          <select
            name="category"
            className="w-full px-4 py-2 rounded-lg border border-fuchsia-300 bg-white focus:ring-2 focus:ring-fuchsia-400 outline-none text-black font-medium"
            value={form.category}
            onChange={handleChange}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="trending"
            checked={form.trending}
            onChange={handleChange}
            id="trending"
            className="w-5 h-5 accent-fuchsia-500"
          />
          <label htmlFor="trending" className="font-semibold">
            Mark as Trending
          </label>
        </div>

        <div>
          <label className="block mb-1 font-semibold">Publish Date</label>
          <input
            type="date"
            name="date"
            className="w-full px-4 py-2 rounded-lg border border-cyan-300 bg-white focus:ring-2 focus:ring-cyan-400 outline-none text-black font-medium"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Blog Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file-input file-input-bordered w-full border-fuchsia-300 bg-white text-black"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-blue-500 hover:from-blue-600 hover:to-fuchsia-600 text-white text-lg font-bold transition-all shadow-lg disabled:opacity-60"
        >
          {loading ? (
            <span>
              <svg
                className="inline animate-spin mr-2"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#fff"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="#fff"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              Posting...
            </span>
          ) : (
            "Post Blog"
          )}
        </button>
      </div>
    </form>
  );
}
