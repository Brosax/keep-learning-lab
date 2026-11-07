// Keep Learning Lab 社区版：Google 账号登录验证 + 学习进度多端云同步接口（Vercel Function）。
//
// 1. GET /api/progress/
//    返回公开配置：{ configured, hasDb, googleClientId }
//
// 2. POST /api/progress/  { action: "google-login", idToken: "<Google JWT>" }
//    向 Google 校验 id_token（验证 aud === GOOGLE_CLIENT_ID 与有效期），提取 sub / name / email / picture，
//    签发 90 天有效期的 HMAC-SHA256 会话令牌，并返回该账号在云端已有的学习进度 { token, user, docs }。
//
// 3. POST /api/progress/  Authorization: Bearer <会话令牌>
//    请求体：{ docs: { ei: { v, t }, micro: { v, t }, emp: { v, t } } }（或单门课 { curso, doc }）
//    按键时间戳合并（Last-Write-Wins），写入 Neon 表 comunidad_progreso，返回合并后的 { docs }。

import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const TABLE = process.env.VERCEL_ENV === "production" ? "comunidad_progreso" : "comunidad_progreso_dev";
const CURSO = /^[a-z0-9-]{1,20}$/;
const MAX_BYTES = 250_000;
const MAX_KEYS = 5000;
const SKEW_MS = 5 * 60_000;
const SESSION_TTL_MS = 90 * 24 * 3600 * 1000; // 90 天

let sql = null;
let ready = null;

function secret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "";
}

function db() {
  if (!process.env.DATABASE_URL) return Promise.reject(new Error("no-db"));
  if (!sql) sql = neon(process.env.DATABASE_URL);
  if (!ready) {
    ready = sql
      .query(`CREATE TABLE IF NOT EXISTS ${TABLE} (
        user_id text NOT NULL,
        curso text NOT NULL,
        doc jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, curso)
      )`)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready.then(() => sql);
}

function signSession(payload) {
  const sec = secret();
  if (!sec) throw new Error("no-secret");
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", sec).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifySession(header) {
  const sec = secret();
  if (!sec || typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const raw = header.slice(7).trim();
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const data = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = crypto.createHmac("sha256", sec).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (!payload || typeof payload.uid !== "string" || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function verifyGoogleIdToken(idToken) {
  if (typeof idToken !== "string" || idToken.length < 50 || idToken.length > 4096) return null;
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const info = await r.json();
  if (!info || !info.sub) return null;
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  if (clientId && info.aud !== clientId) return null;
  if (info.iss !== "accounts.google.com" && info.iss !== "https://accounts.google.com") return null;
  if (info.exp && Number(info.exp) * 1000 < Date.now()) return null;
  return {
    sub: String(info.sub),
    email: info.email ? String(info.email) : "",
    name: info.name ? String(info.name) : (info.email ? String(info.email).split("@")[0] : "Learner"),
    picture: info.picture ? String(info.picture) : "",
  };
}

function limpio(doc, ahora) {
  if (!doc || typeof doc !== "object") return null;
  const { v, t } = doc;
  if (!v || !t || typeof v !== "object" || typeof t !== "object" || Array.isArray(v) || Array.isArray(t)) return null;
  const keys = Object.keys(t);
  if (keys.length > MAX_KEYS) return null;
  const out = { v: {}, t: {} };
  for (const k of keys) {
    if (k.length > 160) return null;
    const ts = Number(t[k]);
    if (!Number.isFinite(ts) || ts < 0) return null;
    out.t[k] = ahora ? Math.min(ts, ahora + SKEW_MS) : ts;
    out.v[k] = Object.prototype.hasOwnProperty.call(v, k) ? v[k] : null;
  }
  return out;
}

function fusionar(base, nuevo) {
  const out = { v: { ...base.v }, t: { ...base.t } };
  for (const k of Object.keys(nuevo.t)) {
    if (!(k in out.t) || nuevo.t[k] > out.t[k]) {
      out.v[k] = nuevo.v[k];
      out.t[k] = nuevo.t[k];
    }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const hasDb = !!process.env.DATABASE_URL;

  if (req.method === "GET") {
    return res.status(200).json({
      configured: !!(hasDb && googleClientId),
      hasDb,
      googleClientId,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "json" });
    }
  }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "body" });
  if (JSON.stringify(body).length > MAX_BYTES) return res.status(413).json({ error: "size" });

  // 1) Google 登录换取长期同步会话令牌
  if (body.action === "google-login") {
    if (!googleClientId) return res.status(503).json({ error: "no-google-client-id" });
    if (!hasDb) return res.status(503).json({ error: "no-db" });
    try {
      const gUser = await verifyGoogleIdToken(body.idToken);
      if (!gUser) return res.status(401).json({ error: "invalid-google-token" });
      const uid = `google:${gUser.sub}`;
      const token = signSession({
        uid,
        name: gUser.name,
        email: gUser.email,
        picture: gUser.picture,
        exp: Date.now() + SESSION_TTL_MS,
      });
      const q = await db();
      const rows = await q.query(`SELECT curso, doc FROM ${TABLE} WHERE user_id = $1`, [uid]);
      const docs = {};
      for (const r of rows) {
        const d = limpio(r.doc, 0);
        if (d) docs[r.curso] = d;
      }
      return res.status(200).json({
        token,
        user: { name: gUser.name, email: gUser.email, picture: gUser.picture },
        docs,
      });
    } catch (e) {
      console.error("google-login:", e && e.message);
      return res.status(500).json({ error: "server" });
    }
  }

  // 2) 已登录用户的进度同步（支持批量 docs 或单门课 curso + doc）
  if (!hasDb) return res.status(503).json({ error: "no-db" });
  const session = verifySession(req.headers.authorization);
  if (!session) return res.status(401).json({ error: "auth" });

  const ahora = Date.now();
  const incoming = {};
  if (body.docs && typeof body.docs === "object" && !Array.isArray(body.docs)) {
    for (const [c, rawDoc] of Object.entries(body.docs)) {
      if (!CURSO.test(c)) return res.status(400).json({ error: "curso" });
      const clean = limpio(rawDoc, ahora);
      if (!clean) return res.status(400).json({ error: "doc" });
      incoming[c] = clean;
    }
  } else if (typeof body.curso === "string" && CURSO.test(body.curso)) {
    const clean = limpio(body.doc, ahora);
    if (!clean) return res.status(400).json({ error: "doc" });
    incoming[body.curso] = clean;
  } else {
    return res.status(400).json({ error: "payload" });
  }

  const cursos = Object.keys(incoming);
  if (!cursos.length || cursos.length > 30) return res.status(400).json({ error: "cursos" });

  try {
    const q = await db();
    const rows = await q.query(`SELECT curso, doc FROM ${TABLE} WHERE user_id = $1`, [session.uid]);
    const existing = {};
    for (const r of rows) {
      existing[r.curso] = limpio(r.doc, 0) || { v: {}, t: {} };
    }

    const outDocs = { ...existing };
    for (const c of cursos) {
      const prev = existing[c] || { v: {}, t: {} };
      const merged = fusionar(prev, incoming[c]);
      outDocs[c] = merged;
      if (!(c in existing) || JSON.stringify(merged) !== JSON.stringify(prev)) {
        await q.query(
          `INSERT INTO ${TABLE} (user_id, curso, doc, updated_at) VALUES ($1, $2, $3::jsonb, now())
           ON CONFLICT (user_id, curso) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`,
          [session.uid, c, JSON.stringify(merged)]
        );
      }
    }

    if (body.curso) {
      return res.status(200).json({ curso: body.curso, doc: outDocs[body.curso] });
    }
    return res.status(200).json({ docs: outDocs });
  } catch (e) {
    console.error("progress:", e && e.message);
    return res.status(500).json({ error: "db" });
  }
}
