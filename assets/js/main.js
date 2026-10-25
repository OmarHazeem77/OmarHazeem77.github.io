/* Choreography: loader, smooth scroll, scroll-to-stage mapping, kinetic type,
   interview questions, marquee, nav, motion preference, copy email. */
(function () {
  "use strict";

  var root = document.documentElement;
  var motion = root.getAttribute("data-motion") === "on";
  var hasGsap = !!window.gsap;
  var Scene = window.Scene || { setStage: function () {}, intro: function () {}, available: false };

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    // phones resize the viewport as the address bar shows and hides; re-measuring then would shift every trigger mid-swipe
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------- Motion preference ---------- */
  var toggle = document.querySelector("[data-motion-toggle]");
  var toggleLabel = document.querySelector("[data-motion-label]");
  function saveMotion(v) { try { localStorage.setItem("oh-motion", v); } catch (e) {} }
  toggle.setAttribute("aria-pressed", String(motion));
  toggleLabel.textContent = motion ? "Motion on" : "Motion off";
  toggle.setAttribute("aria-label", motion ? "Turn animations off" : "Turn animations on");
  toggle.addEventListener("click", function () {
    saveMotion(motion ? "off" : "on");
    location.reload();
  });
  /* ---------- Light / dark theme ---------- */
  // The head script already applied dark (the default) or the visitor's saved light choice; this button switches it and remembers the choice.
  // scene.js listens for "oh-theme" to recolour the 3D field.
  var themeBtn = document.querySelector("[data-theme-toggle]");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function applyTheme(t, fade) {
    if (fade) { root.classList.add("theme-fade"); clearTimeout(applyTheme.timer); applyTheme.timer = setTimeout(function () { root.classList.remove("theme-fade"); }, 520); }
    root.setAttribute("data-theme", t);
    if (themeMeta) themeMeta.setAttribute("content", t === "light" ? "#F2F3EF" : "#07090D");
    if (themeBtn) themeBtn.setAttribute("aria-label", t === "light" ? "Switch to dark mode" : "Switch to light mode");
    // the cut-out photo was matted on black; on paper it uses a copy with clean, feathered edges
    var photo = document.querySelector(".portrait-stage__img");
    if (photo) { var want = t === "light" ? "assets/img/portrait-light.webp" : "assets/img/portrait.webp"; if (photo.getAttribute("src") !== want) photo.setAttribute("src", want); }
    window.dispatchEvent(new CustomEvent("oh-theme", { detail: t }));
  }
  applyTheme(root.getAttribute("data-theme") || "dark", false);
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    try { localStorage.setItem("oh-theme", next); } catch (e) {}
    applyTheme(next, true);
  });

  var promptBox = document.querySelector("[data-motion-prompt-box]");
  if (root.hasAttribute("data-motion-prompt")) {
    promptBox.hidden = false;
    document.querySelector("[data-motion-yes]").addEventListener("click", function () { saveMotion("on"); location.reload(); });
    document.querySelector("[data-motion-no]").addEventListener("click", function () { saveMotion("off"); promptBox.hidden = true; });
  }

  /* ---------- Smooth scroll ---------- */
  // Lenis smooths the mouse wheel on desktops only. On touch screens, narrow windows and devtools' responsive
  // mode the browser scrolls natively: a native scroll there (a swipe, a scrollbar drag, a touch-drag in device
  // mode) ran under Lenis and got pulled back to Lenis's own position, which read as the page jumping up.
  var lenis = null;
  var smoothMQ = window.matchMedia("(pointer: fine) and (min-width: 1100px)");
  function setSmooth() {
    var want = motion && !!window.Lenis && hasGsap && smoothMQ.matches;
    if (want && !lenis) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
    } else if (!want && lenis) {
      lenis.destroy(); lenis = null;
    }
    window.OHLenis = lenis;
  }
  if (hasGsap) {
    gsap.ticker.add(function (t) { if (lenis) lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  setSmooth();
  if (smoothMQ.addEventListener) smoothMQ.addEventListener("change", function () { setSmooth(); if (hasGsap) ScrollTrigger.refresh(); });
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!lenis) return;   // native scrolling: the browser jumps to the section itself
      var id = a.getAttribute("href");
      var target = id === "#top" ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.6, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
    });
  });

  /* ---------- Scroll to stage ---------- */
  // Each [data-stage] section holds its formation while it fills the screen;
  // between sections the formation bursts and re-forms.
  var anchors = [];
  function buildAnchors() {
    var vh = window.innerHeight, sy = window.scrollY;
    buildActCentres();
    anchors = [];
    document.querySelectorAll("[data-stage]").forEach(function (el) {
      var r = el.getBoundingClientRect();
      var top = r.top + sy, bottom = r.bottom + sy;
      var s = parseFloat(el.getAttribute("data-stage"));
      var a = Math.max(0, top - vh * 0.38), b = bottom - vh * 0.72;
      anchors.push([a, s]);
      if (b > a) anchors.push([b, s]);
    });
    anchors.sort(function (p, q) { return p[0] - q[0]; });
  }
  function stageFor(y) {
    if (!anchors.length) return 0;
    if (y <= anchors[0][0]) return anchors[0][1];
    for (var i = 1; i < anchors.length; i++) {
      if (y <= anchors[i][0]) {
        var a = anchors[i - 1], b = anchors[i];
        var f = (y - a[0]) / Math.max(1, b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * f;
      }
    }
    return anchors[anchors.length - 1][1];
  }
  // Story position: 1..4 between the centres of the four act holds, continuous with the scroll
  var actCentres = [];
  function buildActCentres() {
    var vh = window.innerHeight, sy = window.scrollY;
    actCentres = Array.prototype.map.call(document.querySelectorAll(".story__step"), function (el) {
      var r = el.getBoundingClientRect();
      return ((r.top + sy - vh * 0.38) + (r.bottom + sy - vh * 0.72)) / 2;
    });
  }
  function storyPos(y) {
    var c = actCentres;
    if (c.length < 2) return 1;
    var i = 0;
    while (i < c.length - 2 && y > c[i + 1]) i++;
    return Math.max(0.4, Math.min(4.6, i + 1 + (y - c[i]) / Math.max(1, c[i + 1] - c[i])));
  }
  function syncStage() { var y = window.scrollY, s = stageFor(y); Scene.setStage(s); syncStory(s, storyPos(y)); }
  if (hasGsap) gsap.ticker.add(syncStage); else window.addEventListener("scroll", syncStage, { passive: true });

  /* ---------- Nav ---------- */
  var nav = document.querySelector("[data-nav]");
  if (hasGsap) {
    ScrollTrigger.create({
      start: 10, end: "max",
      onUpdate: function (self) {
        nav.toggleAttribute("data-scrolled", self.scroll() > 10);
        if (motion) nav.toggleAttribute("data-hidden", self.direction === 1 && self.scroll() > window.innerHeight * 0.8);
      }
    });
  }

  /* ---------- Kinetic type ---------- */
  var heroTl = null;
  var textSplits = [];   // headings and intro lines split for their entrance; undone when the width changes
  function splitAll() {
    if (!motion || !hasGsap || !window.SplitText) return;

    document.querySelectorAll('[data-split="chars"]').forEach(function (el) {
      var split = SplitText.create(el, { type: "lines,chars", mask: "lines", linesClass: "split-line" });
      textSplits.push(split);
      var inHero = !!el.closest(".hero");
      var tween = {
        yPercent: 118, rotate: 6, opacity: 0,
        duration: 1.15, ease: "expo.out", stagger: { each: 0.022 },
        transformOrigin: "0% 100%"
      };
      if (inHero) {
        gsap.set(split.chars, { yPercent: 118, rotate: 6, opacity: 0 });
        el._chars = split.chars;
      } else {
        tween.scrollTrigger = { trigger: el, start: "top 82%", once: true };
        gsap.from(split.chars, tween);
      }
    });

    document.querySelectorAll('[data-split="lines"]').forEach(function (el) {
      var split = SplitText.create(el, { type: "lines", mask: "lines" });
      textSplits.push(split);
      if (el.closest(".hero")) {
        gsap.set(split.lines, { yPercent: 105 });
        el._lines = split.lines;
      } else {
        gsap.from(split.lines, { yPercent: 105, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
      }
    });

    gsap.set(".hero [data-reveal]", { opacity: 0, y: 18 });

    gsap.utils.toArray(".timeline li").forEach(function (el, i) {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
  }

  function heroIn() {
    if (!motion || !hasGsap) return;
    var name = document.querySelector(".hero__name");
    var lede = document.querySelector(".hero__lede");
    heroTl = gsap.timeline({ delay: 0.15 });
    heroTl.to(".hero__role", { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" }, 0);
    if (name._chars) heroTl.to(name._chars, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.3, ease: "expo.out", stagger: 0.035 }, 0.1);
    if (lede._lines) heroTl.to(lede._lines, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09 }, 0.55);
    heroTl.to(".hero__actions", { opacity: 1, y: 0, duration: 1, ease: "expo.out" }, 0.8);
  }


  /* ---------- Statement: words light up as you scroll ---------- */
  var statement = document.querySelector("[data-statement]");
  if (statement && motion && hasGsap && window.SplitText) {
    var sw = SplitText.create(statement, { type: "words" });
    gsap.fromTo(sw.words, { opacity: 0.13 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: ".statement", start: "top 72%", end: "bottom 62%", scrub: 0.6 }
    });
  }

  /* ---------- Story: pinned; acts swap as the thread changes shape ---------- */
  var acts = Array.prototype.slice.call(document.querySelectorAll("[data-act]"));
  var rails = Array.prototype.slice.call(document.querySelectorAll("[data-rail]"));
  var railFill = document.querySelector("[data-rail-fill]");
  var story = document.querySelector(".story");
  var currentAct = 1;
  var actSplit = {};
  function prepareActs() {
    if (!motion || !hasGsap || !window.SplitText) return;
    acts.forEach(function (a) {
      actSplit[a.getAttribute("data-act")] = {
        title: SplitText.create(a.querySelector("[data-act-title]"), { type: "lines,chars", mask: "lines" }).chars,
        body: (function (sp) { a._words = sp.words; return sp.lines; })(SplitText.create(a.querySelector("[data-act-body]"), { type: "lines,words", mask: "lines", wordsClass: "story__word" })),
        extra: a.querySelector("[data-act-extra]")
      };
    });
  }
  function showAct(n) {
    if (n === currentAct) return;
    var dir = n > currentAct ? 1 : -1;
    var out = actSplit[currentAct], inn = actSplit[n];
    acts.forEach(function (a) { a.classList.toggle("is-active", +a.getAttribute("data-act") === n); });
    rails.forEach(function (r) { r.classList.toggle("is-active", +r.getAttribute("data-rail") === n); });
    if (out && inn) {
      gsap.to(out.title, { yPercent: -110 * dir, opacity: 0, duration: 0.32, ease: "power3.in", stagger: 0.004, overwrite: true });
      gsap.to(out.body, { yPercent: -100 * dir, opacity: 0, duration: 0.28, ease: "power3.in", overwrite: true });
      if (out.extra) gsap.to(out.extra, { opacity: 0, y: -12 * dir, duration: 0.22, overwrite: true });
      gsap.fromTo(inn.title, { yPercent: 115 * dir, opacity: 0, rotate: 4 * dir }, { yPercent: 0, opacity: 1, rotate: 0, duration: 0.85, ease: "expo.out", stagger: 0.012, delay: 0.14, overwrite: true });
      gsap.fromTo(inn.body, { yPercent: 105 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.05, delay: 0.22, overwrite: true });
      if (inn.extra) gsap.fromTo(inn.extra, { opacity: 0, y: 16 * dir }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", delay: 0.3, overwrite: true });
    }
    currentAct = n;
  }
  var litCache = {};
  function lightWords(n, p) {
    // the active act's words light up one after another between its arrival and the end of its hold
    var a = acts[n - 1], words = a && a._words;
    if (!words) return;
    var t = Math.max(0, Math.min(1, (p - (n - 0.55)) / 0.65));
    var key = Math.round(t * 200);
    if (litCache[n] === key) return;
    litCache[n] = key;
    var N = words.length;
    for (var i = 0; i < N; i++) {
      var w = Math.max(0, Math.min(1, (t * (N + 3) - i) / 3));
      words[i].style.setProperty("--lit", (0.2 + 0.8 * w).toFixed(3));
    }
  }
  function syncStory(s, p) {
    if (!story) return;
    var n = Math.max(1, Math.min(4, Math.round(s)));
    if (s > 0.6 && s < 4.6) showAct(n);
    if (p == null) p = s;
    // the rail fills continuously with the scroll, reaching each step's number as its act settles
    if (railFill) railFill.style.transform = (railFill.parentNode.offsetWidth > railFill.parentNode.offsetHeight ? "scaleX(" : "scaleY(") + Math.max(0, Math.min(1, (p - 1) / 3)).toFixed(4) + ")";
    if (motion) lightWords(currentAct, p);
  }

  /* ---------- Project cards pin and stack ---------- */
  if (motion && hasGsap) {
    var cards = gsap.utils.toArray(".project");
    cards.forEach(function (card, i) {
      if (i === cards.length - 1) return;
      gsap.to(card, {
        scale: 0.92, "--dim": 0.72, ease: "none",
        scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 18%", scrub: true }
      });
    });
  }

  /* ---------- Magnetic buttons and rolling link text ---------- */
  if (motion && hasGsap && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".btn").forEach(function (b) {
      var xTo = gsap.quickTo(b, "x", { duration: 0.6, ease: "power3" });
      var yTo = gsap.quickTo(b, "y", { duration: 0.6, ease: "power3" });
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.28);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }
  if (motion) {
    document.querySelectorAll(".nav__links a, .site-footer .link, a.btn").forEach(function (a) {
      if (a.querySelector(".roll") || a.children.length > 1) return;
      var html = a.innerHTML;
      a.innerHTML = '<span class="roll"><span>' + html + '</span><span aria-hidden="true">' + html + "</span></span>";
    });
  }

  /* ---------- Scroll progress and active nav ---------- */
  var progressBar = document.querySelector("[data-progress]");
  if (hasGsap) {
    if (progressBar) ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (self) { progressBar.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; } });
    document.querySelectorAll("[data-nav-link]").forEach(function (a) {
      var target = document.getElementById(a.getAttribute("data-nav-link"));
      if (!target) return;
      ScrollTrigger.create({
        trigger: target, start: "top 55%", end: "bottom 45%",
        onToggle: function (self) {
          a.classList.toggle("is-active", self.isActive);
          if (self.isActive) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        }
      });
    });
  }

  /* ---------- Deliverables: vertical scroll pans the gallery sideways (desktop, motion on) ---------- */
  var dSection = document.querySelector(".deliver");
  var dTrack = document.querySelector("[data-deliver-track]");
  // gsap.matchMedia builds the pan on wide screens and tears it down live when the window narrows
  // (a rotated tablet, or a browser's responsive mode), so the gallery never stays pinned on a phone
  if (dSection && dTrack && motion && hasGsap) gsap.matchMedia().add("(min-width: 900px)", function () {
    dSection.classList.add("is-pinned");
    var dist = function () { return Math.max(0, dTrack.scrollWidth - dTrack.parentElement.clientWidth + 24); };
    var pan = gsap.to(dTrack, {
      x: function () { return -dist(); },
      ease: "none",
      scrollTrigger: {
        trigger: dSection, start: "top top", end: function () { return "+=" + dist(); },
        pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
    // each object drifts against the pan and settles as it passes centre, so they read as objects in space
    gsap.utils.toArray(".deliver__card").forEach(function (card, i) {
      // the whole card (object and caption together) drifts, so the caption never leaves its object
      var fig = card.querySelector(".deliver__fig");
      var st = { trigger: card, containerAnimation: pan, start: "left right", end: "right left", scrub: true };
      gsap.fromTo(card, { xPercent: 10 }, { xPercent: -10, ease: "none", scrollTrigger: st });
      gsap.fromTo(fig, { rotate: i % 2 ? 2.5 : -2.5 }, { rotate: i % 2 ? -2.5 : 2.5, ease: "none", scrollTrigger: Object.assign({}, st) });
    });
    // arrival: the objects drop onto their shadows one after another
    gsap.from(".deliver__fig img", {
      yPercent: -16, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.09,
      scrollTrigger: { trigger: dSection, start: "top 70%", once: true }
    });
    return function () { dSection.classList.remove("is-pinned"); };
  });

  /* ---------- Custom cursor ---------- */
  // The dot is placed straight from the pointer event (no easing, no lag); the ring eases toward it
  // in its own light animation frame, independent of the 3D scene's frame rate.
  var cursor = document.querySelector("[data-cursor]");
  if (cursor && motion && window.matchMedia("(pointer: fine)").matches) {
    root.classList.add("has-cursor");
    var dot = cursor.querySelector("[data-cursor-dot]");
    var ring = cursor.querySelector("[data-cursor-ring]");
    var label = cursor.querySelector("[data-cursor-label]");
    var mx = -100, my = -100, rx = -100, ry = -100, rs = 1, rsTarget = 1;
    var wrapEl = null, pillW = 0, last = performance.now(), running = false;
    cursor.classList.add("is-hidden");

    function place(el, x, y, s) { el.style.transform = "translate3d(" + x + "px," + y + "px,0)" + (s ? " scale(" + s + ")" : ""); }
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var tx = mx, ty = my;
      if (wrapEl) {
        var r = wrapEl.getBoundingClientRect();
        tx = r.left + r.width / 2; ty = r.top + r.height / 2;
        ring.style.setProperty("--cw", (r.width + 12).toFixed(0) + "px");
        ring.style.setProperty("--ch", (r.height + 12).toFixed(0) + "px");
      } else if (pillW) {
        // the label pill sits below-right of the pointer, so the button it describes stays readable
        tx = mx + 14 + pillW / 2; ty = my + 26;
      }
      var k = 1 - Math.exp(-dt * 26);          // quick, light follow
      rx += (tx - rx) * k; ry += (ty - ry) * k;
      rs += (rsTarget - rs) * (1 - Math.exp(-dt * 18));
      place(ring, rx.toFixed(1), ry.toFixed(1), rs.toFixed(3));
      if (Math.abs(tx - rx) + Math.abs(ty - ry) + Math.abs(rsTarget - rs) > 0.15 || wrapEl) requestAnimationFrame(loop);
      else running = false;
    }
    function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      if (rx < -50) { rx = mx; ry = my; }
      cursor.classList.remove("is-hidden");
      place(dot, mx, my);
      kick();
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { cursor.classList.add("is-hidden"); });
    document.documentElement.addEventListener("mouseenter", function () { cursor.classList.remove("is-hidden"); });
    window.addEventListener("pointerdown", function () { rsTarget = 0.82; kick(); });
    window.addEventListener("pointerup", function () { rsTarget = 1; kick(); });

    var HOVER = "[data-cursor-text], .btn, a, button, .motion-toggle";
    function clearState() {
      cursor.classList.remove("is-wrap", "is-text", "is-link");
      ring.style.removeProperty("--cw"); ring.style.removeProperty("--ch");
      wrapEl = null; pillW = 0;
    }
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest(HOVER);
      clearState();
      if (!t) return;
      var text = t.getAttribute("data-cursor-text");
      if (text) {
        label.textContent = text;
        pillW = label.offsetWidth + 22;
        ring.style.setProperty("--cw", pillW + "px");
        cursor.classList.add("is-text");
      }
      else if (t.classList.contains("btn") || t.classList.contains("motion-toggle")) { wrapEl = t; cursor.classList.add("is-wrap"); }
      else cursor.classList.add("is-link");
      kick();
    });
    document.addEventListener("mouseout", function (e) {
      var from = e.target.closest(HOVER);
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(HOVER) : null;
      if (from && from !== to) { clearState(); kick(); }
    });
  }

  /* ---------- Interview questions ---------- */
  var questions = ["Who receives the request first?", "Where does it wait, and for how long?", "Which checks are still done by hand?", "What happens when a document is missing?", "Who has to approve it, and why?"];
  var qEl = document.querySelector("[data-questions]");
  if (qEl && hasGsap) {
    // Decode left to right; spaces and already-revealed letters stay put, so a glance never lands on noise.
    var LETTERS = "abcdefghijklmnopqrstuvwxyz";
    function decode(from, to) {
      var state = { p: 0 };
      var len = Math.max(from.length, to.length);
      return gsap.to(state, {
        p: 1, duration: 0.55, ease: "power2.out",
        onUpdate: function () {
          var cut = Math.floor(state.p * len), out = "";
          for (var i = 0; i < len; i++) {
            var ch = to.charAt(i);
            if (i < cut || ch === " " || ch === "" || /[?,]/.test(ch)) out += ch;
            else out += i < cut + 6 ? LETTERS.charAt((Math.random() * 26) | 0) : (from.charAt(i) === " " ? " " : from.charAt(i));
          }
          qEl.textContent = out.replace(/\s+$/, "");
        },
        onComplete: function () { qEl.textContent = to; }
      });
    }
    var qTl = gsap.timeline({ repeat: -1, paused: true });
    questions.forEach(function (q, i) {
      var next = questions[(i + 1) % questions.length];
      if (motion) qTl.add(function () { decode(q, next); }, "+=3.2");
      else qTl.call(function () { qEl.textContent = next; }, null, "+=3.6");
    });
    qTl.to({}, { duration: 0.6 });
    ScrollTrigger.create({
      trigger: ".story", start: "top 60%", end: "bottom 40%",
      onToggle: function (self) { if (self.isActive) qTl.play(); else qTl.pause(); }
    });
  }

  /* ---------- Marquee (speeds up with scroll velocity) ---------- */
  var track = document.querySelector("[data-marquee]");
  if (track && motion && hasGsap) {
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.parentNode.appendChild(clone);
    var loop = gsap.to([track, clone], { xPercent: -100, duration: 38, ease: "none", repeat: -1 });
    var boost = { v: 1 };
    ScrollTrigger.create({
      trigger: ".toolkit", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var v = Math.min(5, 1 + Math.abs(self.getVelocity()) / 600);
        gsap.to(boost, { v: v, duration: 0.2, overwrite: true, onUpdate: function () { loop.timeScale(boost.v * (self.direction === -1 ? -1 : 1)); } });
        gsap.to(boost, { v: 1, duration: 1.2, delay: 0.25, ease: "power2.out", onUpdate: function () { loop.timeScale(boost.v * (self.direction === -1 ? -1 : 1)); } });
      }
    });
  }

  /* ---------- Download CV: always save the file, never open it in the tab ---------- */
  // Online, the PDF is fetched and saved as a file. Opened straight from disk (file://), browsers ignore
  // the download attribute and fetch is blocked, so the PDF comes from assets/cv/cv-data.js instead.
  // Delegated, so the chatbot's CV link (data-cv) uses it too.
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var l = document.createElement("a");
    l.href = url; l.download = name; l.style.display = "none";
    document.body.appendChild(l); l.click(); l.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }
  function cvFromScript(name, href) {
    var fromB64 = function () {
      var bin = atob(window.OH_CV_PDF), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      saveBlob(new Blob([bytes], { type: "application/pdf" }), name);
    };
    if (window.OH_CV_PDF) { fromB64(); return; }
    var s = document.createElement("script");
    s.src = "assets/cv/cv-data.js";
    s.onload = function () { if (window.OH_CV_PDF) fromB64(); else location.href = href; };
    s.onerror = function () { location.href = href; };
    document.head.appendChild(s);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-cv]");
    if (!a) return;
    e.preventDefault();
    var name = a.getAttribute("download") || "Omar Hazeem - CV.pdf", href = a.getAttribute("href");
    if (location.protocol === "file:" || !window.fetch) { cvFromScript(name, href); return; }
    fetch(href).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { saveBlob(b, name); })
      .catch(function () { cvFromScript(name, href); });
  });

  /* ---------- Copy email ---------- */
  var copyBtn = document.querySelector("[data-copy]");
  var copyLabel = document.querySelector("[data-copy-label]");
  var status = document.querySelector("[data-copy-status]");
  var emailEl = document.querySelector("[data-email]");
  var resetTimer;
  copyBtn.addEventListener("click", function () {
    var email = emailEl.textContent.trim();
    var ok = function () {
      copyLabel.textContent = "Copied";
      status.textContent = "Email address copied.";
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { copyLabel.textContent = "Copy email"; status.textContent = ""; }, 2600);
    };
    var fail = function () {
      var range = document.createRange();
      range.selectNodeContents(emailEl);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      status.textContent = "Couldn't copy automatically. The address is selected, press Ctrl+C to copy it.";
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(email).then(ok, fail); else fail();
  });

  /* ---------- Loader, then the hero ---------- */
  var loader = document.querySelector("[data-loader]");
  function start() {
    splitAll();
    prepareActs();
    buildAnchors();
    if (hasGsap) ScrollTrigger.refresh();
    if (!motion || !hasGsap) {
      loader.remove();
      Scene.intro();
      return;
    }
    document.body.classList.add("is-loading");
    if (lenis) lenis.stop();
    var count = { v: 0 };
    var countEl = document.querySelector("[data-loader-count]");
    var bar = document.querySelector("[data-loader-bar]");
    gsap.timeline()
      .to(count, { v: 100, duration: 1.7, ease: "power2.inOut", onUpdate: function () { countEl.textContent = Math.round(count.v); } }, 0)
      .to(bar, { scaleX: 1, duration: 1.7, ease: "power2.inOut" }, 0)
      .to(loader, {
        yPercent: -100, duration: 1.1, ease: "expo.inOut",
        onStart: function () { Scene.intro(); heroIn(); },
        onComplete: function () {
          loader.remove();
          document.body.classList.remove("is-loading");
          if (lenis) lenis.start();
        }
      }, "+=0.1");
  }

  window.addEventListener("load", function () { buildAnchors(); if (hasGsap) ScrollTrigger.refresh(); });
  // Split lines keep the breaks of the width they were made at; when the width changes (a rotated phone, or a
  // browser's responsive mode) hand the text back to the browser so it wraps cleanly at the new width.
  var splitW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (!textSplits.length || Math.abs(window.innerWidth - splitW) < 24) return;
    splitW = window.innerWidth;
    textSplits.forEach(function (sp) { sp.revert(); });
    textSplits = [];
  });
  if (hasGsap) ScrollTrigger.addEventListener("refresh", buildAnchors);
  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(buildAnchors, 150); });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
