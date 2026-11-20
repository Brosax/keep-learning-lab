(function () {
  "use strict";

  var units = {
    Hz: { Hz: 1, k: 1000, K: 1000, kHz: 1000, KHz: 1000, M: 1e6, MHz: 1e6, mHz: 0.001 },
    ms: { s: 1000, ms: 1, us: 0.001, "µs": 0.001, "μs": 0.001, ns: 1e-6 },
    ohm: { "Ω": 1, ohm: 1, ohms: 1, k: 1000, K: 1000, "kΩ": 1000, kohm: 1000, "MΩ": 1e6, "mΩ": 0.001 },
    days: { d: 1, day: 1, days: 1, "天": 1, h: 1 / 24 },
    percent: { "%": 1, "％": 1 }
  };

  function num(input, unit) {
    var value = String(input).trim().replace("−", "-").replace(",", ".");
    var match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(\S*)$/.exec(value);
    if (!match) return NaN;
    if (!match[2]) return Number(match[1]);
    var scales = units[unit];
    if (!scales || !Object.prototype.hasOwnProperty.call(scales, match[2])) return NaN;
    return Number(match[1]) * scales[match[2]];
  }

  function readings(input) {
    var s = String(input).trim().replace(/\s+/g, "");
    if (/^0x[0-9a-f]+$/i.test(s)) return [parseInt(s.slice(2), 16)];
    if (/^[0-9a-f]+h$/i.test(s)) return [parseInt(s.slice(0, -1), 16)];
    if (/^[0-9]+$/.test(s)) return [parseInt(s, 10), parseInt(s, 16)];
    if (/^[0-9a-f]+$/i.test(s)) return [parseInt(s, 16)];
    return [];
  }

  function check(item, input) {
    if (item.kind === "num") {
      var value = num(input, item.unit);
      var tolerance = Math.max((item.tol || 0) * Math.abs(item.ans), item.abs || 0, 1e-9);
      return Number.isFinite(value) && Math.abs(value - item.ans) <= tolerance;
    }
    var candidates = readings(input);
    if (candidates.length === 2) return candidates[item.kind === "dec" ? 0 : 1] === item.ans;
    return candidates.includes(item.ans);
  }

  window.EngineeringAnswers = { check: check, readings: readings, num: num };
})();
