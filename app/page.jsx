"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { BiSolidHappyHeartEyes } from "react-icons/bi";
import { PiSmileyXEyesBold } from "react-icons/pi";
import { useRouter } from "next/navigation";
import { auth } from "@/FIrebaseConfig";

const Page = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Email regex for basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Optionally: Show a toast or success message here
      router.push("/dashboard"); // redirect after successful login
    } catch (err) {
      // Firebase auth error codes for better user messages
      let message = "Failed to login. Please try again.";
      if (err.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password.";
      } else if (err.code === "auth/too-many-requests") {
        message =
          "Too many failed attempts. Please try again later or reset your password.";
      }
      setError(message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fuchsia-100 via-cyan-100 to-blue-200 px-4">
      <div className="w-full max-w-md bg-white/90 rounded-xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-blue-600 bg-clip-text text-transparent mb-2">
          Login to Your Account
        </h2>
        <form className="space-y-5" onSubmit={handleLogin} autoComplete="on">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 font-semibold mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="placeholder-gray-400 w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none transition text-black"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-gray-700 font-semibold mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="placeholder-gray-400 w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-black"
                placeholder="********"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-fuchsia-600 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="inline-block transition-all duration-300">
                  {showPassword ? (
                    <PiSmileyXEyesBold className="w-5 h-5 transition-all duration-300 scale-100 opacity-100" />
                  ) : (
                    <BiSolidHappyHeartEyes className="w-5 h-5 transition-all duration-300 scale-100 opacity-100" />
                  )}
                </span>
              </button>
            </div>
          </div>
          {/* Error */}
          {error && (
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-2 text-sm text-center">
              {error}
            </div>
          )}
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white font-semibold text-lg shadow-md hover:from-blue-600 hover:to-fuchsia-600 transition-all focus:ring-2 focus:ring-fuchsia-400 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Page;
