import crypto from "crypto";

const urls = globalThis.__URL_STORE__ || (globalThis.__URL_STORE__ = new Map());

function code() {
  return crypto.randomBytes(4).toString("base64url");
}

export default function handler(req, res) {
  const parts = (req.url || "").split("?")[0].split("/").filter(Boolean);

  if (req.method === "POST" && parts.length === 1 && parts[0] === "shorten") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const originalUrl = body?.url?.trim();

    if (!originalUrl) return res.status(400).json({ error: "URL is required." });

    try {
      const parsed = new URL(originalUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      return res.status(400).json({ error: "Please enter a valid http/https URL." });
    }

    let shortCode = code();
    while (urls.has(shortCode)) shortCode = code();
    urls.set(shortCode, originalUrl);

    const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    return res.status(201).json({
      originalUrl,
      shortCode,
      shortUrl: `${base}/${shortCode}`
    });
  }

  if (req.method === "GET" && parts.length === 1) {
    const originalUrl = urls.get(parts[0]);
    if (originalUrl) return res.redirect(302, originalUrl);
  }

  return res.status(404).json({ error: "Not found." });
}