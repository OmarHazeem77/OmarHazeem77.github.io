/* As-Is to To-Be: an example process is mapped, scanned by an AI agent and rebuilt.
   One render(p) draws the whole diagram for a progress value 0..1. With motion on, scroll scrubs p
   while the section is pinned; with motion off, the As-Is / To-Be buttons set it. Work items travel
   the active flow in real time: one slow item loops through the As-Is, a steady stream runs the To-Be.
   Visual language: process-mining maps for the As-Is (Celonis), BPMN 2.0 swimlanes for the To-Be. */
(function () {
  "use strict";

  var section = document.querySelector("[data-transform]");
  if (!section) return;
  var svg = section.querySelector("[data-tf-svg]");
  var pinEl = section.querySelector("[data-tf-pin]");
  var statusEl = section.querySelector("[data-tf-status]");
  var phaseEls = Array.prototype.slice.call(section.querySelectorAll("[data-tf-phase]"));
  var modeBtns = Array.prototype.slice.call(section.querySelectorAll("[data-tf-mode]"));
  var metricEls = Array.prototype.slice.call(section.querySelectorAll("[data-tf-m]"));
  var deltaEls = Array.prototype.slice.call(section.querySelectorAll("[data-tf-delta]"));
  var root = document.documentElement;
  var motion = root.getAttribute("data-motion") === "on";
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var NS = "http://www.w3.org/2000/svg";

  /* ---------- The example process ---------- */
  // v: what the agent flags; to: the To-Be step it becomes (-1: removed); bad/good: how the flag reads
  var ASIS = [
    { l: ["Request arrives", "by email"], v: "Digitise", to: 0, good: 1 },
    { l: ["Log it in a", "spreadsheet"], v: "Automate", to: 1, good: 1 },
    { l: ["Forward to", "a reviewer"], v: "Remove", to: -1, bad: 1 },
    { l: ["Check documents", "by hand"], v: "Automate", to: 2, good: 1 },
    { l: ["Chase missing", "documents"], v: "Remove loop", to: -1, bad: 1 },
    { l: ["Re-key into", "the system"], v: "Duplicate", to: 1, bad: 1 },
    { l: ["Wait for", "the manager"], v: "Remove wait", to: 3, bad: 1 },
    { l: ["Print, sign", "and scan"], v: "Merge", to: 3 },
    { l: ["Second review"], v: "Duplicate", to: 2, bad: 1 },
    { l: ["Archive in", "shared folder"], v: "Automate", to: 4, good: 1 },
    { l: ["Email the", "requester"], v: "Automate", to: 4, good: 1 },
    { l: ["Done"], v: "Keep", to: 5, end: 1 }
  ];
  // [from, to, loop label]
  var EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0, "Rework"], [3, 5], [5, 6], [6, 7], [7, 8], [8, 3, "Re-check"], [8, 9], [9, 10], [10, 11]];
  var PAIN = { 5: "Typed twice", 6: "3-day wait" };
  // the path one work item really takes: round the rework loop, then round the re-check loop
  var ROUTE = [0, 1, 2, 3, 4, 0, 1, 2, 3, 5, 6, 7, 8, 3, 5, 6, 7, 8, 9, 10, 11];

  var TOBE = [
    { l: ["Request via", "portal"], lane: 0 },
    { l: ["AI intake", "and logging"], lane: 1, ai: 1 },
    { l: ["AI completeness", "check"], lane: 1, ai: 1 },
    { l: ["One-click", "approval"], lane: 2, human: 1 },
    { l: ["Auto archive", "and notify"], lane: 1, ai: 1 },
    { l: ["Done"], lane: 0, end: 1 }
  ];
  var LANES = ["Requester", "AI agent", "Team"];
  // the first As-Is step that reaches a To-Be step carries its label; the others merge into it
  var PRIMARY = {};
  ASIS.forEach(function (n, i) { if (n.to >= 0 && PRIMARY[n.to] === undefined) PRIMARY[n.to] = i; });

  var METRICS = [[12, 6], [8, 1], [2, 0]];
  var STATUS = [
    "As-Is · 12 steps · 2 rework loops · a 3-day wait",
    "AI agent scanning · flagging duplicates, manual re-keying and waits",
    "Redesigning · merging duplicates · automating checks · removing loops",
    "To-Be · 6 steps · one human decision · no rework"
  ];

  var LAYOUTS = {
    wide: {
      vb: [1280, 640], axis: "x", w: 176, h: 62, tw: 158, th: 62, endW: 104, fs: 15, lh: 19, chipFs: 11.5, r: 12, laneHead: 150,
      asis: [[140, 110], [420, 78], [690, 150], [400, 300], [130, 335], [700, 330], [960, 96], [985, 300], [720, 525], [420, 525], [990, 520], [1170, 315]],
      tobe: [[255, 140], [435, 320], [615, 320], [795, 500], [975, 320], [1165, 140]],
      lanes: [[50, 230], [230, 410], [410, 590]]
    },
    tall: {
      vb: [600, 1000], axis: "y", w: 236, h: 68, tw: 178, th: 72, endW: 120, fs: 18, lh: 22, chipFs: 14, r: 14, laneHead: 84,
      asis: [[150, 70], [445, 140], [165, 230], [450, 305], [145, 390], [455, 460], [160, 545], [440, 615], [170, 705], [450, 775], [160, 860], [450, 940]],
      tobe: [[100, 170], [300, 310], [300, 450], [500, 590], [300, 730], [100, 880]],
      lanes: [[0, 200], [200, 400], [400, 600]]
    }
  };

  /* ---------- Helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function label(parent, lines, fs, lh, cls) {
    var t = mk("text", { "class": cls, "text-anchor": "middle", "font-size": fs }, parent);
    lines.forEach(function (line, i) {
      var s = mk("tspan", { x: 0, y: f((i - (lines.length - 1) / 2) * lh), "dominant-baseline": "central" }, t);
      s.textContent = line;
    });
    return t;
  }
  function pill(parent, text, fs, cls) {
    var g = mk("g", { "class": cls }, parent);
    var w = Math.round(text.length * fs * 0.62 + fs * 1.5), h = Math.round(fs * 2.1);
    mk("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2 }, g);
    var t = mk("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": fs }, g);
    t.textContent = text;
    g._w = w; g._h = h;
    return g;
  }
  // As-Is connectors bow sideways so the map tangles the way real ones do; loops bow hardest
  function curve(a, b, i, loop) {
    var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / d, ny = dx / d, k = (i % 2 ? 1 : -1) * (loop ? 0.42 : 0.2) * d;
    return [[a[0] + dx * 0.25 + nx * k, a[1] + dy * 0.25 + ny * k], [a[0] + dx * 0.75 + nx * k, a[1] + dy * 0.75 + ny * k]];
  }
  function bez(a, c, b, t) {
    var u = 1 - t;
    return [u * u * u * a[0] + 3 * u * u * t * c[0][0] + 3 * u * t * t * c[1][0] + t * t * t * b[0],
            u * u * u * a[1] + 3 * u * u * t * c[0][1] + 3 * u * t * t * c[1][1] + t * t * t * b[1]];
  }
  // BPMN-style connector: leave toward the next lane, turn once with a rounded corner, enter the next step
  function elbow(L, a, b, aw, bw) {
    var r = L.r;
    if (L.axis === "x") {
      if (a[1] === b[1]) return { d: "M" + (a[0] + aw / 2) + "," + a[1] + "L" + (b[0] - bw / 2) + "," + b[1], end: [b[0] - bw / 2, b[1]] };
      var sy = b[1] > a[1] ? 1 : -1, y0 = a[1] + sy * L.th / 2, x1 = b[0] - bw / 2;
      return { d: "M" + a[0] + "," + y0 + "L" + a[0] + "," + (b[1] - sy * r) + "Q" + a[0] + "," + b[1] + " " + (a[0] + r) + "," + b[1] + "L" + x1 + "," + b[1], end: [x1, b[1]] };
    }
    if (a[0] === b[0]) return { d: "M" + a[0] + "," + (a[1] + L.th / 2) + "L" + b[0] + "," + (b[1] - L.th / 2), end: [b[0], b[1] - L.th / 2] };
    var sx = b[0] > a[0] ? 1 : -1, x0 = a[0] + sx * aw / 2, y1 = b[1] - L.th / 2;
    return { d: "M" + x0 + "," + a[1] + "L" + (b[0] - sx * r) + "," + a[1] + "Q" + b[0] + "," + a[1] + " " + b[0] + "," + (a[1] + r) + "L" + b[0] + "," + y1, end: [b[0], y1] };
  }
  var SPARK = "M0,-6C0.9,-1.4 1.4,-0.9 6,0C1.4,0.9 0.9,1.4 0,6C-0.9,1.4 -1.4,0.9 -6,0C-1.4,-0.9 -0.9,-1.4 0,-6Z";

  /* ---------- Build ---------- */
  var L, parts;
  function build() {
    L = window.matchMedia("(max-width: 767px)").matches ? LAYOUTS.tall : LAYOUTS.wide;
    var W = L.vb[0], H = L.vb[1];
    svg.textContent = "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("data-layout", L.axis === "x" ? "wide" : "tall");
    var defs = mk("defs", {}, svg);
    var pat = mk("pattern", { id: "tf-dots", width: 24, height: 24, patternUnits: "userSpaceOnUse" }, defs);
    mk("circle", { cx: 1, cy: 1, r: 1, "class": "tf-dot" }, pat);
    var grad = mk("linearGradient", { id: "tf-beam", x1: 0, y1: 0, x2: L.axis === "x" ? 1 : 0, y2: L.axis === "x" ? 0 : 1 }, defs);
    mk("stop", { offset: "0", "class": "tf-beam-0" }, grad);
    mk("stop", { offset: "0.85", "class": "tf-beam-1" }, grad);
    mk("stop", { offset: "1", "class": "tf-beam-2" }, grad);
    mk("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#tf-dots)" }, svg);

    parts = { nodes: [], edges: [], tEdges: [] };

    // swimlanes (To-Be)
    var lanes = mk("g", { "class": "tf-lanes" }, svg);
    L.lanes.forEach(function (band, i) {
      if (L.axis === "x") {
        mk("rect", { x: 0, y: band[0], width: W, height: band[1] - band[0], "class": "tf-lane" + (i % 2 ? " tf-lane--alt" : "") }, lanes);
        var t = mk("text", { x: 28, y: (band[0] + band[1]) / 2, "dominant-baseline": "central", "class": "tf-lane-label", "font-size": L.chipFs }, lanes);
        t.textContent = LANES[i].toUpperCase();
      } else {
        mk("rect", { x: band[0], y: 0, width: band[1] - band[0], height: H, "class": "tf-lane" + (i % 2 ? " tf-lane--alt" : "") }, lanes);
        var t2 = mk("text", { x: (band[0] + band[1]) / 2, y: 48, "text-anchor": "middle", "class": "tf-lane-label", "font-size": L.chipFs }, lanes);
        t2.textContent = LANES[i].toUpperCase();
      }
    });
    if (L.axis === "x") mk("line", { x1: L.laneHead, y1: L.lanes[0][0], x2: L.laneHead, y2: L.lanes[2][1], "class": "tf-lane-rule" }, lanes);
    else mk("line", { x1: 0, y1: L.laneHead, x2: W, y2: L.laneHead, "class": "tf-lane-rule" }, lanes);
    parts.lanes = lanes;

    // As-Is connectors and the route one item takes through them
    var eg = mk("g", { "class": "tf-edges" }, svg);
    var byPair = {};
    EDGES.forEach(function (e, i) {
      var a = L.asis[e[0]], b = L.asis[e[1]], c = curve(a, b, i, !!e[2]);
      byPair[e[0] + "-" + e[1]] = c;
      var path = mk("path", { d: "M" + a + "C" + c[0] + " " + c[1] + " " + b, "class": "tf-edge" + (e[2] ? " tf-edge--loop" : "") }, eg);
      var tag = null;
      if (e[2]) {
        tag = pill(eg, e[2], L.chipFs, "tf-pain");
        // sit the loop's label on the stretch of its curve furthest from any step, inside the frame
        var best = null, bestD = -1;
        for (var t = 0.2; t <= 0.8; t += 0.05) {
          var m = bez(a, c, b, t);
          if (m[0] < tag._w / 2 + 4 || m[0] > L.vb[0] - tag._w / 2 - 4 || m[1] < 20 || m[1] > L.vb[1] - 20) continue;
          var dmin = Infinity;
          L.asis.forEach(function (q) { dmin = Math.min(dmin, Math.max(Math.abs(m[0] - q[0]) - L.w / 2, Math.abs(m[1] - q[1]) - L.h / 2)); });
          if (dmin > bestD) { bestD = dmin; best = m; }
        }
        if (!best) best = bez(a, c, b, 0.5);
        tag.setAttribute("transform", "translate(" + f(best[0]) + "," + f(best[1]) + ")");
      }
      parts.edges.push({ path: path, tag: tag });
    });
    var rd = "M" + L.asis[ROUTE[0]];
    for (var r = 1; r < ROUTE.length; r++) { var c2 = byPair[ROUTE[r - 1] + "-" + ROUTE[r]]; rd += "C" + c2[0] + " " + c2[1] + " " + L.asis[ROUTE[r]]; }
    parts.route = mk("path", { d: rd, fill: "none", stroke: "none" }, svg);
    parts.routeLen = parts.route.getTotalLength();

    // To-Be connectors, drawn in once the steps have settled
    var tg = mk("g", { "class": "tf-tedges" }, svg);
    var td = "";
    for (var k = 0; k < TOBE.length - 1; k++) {
      var aw = TOBE[k].end ? L.endW : L.tw, bw = TOBE[k + 1].end ? L.endW : L.tw;
      var el = elbow(L, L.tobe[k], L.tobe[k + 1], aw, bw);
      td += el.d.replace(/^M/, k ? "L" : "M");
      var p = mk("path", { d: el.d, pathLength: 1, "class": "tf-tedge" }, tg);
      var head = mk("path", { d: L.axis === "x" ? "M-9,-5L0,0L-9,5Z" : "M-5,-9L0,0L5,-9Z", "class": "tf-arrow", transform: "translate(" + el.end + ")" }, tg);
      parts.tEdges.push({ path: p, head: head });
    }
    parts.troute = mk("path", { d: td, fill: "none", stroke: "none" }, svg);
    parts.trouteLen = parts.troute.getTotalLength();

    // work items
    parts.item = mk("circle", { r: L.axis === "x" ? 6 : 8, "class": "tf-item tf-item--asis" }, svg);
    parts.items = [0, 1, 2].map(function () { return mk("circle", { r: L.axis === "x" ? 5 : 7, "class": "tf-item tf-item--tobe" }, svg); });

    // the scanning beam
    var beam = mk("g", { "class": "tf-beam" }, svg);
    if (L.axis === "x") { mk("rect", { x: -180, y: 0, width: 180, height: H, fill: "url(#tf-beam)" }, beam); mk("line", { x1: 0, y1: 0, x2: 0, y2: H, "class": "tf-beam-line" }, beam); }
    else { mk("rect", { x: 0, y: -180, width: W, height: 180, fill: "url(#tf-beam)" }, beam); mk("line", { x1: 0, y1: 0, x2: W, y2: 0, "class": "tf-beam-line" }, beam); }
    parts.beam = beam;

    // steps
    var ng = mk("g", { "class": "tf-nodes" }, svg);
    ASIS.forEach(function (n, i) {
      var g = mk("g", { "class": "tf-node" }, ng);
      var w0 = n.end ? L.endW : L.w;
      var tgt = n.to >= 0 ? TOBE[n.to] : null;
      var w1 = tgt ? (tgt.end ? L.endW : L.tw) : w0;
      var base = mk("rect", { "class": "tf-box" }, g);
      var warn = mk("rect", { "class": "tf-box tf-box--warn" }, g);
      var good = mk("rect", { "class": "tf-box tf-box--good" + (tgt && tgt.human ? " tf-box--human" : "") }, g);
      var a = label(g, n.l, L.fs, L.lh, "tf-label");
      var b = PRIMARY[n.to] === i ? label(g, tgt.l, L.fs, L.lh, "tf-label tf-label--tobe") : null;
      var spark = null;
      if (tgt && tgt.ai && PRIMARY[n.to] === i) {
        spark = mk("g", { "class": "tf-spark" }, g);
        mk("circle", { r: L.axis === "x" ? 11 : 14 }, spark);
        mk("path", { d: SPARK, transform: "scale(" + (L.axis === "x" ? 1 : 1.3) + ")" }, spark);
      }
      var chip = pill(g, n.v, L.chipFs, "tf-chip" + (n.bad ? " tf-chip--bad" : n.good ? " tf-chip--good" : ""));
      var pain = PAIN[i] ? pill(g, PAIN[i], L.chipFs, "tf-pain") : null;
      parts.nodes.push({ g: g, base: base, warn: warn, good: good, a: a, b: b, spark: spark, chip: chip, pain: pain, w0: w0, w1: w1, n: n, tgt: tgt });
    });
  }

  /* ---------- Render one moment of the transformation ---------- */
  var lastPhase = -1, lastP = -1;
  function render(p) {
    var W = L.vb[0], H = L.vb[1], X = L.axis === "x";
    var painIn = seg(p, 0.03, 0.12), painOut = 1 - seg(p, 0.42, 0.48);
    var scan = seg(p, 0.18, 0.42);
    var beamPos = lerp(-60, (X ? W : H) + 200, scan);
    var chipOut = 1 - seg(p, 0.44, 0.5);
    var mp = seg(p, 0.45, 0.8);
    var edgeOp = 1 - seg(p, 0.42, 0.54);

    parts.beam.setAttribute("transform", X ? "translate(" + f(beamPos) + ",0)" : "translate(0," + f(beamPos) + ")");
    parts.beam.style.opacity = scan > 0 && scan < 1 ? 1 : 0;
    parts.lanes.style.opacity = seg(p, 0.56, 0.72);

    parts.edges.forEach(function (e) {
      e.path.style.opacity = edgeOp;
      if (e.tag) e.tag.style.opacity = painIn * painOut;
    });
    parts.tEdges.forEach(function (e, i) {
      var d = seg(p, 0.66 + i * 0.022, 0.74 + i * 0.022);
      e.path.style.strokeDashoffset = (1 - d).toFixed(3);
      e.head.style.opacity = d > 0.96 ? 1 : 0;
    });

    parts.nodes.forEach(function (o, i) {
      var a = L.asis[i], n = o.n;
      var ti = ease(seg(mp, i / 11 * 0.38, i / 11 * 0.38 + 0.62));
      var b = n.to >= 0 ? L.tobe[n.to] : a;
      var x = lerp(a[0], b[0], ti), y = lerp(a[1], b[1], ti);
      var op = 1, sc = 1;
      if (n.to < 0) { op = 1 - seg(ti, 0, 0.45); sc = 1 - 0.3 * seg(ti, 0, 0.45); }
      else if (PRIMARY[n.to] !== i) op = 1 - seg(ti, 0.5, 0.85);
      var w = lerp(o.w0, o.w1, ti), h = lerp(L.h, n.to >= 0 ? L.th : L.h, ti);
      [o.base, o.warn, o.good].forEach(function (rct) {
        rct.setAttribute("x", f(-w / 2)); rct.setAttribute("y", f(-h / 2));
        rct.setAttribute("width", f(w)); rct.setAttribute("height", f(h));
        rct.setAttribute("rx", n.end ? f(h / 2) : 10);
      });
      o.g.setAttribute("transform", "translate(" + f(x) + "," + f(y) + ")" + (sc !== 1 ? " scale(" + sc.toFixed(3) + ")" : ""));
      o.g.style.opacity = op.toFixed(3);

      // the beam reaches this step: flag it
      var pos = X ? a[0] : a[1];
      var hit = clamp01((beamPos - pos) / 90);
      var flag = hit * chipOut;
      var arrive = n.to >= 0 && PRIMARY[n.to] === i ? seg(ti, 0.55, 1) : 0;
      o.warn.style.opacity = (n.bad ? flag : 0).toFixed(3);
      o.good.style.opacity = Math.max(n.good ? flag * 0.85 : 0, o.tgt && (o.tgt.ai || o.tgt.human) ? arrive : 0).toFixed(3);
      o.chip.style.opacity = flag.toFixed(3);
      o.chip.setAttribute("transform", "translate(" + f(o.w0 / 2 - o.chip._w / 2) + "," + f(-L.h / 2 - o.chip._h / 2 - 6 + (1 - hit) * 6) + ")");
      if (o.pain) {
        var pin = clamp01((painIn - i * 0.02) * 1.4) * painOut;
        o.pain.style.opacity = pin.toFixed(3);
        o.pain.setAttribute("transform", "translate(0," + f(L.h / 2 + o.pain._h / 2 + 6) + ")");
      }
      var swap = o.b ? seg(ti, 0.35, 0.65) : 0;
      o.a.style.opacity = (1 - swap).toFixed(3);
      if (o.b) o.b.style.opacity = swap.toFixed(3);
      if (o.spark) {
        o.spark.style.opacity = arrive.toFixed(3);
        o.spark.setAttribute("transform", "translate(" + f(-w / 2) + "," + f(-h / 2) + ")");
      }
    });

    // metrics and phase
    METRICS.forEach(function (m, i) { if (metricEls[i]) metricEls[i].textContent = Math.round(lerp(m[0], m[1], mp)); });
    var dOp = seg(p, 0.8, 0.88);
    deltaEls.forEach(function (d) { d.style.opacity = dOp; });
    section.classList.toggle("is-tobe", p >= 0.8);
    var phase = p < 0.18 ? 0 : p < 0.42 ? 1 : p < 0.8 ? 2 : 3;
    if (phase !== lastPhase) {
      lastPhase = phase;
      phaseEls.forEach(function (el, i) { el.classList.toggle("is-active", i === phase); el.classList.toggle("is-done", i < phase); });
      if (statusEl) statusEl.textContent = STATUS[phase];
    }
    modeBtns.forEach(function (bt, i) { bt.setAttribute("aria-pressed", String(i === (p >= 0.6 ? 1 : 0))); });
    lastP = p;
  }

  // work items: one slow item stumbles through the As-Is loops; a steady stream runs the To-Be
  function items(now, p) {
    var asOp = 1 - seg(p, 0.42, 0.54), toOp = seg(p, 0.8, 0.88);
    var u = (now / 16000) % 1;
    var pt = parts.route.getPointAtLength(u * parts.routeLen);
    parts.item.setAttribute("cx", f(pt.x)); parts.item.setAttribute("cy", f(pt.y));
    parts.item.style.opacity = asOp;
    parts.items.forEach(function (c, i) {
      var v = ((now / 4200) + i / 3) % 1;
      var q = parts.troute.getPointAtLength(v * parts.trouteLen);
      c.setAttribute("cx", f(q.x)); c.setAttribute("cy", f(q.y));
      c.style.opacity = (toOp * Math.min(1, v * 8, (1 - v) * 8)).toFixed(3);
    });
  }

  build();
  render(0);

  /* ---------- Drive it ---------- */
  var target = 0, cur = 0, st = null, play = { v: 0 }, playTween = null;
  function setTarget(p) { target = p; if (!motion) { cur = p; render(p); items(0, p); } }
  // unpinned with motion on: tween the progress so the change still reads as a transformation
  function playTo(v, dur, delay) {
    if (playTween) playTween.kill();
    play.v = target;
    playTween = gsap.to(play, { v: v, duration: dur, delay: delay || 0, ease: dur > 4 ? "none" : "power2.inOut", onUpdate: function () { target = play.v; } });
  }

  if (motion && hasGsap) {
    var mm = gsap.matchMedia();
    // Tall enough to hold the whole panel on screen: pin it and let scroll scrub the transformation.
    mm.add("(min-height: 560px)", function () {
      section.classList.add("is-pinned");
      st = ScrollTrigger.create({
        trigger: pinEl, start: "top top", end: function () { return "+=" + Math.round(window.innerHeight * 2.2); },
        pin: true, anticipatePin: 1, invalidateOnRefresh: true,
        // this pin sits above the Deliverables pin but is created after it (main.js runs first),
        // so it must be measured first or the gallery pins too early and covers the Work cards
        refreshPriority: 1,
        onUpdate: function (self) { target = self.progress; }
      });
      return function () { section.classList.remove("is-pinned"); st = null; };
    });
    // Too short to pin (a phone held sideways): play it through each time the panel comes into view.
    mm.add("(max-height: 559.98px)", function () {
      target = 0;
      ScrollTrigger.create({
        trigger: section.querySelector(".tf__panel"), start: "top 75%", end: "bottom 25%",
        onEnter: function () { target = 0; playTo(1, 7.5, 1); },
        onEnterBack: function () { target = 0; playTo(1, 7.5, 1); }
      });
      return function () { if (playTween) playTween.kill(); };
    });
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    var running = false, visible = false;
    function frame(now) {
      if (!visible) { running = false; return; }
      cur += (target - cur) * 0.14;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      if (cur !== lastP) render(cur);
      items(now, cur);
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(frame); }
    }).observe(section);
  } else {
    items(0, 0);
  }

  modeBtns.forEach(function (bt) {
    bt.addEventListener("click", function () {
      var to = bt.getAttribute("data-tf-mode") === "1" ? 1 : 0;
      if (st) {
        var y = to ? st.end - 2 : st.start + 2;
        if (window.OHLenis) window.OHLenis.scrollTo(y, { duration: 2.2, easing: function (x) { return 1 - Math.pow(1 - x, 3); } });
        else window.scrollTo({ top: y, behavior: "smooth" });
      } else if (motion && hasGsap) playTo(to, 2.4);
      else setTarget(to);
    });
  });

  var wasTall = L.axis === "y";
  window.addEventListener("resize", function () {
    var tall = window.matchMedia("(max-width: 767px)").matches;
    if (tall !== wasTall) {
      wasTall = tall; build(); lastP = -1; lastPhase = -1; render(cur); items(0, cur);
      if (hasGsap) ScrollTrigger.refresh();   // the panel changed height, so the pin length must too
    }
  });
})();
