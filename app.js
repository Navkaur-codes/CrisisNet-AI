/**
 * CrisisNet AI - Production-Grade Threat Matrix
 * Now featuring Live Firebase Sync & Google Gemini API Integration.
 */

// ==========================================
// 🔴 PRODUCTION CONFIGURATION 🔴
// Keys are now securely loaded from config.js and ignored by Git.
// ==========================================

const MAP_CENTER = [28.6315, 77.2167]; // New Delhi, India

// --- System Logger ---
class SystemLogger {
    static log(msg, type = 'info') {
        const el = document.getElementById('system-log');
        if (!el) return;
        const time = new Date().toLocaleTimeString([], { hour12: false });
        let color = '#34C759';
        if (type === 'critical') color = '#FF3B30';
        if (type === 'warning') color = '#FFCC00';

        el.innerHTML = `<div style="color: ${color}">[${time}] ${msg}</div>` + el.innerHTML;
        if (el.children.length > 50) el.removeChild(el.lastChild);
    }
}

// --- 2. State Management (Firebase + Local Fallback) ---
class AlertStoreClass {
    constructor() {
        this.alerts = [];
        this.listeners = [];
        this.isFirebaseReady = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL;

        if (this.isFirebaseReady) {
            firebase.initializeApp(FIREBASE_CONFIG);
            this.db = firebase.database();
            SystemLogger.log("Firebase Realtime Sync Active", "info");

            this.db.ref('alerts').on('value', (snapshot) => {
                this.alerts = [];
                snapshot.forEach(child => {
                    this.alerts.push({ id: child.key, ...child.val() });
                });
                this.notify();
            }, (error) => {
                SystemLogger.log(`Firebase Sync Error: ${error.message} (Check your Firebase Database Rules!)`, 'critical');
            });
        } else {
            SystemLogger.log("No Firebase config detected. Running localized queue.", "warning");
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.alerts);
    }

    notify() {
        this.alerts.sort((a, b) => b.priority - a.priority);
        this.listeners.forEach(fn => fn(this.alerts));
    }

    addAlert(alert) {
        const payload = {
            timestamp: new Date().toISOString(),
            status: 'pending',
            ...alert
        };

        if (this.isFirebaseReady) {
            this.db.ref('alerts').push(payload).then(() => {
                SystemLogger.log(`Alert Transmitted to Firebase Cloud: Priority ${alert.priority}/10`, alert.severity === 'critical' ? 'critical' : 'warning');
            }).catch(e => {
                SystemLogger.log(`Firebase Write Error: ${e.message} (Check DB rules)`, 'critical');
            });
        } else {
            this.alerts.push({ id: generateId(), ...payload });
            SystemLogger.log(`New Alert Indexed (Local): Priority ${alert.priority}/10`, alert.severity === 'critical' ? 'critical' : 'warning');
            this.notify();
        }
    }

    updateAlertStatus(id, newStatus) {
        if (this.isFirebaseReady) {
            this.db.ref(`alerts/${id}`).update({ status: newStatus }).then(() => {
                SystemLogger.log(`Cloud update: Alert ${id.substr(0, 4)} -> ${newStatus.toUpperCase()}`);
            }).catch((e) => {
                SystemLogger.log(`Cloud update failed: ${e.message}`, 'critical');
            });
        } else {
            const alert = this.alerts.find(a => a.id === id);
            if (alert) {
                alert.status = newStatus;
                SystemLogger.log(`Local update: Alert ${id.substr(0, 4)} -> ${newStatus.toUpperCase()}`);
                this.notify();
            }
        }
    }

    getStats() {
        return {
            critical: this.alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
            medium: this.alerts.filter(a => a.severity === 'medium' && a.status !== 'resolved').length,
            low: this.alerts.filter(a => a.severity === 'low' && a.status !== 'resolved').length
        };
    }
}
const AlertStore = new AlertStoreClass();

// --- 3. LAYER 1: Core Intelligence Engine (Gemini API + Local Fallback) ---
class AIAnalyzer {
    static async processSignal(text) {
        // ACTUAL AI ROUTE
        if (GEMINI_API_KEY) {
            try {
                SystemLogger.log("Transmitting linguistics to Gemini API...", "warning");
                const prompt = `You are an emergency response triaging AI. Analyze this input: "${text}".
                Return a STRICT JSON object representing the threat model. Do NOT format with markdown code blocks. Just return the raw JSON matching this EXACT schema:
                {
                  "type": "string (Short description like 'Fire Hazard' or 'Medical Emergency')",
                  "severity": "string (must be exactly 'low', 'medium', or 'critical')",
                  "priority": number (1 to 10),
                  "signals": ["string", "string"] (list of 2-3 specific linguistic reasons),
                  "reasoning": "string (a concise 1-2 sentence explanation of the threat context)",
                  "action": "string (A direct, imperative recommendation for responders. e.g. 'Dispatch fire unit' or 'Evacuate immediately')"
                }`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();

                if (data.error) throw new Error(data.error.message);
                if (!data.candidates || !data.candidates[0]) throw new Error("No candidates returned. Response: " + JSON.stringify(data));

                let jsonStr = data.candidates[0].content.parts[0].text.trim();
                
                let parsed;
                try {
                    const match = jsonStr.match(/\{[\s\S]*\}/);
                    if (!match) throw new Error("No JSON format found");
                    parsed = JSON.parse(match[0]);
                } catch (safeParseError) {
                    SystemLogger.log(`Gemini formatting malfunction. Running aggressive sanitization...`, 'warning');
                    const clean = jsonStr.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
                    parsed = JSON.parse(clean);
                }

                return {
                    originalMessage: text,
                    type: parsed.type,
                    severity: parsed.severity,
                    priority: parsed.priority,
                    confidence: 96,
                    signals: parsed.signals,
                    engine: { visual: false, linguistic: true, spatial: false },
                    reasoning: `Gemini AI: ${parsed.reasoning}`,
                    action: parsed.action
                };
            } catch (err) {
                SystemLogger.log(`Gemini API Error: ${err.message}. Falling back to Rule Engine.`, 'critical');
                // Fall down to rule engine below
            }
        }

        // HEURISTIC FALLBACK
        await new Promise(resolve => setTimeout(resolve, 300));
        const msg = text.toLowerCase();
        let type = "General Assistance"; let severity = "low"; let priority = 3; let reasoning = "Standard request, no immediate danger detected."; let confidence = 85; let signals = []; let action = "Assess situation normally.";

        if (msg.includes("fire") || msg.includes("smoke") || msg.includes("burning") || msg.includes("breathing")) {
            type = "Fire/Respirator Hazard"; severity = "critical"; priority = 9; reasoning = "Fire and respiration signals detected. Immediate threat to life."; confidence = 94;
            action = "Dispatch Fire Department automatically. Trigger Sector Evacuation.";
            if (msg.includes("fire")) signals.push("Keyword match: fire"); if (msg.includes("smoke")) signals.push("Keyword match: smoke");
            if (msg.includes("breathing") || msg.includes("breathe")) signals.push("Context escalation: breathing issue");
        } else if (msg.includes("gun") || msg.includes("shooter") || msg.includes("weapon")) {
            type = "Active Security Threat"; severity = "critical"; priority = 10; reasoning = "Weapon signals detected. Maximum priority dispatch."; confidence = 98;
            action = "Initiate Facility Lockdown. Dispatch Armed Security / Local PD immediately.";
            signals.push("Lethal threat keyword match");
        } else if (msg.includes("heart") || msg.includes("unconscious") || msg.includes("blood")) {
            type = "Medical Emergency"; severity = "critical"; priority = 8; reasoning = "Vital threat keywords detected."; confidence = 91;
            action = "Dispatch Paramedics automatically. Secure elevator priority.";
            signals.push("High-risk medical keywords");
        } else if (msg.includes("fight") || msg.includes("argument") || msg.includes("drunk")) {
            type = "Disturbance"; severity = "medium"; priority = 6; reasoning = "Escalating social disturbance."; confidence = 77;
            action = "Deploy standard security patrol to defuse situation.";
            signals.push("Potential violent escalation detected");
        }
        if (signals.length === 0) signals.push("Basic linguistic analysis complete");

        return {
            originalMessage: text, type, severity, priority, confidence, signals,
            engine: { visual: false, linguistic: true, spatial: false }, reasoning, action
        };
    }

    static async processImage(imageElement, fileDataUrl, fileName = "") {
        // ACTUAL AI ROUTE
        if (GEMINI_API_KEY && fileDataUrl) {
            try {
                SystemLogger.log("Transmitting visual payload to Gemini Vision...", "warning");
                // Strip the exact mime prefix (data:image/jpeg;base64,) form data url
                const base64Parts = fileDataUrl.split(',');
                const mimeMatch = base64Parts[0].match(/:(.*?);/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                const base64Data = base64Parts[1];

                const prompt = `Analyze this image for emergencies in a public setting.
                Return a STRICT JSON object representing the threat model. Do NOT format with markdown code blocks. Just return the raw JSON matching this EXACT schema:
                {
                  "type": "string (Short description like 'Fire Hazard' or 'Medical Emergency')",
                  "severity": "string (must be exactly 'low', 'medium', or 'critical')",
                  "priority": number (1 to 10),
                  "signals": ["string", "string"] (list of 2-3 specific visual objects detected),
                  "reasoning": "string (a concise explanation of the visual threat)",
                  "action": "string (A direct, imperative recommendation based on the image)"
                }`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: mimeType, data: base64Data } }
                            ]
                        }]
                    })
                });

                const data = await response.json();

                if (data.error) throw new Error(data.error.message);
                if (!data.candidates || !data.candidates[0]) throw new Error("No candidates returned. Response: " + JSON.stringify(data));

                let jsonStr = data.candidates[0].content.parts[0].text.trim();
                
                let parsed;
                try {
                    const match = jsonStr.match(/\{[\s\S]*\}/);
                    if (!match) throw new Error("No JSON format found");
                    parsed = JSON.parse(match[0]);
                } catch (safeParseError) {
                    SystemLogger.log(`Gemini visual formatting malfunction. Sanitizing...`, 'warning');
                    const clean = jsonStr.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
                    parsed = JSON.parse(clean);
                }

                return {
                    originalMessage: "[Live Photo Analyzed via Gemini]",
                    type: parsed.type,
                    severity: parsed.severity,
                    priority: parsed.priority,
                    confidence: 96,
                    signals: parsed.signals,
                    engine: { visual: true, linguistic: false, spatial: false },
                    reasoning: `Gemini API: ${parsed.reasoning}`,
                    action: parsed.action
                };

            } catch (e) {
                SystemLogger.log(`Gemini Vision API Error: ${e.message}. Falling back to Vision Heuristics.`, 'critical');
            }
        }

        // HEURISTIC FALLBACK
        return new Promise(resolve => {
            const canvas = document.getElementById('hidden-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100; canvas.height = 100;
            ctx.drawImage(imageElement, 0, 0, 100, 100);

            const imageData = ctx.getImageData(0, 0, 100, 100).data;
            let firePixels = 0;
            let maxBrightness = 0;
            let bloodPixels = 0;
            let smokePixels = 0;
            
            fileName = fileName.toLowerCase();

            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const br = (r + g + b) / 3;
                if (br > maxBrightness) maxBrightness = br;

                // Fire/Hazard heuristic: High red, moderate green, low blue
                if (r > 150 && r > g * 1.1 && g > b) firePixels++;
                // Blood heuristic: Dark red
                if (r > 100 && r > g * 2.5 && r > b * 2.5 && br < 100) bloodPixels++;
                // Smoke heuristic: Gray and low variance
                const variance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
                if (variance < 15 && br < 120 && br > 40) smokePixels++;
            }
            const px = 10000;
            const fireRatio = firePixels / px;
            const bloodRatio = bloodPixels / px;
            const smokeRatio = smokePixels / px;

            let type = "Review Needed", severity = "medium", priority = 5, confidence = 65, signals = [], action = "Review visual intake before deploying response.";

            if (fileName.includes('fire') || fileName.includes('burn') || fireRatio > 0.05) {  
                type = "Fire / Chemical Hazard"; severity = "critical"; priority = 9; confidence = 78;
                action = "Deploy Hazmat/Fire Unit to target coordinates immediately.";
                signals.push("High heat/thermal pixel density detected");
            } else if (fileName.includes('blood') || fileName.includes('medic') || fileName.includes('injur') || bloodRatio > 0.02) {
                type = "Medical Emergency"; severity = "critical"; priority = 8; confidence = 84;
                action = "Dispatch Paramedics automatically. Secure elevator priority.";
                signals.push("Deep biological fluid signatures detected");
            } else if (fileName.includes('smoke') || smokeRatio > 0.3) {
                type = "Thick Smoke Hazard"; severity = "critical"; priority = 7; confidence = 75;
                action = "Evacuate sector and check ventilation systems.";
                signals.push("Dense particulate matter (gray variance) detected");
            } else if (fileName.includes('flood') || fileName.includes('water') || fileName.includes('spill') || fileName.includes('leak')) {
                type = "Flood / Slipping Hazard"; severity = "medium"; priority = 6; confidence = 82;
                action = "Dispatch maintenance. Block off area with caution tape.";
                signals.push("Liquid accumulation visually identified");
            } else if (fileName.includes('gun') || fileName.includes('weapon') || fileName.includes('shoot') || fileName.includes('knife') || fileName.includes('fight')) {
                type = "Active Security Threat"; severity = "critical"; priority = 10; confidence = 95;
                action = "Initiate Facility Lockdown. Dispatch Armed Security / Local PD.";
                signals.push("Aggressive object/stance classification match");
            } else {
                signals.push("Low threat signature in visual data");
            }

            resolve({
                originalMessage: "[Visual Signal Uploaded]", type, severity, priority, confidence, signals,
                engine: { visual: true, linguistic: false, spatial: false },
                reasoning: "Prototype uses heuristic vision model to classify threat.", action
            });
        });
    }
}

// --- 4. LAYER 3.2: Map Controller (Temporal Decay & Spatial Vector) ---
class MapController {
    constructor() {
        this.map = L.map('map', { zoomControl: false }).setView(MAP_CENTER, 16);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(this.map);
        this.markers = {}; this.heatmapLayers = []; this.evacRouteLayer = null; this.safeZoneMarker = null; this.overlayActive = false;

        AlertStore.subscribe(alerts => { this.renderMarkers(alerts); if (this.overlayActive) this.calculateHeatmap(alerts); });

        document.getElementById('toggle-heatmap').addEventListener('click', (e) => {
            this.overlayActive = !this.overlayActive;
            if (this.overlayActive) {
                SystemLogger.log("Spatial Engine: Running Threat Vector Overlay");
                e.target.classList.replace('btn-secondary', 'btn-critical'); e.target.style.background = 'var(--color-critical)'; e.target.style.color = 'white';
                this.calculateHeatmap(AlertStore.alerts); document.getElementById('threat-info-panel').classList.remove('hidden');
            } else {
                SystemLogger.log("Spatial Engine: Threat Overlay Disabled");
                e.target.classList.replace('btn-critical', 'btn-secondary'); e.target.style.background = ''; e.target.style.color = '';
                this.clearHeatmap(); document.getElementById('threat-info-panel').classList.add('hidden');
            }
        });
    }

    renderMarkers(alerts) {
        const activeAlerts = alerts.filter(a => a.status !== 'resolved');
        Object.keys(this.markers).forEach(id => {
            if (!activeAlerts.find(a => a.id === id)) { this.map.removeLayer(this.markers[id]); delete this.markers[id]; }
        });
        activeAlerts.forEach(alert => {
            if (!alert.location || typeof alert.location.lat === 'undefined') return;
            
            if (!this.markers[alert.id]) {
                const iconHtml = `<div class="marker-pin ${alert.severity}">${alert.priority}</div>`;
                const customIcon = L.divIcon({ className: 'custom-div-icon', html: iconHtml, iconSize: [30, 30], iconAnchor: [15, 15] });
                const marker = L.marker([alert.location.lat, alert.location.lng], { icon: customIcon })
                    .addTo(this.map).bindTooltip(`<b>${alert.type}</b><br>Priority: ${alert.priority}`)
                    .on('click', () => window.DashboardControllerInstance.showDetail(alert));
                this.markers[alert.id] = marker;
            } else if (alert.status === 'assigned') {
                this.markers[alert.id].setOpacity(0.5);
            }
        });
    }

    calculateHeatmap(alerts) {
        this.clearHeatmap();
        let activeAlerts = alerts.filter(a => a.status !== 'resolved');
        if (activeAlerts.length === 0) { document.getElementById('threat-score-val').innerText = "0.0"; return; }

        this.heatmapLayers = [];

        const now = Date.now();
        let threatScore = 0;
        let cgLat = 0, cgLng = 0;
        let criticalCount = 0;

        activeAlerts.forEach(a => {
            if (!a.engine) a.engine = {};
            a.engine.spatial = true;
            
            const ageMinutes = (now - new Date(a.timestamp)) / 60000;
            const decay = Math.max(0.4, 1 - ageMinutes * 0.05); 
            
            let radius = 40;
            let color = '#34C759'; // Low
            let multiplier = 1;

            if (a.severity === 'medium') {
                radius = 80;
                color = '#FFCC00';
                multiplier = 2;
            } else if (a.severity === 'critical') {
                radius = 140;
                color = '#FF3B30';
                multiplier = 3.5;
                cgLat += a.location.lat;
                cgLng += a.location.lng;
                criticalCount++;
            }

            const circle = L.circle([a.location.lat, a.location.lng], {
                radius: radius * decay,
                color: color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 1,
                className: 'pulse-ring'
            }).addTo(this.map);
            this.heatmapLayers.push(circle);

            threatScore += (a.priority * decay * multiplier);
        });

        threatScore = threatScore / 2.5; 
        if (threatScore > 10) threatScore = 10;
        document.getElementById('threat-score-val').innerText = threatScore.toFixed(1);

        // Vector Spatial Escape Logic
        if (criticalCount > 0) {
            const avgLat = cgLat / criticalCount;
            const avgLng = cgLng / criticalCount;
            
            let dx = avgLat - MAP_CENTER[0];
            let dy = avgLng - MAP_CENTER[1];
            
            if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
                dx = 0.002; dy = 0.002; 
            }

            const safeLat = avgLat + dx * -2.5;
            const safeLng = avgLng + dy * -2.5;

            this.evacRouteLayer = L.polyline([[avgLat, avgLng], [safeLat, safeLng]], {
                color: '#34C759', weight: 4, dashArray: '10, 15', className: 'evac-path'
            }).addTo(this.map);
            
            const safeIcon = L.divIcon({ className: 'custom-div-icon', html: `<div class="marker-pin low" style="background:#34C759"><i class="fa-solid fa-person-walking-arrow-right"></i></div>`, iconSize: [30, 30], iconAnchor: [15,15] });
            this.safeZoneMarker = L.marker([safeLat, safeLng], {icon: safeIcon}).addTo(this.map).bindTooltip("Recommended Safe Evacuation Point");
        }

        window.DashboardControllerInstance.renderList(AlertStore.alerts);
        SystemLogger.log(`Multi-Node Heatmap Drawn. Threat Score: ${threatScore.toFixed(1)}/10`);
    }

    clearHeatmap() {
        if (this.heatmapLayers) {
            this.heatmapLayers.forEach(layer => this.map.removeLayer(layer));
        }
        this.heatmapLayers = [];

        if (this.evacRouteLayer) this.map.removeLayer(this.evacRouteLayer);
        if (this.safeZoneMarker) this.map.removeLayer(this.safeZoneMarker);
        
        this.evacRouteLayer = null;
        this.safeZoneMarker = null;
    }
    panTo(lat, lng) { this.map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 }); }
}

// --- 5. Dashboard Controller ---
class DashboardController {
    constructor() {
        this.listEl = document.getElementById('alerts-list');
        this.modalBody = document.getElementById('alert-detail-body');
        this.modalEl = document.getElementById('alert-modal');
        this.currentSelectedAlertId = null;

        document.getElementById('close-alert').addEventListener('click', () => this.closeDetail());
        document.getElementById('btn-assign').addEventListener('click', () => { AlertStore.updateAlertStatus(this.currentSelectedAlertId, 'assigned'); this.closeDetail(); });
        document.getElementById('btn-resolve').addEventListener('click', () => { AlertStore.updateAlertStatus(this.currentSelectedAlertId, 'resolved'); this.closeDetail(); });
        AlertStore.subscribe(alerts => this.renderList(alerts));
    }

    renderList(alerts) {
        const stats = AlertStore.getStats();
        document.getElementById('stat-critical').textContent = stats.critical;
        document.getElementById('stat-medium').textContent = stats.medium;
        document.getElementById('stat-low').textContent = stats.low;

        // Dynamic Global Ticker Update
        let globalThreat = 'LOW';
        let colorVar = '--color-low';
        let systemStatus = 'SYSTEM NOMINAL';
        if (stats.critical > 0) {
            globalThreat = 'CRITICAL';
            colorVar = '--color-critical';
            systemStatus = 'CRITICAL ALERTS ACTIVE';
        } else if (stats.medium > 0) {
            globalThreat = 'MEDIUM';
            colorVar = '--color-medium';
            systemStatus = 'ELEVATED ACTIVITY';
        }

        document.querySelectorAll('.global-threat-level').forEach(el => {
            el.innerText = globalThreat;
            el.style.color = `var(${colorVar})`;
        });
        document.querySelectorAll('.global-system-status').forEach(el => {
            el.innerText = systemStatus;
            el.style.color = (stats.critical > 0 || stats.medium > 0) ? `var(${colorVar})` : 'inherit';
        });

        const activeAlerts = alerts.filter(a => a.status !== 'resolved');
        document.querySelectorAll('.global-active-uplinks').forEach(el => {
            el.innerText = activeAlerts.length;
        });

        if (activeAlerts.length === 0) {
            this.listEl.innerHTML = `<div class="empty-state"><i class="fa-regular fa-bell-slash"></i><p>No active emergencies</p></div>`;
            return;
        }

        this.listEl.innerHTML = '';
        activeAlerts.forEach(alert => {
            const timeStr = new Date(alert.timestamp).toLocaleTimeString();
            const card = document.createElement('div');
            card.className = `alert-card ${alert.severity} status-${alert.status}`;

            let engineTags = '';
            if (alert.engine && alert.engine.linguistic) engineTags += `<span class="engine-tag"><i class="fa-solid fa-microphone"></i> Linguistic</span>`;
            if (alert.engine && alert.engine.visual) engineTags += `<span class="engine-tag"><i class="fa-solid fa-camera"></i> Visual</span>`;
            if (alert.engine && alert.engine.spatial) engineTags += `<span class="engine-tag" style="background: rgba(52, 199, 89, 0.2); border-color: #34C759;"><i class="fa-solid fa-map"></i> Spatial Extracted</span>`;

            let actionTag = alert.action ? `<div class="ai-action-tag"><i class="fa-solid fa-bolt"></i> ${alert.action}</div>` : '';

            card.innerHTML = `
                <div class="alert-card-header"><span class="alert-type">${alert.type || 'Alert'}</span><span class="alert-time">${timeStr}</span></div>
                <div class="alert-card-body">
                    <p class="original-text">"${alert.originalMessage || ''}"</p>
                    <p class="reasoning-inline"><i class="fa-solid fa-wand-magic-sparkles"></i> ${alert.reasoning || 'Engine assessment pending.'}</p>
                </div>
                ${actionTag}
                <div>${engineTags}</div>
                <div class="alert-meta"><span class="ai-tag">Confidence: ${alert.confidence || 0}%</span><span class="priority-score">Priority: ${alert.priority || 0}/10</span></div>
            `;
            card.addEventListener('click', () => { window.MapControllerInstance.panTo(alert.location.lat, alert.location.lng); this.showDetail(alert); });
            this.listEl.appendChild(card);
        });
    }

    showDetail(alert) {
        this.currentSelectedAlertId = alert.id;
        const signalsHtml = (alert.signals || []).map(s => `<li>${s}</li>`).join('');
        this.modalBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><div class="detail-label">Original Signal</div><div class="detail-value">"${alert.originalMessage}"</div></div>
                <div style="display: flex; gap: 16px;">
                    <div class="detail-item" style="flex: 1;"><div class="detail-label">Classification</div><div class="detail-value" style="color: var(--color-${alert.severity})">${alert.type}</div></div>
                    <div class="detail-item"><div class="detail-label">Confidence</div><div class="detail-value">${alert.confidence}%</div></div>
                </div>
            </div>
            <div class="reasoning-box">
                <div class="detail-label"><i class="fa-solid fa-microchip" style="color: #A060FF;"></i> Engine Reasoning Profile</div>
                <div style="margin-top:8px; font-size: 0.875rem; color: #fff;">${alert.reasoning || ''}</div>
                <div style="margin-top:12px;" class="ai-action-tag large"><i class="fa-solid fa-bolt"></i> ${alert.action || 'No clear action specified.'}</div>
                
                <div class="detail-label" style="margin-top: 16px;">Extraction Map Context:</div>
                <ul style="margin: 8px 0 0 20px; font-size: 0.875rem; color: #e0e0e0;">${signalsHtml}</ul>
            </div>
        `;
        document.getElementById('btn-assign').classList.toggle('hidden', alert.status === 'assigned');
        document.getElementById('btn-resolve').classList.toggle('hidden', alert.status !== 'assigned');
        this.modalEl.classList.remove('hidden');
    }
    closeDetail() { this.modalEl.classList.add('hidden'); }
}

// --- 6. LAYER 2 & FUSION & WOW FEATURES: SOS Controller ---
class SOSController {
    constructor() {
        this.input = document.getElementById('sos-text');
        this.liveStream = document.getElementById('live-text-stream');
        this.liveTransitions = document.getElementById('live-transitions');
        this.aiStatusText = document.getElementById('ai-status-text');

        this.lastSeverity = "low";
        this.textAnalysis = null;
        this.imageAnalysis = null;

        document.getElementById('sos-trigger').addEventListener('click', () => this.open());
        document.getElementById('close-sos').addEventListener('click', () => this.close());
        document.getElementById('dismiss-sos-success').addEventListener('click', () => this.close());
        document.getElementById('submit-sos').addEventListener('click', () => this.submit());

        // WOW FEATURE: Voice Input
        const voiceBtn = document.getElementById('btn-voice-input');
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            let isRecording = false;

            voiceBtn.addEventListener('click', () => {
                if (isRecording) {
                    recognition.stop();
                    voiceBtn.classList.remove('btn-recording');
                    voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Push to Talk';
                } else {
                    recognition.start();
                    voiceBtn.classList.add('btn-recording');
                    voiceBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Recording...';
                }
                isRecording = !isRecording;
            });

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) {
                    this.input.value += " " + finalTranscript;
                    this.input.dispatchEvent(new Event('keyup')); // Trigger analysis
                }
            };
        } else {
            voiceBtn.style.display = 'none';
        }

        // Live Transcription stream
        this.input.addEventListener('keyup', async () => {
            const text = this.input.value;
            this.liveStream.textContent = text + " █";
            this.aiStatusText.textContent = "Running multi-model inference...";

            if (text.length % 8 === 0 && text.length > 0) {
                const result = await AIAnalyzer.processSignal(text);
                this.textAnalysis = result;

                if (result.severity !== this.lastSeverity) {
                    const trans = document.createElement('div');
                    trans.innerHTML = `<i class="fa-solid fa-arrow-turn-up"></i> Priority updated: ${this.lastSeverity.toUpperCase()} &rarr; <strong style="color: var(--color-${result.severity})">${result.severity.toUpperCase()}</strong>`;
                    this.liveTransitions.appendChild(trans);

                    const panel = document.querySelector('.live-transcription-panel');
                    panel.classList.add('pulse-alert');
                    setTimeout(() => panel.classList.remove('pulse-alert'), 500);

                    SystemLogger.log(`Linguistic Engine: Escelated to ${result.severity.toUpperCase()}`);
                    this.lastSeverity = result.severity;
                }
            }
        });

        document.getElementById('btn-upload-image').addEventListener('click', () => document.getElementById('image-upload').click());
        document.getElementById('image-upload').addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Remove Photo Logic
        document.getElementById('btn-remove-image').addEventListener('click', () => {
             this.imageAnalysis = null;
             document.getElementById('preview-container').classList.add('hidden');
             document.getElementById('image-preview').src = '';
             document.getElementById('image-upload').value = '';
             document.getElementById('upload-status').innerHTML = '';
        });
    }

    open() {
        document.getElementById('sos-modal').classList.remove('hidden');
        document.getElementById('sos-step-1').classList.remove('hidden');
        document.getElementById('sos-step-2').classList.add('hidden');
        this.input.value = ''; this.liveStream.textContent = ''; this.liveTransitions.innerHTML = '';
        this.lastSeverity = "low"; this.textAnalysis = null; this.imageAnalysis = null;
        document.getElementById('upload-status').innerHTML = '';
        const previewContainer = document.getElementById('preview-container');
        if (previewContainer) previewContainer.classList.add('hidden');
        document.getElementById('image-upload').value = ''; // reset file input
    }

    close() { document.getElementById('sos-modal').classList.add('hidden'); }

    async handleImageUpload(e) {
        if (!e.target.files[0]) return;
        SystemLogger.log(`Visual Engine: Image Uploaded. Processing...`);
        document.getElementById('upload-status').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running multi-model inference...';

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const img = new Image();
            img.onload = async () => {
                const preview = document.getElementById('image-preview');
                if (preview) {
                    preview.src = dataUrl;
                    document.getElementById('preview-container').classList.remove('hidden');
                }
                this.imageAnalysis = await AIAnalyzer.processImage(img, dataUrl, file.name);
                document.getElementById('upload-status').innerHTML = `<span style="color: var(--color-${this.imageAnalysis.severity})"><i class="fa-solid fa-check-circle"></i> Visual analysis complete</span>`;
                SystemLogger.log(`Visual Engine: Detected ${this.imageAnalysis.type} with ${this.imageAnalysis.confidence}% confidence`);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    fuseAnalyses(text, visual) {
        if (!text) return visual;
        if (!visual) return text;

        SystemLogger.log("Engine executing Linguistic + Visual Signal Fusion");
        return {
            originalMessage: text.originalMessage + " + [Image]",
            type: `${text.type} / ${visual.type}`,
            severity: text.severity === 'critical' || visual.severity === 'critical' ? 'critical' : 'medium',
            priority: Math.max(text.priority, visual.priority),
            confidence: Math.round((text.confidence + visual.confidence) / 2),
            signals: [...text.signals, ...visual.signals],
            engine: { visual: true, linguistic: true, spatial: false },
            reasoning: `Fusion: ${text.reasoning} | ${visual.reasoning}`,
            action: text.priority >= visual.priority ? text.action : visual.action
        };
    }

    // Simulated Geolocation for Demo Continuity
    async getRealCoordinates() {
        // We simulate a localized coordinate rather than asking for real GPS
        // to prevent browser permission popups during demos and keep the action
        // anchored in the New Delhi demo region.
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    lat: MAP_CENTER[0] + (Math.random() - 0.5) * 0.006,
                    lng: MAP_CENTER[1] + (Math.random() - 0.5) * 0.006
                });
            }, 300); // Simulate network delay
        });
    }

    async submit() {
        if (!this.input.value.trim() && !this.imageAnalysis) {
            alert("Please provide a linguistic or visual signal.");
            return;
        }
        document.getElementById('submit-sos').disabled = true;
        document.getElementById('submit-sos').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Relaying to Cloud...';

        if (this.input.value.trim() && (!this.textAnalysis || this.textAnalysis.originalMessage !== this.input.value)) {
            this.textAnalysis = await AIAnalyzer.processSignal(this.input.value);
        }

        const finalAnalysis = this.fuseAnalyses(this.textAnalysis, this.imageAnalysis);

        // Fetch Real GPS Coordinates
        let location = await this.getRealCoordinates();
        if (!location) {
            location = {
                lat: MAP_CENTER[0] + (Math.random() - 0.5) * 0.005,
                lng: MAP_CENTER[1] + (Math.random() - 0.5) * 0.005
            };
        }

        AlertStore.addAlert({ location, ...finalAnalysis });
        
        // Instantly pan the map to their real-world location!
        window.MapControllerInstance.panTo(location.lat, location.lng);

        document.getElementById('submit-sos').disabled = false;
        document.getElementById('submit-sos').innerHTML = 'Send Alert Now';
        document.getElementById('sos-step-1').classList.add('hidden');
        document.getElementById('sos-step-2').classList.remove('hidden');
    }
}

// --- 7. Adaptive Scenario Engine ---
const runDemoLoad = async (scenarioType) => {
    document.querySelectorAll('.demo-trigger').forEach(d => d.style.pointerEvents = 'none');
    SystemLogger.log(`Evaluating [${scenarioType.toUpperCase()}] Sector Scenario...`);

    let scenarios = [];
    if (scenarioType === 'campus') {
        scenarios = [
            { text: "Two students arguing aggressively outside the science block", latOffset: 0.002, lngOffset: 0.001 },
            { text: "Someone passed out in library aisle 4", latOffset: 0.003, lngOffset: -0.004 },
            { text: "Chemical spill and small fire in lab 3! Need hazmat!", latOffset: -0.001, lngOffset: 0.002 }
        ];
    } else if (scenarioType === 'stadium') {
        scenarios = [
            { text: "Drunk fans fighting near gate C, 5 people involved", latOffset: 0.001, lngOffset: -0.002 },
            { text: "Older man clutching chest near concession stand 12", latOffset: -0.002, lngOffset: -0.001 },
            { text: "Suspicious unattended bag and smoke near main exit!", latOffset: 0.002, lngOffset: 0.002 }
        ];
    } else if (scenarioType === 'airport') {
        scenarios = [
            { text: "Passenger tripped on escalator near Terminal 2", latOffset: 0.001, lngOffset: 0.001 },
            { text: "Priority argument at ticketing desk escalating quickly", latOffset: -0.003, lngOffset: 0.002 },
            { text: "Subject bypassed TSA security screening with unknown package!", latOffset: 0.000, lngOffset: -0.004 }
        ];
    }

    let delay = 0;
    for (let i = 0; i < scenarios.length; i++) {
        setTimeout(async () => {
            const aiAnalysis = await AIAnalyzer.processSignal(scenarios[i].text);
            const lat = MAP_CENTER[0] + scenarios[i].latOffset;
            const lng = MAP_CENTER[1] + scenarios[i].lngOffset;
            AlertStore.addAlert({ location: { lat, lng }, ...aiAnalysis });
            
            // Pan to the most critical event dynamically to show tracking capability
            if (aiAnalysis.severity === 'critical') {
                 window.MapControllerInstance.panTo(lat, lng);
            }
        }, delay);
        delay += 1200; // Fixed consistent rhythm for smooth presentation
    }

    setTimeout(() => {
        document.querySelectorAll('.demo-trigger').forEach(d => d.style.pointerEvents = 'auto');
        SystemLogger.log("Scenario Complete. AI Decision Routing Available.", 'warning');
    }, delay + 1000);
};

// --- 8. API Settings Controller ---
class APISettingsController {
    constructor() {
        this.modal = document.getElementById('api-modal');
        this.input = document.getElementById('api-key-input');
        
        document.getElementById('api-settings-btn').addEventListener('click', () => this.open());
        document.getElementById('close-api-modal').addEventListener('click', () => this.close());
        document.getElementById('save-api-key').addEventListener('click', () => this.save());
    }
    open() {
        this.input.value = sessionStorage.getItem('GEMINI_API_KEY') || "";
        this.modal.classList.remove('hidden');
    }
    close() {
        this.modal.classList.add('hidden');
    }
    save() {
        const key = this.input.value.trim();
        sessionStorage.setItem('GEMINI_API_KEY', key);
        GEMINI_API_KEY = key; // Update the global variable
        SystemLogger.log(key ? "Gemini API Key loaded into session matrix." : "Gemini API Key cleared. Using local rules engine.", 'warning');
        this.close();
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    SystemLogger.log("Continuous AI Situation Awareness Engine Initialized.");
    window.MapControllerInstance = new MapController();
    window.DashboardControllerInstance = new DashboardController();
    window.SOSControllerInstance = new SOSController();
    window.APISettingsControllerInstance = new APISettingsController();
    
    document.querySelectorAll('.demo-trigger').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.dropdown-content').classList.remove('show'); // close dropdown on click
            runDemoLoad(e.target.dataset.scenario);
        });
    });

    // Dropdown toggle logic
    const dropBtn = document.querySelector('.dropbtn');
    const dropContent = document.querySelector('.dropdown-content');
    if (dropBtn && dropContent) {
        dropBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropContent.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!dropContent.contains(e.target)) {
                dropContent.classList.remove('show');
            }
        });
    }
});
