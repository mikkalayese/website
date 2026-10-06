/**
 * Newsletter signup endpoint.
 *   POST /api/subscribe  { "email": "a@b.com" }
 * Adds (or updates) the contact in Brevo and puts it on the list named by
 * BREVO_LIST_NAME ("newsletter sign ups"), or BREVO_LIST_ID if that is set.
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

async function brevoMessage(res) {
  const text = (await res.text()).slice(0, 300);
  try { const j = JSON.parse(text); return j.message || j.code || text; } catch (_) { return text; }
}

class SignupError extends Error {
  constructor(detail) { super(detail); this.detail = detail; }
}

// Which Brevo list a form adds to. The browser sends a name ("newsletter" or "freebies"),
// never a list number, so visitors can't add themselves to other lists.
function listKey(body) {
  return body && body.list === 'freebies' ? 'freebies' : 'newsletter';
}

async function resolveListId(env, apiKey, key = 'newsletter') {
  if (key === 'freebies') {
    if (!env.BREVO_FREEBIES_LIST_ID) throw new SignupError('BREVO_FREEBIES_LIST_ID is not set');
    return parseInt(env.BREVO_FREEBIES_LIST_ID, 10);
  }
  if (env.BREVO_LIST_ID) return parseInt(env.BREVO_LIST_ID, 10);
  if (cachedListId) return cachedListId;

  const wanted = String(env.BREVO_LIST_NAME || "newsletter sign ups").trim().toLowerCase();
  const limit = 50;
  for (let offset = 0; offset < 1000; offset += limit) {
    const res = await brevo(`/contacts/lists?limit=${limit}&offset=${offset}`, apiKey);
    if (!res.ok) throw new SignupError(`Brevo list lookup ${res.status}: ${await brevoMessage(res)}`);
    const data = await res.json();
    const lists = data.lists || [];
    const match = lists.find((l) => String(l.name || "").trim().toLowerCase() === wanted);
    if (match) return (cachedListId = match.id);
    if (offset + limit >= (data.count || 0) || lists.length === 0) break;
  }
  throw new SignupError(`List "${env.BREVO_LIST_NAME || "newsletter sign ups"}" not found in Brevo`);
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
    return json({ error: "Signup is not configured yet.", detail: "BREVO_API_KEY secret not visible to the Worker" }, 500);
  }

  try {
    const listId = await resolveListId(env, apiKey, listKey(body));
    // updateEnabled: if the contact already exists, add them to the list instead of failing.
    const res = await brevo("/contacts", apiKey, {
      method: "POST",
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
    });
    if (res.status === 201 || res.status === 204) return json({ ok: true });

    const detail = `Brevo ${res.status}: ${await brevoMessage(res)}`;
    console.error("Brevo create contact failed", detail);
    return json({ error: "Couldn't sign you up. Please try again.", detail }, 502);
  } catch (err) {
    const detail = err instanceof SignupError ? err.message : "Could not reach Brevo";
    console.error("Subscribe error", err && err.message);
    return json({ error: "Couldn't sign you up. Please try again.", detail }, 502);
  }
}

/** GET /api/status: reports whether the key and list work. Never returns the key. */
async function status(env) {
  const apiKey = normalizeKey(env.BREVO_API_KEY);
  const out = {
    keyPresent: !!apiKey,
    keyFormat: apiKey ? (apiKey.startsWith("xkeysib-") ? "ok" : "unexpected (should start with xkeysib-)") : null,
    listId: env.BREVO_LIST_ID || null,
    freebiesListId: env.BREVO_FREEBIES_LIST_ID || null,
    // Names only, never values: shows which settings this Worker can actually see.
    visibleSettings: Object.keys(env).filter((k) => k !== "ASSETS").sort(),
  };
  if (!apiKey) return json(out);
  try {
    const acc = await brevo("/account", apiKey);
    out.brevoAccount = acc.ok ? { status: acc.status, ok: true } : { status: acc.status, message: await brevoMessage(acc) };
    if (env.BREVO_LIST_ID) {
      const l = await brevo(`/contacts/lists/${encodeURIComponent(env.BREVO_LIST_ID)}`, apiKey);
      out.brevoList = l.ok ? { status: l.status, name: (await l.json()).name } : { status: l.status, message: await brevoMessage(l) };
    }
    if (env.BREVO_FREEBIES_LIST_ID) {
      const f = await brevo(`/contacts/lists/${encodeURIComponent(env.BREVO_FREEBIES_LIST_ID)}`, apiKey);
      out.brevoFreebiesList = f.ok ? { status: f.status, name: (await f.json()).name } : { status: f.status, message: await brevoMessage(f) };
    }
  } catch (err) {
    out.error = "Could not reach Brevo";
  }
  return json(out);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/status") return status(env);
    if (pathname === "/api/subscribe") {
      if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
      return subscribe(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
