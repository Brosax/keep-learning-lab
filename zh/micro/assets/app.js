
(function () {
  "use strict";

  var TEMAS = [
    { t: 1, es: "Aspectos básicos del MSP430F5529 y E/S por sondeo" },
    { t: 2, es: "Interrupciones, reloj y bajo consumo" },
    { t: 3, es: "Temporizadores y comunicaciones serie" },
    { t: 4, es: "Otras arquitecturas: ESP32-S3" }
  ];

  var CHAPTERS = [
    { t: 1, code: "M11", mods: "M11", file: "m11.html", es: "La CPU y el modelo de memoria", zh: "MSP430 家族、Von Neumann、内存映射、R0–R15 与 SR、栈、小端序", obj: "M11.", n: 10, auto: "", ready: true },
    { t: 1, code: "M12", mods: "M12–M13", file: "m12.html", es: "Sistema de desarrollo", zh: "LaunchPad 与 eZ-FET、抽象层级、编译 → 汇编 → 链接、CCS 调试", obj: "M12.", n: 10, auto: "", ready: true },
    { t: 1, code: "M14", mods: "M14–M16", file: "m14.html", es: "Puertos de E/S y sondeo", zh: "PxDIR/PxIN/PxOUT/PxREN/PxSEL、位运算、按钮与 LED、轮询", obj: "M14.", n: 9, auto: "", ready: true },
    { t: 2, code: "M21", mods: "M21–M23", file: "m21.html", es: "Interrupciones", zh: "事件 → flag → 使能 → GIE、三类中断、8 个步骤、向量表、在 CCS 里写 ISR、P1IV、短 ISR", obj: "M21.", n: 10, auto: "", ready: true },
    { t: 2, code: "M24", mods: "M24–M25", file: "m24.html", es: "Sistema de reloj (UCS)", zh: "VLO/REFO/XT1/XT2/DCO、FLL、ACLK/MCLK/SMCLK、默认配置、振荡器故障", obj: "M24.", n: 10, auto: "", ready: true },
    { t: 2, code: "M26", mods: "M26–M27", file: "m26.html", es: "Modos de bajo consumo", zh: "LPM0–LPM4.5、SR 的 SCG1/SCG0/OSCOFF/CPUOFF、唤醒与 on_exit、电流与续航", obj: "M26.", n: 10, auto: "", ready: true },
    { t: 2, code: "M28", mods: "M28", file: "m28.html", es: "Arquitecturas de programación", zh: "无限循环、循环 + 中断、加低功耗、调度器、RTOS", obj: "M28.", n: 6, auto: "", ready: true },
    { t: 3, code: "M31", mods: "M31", file: "m31.html", es: "Temporizadores", zh: "Timer_A 结构、TASSEL/ID/IDEX、up/continuous/up-down、比较模式、TAxIV", obj: "M31.", n: 9, auto: "", ready: true },
    { t: 3, code: "M32", mods: "M32", file: "m32.html", es: "PWM", zh: "输出单元、OUTMOD 0–7、占空比公式、方波频率", obj: "M32.", n: 9, auto: "", ready: true },
    { t: 3, code: "M33", mods: "M33", file: "m33.html", es: "Comunicaciones serie", zh: "并行与串行、同步与异步、SPI 与 I2C、UART 帧、RS-232", obj: "M33.", n: 9, auto: "", ready: true },
    { t: 3, code: "M34", mods: "M34", file: "m34.html", es: "USCI en modo UART", zh: "USCI_A/B、波特率发生器、UCOS16 与调制、初始化顺序、UCAxIV、driverlib", obj: "M34.", n: 10, auto: "", ready: true },
    { t: 4, code: "M41", mods: "M41–M44", file: "m41.html", es: "ESP32-S3", zh: "Xtensa LX7 双核、Wi-Fi + BLE、DevKitC-1、ESP-IDF 与调试链", obj: "M41.", n: 8, auto: "", ready: true }
  ];

  
  var KEY = "micro-web-v1";
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
        var n = el("a", { "class": "node" + (any ? " ready" : " soon"), href: "index.html#bloque" + tm.t, title: "Bloque " + tm.t + " · " + tm.es });
        n.innerHTML = '<span class="dot"></span>B' + tm.t;
        nav.appendChild(n);
      });
      return;
    }
    var t = CHAPTERS[i].t;
    var lab = el("a", { "class": "node tema-lbl", href: "index.html#bloque" + t, title: "Bloque " + t + " · " + TEMAS[t - 1].es });
    lab.innerHTML = '<span class="tl">B' + t + "</span>Bloque";
    nav.appendChild(lab);
    CHAPTERS.forEach(function (ch) {
      if (ch.t !== t) return;
      var cls = "node" + (ch.ready ? " ready" : " soon") + (ch.code === cur ? " current" : "");
      var n;
      if (ch.ready) {
        n = el("a", { "class": cls, href: ch.file, title: ch.mods + " " + ch.es });
        if (ch.code === cur) n.setAttribute("aria-current", "page");
      } else {
        n = el("span", { "class": cls, title: ch.mods + " " + ch.es + "（即将生成）", "aria-disabled": "true" });
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
      p = el("a", { href: prev.file, "class": "prev" }, '<span class="dir">← 上一章 · ' + prev.mods + '</span><span class="ttl">' + prev.es + "</span>");
    } else if (prev) {
      p = el("span", { "class": "prev soon", "aria-disabled": "true" }, '<span class="dir">← 上一章 · ' + prev.mods + ' · 即将生成</span><span class="ttl">' + prev.es + "</span>");
    } else {
      p = el("a", { href: "index.html", "class": "prev" }, '<span class="dir">← 返回主页</span><span class="ttl">MICRO · 课程总览</span>');
    }
    box.appendChild(p);
    var nx;
    if (!next) {
      nx = el("a", { href: "index.html", "class": "next" }, '<span class="dir">全部章节结束 · 返回主页 →</span><span class="ttl">MICRO · 课程总览</span>');
    } else if (next.ready) {
      var cross = next.t !== CHAPTERS[i].t ? "Bloque " + next.t + " · " : "";
      nx = el("a", { href: next.file, "class": "next" }, '<span class="dir">下一章 · ' + cross + next.mods + ' →</span><span class="ttl">' + next.es + "</span>");
    } else {
      nx = el("span", { "class": "next soon", "aria-disabled": "true" }, '<span class="dir">下一章 · ' + next.mods + ' · 即将生成</span><span class="ttl">' + next.es + "</span>");
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
      if (t) t.textContent = n ? k + " / " + n + " 已掌握" : "本 Bloque 还没有生成章节";
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
        : (k === ch.n ? '<span class="pill done">要点全部掌握</span>' : '<span class="pill go">可以学了</span>');
      var foot = ch.ready
        ? "<span>" + k + "/" + ch.n + " 要点" + (best != null ? " · 自测最佳 " + best : "") + "</span><span>" + ch.auto + "</span>"
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
    if (big) big.textContent = days > 0 ? days : (days === 0 ? "今天" : "—");
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
    var m = el("div", { "class": "tl-today" }, "<span>今天</span>");
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

  refreshMeters();
  window.MICRO = { chapters: CHAPTERS, temas: TEMAS, state: state, persist: persist };
})();
