"use client";
import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../FIrebaseConfig";

const initialBlockStates = {
  Heading: { text: "" },
  Subheading: { text: "" },
  Paragraph: { text: "" },
  List: { items: [""] },
  Table: { headers: ["", ""], rows: [{ "": "", "": "" }] }, // rows as array of objects!
  Image: { mode: "upload", url: "", file: null, alt: "" },
  Link: { text: "", href: "" },
};

const BLOCK_TYPES = [
  "Heading",
  "Subheading",
  "Paragraph",
  "List",
  "Table",
  "Image",
  "Link",
];

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
  "Job Notifications",
  "Other",
];

export default function BlogForm() {
  const [form, setForm] = useState({
    title: "",
    summary: "",
    category: CATEGORIES[0],
    trending: false,
    date: "",
  });
  const [contentBlocks, setContentBlocks] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [blockState, setBlockState] = useState({});
  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Blog image
  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    setMainImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMainImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setMainImagePreview("");
    }
  };

  // Content block state
  const handleBlockChange = (field, value) => {
    setBlockState((prev) => ({ ...prev, [field]: value }));
  };

  // List block logic
  const addListItem = () =>
    setBlockState((prev) => ({
      ...prev,
      items: [...(prev.items || [""]), ""],
    }));
  const removeListItem = (idx) =>
    setBlockState((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  const updateListItem = (idx, val) =>
    setBlockState((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? val : item)),
    }));

  // Table block logic - array of objects
  const setTableHeaderCount = (count) => {
    count = Math.max(1, +count || 1);
    let headers = Array.from({ length: count }, (_, i) => blockState.headers?.[i] || "");
    let rows = (blockState.rows || []).map((row) => {
      let obj = {};
      headers.forEach((header, i) => {
        obj[header || `Col${i + 1}`] = row[header] || "";
      });
      return obj;
    });
    setBlockState((prev) => ({
      ...prev,
      headers,
      rows: rows.length ? rows : [Object.fromEntries(headers.map(h => [h || "Col1", ""]))],
    }));
  };

  const setTableRowCount = (count) => {
    count = Math.max(1, +count || 1);
    let headers = blockState.headers || ["", ""];
    let rows = Array.from({ length: count }, (_, i) =>
      blockState.rows?.[i]
        ? { ...Object.fromEntries(headers.map((h, j) => [h || `Col${j + 1}`, blockState.rows[i][h] || ""])) }
        : Object.fromEntries(headers.map((h, j) => [h || `Col${j + 1}`, ""]))
    );
    setBlockState((prev) => ({
      ...prev,
      rows,
    }));
  };

  const updateTableHeader = (i, val) => {
    let headers = blockState.headers.map((h, idx) => (idx === i ? val : h));
    let rows = (blockState.rows || []).map((row) => {
      let obj = {};
      headers.forEach((header, idx) => {
        obj[header || `Col${idx + 1}`] = row[blockState.headers[idx]] || "";
      });
      return obj;
    });
    setBlockState((prev) => ({
      ...prev,
      headers,
      rows,
    }));
  };

  const updateTableCell = (r, header, val) =>
    setBlockState((prev) => ({
      ...prev,
      rows: prev.rows.map((row, ri) =>
        ri === r
          ? { ...row, [header]: val }
          : row
      ),
    }));

  // Image block logic
  const handleBlockImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBlockState((prev) => ({
        ...prev,
        file,
        url: "",
        mode: "upload",
      }));
      const reader = new FileReader();
      reader.onloadend = () =>
        setBlockState((prev) => ({ ...prev, preview: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // Add block
  const addBlock = async () => {
    let block = { ...blockState, type: selectedType };

    // Table: Structure as {headers, rows: array of objects}
    if (selectedType === "Table") {
      block = {
        type: "Table",
        headers: blockState.headers,
        rows: blockState.rows,
      };
    }

    // Image: upload if needed
    if (selectedType === "Image" && block.mode === "upload" && block.file) {
      block.uploading = true;
      setBlockState({ ...block, uploading: true });
      const imgRef = ref(
        storage,
        `blog-block-images/${Date.now()}_${block.file.name}`
      );
      await uploadBytes(imgRef, block.file);
      const url = await getDownloadURL(imgRef);
      block.url = url;
      block.mode = "url";
      block.uploading = false;
      block.file = null;
      block.preview = "";
    }

    setContentBlocks((prev) => [...prev, block]);
    setSelectedType("");
    setBlockState({});
  };

  // Remove block
  const removeBlock = (idx) =>
    setContentBlocks((prev) => prev.filter((_, i) => i !== idx));

  // Submit blog
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      let imgUrl = "";
      if (mainImage) {
        const imgRef = ref(
          storage,
          `blog-images/${Date.now()}_${mainImage.name}`
        );
        await uploadBytes(imgRef, mainImage);
        imgUrl = await getDownloadURL(imgRef);
      }
      await addDoc(collection(db, "blogs-testing"), {
        ...form,
        image: imgUrl,
        content: contentBlocks,
        date: form.date
          ? Timestamp.fromDate(new Date(form.date))
          : Timestamp.now(),
      });
      setMsg("✅ Blog post added successfully!");
      setForm({
        title: "",
        summary: "",
        category: CATEGORIES[0],
        trending: false,
        date: "",
      });
      setMainImage(null);
      setMainImagePreview("");
      setContentBlocks([]);
    } catch (err) {
      setMsg("❌ Error: " + err.message);
    }
    setLoading(false);
  };

  // Render block
  const renderBlock = (block, idx) => {
    switch (block.type) {
      case "Heading":
        return (
          <h2 key={idx} style={{ fontSize: 32, fontWeight: 800, margin: "32px 0 14px", color: "#334155" }}>{block.text}</h2>
        );
      case "Subheading":
        return (
          <h3 key={idx} style={{ fontSize: 22, fontWeight: 600, margin: "18px 0 7px", color: "#2563eb" }}>{block.text}</h3>
        );
      case "Paragraph":
        return (
          <p key={idx} style={{ margin: "10px 0", fontSize: 18, color: "#0f172a" }}>{block.text}</p>
        );
      case "List":
        return (
          <ul key={idx} style={{ paddingLeft: 28, margin: "12px 0", fontSize: 17 }}>
            {block.items.filter(Boolean).map((item, i) => (
              <li key={i} style={{ marginBottom: 5, color: "#334155" }}>{item}</li>
            ))}
          </ul>
        );
      case "Table":
        return (
          <table key={idx} style={{
            borderCollapse: "collapse", margin: "18px 0", width: "100%", background: "#f0f9ff"
          }}>
            <thead>
              <tr>
                {block.headers.map((header, h) =>
                  <th key={h} style={{
                    padding: "8px 14px",
                    border: "1.5px solid #7dd3fc",
                    background: "#bae6fd",
                    color: "#0e7490",
                    fontWeight: 600,
                  }}>{header}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) =>
                <tr key={r}>
                  {block.headers.map((header, c) =>
                    <td key={c} style={{
                      padding: "8px 14px",
                      border: "1.5px solid #7dd3fc",
                      color: "#0e7490"
                    }}>{row[header]}</td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        );
      case "Image":
        return block.url
          ? <img key={idx} src={block.url} alt={block.alt} style={{ maxWidth: "100%", borderRadius: 10, boxShadow: "0 2px 14px #99f6e4", margin: "16px 0" }} />
          : null;
      case "Link":
        return (
          <a key={idx} href={block.href} target="_blank" rel="noopener noreferrer"
            style={{
              color: "#0ea5e9", textDecoration: "underline", fontWeight: 500, fontSize: 17, margin: "8px 0", display: "inline-block"
            }}>{block.text}</a>
        );
      default:
        return null;
    }
  };

  // Block input UI
  const blockInput = () => {
    switch (selectedType) {
      case "Heading":
      case "Subheading":
        return (
          <>
            <input
              className="block w-full p-2 mb-3 border border-blue-200 rounded-lg"
              type="text"
              placeholder={`Enter ${selectedType.toLowerCase()}...`}
              value={blockState.text || ""}
              onChange={e => handleBlockChange("text", e.target.value)}
              autoFocus
            />
            <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-lg" onClick={addBlock} disabled={!blockState.text?.trim()}>
              Add
            </button>
          </>
        );
      case "Paragraph":
        return (
          <>
            <textarea
              className="block w-full p-2 mb-3 border border-blue-200 rounded-lg"
              placeholder="Enter paragraph text..."
              rows={3}
              value={blockState.text || ""}
              onChange={e => handleBlockChange("text", e.target.value)}
            />
            <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-lg" onClick={addBlock} disabled={!blockState.text?.trim()}>
              Add
            </button>
          </>
        );
      case "List":
        return (
          <>
            {blockState.items && blockState.items.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="flex-1 p-2 border border-fuchsia-200 rounded-lg"
                  type="text"
                  placeholder={`List item #${i + 1}`}
                  value={item}
                  onChange={e => updateListItem(i, e.target.value)}
                />
                <button
                  type="button"
                  className="px-2 py-1 bg-red-100 text-red-800 font-bold rounded"
                  onClick={() => removeListItem(i)}
                  disabled={blockState.items.length <= 1}
                  title="Remove"
                >-</button>
              </div>
            ))}
            <button type="button" className="px-3 py-2 bg-fuchsia-500 text-white rounded-lg" onClick={addListItem}>
              Add Item
            </button>
            <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-lg ml-2" onClick={addBlock}
              disabled={!blockState.items?.some(it => it.trim())}>
              Add List
            </button>
          </>
        );
      case "Table":
        return (
          <>
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block mb-1 font-semibold">Columns</label>
                <input
                  className="p-2 border border-blue-200 rounded w-16"
                  type="number"
                  min={1}
                  max={10}
                  value={blockState.headers?.length || 2}
                  onChange={e => setTableHeaderCount(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">Rows</label>
                <input
                  className="p-2 border border-blue-200 rounded w-16"
                  type="number"
                  min={1}
                  max={10}
                  value={blockState.rows?.length || 1}
                  onChange={e => setTableRowCount(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse w-full mb-3">
                <thead>
                  <tr>
                    {(blockState.headers || []).map((header, h) =>
                      <th key={h}>
                        <input
                          className="p-2 border border-blue-300 rounded w-28 mb-2 font-bold bg-blue-50"
                          type="text"
                          placeholder={`Header ${h + 1}`}
                          value={header}
                          onChange={e => updateTableHeader(h, e.target.value)}
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(blockState.rows || []).map((row, r) =>
                    <tr key={r}>
                      {(blockState.headers || []).map((header, c) =>
                        <td key={c}>
                          <input
                            className="p-2 border border-blue-300 rounded w-28 mb-2"
                            type="text"
                            placeholder={`Row ${r + 1}, Col ${c + 1}`}
                            value={row[header] || ""}
                            onChange={e => updateTableCell(r, header, e.target.value)}
                          />
                        </td>
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-lg" onClick={addBlock}
              disabled={
                !(blockState.headers?.some(it => it.trim())) ||
                !(blockState.rows?.some(row => Object.values(row).some(val => val.trim())))
              }>
              Add Table
            </button>
          </>
        );
      case "Image":
        return (
          <>
            <div className="flex gap-6 mb-3">
              <button type="button"
                className={`px-3 py-2 rounded ${blockState.mode !== "url" ? "bg-fuchsia-500 text-white" : "bg-fuchsia-100 text-fuchsia-600"}`}
                onClick={() => setBlockState({ ...initialBlockStates.Image, mode: "upload" })}>
                Upload
              </button>
              <button type="button"
                className={`px-3 py-2 rounded ${blockState.mode === "url" ? "bg-fuchsia-500 text-white" : "bg-fuchsia-100 text-fuchsia-600"}`}
                onClick={() => setBlockState({ ...initialBlockStates.Image, mode: "url" })}>
                Image Link
              </button>
            </div>
            {blockState.mode !== "url" ? (
              <>
                <input
                  className="block mb-2"
                  type="file"
                  accept="image/*"
                  onChange={handleBlockImageChange}
                />
                {blockState.preview && (
                  <img src={blockState.preview} alt="Preview" className="mb-2 rounded shadow max-h-48" />
                )}
              </>
            ) : (
              <>
                <input
                  className="block w-full p-2 mb-2 border border-blue-200 rounded-lg"
                  type="text"
                  placeholder="Paste image URL"
                  value={blockState.url || ""}
                  onChange={e => setBlockState(prev => ({ ...prev, url: e.target.value, preview: e.target.value }))}
                />
                {blockState.url && (
                  <img src={blockState.url} alt="Preview" className="mb-2 rounded shadow max-h-48" />
                )}
              </>
            )}
            <input
              className="block w-full p-2 mb-3 border border-blue-200 rounded-lg"
              type="text"
              placeholder="Alt text"
              value={blockState.alt || ""}
              onChange={e => setBlockState(prev => ({ ...prev, alt: e.target.value }))}
            />
            <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={addBlock}
              disabled={blockState.mode === "url"
                ? !blockState.url
                : (!blockState.file || blockState.uploading)}>
              {blockState.uploading ? "Uploading..." : "Add Image"}
            </button>
          </>
        );
      case "Link":
        return (
          <>
            <input
              className="block w-full p-2 mb-2 border border-blue-200 rounded-lg"
              type="text"
              placeholder="Display text"
              value={blockState.text || ""}
              onChange={e => handleBlockChange("text", e.target.value)}
            />
            <input
              className="block w-full p-2 mb-3 border border-blue-200 rounded-lg"
              type="text"
              placeholder="URL"
              value={blockState.href || ""}
              onChange={e => handleBlockChange("href", e.target.value)}
            />
            <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={addBlock}
              disabled={!blockState.text?.trim() || !blockState.href?.trim()}
            >Add Link</button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form
      className="bg-gradient-to-br from-fuchsia-50 via-cyan-50 to-blue-50 text-black p-8 rounded-xl shadow-2xl border border-fuchsia-100 max-w-2xl mx-auto mb-12 mt-6"
      onSubmit={handleSubmit}
      style={{ fontFamily: "Inter, sans-serif" }}
      autoComplete="off"
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

        {/* Main fields */}
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

        {/* Blog Content Builder */}
        <div>
          <label className="block mb-1 font-semibold">Blog Content</label>
          <div className="flex gap-4 mb-3 flex-wrap">
            {BLOCK_TYPES.map(type => (
              <button
                key={type}
                type="button"
                className={`mb-2 px-3 py-1 rounded-lg border font-semibold text-sm 
                  ${selectedType === type ? "bg-blue-500 text-white border-blue-600"
                    : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
                onClick={() => {
                  setSelectedType(type);
                  setBlockState(initialBlockStates[type]);
                }}
              >{type}</button>
            ))}
          </div>
          {selectedType && (
            <div className="p-5 border border-blue-200 rounded-lg mb-4 bg-blue-50">
              <div className="mb-2 font-semibold text-blue-900 text-lg">{selectedType} Block</div>
              {blockInput()}
            </div>
          )}
          <div className="border border-blue-100 rounded-xl p-5 bg-white shadow mb-4">
            <div className="font-semibold mb-2 text-blue-800">Content Preview</div>
            {contentBlocks.length === 0
              ? <span className="text-gray-400">No content yet</span>
              : contentBlocks.map((b, i) =>
                <div key={i} className="relative group mb-5">
                  <span
                    className="absolute right-0 top-0 text-xs rounded bg-red-100 text-red-700 px-2 py-1 opacity-0 group-hover:opacity-100 cursor-pointer transition"
                    onClick={() => removeBlock(i)}>Remove</span>
                  {renderBlock(b, i)}
                </div>
              )}
          </div>
        </div>

        {/* Blog meta */}
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
            onChange={handleMainImageChange}
            className="file-input file-input-bordered w-full border-fuchsia-300 bg-white text-black"
            required
          />
          {mainImagePreview && (
            <img src={mainImagePreview} alt="Blog" className="mt-2 rounded shadow max-h-48" />
          )}
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