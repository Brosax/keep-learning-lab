
(function () {
  "use strict";

  var TEMAS = [
    { t: 1, es: "Introducción" },
    { t: 2, es: "Arquitecturas y Tecnologías" },
    { t: 3, es: "Otros aspectos" }
  ];

  var CHAPTERS = [
    { t: 1, code: "M11", file: "m11.html", es: "El mapa del tesoro", zh: "智能环境涉及的技术一张图：处理器、软件层、网络、IA、电源、软硬件协同设计", obj: "1.1.", n: 11, auto: "", ready: true },
    { t: 1, code: "M12", file: "m12.html", es: "Edificios inteligentes", zh: "domótica 与 inmótica、hogar digital、ICT、KNX 和 X10 等楼宇协议、pasarela residencial", obj: "1.2.", n: 10, auto: "", ready: true },
    { t: 1, code: "M13", file: "m13.html", es: "Entornos inteligentes", zh: "普适计算与 AmI、情境感知、瓶颈与伦理、casa inteligente 与 hogar digital", obj: "1.3.", n: 8, auto: "", ready: true },
    { t: 1, code: "M14", file: "m14.html", es: "La Internet de las Cosas y más allá", zh: "IoT 的演变、M2M/CPS/Digital Twin、Big Data、smart grid、smart city、IPv4 与 IPv6", obj: "1.4.", n: 7, auto: "", ready: true },
    { t: 2, code: "M21", file: "m21.html", es: "Arquitectura de un entorno inteligente", zh: "中间件、服务发现、语义网、OSGi，以及 Gator 智能屋的分层", obj: "2.1.", n: 6, auto: "", ready: true },
    { t: 2, code: "M22", file: "m22.html", es: "Sensores y actuadores", zh: "传感器分类、MEMS、传感器融合、IMU、可穿戴设备", obj: "2.2.", n: 7, auto: "", ready: true },
    { t: 2, code: "M23", file: "m23.html", es: "Redes", zh: "fog 与 cloud、WSN、white space、MAC 与路由、IPSO、IMT-2020、SDN/NFV", obj: "2.3.", n: 9, auto: "", ready: true },
    { t: 2, code: "M24", file: "m24.html", es: "Localización", zh: "室内外定位技术、RTLS 与近场方案、BLE/WiFi/UWB/RFID 对比", obj: "2.4.", n: 4, auto: "", ready: true },
    { t: 2, code: "M25", file: "m25.html", es: "Nodos", zh: "节点类型、ARM 家族、8/32 位 MCU、MCU/FPGA/SoC/DSP/ASIP", obj: "2.5.", n: 5, auto: "", ready: true },
    { t: 2, code: "M26", file: "m26.html", es: "Consumo energético", zh: "电化学储能、mota 功耗、占空比、能量收集、电池续航计算", obj: "2.6.", n: 6, auto: "", ready: true },
    { t: 3, code: "M31", file: "m31.html", es: "Inteligencia", zh: "IA 的定义、强 IA 与弱 IA、Turing 测试、IA 技术、智能体与环境、神经网络", obj: "3.1.", n: 8, auto: "", ready: true },
    { t: 3, code: "M32", file: "m32.html", es: "Interacción", zh: "触觉、语音对话、手势、情绪、多模态、眼动与 BCI、情感计算、IPA、Web 3D", obj: "3.2.", n: 11, auto: "", ready: true },
    { t: 3, code: "M33", file: "m33.html", es: "Privacidad y seguridad", zh: "隐私和安全问题、seguridad/privacidad/confiabilidad、生物识别、加密的软硬件实现", obj: "3.3.", n: 6, auto: "", ready: true },
    { t: 3, code: "M34", file: "m34.html", es: "Normativa y estándares", zh: "de facto 与 de iure、标准化组织与厂商联盟、AENOR", obj: "3.4.", n: 4, auto: "", ready: true },
    { t: 3, code: "M35", file: "m35.html", es: "Aplicaciones I", zh: "智能交通与 eCall、车联网通信标准、smart house、e-salud 与 Digital Twin", obj: "3.5.", n: 6, auto: "", ready: true },
    { t: 3, code: "M36", file: "m36.html", es: "Aplicaciones II", zh: "智能电表、Santander 智慧城市、Iberdrola 智能电网、农业 WSN", obj: "3.6.", n: 5, auto: "", ready: true },
  ];

  
  var KEY = "ei-web-v1";
  var state = { obj: {}, quiz: {}, banco: {} };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.obj = parsed.obj || {};
      state.quiz = parsed.quiz || {};
      state.banco = parsed.banco || {};
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
        var n = el("a", { "class": "node" + (any ? " ready" : " soon"), href: "index.html#tema" + tm.t, title: "Tema " + tm.t + " · " + tm.es });
        n.innerHTML = '<span class="dot"></span>T' + tm.t;
        nav.appendChild(n);
      });
      return;
    }
    var t = CHAPTERS[i].t;
    var lab = el("a", { "class": "node tema-lbl", href: "index.html#tema" + t, title: "Tema " + t + " · " + TEMAS[t - 1].es });
    lab.innerHTML = '<span class="tl">T' + t + "</span>Tema";
    nav.appendChild(lab);
    CHAPTERS.forEach(function (ch) {
      if (ch.t !== t) return;
      var cls = "node" + (ch.ready ? " ready" : " soon") + (ch.code === cur ? " current" : "");
      var n;
      if (ch.ready) {
        n = el("a", { "class": cls, href: ch.file, title: ch.code + " " + ch.es });
        if (ch.code === cur) n.setAttribute("aria-current", "page");
      } else {
        n = el("span", { "class": cls, title: ch.code + " " + ch.es + "（即将生成）", "aria-disabled": "true" });
      }
      n.innerHTML = '<span class="dot"></span>' + ch.code;
      nav.appendChild(n);
    });
  });

  
  $$("[data-pager]").forEach(function (box) {
    var i = find(box.getAttribute("data-pager"));
    var prev = i > 0 ? CHAPTERS[i - 1] : null;
    var next = i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : null;
    var p = prev && prev.ready
      ? el("a", { href: prev.file, "class": "prev" }, '<span class="dir">← 上一章 · ' + prev.code + '</span><span class="ttl">' + prev.es + "</span>")
      : el("a", { href: "index.html", "class": "prev" }, '<span class="dir">← 返回主页</span><span class="ttl">EI · 课程总览</span>');
    box.appendChild(p);
    var nx;
    if (!next) {
      nx = el("a", { href: "index.html", "class": "next" }, '<span class="dir">全部章节结束 · 返回主页 →</span><span class="ttl">EI · 课程总览</span>');
    } else if (next.ready) {
      var cross = next.t !== CHAPTERS[i].t ? "Tema " + next.t + " · " : "";
      nx = el("a", { href: next.file, "class": "next" }, '<span class="dir">下一章 · ' + cross + next.code + ' →</span><span class="ttl">' + next.es + "</span>");
    } else {
      nx = el("span", { "class": "next soon", "aria-disabled": "true" }, '<span class="dir">下一章 · ' + next.code + ' · 即将生成</span><span class="ttl">' + next.es + "</span>");
    }
    box.appendChild(nx);
  });

  
  function refreshMeters() {
    $$("[data-meter]").forEach(function (m) {
      var key = m.getAttribute("data-meter");
      var list = key === "ALL" ? CHAPTERS
        : /^T\d$/.test(key) ? CHAPTERS.filter(function (c) { return "T" + c.t === key; })
        : [CHAPTERS[find(key)]].filter(Boolean);
      if (!list.length) return;
      var k = 0, n = 0;
      list.forEach(function (ch) { k += mastered(ch); n += ch.n; });
      var bar = $(".bar i", m);
      if (bar) bar.style.width = Math.round((k / n) * 100) + "%";
      var t = $(".val", m);
      if (t) t.textContent = k + " / " + n + " 已掌握";
    });
  }
  $$(".chk[data-obj]").forEach(function (b) {
    var id = b.getAttribute("data-obj");
    var set = function (on) {
      b.setAttribute("aria-pressed", on ? "true" : "false");
      $(".lab", b).textContent = on ? "已掌握" : "标记掌握";
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
      var pill = !ch.ready ? '<span class="pill wait">即将生成</span>'
        : (k === ch.n ? '<span class="pill done">目标全部掌握</span>' : '<span class="pill go">可以学了</span>');
      var foot = ch.ready
        ? "<span>" + k + "/" + ch.n + " 目标" + (best != null ? " · 自测最佳 " + best : "") + "</span><span>" + ch.auto + "</span>"
        : "<span>" + ch.n + " 个学习目标</span><span>" + ch.auto + "</span>";
      var inner = '<div class="row"><span class="code">' + ch.code + "</span>" + pill + "</div>" +
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
    if (big) big.textContent = days > 0 ? days : (days === 0 ? "今天" : "—");
  });
  $$("[data-timeline]").forEach(function (tl) {
    var a = parse(tl.getAttribute("data-from")), b = parse(tl.getAttribute("data-to"));
    var t = today();
    if (t < a || t > b) return;
    var pct = ((t - a) / (b - a)) * 100;
    var m = el("div", { "class": "tl-today" }, "<span>今天</span>");
    m.style.left = pct + "%";
    tl.appendChild(m);
    $$(".tl-seg[data-start]", tl).forEach(function (s) {
      var s0 = parse(s.getAttribute("data-start")), s1 = parse(s.getAttribute("data-end"));
      if (t >= s0 && t <= s1) s.classList.add("now");
    });
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
    show(btns[0].getAttribute("data-view"));
  });

  
  $$("tr.reveal").forEach(function (tr) {
    tr.tabIndex = 0;
    var t = function () { tr.classList.toggle("open"); };
    tr.addEventListener("click", t);
    tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } });
  });

  
  $$(".card").forEach(function (c) {
    var front = $(".front", c), back = $(".back", c), cue = $(".flipcue", c);
    function set(on) {
      c.setAttribute("aria-pressed", on ? "true" : "false");
      front.hidden = on; back.hidden = !on;
      if (cue) cue.textContent = on ? "点击翻回" : "点击翻面";
    }
    set(false);
    c.addEventListener("click", function () { set(c.getAttribute("aria-pressed") !== "true"); });
  });

  
  $$(".match").forEach(function (m) {
    var sel = null, done = 0;
    var lefts = $$("[data-l]", m), rights = $$("[data-r]", m);
    var status = $(".match-status", m.parentNode);
    function upd() { if (status) status.textContent = done === lefts.length ? "全部配对正确 ✓" : "已配对 " + done + " / " + lefts.length; }
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

  
  $$(".quiz[data-quiz]").forEach(function (qz) {
    var code = qz.getAttribute("data-quiz");
    var qs = $$(".q", qz);
    var scoreBox = $("[data-score]", qz.parentNode);
    var answered = 0, right = 0;
    function updScore() {
      if (!scoreBox) return;
      var t = $(".val", scoreBox);
      t.textContent = answered === qs.length
        ? "得分 " + right + " / " + qs.length + (right === qs.length ? " · 全对" : "")
        : "已答 " + answered + " / " + qs.length + " · 答对 " + right;
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
    if (typeof HTMLDialogElement !== "function") return;   // 不支持就保留普通链接（新标签页打开）
    var dlg = null, lastLink = null;
    function build() {
      dlg = document.createElement("dialog");
      dlg.className = "lightbox";
      dlg.setAttribute("aria-label", "图片");
      dlg.innerHTML = '<button type="button" class="lb-close">关闭 ✕</button>' +
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

  
  $$("[data-needs]").forEach(function (n) {
    n.hidden = true;
    try {
      fetch(n.getAttribute("data-needs"), { method: "HEAD", cache: "no-store" })
        .then(function (r) { if (r.ok) n.hidden = false; })
        .catch(function () {  });
    } catch (e) {  }
  });
  $$("[data-banco-sim]").forEach(function (n) {
    if (state.banco.sim) n.textContent = "模拟最佳 " + state.banco.sim;
  });

  refreshMeters();
  window.EI = { chapters: CHAPTERS, state: state, persist: persist };
})();
