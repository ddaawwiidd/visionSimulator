# See Through Other Eyes

See Through Other Eyes is a browser-based, installable Progressive Web App (PWA) that uses your camera to simulate how the world might look under different vision conditions.

This tool is meant for empathy, education, and accessibility awareness.  
It is **not** a diagnostic or medical tool.

---

## ✨ Features

- **Live camera simulation**  
  The app uses `getUserMedia` to access the rear camera and renders each frame onto a `<canvas>` in real time.

- **Installable PWA**  
  The app ships with a `manifest.webmanifest` and `service-worker.js`, so you can:
  - Add it to your home screen.
  - Run it in standalone fullscreen.
  - Use it offline (UI shell works even without internet).

- **Single-tap mode switching**  
  A dropdown lets you choose different visual modes.  
  The title + short explanation updates instantly, and tapping it opens a modal with more context.

- **Ethical framing**  
  Every mode includes educational text about what it's simulating and why it matters.  
  We show that real users experience the world differently — and that design decisions (like using only red and green to signal status) can exclude them.
