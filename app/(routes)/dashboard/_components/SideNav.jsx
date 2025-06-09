"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiMenu, FiX, FiLogOut } from "react-icons/fi";
import { FaBlogger, FaClipboardList, FaChartPie, FaUser } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/FIrebaseConfig";

const navLinks = [
  {
    label: "Blog Posting",
    href: "/dashboard/blog-posting",
    icon: <FaBlogger size={20} />,
  },
  {
    label: "Posted Blogs",
    href: "/dashboard/posted-blogs",
    icon: <FaClipboardList size={20} />,
  },
  {
    label: "Promotions",
    href: "/dashboard/promotions",
    icon: <FaClipboardList size={20} />,
  },
  {
    label: "Posted Promotions",
    href: "/dashboard/posted-promotions",
    icon: <FaClipboardList size={20} />,
  },
];

const SideNav = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  // Listen for user authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName || firebaseUser.email || "User",
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      alert("Error logging out. Please try again.");
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="py-8 flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-fuchsia-400 shadow-lg flex items-center justify-center bg-white">
            <Image
              src="/assets/ERRTEKNALOZY.jpg"
              alt="Logo"
              width={80}
              height={80}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-wider drop-shadow-md">
            ERRTEKNALOZY
          </span>
        </div>

        <nav className="flex flex-col gap-2 px-6 mt-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all
                text-lg
                ${
                  pathname === link.href
                    ? "bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white shadow-md scale-[1.03]"
                    : "text-gray-700 hover:bg-fuchsia-50 hover:scale-[1.03] hover:text-fuchsia-600"
                }
              `}
              onClick={() => setOpen(false)}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="px-6 pb-8 mt-10">
        <div className="flex items-center justify-between gap-2 p-3 bg-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="bg-fuchsia-200 text-fuchsia-900 px-3 py-1 rounded-full font-bold text-sm uppercase">
              {user?.name?.split(" ")[0] ||
                user?.email?.split("@")[0] ||
                "Guest"}
            </span>
          </div>
          <button
            className="p-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:from-blue-600 hover:to-fuchsia-600 transition-all shadow"
            aria-label="Logout"
            onClick={handleLogout}
            disabled={!user}
            title={user ? "Logout" : "Not logged in"}
          >
            <FiLogOut size={22} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger button - only on small/medium screens and only when menu is closed */}
      {!open && (
        <button
          className="fixed top-4 left-4 z-[110] p-2 rounded-full bg-white shadow-lg border border-gray-200 text-gray-700 transition hover:bg-gray-100 lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open sidebar"
        >
          <FiMenu size={28} />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-[120] flex flex-col
          bg-gradient-to-br from-white via-fuchsia-50 to-blue-50 border-r border-gray-200
          shadow-lg transition-all duration-300
          w-[80vw] max-w-xs
          lg:w-[20vw] lg:max-w-xs lg:min-w-[16rem] lg:static lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ minWidth: "16rem" }}
      >
        <div className="flex lg:hidden justify-end pt-4 pr-4">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
            className="p-2 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
          >
            <FiX size={28} />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <div
        className={`
          fixed inset-0 z-[110] bg-black/30 transition-opacity duration-300
          ${
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }
          lg:hidden
        `}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    </>
  );
};

export default SideNav;
