# 🧠 Kinestop — Motion Sickness Reducer

A Chrome extension that overlays stabilization dots on any website to help reduce motion sickness (cybersickness). It uses real-time phone sensor data streamed via **WebRTC (PeerJS)** to counter screen motion, or falls back to mouse-based simulation when no phone is connected.

---

## ✨ Features

- **Stabilization Dots** — Renders glowing reference dots on a full-screen canvas overlay across all webpages to provide visual anchoring
- **Phone Sensor Integration** — Connect your phone's gyroscope/accelerometer via PeerJS to drive the dot movement in real time
- **Mouse Fallback** — When no phone is connected, dots respond subtly to mouse movement, simulating vestibular adaptation
- **Three Motion Modes**
  - **Stabilization (Drift)** — Dots shift *with* sensor tilt for a grounding effect
  - **Counter-Motion** — Dots move *against* the tilt to counteract perceived motion
  - **Neutral (Breathing)** — Gentle oscillating movement independent of sensors
- **Customizable Settings** — Adjust dot count (3–20), dot size (5–40 px), and motion mode from the popup UI
- **Persistent Settings** — Preferences are saved via `chrome.storage` and persist across sessions

---

## 🏗️ Architecture

```
kinestop_extension/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker — manages offscreen doc & routes messages
├── offscreen.html      # Offscreen document for WebRTC (PeerJS)
├── offscreen.js        # Receives phone sensor data via PeerJS connection
├── content.js          # Injected into all pages — renders the dot overlay canvas
├── popup.html          # Extension popup UI (settings & connection controls)
├── popup.js            # Popup logic — settings management & connection flow
└── peerjs.min.js       # Bundled PeerJS library for peer-to-peer connections
```

### Data Flow

```
Phone (Gyroscope/Accelerometer)
        │
        ▼
  PeerJS WebRTC Connection
        │
        ▼
  offscreen.js (receives sensor data)
        │
        ▼
  background.js (routes SENSOR_DATA message)
        │
        ▼
  content.js (updates dot positions on canvas)
```

---

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jeojojok/kinemotionorg.git
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `kinestop_extension/` folder

3. **Start using**
   - Click the Kinestop extension icon in the toolbar
   - Dots will appear on any webpage immediately (mouse-driven by default)

---

## 📱 Connecting Your Phone

1. Click **"Connect Phone Sensors"** in the popup
2. A unique 4-character **Laptop ID** is generated (e.g., `X7KQ`)
3. Open the companion phone tracker app and enter the Laptop ID to connect
4. Once connected, the dots respond to your phone's real-time tilt data

---

## ⚙️ Configuration

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| **Mode** | 3 options | Stabilization | Controls how dots respond to motion |
| **Dot Count** | 3 – 20 | 8 | Number of dots on screen |
| **Dot Size** | 5 – 40 px | 15 px | Radius of each dot |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Chrome Extension Manifest V3** | Extension framework |
| **PeerJS / WebRTC** | Real-time peer-to-peer sensor streaming |
| **Canvas API** | Hardware-accelerated dot rendering |
| **Offscreen Documents API** | WebRTC in service worker context |
| **Chrome Storage API** | Persistent settings |

---

## 📄 License

This project is open source. See the repository for license details.
