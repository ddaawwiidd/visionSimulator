// script.js

// =======================================================
// DOM references
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
// Global state
// =======================================================
let activeModeKey = "normal";

let vidW = 640;
let vidH = 480;

// used in Patchy Vision (retinopathy-like occlusions)
const blotches = createBlotches(6);

// used in Predator mode (motion diff)
let prevPredatorFrame = null;

// =======================================================
// Mode metadata
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
      "Peripheral vision narrows, creating a 'tunnel' of clarity in the center. Spatial awareness and navigation become difficult and risky.",
  },

  central: {
    title: "Central Loss",
    subtitle:
      "Center of gaze is obscured (like advanced macular degeneration).",
    longDescription:
      "The middle of your view is blurred or missing. Reading text or recognizing faces directly ahead becomes very difficult.",
  },

  haze: {
    title: "Cataract / Haze",
    subtitle:
      "Cloudy, low-contrast view with glare and blooming lights.",
    longDescription:
      "Cataract-like haze lowers clarity and adds glare. Bright lights scatter. It can feel like looking through a fogged or dirty lens.",
  },

  patchy: {
    title: "Patchy Vision",
    subtitle:
      "Dark blotches obscure parts of the scene (retinopathy-like).",
    longDescription:
      "Irregular dark areas can block or distort parts of what you see. Letters or faces might be 'missing in pieces,' making recognition hard.",
  },

  deuteranomaly: {
    title: "Deuteranomaly",
    subtitle:
      "Reduced green sensitivity. Green, yellow, red blend together.",
    longDescription:
      "Deuteranomaly is the most common color vision deficiency. Greens can look dull or shift toward yellow/brown, and red-vs-green cues become less reliable.",
  },

  protanomaly: {
    title: "Protanomaly",
    subtitle:
      "Reduced red sensitivity. Reds look weaker and less vivid.",
    longDescription:
      "In protanomaly, the red channel is less effective. Reds can appear darker or brownish, and differences between red and green are harder to see.",
  },

  deuteranopia: {
    title: "Deuteranopia",
    subtitle:
      "No functional green cones. Red and green collapse together.",
    longDescription:
      "With deuteranopia, the green channel is essentially missing. Greens no longer look distinctly green; reds and greens get confused into similar tones.",
  },

  protanopia: {
    title: "Protanopia",
    subtitle:
      "No functional red cones. Reds can appear dim or gray.",
    longDescription:
      "With protanopia, the red channel is effectively missing. Warm colors lose their 'redness' and can be mistaken for darker or duller shades.",
  },

  tritanomaly: {
    title: "Tritanomaly",
    subtitle:
      "Reduced blue sensitivity. Blue/green and yellow/red get harder.",
    longDescription:
      "In tritanomaly, blue cones are less sensitive. Differentiating blues from greens and yellows from reds becomes more difficult.",
  },

  tritanopia: {
    title: "Tritanopia",
    subtitle:
      "No functional blue cones. Blues are lost as true blue.",
    longDescription:
      "With tritanopia, you essentially don't get proper blue signals. Blues can shift toward greenish or grayish, and purple/yellow contrasts get distorted.",
  },

  predator: {
    title: "Predator Vision",
    subtitle:
      "Motion heat-map style view. Moving objects glow.",
    longDescription:
      "High-motion areas are highlighted like 'heat.' Static background fades away. This is not real thermal data — it's motion/contrast exaggeration inspired by sci-fi predator vision.",
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
    // could show fallback UI message here
  }
}

function resizeCanvas() {
  canvasEl.width = vidW;
  canvasEl.height = vidH;
  canvasEl.style.width = "100%";
  canvasEl.style.height = "100%";
}

// =======================================================
// Patchy Vision helpers
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
// Pixel transforms for grayscale and color vision matrices
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

// generic matrix transform for color vision modes
function applyMatrixTransform(data, mat) {
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i];
    const G = data[i + 1];
    const B = data[i + 2];

    const Rn = mat[0][0] * R + mat[0][1] * G + mat[0][2] * B;
    const Gn = mat[1][0] * R + mat[1][1] * G + mat[1][2] * B;
    const Bn = mat[2][0] * R + mat[2][1] * G + mat[2][2] * B;

    data[i] = Rn;
    data[i + 1] = Gn;
    data[i + 2] = Bn;
  }
}

// color vision matrices (approximate educational transforms)
const MAT_DEUTERANOMALY = [
  [0.8, 0.2, 0.0],
  [0.258, 0.742, 0.0],
  [0.0, 0.0, 1.0],
];
const MAT_PROTANOMALY = [
  [0.817, 0.183, 0.0],
  [0.333, 0.667, 0.0],
  [0.0, 0.0, 1.0],
];
const MAT_DEUTERANOPIA = [
  [0.625, 0.375, 0.0],
  [0.7, 0.3, 0.0],
  [0.0, 0.0, 1.0],
];
const MAT_PROTANOPIA = [
  [0.567, 0.433, 0.0],
  [0.558, 0.442, 0.0],
  [0.0, 0.0, 1.0],
];
const MAT_TRITANOMALY = [
  [1.0, 0.0, 0.0],
  [0.0, 0.817, 0.183],
  [0.0, 0.333, 0.667],
];
const MAT_TRITANOPIA = [
  [0.95, 0.05, 0.0],
  [0.0, 0.433, 0.567],
  [0.0, 0.475, 0.525],
];

// =======================================================
// Predator Vision helpers
// =======================================================

// Given brightness delta, map to "thermal" RGB.
// We'll go: dark purple -> red -> orange -> yellow/white as value increases.
function heatColorFromValue(v) {
  // v is 0..255-ish difference
  // Normalize to 0..1
  const t = Math.min(1, v / 128); // strong diff saturates fast

  // We'll approximate a colormap:
  // 0.0 => deep purple/blue (low motion)
  // 0.5 => red/orange
  // 1.0 => yellow-white (high motion)

  let r, g, b;
  if (t < 0.33) {
    // purple -> red
    // t: 0   => (40,0,80)
    // t: .33 => (255,0,0)
    const k = t / 0.33;
    r = 40 + (255 - 40) * k;
    g = 0;
    b = 80 + (0 - 80) * k;
  } else if (t < 0.66) {
    // red -> orange/yellow
    // t: .33 => (255,0,0)
    // t: .66 => (255,165,0)
    const k = (t - 0.33) / 0.33;
    r = 255;
    g = 0 + (165 - 0) * k;
    b = 0;
  } else {
    // orange -> white/yellow
    // t: .66 => (255,165,0)
    // t: 1.0 => (255,255,180)
    const k = (t - 0.66) / 0.34;
    r = 255;
    g = 165 + (255 - 165) * k;
    b = 0 + (180 - 0) * k;
  }

  return [r, g, b];
}

function renderPredatorFrame() {
  // draw current frame
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  const curr = ctx.getImageData(0, 0, vidW, vidH);

  if (!prevPredatorFrame) {
    // First frame: just dark display with faint edges
    // We'll just threshold brightness and map to a dim heat tone
    const outData = new Uint8ClampedArray(curr.data.length);
    for (let i = 0; i < curr.data.length; i += 4) {
      const r = curr.data[i];
      const g = curr.data[i + 1];
      const b = curr.data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const [hr, hg, hb] = heatColorFromValue(lum * 0.2); // weak signal
      outData[i] = hr;
      outData[i + 1] = hg;
      outData[i + 2] = hb;
      outData[i + 3] = 255;
    }

    const outImg = new ImageData(outData, vidW, vidH);
    ctx.putImageData(outImg, 0, 0);

    prevPredatorFrame = curr;
    return;
  }

  // Compare curr to prevPredatorFrame
  const outData = new Uint8ClampedArray(curr.data.length);
  for (let i = 0; i < curr.data.length; i += 4) {
    const r1 = curr.data[i];
    const g1 = curr.data[i + 1];
    const b1 = curr.data[i + 2];

    const r0 = prevPredatorFrame.data[i];
    const g0 = prevPredatorFrame.data[i + 1];
    const b0 = prevPredatorFrame.data[i + 2];

    // brightness difference
    const lum1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
    const lum0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
    const diff = Math.abs(lum1 - lum0); // 0..255-ish

    const [hr, hg, hb] = heatColorFromValue(diff);

    outData[i] = hr;
    outData[i + 1] = hg;
    outData[i + 2] = hb;
    outData[i + 3] = 255;
  }

  const outImg = new ImageData(outData, vidW, vidH);

  // Paint motion/heat map
  ctx.putImageData(outImg, 0, 0);

  // Store current for next frame
  prevPredatorFrame = curr;
}

// =======================================================
// Visual overlay helpers for other modes
// =======================================================

// cataract/haze
function drawHazeFrame() {
  ctx.filter = "blur(2px) brightness(1.1) contrast(0.6)";
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  ctx.filter = "none";

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, vidW, vidH);
}

// tunnel vision
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

// central occlusion
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

// patchy retinopathy blotches
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

// =======================================================
// Per-mode render functions
// =======================================================
function renderNormal() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
}

function renderNoColor() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  const frame = ctx.getImageData(0, 0, vidW, vidH);
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

  // faint veil to reduce clarity overall
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, 0, vidW, vidH);

  applyPatchyMask();
}

// Color vision modes use shared helper
function renderColorBlind(matrix) {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  const frame = ctx.getImageData(0, 0, vidW, vidH);
  applyMatrixTransform(frame.data, matrix);
  ctx.putImageData(frame, 0, 0);
}

function renderDeuteranomaly() {
  renderColorBlind(MAT_DEUTERANOMALY);
}
function renderProtanomaly() {
  renderColorBlind(MAT_PROTANOMALY);
}
function renderDeuteranopia() {
  renderColorBlind(MAT_DEUTERANOPIA);
}
function renderProtanopia() {
  renderColorBlind(MAT_PROTANOPIA);
}
function renderTritanomaly() {
  renderColorBlind(MAT_TRITANOMALY);
}
function renderTritanopia() {
  renderColorBlind(MAT_TRITANOPIA);
}

// Predator Vision
function renderPredator() {
  renderPredatorFrame();
}

// dispatch by mode
function renderActiveMode() {
  switch (activeModeKey) {
    case "normal":
      renderNormal(); break;
    case "noColor":
      renderNoColor(); break;
    case "tunnel":
      renderTunnel(); break;
    case "central":
      renderCentralLoss(); break;
    case "haze":
      renderHaze(); break;
    case "patchy":
      renderPatchy(); break;

    case "deuteranomaly":
      renderDeuteranomaly(); break;
    case "protanomaly":
      renderProtanomaly(); break;
    case "deuteranopia":
      renderDeuteranopia(); break;
    case "protanopia":
      renderProtanopia(); break;
    case "tritanomaly":
      renderTritanomaly(); break;
    case "tritanopia":
      renderTritanopia(); break;

    case "predator":
      renderPredator(); break;

    default:
      renderNormal(); break;
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

  // Reset predator buffer when switching into Predator mode
  if (modeKey === "predator") {
    prevPredatorFrame = null;
  }
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
