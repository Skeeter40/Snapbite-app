import React, { useState, useEffect, useCallback } from "react";
import { Camera, X, Trash2 } from "lucide-react";
import { supabase } from "./supabaseClient";

const GREEN = "#10b981";
const GREEN_BG = "#ecfdf5";

export default function ProgressPhotos({ onClose }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setPhotos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("progress-photos")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("progress-photos")
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("progress_photos")
        .insert({ user_id: user.id, url: urlData.publicUrl });

      if (insertError) throw insertError;

      await loadPhotos();
    } catch (err) {
      setError(err.message || String(err));
    }

    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (photo) => {
    const { error } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", photo.id);
    if (error) {
      setError(error.message);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f2f4f2] overflow-y-auto">
      <div className="max-w-md mx-auto min-h-screen pb-10">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h1 className="text-2xl font-extrabold text-gray-900">Progress Photos</h1>
          <button onClick={onClose} className="text-gray-400">
            <X size={24} />
          </button>
        </div>
        <p className="text-gray-400 px-5 mb-4">Track your before &amp; after transformation</p>

        <div className="px-5 mb-5">
          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer"
            style={{ borderColor: GREEN, backgroundColor: GREEN_BG }}
          >
            <Camera size={28} style={{ color: GREEN }} />
            <span className="font-semibold" style={{ color: GREEN }}>
              {uploading ? "Uploading..." : "Take or upload a photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="mx-5 mb-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="px-5">
          {loading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : photos.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <div className="text-gray-900 font-bold mb-1">No photos yet</div>
              <div className="text-gray-400 text-sm">Add your first progress photo above.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p) => (
                <div key={p.id} className="relative rounded-2xl overflow-hidden border border-gray-100">
                  <img src={p.url} alt="" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => handleDelete(p)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[11px] px-2 py-1">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
