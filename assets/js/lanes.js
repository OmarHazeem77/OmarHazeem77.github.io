/* Swimlane choreography for the Process, Engagements and Background pools (flows drawn by flow.js).
   Process: pinned and panned sideways on wide screens with motion, a horizontal strip with motion off,
   four narrow lanes on phones; the token is scrubbed by scroll and a parallel gateway splits it in two. */
(function () {
  "use strict";
  var root = document.documentElement;
  var motion = root.getAttribute("data-motion") === "on";
  var hasGsap = !!window.gsap && !!window.ScrollTrigger;
  if (!window.OHFlow) return;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  var methodPool = document.querySelector("[data-method] .pool");
  var method = methodPool ? OHFlow.create(methodPool) : null;
  var career = Array.prototype.map.call(document.querySelectorAll(".lane__flow"), function (el) { var f = OHFlow.create(el); f.set(1); return f; });
  var mmapBody = document.querySelector(".mmap__body");
  var mobile = null;

  // each note lights up with its task
  var notes = methodPool ? Array.prototype.slice.call(methodPool.querySelectorAll("[data-note]")) : [];
  function syncNotes() {
    notes.forEach(function (n) {
      var task = methodPool.querySelector('[data-node="' + n.getAttribute("data-note") + '"]');
      n.classList.toggle("is-done", !!task && task.classList.contains("is-done"));
    });
  }
  if (method) { method.set(motion ? 0 : 1); syncNotes(); }

  function relayout() {
    if (method) { method.layout(); syncNotes(); }
    career.forEach(function (f) { f.layout(); });
    if (mobile) mobile.layout();
  }

  var section = document.querySelector(".method");
  var track = document.querySelector("[data-method-track]");
  var viewport = document.querySelector(".method__viewport");
  var meter = document.querySelector("[data-method-meter]");
  function pan() {
    var vw = viewport.clientWidth, max = Math.max(0, track.scrollWidth - vw);
    var tx = Math.min(0, Math.max(-max, vw * 0.4 - method.tokenX()));
    gsap.set(track, { x: tx });
    section.classList.toggle("is-panning", tx < -60);
  }

  if (hasGsap) {
    var mm = gsap.matchMedia();
    mm.add({ wide: "(min-width: 768px)", narrow: "(max-width: 767px)" }, function (ctx) {
      if (ctx.conditions.wide && motion && method) {
        relayout();
        var nav = document.querySelector("[data-nav]");
        var st = ScrollTrigger.create({
          trigger: "[data-method]", start: function () { return "top top+=" + ((nav ? nav.offsetHeight : 68) + 18); },
          end: function () { return "+=" + Math.round(track.scrollWidth * 1.05); },
          pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          refreshPriority: 1,   // measured before the triggers below it, so their starts include this pin's spacer
          onUpdate: function (self) {
            method.set(self.progress); syncNotes(); pan();
            if (meter) meter.style.transform = "scaleX(" + self.progress + ")";
          },
          onRefresh: function (self) { method.layout(); method.set(self.progress); syncNotes(); pan(); }
        });
        ScrollTrigger.sort();
        return function () { st.kill(); gsap.set(track, { clearProps: "transform" }); section.classList.remove("is-panning"); };
      }
      if (ctx.conditions.narrow && mmapBody) {
        if (!mobile) mobile = OHFlow.create(mmapBody); else mobile.layout();
        if (!motion) { mobile.set(1); return; }
        mobile.set(0);
        var st2 = ScrollTrigger.create({
          trigger: mmapBody, start: "top 70%", end: "bottom 70%", scrub: 0.4,
          onUpdate: function (self) { mobile.set(self.progress); },
          onRefresh: function (self) { mobile.layout(); mobile.set(self.progress); }
        });
        return function () { st2.kill(); };
      }
    });
  } else if (mmapBody) { mobile = OHFlow.create(mmapBody); mobile.set(1); }

  // the toolbar's readout counts the page like a modeler's zoom
  var readout = document.querySelector("[data-readout]");
  if (readout && hasGsap) ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (st) { readout.textContent = Math.round(st.progress * 100) + "%"; } });

  function refresh() { relayout(); if (hasGsap) ScrollTrigger.refresh(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener("load", refresh);
  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(relayout, 140); });
  window.addEventListener("oh-theme", function () { setTimeout(relayout, 60); });
})();
