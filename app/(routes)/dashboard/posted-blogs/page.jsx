"use client";
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import Image from "next/image";
import { db } from "@/FIrebaseConfig";

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

function formatDate(ts) {
  if (!ts) return "";
  if (typeof ts === "string") return ts;
  if (ts instanceof Timestamp) return ts.toDate().toLocaleDateString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
  return "";
}

export default function Page() {
  const [blogs, setBlogs] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch blogs from Firestore
  useEffect(() => {
    const fetchBlogs = async () => {
      const querySnapshot = await getDocs(collection(db, "blogs"));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date descending
      data.sort((a, b) => b.date?.seconds - a.date?.seconds);
      setBlogs(data);
    };
    fetchBlogs();
  }, []);

  // Toggle expanded card
  const handleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Delete blog
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await deleteDoc(doc(db, "blogs", id));
    setBlogs((prev) => prev.filter((b) => b.id !== id));
  };

  // Edit blog
  const handleEdit = (blog) => {
    setEditing(blog.id);
    setEditData({
      ...blog,
      date: blog.date
        ? blog.date instanceof Timestamp
          ? blog.date.toDate().toISOString().slice(0, 10)
          : blog.date
        : "",
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    setLoading(true);
    await updateDoc(doc(db, "blogs", editing), {
      ...editData,
      date: editData.date
        ? Timestamp.fromDate(new Date(editData.date))
        : Timestamp.now(),
    });
    setBlogs((prev) =>
      prev.map((b) =>
        b.id === editing
          ? {
              ...b,
              ...editData,
              date: Timestamp.fromDate(new Date(editData.date)),
            }
          : b
      )
    );
    setEditing(null);
    setEditData({});
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <h1 className="text-4xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-cyan-400 to-blue-600 bg-clip-text text-transparent drop-shadow mb-10 text-center">
        Your Posted Blogs
      </h1>
      {blogs.length === 0 && (
        <div className="text-gray-500 text-center text-lg bg-gradient-to-r from-fuchsia-50 via-cyan-50 to-blue-50 rounded-xl shadow p-6">
          No blogs posted yet.
        </div>
      )}

      <div className="space-y-8">
        {blogs.map((blog) =>
          editing === blog.id ? (
            <div
              key={blog.id}
              className="p-6 rounded-xl shadow-2xl border-2 border-yellow-200 bg-yellow-50 text-black space-y-4"
            >
              <input
                className="input input-bordered w-full font-bold text-lg"
                value={editData.title}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, title: e.target.value }))
                }
              />
              <textarea
                className="textarea textarea-bordered w-full"
                value={editData.summary}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, summary: e.target.value }))
                }
              />
              <textarea
                className="textarea textarea-bordered w-full"
                value={editData.description}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, description: e.target.value }))
                }
              />
              <select
                className="select select-bordered w-full"
                value={editData.category}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, category: e.target.value }))
                }
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <input
                className="input input-bordered w-full"
                type="date"
                value={editData.date}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, date: e.target.value }))
                }
              />
              <div className="flex gap-3 mt-2">
                <button
                  className="btn bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold"
                  onClick={handleSaveEdit}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  className="btn bg-gradient-to-r from-gray-200 to-gray-100 text-black border border-gray-300"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              key={blog.id}
              className="p-6 rounded-xl shadow-xl border-2 border-fuchsia-100 bg-gradient-to-br from-white via-fuchsia-50 to-blue-50 flex flex-col sm:flex-row gap-6 text-black hover:scale-[1.01] hover:shadow-2xl transition-transform"
            >
              {blog.image && (
                <div className="w-full sm:w-56 h-56 relative rounded-xl overflow-hidden border-2 border-cyan-200 shadow-md">
                  <Image
                    src={blog.image}
                    alt={blog.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 text-xs font-semibold mb-2">
                  <span className="uppercase font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {blog.category}
                  </span>
                  {blog.trending && (
                    <span className="px-3 py-0.5 bg-fuchsia-200 text-fuchsia-700 text-xs rounded-full font-bold shadow">
                      Trending
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-1">{blog.title}</h2>
                <div className="text-sm text-blue-500 mb-2 font-semibold">
                  {formatDate(blog.date)}
                </div>
                <p className="mb-2 font-medium text-gray-800">{blog.summary}</p>
                {expanded[blog.id] && (
                  <div className="mb-2 text-gray-900 whitespace-pre-line">
                    {blog.description}
                  </div>
                )}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleExpand(blog.id)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold shadow hover:from-fuchsia-500 hover:to-blue-600 transition-all"
                  >
                    {expanded[blog.id] ? "Show Less" : "Read More"}
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold shadow hover:from-yellow-500 hover:to-yellow-400 transition-all"
                    onClick={() => handleEdit(blog)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-400 to-red-600 text-white font-semibold shadow hover:from-red-500 hover:to-red-700 transition-all"
                    onClick={() => handleDelete(blog.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
