
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
      title: "timespec 相加（进位）",
      make: function (rnd) {
        var s = int(rnd, 10, 900), ns = int(rnd, 100, 999) * 1e6 + int(rnd, 0, 999) * 1e3;
        var p = pick(rnd, PERIODS), pns = p * 1e6;
        var tot = ns + pns, carry = Math.floor(tot / 1e9), ns2 = tot % 1e9, s2 = s + carry;
        var ask = pick(rnd, ["sec", "nsec"]);
        return { kind: "dec", ans: ask === "sec" ? s2 : ns2,
          q: "下一次到期时间 = 当前 <code>{ tv_sec = " + s + ", tv_nsec = " + grp(ns) + " }</code> 加上周期 <b>" + p + " ms</b>。结果的 <b>" + (ask === "sec" ? "tv_sec" : "tv_nsec") + "</b> 是多少？",
          fmt: "十进制整数（tv_nsec 不能 ≥ 1 000 000 000）",
          steps: ["周期换成纳秒：" + p + " ms = " + grp(pns) + " ns。",
            "tv_nsec 相加：" + grp(ns) + " + " + grp(pns) + " = " + grp(tot) + "。",
            tot >= 1e9 ? "超过 10⁹，进位 " + carry + " 秒：tv_nsec = " + grp(tot) + " − " + grp(carry * 1e9) + " = " + grp(ns2) + "，tv_sec = " + s + " + " + carry + " = " + s2 + "。" : "没有超过 10⁹，不进位：tv_sec 仍是 " + s + "。",
            "答案：<b>" + grp(ask === "sec" ? s2 : ns2) + "</b>"] };
      }
    },
    
    itspec: {
      title: "周期写成 it_interval",
      make: function (rnd) {
        var p = pick(rnd, PERIODS), sec = Math.floor(p / 1000), nsec = (p % 1000) * 1e6;
        var ask = pick(rnd, ["sec", "nsec"]);
        return { kind: "dec", ans: ask === "sec" ? sec : nsec,
          q: "定时器周期 <b>" + p + " ms</b>。<code>it_interval</code> 里的 <b>" + (ask === "sec" ? "tv_sec" : "tv_nsec") + "</b> 应该填多少？",
          fmt: "十进制整数",
          steps: ["整秒部分放 tv_sec：⌊" + p + " / 1000⌋ = " + sec + "。",
            "剩下的 " + (p % 1000) + " ms 放 tv_nsec：" + (p % 1000) + " × 10⁶ = " + grp(nsec) + " ns。",
            "tv_nsec 必须 < 10⁹，否则 timer_settime 返回 EINVAL。",
            "答案：<b>" + grp(ask === "sec" ? sec : nsec) + "</b>"] };
      }
    },
    
    drift: {
      title: "相对睡眠的漂移",
      make: function (rnd) {
        var p = pick(rnd, [10, 20, 50, 100, 200, 250, 500]), w = pick(rnd, [0.2, 0.5, 1, 1.5, 2, 3]), n = pick(rnd, [100, 200, 500, 1000, 3600]);
        var ask = pick(rnd, ["drift", "total"]);
        var drift = n * w, total = n * (p + w);
        return { kind: "num", ans: ask === "drift" ? drift : total, abs: 0.01,
          q: "循环里每次先做 <b>" + w + " ms</b> 的工作，再用 <code>nanosleep</code> 相对地睡 <b>" + p + " ms</b>。跑完 <b>" + n + "</b> 圈，" + (ask === "drift" ? "比理想时间（" + n + " × " + p + " ms）<b>晚了多少 ms</b>？" : "<b>实际一共用了多少 ms</b>？"),
          fmt: "ms，可以是小数",
          steps: ["相对睡眠从“醒来那一刻”重新算，工作时间不会被扣掉：每一圈实际是 " + p + " + " + w + " = " + fmt(p + w, 2) + " ms。",
            "总时间 = " + n + " × " + fmt(p + w, 2) + " = " + fmt(total, 2) + " ms；理想值是 " + n * p + " ms。",
            "漂移 = " + n + " × " + w + " = <b>" + fmt(drift, 2) + " ms</b>，而且只会越积越多。",
            "改用绝对时间（每次在上一个目标时刻上加周期）就不会累积。"] };
      }
    },
    
    rtsig: {
      title: "实时信号的编号",
      make: function (rnd) {
        var useMax = rnd() < 0.4, k = useMax ? int(rnd, 0, 10) : pick(rnd, [0, 2, 3, 4, 5, 6, 7, 8, 10, 12]);
        var v = useMax ? 64 - k : 34 + k, name = useMax ? (k ? "SIGRTMAX−" + k : "SIGRTMAX") : (k ? "SIGRTMIN+" + k : "SIGRTMIN");
        return { kind: "dec", ans: v,
          q: "在 Linux（glibc，SIGRTMIN = 34、SIGRTMAX = 64）上，<b>" + name + "</b> 的编号是多少？",
          fmt: "十进制",
          steps: ["glibc 的 NPTL 线程库占用了 32、33，所以程序看到的 SIGRTMIN 是 34。",
            name + " = " + (useMax ? "64 − " + k : "34 + " + k) + " = <b>" + v + "</b>。",
            "程序里永远写 SIGRTMIN + n，不要写死数字：不同系统的值不一样。"] };
      }
    },
    
    fork: {
      title: "fork() 之后有几个进程",
      make: function (rnd) {
        var n = int(rnd, 1, 5), kind = pick(rnd, ["proc", "print"]);
        var v = Math.pow(2, n), seq = [1];
        for (var i = 1; i <= n; i++) seq.push(Math.pow(2, i));
        return { kind: "dec", ans: v,
          q: "程序依次执行 <b>" + n + "</b> 次 <code>fork();</code>（不判断返回值），" + (kind === "proc" ? "最后一共有多少个进程（包括最初那个）？" : "然后执行一次 <code>printf(\"hola\\n\");</code>。一共打印多少行？"),
          fmt: "十进制",
          steps: ["每次 fork，当前存在的每个进程都会复制出一个子进程，进程数翻倍。",
            seq.join(" → ") + "。",
            (kind === "print" ? "每个进程都会执行后面的 printf，所以打印 " : "进程数 = 2^" + n + " = ") + "<b>" + v + "</b>" + (kind === "print" ? " 行。" : "。")] };
      }
    },
    
    htons: {
      title: "htons：端口的网络字节序",
      make: function (rnd) {
        var p; do { p = int(rnd, 1025, 49151); } while (p === 8080);
        var hi = (p >> 8) & 0xFF, lo = p & 0xFF, sw = (lo << 8) | hi;
        var ask = pick(rnd, ["swap", "first"]);
        return { kind: "hex", ans: ask === "swap" ? sw : hi,
          q: "端口 <b>" + p + "</b>（= " + hex(p) + "）。在小端的 Raspberry Pi（ARM）上，" + (ask === "swap" ? "<code>htons(" + p + ")</code> 返回的 16 位数（按主机序读）是多少？" : "按网络字节序发送时，<b>第一个</b>发出去的字节是多少？"),
          fmt: "十六进制，例如 0x1F90",
          steps: [p + " = " + hex(p) + "：高字节 " + hex(hi, 2) + "，低字节 " + hex(lo, 2) + "。",
            "网络字节序是大端：先发高字节 " + hex(hi, 2) + "，再发低字节 " + hex(lo, 2) + "。",
            "小端机器上 htons 要把两个字节对调，按主机序读出来就是 " + hex(sw) + "。",
            "答案：<b>" + (ask === "swap" ? hex(sw) : hex(hi, 2)) + "</b>"] };
      }
    },
    
    ipv4: {
      title: "IPv4 地址 ↔ 32 位整数",
      make: function (rnd) {
        var a = [pick(rnd, [10, 172, 192]), int(rnd, 0, 255), int(rnd, 0, 255), int(rnd, 1, 254)];
        var v = ((a[0] << 24) >>> 0) + (a[1] << 16) + (a[2] << 8) + a[3];
        return { kind: "hex", ans: v,
          q: "地址 <b>" + a.join(".") + "</b> 写成 32 位整数（网络字节序，即按大端从左往右读）是多少？",
          fmt: "十六进制，例如 0xC0A80001",
          steps: ["每一段是一个字节，从左到右就是从高到低：" + a.map(function (x) { return x + " = " + hex(x, 2); }).join("，") + "。",
            "拼起来：<b>" + hex(v, 8) + "</b>。",
            "inet_pton() 把这四个字节按这个顺序放进 sin_addr；在小端机器上按主机序读，数值会是反过来的。"] };
      }
    },
    
    rr: {
      title: "轮转调度（round-robin）",
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
          q: n + " 个线程同时就绪，排队顺序 " + need.map(function (_, i) { return "T" + (i + 1); }).join("、") + "，各需 CPU " + need.map(function (x) { return x + " ms"; }).join("、") + "。单核、时间片 <b>" + q + " ms</b>、轮转调度、忽略切换开销。<b>T" + (k + 1) + "</b> 在第几 ms 结束？",
          fmt: "ms，十进制",
          steps: ["每个线程轮流用一个时间片，用完还没做完就排到队尾；剩下不足一片的，用完就让出。",
            "时间线：" + order.join("；") + "。",
            "T" + (k + 1) + " 在 <b>" + fin[k] + " ms</b> 结束。"] };
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
      '<div class="row"><input type="text" inputmode="text" autocomplete="off" spellcheck="false" id="' + id + '" aria-label="你的答案">' +
      '<button type="button" class="btn primary" data-a="check">检查</button>' +
      '<button type="button" class="btn" data-a="show">看答案</button>' +
      '<button type="button" class="btn" data-a="new">换一题</button></div>' +
      '<p class="fmt"></p><div class="fb" hidden></div>';
    var h = box.querySelector("h3"), tally = box.querySelector(".tally"), dq = box.querySelector(".dq");
    var inp = box.querySelector("input"), fmtEl = box.querySelector(".fmt"), fb = box.querySelector(".fb");
    h.textContent = g.title;
    var item, tries = 0, right = 0, counted = false;
    function upd() { tally.textContent = "本次 " + right + " / " + tries + "（每题只算第一次）"; }
    function fresh() {
      item = g.make(Math.random);
      dq.innerHTML = item.q; fmtEl.textContent = item.fmt || ""; inp.value = ""; fb.hidden = true; counted = false;
    }
    function feedback(ok, shown) {
      fb.hidden = false;
      fb.className = "fb " + (ok ? "ok" : "no");
      var ansTxt = item.kind === "hex" ? hex(item.ans, item.ans > 0xFF ? 4 : 2) : item.kind === "num" ? fmt(item.ans, 3) : String(item.ans);
      fb.innerHTML = '<span class="v">' + (shown ? "答案 · " + ansTxt : ok ? "正确 · " + ansTxt : "不对，再想想（或点“看答案”）") + "</span>" +
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
