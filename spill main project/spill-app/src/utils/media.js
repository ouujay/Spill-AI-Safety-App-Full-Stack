// utils/media.js
// Safely return an image URI for React Native <Image/>

import { API_BASE_URL } from "../api/config"; // you already use this in api.js

// If you prefer, export a separate API_ORIGIN so relative paths work too.
const API_ORIGIN = API_BASE_URL.replace(/\/api.*/i, "");

export function safeImageUri(src) {
  if (!src) return undefined;

  const s = String(src).trim();

  // Already an absolute Cloudinary (or any http) URL: use as-is
  if (/^https?:\/\//i.test(s)) return s;

  // If your API returns /media/foo.jpg for local files, keep it relative to the API origin
  if (s.startsWith("/")) return `${API_ORIGIN}${s}`;

  // Fallback: treat as relative path
  return `${API_ORIGIN}/${s}`;
}
