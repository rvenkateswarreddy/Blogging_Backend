"use client";
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  limit,
  startAfter,
  getDocs,
  where,
} from "firebase/firestore";
import { auth, db } from "../../../../FIrebaseConfig";
import { useRouter } from "next/navigation";

export default function BlogManager() {
  const [blogs, setBlogs] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, id: null });
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const pageLimit = 8;

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  // Load first page
  const loadBlogs = async () => {
    const q = query(collection(db, "blogs-internal"), orderBy("createdAt", "desc"), limit(pageLimit));
    const docs = await getDocs(q);

    setBlogs(docs.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLastDoc(docs.docs[docs.docs.length - 1]);
  };

  // Next page
  const loadMore = async () => {
    if (!lastDoc) return;

    const q = query(
      collection(db, "blogs-internal"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(pageLimit)
    );

    const docs = await getDocs(q);

    setBlogs((prev) => [...prev, ...docs.docs.map((d) => ({ id: d.id, ...d.data() }))]);
    setLastDoc(docs.docs[docs.docs.length - 1]);
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // Publish Overdue Scheduled Posts
 const handlePublishOverdueScheduled = async () => {
  setLoading(true);
  try {
    const now = Timestamp.now();
    
    // Get ALL scheduled posts from the database (not just filtered ones)
    const scheduledQuery = query(
      collection(db, "blogs-internal"),
      where("status", "==", "scheduled")
    );
    
    const snap = await getDocs(scheduledQuery);
    
    // Filter for overdue posts on the client side
    const overduePosts = snap.docs.filter(doc => {
      const data = doc.data();
      return data.scheduledAt && data.scheduledAt.toDate() <= new Date();
    });
    
    if (overduePosts.length === 0) {
      setMsg("✅ No overdue scheduled posts found");
      setLoading(false);
      return;
    }

    const publishPromises = overduePosts.map(doc => 
      updateDoc(doc.ref, {
        status: "published",
        isPublished: true,
        publishedAt: now,
      })
    );
    
    await Promise.all(publishPromises);
    setMsg(`✅ Published ${overduePosts.length} overdue scheduled posts`);
    loadBlogs(); // Refresh the list
    
  } catch (err) {
    console.error("Error publishing overdue posts:", err);
    setMsg("❌ Error publishing overdue posts");
  } finally {
    setLoading(false);
  }
};

  // SEARCH filter
  const searchedBlogs = blogs.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.summary.toLowerCase().includes(search.toLowerCase())
  );

  // Filter logic
  const finalBlogs = searchedBlogs.filter((b) => {
    if (filter === "draft") return b.status === "draft";
    if (filter === "scheduled") return b.status === "scheduled";
    if (filter === "published") return b.status === "published";
    if (filter === "mine") return b.author?.uid === currentUser?.uid;
    return true;
  });

  const bg = (status) =>
    status === "published"
      ? "bg-green-100 text-green-700"
      : status === "scheduled"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "Not scheduled";
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if scheduled time has passed
  const isOverdue = (scheduledAt) => {
    if (!scheduledAt) return false;
    return scheduledAt.toDate() <= new Date();
  };

  const handlePublish = async (id) => {
    await updateDoc(doc(db, "blogs-internal", id), {
      status: "published",
      isPublished: true,
      publishedAt: Timestamp.now(),
    });
    setMsg("🚀 Blog Published!");
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, "blogs-internal", id));
    setMsg("🗑 Blog deleted.");
  };

  const applyReschedule = async () => {
    const [y, m, d] = newDate.split("-").map(Number);
    const [hh, mm] = newTime.split(":").map(Number);
    const scheduleTS = Timestamp.fromDate(new Date(y, m - 1, d, hh, mm));

    await updateDoc(doc(db, "blogs-internal", rescheduleModal.id), {
      status: "scheduled",
      scheduledAt: scheduleTS,
    });

    setRescheduleModal({ open: false, id: null });
    setMsg("📅 Rescheduled Successfully");
    loadBlogs(); // Refresh the list
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-500 to-fuchsia-500 bg-clip-text text-transparent">
        Blog Manager Dashboard
      </h2>

      {msg && (
        <div className={`mb-4 text-center px-3 py-2 rounded ${
          msg.includes("✅") || msg.includes("🚀") || msg.includes("📅") 
            ? "bg-green-100 text-green-800" 
            : "bg-blue-100 text-blue-800"
        }`}>
          {msg}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        className="w-full p-3 mb-5 rounded border shadow"
        placeholder="Search blogs by title or summary..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {["all", "draft", "scheduled", "published", "mine"].map((f) => (
          <button
            key={f}
            className={`px-4 py-2 rounded border font-medium ${
              filter === f ? "bg-blue-500 text-white" : "bg-white text-blue-600 border-blue-300"
            }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        
        {/* Publish Overdue Button */}
        <button
          onClick={handlePublishOverdueScheduled}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 font-medium"
        >
          {loading ? "Publishing..." : "Publish Overdue"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 font-semibold">
            <tr>
              <th className="p-4 border text-left">Title</th>
              <th className="p-4 border text-left">Author</th>
              <th className="p-4 border text-left">Status</th>
              <th className="p-4 border text-left">Scheduled Time</th>
              <th className="p-4 border text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {finalBlogs.map((b) => (
              <tr key={b.id} className="border hover:bg-gray-50">
                <td className="p-4 border max-w-xs">
                  <div className="font-medium text-gray-900">{b.title}</div>
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">{b.summary}</div>
                </td>
                
                <td className="p-4 border">
                  <div className="text-sm">{b.author?.name || "Unknown"}</div>
                  <div className="text-xs text-gray-500">{b.author?.email}</div>
                </td>
                
                <td className="p-4 border">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${bg(b.status)}`}>
                    {b.status}
                  </span>
                  {b.status === "scheduled" && isOverdue(b.scheduledAt) && (
                    <div className="text-xs text-red-600 font-medium mt-1">⏰ OVERDUE</div>
                  )}
                </td>

                <td className="p-4 border">
                  {b.scheduledAt ? (
                    <div className={`text-sm ${isOverdue(b.scheduledAt) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {formatDate(b.scheduledAt)}
                      {isOverdue(b.scheduledAt) && (
                        <div className="text-xs text-red-500 mt-1">Scheduled time has passed</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not scheduled</span>
                  )}
                </td>

                <td className="p-4 border">
                  <div className="flex flex-wrap gap-2">
                    {/* Edit */}
                    <button
                      onClick={() => router.push(`/dashboard/edit-blog?id=${b.id}`)}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                    >
                      Edit
                    </button>

                    {/* View */}
                    <button
                      onClick={() => router.push(`/dashboard/blog-view?id=${b.id}`)}
                      className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm"
                    >
                      View
                    </button>

                    {/* Publish */}
                    {b.status !== "published" && (
                      <button
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        onClick={() => handlePublish(b.id)}
                      >
                        Publish Now
                      </button>
                    )}

                    {/* Reschedule */}
                    {b.status === "scheduled" && (
                      <button
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        onClick={() => {
                          const date = b.scheduledAt?.toDate();
                          setNewDate(date ? date.toISOString().split('T')[0] : '');
                          setNewTime(date ? date.toTimeString().substr(0,5) : '');
                          setRescheduleModal({ open: true, id: b.id });
                        }}
                      >
                        Reschedule
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      onClick={() => handleDelete(b.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!finalBlogs.length && (
              <tr>
                <td className="p-8 text-center text-gray-500" colSpan={5}>
                  No blogs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-6">
        {lastDoc && (
          <button
            className="px-6 py-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-lg shadow font-medium"
            onClick={loadMore}
          >
            Load More Blogs
          </button>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Reschedule Blog</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
                <input 
                  type="time" 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium"
                onClick={applyReschedule}
              >
                Save Schedule
              </button>
              <button 
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded font-medium"
                onClick={() => setRescheduleModal({ open: false, id: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}