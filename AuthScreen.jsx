import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const GREEN = "#10b981";
const BG = "#f2f4f2";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (error) setError(error.message);
    } catch (err) {
      setError("Caught error: " + (err.message || String(err)));
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: BG }}
    >
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-gray-400 mb-5">
          {mode === "signin"
            ? "Sign in to track your meals."
            : "Sign up to start tracking with SnapBite."}
        </p>

        <p className="text-xs text-gray-400 mb-4 break-all">
          DEBUG URL: {String(import.meta.env.VITE_SUPABASE_URL)}
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Email
          </label>
          <input
            type="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 outline-none"
          />

          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Password
          </label>
          <input
            type="password"
            autoCapitalize="none"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 outline-none"
          />

          {error && (
            <p className="text-sm text-red-500 mb-4 break-all">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: GREEN }}
            className="w-full text-white font-semibold py-3 rounded-full disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
              ? "Sign In"
              : "Sign Up"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-gray-500 mt-4"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
