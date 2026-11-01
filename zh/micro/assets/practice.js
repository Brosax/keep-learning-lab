
(function () {
  "use strict";

  function hex(v, w) { var s = v.toString(16).toUpperCase(); while (s.length < (w || 4)) s = "0" + s; return "0x" + s; }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function int(rnd, a, b) { return a + Math.floor(rnd() * (b - a + 1)); }

  
  var VT = {
    63: "System Reset（上电、外部复位、watchdog 超时、密码违例）", 62: "System NMI（PMM、空地址访问、JTAG mailbox）",
    61: "User NMI（NMI 引脚、振荡器故障、Flash 访问违例）", 60: "Comp_B", 59: "TB0 · TB0CCR0", 58: "TB0 · TB0CCR1–6、TB0IFG",
    57: "Watchdog（interval timer 模式）", 56: "USCI_A0", 55: "USCI_B0", 54: "ADC12_A", 53: "TA0 · TA0CCR0",
    52: "TA0 · TA0CCR1–4、TA0IFG", 51: "USB_UBM", 50: "DMA", 49: "TA1 · TA1CCR0", 48: "TA1 · TA1CCR1–2、TA1IFG",
    47: "I/O Port P1", 46: "USCI_A1", 45: "USCI_B1", 44: "TA2 · TA2CCR0", 43: "TA2 · TA2CCR1–2、TA2IFG",
    42: "I/O Port P2", 41: "RTC_A"
  };
  function src(n) { return VT[n] || "Reserved（F5529 未使用）"; }

  var GEN = {
    
    vec: {
      title: "向量号 ↔ 向量地址",
      make: function (rnd) {
        var n = rnd() < 0.8 ? int(rnd, 41, 63) : int(rnd, 0, 40);
        var addr = 0xFF80 + 2 * n;
        if (rnd() < 0.5) {
          return {
            kind: "hex", ans: addr,
            q: "<b>" + n + "</b> 号向量（" + src(n) + "）存放在哪个地址？",
            fmt: "十六进制，例如 0xFFDE、FFDEh 都可以",
            steps: [
              "向量表从 <code>0xFF80</code> 开始，每个向量占 2 个字节（一个字）。",
              "地址 = 0xFF80 + 2 × " + n + " = 0xFF80 + " + hex(2 * n, 2) + " = <b>" + hex(addr) + "</b>",
              "对照 M21 §4 的向量表：" + n + " 号是 " + src(n) + "。"
            ]
          };
        }
        return {
          kind: "dec", ans: n,
          q: "地址 <b>" + hex(addr) + "</b> 里存的是几号向量？",
          fmt: "十进制向量号，例如 47",
          steps: [
            "向量号 = (地址 − 0xFF80) / 2",
            "= (" + hex(addr) + " − 0xFF80) / 2 = " + hex(2 * n, 2) + " / 2 = " + (2 * n) + " / 2 = <b>" + n + "</b>",
            "对照 M21 §4 的向量表：" + n + " 号是 " + src(n) + "。"
          ]
        };
      }
    },

    
    piv: {
      title: "P1IV 的值 ↔ 引脚",
      make: function (rnd) {
        var mode = pick(rnd, ["toV", "toPin", "two"]);
        var y = int(rnd, 0, 7);
        if (mode === "toV") {
          return {
            kind: "hex", ans: 2 * (y + 1),
            q: "只有 <b>P1.<span>" + y + "</span></b> 的中断在等待处理。ISR 读 <code>P1IV</code> 得到多少？",
            fmt: "十六进制，例如 0x04 或 04h",
            steps: [
              "P1IV = 2 × (y + 1)，y 是引脚号；没有中断时为 0。",
              "= 2 × (" + y + " + 1) = " + (2 * (y + 1)) + " = <b>" + hex(2 * (y + 1), 2) + "</b>",
              "值总是偶数，所以可以写 <code>switch(__even_in_range(P1IV, P1IV_P1IFG7))</code>。"
            ]
          };
        }
        if (mode === "toPin") {
          return {
            kind: "dec", ans: y,
            q: "ISR 读 <code>P1IV</code> 得到 <b>" + hex(2 * (y + 1), 2) + "</b>。是哪个引脚触发的？填引脚号 y（P1.y）。",
            fmt: "0–7 之间的整数",
            steps: [
              "y = P1IV / 2 − 1",
              "= " + (2 * (y + 1)) + " / 2 − 1 = <b>" + y + "</b>，也就是 P1." + y + "。"
            ]
          };
        }
        var a = int(rnd, 0, 6), b = int(rnd, a + 1, 7);
        return {
          kind: "hex", ans: 2 * (a + 1),
          q: "P1.<b>" + a + "</b> 和 P1.<b>" + b + "</b> 的 flag 同时置位，且都已使能。ISR 第一次读 <code>P1IV</code> 得到多少？",
          fmt: "十六进制，例如 0x04",
          steps: [
            "P1IFG.0 优先级最高，P1IFG.7 最低：引脚号越小越先报。",
            "先报 P1." + a + "：2 × (" + a + " + 1) = <b>" + hex(2 * (a + 1), 2) + "</b>",
            "读 P1IV 会自动清掉 P1IFG." + a + "；RETI 之后 P1IFG." + b + " 还在，会马上再触发一次中断。"
          ]
        };
      }
    },

    
    sp: {
      title: "中断前后的 SP",
      make: function (rnd) {
        var mode = pick(rnd, ["in", "out", "where"]);
        var sp = 2 * int(rnd, 0x2410 / 2, 0x4400 / 2);
        if (mode !== "in") sp = 2 * int(rnd, 0x2410 / 2, 0x43FC / 2);   
        if (mode === "in") {
          return {
            kind: "hex", ans: sp - 4,
            q: "进入中断前 SP = <b>" + hex(sp) + "</b>。CPU 接受中断、压完栈之后，SP = ?",
            fmt: "十六进制，例如 0x43FA",
            steps: [
              "栈向低地址增长，每压一个字 SP − 2。",
              "先压 PC：SP = " + hex(sp - 2) + "，存 PC.15:0。",
              "再压 SR：SP = <b>" + hex(sp - 4) + "</b>，存 SR（CPUx 把 PC.19:16 放在这个字的高 4 位）。"
            ]
          };
        }
        if (mode === "out") {
          return {
            kind: "hex", ans: sp + 4,
            q: "ISR 里没有再压栈，执行 <code>RETI</code> 之前 SP = <b>" + hex(sp) + "</b>。RETI 之后 SP = ?",
            fmt: "十六进制",
            steps: [
              "RETI 先弹 SR：SP = " + hex(sp + 2) + "。",
              "再弹 PC：SP = <b>" + hex(sp + 4) + "</b>，回到被打断的位置。"
            ]
          };
        }
        return {
          kind: "hex", ans: sp + 2,
          q: "CPU 刚进入 ISR，SP = <b>" + hex(sp) + "</b>。被保存的 PC（低 16 位）在哪个地址？",
          fmt: "十六进制",
          steps: [
            "栈顶 [SP] 是最后压入的 SR。",
            "PC 比 SR 先压，所以在它上面一个字：SP + 2 = <b>" + hex(sp + 2) + "</b>。"
          ]
        };
      }
    }
  };

  
  function fmt(x, d) { var s = (+x).toFixed(d == null ? 2 : d); return s.replace(/\.?0+$/, "") || "0"; }
  function hz(x) { return x >= 1e6 ? fmt(x / 1e6, 6) + " MHz" : x >= 1e3 ? fmt(x / 1e3, 3) + " kHz" : fmt(x, 2) + " Hz"; }

  
  GEN.addr = {
    title: "地址位数 ↔ 可寻址空间",
    make: function (rnd) {
      var n = int(rnd, 10, 20), kb = Math.pow(2, n) / 1024;
      if (rnd() < 0.5) return { kind: "dec", ans: kb, q: "地址有 <b>" + n + "</b> 位，按字节寻址，最多能寻址多少 KB？", fmt: "填 KB 数（1 KB = 1024 B）",
        steps: ["n 位地址 → 2<sup>n</sup> 个地址，每个地址 1 字节。", "2<sup>" + n + "</sup> = " + Math.pow(2, n) + " B = " + Math.pow(2, n) + " / 1024 = <b>" + kb + " KB</b>", "例：16 位 → 64 KB；20 位（CPUx）→ 1 MB。"] };
      return { kind: "dec", ans: n, q: "要按字节寻址 <b>" + (kb >= 1024 ? kb / 1024 + " MB" : kb + " KB") + "</b>，至少需要几位地址？", fmt: "填位数",
        steps: [(kb >= 1024 ? kb / 1024 + " MB" : kb + " KB") + " = " + Math.pow(2, n) + " B = 2<sup>" + n + "</sup> B", "所以需要 <b>" + n + "</b> 位地址。"] };
    }
  };
  GEN.endian = {
    title: "小端序：字在内存里怎么放",
    make: function (rnd) {
      var w = int(rnd, 0x1000, 0xFFFF), a = 2 * int(rnd, 0x2400 / 2, 0x43FE / 2), hi = rnd() < 0.5;
      return { kind: "hex", ans: hi ? (w >> 8) : (w & 0xFF),
        q: "字 <b>" + hex(w) + "</b> 存在地址 " + hex(a) + "（MSP430 是小端序）。地址 <b>" + hex(hi ? a + 1 : a) + "</b> 里的字节是？", fmt: "十六进制，例如 0x3C",
        steps: ["小端序（little endian）：低字节放在低地址，高字节放在高地址。", hex(a) + " ← 低字节 " + hex(w & 0xFF, 2) + "；" + hex(a + 1) + " ← 高字节 " + hex(w >> 8, 2) + "。", "答案：<b>" + hex(hi ? (w >> 8) : (w & 0xFF), 2) + "</b>"] };
    }
  };

  
  GEN.bitop = {
    title: "寄存器位运算",
    make: function (rnd) {
      var v = int(rnd, 0, 255), b = int(rnd, 0, 7), c = int(rnd, 0, 7), op = pick(rnd, ["or", "andnot", "xor", "or2"]), r, txt, why;
      if (op === "or") { r = v | (1 << b); txt = "P1OUT |= BIT" + b; why = "|= 把 BIT" + b + "（" + hex(1 << b, 2) + "）置 1，其他位不变"; }
      else if (op === "andnot") { r = v & ~(1 << b) & 0xFF; txt = "P1OUT &amp;= ~BIT" + b; why = "&amp;= ~ 把 BIT" + b + " 清 0：~" + hex(1 << b, 2) + " = " + hex(~(1 << b) & 0xFF, 2); }
      else if (op === "xor") { r = v ^ (1 << b); txt = "P1OUT ^= BIT" + b; why = "^= 把 BIT" + b + " 取反"; }
      else { if (c === b) c = (b + 3) % 8; r = v | (1 << b) | (1 << c); txt = "P1OUT |= BIT" + b + " | BIT" + c; why = "BIT" + b + " | BIT" + c + " = " + hex((1 << b) | (1 << c), 2) + "，一次置两位"; }
      var bin = function (x) { var s = x.toString(2); while (s.length < 8) s = "0" + s; return s.slice(0, 4) + " " + s.slice(4); };
      return { kind: "hex", ans: r, q: "P1OUT = <b>" + hex(v, 2) + "</b>。执行 <code>" + txt + ";</code> 之后 P1OUT = ?", fmt: "十六进制，例如 0xA5",
        steps: [why + "。", bin(v) + " → " + bin(r), "答案：<b>" + hex(r, 2) + "</b>"] };
    }
  };
  
  GEN.led = {
    title: "LED 限流电阻",
    make: function (rnd) {
      var voh = pick(rnd, [3.0, 3.2, 3.3, 3.5]), vd = pick(rnd, [1.8, 2.0, 2.1, 2.2]), id = pick(rnd, [2, 3, 4, 5]);
      var R = (voh - vd) / (id / 1000);
      return { kind: "num", ans: R, tol: 0.01, q: "V<sub>OH</sub> = " + voh + " V，LED 压降 V<sub>D</sub> = " + vd + " V，想要电流 I<sub>D</sub> = " + id + " mA。限流电阻 R = ? Ω", fmt: "填 Ω 数",
        steps: ["V<sub>OH</sub> = I<sub>D</sub>·R + V<sub>D</sub> → R = (V<sub>OH</sub> − V<sub>D</sub>) / I<sub>D</sub>", "= (" + voh + " − " + vd + ") / " + id + " mA = <b>" + fmt(R, 1) + " Ω</b>", "实际选一个接近的标准值，并确认 I<sub>D</sub> 不超过 I<sub>OH</sub> 上限（L14 的例子：3.5 V、2 V、5 mA → 300 Ω，选 270 Ω）。"] };
    }
  };

  
  GEN.fll = {
    title: "FLL 频率",
    make: function (rnd) {
      var flld = int(rnd, 0, 3), D = Math.pow(2, flld), N = int(rnd, 15, 127), n = pick(rnd, [1, 1, 2, 4]), ref = 32768;
      var div = ref * (N + 1) / n, dco = D * div, mode = pick(rnd, ["div", "dco", "inv"]);
      var given = "f<sub>FLLREF</sub> = 32768 Hz（XT1 或 REFO），FLLREFDIV → n = " + n + "，FLLN = " + N + "，FLLD = " + flld + "（D = " + D + "）";
      if (mode === "inv") {
        var M = int(rnd, 16, 128);
        return { kind: "dec", ans: M - 1, q: "n = 1、f<sub>FLLREF</sub> = 32768 Hz，想让 DCOCLKDIV = <b>" + hz(M * ref) + "</b>（" + (M * ref) + " Hz）。FLLN 应该是多少？", fmt: "十进制",
          steps: ["DCOCLKDIV = (N + 1) · f<sub>FLLREF</sub> / n", "N + 1 = " + (M * ref) + " / 32768 = " + M, "FLLN = <b>" + (M - 1) + "</b>"] };
      }
      return { kind: "num", ans: mode === "div" ? div : dco, tol: 0.0005, q: given + "。<b>" + (mode === "div" ? "DCOCLKDIV" : "DCOCLK") + "</b> = ? Hz", fmt: "填 Hz，例如 1048576",
        steps: ["DCOCLK = D · (N + 1) · f<sub>FLLREF</sub> / n；DCOCLKDIV = DCOCLK / D", "DCOCLK = " + D + " · " + (N + 1) + " · 32768 / " + n + " = " + dco + " Hz", "DCOCLKDIV = " + dco + " / " + D + " = " + div + " Hz", "答案：<b>" + (mode === "div" ? div : dco) + " Hz</b>（复位默认：D = 2、N + 1 = 32、n = 1 → 2097152 / 1048576 Hz）"] };
    }
  };

  
  GEN.bat = {
    title: "电池续航",
    make: function (rnd) {
      var cap = pick(rnd, [125, 225, 285]), i = pick(rnd, [0.8, 1.2, 2.5, 3.1, 7.4, 15, 42, 90, 180, 350]);
      var h = cap / (i / 1000), d = h / 24;
      return { kind: "num", ans: d, tol: 0.005, q: "纽扣电池 " + cap + " mAh，电路平均电流 <b>" + i + " µA</b>。理论上能用多少天？", fmt: "填天数，可以带小数",
        steps: ["续航 = 容量 / 平均电流", "= " + cap + " mAh / " + (i / 1000) + " mA = " + fmt(h, 1) + " h", "= " + fmt(h, 1) + " / 24 = <b>" + fmt(d, 2) + " 天</b>"] };
    }
  };

  
  GEN.timer = {
    title: "定时器周期与 CCR0",
    make: function (rnd) {
      for (var guard = 0; guard < 50; guard++) {
        var src = pick(rnd, [["ACLK", 32768], ["SMCLK", 1048576]]), ID = pick(rnd, [1, 2, 4, 8]), IDEX = pick(rnd, [1, 1, 2, 3, 5, 8]);
        var f = src[1] / (ID * IDEX), mode = pick(rnd, ["up", "cont", "updown", "upT"]);
        var T = pick(rnd, [0.01, 0.02, 0.05, 0.1, 0.125, 0.25, 0.4, 0.5, 1, 1.5]);
        if (src[0] === "ACLK" && ID === 8 && IDEX === 1) continue;          
        var cnt = T * f;
        if (Math.abs(cnt - Math.round(cnt)) > 1e-9 || cnt < 2 || cnt > 65536) continue;
        var clk = src[0] + " = " + src[1] + " Hz，ID = /" + ID + "，IDEX = /" + IDEX;
        var fl = "f<sub>timer</sub> = " + src[1] + " / (" + ID + " · " + IDEX + ") = " + fmt(f, 4) + " Hz";
        if (mode === "up") return { kind: "dec", ans: cnt - 1, q: clk + "，<b>up</b> 模式。想要周期 T = " + T + " s，TAxCCR0 = ?", fmt: "十进制",
          steps: [fl, "up 模式周期 = (CCR0 + 1) / f<sub>timer</sub>", "CCR0 = T · f − 1 = " + T + " · " + fmt(f, 4) + " − 1 = <b>" + (cnt - 1) + "</b>"] };
        if (mode === "upT") { var c0 = cnt - 1; return { kind: "num", ans: T * 1000, tol: 0.001, q: clk + "，<b>up</b> 模式，TAxCCR0 = " + c0 + "。CCR0 中断的周期是多少 ms？", fmt: "填 ms",
          steps: [fl, "T = (CCR0 + 1) / f = " + cnt + " / " + fmt(f, 4) + " = <b>" + fmt(T * 1000, 3) + " ms</b>"] }; }
        if (mode === "cont" && cnt > 65535) continue;                        
        if (mode === "cont") return { kind: "dec", ans: cnt, q: clk + "，<b>continuous</b> 模式。想每 " + T + " s 触发一次 CCR1 中断，每次在 ISR 里给 TAxCCR1 加多少？", fmt: "十进制",
          steps: [fl, "continuous 模式：CCRn(i+1) = CCRn(i) + N，N = T · f", "N = " + T + " · " + fmt(f, 4) + " = <b>" + cnt + "</b>（超过 65535 会按 65536 取模回绕）"] };
        if (cnt % 2) continue;
        return { kind: "dec", ans: cnt / 2, q: clk + "，<b>up/down</b> 模式。想要周期 T = " + T + " s，TAxCCR0 = ?", fmt: "十进制",
          steps: [fl, "up/down 模式周期 = 2 · CCR0 / f<sub>timer</sub>", "CCR0 = T · f / 2 = " + cnt + " / 2 = <b>" + (cnt / 2) + "</b>"] };
      }
      return GEN.timer.make(Math.random);
    }
  };

  
  GEN.pwm = {
    title: "PWM 占空比",
    make: function (rnd) {
      var m = pick(rnd, ["Toggle/Reset", "Set/Reset", "Toggle/Set", "Reset/Set"]), mode = pick(rnd, ["up", "up", "updown", "sq"]);
      if (mode === "sq") {
        var fc = pick(rnd, [32768, 1048576]), c0, f;
        do { c0 = int(rnd, 9, 999); f = fc / (2 * (c0 + 1)); } while (Math.abs(f - 20) < 2);   
        return { kind: "num", ans: f, tol: 0.002, q: "f<sub>clk</sub> = " + fc + " Hz，up 模式，OUT0 用 Toggle 模式，TAxCCR0 = " + c0 + "。输出方波的频率是多少 Hz？", fmt: "填 Hz",
          steps: ["每 (CCR0 + 1) 个时钟翻转一次，两次翻转是一个周期。", "f = f<sub>clk</sub> / (2 · (CCR0 + 1)) = " + fc + " / (2 · " + (c0 + 1) + ") = <b>" + fmt(f, 2) + " Hz</b>"] };
      }
      var c0u = int(rnd, 9, 199), cn = int(rnd, 1, c0u - 1), d, form;
      if (mode === "up") {
        if (m === "Toggle/Reset" || m === "Set/Reset") { d = (c0u - cn + 1) / (c0u + 1); form = "(CCR0 − CCRn + 1) / (CCR0 + 1)"; }
        else { d = cn / (c0u + 1); form = "CCRn / (CCR0 + 1)"; }
      } else {
        if (m === "Toggle/Reset") { d = cn / c0u; form = "CCRn / CCR0"; }
        else if (m === "Set/Reset") { d = (c0u + cn) / (2 * c0u); form = "(CCR0 + CCRn) / (2 · CCR0)"; }
        else if (m === "Toggle/Set") { d = (c0u - cn) / c0u; form = "(CCR0 − CCRn) / CCR0"; }
        else { d = (c0u - cn) / (2 * c0u); form = "(CCR0 − CCRn) / (2 · CCR0)"; }
      }
      return { kind: "num", ans: d * 100, tol: 0.002, abs: 0.06, q: "<b>" + (mode === "up" ? "up" : "up/down") + "</b> 模式，输出模式 <b>" + m + "</b>，TAxCCR0 = " + c0u + "，TAxCCR1 = " + cn + "。OUT1 的占空比是多少 %？", fmt: "填百分数，例如 30 或 30.5",
        steps: ["周期 = " + (mode === "up" ? "CCR0 + 1 = " + (c0u + 1) : "2 · CCR0 = " + (2 * c0u)) + " 个时钟", m + " 的占空比 = " + form, "= <b>" + fmt(d * 100, 2) + " %</b>"] };
    }
  };

  
  GEN.frame = {
    title: "UART 帧与传输时间",
    make: function (rnd) {
      var baud = pick(rnd, [1200, 2400, 4800, 9600, 14400, 19200, 28800, 57600, 115200]), db = pick(rnd, [7, 8]), par = pick(rnd, [0, 1]), sb = pick(rnd, [1, 2]);
      var bits = 1 + db + par + sb, nch = pick(rnd, [1, 10, 64, 100]);
      var t = nch * bits / baud * 1000;
      var cfg = db + (par ? "E" : "N") + sb;
      return { kind: "num", ans: t, tol: 0.002, q: "UART " + baud + " baud，格式 <b>" + cfg + "</b>（" + db + " 个数据位、" + (par ? "有" : "无") + "校验、" + sb + " 个停止位）。发送 " + nch + " 个字符最少要多少 ms？", fmt: "填 ms",
        steps: ["每帧位数 = 1（起始）+ " + db + "（数据）+ " + par + "（校验）+ " + sb + "（停止）= " + bits, "一位的时间 = 1 / " + baud + " s = " + fmt(1e6 / baud, 2) + " µs", "t = " + nch + " · " + bits + " / " + baud + " s = <b>" + fmt(t, 3) + " ms</b>"] };
    }
  };

  
  GEN.baud = {
    title: "波特率寄存器",
    make: function (rnd) {
      for (var g = 0; g < 80; g++) {
        var br = pick(rnd, [32768, 1048576, 4000000, 8000000]), bd = pick(rnd, [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]);
        var os = rnd() < 0.5 ? 0 : 1, N = br / bd;
        if (os === 0 && N < 3) continue;
        
        if (os === 1 && Math.floor(N / 16) < 2) continue;
        
        if (Math.abs(N - 16e6 / 115200) < 1e-6 || Math.abs(N - 4e6 / 115200) < 1e-6) continue;
        var head = "BRCLK = " + br + " Hz，目标 " + bd + " baud，<b>UCOS16 = " + os + "</b>。", nTxt = "N = BRCLK / baud = " + br + " / " + bd + " = " + fmt(N, 4);
        if (os === 0) {
          var ub = Math.floor(N), m = Math.round((N - ub) * 8), ask = pick(rnd, ["br", "s", "err"]);
          if (m === 8) continue;
          if (ask === "err") {
            var real = br / (ub + m / 8), err = (real - bd) / bd * 100;
            return { kind: "num", ans: err, abs: 0.02, q: head + "按 M34 的方法设 UCBRx、UCBRSx 之后，实际波特率相对目标的误差是多少 %？（偏快为正）", fmt: "填百分数，可为负",
              steps: [nTxt, "UCBRx = int(N) = " + ub + "；UCBRSx = M = round(" + fmt(N - ub, 4) + " · 8) = " + m, "N* = UCBRx + M/8 = " + fmt(ub + m / 8, 4) + "；实际 = " + br + " / " + fmt(ub + m / 8, 4) + " = " + fmt(real, 2) + " baud", "误差 = (" + fmt(real, 2) + " − " + bd + ") / " + bd + " = <b>" + fmt(err, 3) + " %</b>"] };
          }
          return { kind: "dec", ans: ask === "br" ? ub : m, q: head + "<b>" + (ask === "br" ? "UCBRx" : "UCBRSx") + "</b> = ?", fmt: "十进制",
            steps: [nTxt, "UCBRx = int(N) = " + ub, "UCBRSx = round((N − int N) · 8) = round(" + fmt((N - ub) * 8, 4) + ") = " + m, "答案：<b>" + (ask === "br" ? ub : m) + "</b>（TI 的表格是逐位优化的结果，个别情况会差 1）"] };
        }
        var n16 = N / 16, ub1 = Math.floor(n16), f = Math.round((n16 - ub1) * 16), ask1 = pick(rnd, ["br", "f"]);
        if (f === 16) continue;
        return { kind: "dec", ans: ask1 === "br" ? ub1 : f, q: head + "<b>" + (ask1 === "br" ? "UCBRx" : "UCBRFx") + "</b> = ?", fmt: "十进制",
          steps: [nTxt, "N / 16 = " + fmt(n16, 4), "UCBRx = int(N/16) = " + ub1, "UCBRFx = round(frac(N/16) · 16) = round(" + fmt((n16 - ub1) * 16, 4) + ") = " + f, "答案：<b>" + (ask1 === "br" ? ub1 : f) + "</b>"] };
      }
      return GEN.baud.make(Math.random);
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
    var inp = box.querySelector("input"), fmt = box.querySelector(".fmt"), fb = box.querySelector(".fb");
    h.textContent = g.title;
    var item, tries = 0, right = 0, counted = false;
    function upd() { tally.textContent = "本次 " + right + " / " + tries + "（每题只算第一次）"; }
    function fresh() {
      item = g.make(Math.random);
      dq.innerHTML = item.q; fmt.textContent = item.fmt || ""; inp.value = ""; fb.hidden = true; counted = false;
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
  window.MICROPractice = { GEN: GEN, check: check, readings: readings, num: num, hex: hex, VT: VT };
})();
