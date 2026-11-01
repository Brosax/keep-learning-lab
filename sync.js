/* OpenSEEI 社区版：本地学习记录追踪 + Google 账号登录多端云同步 + 课程内页统一导航壳。
   由 90_System/web_comunidad.py 注入首页与所有课程章节页：
   - 未登录时：完全本地运行，所有进度（要点掌握、章节自测、数值练习、最近学习的章节）保存在浏览器 localStorage。
   - 登录 Google 账号后：将各课进度展开为 "段|键" 并附带毫秒时间戳，与云端（/api/progress/ + Neon）按键合并（最新修改胜出）。
   - 课程内页增强：注入 OpenSEEI 品牌顶栏、全章目录与跨课切换抽屉（Alt+M）、中英语言切换、阅读进度条与实时云同步胶丸。 */
(function () {
  "use strict";

  var me = document.currentScript;
  var API = (me && me.getAttribute("data-api")) || "api/progress/";
  var HOME = (me && me.getAttribute("data-home")) || "./";
  var CURSOS = ((me && me.getAttribute("data-cursos")) || "").split(/\s+/).filter(Boolean).map(function (s) {
    var p = s.split(":");
    return { slug: p[0], key: p[1], view: null };
  });
  var EN_READY = ((me && me.getAttribute("data-en")) || "emp").split(/\s+/).filter(Boolean);
  var CFG = "open-seei-sync";
  var ACT = "open-seei-activity";
  var SEP = "|";
  var T0 = Date.now();

  var ls = null;
  try { ls = window.localStorage; ls.getItem(CFG); } catch (e) { ls = null; }
  if (!ls || !CURSOS.length) {
    window.SeeiSync = { beforeApp: function () {}, available: false };
    return;
  }

  var setRaw = Storage.prototype.setItem;
  function get(k) { try { return ls.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { setRaw.call(ls, k, v); } catch (e) { /* quota / blocked */ } }
  function parse(s, d) { try { var x = JSON.parse(s); return x == null ? d : x; } catch (e) { return d; } }
  function cfg() { return parse(get(CFG), {}); }
  function setCfg(patch) {
    var c = cfg();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    put(CFG, JSON.stringify(c));
    return c;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function detectRoute() {
    var m = location.pathname.match(/\/(zh|en|es)\/([a-z0-9-]+)\/([^/?#]*)$/i);
    if (!m) return null;
    var lang = m[1].toLowerCase();
    var slug = m[2].toLowerCase();
    var file = m[3] || "index.html";
    return { lang: lang, slug: slug, file: file };
  }

  function isEnglishPage() {
    var rt = detectRoute();
    if (rt) return rt.lang === "en";
    var hl = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    return hl.indexOf("en") === 0;
  }

  /* ---------- 记录最近学习的章节（供 MOOC 首页“继续学习”与最近访问轨迹使用） ---------- */
  function recordVisit() {
    var rt = detectRoute();
    if (!rt || !rt.file || rt.file === "index.html" || !/\.html$/i.test(rt.file)) return;
    var h1 = document.querySelector("h1");
    var title = h1 ? h1.textContent.trim() : rt.file.replace(/\.html$/, "").toUpperCase();
    var act = parse(get(ACT), {});
    var entry = { lang: rt.lang, slug: rt.slug, file: rt.file, title: title, ts: Date.now() };
    act.last = entry;
    act.byCurso = act.byCurso || {};
    act.byCurso[rt.slug] = entry;
    var hist = Array.isArray(act.history) ? act.history : [];
    hist = hist.filter(function (x) { return !(x && x.slug === rt.slug && x.file === rt.file); });
    hist.unshift(entry);
    act.history = hist.slice(0, 6);
    put(ACT, JSON.stringify(act));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", recordVisit);
  else recordVisit();

  /* ---------- 展开 / 还原 ---------- */
  function flat(state) {
    var v = {};
    if (!state || typeof state !== "object") return v;
    Object.keys(state).forEach(function (sec) {
      var x = state[sec];
      if (x && typeof x === "object" && !Array.isArray(x)) {
        Object.keys(x).forEach(function (k) { v[sec + SEP + k] = x[k]; });
      } else {
        v[sec] = x;
      }
    });
    return v;
  }
  function unflat(v) {
    var s = {};
    Object.keys(v).forEach(function (k) {
      if (v[k] == null) return;
      var i = k.indexOf(SEP);
      if (i < 0) { s[k] = v[k]; return; }
      var sec = k.slice(0, i);
      if (!s[sec] || typeof s[sec] !== "object") s[sec] = {};
      s[sec][k.slice(i + 1)] = v[k];
    });
    return s;
  }
  function val(o, k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; }
  function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function keys(a, b) {
    var seen = {}, out = [];
    [a, b].forEach(function (o) {
      Object.keys(o || {}).forEach(function (k) {
        if (!seen[k]) { seen[k] = 1; out.push(k); }
      });
    });
    return out;
  }
  function same(a, b) { return keys(a, b).every(function (k) { return eq(val(a, k), val(b, k)); }); }

  function loadDoc(c) { var d = parse(get(c.key + ":sync"), null); return d && d.v && d.t ? d : null; }
  function saveDoc(c, d) { put(c.key + ":sync", JSON.stringify(d)); }

  function reconcile(c) {
    var local = flat(parse(get(c.key), {}));
    var d = loadDoc(c), fresh = !d, now = Date.now(), changed = false;
    if (!d) d = { v: {}, t: {} };
    keys(local, d.v).forEach(function (k) {
      var lv = val(local, k);
      if (!eq(lv, val(d.v, k))) { d.v[k] = lv; d.t[k] = fresh ? 0 : now; changed = true; }
    });
    if (changed || fresh) saveDoc(c, d);
    return d;
  }

  /* ---------- 截获 app.js 的写入 ---------- */
  var byKey = {};
  CURSOS.forEach(function (c) { byKey[c.key] = c; });
  var seq = 0;

  Storage.prototype.setItem = function (k, v) {
    var c = this === ls ? byKey[k] : null;
    var old = c ? get(k) : null;
    setRaw.apply(this, arguments);
    if (c) {
      try {
        recordVisit();
        onAppWrite(c, String(v), old);
      } catch (e) { /* never break app.js */ }
    }
  };

  function onAppWrite(c, raw, old) {
    var nv = flat(parse(raw, {}));
    var base = c.view || flat(parse(old, {}));
    var d = loadDoc(c) || reconcile(c);
    var now = Date.now(), dirty = false;
    keys(base, nv).forEach(function (k) {
      if (!eq(val(base, k), val(nv, k))) { d.v[k] = val(nv, k); d.t[k] = now; dirty = true; }
    });
    c.view = nv;
    saveDoc(c, d);
    var full = JSON.stringify(unflat(d.v));
    if (!same(flat(unflat(d.v)), nv)) put(c.key, full);
    refreshCourseShellProgress();
    if (dirty) {
      seq++;
      try { document.dispatchEvent(new CustomEvent("seei-sync", { detail: { changed: true, local: true } })); } catch (e) { /* ignore */ }
      if (token()) schedule();
    }
  }

  /* ---------- 同步状态 ---------- */
  var state = "off", detail = "";
  var serverConf = { loaded: false, configured: false, hasDb: false, googleClientId: "" };

  var TEXT_ZH = {
    off: "本地笔记模式（点此前往主页登录 Google 云同步）",
    busy: "正在与云端同步进度…",
    auth: "Google 登录已过期，请重新登录",
    "no-db": "云端数据库尚未连接（进度已保存在本机）",
    "no-google-client-id": "Google 登录尚未配置 Client ID",
    net: "暂时连不上云端服务器（进度已保存在本机）"
  };
  var TEXT_EN = {
    off: "Local mode (Sign in with Google on index for cloud sync)",
    busy: "Syncing progress with cloud…",
    auth: "Google session expired, please sign in again",
    "no-db": "Cloud database not connected (saved locally)",
    "no-google-client-id": "Google Client ID not configured yet",
    net: "Cannot reach sync server right now (saved locally)"
  };
  function hhmm(ms) {
    var d = new Date(ms);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function text() {
    var en = isEnglishPage();
    var T = en ? TEXT_EN : TEXT_ZH;
    var u = cfg().user;
    var who = u && (u.name || u.email) ? (u.name || u.email) + " · " : "";
    if (state === "ok") return who + (en ? "Synced · " : "已同步 · ") + hhmm(cfg().last || Date.now());
    if (state === "err") return T[detail] || T.net;
    return T[state] || "";
  }
  function setState(s, d) {
    state = s;
    detail = d || "";
    document.documentElement.setAttribute("data-sync", s);
    paintDot();
    try {
      document.dispatchEvent(new CustomEvent("seei-sync-state", {
        detail: { state: s, code: detail, text: text(), on: !!token(), user: cfg().user || null, server: serverConf }
      }));
    } catch (e) { /* ignore */ }
  }

  var dot = null;
  function paintDot() {
    if (!dot) {
      var slot = document.querySelector(".os-top-tools") || document.querySelector(".crumbs");
      if (!slot) return;
      dot = document.createElement("a");
      dot.className = "sync-dot";
      dot.href = HOME + (isEnglishPage() ? "?lang=en#sync" : "#sync");
      var inner = document.createElement("span");
      inner.className = "sync-dot-ind";
      var lbl = document.createElement("em");
      lbl.className = "sync-dot-lbl";
      dot.appendChild(inner);
      dot.appendChild(lbl);
      slot.appendChild(dot);
    }
    var en = isEnglishPage();
    dot.setAttribute("data-s", state);
    dot.title = text();
    dot.setAttribute("aria-label", text());
    var lblEl = dot.querySelector(".sync-dot-lbl");
    if (lblEl) {
      var u = cfg().user;
      if (en) {
        lblEl.textContent = state === "ok" && u ? (u.name || "Synced") : state === "busy" ? "Syncing" : state === "err" ? "Sync Issue" : "Cloud Sync";
      } else {
        lblEl.textContent = state === "ok" && u ? (u.name || "已同步") : state === "busy" ? "同步中" : state === "err" ? "同步异常" : "云同步";
      }
    }
  }

  /* ---------- 课程内页统一 OpenSEEI 顶栏、全章目录抽屉与阅读进度条 ---------- */
  var COURSE_META = [
    { slug: "micro", code: "MICRO", zh: "微控制器 (MSP430 / ESP32-S3)", en: "Microcontrollers (MSP430 / ESP32-S3)" },
    { slug: "emp", code: "EMP", zh: "嵌入式 Linux 与 POSIX", en: "Embedded Linux & POSIX" },
    { slug: "ei", code: "EI", zh: "智能环境与物联网架构", en: "Intelligent Environments & IoT" }
  ];

  function injectShellStyles() {
    if (document.getElementById("open-seei-shell-css")) return;
    var st = document.createElement("style");
    st.id = "open-seei-shell-css";
    st.textContent =
      ".topbar { position: sticky; top: 0; z-index: 45; }\n" +
      ".topbar-in { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }\n" +
      ".crumbs { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; min-width: 0; }\n" +
      ".crumbs .hub { display: inline-flex; align-items: center; gap: 6px; font: 700 13.5px/1 var(--f-mono, monospace); letter-spacing: .02em; color: var(--accent, var(--blue, #2a6fdb)); text-decoration: none; padding: 4px 8px 4px 6px; border-radius: 7px; background: color-mix(in srgb, var(--accent, var(--blue, #2a6fdb)) 11%, transparent); border: 1px solid color-mix(in srgb, var(--accent, var(--blue, #2a6fdb)) 25%, transparent); transition: filter .15s; }\n" +
      ".crumbs .hub:hover { filter: brightness(1.1); }\n" +
      ".crumbs .hub svg { width: 14px; height: 14px; flex-shrink: 0; }\n" +
      ".crumbs .sep { font: 400 14px/1 var(--f-mono, monospace); color: var(--muted, #888); opacity: .5; }\n" +
      ".os-top-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }\n" +
      ".os-top-tools { display: inline-flex; align-items: center; gap: 6px; }\n" +
      ".os-chap-btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line, rgba(128,128,128,.3)); background: color-mix(in srgb, var(--ink, #111) 4%, transparent); color: var(--ink, inherit); font: 600 12px/1.2 var(--f-body, system-ui, sans-serif); cursor: pointer; white-space: nowrap; transition: border-color .15s, background .15s; }\n" +
      ".os-chap-btn:hover, .os-chap-btn[aria-expanded='true'] { border-color: var(--accent, var(--blue, #2a6fdb)); background: color-mix(in srgb, var(--accent, var(--blue, #2a6fdb)) 12%, transparent); }\n" +
      ".os-chap-btn svg { width: 13px; height: 13px; opacity: .85; }\n" +
      ".os-chap-cnt { font: 700 11px/1 var(--f-mono, monospace); padding: 2px 6px; border-radius: 999px; background: color-mix(in srgb, var(--accent, var(--blue, #2a6fdb)) 18%, transparent); color: var(--accent, var(--blue, #2a6fdb)); }\n" +
      ".os-lang-switch { display: inline-flex; align-items: center; border: 1px solid var(--line, rgba(128,128,128,.3)); border-radius: 999px; padding: 1px; font: 700 11px/1 var(--f-mono, monospace); }\n" +
      ".os-lang-switch a, .os-lang-switch span { padding: 4px 7px; border-radius: 999px; text-decoration: none; color: var(--muted, #888); }\n" +
      ".os-lang-switch .on { background: var(--accent, var(--blue, #2a6fdb)); color: #fff; }\n" +
      ".os-lang-switch a:hover:not(.on) { color: var(--ink, inherit); }\n" +
      ".sync-dot { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; border: 1px solid var(--line, rgba(128,128,128,.28)); font: 500 11.5px/1.2 var(--f-mono, monospace); color: var(--muted, #888); text-decoration: none; white-space: nowrap; }\n" +
      ".sync-dot:hover { border-color: var(--accent, var(--blue, #2a6fdb)); color: var(--ink, inherit); }\n" +
      ".sync-dot-ind { width: 7px; height: 7px; border-radius: 50%; background: var(--muted, #888); opacity: .45; }\n" +
      ".sync-dot-lbl { font-style: normal; }\n" +
      ".sync-dot[data-s='ok'] .sync-dot-ind { background: #3FA66B; opacity: 1; }\n" +
      ".sync-dot[data-s='busy'] .sync-dot-ind { background: #D9A23A; opacity: 1; }\n" +
      ".sync-dot[data-s='err'] .sync-dot-ind { background: #D2524B; opacity: 1; }\n" +
      ".os-read-bar { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: transparent; pointer-events: none; overflow: hidden; }\n" +
      ".os-read-bar > i { display: block; height: 100%; width: 0%; background: var(--accent, var(--blue, #2a6fdb)); transition: width .08s linear; }\n" +
      ".os-drawer-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(10, 16, 24, 0.48); backdrop-filter: blur(2px); display: flex; justify-content: flex-end; }\n" +
      ".os-drawer-backdrop[hidden] { display: none; }\n" +
      ".os-drawer { width: min(460px, 94vw); height: 100%; background: var(--bg, #14171c); color: var(--ink, #e8e6e1); border-left: 1px solid var(--line, rgba(128,128,128,.28)); display: flex; flex-direction: column; box-shadow: -16px 0 40px rgba(0,0,0,.35); }\n" +
      ".os-dr-hd { padding: 14px 18px; border-bottom: 1px solid var(--line, rgba(128,128,128,.25)); display: grid; gap: 10px; }\n" +
      ".os-dr-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }\n" +
      ".os-dr-title { font: 700 15px/1.3 var(--f-body, system-ui, sans-serif); display: flex; align-items: center; gap: 8px; }\n" +
      ".os-dr-close { border: 1px solid var(--line, rgba(128,128,128,.3)); background: transparent; color: inherit; border-radius: 7px; padding: 4px 9px; font: 600 12px/1 var(--f-mono, monospace); cursor: pointer; }\n" +
      ".os-dr-courses { display: flex; gap: 6px; flex-wrap: wrap; }\n" +
      ".os-dr-course-tab { flex: 1; min-width: 96px; padding: 6px 8px; border-radius: 7px; border: 1px solid var(--line, rgba(128,128,128,.28)); text-decoration: none; color: inherit; font: 600 11.5px/1.3 var(--f-mono, monospace); text-align: center; opacity: .78; }\n" +
      ".os-dr-course-tab:hover { opacity: 1; border-color: var(--accent, var(--blue, #2a6fdb)); }\n" +
      ".os-dr-course-tab.on { opacity: 1; border-color: var(--accent, var(--blue, #2a6fdb)); background: color-mix(in srgb, var(--accent, var(--blue, #2a6fdb)) 14%, transparent); }\n" +
      ".os-dr-search { width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--line, rgba(128,128,128,.3)); background: color-mix(in srgb, var(--ink, #111) 4%, transparent); color: inherit; font: 400 13px/1.3 var(--f-body, sans-serif); }\n" +
      ".os-dr-search:focus { outline: none; border-color: var(--accent, var(--blue, #2a6fdb)); }\n" +
      ".os-dr-body { flex: 1; overflow-y: auto; padding: 14px 18px 24px; display: grid; gap: 14px; align-content: start; }\n" +
      ".os-dr-group-hd { font: 700 11px/1.4 var(--f-mono, monospace); color: var(--muted, #888); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }\n" +
      ".os-dr-list { display: grid; gap: 6px; }\n" +
      ".os-dr-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 11px; border-radius: 8px; border: 1px solid var(--line, rgba(128,128,128,.24)); text-decoration: none; color: inherit; transition: border-color .15s, background .15s; }\n" +
      ".os-dr-item:hover { border-color: var(--accent, var(--blue, #2a6fdb)); }\n" +
      ".os-dr-item.cur { border-color: var(--accent, var(--blue, #2a6fdb)); background: color-mix(in srgb, var(--accent, var(--blue, #2a6fdb)) 11%, transparent); }\n" +
      ".os-dr-left { min-width: 0; flex: 1; }\n" +
      ".os-dr-code { font: 700 11.5px/1 var(--f-mono, monospace); color: var(--accent, var(--blue, #2a6fdb)); margin-right: 6px; }\n" +
      ".os-dr-es { font: 700 13px/1.35 var(--f-body, sans-serif); }\n" +
      ".os-dr-zh { display: block; font: 400 11.5px/1.4 var(--f-body, sans-serif); color: var(--muted, #888); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n" +
      ".os-dr-stat { font: 600 11px/1.2 var(--f-mono, monospace); padding: 3px 7px; border-radius: 999px; border: 1px solid var(--line, rgba(128,128,128,.28)); color: var(--muted, #888); white-space: nowrap; flex-shrink: 0; }\n" +
      ".os-dr-stat.done { color: #3FA66B; border-color: rgba(63,166,107,.4); background: rgba(63,166,107,.1); }\n" +
      ".os-dr-stat.started { color: var(--accent, var(--blue, #2a6fdb)); border-color: color-mix(in srgb, var(--accent, var(--blue, #2a6fdb)) 40%, transparent); }\n" +
      ".os-dr-foot { padding: 11px 18px; border-top: 1px solid var(--line, rgba(128,128,128,.25)); display: flex; align-items: center; justify-content: space-between; gap: 8px; font: 500 12px/1.3 var(--f-mono, monospace); }\n" +
      ".os-dr-foot a { color: var(--accent, var(--blue, #2a6fdb)); text-decoration: none; font-weight: 700; }\n" +
      "@media (max-width: 640px) { .sync-dot-lbl, .os-chap-lbl { display: none; } .sync-dot, .os-chap-btn { padding: 4px 8px; } }\n";
    document.head.appendChild(st);
  }

  function getActiveCourseApp() {
    return window.MICRO || window.EMP || window.EI || null;
  }

  var chapBtnCntEl = null;
  var drawerEl = null;
  var drawerFilterQ = "";

  function computeAppProgress(app) {
    if (!app || !Array.isArray(app.chapters)) return { k: 0, n: 0, pct: 0, byCode: {} };
    var obj = (app.state && app.state.obj) || {};
    var quiz = (app.state && app.state.quiz) || {};
    var totalK = 0, totalN = 0, byCode = {};
    app.chapters.forEach(function (ch) {
      if (!ch.ready) return;
      var k = 0;
      Object.keys(obj).forEach(function (id) {
        if (obj[id] && id.indexOf(ch.obj) === 0) k++;
      });
      k = Math.min(k, ch.n);
      totalK += k;
      totalN += ch.n;
      byCode[ch.code] = { k: k, n: ch.n, quiz: quiz[ch.code] || null };
    });
    return {
      k: totalK,
      n: totalN,
      pct: totalN ? Math.round((totalK / totalN) * 100) : 0,
      byCode: byCode
    };
  }

  function refreshCourseShellProgress() {
    var app = getActiveCourseApp();
    if (!app) return;
    var p = computeAppProgress(app);
    if (chapBtnCntEl) chapBtnCntEl.textContent = p.k + "/" + p.n;
    if (drawerEl && !drawerEl.hidden) renderDrawerList();
  }

  function renderDrawerList() {
    if (!drawerEl) return;
    var app = getActiveCourseApp();
    if (!app) return;
    var rt = detectRoute() || { lang: "zh", slug: "", file: "index.html" };
    var en = isEnglishPage();
    var p = computeAppProgress(app);
    var body = drawerEl.querySelector(".os-dr-body");
    if (!body) return;
    var q = drawerFilterQ.trim().toLowerCase();

    var groupsHtml = [];
    (app.temas || []).forEach(function (tm) {
      var chs = (app.chapters || []).filter(function (c) {
        if (!c.ready || c.t !== tm.t) return false;
        if (!q) return true;
        var hay = ((c.code || "") + " " + (c.mods || "") + " " + (c.es || "") + " " + (c.zh || "")).toLowerCase();
        return hay.indexOf(q) >= 0;
      });
      if (!chs.length) return;
      var rows = chs.map(function (ch) {
        var cp = p.byCode[ch.code] || { k: 0, n: ch.n, quiz: null };
        var isCur = rt.file.toLowerCase() === String(ch.file || "").toLowerCase();
        var stCls = cp.k >= cp.n && cp.n > 0 ? "os-dr-stat done" : (cp.k > 0 || cp.quiz ? "os-dr-stat started" : "os-dr-stat");
        var stTxt = (cp.k >= cp.n && cp.n > 0 ? "✓ " : "") + cp.k + "/" + cp.n + (cp.quiz ? " · Q:" + cp.quiz : "");
        return '<a class="os-dr-item' + (isCur ? " cur" : "") + '" href="' + esc(ch.file) + '">' +
          '<div class="os-dr-left">' +
            '<span class="os-dr-code">' + esc(ch.mods || ch.code) + (isCur ? (en ? " · CURRENT" : " · 当前") : "") + '</span>' +
            '<span class="os-dr-es">' + esc(ch.es) + '</span>' +
            '<span class="os-dr-zh">' + esc(ch.zh) + '</span>' +
          '</div>' +
          '<span class="' + stCls + '">' + esc(stTxt) + '</span>' +
        '</a>';
      }).join("");
      groupsHtml.push(
        '<div class="os-dr-group">' +
          '<div class="os-dr-group-hd">' + (en ? "Unit " : "单元 ") + tm.t + " · " + esc(tm.es) + '</div>' +
          '<div class="os-dr-list">' + rows + '</div>' +
        '</div>'
      );
    });

    body.innerHTML = groupsHtml.length
      ? groupsHtml.join("")
      : '<p style="color:var(--muted,#888);font-size:13px;">' + (en ? "No matching chapters found." : "没有找到匹配的章节。") + '</p>';
  }

  function ensureDrawer() {
    if (drawerEl) return drawerEl;
    var rt = detectRoute() || { lang: "zh", slug: "micro", file: "index.html" };
    var en = isEnglishPage();
    var backdrop = document.createElement("div");
    backdrop.className = "os-drawer-backdrop";
    backdrop.hidden = true;

    var tabsHtml = COURSE_META.map(function (cm) {
      var isCur = cm.slug === rt.slug;
      var targetLang = (en && EN_READY.indexOf(cm.slug) >= 0) ? "en" : "zh";
      var href = isCur ? "index.html" : ("../../" + targetLang + "/" + cm.slug + "/index.html");
      return '<a class="os-dr-course-tab' + (isCur ? " on" : "") + '" href="' + esc(href) + '">' +
        '<div>' + esc(cm.code) + '</div>' +
        '<div style="font-size:10px;opacity:.75;font-weight:400;">' + esc(en ? cm.en.split(" ")[0] : cm.zh.split(" ")[0]) + '</div>' +
      '</a>';
    }).join("");

    var portalHref = HOME + (en ? "?lang=en" : "");
    var syncHref = HOME + (en ? "?lang=en#sync" : "#sync");

    backdrop.innerHTML =
      '<aside class="os-drawer" role="dialog" aria-label="' + (en ? "Chapter Index & Series Switcher" : "篇章目录与专题切换") + '">' +
        '<div class="os-dr-hd">' +
          '<div class="os-dr-top">' +
            '<span class="os-dr-title">' + (en ? "Chapter Index & Series Switcher" : "全篇目录与专题切换") + '</span>' +
            '<button type="button" class="os-dr-close">' + (en ? "Close ✕" : "关闭 ✕") + '</button>' +
          '</div>' +
          '<div class="os-dr-courses">' + tabsHtml + '</div>' +
          '<input type="search" class="os-dr-search" placeholder="' + (en ? "Filter chapters by keyword or code…" : "搜索本系列章节（如 UART、PWM、pthread…）") + '">' +
        '</div>' +
        '<div class="os-dr-body"></div>' +
        '<div class="os-dr-foot">' +
          '<a href="' + esc(portalHref) + '">' + (en ? "← NOTES // Index" : "← 返回 NOTES 索引") + '</a>' +
          '<a href="' + esc(syncHref) + '">' + (en ? "Google Cloud Sync →" : "Google 进度云同步 →") + '</a>' +
        '</div>' +
      '</aside>';

    document.body.appendChild(backdrop);
    drawerEl = backdrop;

    var closeBtn = backdrop.querySelector(".os-dr-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { toggleDrawer(false); });
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) toggleDrawer(false);
    });
    var searchInp = backdrop.querySelector(".os-dr-search");
    if (searchInp) {
      searchInp.addEventListener("input", function () {
        drawerFilterQ = searchInp.value || "";
        renderDrawerList();
      });
    }
    return backdrop;
  }

  var chapBtnEl = null;
  function toggleDrawer(force) {
    var dr = ensureDrawer();
    var next = typeof force === "boolean" ? force : dr.hidden;
    dr.hidden = !next;
    if (chapBtnEl) chapBtnEl.setAttribute("aria-expanded", next ? "true" : "false");
    if (next) {
      renderDrawerList();
      var inp = dr.querySelector(".os-dr-search");
      if (inp) setTimeout(function () { inp.focus(); }, 30);
    }
  }

  function setupCourseShell() {
    var topbar = document.querySelector("header.topbar");
    if (!topbar) return;
    injectShellStyles();

    var topbarIn = topbar.querySelector(".topbar-in") || topbar;
    var rt = detectRoute();
    var en = isEnglishPage();

    /* 1. 确保 .crumbs 与 NOTES // 品牌徽标存在 */
    var crumbs = topbarIn.querySelector(".crumbs");
    if (!crumbs) {
      var brand = topbarIn.querySelector("a.brand");
      if (brand) {
        crumbs = document.createElement("span");
        crumbs.className = "crumbs";
        var hub = document.createElement("a");
        hub.className = "hub";
        hub.href = HOME + (en ? "?lang=en" : "");
        hub.title = en ? "Back to NOTES Index" : "返回 NOTES 索引主页";
        hub.textContent = "NOTES //";
        var sep = document.createElement("span");
        sep.className = "sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "/";
        brand.parentNode.insertBefore(crumbs, brand);
        crumbs.appendChild(hub);
        crumbs.appendChild(sep);
        crumbs.appendChild(brand);
      }
    }
    if (crumbs) {
      var hubEl = crumbs.querySelector(".hub");
      if (hubEl) {
        hubEl.href = HOME + (en ? "?lang=en" : "");
        hubEl.title = en ? "Back to NOTES Index" : "返回 NOTES 索引主页";
        hubEl.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +
          '<span>NOTES //</span>';
      }
    }

    /* 1b. 内页去课程化文案修正（不改动静态 HTML 哈希） */
    var homeEyebrow = document.querySelector(".home-head .eyebrow");
    if (homeEyebrow) {
      homeEyebrow.textContent = en ? "NOTES // Interactive Visual Notes" : "NOTES // 互动图解与技术笔记";
    }
    var commFoot = document.querySelector("footer.community-foot");
    if (commFoot) {
      var portalUrl = HOME + (en ? "?lang=en" : "");
      commFoot.innerHTML = en
        ? '<span>NOTES // Interactive Visual Notes &amp; Personal Knowledge Archive</span><a href="' + esc(portalUrl) + '">← Back to NOTES Index</a>'
        : '<span>NOTES // 互动图解与个人知识库</span><a href="' + esc(portalUrl) + '">← 返回 NOTES 总览</a>';
    }

    /* 2. 右侧工具栏：全篇目录抽屉按钮 + 中/EN 切换 + 云同步状态点 */
    var tools = topbarIn.querySelector(".os-top-tools");
    if (!tools) {
      tools = document.createElement("div");
      tools.className = "os-top-tools";
      topbarIn.appendChild(tools);
    }

    var app = getActiveCourseApp();
    if (app && !chapBtnEl) {
      var p = computeAppProgress(app);
      chapBtnEl = document.createElement("button");
      chapBtnEl.type = "button";
      chapBtnEl.className = "os-chap-btn";
      chapBtnEl.setAttribute("aria-expanded", "false");
      chapBtnEl.title = en ? "Open full chapter index & series switcher (Alt+M)" : "展开全篇目录与专题切换 (Alt+M)";
      chapBtnEl.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>' +
        '<span class="os-chap-lbl">' + (en ? "Index" : "全篇目录") + '</span>' +
        '<span class="os-chap-cnt">' + p.k + '/' + p.n + '</span>';
      chapBtnCntEl = chapBtnEl.querySelector(".os-chap-cnt");
      chapBtnEl.addEventListener("click", function () { toggleDrawer(); });
      tools.appendChild(chapBtnEl);
    }

    /* 3. 语言切换（针对已具备 en/<slug>/ 的专题，直接切到同名章节；其余跳回英文门户） */
    if (rt && !tools.querySelector(".os-lang-switch")) {
      var hasEn = EN_READY.indexOf(rt.slug) >= 0;
      var langBox = document.createElement("div");
      langBox.className = "os-lang-switch";
      var zhHref = en ? ("../../zh/" + rt.slug + "/" + rt.file) : rt.file;
      var enHref = hasEn
        ? (en ? rt.file : ("../../en/" + rt.slug + "/" + rt.file))
        : (HOME + "?lang=en");
      var enTitle = hasEn
        ? "Switch this chapter to English"
        : "NOTES // English Index (EMP translated, MICRO/EI in progress)";
      langBox.innerHTML =
        '<a class="' + (!en ? "on" : "") + '" href="' + esc(zhHref) + '" title="中文版本">中</a>' +
        '<a class="' + (en ? "on" : "") + '" href="' + esc(enHref) + '" title="' + esc(enTitle) + '">EN</a>';
      tools.appendChild(langBox);
    }

    /* 4. 将云同步指示点放入工具栏 */
    paintDot();

    /* 5. 章节页底部阅读进度条 */
    if (rt && rt.file !== "index.html" && !topbar.querySelector(".os-read-bar")) {
      var rb = document.createElement("div");
      rb.className = "os-read-bar";
      var barI = document.createElement("i");
      rb.appendChild(barI);
      topbar.appendChild(rb);
      var updateScroll = function () {
        var docEl = document.documentElement;
        var max = docEl.scrollHeight - docEl.clientHeight;
        var pct = max > 40 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
        barI.style.width = pct.toFixed(1) + "%";
      };
      window.addEventListener("scroll", updateScroll, { passive: true });
      updateScroll();
    }

    /* 6. 快捷键：Alt+M 打开目录，Escape 关闭目录 */
    document.addEventListener("keydown", function (e) {
      if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        toggleDrawer();
      } else if (e.key === "Escape" && drawerEl && !drawerEl.hidden) {
        toggleDrawer(false);
      }
    });
  }

  /* ---------- 网络请求与合并 ---------- */
  function token() { return cfg().token || ""; }

  function apply(c, m) {
    if (!m || !m.v || !m.t) return { changed: false, stale: false };
    var d = loadDoc(c) || { v: {}, t: {} };
    var out = { v: {}, t: {} };
    keys(d.t, m.t).forEach(function (k) {
      var tl = Object.prototype.hasOwnProperty.call(d.t, k) ? d.t[k] : -1;
      var tr = Object.prototype.hasOwnProperty.call(m.t, k) ? m.t[k] : -1;
      if (tr > tl) { out.v[k] = val(m.v, k); out.t[k] = tr; }
      else { out.v[k] = val(d.v, k); out.t[k] = tl; }
    });
    saveDoc(c, out);
    var mine = flat(parse(get(c.key), {}));
    var theirs = flat(unflat(out.v));
    var changed = !same(mine, theirs);
    if (changed) put(c.key, JSON.stringify(unflat(out.v)));
    return { changed: changed, stale: !!(c.view && !same(c.view, theirs)) };
  }

  var busy = null, again = false, timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { sync(false); }, 1200);
  }

  function sync(keepalive) {
    if (!token()) { setState("off"); return Promise.resolve(false); }
    if (busy && !keepalive) { again = true; return busy; }
    var sent = seq;
    setState("busy");

    var payloadDocs = {};
    CURSOS.forEach(function (c) { payloadDocs[c.slug] = reconcile(c); });

    var p = fetch(API, {
      method: "POST",
      keepalive: !!keepalive,
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token() },
      body: JSON.stringify({ docs: payloadDocs })
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          var e = new Error("HTTP " + r.status);
          e.status = r.status;
          e.code = j && j.error;
          throw e;
        });
      }
      return r.json();
    }).then(function (j) {
      var docs = (j && j.docs) || {};
      var anyChanged = false, anyStale = false;
      CURSOS.forEach(function (c) {
        if (docs[c.slug]) {
          var res = apply(c, docs[c.slug]);
          if (res.changed) anyChanged = true;
          if (res.stale) anyStale = true;
        }
      });
      setCfg({ last: Date.now(), err: "" });
      if (seq === sent) seq = 0;
      setState("ok");
      refreshCourseShellProgress();
      try { document.dispatchEvent(new CustomEvent("seei-sync", { detail: { changed: anyChanged } })); } catch (e) { /* ignore */ }
      if (anyStale) stale();
      return true;
    }, function (e) {
      var code = e && e.status === 401 ? "auth" : (e && e.code) ? e.code : "net";
      setCfg({ err: code });
      setState("err", code);
      return false;
    });

    if (keepalive) return p;
    busy = p.then(function (ok) {
      busy = null;
      if (again) { again = false; schedule(); }
      return ok;
    });
    return busy;
  }

  /* ---------- Google Identity Services 登录接入 ---------- */
  var gisPromise = null;
  function loadConfig() {
    if (serverConf.loaded) return Promise.resolve(serverConf);
    return fetch(API, { method: "GET", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) {
        serverConf.loaded = true;
        serverConf.configured = !!(j && j.configured);
        serverConf.hasDb = !!(j && j.hasDb);
        serverConf.googleClientId = (j && j.googleClientId) || "";
        try {
          document.dispatchEvent(new CustomEvent("seei-sync-config", { detail: serverConf }));
        } catch (e) { /* ignore */ }
        return serverConf;
      })
      .catch(function () {
        serverConf.loaded = true;
        return serverConf;
      });
  }

  function ensureGisScript() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return Promise.resolve(window.google.accounts.id);
    }
    if (gisPromise) return gisPromise;
    gisPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = function () {
        if (window.google && window.google.accounts && window.google.accounts.id) resolve(window.google.accounts.id);
        else reject(new Error("gis-init"));
      };
      s.onerror = function () { gisPromise = null; reject(new Error("gis-network")); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }

  function handleGoogleCredential(response) {
    if (!response || !response.credential) return Promise.resolve(false);
    setState("busy");
    return fetch(API, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "google-login", idToken: response.credential })
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          var e = new Error("Login failed");
          e.code = (j && j.error) || "auth";
          throw e;
        });
      }
      return r.json();
    }).then(function (j) {
      setCfg({ token: j.token, user: j.user || null, err: "", last: Date.now() });
      var docs = (j && j.docs) || {};
      CURSOS.forEach(function (c) {
        if (docs[c.slug]) apply(c, docs[c.slug]);
      });
      return sync(false);
    }).catch(function (e) {
      setState("err", (e && e.code) || "auth");
      return false;
    });
  }

  var gisInitialized = false;
  function initGoogle() {
    return loadConfig().then(function (conf) {
      if (!conf.googleClientId) return null;
      return ensureGisScript().then(function (gid) {
        if (!gisInitialized) {
          gid.initialize({
            client_id: conf.googleClientId,
            callback: handleGoogleCredential,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          gisInitialized = true;
        }
        return gid;
      });
    });
  }

  function renderGoogleButton(container, opts) {
    if (!container) return Promise.resolve(false);
    return initGoogle().then(function (gid) {
      if (!gid) return false;
      container.innerHTML = "";
      var dark = document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      gid.renderButton(container, Object.assign({
        theme: dark ? "filled_black" : "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        logo_alignment: "left"
      }, opts || {}));
      return true;
    }).catch(function () { return false; });
  }

  /* ---------- 本地备份导出与导入 ---------- */
  function exportBackup() {
    var payload = { version: 1, exportedAt: new Date().toISOString(), activity: parse(get(ACT), {}), courses: {} };
    CURSOS.forEach(function (c) {
      payload.courses[c.slug] = {
        raw: parse(get(c.key), {}),
        sync: reconcile(c)
      };
    });
    return payload;
  }

  function importBackup(data) {
    if (typeof data === "string") data = parse(data, null);
    if (!data || typeof data !== "object" || !data.courses) return false;
    var now = Date.now(), any = false;
    CURSOS.forEach(function (c) {
      var item = data.courses[c.slug];
      if (!item) return;
      if (item.sync && item.sync.v && item.sync.t) {
        apply(c, item.sync);
        any = true;
      } else if (item.raw && typeof item.raw === "object") {
        var fv = flat(item.raw), ft = {};
        Object.keys(fv).forEach(function (k) { ft[k] = now; });
        apply(c, { v: fv, t: ft });
        any = true;
      }
    });
    if (data.activity && data.activity.last) {
      put(ACT, JSON.stringify(data.activity));
    }
    if (any) {
      try { document.dispatchEvent(new CustomEvent("seei-sync", { detail: { changed: true } })); } catch (e) { /* ignore */ }
      if (token()) sync(false);
    }
    return any;
  }

  /* ---------- 其他设备新进度提醒 ---------- */
  var touched = false;
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { touched = true; }, { passive: true, capture: true });
  });
  function stale() {
    var last = 0;
    try { last = +sessionStorage.getItem("open-seei-reload") || 0; } catch (e) { /* ignore */ }
    if (!touched && Date.now() - T0 < 6000 && Date.now() - last > 20000) {
      try { sessionStorage.setItem("open-seei-reload", String(Date.now())); } catch (e) { /* ignore */ }
      location.reload();
      return;
    }
    if (document.querySelector(".sync-toast")) return;
    var en = isEnglishPage();
    var t = document.createElement("div");
    t.className = "sync-toast";
    t.setAttribute("role", "status");
    t.innerHTML = '<span>' + (en ? "New learning progress synced from cloud" : "云端同步了新的学习进度") + '</span><button type="button">' + (en ? "Reload" : "刷新页面") + '</button>';
    t.querySelector("button").addEventListener("click", function () { location.reload(); });
    document.body.appendChild(t);
  }

  document.addEventListener("visibilitychange", function () {
    if (!token()) return;
    if (document.visibilityState === "hidden") { if (seq) { clearTimeout(timer); sync(true); } }
    else if (Date.now() - (cfg().last || 0) > 30000) sync(false);
  });
  window.addEventListener("pagehide", function () { if (token() && seq) { clearTimeout(timer); sync(true); } });

  window.SeeiSync = {
    available: true,
    beforeApp: function () { CURSOS.forEach(function (c) { c.view = flat(parse(get(c.key), {})); }); },
    sync: function () { return sync(false); },
    loadConfig: loadConfig,
    renderGoogleButton: renderGoogleButton,
    promptGoogle: function () {
      return initGoogle().then(function (gid) {
        if (gid) gid.prompt();
        return !!gid;
      });
    },
    logout: function () {
      var u = cfg().user;
      if (u && u.email && window.google && window.google.accounts && window.google.accounts.id) {
        try { window.google.accounts.id.disableAutoSelect(); } catch (e) { /* ignore */ }
      }
      setCfg({ token: "", user: null, err: "", last: 0 });
      setState("off");
    },
    status: function () {
      return {
        state: state,
        code: detail,
        text: text(),
        on: !!token(),
        user: cfg().user || null,
        last: cfg().last || 0,
        server: serverConf
      };
    },
    activity: function () { return parse(get(ACT), {}); },
    exportBackup: exportBackup,
    importBackup: importBackup,
    openSyllabus: function () { toggleDrawer(true); }
  };

  CURSOS.forEach(reconcile);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setupCourseShell();
      paintDot();
    });
  } else {
    setupCourseShell();
    paintDot();
  }
  if (token()) sync(false); else setState("off");
})();
