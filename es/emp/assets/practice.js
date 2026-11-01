
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
      title: "Suma de timespec (con acarreo)",
      make: function (rnd) {
        var s = int(rnd, 10, 900), ns = int(rnd, 100, 999) * 1e6 + int(rnd, 0, 999) * 1e3;
        var p = pick(rnd, PERIODS), pns = p * 1e6;
        var tot = ns + pns, carry = Math.floor(tot / 1e9), ns2 = tot % 1e9, s2 = s + carry;
        var ask = pick(rnd, ["sec", "nsec"]);
        return { kind: "dec", ans: ask === "sec" ? s2 : ns2,
          q: "Siguiente instante de expiración = actual <code>{ tv_sec = " + s + ", tv_nsec = " + grp(ns) + " }</code> más un periodo de <b>" + p + " ms</b>. ¿Cuál es el valor resultante de <b>" + (ask === "sec" ? "tv_sec" : "tv_nsec") + "</b>?",
          fmt: "Entero decimal (tv_nsec no puede ser ≥ 1 000 000 000)",
          steps: ["Convertir el periodo a nanosegundos: " + p + " ms = " + grp(pns) + " ns.",
            "Sumar tv_nsec: " + grp(ns) + " + " + grp(pns) + " = " + grp(tot) + ".",
            tot >= 1e9 ? "Supera 10⁹, acarrea " + carry + " s: tv_nsec = " + grp(tot) + " − " + grp(carry * 1e9) + " = " + grp(ns2) + ", tv_sec = " + s + " + " + carry + " = " + s2 + "." : "No supera 10⁹, sin acarreo: tv_sec se mantiene en " + s + ".",
            "Respuesta: <b>" + grp(ask === "sec" ? s2 : ns2) + "</b>"] };
      }
    },
    
    itspec: {
      title: "Representación de periodo en it_interval",
      make: function (rnd) {
        var p = pick(rnd, PERIODS), sec = Math.floor(p / 1000), nsec = (p % 1000) * 1e6;
        var ask = pick(rnd, ["sec", "nsec"]);
        return { kind: "dec", ans: ask === "sec" ? sec : nsec,
          q: "Periodo del temporizador: <b>" + p + " ms</b>. ¿Qué valor debe asignarse al campo <b>" + (ask === "sec" ? "tv_sec" : "tv_nsec") + "</b> de <code>it_interval</code>?",
          fmt: "Entero decimal",
          steps: ["Los segundos enteros van a tv_sec: ⌊" + p + " / 1000⌋ = " + sec + ".",
            "Los " + (p % 1000) + " ms restantes van a tv_nsec: " + (p % 1000) + " × 10⁶ = " + grp(nsec) + " ns.",
            "tv_nsec debe ser < 10⁹; de lo contrario timer_settime devuelve EINVAL.",
            "Respuesta: <b>" + grp(ask === "sec" ? sec : nsec) + "</b>"] };
      }
    },
    
    drift: {
      title: "Deriva en esperas relativas",
      make: function (rnd) {
        var p = pick(rnd, [10, 20, 50, 100, 200, 250, 500]), w = pick(rnd, [0.2, 0.5, 1, 1.5, 2, 3]), n = pick(rnd, [100, 200, 500, 1000, 3600]);
        var ask = pick(rnd, ["drift", "total"]);
        var drift = n * w, total = n * (p + w);
        return { kind: "num", ans: ask === "drift" ? drift : total, abs: 0.01,
          q: "Dentro de un bucle, cada iteración realiza trabajo durante <b>" + w + " ms</b> y luego duerme de forma relativa durante <b>" + p + " ms</b> mediante <code>nanosleep</code>. Tras <b>" + n + "</b> iteraciones, " + (ask === "drift" ? "¿cuántos ms de retraso acumula respecto al tiempo ideal (" + n + " × " + p + " ms)?" : "¿cuál es el tiempo transcurrido total en ms?"),
          fmt: "ms, puede incluir decimales",
          steps: ["El retardo relativo reinicia la cuenta al despertar sin descontar la ejecución: cada vuelta tarda " + p + " + " + w + " = " + fmt(p + w, 2) + " ms.",
            "Tiempo total = " + n + " × " + fmt(p + w, 2) + " = " + fmt(total, 2) + " ms; el valor ideal sería " + n * p + " ms.",
            "Deriva = " + n + " × " + w + " = <b>" + fmt(drift, 2) + " ms</b>, y se acumula continuamente.",
            "Pasar a temporización absoluta (sumando el periodo al instante objetivo anterior) evita esta acumulación."] };
      }
    },
    
    rtsig: {
      title: "Numeración de señales en tiempo real",
      make: function (rnd) {
        var useMax = rnd() < 0.4, k = useMax ? int(rnd, 0, 10) : pick(rnd, [0, 2, 3, 4, 5, 6, 7, 8, 10, 12]);
        var v = useMax ? 64 - k : 34 + k, name = useMax ? (k ? "SIGRTMAX−" + k : "SIGRTMAX") : (k ? "SIGRTMIN+" + k : "SIGRTMIN");
        return { kind: "dec", ans: v,
          q: "En Linux (glibc, SIGRTMIN = 34, SIGRTMAX = 64), ¿cuál es el número de señal correspondiente a <b>" + name + "</b>?",
          fmt: "Decimal",
          steps: ["La biblioteca de hilos NPTL de glibc reserva 32 y 33, por lo que las aplicaciones de usuario ven SIGRTMIN como 34.",
            name + " = " + (useMax ? "64 − " + k : "34 + " + k) + " = <b>" + v + "</b>.",
            "En el código conviene escribir siempre SIGRTMIN + n en lugar de fijar números: los valores cambian según el sistema."] };
      }
    },
    
    fork: {
      title: "Número de procesos tras fork()",
      make: function (rnd) {
        var n = int(rnd, 1, 5), kind = pick(rnd, ["proc", "print"]);
        var v = Math.pow(2, n), seq = [1];
        for (var i = 1; i <= n; i++) seq.push(Math.pow(2, i));
        return { kind: "dec", ans: v,
          q: "Un programa ejecuta <code>fork();</code> <b>" + n + "</b> veces consecutivas sin comprobar valores de retorno. " + (kind === "proc" ? "¿Cuántos procesos coexisten en total al final (incluido el proceso original)?" : "A continuación ejecuta <code>printf(\"hola\\n\");</code> una vez. ¿Cuántas líneas se imprimen en total?"),
          fmt: "Decimal",
          steps: ["En cada fork, cada proceso existente se duplica, duplicando la cantidad total de procesos.",
            seq.join(" → ") + ".",
            (kind === "print" ? "Cada proceso ejecuta el printf subsiguiente, imprimiendo " : "Número de procesos = 2^" + n + " = ") + "<b>" + v + "</b>" + (kind === "print" ? " líneas." : ".")] };
      }
    },
    
    htons: {
      title: "htons: orden de bytes de red en puertos",
      make: function (rnd) {
        var p; do { p = int(rnd, 1025, 49151); } while (p === 8080);
        var hi = (p >> 8) & 0xFF, lo = p & 0xFF, sw = (lo << 8) | hi;
        var ask = pick(rnd, ["swap", "first"]);
        return { kind: "hex", ans: ask === "swap" ? sw : hi,
          q: "Puerto <b>" + p + "</b> (= " + hex(p) + "). En una Raspberry Pi little-endian (ARM), " + (ask === "swap" ? "¿qué número de 16 bits devuelve <code>htons(" + p + ")</code> al leerlo en orden de máquina?" : "al transmitirse en formato de red, ¿cuál es el <b>primer</b> byte enviado?"),
          fmt: "Hexadecimal, p. ej. 0x1F90",
          steps: [p + " = " + hex(p) + ": byte alto " + hex(hi, 2) + ", byte bajo " + hex(lo, 2) + ".",
            "El formato de red es big-endian: se envía primero el byte alto " + hex(hi, 2) + " y luego el bajo " + hex(lo, 2) + ".",
            "En una máquina little-endian, htons intercambia los dos bytes; al leerlo en formato local resulta " + hex(sw) + ".",
            "Respuesta: <b>" + (ask === "swap" ? hex(sw) : hex(hi, 2)) + "</b>"] };
      }
    },
    
    ipv4: {
      title: "Dirección IPv4 ↔ entero de 32 bits",
      make: function (rnd) {
        var a = [pick(rnd, [10, 172, 192]), int(rnd, 0, 255), int(rnd, 0, 255), int(rnd, 1, 254)];
        var v = ((a[0] << 24) >>> 0) + (a[1] << 16) + (a[2] << 8) + a[3];
        return { kind: "hex", ans: v,
          q: "¿Cómo se representa la dirección IPv4 <b>" + a.join(".") + "</b> como entero de 32 bits en formato red (leído big-endian de izquierda a derecha)?",
          fmt: "Hexadecimal, p. ej. 0xC0A80001",
          steps: ["Cada octeto es un byte, de izquierda a derecha de mayor a menor peso: " + a.map(function (x) { return x + " = " + hex(x, 2); }).join(", ") + ".",
            "Combinado: <b>" + hex(v, 8) + "</b>.",
            "inet_pton() almacena estos cuatro bytes en este orden dentro de sin_addr; en una máquina little-endian, al leerlo como entero de máquina se ve invertido."] };
      }
    },
    
    rr: {
      title: "Planificación Round-Robin",
      make: function (rnd) {
        var n = int(rnd, 2, 4), q = pick(rnd, [10, 20, 50]), need = [];
        for (var i = 0; i < n; i++) need.push(q * int(rnd, 1, 4) + pick(rnd, [0, 0, q / 2]));
        var left = need.slice(), t = 0, fin = [], order = [], done = 0;
        while (done < n) {
          for (var j = 0; j < n; j++) {
            if (left[j] <= 0) continue;
            var d = Math.min(q, left[j]); t += d; left[j] -= d; order.push("H" + (j + 1) + " " + (t - d) + "–" + t);
            if (left[j] === 0) { fin[j] = t; done++; }
          }
        }
        var k = int(rnd, 0, n - 1);
        return { kind: "dec", ans: fin[k],
          q: n + " hilos están listos simultáneamente en la cola en orden " + need.map(function (_, i) { return "H" + (i + 1); }).join(", ") + ", requiriendo tiempos de CPU de " + need.map(function (x) { return x + " ms"; }).join(", ") + ". En un único núcleo con rodaja (quantum) de <b>" + q + " ms</b>, planificación round-robin y despreciando el coste de cambio de contexto, ¿en qué milisegundo finaliza <b>H" + (k + 1) + "</b>?",
          fmt: "ms, decimal",
          steps: ["Cada hilo toma su turno usando una rodaja. Si no concluye, vuelve a la cola; si concluye antes, cede la CPU de inmediato.",
            "Cronología: " + order.join("; ") + ".",
            "H" + (k + 1) + " finaliza en <b>" + fin[k] + " ms</b>."] };
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
      '<div class="row"><input type="text" inputmode="text" autocomplete="off" spellcheck="false" id="' + id + '" aria-label="Tu respuesta">' +
      '<button type="button" class="btn primary" data-a="check">Comprobar</button>' +
      '<button type="button" class="btn" data-a="show">Ver solución</button>' +
      '<button type="button" class="btn" data-a="new">Nuevo ejercicio</button></div>' +
      '<p class="fmt"></p><div class="fb" hidden></div>';
    var h = box.querySelector("h3"), tally = box.querySelector(".tally"), dq = box.querySelector(".dq");
    var inp = box.querySelector("input"), fmtEl = box.querySelector(".fmt"), fb = box.querySelector(".fb");
    h.textContent = g.title;
    var item, tries = 0, right = 0, counted = false;
    function upd() { tally.textContent = "Sesión: " + right + " / " + tries + " (solo primer intento)"; }
    function fresh() {
      item = g.make(Math.random);
      dq.innerHTML = item.q; fmtEl.textContent = item.fmt || ""; inp.value = ""; fb.hidden = true; counted = false;
    }
    function feedback(ok, shown) {
      fb.hidden = false;
      fb.className = "fb " + (ok ? "ok" : "no");
      var ansTxt = item.kind === "hex" ? hex(item.ans, item.ans > 0xFF ? 4 : 2) : item.kind === "num" ? fmt(item.ans, 3) : String(item.ans);
      fb.innerHTML = '<span class="v">' + (shown ? "Solución · " + ansTxt : ok ? "Correcto · " + ansTxt : "Incorrecto, inténtalo de nuevo (o pulsa \"Ver solución\")") + "</span>" +
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
