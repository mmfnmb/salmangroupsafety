"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { clsx } from "clsx";

export function PhotoUploadField({
  name,
  orgId,
  label,
  required,
  defaultUrl = "",
  onUploaded,
}: {
  name: string;
  orgId?: string;
  label?: string;
  required?: boolean;
  defaultUrl?: string;
  onUploaded?: (url: string) => void;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      if (orgId) body.append("orgId", orgId);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUrl(data.url);
      onUploaded?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setUrl("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {/* Not marked HTML-required: a required hidden input silently blocks
          submission with no visible cue when empty. Enforcement here is
          the visual asterisk + inline error, not a native constraint. */}
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute -end-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700"
            aria-label="Remove photo"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <label
          className={clsx(
            "flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-slate-400 hover:border-blue-400 hover:text-blue-500",
            error ? "border-red-300" : "border-slate-300"
          )}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          <span className="text-[10px]">{uploading ? "Uploading…" : "Add photo"}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleChange}
            disabled={uploading}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
