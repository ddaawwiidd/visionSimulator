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

// store last frame for "motion" mode
let prevFrameData = null;

// animated blotches for patchy vision
const blotches = createBlotches(6); // tweak count

// active mode key
let activeModeKey = "normal";

// camera dimensions
let vidW = 640;
let vidH = 480;

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
      "Simulating central blind spot (like advanced macular degeneration).",
    longDescription:
      "The center of your gaze is blurred or missing. Reading and face recognition become difficult, even if peripheral motion is still visible.",
  },

  haze: {
    title: "Cataract / Haze",
    subtitle:
      "Cloudy, low-contrast view with glare and bloom around lights.",
    longDescription:
      "Cataract-like haze lowers clarity and adds glare. It can feel like looking through a foggy lens where bright lights scatter.",
  },

  patchy: {
    title: "Patchy Vision",
    subtitle:
      "Dark blotches obscure parts of the scene (diabetic retinopathy-like).",
    longDescription:
      "Irregular dark spots partially block the view. Letters or faces can be missing in chunks, making reading and recognition very hard.",
  },

  colorShift: {
    title: "Red-Green Shift",
    subtitle: "Reduced distinction between reds and greens.",
    longDescription:
      "In common red-green color blindness, reds and greens can appear similar. Color-coded warnings and signals become harder to interpret.",
  },

  edge: {
    title: "Edge Map",
    subtitle:
      "Perception experiment: only high-contrast edges are visible.",
    longDescription:
      "Your visual system relies on edges to segment objects. Here we amplify edges and discard interior detail, creating a wireframe-like world.",
  },

  motion: {
    title: "Motion Only",
    subtitle:
      "Perception experiment: highlighting only moving areas.",
    longDescription:
      "Static background fades out while movement shows up as bright ghosts. This illustrates how attention locks onto change first.",
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

    // We need actual video size to size the canvas
    videoEl.addEventListener("loadedmetadata", () => {
      vidW = videoEl.videoWidth || 640;
      vidH = videoEl.videoHeight || 480;
      resizeCanvas();
    });
  } catch (err) {
    console.error("Camera access failed:", err);
    // TODO: show fallback message in UI if needed
  }
}

function resizeCanvas() {
  canvasEl.width = vidW;
  canvasEl.height = vidH;
  canvasEl.style.width = "100%";
  canvasEl.style.height = "100%";
}

// =======================================================
// Helpers: blotches for "patchy vision"
// =======================================================
function createBlotches(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      // position as %, we'll convert in draw loop
      xPct: Math.random(),
      yPct: Math.random(),
      rPct: 0.08 + Math.random() * 0.12, // radius ~8%-20% of min dimension
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

    // bounce off edges a bit
    if (b.xPct < 0 || b.xPct > 1) b.dx *= -1;
    if (b.yPct < 0 || b.yPct > 1) b.dy *= -1;

    // clamp
    b.xPct = Math.max(0, Math.min(1, b.xPct));
    b.yPct = Math.max(0, Math.min(1, b.yPct));
  });
}

// =======================================================
// Image processing helpers
// =======================================================

// convert frame to grayscale in-place
function toGrayscale(data) {
  // data = Uint8ClampedArray [r,g,b,a,...]
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // luminance approx
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
}

// cataract-like: blur is expensive to do "properly" per pixel.
// We'll simulate haze: reduce contrast, slightly brighten, soft global blur using context filter.
function drawHazeFrame() {
  // We'll cheat using canvas filters for now.
  // 1. draw raw frame first
  ctx.filter = "blur(2px) brightness(1.1) contrast(0.6)";
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  ctx.filter = "none";

  // overlay "fog"
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, vidW, vidH);
}

// tunnel vision: darken periphery
function applyTunnelMask() {
  // radial gradient transparent center -> black edges
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

// central loss: blur/obscure center only
function applyCentralMask() {
  const radius = Math.min(vidW, vidH) * 0.3;
  // We'll draw a blurred-ish circle by drawing a semi-opaque gray circle
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

// patchy vision: draw random blotches
function applyPatchyMask() {
  updateBlotches();
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
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
  ctx.restore();
}

// red-green shift approximation
// We'll aggressively reduce difference between R and G.
// Note: super simplified protan/deutan mashup just to get the idea.
function applyRedGreenShift(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // collapse r/g toward their average, keep blue mostly
    const avgRG = (r + g) / 2;
    data[i] = avgRG; // R channel
    data[i + 1] = avgRG * 0.9; // G channel slightly biased
    data[i + 2] = b; // keep blue for differentiation
  }
}

// edge map (Sobel)
// We'll work on grayscale first, then compute edges, then draw result back.
function sobelEdge(data, w, h) {
  // data: Uint8ClampedArray (RGBA)
  // We'll first build a gray buffer
  const gray = new Float32Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i / 4] = y;
  }

  // Sobel kernels
  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  const out = new Uint8ClampedArray(w * h * 4);

  // avoid outer border to keep it simple
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // index in gray
      const idx = y * w + x;

      // sample neighborhood
      // row above
      const p00 = gray[idx - w - 1];
      const p01 = gray[idx - w];
      const p02 = gray[idx - w + 1];
      // row mid
      const p10 = gray[idx - 1];
      const p11 = gray[idx];
      const p12 = gray[idx + 1];
      // row below
      const p20 = gray[idx + w - 1];
      const p21 = gray[idx + w];
      const p22 = gray[idx + w + 1];

      // Gx
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

      // Gy
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

      // edge magnitude
      const mag = Math.sqrt(gx * gx + gy * gy);

      // normalize-ish
      const edgeVal = mag > 100 ? 255 : 0;

      const o = idx * 4;
      out[o] = edgeVal; // R
      out[o + 1] = edgeVal; // G
      out[o + 2] = edgeVal; // B
      out[o + 3] = 255; // A
    }
  }

  return out;
}

// motion-only: compare current frame to prevFrameData.
// show white where difference is large, else black.
function motionMask(curr, prev, threshold = 30) {
  const out = new Uint8ClampedArray(curr.length);
  for (let i = 0; i < curr.length; i += 4) {
    // brightness of current vs prev
    const cr = curr[i],
      cg = curr[i + 1],
      cb = curr[i + 2];
    const pr = prev[i],
      pg = prev[i + 1],
      pb = prev[i + 2];

    const cLum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
    const pLum = 0.299 * pr + 0.587 * pg + 0.114 * pb;

    const diff = Math.abs(cLum - pLum);

    if (diff > threshold) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 255;
    } else {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 255;
    }
  }
  return out;
}

// =======================================================
// Rendering per mode
// =======================================================

function renderNormal() {
  // Just draw the live frame as-is
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
  applyCentralMask();
}

function renderHaze() {
  drawHazeFrame();
}

function renderPatchy() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);

  // Slight global softening to hint lower contrast
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

function renderEdgeMap() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  const frame = ctx.getImageData(0, 0, vidW, vidH);
  const edged = sobelEdge(frame.data, vidW, vidH);
  const outImg = new ImageData(edged, vidW, vidH);

  // Black background first
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, vidW, vidH);

  ctx.putImageData(outImg, 0, 0);
}

function renderMotionOnly() {
  ctx.drawImage(videoEl, 0, 0, vidW, vidH);
  const frame = ctx.getImageData(0, 0, vidW, vidH);

  if (!prevFrameData) {
    // first frame: just store and draw black
    prevFrameData = new Uint8ClampedArray(frame.data);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, vidW, vidH);
    return;
  }

  const motionImg = motionMask(frame.data, prevFrameData, 30);
  const outImg = new ImageData(motionImg, vidW, vidH);

  ctx.putImageData(outImg, 0, 0);

  // update prev
  prevFrameData.set(frame.data);
}

// dispatcher
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
    case "edge":
      renderEdgeMap();
      break;
    case "motion":
      renderMotionOnly();
      break;
    default:
      renderNormal();
      break;
  }
}

// =======================================================
// Main animation loop
// =======================================================
function tick() {
  if (videoEl.readyState >= 2) {
    // We only draw when video has data
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

  // update caption + modal text
  captionTitleEl.textContent = mode.title;
  captionSubtitleEl.textContent = mode.subtitle;
  modalTitleEl.textContent = mode.title;
  modalBodyEl.textContent = mode.longDescription;

  // reset prev frame for motion mode when switching into it
  if (modeKey === "motion") {
    prevFrameData = null;
  }
}

function openModal() {
  infoModalEl.classList.remove("hidden");
}

function closeModal() {
  infoModalEl.classList.add("hidden");
}

// =======================================================
// Event listeners
// =======================================================
modeSelectEl.addEventListener("change", (e) => {
  applyMode(e.target.value);
});

infoButtonEl.addEventListener("click", openModal);
closeModalBtnEl.addEventListener("click", closeModal);

// close modal on backdrop tap
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
