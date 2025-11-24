"use client";
import React, { useState, useEffect } from "react";
import {
  updateDoc,
  doc,
  getDoc,
  Timestamp,
  getDocs,
  query,
  orderBy,
  collection,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../../../FIrebaseConfig";
import { useRouter, useSearchParams } from "next/navigation";

// --- Helpers ---
const generateSlug = (title = "") =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const parseDateTimeToTimestamp = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);
  if (isNaN(date.getTime())) return null;
  return Timestamp.fromDate(date);
};

// --- Block initial states ---
const initialBlockStates = {
  Heading: { text: "" },
  Subheading: { text: "" },
  Paragraph: { text: "" },
  List: { items: [""] },
  Table: { headers: ["", ""], rows: [{ "": "", "": "" }] },
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

export default function EditBlog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blogId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    summary: "",
    trending: false,
    scheduledDate: "",
    scheduledTime: "",
  });

  const [contentBlocks, setContentBlocks] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [blockState, setBlockState] = useState({});
  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [blogData, setBlogData] = useState(null);
  
  // Editing states
  const [editingBlockIndex, setEditingBlockIndex] = useState(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Clear insert state function
  const clearInsertState = () => {
    setInsertAfterIndex(null);
    setSelectedType("");
    setBlockState({});
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          name: user.displayName || "Employee",
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoryLoading(true);
      try {
        const q = query(collection(db, "blogCategories"), orderBy("name", "asc"));
        const snap = await getDocs(q);
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(list);
      } catch (err) {
        console.error("Error loading categories", err);
      } finally {
        setCategoryLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Load blog data for editing
  useEffect(() => {
    if (!blogId) {
      setMsg("❌ No blog ID provided");
      return;
    }

    const loadBlog = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "blogs-internal", blogId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setBlogData({ id: snap.id, ...data });
          
          // Populate form with existing data
          setForm({
            title: data.title || "",
            summary: data.summary || "",
            trending: !!data.trending,
            scheduledDate: data.scheduledAt
              ? data.scheduledAt.toDate().toISOString().split("T")[0]
              : "",
            scheduledTime: data.scheduledAt
              ? data.scheduledAt.toDate().toISOString().split("T")[1].substr(0,5)
              : "",
          });
          
          setSelectedCategoryId(data.categoryId || "");
          setContentBlocks(data.contentBlocks || []);
          
          if (data.mainImageUrl) {
            setMainImagePreview(data.mainImageUrl);
          }
        } else {
          setMsg("❌ Blog not found");
        }
      } catch (err) {
        console.error(err);
        setMsg("❌ Error loading blog: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadBlog();
  }, [blogId]);

  // Generic form change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    setMainImage(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMainImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setMainImagePreview("");
    }
  };

  const handleBlockChange = (field, value) => {
    setBlockState((prev) => ({ ...prev, [field]: value }));
  };

  // List logic
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

  // Table logic
  const setTableHeaderCount = (count) => {
    count = Math.max(1, +count || 1);
    let headers = Array.from(
      { length: count },
      (_, i) => blockState.headers?.[i] || ""
    );
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
      rows: rows.length
        ? rows
        : [Object.fromEntries(headers.map((h, idx) => [h || `Col${idx + 1}`, ""]))],
    }));
  };

  const setTableRowCount = (count) => {
    count = Math.max(1, +count || 1);
    let headers = blockState.headers || ["", ""];
    let rows = Array.from({ length: count }, (_, i) =>
      blockState.rows?.[i]
        ? {
            ...Object.fromEntries(
              headers.map((h, j) => [
                h || `Col${j + 1}`,
                blockState.rows[i][h] || "",
              ])
            ),
          }
        : Object.fromEntries(
            headers.map((h, j) => [h || `Col${j + 1}`, ""])
          )
    );
    setBlockState((prev) => ({
      ...prev,
      rows,
    }));
  };

  const updateTableHeader = (i, val) => {
    let headers = (blockState.headers || []).map((h, idx) =>
      idx === i ? val : h
    );
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
        ri === r ? { ...row, [header]: val } : row
      ),
    }));

  // Image block
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

  // Add block at specific position
  const addBlockAtPosition = async (insertIndex = null) => {
    if (!selectedType) return;
    let block = { ...blockState, type: selectedType };

    if (selectedType === "Table") {
      block = {
        type: "Table",
        headers: blockState.headers || [],
        rows: blockState.rows || [],
      };
    }

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

    if (insertIndex !== null) {
      // Insert at specific position
      setContentBlocks((prev) => {
        const newBlocks = [...prev];
        newBlocks.splice(insertIndex + 1, 0, block);
        return newBlocks;
      });
    } else {
      // Add to end
      setContentBlocks((prev) => [...prev, block]);
    }
    
    // Clear all states
    clearInsertState();
  };

  const removeBlock = (idx) =>
    setContentBlocks((prev) => prev.filter((_, i) => i !== idx));

  // Edit existing block
  const startEditingBlock = (index) => {
    const block = contentBlocks[index];
    setEditingBlockIndex(index);
    setBlockState({ ...block });
    setSelectedType(block.type);
  };

  const saveEditedBlock = async () => {
    if (editingBlockIndex === null || !selectedType) return;
    
    let block = { ...blockState, type: selectedType };

    if (selectedType === "Table") {
      block = {
        type: "Table",
        headers: blockState.headers || [],
        rows: blockState.rows || [],
      };
    }

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

    setContentBlocks((prev) =>
      prev.map((b, i) => (i === editingBlockIndex ? block : b))
    );
    
    setEditingBlockIndex(null);
    setSelectedType("");
    setBlockState({});
  };

  const cancelEditing = () => {
    setEditingBlockIndex(null);
    clearInsertState();
  };

  // Insert after handler
  const handleInsertAfter = (index) => {
    setInsertAfterIndex(index);
    setSelectedType("");
    setBlockState({});
    setEditingBlockIndex(null);
  };

  // Move blocks
  const moveBlockUp = (index) => {
    if (index <= 0) return;
    setContentBlocks((prev) => {
      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  };

  const moveBlockDown = (index) => {
    if (index >= contentBlocks.length - 1) return;
    setContentBlocks((prev) => {
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  };

  // Drag and drop
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setContentBlocks((prev) => {
        const newBlocks = [...prev];
        const [movedBlock] = newBlocks.splice(dragIndex, 1);
        newBlocks.splice(dragOverIndex, 0, movedBlock);
        return newBlocks;
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setCreatingCategory(true);
      const docRef = await addDoc(collection(db, "blogCategories"), {
        name: newCategoryName.trim(),
        createdAt: Timestamp.now(),
      });
      const newCat = { id: docRef.id, name: newCategoryName.trim() };
      setCategories((prev) =>
        [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedCategoryId(docRef.id);
      setNewCategoryName("");
      setMsg("✅ Category created");
    } catch (err) {
      console.error(err);
      setMsg("❌ Error creating category: " + err.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleUpdateBlog = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      if (!blogId) {
        setMsg("❌ No blog ID found");
        setLoading(false);
        return;
      }

      if (!selectedCategoryId) {
        setMsg("❌ Please select a category");
        setLoading(false);
        return;
      }

      if (!contentBlocks.length) {
        setMsg("❌ Please add at least one content block");
        setLoading(false);
        return;
      }

      let mainImageUrl = mainImagePreview;
      if (mainImage) {
        const imgRef = ref(
          storage,
          `blog-main-images/${Date.now()}_${mainImage.name}`
        );
        await uploadBytes(imgRef, mainImage);
        mainImageUrl = await getDownloadURL(imgRef);
      }

      const now = Timestamp.now();
      const slug = generateSlug(form.title);

      let status = blogData?.status || "draft";
      let scheduledAt = blogData?.scheduledAt || null;
      
      // Update scheduling if changed
      if (form.scheduledDate && form.scheduledTime) {
        scheduledAt = parseDateTimeToTimestamp(
          form.scheduledDate,
          form.scheduledTime
        );
        status = "scheduled";
      } else if (blogData?.status === "scheduled") {
        // If removing schedule, revert to draft
        status = "draft";
        scheduledAt = null;
      }

      const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

      const updateData = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        categoryId: selectedCategoryId,
        categoryName: selectedCategory?.name || null,
        trending: form.trending,
        status,
        scheduledAt,
        updatedAt: now,
        slug,
        mainImageUrl: mainImageUrl || blogData?.mainImageUrl || "",
        contentBlocks,
      };

      await updateDoc(doc(db, "blogs-internal", blogId), updateData);
      setMsg("✅ Blog updated successfully!");

      // Redirect after successful update
      setTimeout(() => {
        router.push("/dashboard/posted-blogs");
      }, 1500);
    } catch (err) {
      console.error(err);
      setMsg("❌ Error updating blog: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/posted-blogs");
  };

  // Render preview blocks
  const renderBlock = (block, idx) => {
    switch (block.type) {
      case "Heading":
        return (
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {block.text}
          </h2>
        );
      case "Subheading":
        return (
          <h3 className="text-2xl font-semibold text-gray-700 mb-3">
            {block.text}
          </h3>
        );
      case "Paragraph":
        return (
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            {block.text}
          </p>
        );
      case "List":
        return (
          <ul className="list-disc pl-6 space-y-2 mb-4">
            {block.items
              ?.filter(Boolean)
              .map((item, i) => (
                <li key={i} className="text-gray-600">
                  {item}
                </li>
              ))}
          </ul>
        );
      case "Table":
        return (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  {block.headers?.map((header, h) => (
                    <th
                      key={h}
                      className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows?.map((row, r) => (
                  <tr key={r}>
                    {block.headers?.map((header, c) => (
                      <td
                        key={c}
                        className="border border-gray-300 px-4 py-2"
                      >
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "Image":
        return block.url ? (
          <div className="mb-4">
            <img
              src={block.url}
              alt={block.alt}
              className="max-w-full h-auto rounded-lg shadow-md"
            />
            {block.alt && (
              <p className="text-sm text-gray-500 mt-2 text-center">{block.alt}</p>
            )}
          </div>
        ) : null;
      case "Link":
        return (
          <a
            href={block.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline inline-block mb-4"
          >
            {block.text}
          </a>
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
              className="block w-full p-3 border border-gray-300 rounded-lg mb-3"
              type="text"
              placeholder={`Enter ${selectedType.toLowerCase()}...`}
              value={blockState.text || ""}
              onChange={(e) => handleBlockChange("text", e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              {editingBlockIndex !== null ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={saveEditedBlock}
                    disabled={!blockState.text?.trim()}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  onClick={() => addBlockAtPosition(insertAfterIndex)}
                  disabled={!blockState.text?.trim()}
                >
                  {insertAfterIndex !== null ? 'Insert Block' : 'Add Block'}
                </button>
              )}
            </div>
          </>
        );
      case "Paragraph":
        return (
          <>
            <textarea
              className="block w-full p-3 border border-gray-300 rounded-lg mb-3"
              placeholder="Enter paragraph text..."
              rows={4}
              value={blockState.text || ""}
              onChange={(e) => handleBlockChange("text", e.target.value)}
            />
            <div className="flex gap-2">
              {editingBlockIndex !== null ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={saveEditedBlock}
                    disabled={!blockState.text?.trim()}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  onClick={() => addBlockAtPosition(insertAfterIndex)}
                  disabled={!blockState.text?.trim()}
                >
                  {insertAfterIndex !== null ? 'Insert Block' : 'Add Block'}
                </button>
              )}
            </div>
          </>
        );
      case "List":
        return (
          <>
            {blockState.items?.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="flex-1 p-2 border border-gray-300 rounded-lg"
                  type="text"
                  placeholder={`List item #${i + 1}`}
                  value={item}
                  onChange={(e) => updateListItem(i, e.target.value)}
                />
                <button
                  type="button"
                  className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded"
                  onClick={() => removeListItem(i)}
                  disabled={blockState.items.length <= 1}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="px-3 py-2 bg-purple-500 text-white rounded-lg"
                onClick={addListItem}
              >
                Add Item
              </button>
              {editingBlockIndex !== null ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={saveEditedBlock}
                    disabled={!blockState.items?.some((it) => it.trim())}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  onClick={() => addBlockAtPosition(insertAfterIndex)}
                  disabled={!blockState.items?.some((it) => it.trim())}
                >
                  {insertAfterIndex !== null ? 'Insert List' : 'Add List'}
                </button>
              )}
            </div>
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
                  onChange={(e) => setTableHeaderCount(e.target.value)}
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
                  onChange={(e) => setTableRowCount(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse w-full mb-3">
                <thead>
                  <tr>
                    {(blockState.headers || []).map((header, h) => (
                      <th key={h}>
                        <input
                          className="p-2 border border-blue-300 rounded w-28 mb-2 font-bold bg-blue-50"
                          type="text"
                          placeholder={`Header ${h + 1}`}
                          value={header}
                          onChange={(e) =>
                            updateTableHeader(h, e.target.value)
                          }
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(blockState.rows || []).map((row, r) => (
                    <tr key={r}>
                      {(blockState.headers || []).map((header, c) => (
                        <td key={c}>
                          <input
                            className="p-2 border border-blue-300 rounded w-28 mb-2"
                            type="text"
                            placeholder={`Row ${r + 1}, Col ${c + 1}`}
                            value={row[header] || ""}
                            onChange={(e) =>
                              updateTableCell(r, header, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              {editingBlockIndex !== null ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={saveEditedBlock}
                    disabled={
                      !blockState.headers?.some((it) => it.trim()) ||
                      !blockState.rows?.some((row) =>
                        Object.values(row).some((val) => val.trim())
                      )
                    }
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  onClick={() => addBlockAtPosition(insertAfterIndex)}
                  disabled={
                    !blockState.headers?.some((it) => it.trim()) ||
                    !blockState.rows?.some((row) =>
                      Object.values(row).some((val) => val.trim())
                    )
                  }
                >
                  {insertAfterIndex !== null ? 'Insert Table' : 'Add Table'}
                </button>
              )}
            </div>
          </>
        );
      case "Image":
        return (
          <>
            <div className="flex gap-6 mb-3">
              <button
                type="button"
                className={`px-3 py-2 rounded ${
                  blockState.mode !== "url"
                    ? "bg-fuchsia-500 text-white"
                    : "bg-fuchsia-100 text-fuchsia-600"
                }`}
                onClick={() =>
                  setBlockState({ ...initialBlockStates.Image, mode: "upload" })
                }
              >
                Upload
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded ${
                  blockState.mode === "url"
                    ? "bg-fuchsia-500 text-white"
                    : "bg-fuchsia-100 text-fuchsia-600"
                }`}
                onClick={() =>
                  setBlockState({ ...initialBlockStates.Image, mode: "url" })
                }
              >
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
                  <img
                    src={blockState.preview}
                    alt="Preview"
                    className="mb-2 rounded shadow max-h-48"
                  />
                )}
              </>
            ) : (
              <>
                <input
                  className="block w-full p-2 mb-2 border border-blue-200 rounded-lg"
                  type="text"
                  placeholder="Paste image URL"
                  value={blockState.url || ""}
                  onChange={(e) =>
                    setBlockState((prev) => ({
                      ...prev,
                      url: e.target.value,
                      preview: e.target.value,
                    }))
                  }
                />
                {blockState.url && (
                  <img
                    src={blockState.url}
                    alt="Preview"
                    className="mb-2 rounded shadow max-h-48"
                  />
                )}
              </>
            )}
            <input
              className="block w-full p-2 mb-3 border border-blue-200 rounded-lg"
              type="text"
              placeholder="Alt text"
              value={blockState.alt || ""}
              onChange={(e) =>
                setBlockState((prev) => ({ ...prev, alt: e.target.value }))
              }
            />
            <div className="flex gap-2">
              {editingBlockIndex !== null ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={saveEditedBlock}
                    disabled={
                      blockState.mode === "url"
                        ? !blockState.url
                        : !blockState.file || blockState.uploading
                    }
                  >
                    {blockState.uploading ? "Uploading..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  onClick={() => addBlockAtPosition(insertAfterIndex)}
                  disabled={
                    blockState.mode === "url"
                      ? !blockState.url
                      : !blockState.file || blockState.uploading
                  }
                >
                  {blockState.uploading 
                    ? "Uploading..." 
                    : insertAfterIndex !== null ? 'Insert Image' : 'Add Image'
                  }
                </button>
              )}
            </div>
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
              onChange={(e) => handleBlockChange("text", e.target.value)}
            />
            <input
              className="block w-full p-2 mb-3 border border-blue-200 rounded-lg"
              type="text"
              placeholder="URL"
              value={blockState.href || ""}
              onChange={(e) => handleBlockChange("href", e.target.value)}
            />
            <div className="flex gap-2">
              {editingBlockIndex !== null ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={saveEditedBlock}
                    disabled={!blockState.text?.trim() || !blockState.href?.trim()}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  onClick={() => addBlockAtPosition(insertAfterIndex)}
                  disabled={!blockState.text?.trim() || !blockState.href?.trim()}
                >
                  {insertAfterIndex !== null ? 'Insert Link' : 'Add Link'}
                </button>
              )}
            </div>
          </>
        );
      default:
        return (
          <div className="flex gap-2">
            {editingBlockIndex !== null ? (
              <>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg"
                  onClick={saveEditedBlock}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                onClick={() => addBlockAtPosition(insertAfterIndex)}
              >
                {insertAfterIndex !== null ? 'Insert Block' : 'Add Block'}
              </button>
            )}
          </div>
        );
    }
  };

  if (loading && !blogData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading blog data...</p>
        </div>
      </div>
    );
  }

  if (!blogId || !blogData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Blog Not Found</h1>
          <p className="text-gray-600 mb-6">The blog you're trying to edit doesn't exist or you don't have permission to access it.</p>
          <button
            onClick={() => router.push("/dashboard/posted-blogs")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Posted Blogs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-cyan-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-fuchsia-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-fuchsia-500 to-blue-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Edit Blog Post</h1>
                <p className="text-fuchsia-100 mt-2">Editing: {blogData.title}</p>
              </div>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          <form onSubmit={handleUpdateBlog} className="p-8" autoComplete="off">
            {msg && (
              <div
                className={`mb-6 text-center font-semibold px-4 py-3 rounded-lg shadow-sm ${
                  msg.startsWith("✅")
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                }`}
              >
                {msg}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Title */}
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Enter blog title"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent outline-none transition-all text-black font-medium"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Slug: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{generateSlug(form.title)}</span>
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Category</label>
                  {categoryLoading ? (
                    <div className="text-sm text-gray-500">Loading categories...</div>
                  ) : (
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent outline-none text-black font-medium"
                      value={selectedCategoryId || ""}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Summary</label>
                <textarea
                  name="summary"
                  placeholder="Write a short summary"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all text-black font-medium resize-none"
                  rows={3}
                  value={form.summary}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trending */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="trending"
                    checked={form.trending}
                    onChange={handleChange}
                    id="trending"
                    className="w-5 h-5 accent-fuchsia-500"
                  />
                  <label htmlFor="trending" className="font-semibold text-gray-700">
                    Mark as Trending
                  </label>
                </div>

                {/* Scheduling */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block mb-2 font-semibold text-gray-700">Schedule Publishing</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      name="scheduledDate"
                      value={form.scheduledDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-400 outline-none text-black text-sm"
                    />
                    <input
                      type="time"
                      name="scheduledTime"
                      value={form.scheduledTime}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-400 outline-none text-black text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Blog Content Builder */}
              <div className="border-t pt-6">
                <label className="block mb-3 font-semibold text-gray-700 text-lg">Blog Content</label>
                
                {/* Block Type Selection */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <label className="block mb-2 font-semibold text-blue-900">Add New Content Block</label>
                  <div className="flex gap-2 flex-wrap">
                    {BLOCK_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`px-4 py-2 rounded-lg border font-semibold text-sm transition-colors ${
                          selectedType === type
                            ? "bg-blue-500 text-white border-blue-600 shadow-md"
                            : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50 hover:border-blue-400"
                        }`}
                        onClick={() => {
                          setSelectedType(type);
                          setBlockState(initialBlockStates[type]);
                          setEditingBlockIndex(null);
                          // Don't clear insertAfterIndex here - we want to keep it for positioning
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Block Input */}
                {(selectedType && !editingBlockIndex) || insertAfterIndex !== null ? (
                  <div className="p-6 border-2 border-dashed border-blue-200 rounded-xl mb-6 bg-blue-50">
                    <div className="mb-4 font-semibold text-blue-900 text-lg flex items-center justify-between">
                      <span>
                        {insertAfterIndex !== null 
                          ? `Insert ${selectedType} After Block ${insertAfterIndex + 1}` 
                          : `Add New ${selectedType} Block`
                        }
                      </span>
                      {(insertAfterIndex !== null || selectedType) && (
                        <button
                          type="button"
                          onClick={clearInsertState}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          Cancel Insert
                        </button>
                      )}
                    </div>
                    {blockInput()}
                  </div>
                ) : null}

                {/* Content Blocks with Editing */}
                <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-inner">
                  <div className="font-semibold mb-4 text-gray-800 text-lg border-b pb-2">
                    Content Blocks ({contentBlocks.length} blocks)
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      Drag to reorder • Click to edit • Use buttons to move
                    </span>
                  </div>
                  
                  {contentBlocks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-6xl mb-4">📝</div>
                      <p>No content blocks yet. Add some content above!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contentBlocks.map((block, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`relative group border-l-4 ${
                            dragOverIndex === index ? 'border-yellow-400 bg-yellow-50' : 
                            dragIndex === index ? 'border-blue-400 bg-blue-50' : 
                            'border-blue-500'
                          } pl-4 bg-blue-50/30 rounded-r-lg p-4 transition-all ${
                            dragOverIndex === index ? 'scale-105' : ''
                          }`}
                        >
                          {/* Block Controls */}
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => startEditingBlock(index)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                              title="Edit this block"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlockUp(index)}
                              disabled={index === 0}
                              className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 disabled:opacity-50"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlockDown(index)}
                              disabled={index === contentBlocks.length - 1}
                              className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 disabled:opacity-50"
                              title="Move down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertAfter(index)}
                              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200"
                              title="Insert after this block"
                            >
                              Insert +
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(index)}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                              title="Remove this block"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Block Number */}
                          <div className="absolute left-0 top-4 -ml-2 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                            {index + 1}
                          </div>

                          {/* Block Content */}
                          {editingBlockIndex === index ? (
                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div className="mb-2 font-semibold text-yellow-800">
                                Editing {block.type} Block
                              </div>
                              {blockInput()}
                            </div>
                          ) : (
                            <div className="pr-20">
                              <div className="text-sm text-gray-500 mb-2 font-mono">
                                {block.type}
                              </div>
                              {renderBlock(block, index)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Blog Image */}
              <div className="border-t pt-6">
                <label className="block mb-3 font-semibold text-gray-700 text-lg">Blog Image</label>
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="block w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {mainImagePreview && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">New Image Preview:</p>
                      <img
                        src={mainImagePreview}
                        alt="Blog preview"
                        className="rounded-lg shadow-md max-h-64 mx-auto"
                      />
                    </div>
                  )}
                  {blogData.mainImageUrl && !mainImagePreview && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Current Image:</p>
                      <img
                        src={blogData.mainImageUrl}
                        alt="Current blog"
                        className="rounded-lg shadow-md max-h-64 mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-blue-500 hover:from-blue-600 hover:to-fuchsia-600 text-white font-semibold transition-all shadow-lg disabled:opacity-60 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin mr-2"
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
                      Updating...
                    </>
                  ) : (
                    "Update Blog"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}