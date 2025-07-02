"use client";
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../../FIrebaseConfig";

// Render a single content block (matching BlogForm: handles table as array of objects)
function renderBlock(block, idx) {
  switch (block.type) {
    case "Heading":
      return (
        <h2 key={idx} style={{ fontSize: 28, fontWeight: 700, margin: "24px 0 12px", color: "#334155" }}>
          {block.text}
        </h2>
      );
    case "Subheading":
      return (
        <h3 key={idx} style={{ fontSize: 20, fontWeight: 600, margin: "14px 0 7px", color: "#2563eb" }}>
          {block.text}
        </h3>
      );
    case "Paragraph":
      return (
        <p key={idx} style={{ margin: "8px 0", fontSize: 17, color: "#0f172a" }}>
          {block.text}
        </p>
      );
    case "List":
      return (
        <ul key={idx} style={{ paddingLeft: 24, margin: "8px 0", fontSize: 17 }}>
          {block.items.filter(Boolean).map((item, i) => (
            <li key={i} style={{ marginBottom: 5, color: "#334155" }}>{item}</li>
          ))}
        </ul>
      );
    case "Table":
      // Table: {headers: [...], rows: [ {header:value,...}, ... ]}
      return (
        <table key={idx} style={{
          borderCollapse: "collapse", margin: "18px 0", width: "100%", background: "#f0f9ff"
        }}>
          <thead>
            <tr>
              {(block.headers || []).map((header, h) =>
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
            {(block.rows || []).map((row, r) =>
              <tr key={r}>
                {(block.headers || []).map((header, c) =>
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
      return block.url ? (
        <img
          key={idx}
          src={block.url}
          alt={block.alt}
          style={{ maxWidth: "100%", borderRadius: 10, boxShadow: "0 2px 14px #99f6e4", margin: "16px 0" }}
        />
      ) : null;
    case "Link":
      return (
        <a
          key={idx}
          href={block.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#0ea5e9",
            textDecoration: "underline",
            fontWeight: 500,
            fontSize: 17,
            margin: "8px 0",
            display: "inline-block"
          }}
        >
          {block.text}
        </a>
      );
    default:
      return null;
  }
}

export default function BlogList() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true);
      const q = query(collection(db, "blogs-testing"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBlogs(data);
      setLoading(false);
    }
    fetchBlogs();
  }, []);

  return (
    <div style={{ maxWidth: 850, margin: "0 auto", padding: 24 }}>
      <h1 style={{
        fontSize: 36,
        fontWeight: 800,
        background: "linear-gradient(90deg,#d946ef,#06b6d4,#3b82f6)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: 36,
        textAlign: "center"
      }}>
        Latest Blogs
      </h1>
      {loading ? (
        <div style={{ textAlign: "center", color: "#888" }}>Loading...</div>
      ) : blogs.length === 0 ? (
        <div style={{ textAlign: "center", color: "#888" }}>No blogs found.</div>
      ) : (
        blogs.map((blog) => (
          <div
            key={blog.id}
            style={{
              background: "#fff",
              borderRadius: 16,
              marginBottom: 32,
              boxShadow: "0 4px 32px #e0e7ff55",
              border: "1px solid #f5d0fe",
              padding: 24,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 16, gap: 20 }}>
              {blog.image && (
                <img
                  src={blog.image}
                  alt={blog.title}
                  style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 12, border: "2px solid #22d3ee" }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    fontSize: 22, fontWeight: 700, color: "#a21caf"
                  }}>{blog.title}</span>
                  {blog.trending && (
                    <span style={{
                      background: "#f0abfc", color: "#86198f",
                      fontWeight: 600, fontSize: 12,
                      borderRadius: 6, padding: "2px 10px", marginLeft: 8
                    }}>Trending</span>
                  )}
                </div>
                <div style={{ color: "#334155", fontSize: 15, marginTop: 2, marginBottom: 6 }}>
                  {blog.summary}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ background: "#f1f5f9", color: "#0891b2", borderRadius: 3, padding: "2px 7px" }}>
                    {blog.category}
                  </span>
                  <span style={{ color: "#888" }}>
                    {blog.date && blog.date.toDate
                      ? blog.date.toDate().toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </div>
            </div>
            {/* Render blog content blocks */}
            <div style={{
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              color: "#1e293b",
              maxWidth: 700,
              lineHeight: 1.7,
              margin: "0 auto"
            }}>
              {(blog.content || []).map(renderBlock)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}