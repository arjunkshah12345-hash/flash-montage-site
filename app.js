// flash-montage site. The hero plays a real cut list made by the skill's own builder (media/cut.json):
// origin, three decelerating bursts, three live 3D holds that glitch out into code, then the mark.
document.documentElement.classList.add("js");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FPS = 30;

// ---------------------------------------------------------------- the curve (same as scripts/build_montage.py)
export function burstFrames(n, a, b, p) {
  const out = [];
  let acc = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const x = i / Math.max(1, n - 1);
    acc += a + (b - a) * Math.pow(x, p);
    const cut = Math.max(prev + 1, Math.round(acc));
    out.push(cut - prev);
    prev = cut;
  }
  return out;
}

const cut = await fetch("media/cut.json").then((r) => r.json());
const SHOTS = cut.bursts.flatMap((b) => b.shots);

// ---------------------------------------------------------------- entrances
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const kids = e.target.querySelectorAll(":scope > *, :scope .four > *, :scope .act > *");
    kids.forEach((k, i) => (k.style.transitionDelay = `${Math.min(i, 8) * 75}ms`));
    e.target.classList.add("in");
    io.unobserve(e.target);
  }
}, { rootMargin: "0px 0px -12% 0px" });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// ---------------------------------------------------------------- hero reel
const HOLD_STILL = { "retro-terminal": "media/render/f40.jpg", "particle-sphere": "media/render/f215.jpg", "wire-flower": "media/render/f360.jpg", moon: "media/render/f600.jpg" };
const ACTS = ["A", "B", "C"];
const seq = [{ kind: "origin", f: cut.origin.frames, spec: cut.origin.specimen, gf: cut.origin.glitch_frames, glitch: "block", s: 0, label: "Origin" }];
let si = 0;
cut.bursts.forEach((b, bi) => {
  b.shots.forEach((sh, k) => seq.push({ kind: "shot", f: sh.f, shot: sh, s: si++, label: `Burst ${ACTS[bi]}, shot ${k + 1} of ${b.shots.length}` }));
  seq.push({ kind: "hold", f: b.hold.frames, spec: b.hold.specimen, gf: b.hold.glitch_frames, glitch: b.hold.glitch, s: si, label: `Hold ${ACTS[bi]}` });
});
seq.push({ kind: "mark", f: cut.mark.frames, s: 0, label: "Mark" });

const reel = document.getElementById("reel");
const slots = {};
reel.querySelectorAll(".slot").forEach((el) => (slots[el.dataset.k] = el));
const liveImg = document.getElementById("live-img");
const cv = document.getElementById("live-cv"), cx = cv.getContext("2d");
const gl = document.getElementById("live-gl"), gx = gl.getContext("2d");
const markEl = document.getElementById("live-mark");
const now = document.getElementById("hero-now");
const toggle = document.getElementById("reel-toggle");

// preload every shot so 1-frame cuts never show a blank
const cache = SHOTS.map((s) => { const im = new Image(); im.decoding = "async"; im.src = s.src; return im; });

function setNeighbours(e) {
  const N = SHOTS.length, at = (i) => SHOTS[((i % N) + N) % N];
  for (const k of [-2, -1, 1, 2]) {
    const i = e.kind === "shot" ? e.s + k : (k < 0 ? e.s + k : e.s + k - 1);
    const sh = at(i), img = slots[k].firstElementChild;
    if (img.dataset.src !== sh.src) { img.src = sh.src; img.dataset.src = sh.src; }
    img.style.objectFit = sh.fit; slots[k].style.background = sh.bg;
  }
}

let S = null, G = null;
const specs = {};
async function loadSpecimens() {
  try {
    [S, G] = await Promise.all([import("./js/procedural/specimens.js"), import("./js/procedural/glitch.js")]);
    const opts = { product: "flash-montage", prompt: "Make a flash montage of everything.", info: [["Directory:", "~/launch"], ["Skill:", "flash-montage"], ["Shots:", "154"]], code: cut.code };
    for (const [name, seed] of [["retro-terminal", 1], ["particle-sphere", 7], ["wire-flower", 9], ["moon", 3]]) {
      const c = document.createElement("canvas");
      specs[name] = { canvas: c, inst: await S.mountSpecimen(c, name, { seed, width: 960, height: 540, opts: name === "retro-terminal" ? opts : {} }) };
    }
  } catch (err) {
    console.warn("live specimens unavailable, using stills", err);
    S = null;
  }
}

function drawLive(e, lf) {
  const sp = specs[e.spec];
  if (e.kind === "shot") {
    liveImg.style.display = "block"; cv.style.display = gl.style.display = "none"; markEl.style.display = "none";
    const im = cache[e.s];
    if (liveImg.dataset.src !== e.shot.src) { liveImg.src = im.src; liveImg.dataset.src = e.shot.src; }
    liveImg.style.objectFit = e.shot.fit; slots[0].style.background = e.shot.bg;
  } else if (e.kind === "mark") {
    markEl.style.display = "flex"; liveImg.style.display = cv.style.display = gl.style.display = "none";
  } else if (sp) {
    liveImg.style.display = "none"; markEl.style.display = "none"; cv.style.display = gl.style.display = "block";
    const t = lf / FPS, d = e.f / FPS, gd = e.gf / FPS;
    sp.inst.render(t);
    cx.drawImage(sp.canvas, 0, 0, cv.width, cv.height);
    const k = Math.max(0, (t - (d - gd)) / gd);
    gx.clearRect(0, 0, gl.width, gl.height);
    if (k > 0) G.glitchOut(gx, sp.canvas, Math.min(1, k), lf, { lines: cut.code, mode: e.glitch, chips: e.kind !== "origin" });
    else if (e.kind === "hold") G.codeChips(gx, Math.min(1, t / d) * 0.35, 99 + e.s, cut.code);
  } else {
    liveImg.style.display = "block"; cv.style.display = gl.style.display = "none"; markEl.style.display = "none";
    const src = HOLD_STILL[e.spec];
    if (liveImg.dataset.src !== src) { liveImg.src = src; liveImg.dataset.src = src; liveImg.style.objectFit = "cover"; }
  }
}

let idx = 0, local = 0, last = 0, acc = 0, playing = !reduce, visible = true, lastLabel = "";
function step(ts) {
  requestAnimationFrame(step);
  if (!playing || !visible || document.hidden) { last = ts; return; }
  acc += Math.min(100, ts - (last || ts)); last = ts;
  let advanced = false;
  while (acc >= 1000 / FPS) {
    acc -= 1000 / FPS; local++;
    if (local >= seq[idx].f) { local = 0; idx = (idx + 1) % seq.length; advanced = true; }
  }
  const e = seq[idx];
  if (advanced || e.kind !== "shot") drawLive(e, local);
  if (advanced) setNeighbours(e);
  const label = e.kind === "shot" ? `${e.label}, ${e.f} ${e.f === 1 ? "frame" : "frames"}` : `${e.label}, ${e.f} frames`;
  if (label !== lastLabel) { now.textContent = label; lastLabel = label; }
}

new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(reel);
toggle.addEventListener("click", () => {
  playing = !playing;
  toggle.setAttribute("aria-pressed", String(!playing));
  toggle.textContent = playing ? "Pause" : "Play";
});
setNeighbours(seq[0]);
if (reduce) {
  toggle.textContent = "Play"; toggle.setAttribute("aria-pressed", "true");
  liveImg.src = "media/render/f215.jpg"; now.textContent = "Paused: reduced motion is on";
}
loadSpecimens().then(() => { drawLive(seq[idx], local); requestAnimationFrame(step); });

// ---------------------------------------------------------------- the burst designer
const $ = (id) => document.getElementById(id);
const PRESETS = [[48, 1.5, 6, 2.6], [35, 1.8, 6, 2.5], [71, 1, 11, 4]];
let editing = 0;
const bars = $("d-bars"), dImg = $("d-img"), dWord = $("d-word");
function params() { return { n: +$("d-n").value, a: +$("d-a").value, b: +$("d-b").value, p: +$("d-p").value }; }
function name() { return $("d-name").value.trim() || "Atlas"; }
function renderDesigner() {
  const { n, a, b, p } = params();
  const fr = burstFrames(n, a, b, p), total = fr.reduce((x, y) => x + y, 0), max = Math.max(...fr);
  $("o-n").textContent = n; $("o-a").textContent = `${a} f`; $("o-b").textContent = `${b} f`; $("o-p").textContent = p.toFixed(1);
  bars.innerHTML = fr.map((f) => `<i style="flex:${f} 1 0;height:${Math.max(8, (f / max) * 100)}%"></i>`).join("");
  $("d-read").textContent = `${n} shots · ${total} frames · ${(total / FPS).toFixed(1)} s · ${fr.filter((f) => f === 1).length} single-frame cuts`;
  const bursts = PRESETS.map((q, i) => {
    const [qn, qa, qb, qp] = i === editing ? [n, a, b, p] : q;
    const h = cut.bursts[i].hold;
    return `    {"shots": ${qn}, "from": ${qa}, "to": ${qb}, "power": ${qp},\n     "hold": {"specimen": "${h.specimen}", "frames": ${h.frames}, "glitch": "${h.glitch}", "glitch_frames": ${h.glitch_frames}}}`;
  });
  $("d-json").textContent = `{\n  "brand": ${JSON.stringify(name())},\n  "product": ${JSON.stringify(name())},\n  "bursts": [\n${bursts.join(",\n")}\n  ]\n}`;
  dWord.textContent = name();
}
function setPreset([n, a, b, p]) { $("d-n").value = n; $("d-a").value = a; $("d-b").value = b; $("d-p").value = p; renderDesigner(); }
["d-n", "d-a", "d-b", "d-p", "d-name"].forEach((id) => $(id).addEventListener("input", renderDesigner));
renderDesigner();

let playTimer = null;
function playBurst() {
  clearTimeout(playTimer);
  const { n, a, b, p } = params();
  const fr = burstFrames(n, a, b, p);
  const off = (editing * 53 + n * 7) % SHOTS.length;
  const barEls = bars.children;
  let i = 0;
  dWord.style.display = "none";
  const next = () => {
    [...barEls].forEach((el) => el.classList.remove("now"));
    if (i >= fr.length) { dWord.style.display = "flex"; return; }
    const sh = SHOTS[(off + i) % SHOTS.length];
    dImg.src = sh.src; dImg.style.objectFit = sh.fit; $("d-stage").style.background = sh.bg;
    barEls[i]?.classList.add("now");
    playTimer = setTimeout(next, (fr[i++] * 1000) / FPS);
  };
  next();
}
$("d-play").addEventListener("click", playBurst);

const steps = [...document.querySelectorAll(".step")];
const stepIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    steps.forEach((s) => s.classList.toggle("on", s === e.target));
    const pre = e.target.dataset.preset;
    if (pre) { editing = steps.indexOf(e.target); setPreset(pre.split(",").map(Number)); if (!reduce) playBurst(); }
  }
}, { rootMargin: "-45% 0px -45% 0px" });
steps.forEach((s) => stepIO.observe(s));

// ---------------------------------------------------------------- copy buttons
function copy(btn, text) {
  navigator.clipboard?.writeText(text).then(() => {
    const t = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = t), 1400);
  });
}
$("d-copy").addEventListener("click", (e) => copy(e.currentTarget, $("d-json").textContent));
$("cmd-copy").addEventListener("click", (e) => copy(e.currentTarget, $("cmd").textContent));

// ---------------------------------------------------------------- the vitrine: one frame, its contents change
const gal = await fetch("media/gallery.json").then((r) => r.json());
const frame = $("vitrine"), cap = $("vitrine-cap");
const lic = (l) => ({ cc0: "CC0", pdm: "Public domain", "nasa-pd": "NASA, public domain" }[l] || l);
const ims = gal.map((g, i) => {
  const im = new Image(); im.src = g.src; im.alt = g.t || ""; im.loading = "lazy"; if (i === 0) im.className = "on";
  frame.appendChild(im); return im;
});
let gi = 0;
function showG(i) {
  gi = (i + gal.length) % gal.length;
  ims.forEach((im, k) => im.classList.toggle("on", k === gi));
  const g = gal[gi];
  cap.textContent = `${g.t} · ${g.creator || "unknown"} · ${lic(g.l)}`;
}
showG(0);
frame.addEventListener("click", () => showG(gi + 1));
if (!reduce) setInterval(() => { if (!document.hidden) showG(gi + 1); }, 3000);

// ---------------------------------------------------------------- the showcase loop respects reduced motion
if (reduce) document.querySelectorAll("video[autoplay]").forEach((v) => { v.removeAttribute("autoplay"); v.pause(); v.controls = true; });
