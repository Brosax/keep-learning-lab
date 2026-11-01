
(function () {
  "use strict";
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {  }

  var ICON = {
    first: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="2" height="10"/><path d="M14 3v10L5 8z"/></svg>',
    prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10L3 8z"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11L13.5 8z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10"/><rect x="9.5" y="3" width="3" height="10"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3v10l8-5z"/><rect x="12" y="3" width="2" height="10"/></svg>'
  };

  function $$(sel, root) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function nums(s) { return (s || "").split(/[\s,]+/).filter(Boolean).map(Number); }

  function geomOf(node) {
    if (typeof node.getTotalLength === "function") return [node];
    return $$("path, line, polyline, polygon, rect, circle, ellipse", node);
  }

  function drawIn(node) {
    geomOf(node).forEach(function (g) {
      var L;
      try { L = g.getTotalLength(); } catch (e) { return; }
      if (!L || !isFinite(L)) return;
      g.style.transition = "none";
      g.style.strokeDasharray = L + " " + L;
      g.style.strokeDashoffset = L;
      g.getBoundingClientRect();
      requestAnimationFrame(function () {
        g.style.transition = "stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)";
        g.style.strokeDashoffset = "0";
      });
      setTimeout(function () { g.style.transition = ""; g.style.strokeDasharray = ""; g.style.strokeDashoffset = ""; }, 1000);
    });
  }

  function placeOn(node, path, f) {
    var L = path.getTotalLength();
    var p = path.getPointAtLength(L * f);
    node.setAttribute("transform", "translate(" + p.x.toFixed(2) + " " + p.y.toFixed(2) + ")");
  }
  function moveAlong(node, root, animate) {
    var path = root.querySelector(node.getAttribute("data-move"));
    if (!path || typeof path.getTotalLength !== "function") return;
    if (!animate) { placeOn(node, path, 1); return; }
    var dur = +node.getAttribute("data-move-dur") || 1100, t0 = null;
    function frame(ts) {
      if (t0 == null) t0 = ts;
      var x = Math.min(1, (ts - t0) / dur);
      var e = x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      placeOn(node, path, e);
      if (x < 1) requestAnimationFrame(frame);
    }
    placeOn(node, path, 0);
    requestAnimationFrame(frame);
  }

  function Scene(el) {
    var self = this;
    this.el = el;
    this.caps = $$(".captions > li", el);
    this.n = this.caps.length;
    this.cur = this.n;
    this.hooks = [];
    this.timer = null;
    this.items = $$("[data-step], [data-out]", el).map(function (node) {
      return { node: node, s: +(node.getAttribute("data-step") || 1), o: +(node.getAttribute("data-out") || 0) };
    });
    this.hls = $$("[data-hl]", el).map(function (node) { return { node: node, at: nums(node.getAttribute("data-hl")) }; });
    this.movers = $$("[data-move]", el);

    var bar = el.querySelector(".stage-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "stage-bar";
      var caps = el.querySelector(".captions");
      el.insertBefore(bar, caps);
    }
    bar.innerHTML = "";
    function mk(cls, label, html) {
      var b = document.createElement("button");
      b.type = "button"; b.className = cls; b.setAttribute("aria-label", label); b.title = label; b.innerHTML = html;
      bar.appendChild(b);
      return b;
    }
    this.bFirst = mk("first", "Back to step 1", ICON.first);
    this.bPrev = mk("prev", "Previous step", ICON.prev);
    this.bPlay = mk("play", "Play", ICON.play);
    this.bNext = mk("next", "Next step", ICON.next);
    var dots = document.createElement("div");
    dots.className = "dots";
    this.dots = [];
    for (var i = 1; i <= this.n; i++) {
      (function (k) {
        var d = document.createElement("button");
        d.type = "button"; d.setAttribute("aria-label", "Jump to step " + k); d.title = "Step " + k;
        d.addEventListener("click", function () { self.pause(); self.touch(); self.go(k, false); });
        dots.appendChild(d);
        self.dots.push(d);
      })(i);
    }
    bar.appendChild(dots);
    this.cnt = document.createElement("span");
    this.cnt.className = "cnt";
    bar.appendChild(this.cnt);
    this.live = document.createElement("p");
    this.live.className = "sr-only";
    this.live.setAttribute("aria-live", "polite");
    el.appendChild(this.live);

    this.bFirst.addEventListener("click", function () { self.pause(); self.touch(); self.go(1, true); });
    this.bPrev.addEventListener("click", function () { self.pause(); self.touch(); self.go(self.cur - 1, false); });
    this.bNext.addEventListener("click", function () { self.pause(); self.touch(); self.go(self.cur + 1, true); });
    this.bPlay.addEventListener("click", function () { self.touch(); if (self.timer) self.pause(); else self.play(); });
    this.caps.forEach(function (li, idx) {
      li.addEventListener("click", function () { self.pause(); self.touch(); self.go(idx + 1, false); });
    });

    var canvas = el.querySelector(".stage-canvas");
    if (canvas) canvas.setAttribute("role", "group");
    (canvas || el).addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); self.pause(); self.touch(); self.go(self.cur + 1, true); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); self.pause(); self.touch(); self.go(self.cur - 1, false); }
      else if (e.key === " ") { e.preventDefault(); self.touch(); if (self.timer) self.pause(); else self.play(); }
      else if (e.key === "Home") { e.preventDefault(); self.pause(); self.touch(); self.go(1, false); }
      else if (e.key === "End") { e.preventDefault(); self.pause(); self.touch(); self.go(self.n, false); }
    });

    this.go(this.n, false, true);
  }

  Scene.prototype.touch = function () { this.el.classList.add("playing"); };

  Scene.prototype.go = function (k, animate, init) {
    if (k < 1 || k > this.n) return;
    var prev = this.cur;
    var fwd = animate && !reduce && k === prev + 1 && !init;
    this.cur = k;
    var root = this.el;
    this.items.forEach(function (it) {
      var vis = k >= it.s && (!it.o || k < it.o);
      it.node.classList.toggle("off", !vis);
      if (vis && fwd && it.s === k) {
        if (it.node.classList.contains("draw")) drawIn(it.node);
        $$(".draw", it.node).forEach(drawIn);
      }
    });
    this.movers.forEach(function (m) {
      var s = +(m.getAttribute("data-step") || 1);
      if (k >= s) moveAlong(m, root, fwd && s === k);
    });
    this.hls.forEach(function (h) {
      var on = h.at.indexOf(k) >= 0;
      h.node.classList.remove("hl");
      if (on) { h.node.getBoundingClientRect(); h.node.classList.add("hl"); }
    });
    this.caps.forEach(function (li, i) {
      var c = i === k - 1;
      li.classList.toggle("cur", c);
      if (c) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    this.dots.forEach(function (d, i) {
      d.classList.toggle("past", i < k - 1);
      d.classList.toggle("cur", i === k - 1);
    });
    this.cnt.textContent = k + " / " + this.n;
    this.bPrev.disabled = k <= 1;
    this.bNext.disabled = k >= this.n;
    var self = this;
    if (!init) this.live.textContent = "Step " + k + " / " + this.n + ": " + this.caps[k - 1].textContent;
    this.hooks.forEach(function (fn) { try { fn(k, prev, fwd); } catch (e) { if (window.console) console.error(e); } });
    if (!init && this.timer && k >= this.n) this.pause();
    return self;
  };

  Scene.prototype.play = function () {
    var self = this;
    if (this.cur >= this.n) this.go(1, true); else this.go(this.cur + 1, true);
    this.bPlay.innerHTML = ICON.pause; this.bPlay.setAttribute("aria-label", "Pause"); this.bPlay.title = "Pause";
    function tick() {
      var li = self.caps[self.cur - 1];
      var dur = +(li && li.getAttribute("data-dur")) || +self.el.getAttribute("data-ms") || 2800;
      self.timer = setTimeout(function () {
        if (self.cur >= self.n) { self.pause(); return; }
        self.go(self.cur + 1, true);
        if (self.cur >= self.n) { self.pause(); return; }
        tick();
      }, dur);
    }
    this.timer = -1;
    tick();
  };

  Scene.prototype.pause = function () {
    if (this.timer && this.timer !== -1) clearTimeout(this.timer);
    this.timer = null;
    this.bPlay.innerHTML = ICON.play; this.bPlay.setAttribute("aria-label", "Play"); this.bPlay.title = "Play";
  };

  Scene.prototype.on = function (fn) { this.hooks.push(fn); try { fn(this.cur, this.cur, false); } catch (e) { if (window.console) console.error(e); } return this; };

  var all = [];
  Array.prototype.slice.call(document.querySelectorAll(".stage[data-scene]")).forEach(function (el) {
    try { all.push(new Scene(el)); } catch (e) { if (window.console) console.error(e); }
  });

  window.MICROScene = {
    all: all,
    get: function (id) { for (var i = 0; i < all.length; i++) if (all[i].el.id === id) return all[i]; return null; },
    drawIn: drawIn,
    reduce: reduce
  };
})();
