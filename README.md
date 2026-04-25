# CrisisNet AI 🚨

**An Intelligent Emergency Response Dashboard for Hospitality Environments.**

CrisisNet AI reduces response times and confusion during emergencies by converting distress signals into structured alerts using logic simulated to mimic real-time AI processing. It automatically prioritizes critical emergencies to ensure staff always know who needs help first.

## 🚀 Features

- **Mobile-First SOS Protocol:** A streamlined reporting form (optimized for mobile visibility) allowing fast reporting via large tap targets.
- **Smart Prioritization Triage:** Automatically detects keywords in plain text signals (e.g., "fire", "chest pain", "gun") and assigns Emergency Type, Severity, and a 1-10 Priority Score.
- **Real-Time Live Map:** Integrated with Leaflet.js to plot emergencies on a geographic map instantly as they are reported. Visual indicators pulse red for immediately life-threatening cases.
- **Responder Lifecycle Management:** The dashboard queue allows responders to claim emergencies ("Assign to Me") and track their progress until "Resolved".
- **Zero-Dependency Architcture:** Built entirely without build chains—runs instantaneously locally, guaranteeing 100% up-time during high-stakes demonstrations.

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3 (Vanilla Design System)
- **Logic:** Vanilla ES6+ Javascript
- **Map:** Leaflet.js
- **Icons & Typography:** FontAwesome (CDN), Google Fonts (Inter/Outfit, CDN)

## 🏎 How to Run / Demo

The application is completely standalone. There is no `npm install`, node server, or Python requirement necessary to experience the core functionality.

1. Clone or download this repository.
2. Locate the `index.html` file in the main directory.
3. **Double-click `index.html`** to open it natively in Chrome, Edge, or Safari.

### The "Golden Path" Demo Workflow

To impress judges and stakeholders, follow this exact sequence:

1. **Highlight the UI:** Show the zero-clutter environment and split-pane architecture.
2. **Trigger an organic alert:** 
   - Click the big pulsing **SOS** button on the bottom right.
   - Type: `"There is a massive fire in the lobby! people are trapped."`
   - Click **Send Alert Now.**
   - *Result:* Within 2 seconds, the system intelligently categorizes this as a `Fire Emergency (CRITICAL)` prioritizing it higher than standard alerts. 
3. **Simulate a Crisis:** 
   - Click the **"Demo Load"** button located at the top-left of the Dashboard panel.
   - *Result:* The system will simulate 5 concurrent, wide-spread emergencies. Watch as the intelligent queue *automatically sorts* them, bringing active shooters and medical emergencies to the very top over slip/falls.
4. **Manage standard protocol:** 
   - Click on the highest priority marker on the Map.
   - Click **Assign to Me** to lower the map marker's opacity and shift its status.

## 📁 File Structure

```text
/
├── index.html     - Main entry file, holds the layout and modals.
├── styles.css     - The centralized Design System, color variables, and animations.
├── app.js         - The primary logic: Contains the Pub/Sub AlertStore, MapController, and Mock AI Fallbacks.
└── README.md      - Project documentation.
```

## 🔮 Future Roadmap

These are intended upgrades for the production iteration:
- **True Auth Integration:** Tie responder UUIDs into the dashboard via SSO.
- **Native App:** Port the SOS function into a slim progressive web app or native iOS/Android layer utilizing native Voice-to-Text APis.
- **Live Gemini Integration:** Replace the heuristic Mock AI engine in `app.js` with direct API calls to Google's Gemini models for significantly higher nuance parsing of unstructured panic data. 
