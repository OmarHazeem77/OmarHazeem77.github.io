/* The scene: a field of light particles plus the process thread modelled in Blender.
   Stage 0 portrait (hero) · 1-4 the story: the thread morphs Listen, As-Is, To-Be, Automate
   while the particles hang back as a quiet field · 5 field (work) · 6 portrait again (contact).
   main.js drives the stage from scroll; this file only renders. */
(function () {
  "use strict";

  var root = document.documentElement;
  var canvas = document.getElementById("scene");
  var motionOn = function () { return root.getAttribute("data-motion") === "on"; };
  var isMobile = function () { return window.innerWidth < 768; };

  function webglAvailable() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }

  if (!window.THREE || !window.PORTRAIT_POINTS || !webglAvailable()) {
    root.classList.add("no-webgl");
    window.Scene = { ready: Promise.resolve(), setStage: function () {}, intro: function () {}, available: false };
    return;
  }

  /* ---------- Random helpers ---------- */
  var seed = 1337;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function gauss() { var u = rnd() || 1e-6, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }

  /* ---------- Portrait points ---------- */
  var raw = atob(window.PORTRAIT_POINTS.data);
  var total = window.PORTRAIT_POINTS.count;
  var N = total;
  if ((navigator.hardwareConcurrency || 8) <= 4) N = Math.min(N, 18000);

  var A = {
    position: new Float32Array(N * 3),
    aPortrait: new Float32Array(N * 3),
    aField: new Float32Array(N * 3),
    aMeta: new Float32Array(N * 4),
    aRand: new Float32Array(N * 4)
  };
  function set3(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

  // 0 / 6 portrait: a relief, face pushed toward the camera.
  var H = 3.3;
  for (var i = 0; i < N; i++) {
    var o = i * 5;
    var u = (raw.charCodeAt(o) | (raw.charCodeAt(o + 1) << 8)) / 65535;
    var v = (raw.charCodeAt(o + 2) | (raw.charCodeAt(o + 3) << 8)) / 65535;
    var lum = 1 - raw.charCodeAt(o + 4) / 255;
    var dx = u - 0.5, dy = v - 0.34;
    var z = (lum - 0.45) * 0.22 + 0.42 * Math.exp(-(dx * dx / 0.018 + dy * dy / 0.03)) - 0.18 * Math.max(0, v - 0.62);
    set3(A.aPortrait, i, (u - 0.5) * H, (0.5 - v) * H, z + (rnd() - 0.5) * 0.02);
    A.aMeta[i * 4 + 2] = lum;
    A.aRand[i * 4] = rnd(); A.aRand[i * 4 + 1] = rnd(); A.aRand[i * 4 + 2] = rnd(); A.aRand[i * 4 + 3] = rnd();
  }

  // 5 ambient field: a wide, deep drift of dim points.
  for (i = 0; i < N; i++) {
    var rr2 = 2.2 + Math.pow(rnd(), 0.7) * 7.5, an = rnd() * 6.2832;
    set3(A.aField, i, Math.cos(an) * rr2, gauss() * 1.6, -2.5 + Math.sin(an) * rr2 * 0.8);
  }

  /* ---------- Three.js ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  // Authored as a display value: the renderer writes colours unconverted (LinearSRGB output).
  renderer.setClearColor(new THREE.Color().setRGB(4 / 255, 6 / 255, 10 / 255, THREE.LinearSRGBColorSpace), 1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  var dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  var scene = new THREE.Scene();
  var FOV = 35;
  var camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);

  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(A.position, 3));
  ["aPortrait", "aField"].forEach(function (k) {
    geometry.setAttribute(k, new THREE.BufferAttribute(A[k], 3));
  });
  geometry.setAttribute("aMeta", new THREE.BufferAttribute(A.aMeta, 4));
  geometry.setAttribute("aRand", new THREE.BufferAttribute(A.aRand, 4));

  var offsets = [];
  for (var s7 = 0; s7 < 7; s7++) offsets.push(new THREE.Vector3());

  var uniforms = {
    uTime: { value: 0 },
    uStage: { value: 0 },
    uIntro: { value: motionOn() ? 0 : 1 },
    uBurst: { value: motionOn() ? 1 : 0 },
    uDrift: { value: motionOn() ? 1 : 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseStrength: { value: 0 },
    uProj: { value: 800 },
    uSize: { value: 0.021 },
    uFieldDim: { value: 1 },
    uPhoto: { value: 0 },
    uOffsets: { value: offsets },
    uWhite: { value: new THREE.Vector3(0.91, 0.925, 0.95) },
    uAccent: { value: new THREE.Vector3(0.788, 0.949, 0.357) },
    uLight: { value: 0 }
  };

  var vertexShader = [
    "uniform float uTime, uStage, uIntro, uBurst, uDrift, uMouseStrength, uProj, uSize, uFieldDim, uPhoto;",
    "uniform vec3 uMouse;",
    "uniform vec3 uOffsets[7];",
    "uniform vec3 uWhite, uAccent;",
    "attribute vec3 aPortrait, aField;",
    "attribute vec4 aMeta, aRand;",
    "varying vec3 vColor;",
    "varying float vAlpha;",
    "varying float vBright;",

    "mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }",
    "mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }",

    // position, brightness (x), accent amount (y), size factor (z) for formation k
    "vec3 form(float k, out vec3 look){",
    "  vec3 p;",
    "  if (k < .5 || k > 5.5) {",
    "    p = aPortrait;",
    "    float l = aMeta.z;",
    "    look = vec3(.06 + .94 * pow(l, 1.35), 0., .7 + .6 * l);",
    "    look.x *= 1. - smoothstep(.72, .98, .5 - aPortrait.y / 3.3);",
    "  } else {",
    "    p = rotY(uTime * .02) * aField;",
    "    look = vec3((.16 + .2 * aRand.y) * uFieldDim, step(.97, aRand.w), .9);",
    "  }",
    "  int idx = int(k + .5);",
    "  for (int i = 0; i < 7; i++) { if (i == idx) p += uOffsets[i]; }",
    "  return p;",
    "}",

    "void main(){",
    "  float s = clamp(uStage, 0., 6.);",
    "  float k0 = floor(s);",
    "  float k1 = min(k0 + 1., 6.);",
    "  float f = s - k0;",
    "  float t = clamp((f - aRand.x * .35) / .65, 0., 1.);",
    "  t = t * t * (3. - 2. * t);",
    "  vec3 l0, l1;",
    "  vec3 p0 = form(k0, l0);",
    "  vec3 p1 = form(k1, l1);",
    "  vec3 pos = mix(p0, p1, t);",
    "  vec3 look = mix(l0, l1, t);",
    // burst between formations: particles fly outward and swirl, then settle
    "  vec3 dir = normalize(vec3(aRand.y - .5, aRand.z - .5, aRand.w - .5) + 1e-4);",
    "  float change = abs(step(.5, k0) * step(k0, 5.5) - step(.5, k1) * step(k1, 5.5));",
    "  float b = sin(3.14159 * t) * uBurst * change;",
    "  pos += dir * b * (.5 + aRand.w * 1.1);",
    "  pos = mix(pos, rotY(b * 1.4) * pos, .6 * b);",
    // intro: assemble from the field
    "  float it = clamp((uIntro - aRand.x * .45) / .55, 0., 1.);",
    "  it = 1. - pow(1. - it, 3.);",
    "  vec3 lf; vec3 pf = form(5., lf);",
    "  pos = mix(pf + dir * 1.5, pos, it);",
    "  look = mix(lf, look, it);",
    // drift
    // drift, held almost still on the portrait so the likeness survives
    "  float pw = ((k0 < .5 || k0 > 5.5) ? 1. - t : 0.) + ((k1 < .5 || k1 > 5.5) ? t : 0.);",
    "  pos += .012 * vec3(sin(uTime * .8 + aRand.x * 40.), cos(uTime * .7 + aRand.y * 40.), sin(uTime * .6 + aRand.z * 40.)) * uDrift * mix(1., .1, pw * it);",
    // cursor: push away and toward the camera
    "  vec3 dm = pos - uMouse; dm.z *= .3;",
    "  float d = length(dm);",
    "  float fm = exp(-d * d / (2. * .2 * .2)) * uMouseStrength;",
    "  pos += normalize(dm + 1e-4) * fm * .32 + vec3(0., 0., fm * .45);",
    "  vec4 mv = modelViewMatrix * vec4(pos, 1.);",
    "  gl_Position = projectionMatrix * mv;",
    "  gl_PointSize = max(uSize * look.z * (1. + fm * .8) * uProj / -mv.z, 1.);",
    "  if (uPhoto * pw > .985) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; }",
    "  vColor = mix(uWhite, uAccent, clamp(look.y + fm * .6, 0., 1.)) * look.x;",
    "  vBright = look.x;",
    // the portrait particles hand over to the real photo once they have assembled
    "  vColor *= 1. - uPhoto * pw;",
    "  vBright *= 1. - uPhoto * pw;",
    "  vAlpha = 1.;",
    "}"
  ].join("\n");

  var fragmentShader = [
    "precision mediump float;",
    "uniform float uLight;",
    "varying vec3 vColor;",
    "varying float vAlpha;",
    "varying float vBright;",
    "void main(){",
    "  vec2 c = gl_PointCoord - .5;",
    "  float d2 = dot(c, c);",
    "  if (d2 > .25) discard;",
    // hot core plus a soft halo, so dense areas glow instead of filling flat
    "  float core = exp(-d2 * 30.) * .8 + exp(-d2 * 9.) * .2;",
    // dark: light adds up into glow; light theme: ink dots laid over paper, so brightness becomes opacity
    "  if (uLight > .5) gl_FragColor = vec4(vColor / max(vBright, .001), clamp(core * vBright * .85, 0., 1.) * vAlpha);",
    "  else gl_FragColor = vec4(vColor * core * vAlpha, 1.);",
    "}"
  ].join("\n");

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  var points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  /* ---------- Light / dark ---------- */
  // Dark: a near-black ground where points add up into light. Light: a paper ground where the same points are
  // drawn as ink and olive dots. main.js fires "oh-theme" when the visitor switches.
  var THEMES = {
    dark:  { clear: [4, 6, 10],    white: [0.91, 0.925, 0.95], accent: [0.788, 0.949, 0.357], light: 0, blend: THREE.AdditiveBlending },
    light: { clear: [242, 243, 239], white: [0.09, 0.11, 0.14], accent: [0.30, 0.42, 0.0],   light: 1, blend: THREE.NormalBlending }
  };
  function setTheme(name) {
    var t = THEMES[name] || THEMES.dark;
    renderer.setClearColor(new THREE.Color().setRGB(t.clear[0] / 255, t.clear[1] / 255, t.clear[2] / 255, THREE.LinearSRGBColorSpace), 1);
    uniforms.uWhite.value.set(t.white[0], t.white[1], t.white[2]);
    uniforms.uAccent.value.set(t.accent[0], t.accent[1], t.accent[2]);
    uniforms.uLight.value = t.light;
    if (material.blending !== t.blend) { material.blending = t.blend; material.needsUpdate = true; }
    themeDirty = true;
  }
  var themeDirty = false;
  setTheme(document.documentElement.getAttribute("data-theme"));
  window.addEventListener("oh-theme", function (e) { setTheme(e.detail); });


  /* ---------- The process thread, modelled in Blender ---------- */
  // One tube in four poses that share topology (assets/js/thread-data.js), lit by a
  // Blender-rendered studio matcap (assets/js/matcap.js). The morph sweeps along its length.
  var thread = null;
  if (window.THREAD_DATA && window.THREAD_MATCAP) {
    var TD = window.THREAD_DATA;
    var bytes = function (b64) { var bin = atob(b64), out = new Uint8Array(bin.length); for (var j = 0; j < bin.length; j++) out[j] = bin.charCodeAt(j); return out.buffer; };
    var tg = new THREE.BufferGeometry();
    TD.positions.forEach(function (b64, k) {
      tg.setAttribute(k === 0 ? "position" : "aP" + k, new THREE.BufferAttribute(new Int16Array(bytes(b64)), 3, true));
    });
    TD.normals.forEach(function (b64, k) {
      tg.setAttribute(k === 0 ? "normal" : "aN" + k, new THREE.BufferAttribute(new Int8Array(bytes(b64)), 3, true));
    });
    var poseLen = TD.positions.map(function (b64) {
      var P = new Int16Array(bytes(b64)), L = 0, px = 0, py = 0, pz = 0;
      for (var sg = 0; sg < TD.segments; sg++) {
        var cx = 0, cy = 0, cz = 0;
        for (var rr = 0; rr < TD.ring; rr++) { var o = (sg * TD.ring + rr) * 3; cx += P[o]; cy += P[o + 1]; cz += P[o + 2]; }
        if (sg) L += Math.hypot(cx - px, cy - py, cz - pz);
        px = cx; py = cy; pz = cz;
      }
      return L / TD.ring / 32767 * TD.bound;
    });
    var tuv = new Float32Array(TD.count * 2);
    var tU = TD.u ? new Uint16Array(bytes(TD.u)) : null;
    for (var q = 0; q < TD.count; q++) {
      tuv[q * 2] = tU ? tU[q] / 65535 : Math.min(1, Math.floor(q / TD.ring) / (TD.segments - 1));
      // cap vertices (Blender appends them after the rings) are flagged so the shader can drop them; the domed tips close the tube
      tuv[q * 2 + 1] = q >= TD.segments * TD.ring ? -1 : (q % TD.ring) / TD.ring;
    }
    tg.setAttribute("uv", new THREE.BufferAttribute(tuv, 2));
    tg.setIndex(new THREE.BufferAttribute(new Uint16Array(bytes(TD.index)), 1));

    var img = new Image();
    var matcap = new THREE.Texture(img);
    img.onload = function () { matcap.needsUpdate = true; lastStage = -1; };
    img.src = window.THREAD_MATCAP;

    var tu = {
      uBound: { value: TD.bound }, uMorph: { value: 0 }, uDraw: { value: 0 }, uUndraw: { value: 0 },
      uTime: uniforms.uTime, uPulse: { value: 0 }, uPhase: { value: 0 }, uPW: { value: 1 }, uMatcap: { value: matcap }, uAccent: { value: new THREE.Vector3(0.788, 0.949, 0.357) }
    };
    var tmat = new THREE.ShaderMaterial({
      uniforms: tu,
      vertexShader: [
        "uniform float uBound, uMorph, uTime, uPhase, uPW, uPulse;",
        "attribute vec3 aP1, aP2, aP3, aN1, aN2, aN3;",
        "varying vec3 vN; varying vec3 vV; varying float vU; varying float vCap;",
        "vec3 P(float k){ return k < .5 ? position : (k < 1.5 ? aP1 : (k < 2.5 ? aP2 : aP3)); }",
        "vec3 Nm(float k){ return k < .5 ? normal : (k < 1.5 ? aN1 : (k < 2.5 ? aN2 : aN3)); }",
        "void main(){",
        "  float m = clamp(uMorph, 0., 3.);",
        "  float k0 = floor(m), k1 = min(k0 + 1., 3.), f = m - k0;",
        // the change travels along the thread from one end to the other
        "  float w = clamp(f * 1.6 - uv.x * .6, 0., 1.); w = w * w * (3. - 2. * w);",
        "  vec3 p = mix(P(k0), P(k1), w) * uBound;",
        "  vec3 n = normalize(mix(Nm(k0), Nm(k1), w) + 1e-5);",
        "  p += n * sin(3.14159 * w) * .03 * sin(uv.x * 48. + uTime * 3.);",
        "  p += n * .012 * sin(uv.x * 22. - uTime * 2.4);",
        // the tube swells a little as each pulse passes
        "  float bv = fract(uv.x * 4. - uPhase);",
        "  p += n * .026 * uPulse * exp(-pow((bv - .05) / (.034 * uPW), 2.));",
        "  vec4 mv = modelViewMatrix * vec4(p, 1.);",
        "  vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz); vU = uv.x; vCap = uv.y < -.5 ? 1. : 0.;",
        "  gl_Position = projectionMatrix * mv;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D uMatcap; uniform float uDraw, uUndraw, uTime, uPulse, uPhase, uPW; uniform vec3 uAccent;",
        "varying vec3 vN; varying vec3 vV; varying float vU; varying float vCap;",
        "void main(){",
        "  if (vCap > .01 || vU > uDraw || vU < uUndraw) discard;",
        "  vec3 n = normalize(vN); vec3 v = normalize(vV);",
        "  vec3 x = normalize(vec3(v.z, 0., -v.x)); vec3 y = cross(v, x);",
        "  vec3 col = texture2D(uMatcap, vec2(dot(x, n), dot(y, n)) * .465 + .5).rgb;",
        // the matcap was graded for a sphere; push contrast so thin tubes keep their black reflections and hot highlights
        "  col = clamp((col - .22) * 1.45 + .2, 0., 1.); col = col * col * (3. - 2. * col) * 1.12;",
        // lime pulses run along the thread in every shape
        "  float band = fract(vU * 4. - uPhase);",
        "  float core = exp(-pow((band - .05) / (.028 * uPW), 2.));",
        "  float halo = exp(-pow((band - .05) / (.1 * uPW), 2.)) * .6;",
        "  col = mix(col, uAccent * 1.55, core * uPulse) + uAccent * halo * uPulse;",
        "  float head = smoothstep(uDraw - .035, uDraw, vU) * step(uDraw, .999);",
        "  col += uAccent * head * 1.2;",
        // fade the reflection out at grazing angles so the silhouette never shows the matcap rim as a detached line
        "  col *= smoothstep(.02, .26, max(dot(n, v), 0.));",
        "  gl_FragColor = vec4(col, 1.);",
        "}"
      ].join("\n")
    });
    var tmesh = new THREE.Mesh(tg, tmat);
    tmesh.frustumCulled = false;
    var tgroup = new THREE.Group();
    tgroup.add(tmesh);
    tgroup.visible = false;
    scene.add(tgroup);
    // resting orientation per shape: scribble, tangle, flow (faces the viewer), loop
    var TROT = [[-0.25, 0.45, 0], [-0.35, 0.65, 0.12], [-0.08, 0.18, 0], [-0.55, 0.35, 0.2]];
    var TSPIN = [0.16, 0.09, 0, 0.42];
    thread = { group: tgroup, mesh: tmesh, u: tu, spin: 0, rot: new THREE.Euler(), len: poseLen };
  }

  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // Phones: the thread is placed in 3D units but the copy below it is sized in pixels, so on a short
  // phone (or with a longer act) the words climb into the thread. While the story holds the screen,
  // fit each pose into the free band between the 01-04 rail and the active act's title: keep its
  // usual spot when it fits, move it up when it doesn't, and shrink it only as a last resort.
  // Pose footprint at the usual placement, as a fraction of screen height (the same on every phone,
  // since the camera's vertical view is fixed): centre and half-height, per act.
  var POSE_C = [0.371, 0.378, 0.463, 0.38], POSE_H = [0.13, 0.13, 0.085, 0.145];
  var storyPin = document.querySelector("[data-story-pin]");
  var storyRail = storyPin && storyPin.querySelector(".story__rail");
  var fitY = null, fitS = 0.68;
  function mobileFit(k0, k1, f, gy, gs) {
    var out = { y: gy, s: gs };
    if (!storyPin || !storyRail) return out;
    var h = window.innerHeight, pr = storyPin.getBoundingClientRect();
    if (pr.top > 1 || pr.bottom < h - 1) return out;
    var title = storyPin.querySelector(".story__act.is-active .story__title");
    if (!title) return out;
    var top = (storyRail.getBoundingClientRect().bottom + 14) / h;
    var bottom = (title.getBoundingClientRect().top - 18) / h;
    var c = POSE_C[k0] + (POSE_C[k1] - POSE_C[k0]) * f;
    var hh = POSE_H[k0] + (POSE_H[k1] - POSE_H[k0]) * f;
    var k = Math.max(0.45, Math.min(1, (bottom - top) / (2 * hh)));
    var hk = hh * k;
    var c2 = bottom - top < 2 * hk ? (top + bottom) / 2 : Math.min(Math.max(c, top + hk), bottom - hk);
    // screen fraction to world units on the z = 0 plane the thread turns on
    var W = 2 * camera.position.z * Math.tan(FOV * Math.PI / 360);
    var off = ((0.5 - c) * W - gy) / gs;     // pose centre relative to the group origin, per unit of scale
    out.s = gs * k;
    out.y = (0.5 - c2) * W - off * out.s;
    return out;
  }

  function updateThread(dt, moving) {
    if (!thread) return;
    var s = stage;
    var draw = moving ? smooth(0.15, 1.0, s) : (s > 0.5 ? 1 : 0);
    var undraw = moving ? smooth(4.15, 4.9, s) : (s > 4.5 ? 1 : 0);
    thread.u.uDraw.value = draw;
    thread.u.uUndraw.value = undraw;
    thread.group.visible = draw > 0.001 && undraw < 0.999;
    var m = Math.min(3, Math.max(0, s - 1));
    thread.u.uMorph.value = m;
    thread.u.uPulse.value = 1;
    var pk0 = Math.floor(m), pk1 = Math.min(pk0 + 1, 3), pf = smooth(0, 1, m - pk0);
    var scl = isMobile() ? [1, 1, 1, 1] : [0.78, 0.78, 0.64, 0.8];
    var Ls = (thread.len[pk0] * scl[pk0]) * (1 - pf) + (thread.len[pk1] * scl[pk1]) * pf;
    var Lref = thread.len[3] * scl[3];               // the Automate loop sets the pace
    if (moving) thread.u.uPhase.value = (thread.u.uPhase.value + dt * 0.22 * Lref / Ls) % 1000;
    thread.u.uPW.value = Lref / Ls;                  // pulses keep the same length on screen too
    uniforms.uFieldDim.value = 1 - 0.45 * Math.min(draw, 1 - undraw);

    var k0 = Math.floor(m), k1 = Math.min(k0 + 1, 3), f = smooth(0, 1, m - k0);
    var spin = TSPIN[k0] + (TSPIN[k1] - TSPIN[k0]) * f;
    if (moving) thread.spin += dt * spin;
    var a = TROT[k0], b = TROT[k1];
    var t = uniforms.uTime.value;
    var tx = a[0] + (b[0] - a[0]) * f - pointer.sy * 0.25 + Math.sin(t * 0.37) * 0.07;
    var ty = a[1] + (b[1] - a[1]) * f + pointer.sx * 0.35 + thread.spin;
    var tz = a[2] + (b[2] - a[2]) * f;
    // the To-Be settles to face the viewer, so take the spin out as it arrives
    var face = 1 - Math.abs(m - 2) ; face = Math.max(0, face);
    ty = ty * (1 - face) + (b[1] * f + a[1] * (1 - f) + pointer.sx * 0.2 + Math.sin(t * 0.55) * 0.24) * face;
    tz += Math.sin(t * 0.43) * 0.05;
    var bob = Math.sin(t * 0.8) * 0.05;
    var e = 1 - Math.exp(-dt * 4);
    var g = thread.group;
    g.rotation.x += (tx - g.rotation.x) * e;
    g.rotation.y += (ty - g.rotation.y) * e;
    g.rotation.z += (tz - g.rotation.z) * e;
    if (isMobile()) {
      // the flat To-Be pose is short, so it sits lower, closer to its copy
      var MY = [0.8, 0.7, 0.2, 0.75];
      var fit = mobileFit(k0, k1, f, MY[k0] + (MY[k1] - MY[k0]) * f, 0.68);
      if (fitY === null || !moving) { fitY = fit.y; fitS = fit.s; }
      else { fitY += (fit.y - fitY) * e; fitS += (fit.s - fitS) * e; }
      g.position.set(0, fitY + bob, 0);
      g.scale.setScalar(fitS);
    }
    else {
      // the To-Be pose is the widest, so it settles a little smaller
      var TSC = [0.78, 0.78, 0.64, 0.8];
      g.position.set(1.75, bob, 0);
      g.scale.setScalar(TSC[k0] + (TSC[k1] - TSC[k0]) * f);
    }
  }

  /* ---------- The real photo, laid exactly over the particle portrait ---------- */
  var photo = document.querySelector("[data-portrait]");
  var photoOpacity = 0, photoKey = "", photoSize = "";
  var pA = new THREE.Vector3(), pB = new THREE.Vector3();
  function updatePhoto(dt, moving) {
    if (!photo) return;
    var s = stage;
    var hero = 1 - smooth(0.02, 0.16, s), contact = smooth(5.86, 5.98, s);
    var gate = moving ? smooth(0.82, 1.0, uniforms.uIntro.value) : 1;
    var target = Math.max(hero, contact) * gate;
    photoOpacity += (target - photoOpacity) * (1 - Math.exp(-dt * (moving ? 7 : 40)));
    if (Math.abs(target - photoOpacity) < 0.002) photoOpacity = target;
    uniforms.uPhoto.value = photoOpacity;
    // project the portrait square (3.3 units, at the hero or contact offset) to the screen
    var o = s < 3 ? offsets[0] : offsets[6];
    var half = 1.65, zp = 0.12;
    pA.set(o.x - half, o.y + half, zp).project(camera);
    pB.set(o.x + half, o.y - half, zp).project(camera);
    var w = window.innerWidth, h = window.innerHeight;
    var x0 = (pA.x * 0.5 + 0.5) * w, y0 = (-pA.y * 0.5 + 0.5) * h;
    var x1 = (pB.x * 0.5 + 0.5) * w, y1 = (-pB.y * 0.5 + 0.5) * h;
    var ry = moving ? pointer.sx * 3.2 : 0, rx = moving ? -pointer.sy * 2.2 : 0;
    var key = [x0, y0, x1 - x0, y1 - y0, ry, rx, photoOpacity].map(function (v) { return v.toFixed(2); }).join();
    if (key === photoKey) return;
    photoKey = key;
    var st = photo.style;
    var size = (x1 - x0).toFixed(0) + "x" + (y1 - y0).toFixed(0);
    if (size !== photoSize) { photoSize = size; st.width = (x1 - x0).toFixed(1) + "px"; st.height = (y1 - y0).toFixed(1) + "px"; }
    st.transform = "translate3d(" + x0.toFixed(1) + "px," + y0.toFixed(1) + "px,0) perspective(1400px) rotateY(" + ry.toFixed(2) + "deg) rotateX(" + rx.toFixed(2) + "deg)";
    st.opacity = photoOpacity.toFixed(3);
    st.visibility = photoOpacity < 0.005 ? "hidden" : "visible";
  }

  /* ---------- Layout: where each formation sits, and where the camera looks ---------- */
  // [camera x, y, z, look x, y, z] per stage, desktop. Mobile pulls back and centres.
  var CAM = [
    [0, 0, 5.7, 0, 0, 0],
    [0, 0.05, 6.4, 0, 0, 0],
    [0.25, 0.1, 6.3, 0.05, 0, 0],
    [0, 0, 6.2, 0, 0, 0],
    [-0.2, -0.05, 6.1, -0.05, 0, 0],
    [0, 0.2, 7.2, 0, 0, -1],
    [0, 0, 5.7, 0, 0, 0]
  ];
  var DESK_OFF = [[1.5, -0.36, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [1.5, -0.36, 0]];
  // Mobile: portrait sits above the hero copy; the camera pulls back for the thread.
  var MOB_OFF = [[0, 0.95, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 1.05, 0]];
  var MOB_Z = [2.6, 3.4, 3.4, 3.4, 3.4, 2.6, 2.6];

  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uProj.value = (h * dpr) / (2 * Math.tan((FOV * Math.PI) / 360));
    var mob = isMobile();
    var src = mob ? MOB_OFF : DESK_OFF;
    for (var k = 0; k < 7; k++) offsets[k].set(src[k][0], src[k][1], src[k][2]);
    uniforms.uSize.value = mob ? 0.019 : 0.021;
  }

  /* ---------- Pointer ---------- */
  var pointer = { x: 0, y: 0, sx: 0, sy: 0, active: false };
  var raycaster = new THREE.Raycaster();
  var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  var hit = new THREE.Vector3();
  var ndc = new THREE.Vector2();
  window.addEventListener("pointermove", function (e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.active = e.pointerType === "mouse" || e.pointerType === "pen";
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", function () { pointer.active = false; });

  /* ---------- Loop ---------- */
  var stageTarget = 0;
  var stage = 0;
  var clock = new THREE.Clock();
  var camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  var lastStage = -1;
  var held = false;
  var lastPhoto = -1;

  function camAt(s, out, look) {
    var k0 = Math.floor(s), k1 = Math.min(k0 + 1, 6), f = s - k0;
    f = f * f * (3 - 2 * f);
    var a = CAM[k0], b = CAM[k1];
    out.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    look.set(a[3] + (b[3] - a[3]) * f, a[4] + (b[4] - a[4]) * f, a[5] + (b[5] - a[5]) * f);
    if (isMobile()) { out.x *= 0.3; out.y *= 0.3; look.x = 0; look.y = 0; out.z += MOB_Z[k0] + (MOB_Z[k1] - MOB_Z[k0]) * f; }
  }

  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    var moving = motionOn();
    if (moving) uniforms.uTime.value += dt;

    var k = 1 - Math.exp(-dt * (moving ? 5 : 30));
    stage += (stageTarget - stage) * k;
    if (Math.abs(stageTarget - stage) < 0.0005) stage = stageTarget;
    uniforms.uStage.value = stage;

    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 4));
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 4));

    camAt(stage, camPos, camLook);
    if (moving) { camPos.x += pointer.sx * 0.28; camPos.y += pointer.sy * 0.18; }
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    var target = pointer.active && moving ? 1 : 0;
    uniforms.uMouseStrength.value += (target - uniforms.uMouseStrength.value) * (1 - Math.exp(-dt * 3));
    if (uniforms.uMouseStrength.value > 0.002) {
      ndc.set(pointer.x, pointer.y);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit);
    }

    updateThread(dt, moving);
    updatePhoto(dt, moving);
    var needs = moving || themeDirty || stage !== lastStage || uniforms.uIntro.value < 1 || Math.abs(uniforms.uPhoto.value - lastPhoto) > 0.001;
    themeDirty = false;
    lastPhoto = uniforms.uPhoto.value;
    if (needs && !document.hidden) renderer.render(scene, camera);
    lastStage = stage;
    requestAnimationFrame(frame);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(); lastStage = -1; }, 100);
  });

  layout();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);

  window.Scene = {
    available: true,
    ready: Promise.resolve(),
    setStage: function (s) { if (!held) stageTarget = Math.max(0, Math.min(6, s)); },
    release: function () { held = false; },
    getStage: function () { return stage; },
    intro: function () {
      if (!motionOn() || !window.gsap) { uniforms.uIntro.value = 1; return; }
      uniforms.uIntro.value = 0;
      gsap.to(uniforms.uIntro, { value: 1, duration: 2.6, ease: "power2.out" });
    },
    // For inspection: jump straight to a stage and render once.
    freeze: function (s) {
      held = true;
      stage = stageTarget = s;
      uniforms.uStage.value = s;
      uniforms.uIntro.value = 1;
      camAt(s, camPos, camLook);
      camera.position.copy(camPos); camera.lookAt(camLook);
      renderer.render(scene, camera);
    }
  };
})();
