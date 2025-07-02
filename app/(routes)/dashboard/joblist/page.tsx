"use client";
import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, orderBy, query } from "firebase/firestore";
import {db} from "../../../../FIrebaseConfig"
type Job = {
  id: string;
  title: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  postedAt?: any;
};

export default function AdminJobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "jobs"), orderBy("postedAt", "desc"));
      const snap = await getDocs(q);
      setJobs(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Job, "id">),
        }))
      );
    } catch (err) {
      setError("Failed to fetch jobs.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) return;
    try {
      await deleteDoc(doc(db, "jobs", id));
      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch (err) {
      alert("Failed to delete job.");
    }
  };

  return (
    <section className="p-10 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-cyan-500">Job Postings</h2>
      {loading && <div className="text-cyan-300">Loading jobs...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && jobs.length === 0 && (
        <div className="text-cyan-300">No jobs found.</div>
      )}
      <div className="space-y-5">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-[#202a44] rounded-xl p-6 border border-cyan-800 shadow flex flex-col gap-2"
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <span className="text-cyan-300 font-bold text-lg">{job.title}</span>
                <span className="ml-3 text-gray-400 text-sm">
                  ({job.type}) - {job.location}
                </span>
              </div>
              <button
                className="mt-2 md:mt-0 bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded"
                onClick={() => handleDelete(job.id)}
              >
                Delete
              </button>
            </div>
            <div className="text-gray-200">{job.description}</div>
            <ul className="list-disc pl-5 text-cyan-200 text-sm">
              {job.requirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
            <div className="text-xs text-gray-400 mt-2">
              Posted:{" "}
              {job.postedAt?.toDate
                ? job.postedAt.toDate().toLocaleString()
                : job.postedAt?.seconds
                ? new Date(job.postedAt.seconds * 1000).toLocaleString()
                : "N/A"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}