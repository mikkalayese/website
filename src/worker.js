/**
 * Newsletter signup endpoint.
 *   POST /api/subscribe  { "email": "a@b.com" }
 * Adds (or updates) the contact in Brevo and puts it on the list named by
 * BREVO_LIST_NAME ("su primera lista"), or BREVO_LIST_ID if that is set.
 * Everything else is served from the static site.
 *
 * Secret (never commit it): BREVO_API_KEY
 */

const BREVO = "https://api.brevo.com/v3";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let cachedListId = null; // per isolate; avoids a lookup on every signup

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

/** Accepts the raw "xkeysib-..." key, or the base64 {"api_key": "..."} form Brevo's MCP page shows. */
function normalizeKey(raw) {
  const key = String(raw || "").trim();
  if (!key || key.startsWith("xkeysib-")) return key;
  try {
    const decoded = JSON.parse(atob(key));
    if (decoded && typeof decoded.api_key === "string") return decoded.api_key.trim();
  } catch (_) { /* not base64 JSON, use as is */ }
  return key;
}

async function brevo(path, apiKey, init = {}) {
  return fetch(BREVO + path, {
    ...init,
    headers: { accept: "application/json", "content-type": "application/json", "api-key": apiKey, ...(init.headers || {}) },
  });
}

async function resolveListId(env, apiKey) {
  if (env.BREVO_LIST_ID) return parseInt(env.BREVO_LIST_ID, 10);
  if (cachedListId) return cachedListId;

  const wanted = String(env.BREVO_LIST_NAME || "su primera lista").trim().toLowerCase();
  const limit = 50;
  for (let offset = 0; offset < 1000; offset += limit) {
    const res = await brevo(`/contacts/lists?limit=${limit}&offset=${offset}`, apiKey);
    if (!res.ok) throw new Error(`Brevo list lookup failed: ${res.status}`);
    const data = await res.json();
    const lists = data.lists || [];
    const match = lists.find((l) => String(l.name || "").trim().toLowerCase() === wanted);
    if (match) return (cachedListId = match.id);
    if (offset + limit >= (data.count || 0) || lists.length === 0) break;
  }
  throw new Error(`Brevo list "${env.BREVO_LIST_NAME || "su primera lista"}" not found`);
}

async function subscribe(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Invalid request." }, 400); }

  // Honeypot: real visitors never fill this. Pretend success so bots learn nothing.
  if (body && body.company) return json({ ok: true });

  const email = String((body && body.email) || "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const apiKey = normalizeKey(env.BREVO_API_KEY);
  if (!apiKey) {
    console.error("BREVO_API_KEY is not set");
    return json({ error: "Signup is not configured yet." }, 500);
  }

  try {
    const listId = await resolveListId(env, apiKey);
    // updateEnabled: if the contact already exists, add them to the list instead of failing.
    const res = await brevo("/contacts", apiKey, {
      method: "POST",
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
    });
    if (res.status === 201 || res.status === 204) return json({ ok: true });

    console.error("Brevo create contact failed", res.status, (await res.text()).slice(0, 300));
    return json({ error: "Couldn't sign you up. Please try again." }, 502);
  } catch (err) {
    console.error("Subscribe error", err && err.message);
    return json({ error: "Couldn't sign you up. Please try again." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/subscribe") {
      if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
      return subscribe(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
