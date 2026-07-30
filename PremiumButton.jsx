import React, { useState } from "react";

export default function PremiumButton() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
       alert("Error: " + data.error);
    { } catch (err) {
      alert("Could not reach payment server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-full text-sm disabled:opacity-60"
    >
      {loading ? "Loading..." : "Upgrade to Premium"}
    </button>
  );
}
