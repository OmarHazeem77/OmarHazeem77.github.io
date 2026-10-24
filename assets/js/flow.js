/* Process-map engine: draws BPMN sequence flows (and dotted data associations) between the nodes of a pool,
   and moves tokens along them. A parallel gateway splits the token in two, the way BPMN tokens behave.

   Markup: a container with data-flow and data-assoc, nodes inside it with data-node="<id>".
     data-flow   routes separated by ";", nodes by ">". Consecutive routes that start at the same node run in
                 parallel (one token each), e.g. "start>a>split;split>b>join;split>c>join;join>end".
     data-assoc  "task:data task:data" draws a dotted association from a task to a data object.
     data-ports  "a>b:exit-enter" picks the sides an edge leaves and enters by (right, bottom, top, left), so the
                 two branches of a parallel gateway never share a segment. Without a hint the router decides.
   OHFlow.create(container) returns { layout(), set(progress 0..1), tokenX(), span }. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var uid = 0;

  function svgEl(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function create(root) {
    var id = "f" + (++uid);
    var nodes = {};
    root.querySelectorAll("[data-node]").forEach(function (n) { nodes[n.getAttribute("data-node")] = n; });
    var routes = (root.getAttribute("data-flow") || "").split(";").map(function (r) { return r.split(">").map(function (s) { return s.trim(); }); });
    var assoc = (root.getAttribute("data-assoc") || "").split(/\s+/).filter(Boolean).map(function (a) { return a.split(":"); });
    var ports = {};
    (root.getAttribute("data-ports") || "").split(/\s+/).filter(Boolean).forEach(function (h) { var kv = h.split(":"); ports[kv[0]] = kv[1].split("-"); });

    var svg = svgEl("svg", { "class": "flow", "aria-hidden": "true", focusable: "false" });
    root.insertBefore(svg, root.firstChild);
    var defs = svgEl("defs", {}, svg);
    // BPMN sequence-flow arrowhead (filled), once in ink and once in cobalt for the travelled flow
    [["a", "flow__head"], ["d", "flow__head flow__head--done"]].forEach(function (m) {
      var mk = svgEl("marker", { id: id + m[0], viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
      svgEl("path", { d: "M0 0L10 5L0 10z", "class": m[1] }, mk);
    });
    var gAssoc = svgEl("g", { "class": "flow__assoc" }, svg);
    var gBase = svgEl("g", { "class": "flow__base" }, svg);
    var gDone = svgEl("g", { "class": "flow__done" }, svg);
    var gTok = svgEl("g", { "class": "flow__tokens" }, svg);

    // visible nodes only: a node hidden at this breakpoint drops out of the route
    function visible(n) { return n && n.offsetParent !== null; }
    function box(n) {
      var shape = n.querySelector(".node__shape") || n;
      var r = shape.getBoundingClientRect(), s = svg.getBoundingClientRect();
      return { l: r.left - s.left, r: r.right - s.left, t: r.top - s.top, b: r.bottom - s.top, cx: r.left - s.left + r.width / 2, cy: r.top - s.top + r.height / 2 };
    }
    function edgeD(a, b, port) {
      var A = box(a), B = box(b);
      if (port) {
        var ex = port[0], en = port[1];
        var x1 = ex === "bottom" || ex === "top" ? A.cx : A.r, y1 = ex === "bottom" ? A.b : ex === "top" ? A.t : A.cy;
        var x2 = en === "left" ? B.l : en === "right" ? B.r : B.cx, y2 = en === "top" ? B.t : en === "bottom" ? B.b : B.cy;
        if (ex === "right" && (en === "bottom" || en === "top")) return "M" + x1 + " " + y1 + "H" + x2 + "V" + y2;
        if ((ex === "bottom" || ex === "top") && (en === "left" || en === "right")) return "M" + x1 + " " + y1 + "V" + y2 + "H" + x2;
        var ym = (y1 + y2) / 2;
        return "M" + x1 + " " + y1 + "V" + ym + "H" + x2 + "V" + y2;
      }
      if (B.l < A.r - 4) {
        // stacked: leave from the bottom (or top), enter from the top (or bottom)
        var down = B.cy > A.cy, y1 = down ? A.b : A.t, y2 = down ? B.t : B.b;
        if (Math.abs(A.cx - B.cx) < 2) return "M" + A.cx + " " + y1 + "V" + y2;
        var ym = (y1 + y2) / 2;
        return "M" + A.cx + " " + y1 + "V" + ym + "H" + B.cx + "V" + y2;
      }
      if (Math.abs(A.cy - B.cy) < 2) return "M" + A.r + " " + A.cy + "H" + B.l;
      var xm = A.r + Math.max(6, (B.l - A.r) / 2);
      return "M" + A.r + " " + A.cy + "H" + xm + "V" + B.cy + "H" + B.l;
    }

    var groups = [], span = 0, arrive = [];
    function layout() {
      [gAssoc, gBase, gDone, gTok].forEach(function (g) { g.textContent = ""; });
      var r = root.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + Math.max(1, r.width) + " " + Math.max(1, r.height));
      groups = []; span = 0; arrive = [];
      var drawn = {};
      routes.forEach(function (ids) {
        ids = ids.filter(function (i) { return visible(nodes[i]); });
        if (ids.length < 2) return;
        var d = "", len = 0, marks = [{ id: ids[0], at: 0 }];
        for (var i = 0; i < ids.length - 1; i++) {
          var key = ids[i] + ">" + ids[i + 1];
          var ed = edgeD(nodes[ids[i]], nodes[ids[i + 1]], ports[key]);
          if (!drawn[key]) { drawn[key] = 1; svgEl("path", { d: ed, "class": "flow__edge", "marker-end": "url(#" + id + "a)" }, gBase); }
          var probe = svgEl("path", { d: ed }, gBase);
          len += probe.getTotalLength(); probe.remove();
          d += ed; marks.push({ id: ids[i + 1], at: len });
        }
        var done = svgEl("path", { d: d, "class": "flow__edge flow__edge--done", "marker-end": "url(#" + id + "d)" }, gDone);
        done.style.strokeDasharray = len + " " + len; done.style.strokeDashoffset = len;
        var tok = svgEl("g", { "class": "token" }, gTok);
        svgEl("circle", { r: "11", "class": "token__halo" }, tok);
        svgEl("circle", { r: "6.5", "class": "token__core" }, tok);
        var route = { path: done, len: len, marks: marks, tok: tok };
        var last = groups[groups.length - 1];
        if (last && last.from === ids[0]) last.routes.push(route);
        else groups.push({ from: ids[0], routes: [route] });
      });
      groups.forEach(function (g) {
        g.start = span; g.span = Math.max.apply(null, g.routes.map(function (rt) { return rt.len; }));
        g.routes.forEach(function (rt) { rt.marks.forEach(function (m) { arrive.push({ id: m.id, s: g.start + m.at * (g.span / rt.len) }); }); });
        span += g.span;
      });
      assoc.forEach(function (p) {
        var a = nodes[p[0]], b = nodes[p[1]];
        if (!visible(a) || !visible(b)) return;
        var A = box(a), B = box(b);
        var x1 = Math.min(Math.max(B.cx, A.l + 8), A.r - 8), y1 = B.cy > A.cy ? A.b : A.t;
        svgEl("path", { d: "M" + x1 + " " + y1 + "L" + B.cx + " " + (B.cy > A.cy ? B.t : B.b), "class": "flow__dot" }, gAssoc);
      });
      api.span = span;
      set(cur);
    }

    var cur = 0, lead = { x: 0, y: 0 };
    function set(p) {
      cur = p;
      var s = p * span;
      groups.forEach(function (g, gi) {
        var f = Math.max(0, Math.min(1, (s - g.start) / (g.span || 1)));
        // a finished flow parks no token: the filled end event is the arrival
        var live = s >= g.start && (s < g.start + g.span || gi === groups.length - 1) && p < 0.999;
        g.routes.forEach(function (rt, ri) {
          rt.path.style.strokeDashoffset = rt.len * (1 - f);
          var pt = rt.path.getPointAtLength(rt.len * f);
          rt.tok.setAttribute("transform", "translate(" + pt.x + " " + pt.y + ")");
          rt.tok.classList.toggle("is-live", live);
          if (live && ri === 0) lead = pt;
        });
      });
      arrive.forEach(function (a) {
        var n = nodes[a.id];
        n.classList.toggle("is-done", s >= a.s - 0.5);
        n.classList.toggle("is-here", s >= a.s - span * 0.015 && s < a.s + span * 0.06);
      });
    }

    var api = { layout: layout, set: set, tokenX: function () { return lead.x; }, span: 0, root: root };
    layout();
    return api;
  }

  window.OHFlow = { create: create };
})();
