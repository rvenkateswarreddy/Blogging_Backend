"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../FIrebaseConfig";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function BlogView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const blogId = searchParams.get("id");
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!blogId) {
      setError("No blog ID provided");
      setLoading(false);
      return;
    }

    const loadBlog = async () => {
      try {
        setLoading(true);
        const blogDoc = await getDoc(doc(db, "blogs-internal", blogId));
        
        if (blogDoc.exists()) {
          const blogData = blogDoc.data();
          setBlog({ 
            id: blogDoc.id, 
            ...blogData,
            // Ensure dates are properly converted
            createdAt: blogData.createdAt?.toDate?.() || null,
            updatedAt: blogData.updatedAt?.toDate?.() || null,
            publishedAt: blogData.publishedAt?.toDate?.() || null,
            scheduledAt: blogData.scheduledAt?.toDate?.() || null,
          });
        } else {
          setError("Blog not found");
        }
      } catch (err) {
        console.error("Error loading blog:", err);
        setError("Failed to load blog");
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [blogId]);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "Not published";
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render content blocks with enhanced styling
  const renderBlock = (block, index) => {
    switch (block.type) {
      case "Heading":
        return (
          <h2 
            key={index} 
            className="text-3xl font-bold mt-8 mb-4 text-gray-800 border-l-4 border-blue-500 pl-4"
          >
            {block.text}
          </h2>
        );
      
      case "Subheading":
        return (
          <h3 
            key={index} 
            className="text-2xl font-semibold mt-6 mb-3 text-gray-700 border-l-4 border-green-500 pl-4"
          >
            {block.text}
          </h3>
        );
      
      case "Paragraph":
        return (
          <p 
            key={index} 
            className="mt-4 mb-4 text-lg leading-relaxed text-gray-600"
          >
            {block.text}
          </p>
        );
      
      case "List":
        return (
          <ul 
            key={index} 
            className="list-disc pl-8 mt-4 mb-4 space-y-2"
          >
            {block.items?.filter(item => item.trim()).map((item, itemIndex) => (
              <li 
                key={itemIndex} 
                className="text-lg text-gray-600 leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        );
      
      case "Table":
        if (!block.headers?.length || !block.rows?.length) return null;
        
        return (
          <div key={index} className="overflow-x-auto my-6 rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {block.headers.map((header, headerIndex) => (
                    <th 
                      key={headerIndex}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header || `Column ${headerIndex + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {block.headers.map((header, cellIndex) => (
                      <td 
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                      >
                        {row[header] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case "Image":
        if (!block.url) return null;
        
        return (
          <div key={index} className="my-8">
            <img 
              src={block.url} 
              alt={block.alt || "Blog image"} 
              className="rounded-lg shadow-md w-full max-w-2xl mx-auto"
            />
            {block.alt && (
              <p className="text-center text-sm text-gray-500 mt-2 italic">
                {block.alt}
              </p>
            )}
          </div>
        );
      
      case "Link":
        return (
          <a 
            key={index}
            href={block.href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 underline mt-3 mb-3 text-lg"
          >
            <span>{block.text}</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Blog Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/posted-blogs')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Blog Manager
          </button>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">No blog data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link 
              href="/dashboard/posted-blogs"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Blog Manager
            </Link>
            
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(blog.status)}`}>
                {blog.status?.charAt(0).toUpperCase() + blog.status?.slice(1) || 'Draft'}
              </span>
              {blog.trending && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  Trending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Blog Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Blog Header */}
          <div className="p-8 border-b border-gray-100">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mb-4">
                {blog.categoryName || 'Uncategorized'}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {blog.title}
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              {blog.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {blog.author?.name?.charAt(0) || 'U'}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {blog.author?.name || 'Unknown Author'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {blog.author?.email}
                  </p>
                </div>
              </div>

              <div className="text-right text-sm text-gray-500 mt-4 sm:mt-0">
                <div>Created: {formatDate(blog.createdAt)}</div>
                <div>Updated: {formatDate(blog.updatedAt)}</div>
                {blog.publishedAt && (
                  <div className="text-green-600 font-medium">
                    Published: {formatDate(blog.publishedAt)}
                  </div>
                )}
                {blog.scheduledAt && (
                  <div className="text-blue-600 font-medium">
                    Scheduled: {formatDate(blog.scheduledAt)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Image */}
          {blog.mainImageUrl && (
            <div className="p-8 border-b border-gray-100">
              <img 
                src={blog.mainImageUrl} 
                alt={blog.title}
                className="rounded-xl shadow-md w-full h-64 md:h-96 object-cover"
              />
            </div>
          )}

          {/* Blog Content Blocks */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              {blog.contentBlocks?.length > 0 ? (
                blog.contentBlocks.map((block, index) => renderBlock(block, index))
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📝</div>
                  <p className="text-xl text-gray-500">No content available for this blog post.</p>
                </div>
              )}
            </div>
          </div>

          {/* Blog Footer */}
          <div className="p-8 bg-gray-50 border-t border-gray-100">
            <div className="flex flex-wrap justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Slug: {blog.slug}</span>
                <span>•</span>
                <span>ID: {blog.id}</span>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <Link
                  href={`/dashboard/edit-blog?id=${blog.id}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Blog
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}