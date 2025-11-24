"use client";
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../FIrebaseConfig";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [resetMode, setResetMode] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    secretKey: "",
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const toggleMode = () => {
    setIsSignup((prev) => !prev);
    setResetMode(false);
    setMsg("");
    setForm({ name: "", email: "", password: "", secretKey: "" });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      if (isSignup) {
        if (form.secretKey !== process.env.NEXT_PUBLIC_COMPANY_SIGNUP_KEY) {
          setMsg("❌ Invalid company secret key");
          setLoading(false);
          return;
        }

        const res = await createUserWithEmailAndPassword(auth, form.email, form.password);

        await updateProfile(res.user, {
          displayName: form.name,
        });

        setMsg("✅ Signup successful! Please login now.");
        setIsSignup(false);
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password);
        setMsg("✅ Login Successful");
        router.push("/dashboard");
      }
    } catch (err: any) {
      setMsg("❌ " + err.message);
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!form.email) {
      setMsg("⚠ Please enter email first");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, form.email);
      setMsg("📩 Password reset email sent! Check your inbox.");
      setResetMode(false);
    } catch (err: any) {
      setMsg("❌ " + err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-40">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl p-8 rounded-xl border border-blue-200"
      >
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-4">
          {resetMode ? "Reset Password" : isSignup ? "Employee Signup" : "Employee Login"}
        </h2>

        {msg && (
          <p
            className={`mb-3 text-center font-semibold text-sm ${
              msg.startsWith("❌") ? "text-red-600" : "text-green-600"
            }`}
          >
            {msg}
          </p>
        )}

        {/* FORM FIELDS */}
        {!resetMode && isSignup && (
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            className="w-full p-3 border rounded-lg mb-3"
            value={form.name}
            onChange={handleChange}
            required
          />
        )}

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="w-full p-3 border rounded-lg mb-3"
          value={form.email}
          onChange={handleChange}
          required
        />

        {!resetMode && (
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg mb-3"
            value={form.password}
            onChange={handleChange}
            required={!resetMode}
          />
        )}

        {isSignup && !resetMode && (
          <input
            type="text"
            name="secretKey"
            placeholder="Enter Company Secret Key"
            className="w-full p-3 border rounded-lg mb-4"
            value={form.secretKey}
            onChange={handleChange}
            required
          />
        )}

        {/* BUTTON */}
        {!resetMode ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading
              ? isSignup
                ? "Signing Up..."
                : "Logging In..."
              : isSignup
              ? "Signup"
              : "Login"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePasswordReset}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition"
          >
            Send Reset Email
          </button>
        )}

        {/* SWITCH LINKS */}
        <div className="text-center text-sm mt-4 text-gray-600">
          {!resetMode && (
            <p>
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <span
                    className="text-blue-600 font-semibold cursor-pointer hover:underline"
                    onClick={toggleMode}
                  >
                    Login
                  </span>
                </>
              ) : (
                <>
                  Don’t have an account?{" "}
                  <span
                    className="text-blue-600 font-semibold cursor-pointer hover:underline"
                    onClick={toggleMode}
                  >
                    Signup
                  </span>
                </>
              )}
            </p>
          )}

          {!isSignup && !resetMode && (
            <p className="mt-2">
              <span
                className="text-purple-600 font-semibold cursor-pointer hover:underline"
                onClick={() => setResetMode(true)}
              >
                Forgot password?
              </span>
            </p>
          )}

          {resetMode && (
            <p className="mt-2">
              <span
                className="text-blue-600 font-semibold cursor-pointer hover:underline"
                onClick={() => setResetMode(false)}
              >
                Back to login
              </span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
