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

---

## 🧠 Modes

Below is a list of modes currently implemented, roughly grouped by type.  
Each mode description includes the *technical approach* we use to simulate it in the browser.

### 1. Normal Vision
**What you see:** Baseline camera feed.  

---

### 2. No Color (Achromatopsia-like)
**What you see:** Everything becomes grayscale. Color information disappears, but brightness and contrast remain.  
**Why it matters:** Total color blindness exists; people can still perceive detail but not hue.  


---

### 3. Tunnel Vision (Glaucoma-like)
**What you see:** The center of the view is clear, and the edges fall into darkness. It feels like looking through a tube.  
**Why it matters:** Peripheral vision loss makes navigating crowds / crossing streets dangerous even if text in front of you is readable.  

---

### 4. Central Loss (Macular Degeneration–like)
**What you see:** The middle of your gaze is blurred/blocked, while the periphery is still usable. Reading and recognizing faces straight ahead is hard.  
**Why it matters:** Many people “look slightly away” to see objects, because their central spot is compromised.  


---

### 5. Cataract / Haze
**What you see:** The world looks foggy, low-contrast, with glare. Bright areas “bloom.”  
**Why it matters:** Cataracts are extremely common with age and can make night driving or reading signs very hard.  


---

### 6. Patchy Vision (Diabetic Retinopathy–like)
**What you see:** Random dark blotches partially block the view. Parts of words or faces just go missing.  
**Why it matters:** Damage in the retina can create floating opaque/blurred areas, making scanning and reading painful.  

---

### 7. Deuteranomaly
**What you see:** Reduced sensitivity to green. Greens/yellows/reds start blending.  
**Why it matters:** This is one of the most common color vision differences. Relying only on red vs green for status is not inclusive.  

---

### 8. Protanomaly

What you see: Reduced sensitivity to red. Reds look darker, duller, less “red.”
Why it matters: Alerts, warnings, and “red = danger” cues may not pop.

---

### 9. Deuteranopia

What you see: No functional green cones. Reds and greens collapse into similar yellowish tones.
Why it matters: Green stops being “green,” it just becomes “not-blue-ish.”

---

### 10. Protanopia

What you see: No functional red cones. Reds can vanish into dark, brown, or gray.
Why it matters: Red/green becomes almost the same signal.

---

### 11. Tritanomaly

What you see: Reduced blue sensitivity. Blues vs greens are harder to tell apart, and yellows vs reds can look off.
Why it matters: This is rarer, but powerful to show because it breaks the mental model “color blindness is only red/green.”

---

### 12. Tritanopia

What you see: No functional blue cones. Blues don’t look like blue anymore; purples/yellows shift.
Why it matters: UI using blue for “links / primary actions” becomes unreadable in the way you expect it.

---

### 13. Cat Vision 🐈

What you see: Slight blur (cats have lower fine detail than humans), cooler/greenish tint (cats perceive fewer colors, roughly more blue/green biased), and a lifted low-light brightness.
Feels like “twilight hunter mode.”
