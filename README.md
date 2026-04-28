# CrisisNet AI - Continuous AI Situation Awareness Engine 🚨

[![Live Demo](https://img.shields.io/badge/Demo-Live_Project-red.svg?style=for-the-badge)](https://graceful-blancmange-6a6180.netlify.app/)

**A Multi-Signal Intelligence Platform for Crisis Environments.**

CrisisNet relies on a **Continuous AI Situation Awareness Engine**. Rather than treating emergencies as isolated text inputs, it analyzes **Visual**, **Linguistic**, and **Spatial** signals simultaneously to triage threats locally without internet dependencies (and with deep Google Gemini API intelligence). It guarantees that first responders are deployed strategically based on data, not chaos.

### 🌍 Alignment with UN Sustainable Development Goals
- **Goal 3 (Good Health and Well-being):** By optimizing the dispatch calculus through a deterministic threat score, CrisisNet slashes EMT and medical deployment times in mass-gathering incidents, maximizing survival rates in critical traumas.
- **Goal 11 (Sustainable Cities and Communities):** Safe and resilient public spheres are the backbone of sustainable urban growth. CrisisNet upgrades aging stadium/hotel infrastructure into 'smart safe-zones' for virtually zero capital expenditure.

---

## 🚀 Engine Capabilities & Features

We have built a fully functional, highly technical MVP ready for competition. Here is what makes the engine so powerful:

### 1. Linguistic Intelligence (Google Gemini API)
- **Live Text Analysis:** The engine processes SOS text messages using the **Google Gemini 1.5 API**. It outputs structured JSON that automatically determines Threat Type, Severity (Low/Medium/Critical), and Priority (1-10).
- **Push-To-Talk Voice Recognition:** A built-in microphone engine automatically converts panicked voice input into text so users can report dangers under extreme duress without typing.
- **Fail-Safe Rule Engine:** If the Gemini API fails or lacks internet access, the system instantly hot-swaps to an offline, keyword-based Natural Language rule engine.

### 2. Multi-Modal Vision Analysis
- **Hazard Photo Scanning:** Users can upload photos of emergencies natively. 
- **Google Gemini Vision Integration:** The core system leverages Gemini Vision to dissect the image and identify hazards visually (Fire, Weapons, Smoke).
- **Offline Heuristic Pixel Processor:** If offline, a built-in HTML5 Canvas algorithm reads the RGB/Hex values of pixels. It can automatically detect "Fire/Heat signatures" based on high-red/luminosity variance, and "Smoke signatures" based on grayscale densities.

### 3. Spatial Intelligence & Heatmap Vectoring
- **Dynamic Multi-Node Threat Map:** The map doesn't just show pins. Toggle the Threat Map to instantly draw pulsating severity radiuses for every single unresolved event across the map.
- **Spatial Evacuation Routing:** By measuring the "Center of Gravity" of critical threats, the system instantly plots an optimal Safe Evacuation route pointing away from danger and drops a Safe Zone marker.
- **GPS Coordinates API:** Pings the user's browser for exact GPS longitude and latitude for hyper-accurate incident reporting.

### 4. Enterprise-Grade Dashboard & Operations
- **Live Global Ticker:** An absolute top-banner ticker constantly reads out System Status, Active Alerts, and Threat Level natively tied to the data-store.
- **Firebase Realtime Sync:** Multiple dispatch operators can see alerts update simultaneously via Google Firebase integration.
- **Mobile Command Split-Screen:** A carefully engineered responsive mobile layout gives field agents a seamless 50/50 split-screen view. The incident map is permanently pinned for absolute situational awareness, while the operational dashboard features fluid internal scrolling underneath.

---

## 🛠 Tech Stack

- **Frontend & Logic:** HTML5, CSS3, Vanilla ES6+ Javascript
- **Cloud & Database:** Firebase Realtime Database
- **Artificial Intelligence:** Google Gemini 1.5 Flash (Text & Vision)
- **Spatial Processing:** Leaflet.js
- **Design:** Modern Glassmorphism, CSS variable theming

---

## 🏎 Pitch Sequence (How to demo for the judges)

Want to see it in action? Follow this exact order:

1. **Load the Live App.** Check the top of the screen; point out the **Global Status Ticker** dynamically reading "SYSTEM NOMINAL". Explain we are using a real-time command dashboard.
2. **Hit the SOS Button.** Use the **Push-to-Talk** feature or type: *"There is a massive fire here."* 
3. **Upload an Image.** Use "Scan Hazard Photo" to upload a fiery or dangerous picture. Explain the **Gemini Vision Multi-Modal Fusion Engine**. Hit Send.
4. **Trigger a Mass Event.** In the top right, hit "Scenarios" and click "Action Stadium". Step back and watch as 3 distinct alerts stream in with different severity levels automatically.
5. **Activate the Threat Map.** Click the "Threat Map" button. Boom! The map calculates the epicenter of the crisis, draws red multi-node radiuses over the critical elements, and animates a green dotted **Evacuation Vector**. 
6. **Resolve.** Click on an alert card, assign it, and resolve it. Watch the Ticker numbers automatically drop back down!

---

## 📁 File Structure
```text
/
├── index.html     - System shell, containing all component views.
├── styles.css     - Custom Design System & CSS animations.
├── config.js      - Securely holds your Firebase and Gemini API keys.
├── app.js         - The unified Engine, mapping logic, AI queries, and UX bindings.
└── README.md      - You are here.
```
