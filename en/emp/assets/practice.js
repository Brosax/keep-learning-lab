
(function () {
  "use strict";

  function hex(v, w) { var s = (v >>> 0).toString(16).toUpperCase(); while (s.length < (w || 4)) s = "0" + s; return "0x" + s; }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function int(rnd, a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function fmt(x, d) { var r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d); return String(r); }
  function grp(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  
  var PERIODS = [5, 10, 20, 25, 40, 50, 100, 125, 200, 250, 400, 500, 750, 1500, 2500, 3200];

  var GEN = {
    
    ts: {
      title: "Adding timespec (with carry)",
      make: function (rnd) {
        var s = int(rnd, 10, 900), ns = int(rnd, 100, 999) * 1e6 + int(rnd, 0, 999) * 1e3;
        var p = pick(rnd, PERIODS), pns = p * 1e6;
        var tot = ns + pns, carry = Math.floor(tot / 1e9), ns2 = tot % 1e9, s2 = s + carry;
        var ask = pick(rnd, ["sec", "nsec"]);
        return { kind: "dec", ans: ask === "sec" ? s2 : ns2,
          q: "Next expiration time = current <code>{ tv_sec = " + s + ", tv_nsec = " + grp(ns) + " }</code> plus period <b>" + p + " ms</b>. What is the resulting <b>" + (ask === "sec" ? "tv_sec" : "tv_nsec") + "</b>?",
          fmt: "Decimal integer (tv_nsec cannot be ≥ 1 000 000 000)",
          steps: ["Convert period to nanoseconds: " + p + " ms = " + grp(pns) + " ns.",
            "Add tv_nsec: " + grp(ns) + " + " + grp(pns) + " = " + grp(tot) + ".",
            tot >= 1e9 ? "Exceeds 10⁹, carry " + carry + " s: tv_nsec = " + grp(tot) + " − " + grp(carry * 1e9) + " = " + grp(ns2) + ", tv_sec = " + s + " + " + carry + " = " + s2 + "." : "Does not exceed 10⁹, no carry: tv_sec remains " + s + ".",
            "Answer: <b>" + grp(ask === "sec" ? s2 : ns2) + "</b>"] };
      }
    },
    
    itspec: {
      title: "Representing period as it_interval",
      make: function (rnd) {
        var p = pick(rnd, PERIODS), sec = Math.floor(p / 1000), nsec = (p % 1000) * 1e6;
        var ask = pick(rnd, ["sec", "nsec"]);
        return { kind: "dec", ans: ask === "sec" ? sec : nsec,
          q: "Timer period <b>" + p + " ms</b>. What value should be filled into <b>" + (ask === "sec" ? "tv_sec" : "tv_nsec") + "</b> of <code>it_interval</code>?",
          fmt: "Decimal integer",
          steps: ["Whole seconds go into tv_sec: ⌊" + p + " / 1000⌋ = " + sec + ".",
            "Remaining " + (p % 1000) + " ms goes into tv_nsec: " + (p % 1000) + " × 10⁶ = " + grp(nsec) + " ns.",
            "tv_nsec must be < 10⁹, otherwise timer_settime returns EINVAL.",
            "Answer: <b>" + grp(ask === "sec" ? sec : nsec) + "</b>"] };
      }
    },
    
    drift: {
      title: "Drift in relative sleep",
      make: function (rnd) {
        var p = pick(rnd, [10, 20, 50, 100, 200, 250, 500]), w = pick(rnd, [0.2, 0.5, 1, 1.5, 2, 3]), n = pick(rnd, [100, 200, 500, 1000, 3600]);
        var ask = pick(rnd, ["drift", "total"]);
        var drift = n * w, total = n * (p + w);
        return { kind: "num", ans: ask === "drift" ? drift : total, abs: 0.01,
          q: "Inside a loop, each iteration executes work for <b>" + w + " ms</b>, then sleeps relatively for <b>" + p + " ms</b> using <code>nanosleep</code>. After running <b>" + n + "</b> iterations, " + (ask === "drift" ? "how many ms later is it than the ideal time (" + n + " × " + p + " ms)?" : "what is the total elapsed time in ms?"),
          fmt: "ms, may include decimals",
          steps: ["Relative sleep restarts counting from the moment of wakeup without deducting execution time: each iteration takes " + p + " + " + w + " = " + fmt(p + w, 2) + " ms.",
            "Total time = " + n + " × " + fmt(p + w, 2) + " = " + fmt(total, 2) + " ms; ideal value is " + n * p + " ms.",
            "Drift = " + n + " × " + w + " = <b>" + fmt(drift, 2) + " ms</b>, and it continuously accumulates.",
            "Switching to absolute time (adding the period to the previous target timestamp) prevents accumulation."] };
      }
    },
    
    rtsig: {
      title: "Real-time signal numbering",
      make: function (rnd) {
        var useMax = rnd() < 0.4, k = useMax ? int(rnd, 0, 10) : pick(rnd, [0, 2, 3, 4, 5, 6, 7, 8, 10, 12]);
        var v = useMax ? 64 - k : 34 + k, name = useMax ? (k ? "SIGRTMAX−" + k : "SIGRTMAX") : (k ? "SIGRTMIN+" + k : "SIGRTMIN");
        return { kind: "dec", ans: v,
          q: "On Linux (glibc, SIGRTMIN = 34, SIGRTMAX = 64), what is the signal number for <b>" + name + "</b>?",
          fmt: "Decimal",
          steps: ["glibc's NPTL thread library occupies 32 and 33, so user applications see SIGRTMIN as 34.",
            name + " = " + (useMax ? "64 − " + k : "34 + " + k) + " = <b>" + v + "</b>。",
            "Always write SIGRTMIN + n in code rather than hardcoding numbers: values vary across systems."] };
      }
    },
    
    fork: {
      title: "Process count after fork()",
      make: function (rnd) {
        var n = int(rnd, 1, 5), kind = pick(rnd, ["proc", "print"]);
        var v = Math.pow(2, n), seq = [1];
        for (var i = 1; i <= n; i++) seq.push(Math.pow(2, i));
        return { kind: "dec", ans: v,
          q: "A program executes <code>fork();</code> <b>" + n + "</b> times sequentially without checking return values. " + (kind === "proc" ? "How many processes exist in total at the end (including the original process)?" : "It then executes <code>printf(\"hola\\n\");</code> once. How many lines are printed in total?"),
          fmt: "Decimal",
          steps: ["At each fork, every currently existing process duplicates a child process, doubling the process count.",
            seq.join(" → ") + "。",
            (kind === "print" ? "Every process executes the subsequent printf, printing " : "Process count = 2^" + n + " = ") + "<b>" + v + "</b>" + (kind === "print" ? " lines." : ".")] };
      }
    },
    
    htons: {
      title: "htons: Port network byte order",
      make: function (rnd) {
        var p; do { p = int(rnd, 1025, 49151); } while (p === 8080);
        var hi = (p >> 8) & 0xFF, lo = p & 0xFF, sw = (lo << 8) | hi;
        var ask = pick(rnd, ["swap", "first"]);
        return { kind: "hex", ans: ask === "swap" ? sw : hi,
          q: "Port <b>" + p + "</b> (= " + hex(p) + "). On a little-endian Raspberry Pi (ARM), " + (ask === "swap" ? "what 16-bit number does <code>htons(" + p + ")</code> return when read in host byte order?" : "when transmitted in network byte order, what is the <b>first</b> byte sent?"),
          fmt: "Hexadecimal, e.g. 0x1F90",
          steps: [p + " = " + hex(p) + ": high byte " + hex(hi, 2) + ", low byte " + hex(lo, 2) + ".",
            "Network byte order is big-endian: send high byte " + hex(hi, 2) + " first, then low byte " + hex(lo, 2) + ".",
            "On a little-endian machine, htons swaps the two bytes; reading in host order yields " + hex(sw) + ".",
            "Answer: <b>" + (ask === "swap" ? hex(sw) : hex(hi, 2)) + "</b>"] };
      }
    },
    
    ipv4: {
      title: "IPv4 address ↔ 32-bit integer",
      make: function (rnd) {
        var a = [pick(rnd, [10, 172, 192]), int(rnd, 0, 255), int(rnd, 0, 255), int(rnd, 1, 254)];
        var v = ((a[0] << 24) >>> 0) + (a[1] << 16) + (a[2] << 8) + a[3];
        return { kind: "hex", ans: v,
          q: "What is the IPv4 address <b>" + a.join(".") + "</b> represented as a 32-bit integer in network byte order (read big-endian from left to right)?",
          fmt: "Hexadecimal, e.g. 0xC0A80001",
          steps: ["Each octet is one byte, from left to right corresponds to high to low: " + a.map(function (x) { return x + " = " + hex(x, 2); }).join(", ") + ".",
            "Combined: <b>" + hex(v, 8) + "</b>.",
            "inet_pton() stores these four bytes in this order into sin_addr; on a little-endian machine reading in host byte order, the value appears reversed."] };
      }
    },
    
    rr: {
      title: "Round-robin scheduling",
      make: function (rnd) {
        var n = int(rnd, 2, 4), q = pick(rnd, [10, 20, 50]), need = [];
        for (var i = 0; i < n; i++) need.push(q * int(rnd, 1, 4) + pick(rnd, [0, 0, q / 2]));
        var left = need.slice(), t = 0, fin = [], order = [], done = 0;
        while (done < n) {
          for (var j = 0; j < n; j++) {
            if (left[j] <= 0) continue;
            var d = Math.min(q, left[j]); t += d; left[j] -= d; order.push("T" + (j + 1) + " " + (t - d) + "–" + t);
            if (left[j] === 0) { fin[j] = t; done++; }
          }
        }
        var k = int(rnd, 0, n - 1);
        return { kind: "dec", ans: fin[k],
          q: n + " threads are ready simultaneously in queue order " + need.map(function (_, i) { return "T" + (i + 1); }).join(", ") + ", requiring CPU times " + need.map(function (x) { return x + " ms"; }).join(", ") + ". On a single core with time slice <b>" + q + " ms</b>, round-robin scheduling, and ignoring context-switch overhead, at which millisecond does <b>T" + (k + 1) + "</b> complete?",
          fmt: "ms, decimal",
          steps: ["Each thread takes turns using one time slice. If unfinished, it re-enters the tail of the queue; if finished early, it yields immediately.",
            "Timeline: " + order.join("; ") + ".",
            "T" + (k + 1) + " completes at <b>" + fin[k] + " ms</b>."] };
      }
    }
  };

  
  function readings(s) {
    s = String(s || "").trim().replace(/\s+/g, "");
    if (!s) return [];
    if (/^0x[0-9a-f]+$/i.test(s)) return [parseInt(s.slice(2), 16)];
    if (/^[0-9a-f]+h$/i.test(s)) return [parseInt(s.slice(0, -1), 16)];
    if (/^[0-9]+$/.test(s)) return [parseInt(s, 10), parseInt(s, 16)];
    if (/^[0-9a-f]+$/i.test(s)) return [parseInt(s, 16)];
    return [];
  }
  function num(s) {
    var m = String(s || "").trim().replace(/,/g, ".").replace(/\s+/g, "").match(/^([-+−]?\d*\.?\d+)([kKmM]?)/);
    if (!m) return NaN;
    var v = parseFloat(m[1].replace("−", "-"));
    if (m[2] === "k" || m[2] === "K") v *= 1e3; else if (m[2] === "M") v *= 1e6;
    return v;
  }
  function check(item, input) {
    if (item.kind === "num") {
      var v = num(input);
      if (!isFinite(v)) return false;
      var tol = Math.max((item.tol || 0) * Math.abs(item.ans), item.abs || 0, 1e-9);
      return Math.abs(v - item.ans) <= tol;
    }
    var r = readings(input);
    
    if (/^\s*[0-9]+\s*$/.test(String(input))) r = item.kind === "dec" ? r.slice(0, 1) : r.slice(1);
    return r.indexOf(item.ans) >= 0;
  }

  function mount(box) {
    var key = box.getAttribute("data-drill");
    var g = GEN[key];
    if (!g) return;
    var id = "dr-" + key + "-" + Math.floor(Math.random() * 1e6);
    box.innerHTML =
      '<div class="dh"><h3></h3><span class="tally"></span></div>' +
      '<p class="dq"></p>' +
      '<div class="row"><input type="text" inputmode="text" autocomplete="off" spellcheck="false" id="' + id + '" aria-label="Your answer">' +
      '<button type="button" class="btn primary" data-a="check">Check</button>' +
      '<button type="button" class="btn" data-a="show">Show answer</button>' +
      '<button type="button" class="btn" data-a="new">New problem</button></div>' +
      '<p class="fmt"></p><div class="fb" hidden></div>';
    var h = box.querySelector("h3"), tally = box.querySelector(".tally"), dq = box.querySelector(".dq");
    var inp = box.querySelector("input"), fmtEl = box.querySelector(".fmt"), fb = box.querySelector(".fb");
    h.textContent = g.title;
    var item, tries = 0, right = 0, counted = false;
    function upd() { tally.textContent = "Session: " + right + " / " + tries + " (first attempt only)"; }
    function fresh() {
      item = g.make(Math.random);
      dq.innerHTML = item.q; fmtEl.textContent = item.fmt || ""; inp.value = ""; fb.hidden = true; counted = false;
    }
    function feedback(ok, shown) {
      fb.hidden = false;
      fb.className = "fb " + (ok ? "ok" : "no");
      var ansTxt = item.kind === "hex" ? hex(item.ans, item.ans > 0xFF ? 4 : 2) : item.kind === "num" ? fmt(item.ans, 3) : String(item.ans);
      fb.innerHTML = '<span class="v">' + (shown ? "Answer · " + ansTxt : ok ? "Correct · " + ansTxt : "Incorrect, try again (or click \"Show answer\")") + "</span>" +
        (ok || shown ? "<ol><li>" + item.steps.join("</li><li>") + "</li></ol>" : "");
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a]");
      if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "new") { fresh(); inp.focus(); return; }
      if (a === "show") { if (!counted) { tries++; counted = true; upd(); } feedback(false, true); return; }
      if (a === "check") {
        if (!inp.value.trim()) { inp.focus(); return; }
        var ok = check(item, inp.value);
        if (!counted) { tries++; counted = true; if (ok) right++; upd(); }
        feedback(ok, false);
      }
    });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); box.querySelector('[data-a="check"]').click(); } });
    fresh(); upd();
  }

  Array.prototype.slice.call(document.querySelectorAll("[data-drill]")).forEach(mount);
  window.MICROPractice = { GEN: GEN, check: check, readings: readings, num: num, hex: hex };
})();
