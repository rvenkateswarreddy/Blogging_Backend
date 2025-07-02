"use client";
import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../FIrebaseConfig"; // adjust path as needed

type Job = {
  title: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  postedAt?: any;
};

export default function JobPostForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState<Omit<Job, "postedAt">>({
    title: "",
    location: "",
    type: "",
    description: "",
    requirements: [],
  });
  const [requirementInput, setRequirementInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddRequirement = () => {
    if (requirementInput.trim()) {
      setForm((prev) => ({
        ...prev,
        requirements: [...prev.requirements, requirementInput.trim()],
      }));
      setRequirementInput("");
    }
  };

  const handleRemoveRequirement = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const { title, location, type, description, requirements } = form;
    if (!title || !location || !type || !description || requirements.length === 0) {
      setError("Please fill all fields and add at least one requirement.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "jobs"), {
        ...form,
        postedAt: serverTimestamp(),
      });
      setSuccess(true);
      setForm({
        title: "",
        location: "",
        type: "",
        description: "",
        requirements: [],
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError("Failed to post job. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="bg-[#18223a] rounded-xl p-8 max-w-2xl mx-auto border-2 border-cyan-700 shadow-2xl space-y-6"
      onSubmit={handleSubmit}
    >
      <h2 className="text-2xl font-bold text-cyan-400 mb-3">Post a New Job</h2>
      <div>
        <label className="block text-gray-200 mb-1">Job Title</label>
        <input
          name="title"
          className="w-full p-2 rounded bg-[#202a44] text-white border border-cyan-600"
          value={form.title}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label className="block text-gray-200 mb-1">Location</label>
        <input
          name="location"
          className="w-full p-2 rounded bg-[#202a44] text-white border border-cyan-600"
          value={form.location}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label className="block text-gray-200 mb-1">Job Type</label>
        <input
          name="type"
          className="w-full p-2 rounded bg-[#202a44] text-white border border-cyan-600"
          value={form.type}
          onChange={handleChange}
          placeholder="Full-time / Part-time / Contract / Internship"
          required
        />
      </div>
      <div>
        <label className="block text-gray-200 mb-1">Job Description</label>
        <textarea
          name="description"
          className="w-full p-2 rounded bg-[#202a44] text-white border border-cyan-600"
          value={form.description}
          onChange={handleChange}
          rows={3}
          required
        />
      </div>
      <div>
        <label className="block text-gray-200 mb-1">Requirements</label>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 p-2 rounded bg-[#202a44] text-white border border-cyan-600"
            value={requirementInput}
            onChange={(e) => setRequirementInput(e.target.value)}
            placeholder="Add a requirement"
          />
          <button
            type="button"
            className="bg-cyan-600 hover:bg-cyan-700 text-white rounded px-3"
            onClick={handleAddRequirement}
          >
            Add
          </button>
        </div>
        <ul className="list-disc pl-5 text-cyan-200 space-y-1">
          {form.requirements.map((req, idx) => (
            <li key={idx} className="flex items-center gap-2">
              {req}
              <button
                type="button"
                className="text-red-400 px-2"
                onClick={() => handleRemoveRequirement(idx)}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {success && <div className="text-green-400">Job posted successfully!</div>}
      <button
        type="submit"
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded"
        disabled={loading}
      >
        {loading ? "Posting..." : "Post Job"}
      </button>
    </form>
  );
}