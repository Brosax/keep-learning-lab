
(function () {
  "use strict";

  var TEMAS = [
    { t: 1, es: "Sistemas empotrados, ARM y Linux embebido" },
    { t: 2, es: "Multitarea: procesos y threads" },
    { t: 3, es: "Señales y temporización POSIX" },
    { t: 4, es: "Comunicaciones: sockets" }
  ];

  var CHAPTERS = [
    { t: 1, code: "T1", mods: "Tema 1", file: "t1.html", es: "Sistemas empotrados, ARM y Linux embebido", zh: "Embedded systems & MPUs, ARM architecture & Thumb, embedded Linux, cross-compilation toolchain, Buildroot, Raspberry Pi", obj: "T1.", n: 10, auto: "", ready: true },
    { t: 2, code: "T2", mods: "Tema 2", file: "t2.html", es: "Multitarea: procesos y threads", zh: "Multitasking: processes & threads, fork/exec/wait, pthread_create/join, race conditions, mutexes, semaphores, condition variables, scheduling", obj: "T2.", n: 10, auto: "", ready: true },
    { t: 3, code: "T3", mods: "Tema 3", file: "t3.html", es: "Señales y temporización POSIX", zh: "Signals & POSIX timers: signal handlers, sigaction, signal masks, real-time signals, POSIX clocks, nanosleep, timer_create/timer_settime, drift", obj: "T3.", n: 10, auto: "", ready: true },
    { t: 4, code: "T4", mods: "Tema 4", file: "t4.html", es: "Comunicaciones: sockets", zh: "Communications: sockets, TCP/IP layering, addresses & byte order, TCP server/client, UDP, blocking & select, HTTP basics", obj: "T4.", n: 10, auto: "", ready: true }
  ];

  
  var KEY = "emp-web-v1";
  var state = { obj: {}, quiz: {}, drill: {}, banco: {}, exam: {} };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.obj = parsed.obj || {};
      state.quiz = parsed.quiz || {};
      state.drill = parsed.drill || {};
      state.banco = parsed.banco || {};
      state.exam = parsed.exam || {};
    }
  } catch (e) {  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {  } }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function mastered(ch) {
    return Object.keys(state.obj).filter(function (k) { return state.obj[k] && k.indexOf(ch.obj) === 0; }).length;
  }
  function find(code) { for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].code === code) return i; return -1; }

  
  $$("[data-chain]").forEach(function (nav) {
    var cur = nav.getAttribute("data-chain");
    var i = find(cur);
    if (i < 0) {
      TEMAS.forEach(function (tm) {
        var any = CHAPTERS.some(function (c) { return c.t === tm.t && c.ready; });
        var n = el("a", { "class": "node" + (any ? " ready" : " soon"), href: "index.html#bloque" + tm.t, title: "Tema " + tm.t + " · " + tm.es });
        n.innerHTML = '<span class="dot"></span>B' + tm.t;
        nav.appendChild(n);
      });
      return;
    }
    var t = CHAPTERS[i].t;
    var lab = el("a", { "class": "node tema-lbl", href: "index.html#bloque" + t, title: "Tema " + t + " · " + TEMAS[t - 1].es });
    lab.innerHTML = '<span class="tl">B' + t + "</span>Tema";
    nav.appendChild(lab);
    CHAPTERS.forEach(function (ch) {
      if (ch.t !== t) return;
      var cls = "node" + (ch.ready ? " ready" : " soon") + (ch.code === cur ? " current" : "");
      var n;
      if (ch.ready) {
        n = el("a", { "class": cls, href: ch.file, title: ch.mods + " " + ch.es });
        if (ch.code === cur) n.setAttribute("aria-current", "page");
      } else {
        n = el("span", { "class": cls, title: ch.mods + " " + ch.es + " (Coming soon)", "aria-disabled": "true" });
      }
      n.innerHTML = '<span class="dot"></span>' + ch.code;
      nav.appendChild(n);
    });
  });

  
  $$("[data-pager]").forEach(function (box) {
    var i = find(box.getAttribute("data-pager"));
    var prev = i > 0 ? CHAPTERS[i - 1] : null;
    var next = i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : null;
    var p;
    if (prev && prev.ready) {
      p = el("a", { href: prev.file, "class": "prev" }, '<span class="dir">← Previous · ' + prev.mods + '</span><span class="ttl">' + prev.es + "</span>");
    } else if (prev) {
      p = el("span", { "class": "prev soon", "aria-disabled": "true" }, '<span class="dir">← Previous · ' + prev.mods + ' · Coming soon</span><span class="ttl">' + prev.es + "</span>");
    } else {
      p = el("a", { href: "index.html", "class": "prev" }, '<span class="dir">← Back to Overview</span><span class="ttl">EMP · Course Overview</span>');
    }
    box.appendChild(p);
    var nx;
    if (!next) {
      nx = el("a", { href: "index.html", "class": "next" }, '<span class="dir">End of course · Back to overview →</span><span class="ttl">EMP · Course Overview</span>');
    } else if (next.ready) {
      var cross = next.t !== CHAPTERS[i].t ? "Tema " + next.t + " · " : "";
      nx = el("a", { href: next.file, "class": "next" }, '<span class="dir">Next chapter · ' + cross + next.mods + ' →</span><span class="ttl">' + next.es + "</span>");
    } else {
      nx = el("span", { "class": "next soon", "aria-disabled": "true" }, '<span class="dir">Next chapter · ' + next.mods + ' · Coming soon</span><span class="ttl">' + next.es + "</span>");
    }
    box.appendChild(nx);
  });

  
  function refreshMeters() {
    $$("[data-meter]").forEach(function (m) {
      var key = m.getAttribute("data-meter");
      var list = key === "ALL" ? CHAPTERS
        : /^B\d$/.test(key) ? CHAPTERS.filter(function (c) { return "B" + c.t === key; })
        : [CHAPTERS[find(key)]].filter(Boolean);
      list = list.filter(function (c) { return c.ready; });
      var k = 0, n = 0;
      list.forEach(function (ch) { k += mastered(ch); n += ch.n; });
      var bar = $(".bar i", m);
      if (bar) bar.style.width = (n ? Math.round((k / n) * 100) : 0) + "%";
      var t = $(".val", m);
      if (t) t.textContent = n ? k + " / " + n + " Mastered" : "No chapters generated yet for this Tema";
    });
  }
  $$(".chk[data-obj]").forEach(function (b) {
    var id = b.getAttribute("data-obj");
    var set = function (on) {
      b.setAttribute("aria-pressed", on ? "true" : "false");
      $(".lab", b).textContent = on ? "Mastered" : "Mark as mastered";
    };
    set(!!state.obj[id]);
    b.addEventListener("click", function () {
      state.obj[id] = !state.obj[id];
      set(state.obj[id]);
      persist();
      refreshMeters();
    });
  });

  
  $$("[data-chapters]").forEach(function (grid) {
    var only = +grid.getAttribute("data-chapters");
    CHAPTERS.forEach(function (ch) {
      if (only && ch.t !== only) return;
      var k = mastered(ch);
      var best = state.quiz[ch.code];
      var pill = !ch.ready ? '<span class="pill wait">Coming soon</span>'
        : (k === ch.n ? '<span class="pill done">All Key Points Mastered</span>' : '<span class="pill go">Ready to Learn</span>');
      var foot = ch.ready
        ? "<span>" + k + "/" + ch.n + " Key Points" + (best != null ? " · Best Self-Test " + best : "") + "</span><span>" + ch.auto + "</span>"
        : "<span>" + ch.mods + "</span><span>" + ch.auto + "</span>";
      var inner = '<div class="row"><span class="code">' + ch.mods + "</span>" + pill + "</div>" +
        "<h3>" + ch.es + "</h3><p>" + ch.zh + '</p><div class="foot">' + foot + "</div>";
      var card = ch.ready ? el("a", { "class": "chcard", href: ch.file }, inner) : el("div", { "class": "chcard soon", "aria-disabled": "true" }, inner);
      grid.appendChild(card);
    });
  });

  
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  $$("[data-countdown]").forEach(function (c) {
    var days = Math.round((parse(c.getAttribute("data-countdown")) - today()) / 864e5);
    var big = $(".big", c);
    if (big) big.textContent = days > 0 ? days : (days === 0 ? "Today" : "—");
    var sub = $(".sub", c);
    if (sub && days <= 0) sub.innerHTML = days === 0 ? "" : "";
  });
  $$("[data-timeline]").forEach(function (tl) {
    var a = parse(tl.getAttribute("data-from")), b = parse(tl.getAttribute("data-to"));
    var t = today();
    $$(".tl-seg[data-start]", tl).forEach(function (s) {
      var s0 = parse(s.getAttribute("data-start")), s1 = parse(s.getAttribute("data-end"));
      if (t >= s0 && t <= s1) s.classList.add("now");
    });
    if (t < a || t > b) return;
    
    var seg = $(".tl-seg.now", tl);
    if (!seg) return;
    var s0 = parse(seg.getAttribute("data-start")), s1 = parse(seg.getAttribute("data-end"));
    var f = (t - s0) / ((s1 - s0) + 864e5);
    var m = el("div", { "class": "tl-today" }, "<span>Today</span>");
    m.style.left = ((seg.offsetLeft + f * seg.offsetWidth) / tl.clientWidth * 100) + "%";
    tl.appendChild(m);
  });

  
  $$("[data-explain]").forEach(function (box) {
    var hots = $$("[data-key]", box);
    var panels = $$("[data-panel]", box);
    function show(key) {
      hots.forEach(function (h) {
        var on = h.getAttribute("data-key") === key;
        h.classList.toggle("on", on);
        if (h.hasAttribute("aria-pressed")) h.setAttribute("aria-pressed", on ? "true" : "false");
      });
      panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== key; });
    }
    hots.forEach(function (h) {
      h.addEventListener("click", function () { show(h.getAttribute("data-key")); });
      h.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(h.getAttribute("data-key")); }
      });
    });
    var first = box.getAttribute("data-explain");
    if (first) show(first);
  });

  
  $$("[data-seg]").forEach(function (box) {
    var btns = $$("[data-view]", box);
    var panes = $$("[data-pane]", box);
    function show(v) {
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === v ? "true" : "false"); });
      panes.forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== v; });
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-view")); }); });
    if (btns.length) show(btns[0].getAttribute("data-view"));
  });

  
  $$("tr.reveal").forEach(function (tr) {
    tr.tabIndex = 0;
    var t = function () { tr.classList.toggle("open"); };
    tr.addEventListener("click", t);
    tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } });
  });

  
  $$(".match").forEach(function (m) {
    var sel = null, done = 0;
    var lefts = $$("[data-l]", m), rights = $$("[data-r]", m);
    var status = $(".match-status", m.parentNode);
    function upd() { if (status) status.textContent = done === lefts.length ? "All matched correctly ✓" : "Matched " + done + " / " + lefts.length; }
    upd();
    lefts.forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.classList.contains("done")) return;
        lefts.forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel"); sel = b;
      });
    });
    rights.forEach(function (b) {
      b.addEventListener("click", function () {
        if (!sel || b.classList.contains("done")) return;
        if (sel.getAttribute("data-l") === b.getAttribute("data-r")) {
          sel.classList.remove("sel"); sel.classList.add("done"); b.classList.add("done");
          sel.disabled = true; b.disabled = true; sel = null; done++; upd();
        } else {
          b.classList.add("err");
          setTimeout(function () { b.classList.remove("err"); }, 600);
        }
      });
    });
  });

  
  $$(".card").forEach(function (c) {
    var front = $(".front", c), back = $(".back", c), cue = $(".flipcue", c);
    function set(on) {
      c.setAttribute("aria-pressed", on ? "true" : "false");
      front.hidden = on; back.hidden = !on;
      if (cue) cue.textContent = on ? "Click to flip back" : "Click to flip";
    }
    set(false);
    c.addEventListener("click", function () { set(c.getAttribute("aria-pressed") !== "true"); });
  });

  
  $$(".quiz[data-quiz]").forEach(function (qz) {
    var code = qz.getAttribute("data-quiz");
    var qs = $$(".q", qz);
    var scoreBox = $("[data-score]", qz.parentNode);
    var answered = 0, right = 0;
    function updScore() {
      if (!scoreBox) return;
      var t = $(".val", scoreBox);
      t.textContent = answered === qs.length
        ? "Score " + right + " / " + qs.length + (right === qs.length ? " · Perfect" : "")
        : "Answered " + answered + " / " + qs.length + " · Correct " + right;
    }
    qs.forEach(function (q) {
      var ans = q.getAttribute("data-a");
      var btns = $$(".opts button", q);
      var why = $(".why", q);
      if (why) why.hidden = true;
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          var ok = b.getAttribute("data-o") === ans;
          btns.forEach(function (x) {
            x.disabled = true;
            if (x.getAttribute("data-o") === ans) x.classList.add("right");
          });
          if (!ok) b.classList.add("wrong");
          if (why) why.hidden = false;
          answered++; if (ok) right++;
          updScore();
          if (answered === qs.length) {
            var prev = state.quiz[code];
            var cur = right + "/" + qs.length;
            if (prev == null || right > parseInt(prev, 10)) { state.quiz[code] = cur; persist(); }
          }
        });
      });
    });
    var reset = scoreBox && $("button", scoreBox);
    if (reset) reset.addEventListener("click", function () {
      answered = 0; right = 0;
      qs.forEach(function (q) {
        $$(".opts button", q).forEach(function (x) { x.disabled = false; x.classList.remove("right", "wrong"); });
        var why = $(".why", q); if (why) why.hidden = true;
      });
      updScore();
    });
    updScore();
  });

  
  window.MICROMath = function () {
    var MJ = window.MathJax;
    if (!MJ || !MJ.typesetPromise) return;
    var nodes = $$("[data-tex]");
    nodes.forEach(function (n) {
      var inline = n.classList.contains("m");
      n.setAttribute("data-fallback", n.innerHTML);
      n.textContent = (inline ? "\\(" : "\\[") + n.getAttribute("data-tex") + (inline ? "\\)" : "\\]");
    });
    MJ.typesetPromise(nodes).catch(function () {
      nodes.forEach(function (n) { n.innerHTML = n.getAttribute("data-fallback"); });
    });
  };

  
  function openTarget() {
    var id = decodeURIComponent((location.hash || "").slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var opened = false;
    for (var p = el; p; p = p.parentElement) {
      if (p.tagName === "DETAILS" && !p.open) { p.open = true; opened = true; }
    }
    if (opened) el.scrollIntoView();
  }
  window.addEventListener("hashchange", openTarget);
  openTarget();

  
  (function () {
    if (typeof HTMLDialogElement !== "function") return;   // Fallback to normal links if dialog is unsupported
    var dlg = null, lastLink = null;
    function build() {
      dlg = document.createElement("dialog");
      dlg.className = "lightbox";
      dlg.setAttribute("aria-label", "Image");
      dlg.innerHTML = '<button type="button" class="lb-close">Close ✕</button>' +
        '<div class="lb-wrap"><div class="lb-img"><img alt=""></div><p class="lb-cap"></p></div>';
      document.body.appendChild(dlg);
      $(".lb-close", dlg).addEventListener("click", function () { dlg.close(); });
      $(".lb-img", dlg).addEventListener("click", function (e) { e.stopPropagation(); dlg.classList.toggle("zoom"); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.classList.contains("lb-wrap")) dlg.close(); });
      dlg.addEventListener("close", function () { dlg.classList.remove("zoom"); if (lastLink) lastLink.focus(); });
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a.orig") : null;
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (!dlg) build();
      var img = $("img", a), fig = a.closest("figure"), cap = fig ? $("figcaption", fig) : null;
      var big = $(".lb-img img", dlg);
      big.src = a.getAttribute("href");
      big.alt = img ? img.alt : "";
      $(".lb-cap", dlg).textContent = cap ? cap.textContent : "";
      lastLink = a;
      dlg.showModal();
      $(".lb-close", dlg).focus();
    });
  })();

  refreshMeters();
  window.MICRO = { chapters: CHAPTERS, temas: TEMAS, state: state, persist: persist };
})();
