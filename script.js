// script.js

// =======================================================
// DOM refs
// =======================================================
const videoEl = document.getElementById("cameraFeed");
const canvasEl = document.getElementById("processedView");
const ctx = canvasEl.getContext("2d", { willReadFrequently: true });

const modeSelectEl = document.getElementById("modeSelect");

const captionTitleEl = document.getElementById("captionTitle");
const captionSubtitleEl = document.getElementById("captionSubtitle");

const infoButtonEl = document.getElementById("infoButton");
const infoModalEl = document.getElementById("infoModal");
const closeModalBtnEl = document.getElementById("closeModalBtn");
const modalTitleEl = document.getElementById("modalTitle");
const modalBodyEl = document.getElementById("modalBody");

// =======================================================
// State
// =======================================================
let activeModeKey = "normal";

let vidW = 640;
let vidH = 480;

// patchy vision blotches
const blotches = createBlotches(6);

// =======================================================
// Mode definitions
// =======================================================
const MODES = {
  normal: {
    title: "Normal vision",
    subtitle: "Standard camera view, full color and no distortion.",
    longDescription:
      "This is the standard camera feed with no simulation applied. It functions as your baseline for comparison.",
  },

  noColor: {
    title: "No Color",
    subtitle: "Simulating complete color blindness (achromatopsia).",
    longDescription:
      "In achromatopsia, the world is perceived in shades of gray. Brightness and contrast are visible, but hue is not.",
  },

  tunnel: {
    title: "Tunnel Vision",
    subtitle: "Peripheral field loss similar to advanced glaucoma.",
    longDescription:
      "Peripheral vision narrows, creating a 'tunnel' of clarity in the center. Spatial awareness and navigation become difficult.",
  },

  central: {
    title: "Central Loss",
    subtitle:
      "Center of gaze is obscured (like advanced macular degeneration).",
    longDescription:
      "The middle of your view is blurred or missing. Reading and face recognition become difficult, even if you still detect motion around you.",
  },

  haze: {
    title: "Cataract / Haze",
    subtitle:
      "Cloudy, low-contrast view with glare and light blooming.",
    longDescription:
      "Cataract-like haze lowers clarity and adds glare. It can feel like looking through a foggy lens where bright lights scatter.",
  },

  patchy: {
    title: "Patchy Vision",
    subtitle:
      "Dark blotches obscure parts of the scene (retinopathy-like).",
    longDescription:
      "Irregular dark areas block or distort parts of what you see. Letters or faces can be missing in chunks, making recognition hard.",
  },

  colorShift: {
    title: "Red-Green Shift",
    subtitle: "Reduced distinction between reds and greens.",
    longDescription:
      "In common red-green color blindness, reds and greens can appear similar. Color-coded warnings and signals become harder to interpret.",
  },

  myopia: {
    title: "Uncorrected Myopia",
    subtitle: "Distant detail is soft and hard to read.",
    longDescription:
      "Without correction for myopia (nearsightedness), objects farther away appear blurry. Reading signs across the street or recognizing faces at distance becomes difficult.",
  },

  hyperopia: {
    title: "Uncorrected Hyperopia",
    subtitle: "Close-up content feels slightly out of focus and tiring.",
    longDescription:
      "With hyperopia (farsightedness), near work like reading a phone or label can feel blurry or strained. It often improves when you hold things farther away.",
  },

  edge: {
    title: "Edge Map",
    subtitle:
      "Only high-contrast edges are visible, like a wireframe world.",
    longDescription:
      "Your visual system relies on edges to separate objects from the background. Here we amplify edges and discard interior detail.",
  },
};

// =======================================================
// Camera init
// =======================================================
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    videoEl.srcObject = stream;

    videoEl.addEventListener("loadedmetadata", () => {
      vidW = videoEl.videoWidth || 640;
      vidH = videoEl.videoHeight || 480;
      resizeCanvas();
    });
  } catch (err) {
    console.error("Camera access failed:", err);
    // TODO: show graceful UI fallback
  }
}

function resizeCanvas() {
  canvasEl.width = vidW;
  canvasEl.height = vidH;
  canvasEl.style.width = "100%";
  canvasEl.style.height = "100%";
}

// =======================================================
// Patchy vision helpers
// =======================================================
function createBlotches(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      xPct: Math.random(),
      yPct: Math.random(),
      rPct: 0.08 + Math.random() * 0.12,
      dx: (Math.random() - 0.5) * 0.0005,
      dy: (Math.random() - 0.5) * 0.0005,
    });
  }
  return arr;
}

function updateBlotches() {
  blotches.forEach((b) => {
    b.xPct += b.dx;
    b.yPct += b.dy;
    if (b.xPct < 0 || b.xPct > 1) b.dx *= -1;
    if (b.yPct < 0 || b.yPct > 1) b.dy *= -1;
    b.xPct = Math.max(0, Math.min(1, b.xPct));
    b.yPct = Math.max(0, Math.min(1, b.yPct));
  });
}

// =======================================================
// Pixel transforms
// =======================================================
function toGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
}

function applyRedGreenShift(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const avgRG = (r + g) / 2;
    data[i] = avgRG;
    data[i + 1] = avgRG * 0.9;
    data[i + 2] = b;
  }
}

// Sobel edge detector
function sobelEdge(data, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i / 4] = y;
  }

  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  const out = new Uint8ClampedArray(w * h * 4);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;

      const p00 = gray[idx - w - 1];
      const p01 = gray[idx - w];
      const p02 = gray[idx - w + 1];

      const p10 = gray[idx - 1];
      const p11 = gray[idx];
      const p12 = gray[idx + 1];

      const p20 = gray[idx + w - 1];
      const p21 = gray[idx + w];
      const p22 = gray[idx + w + 1];

      const gx =
        p00 * gxKernel[0] +
        p01 * gxKernel[1] +
        p02 * gxKernel[2] +
        p10 * gxKernel[3] +
        p11 * gxKernel[4] +
        p12 * gxKernel[5] +
        p20 * gxKernel[6] +
        p21 * gxKernel[7] +
        p22 * gxKernel[8];

      const gy =
        p00 * gyKernel[0] +
        p01 * gyKernel[1] +
        p02 * gyKernel[2] +
        p10 * gyKernel[3] +
        p11 * gyKernel[4] +
        p12 * gyKernel[5] +
        p20 * gyKernel[6] +
        p21 * gyKernel[7] +
        p22 * gyKernel[8];

      const mag = Math.sqrt(gx * gx + gy * gy);
      const edgeVal = mag > 100 ? 255 : 0;

      const o = idx * 4;
      out[o] = edgeVal;
      out[o + 1] = edgeVal;
      out[o + 2] = edgeVal;
      out[o + 3] = 255;
    }
  }

  return out;
}

// =======================================================
// Visual overlay helpers
// =======================================================

function drawHazeFrame() {
  // blurry / low-contrast / slight bloom
  ctx.filter = "blur(2px) brightness(1.1) contrast(0.6)";
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  ctx.filter = "none";

  // faint fog overlay
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, vidW, vidH);
}

function applyTunnelMask() {
  const radius = Math.min(vidW, vidH) * 0.4;
  const grad = ctx.createRadialGradient(
    vidW / 2,
    vidH / 2,
    radius * 0.4,
    vidW / 2,
    vidH / 2,
    radius
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vidW, vidH);
}

function applyCentralOcclusion() {
  const radius = Math.min(vidW, vidH) * 0.3;
  const grad = ctx.createRadialGradient(
    vidW / 2,
    vidH / 2,
    0,
    vidW / 2,
    vidH / 2,
    radius
  );
  grad.addColorStop(0, "rgba(50,50,50,0.8)");
  grad.addColorStop(1, "rgba(50,50,50,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(vidW / 2, vidH / 2, radius, 0, Math.PI * 2);
  ctx.fill();
}

function applyPatchyMask() {
  updateBlotches();
  blotches.forEach((b) => {
    const x = b.xPct * vidW;
    const y = b.yPct * vidH;
    const r = b.rPct * Math.min(vidW, vidH);

    const radial = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    radial.addColorStop(0, "rgba(0,0,0,0.8)");
    radial.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Uncorrected myopia: global softness / blur / low contrast
function drawMyopiaFrame() {
  ctx.filter = "blur(2px) contrast(0.8) brightness(0.95)";
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  ctx.filter = "none";

  // subtle vignette to hint "out of glasses"
  const grad = ctx.createRadialGradient(
    vidW / 2,
    vidH / 2,
    Math.min(vidW, vidH) * 0.3,
    vidW / 2,
    vidH / 2,
    Math.min(vidW, vidH) * 0.7
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vidW, vidH);
}

// Uncorrected hyperopia: blur in center (near focus strain)
function drawHyperopiaFrame() {
  // 1. draw sharp base frame
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);

  // 2. overlay a blurred circle in the center to simulate
  // "I can't focus on what's right in front of me"
  const radius = Math.min(vidW, vidH) * 0.28;

  // We'll create an offscreen canvas to draw a blurred version of the frame
  const off = document.createElement("canvas");
  off.width = vidW;
  off.height = vidH;
  const offCtx = off.getContext("2d");

  offCtx.filter = "blur(3px) brightness(0.95) contrast(0.9)";
  offCtx.drawImage(videoEl, 0, 0, vidW, vidH);
  offCtx.filter = "none";

  // Now mask only the center region from that blurred version
  ctx.save();
  ctx.beginPath();
  ctx.arc(vidW / 2, vidH / 2, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(off, 0, 0, vidW, vidH);
  ctx.restore();

  // soft edge feather: draw translucent ring so it's not a hard cut
  const feather = ctx.createRadialGradient(
    vidW / 2,
    vidH / 2,
    radius * 0.7,
    vidW / 2,
    vidH / 2,
    radius
  );
  feather.addColorStop(0, "rgba(0,0,0,0)");
  feather.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = feather;
  ctx.beginPath();
  ctx.arc(vidW / 2, vidH / 2, radius, 0, Math.PI * 2);
  ctx.fill();
}

// =======================================================
// Rendering per mode
// =======================================================
function renderNormal() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
}

function renderNoColor() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  let frame = ctx.getImageData(0, 0, vidW, vidH);
  toGrayscale(frame.data);
  ctx.putImageData(frame, 0, 0);
}

function renderTunnel() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  applyTunnelMask();
}

function renderCentralLoss() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  applyCentralOcclusion();
}

function renderHaze() {
  drawHazeFrame();
}

function renderPatchy() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);

  // slight global veil
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, 0, vidW, vidH);

  applyPatchyMask();
}

function renderColorShift() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  let frame = ctx.getImageData(0, 0, vidW, vidH);
  applyRedGreenShift(frame.data);
  ctx.putImageData(frame, 0, 0);
}

function renderMyopia() {
  drawMyopiaFrame();
}

function renderHyperopia() {
  drawHyperopiaFrame();
}

function renderEdgeMap() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  const frame = ctx.getImageData(0, 0, vidW, vidH);
  const edged = sobelEdge(frame.data, vidW, vidH);
  const outImg = new ImageData(edged, vidW, vidH);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, vidW, vidH);
  ctx.putImageData(outImg, 0, 0);
}

// dispatch
function renderActiveMode() {
  switch (activeModeKey) {
    case "normal":
      renderNormal();
      break;
    case "noColor":
      renderNoColor();
      break;
    case "tunnel":
      renderTunnel();
      break;
    case "central":
      renderCentralLoss();
      break;
    case "haze":
      renderHaze();
      break;
    case "patchy":
      renderPatchy();
      break;
    case "colorShift":
      renderColorShift();
      break;
    case "myopia":
      renderMyopia();
      break;
    case "hyperopia":
      renderHyperopia();
      break;
    case "edge":
      renderEdgeMap();
      break;
    default:
      renderNormal();
      break;
  }
}

// =======================================================
// Animation loop
// =======================================================
function tick() {
  if (videoEl.readyState >= 2) {
    renderActiveMode();
  }
  requestAnimationFrame(tick);
}

// =======================================================
// UI helpers
// =======================================================
function applyMode(modeKey) {
  const mode = MODES[modeKey];
  if (!mode) return;
  activeModeKey = modeKey;

  captionTitleEl.textContent = mode.title;
  captionSubtitleEl.textContent = mode.subtitle;

  modalTitleEl.textContent = mode.title;
  modalBodyEl.textContent = mode.longDescription;
}

function openModal() {
  infoModalEl.classList.remove("hidden");
}
function closeModal() {
  infoModalEl.classList.add("hidden");
}

// =======================================================
// Events
// =======================================================
modeSelectEl.addEventListener("change", (e) => {
  applyMode(e.target.value);
});

infoButtonEl.addEventListener("click", openModal);
closeModalBtnEl.addEventListener("click", closeModal);

infoModalEl.addEventListener("click", (e) => {
  if (e.target === infoModalEl) closeModal();
});

// =======================================================
// Boot
// =======================================================
initCamera().then(() => {
  applyMode(modeSelectEl.value);
  tick();
});
