/**
 * CrisisNet AI - Main Application Logic
 * Architecture: Service-based with Pub/Sub State Management
 */

// --- 1. Utilities & Constants ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const MAP_CENTER = [36.1146, -115.1728]; // Las Vegas Strip as demo center

// --- 2. State Management (Pub/Sub) ---
class AlertStoreClass {
    constructor() {
        this.alerts = [];
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.alerts); // Initial call
    }

    notify() {
        // Sort highest priority first before notifying
        this.alerts.sort((a, b) => b.priority - a.priority);
        this.listeners.forEach(fn => fn(this.alerts));
    }

    addAlert(alert) {
        this.alerts.push({
            id: generateId(),
            timestamp: new Date().toISOString(),
            status: 'pending', // pending, assigned, resolved
            ...alert
        });
        this.notify();
    }

    updateAlertStatus(id, newStatus) {
        const alert = this.alerts.find(a => a.id === id);
        if (alert) {
            alert.status = newStatus;
            this.notify();
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

// --- 3. AI Service (Mock Fallback) ---
class AIAnalyzer {
    static async processSignal(text) {
        // Simulate network/API delay to feel like real AI processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        const msg = text.toLowerCase();
        let type = "General Assistance";
        let severity = "low";
        let priority = 3;
        let reasoning = "Standard request, no immediate danger detected.";

        // Keyword heuristics mimicking AI classification
        if (msg.includes("fire") || msg.includes("smoke") || msg.includes("burning")) {
            type = "Fire Emergency";
            severity = "critical";
            priority = 10;
            reasoning = "Fire keywords detected. High risk of spread and immediate life threat.";
        } else if (msg.includes("gun") || msg.includes("shooter") || msg.includes("weapon") || msg.includes("attack")) {
            type = "Active Security Threat";
            severity = "critical";
            priority = 10;
            reasoning = "Weapon keywords detected. Requires immediate armed response.";
        } else if (msg.includes("heart") || msg.includes("chest") || msg.includes("blood") || msg.includes("unconscious")) {
            type = "Medical Emergency";
            severity = "critical";
            priority = 9;
            reasoning = "Life-threatening medical keywords. Dispatch EMTs immediately.";
        } else if (msg.includes("fight") || msg.includes("drunk") || msg.includes("argument")) {
            type = "Disturbance";
            severity = "medium";
            priority = 6;
            reasoning = "Potential escalation. Security intervention recommended.";
        } else if (msg.includes("spill") || msg.includes("broken") || msg.includes("water")) {
            type = "Maintenance Hazard";
            severity = "low";
            priority = 2;
            reasoning = "Slip/fall hazard detected. Routine dispatch.";
        }

        return {
            originalMessage: text,
            type,
            severity, // 'critical', 'medium', 'low'
            priority, // 1-10
            summary: `Automated Classification: ${type} (${severity.toUpperCase()})`,
            reasoning
        };
    }
}

// --- 4. Map Controller ---
class MapController {
    constructor() {
        this.map = L.map('map', { zoomControl: false }).setView(MAP_CENTER, 16);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        this.markers = {};

        AlertStore.subscribe(alerts => this.renderMarkers(alerts));
    }

    renderMarkers(alerts) {
        // Clear old markers that are resolved
        const activeAlerts = alerts.filter(a => a.status !== 'resolved');
        
        // Remove old
        Object.keys(this.markers).forEach(id => {
            if (!activeAlerts.find(a => a.id === id)) {
                this.map.removeLayer(this.markers[id]);
                delete this.markers[id];
            }
        });

        // Add or update
        activeAlerts.forEach(alert => {
            if (!this.markers[alert.id]) {
                const iconHtml = `<div class="marker-pin ${alert.severity}">${alert.priority}</div>`;
                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: iconHtml,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                const marker = L.marker([alert.location.lat, alert.location.lng], { icon: customIcon })
                    .addTo(this.map)
                    .bindTooltip(`<b>${alert.type}</b><br>Priority: ${alert.priority}`)
                    .on('click', () => {
                        window.DashboardControllerInstance.showDetail(alert);
                    });

                this.markers[alert.id] = marker;
            } else {
                // Update opacity if assigned
                if (alert.status === 'assigned') {
                    this.markers[alert.id].setOpacity(0.5);
                }
            }
        });
    }

    panTo(lat, lng) {
        this.map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
    }
}

// --- 5. Dashboard Controller ---
class DashboardController {
    constructor() {
        this.listEl = document.getElementById('alerts-list');
        this.modalEl = document.getElementById('alert-modal');
        this.modalBody = document.getElementById('alert-detail-body');
        
        this.stats = {
            critical: document.getElementById('stat-critical'),
            medium: document.getElementById('stat-medium'),
            low: document.getElementById('stat-low')
        };

        document.getElementById('close-alert').addEventListener('click', () => this.closeDetail());
        
        this.currentSelectedAlertId = null;

        document.getElementById('btn-assign').addEventListener('click', () => {
            if (this.currentSelectedAlertId) {
                AlertStore.updateAlertStatus(this.currentSelectedAlertId, 'assigned');
                this.closeDetail();
            }
        });

        document.getElementById('btn-resolve').addEventListener('click', () => {
             if (this.currentSelectedAlertId) {
                AlertStore.updateAlertStatus(this.currentSelectedAlertId, 'resolved');
                this.closeDetail();
            }
        });

        AlertStore.subscribe(alerts => this.renderList(alerts));
    }

    renderList(alerts) {
        // Update Stats
        const stats = AlertStore.getStats();
        this.stats.critical.textContent = stats.critical;
        this.stats.medium.textContent = stats.medium;
        this.stats.low.textContent = stats.low;

        const activeAlerts = alerts.filter(a => a.status !== 'resolved');

        if (activeAlerts.length === 0) {
            this.listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-bell-slash"></i>
                    <p>No active emergencies</p>
                </div>
            `;
            return;
        }

        this.listEl.innerHTML = '';
        activeAlerts.forEach(alert => {
            const timeStr = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const card = document.createElement('div');
            card.className = `alert-card ${alert.severity} status-${alert.status}`;
            card.innerHTML = `
                <div class="alert-card-header">
                    <span class="alert-type">
                        ${alert.severity === 'critical' ? '<i class="fa-solid fa-triangle-exclamation"></i>' : ''}
                        ${alert.type}
                    </span>
                    <span class="alert-time">${timeStr}</span>
                </div>
                <div class="alert-card-body">
                    <p>"${alert.originalMessage}"</p>
                </div>
                <div class="alert-meta">
                    <span class="ai-tag"><i class="fa-solid fa-sparkles"></i> AI Analyzed</span>
                    <span class="priority-score">Priority: ${alert.priority}/10</span>
                </div>
                ${alert.status === 'assigned' ? '<div style="margin-top: 8px; font-size: 0.75rem; color: var(--color-brand);"><i class="fa-solid fa-user-check"></i> Assigned to Responder</div>' : ''}
            `;

            card.addEventListener('click', () => {
                window.MapControllerInstance.panTo(alert.location.lat, alert.location.lng);
                this.showDetail(alert);
            });

            this.listEl.appendChild(card);
        });
    }

    showDetail(alert) {
        this.currentSelectedAlertId = alert.id;
        
        this.modalBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Original Message</div>
                    <div class="detail-value">"${alert.originalMessage}"</div>
                </div>
                
                <div style="display: flex; gap: 16px;">
                    <div class="detail-item" style="flex: 1;">
                        <div class="detail-label">Classification</div>
                        <div class="detail-value" style="color: var(--color-${alert.severity})">${alert.type}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Priority</div>
                        <div class="detail-value">${alert.priority} / 10</div>
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Location (Lat, Lng)</div>
                    <div class="detail-value">${alert.location.lat.toFixed(5)}, ${alert.location.lng.toFixed(5)}</div>
                </div>
            </div>
            
            <div class="reasoning-box">
                <div class="detail-label"><i class="fa-solid fa-sparkles" style="color: #A060FF;"></i> AI Reasoning</div>
                <div class="detail-value" style="font-size: 0.875rem;">${alert.reasoning}</div>
            </div>
        `;

        const btnAssign = document.getElementById('btn-assign');
        const btnResolve = document.getElementById('btn-resolve');

        if (alert.status === 'assigned') {
            btnAssign.classList.add('hidden');
            btnResolve.classList.remove('hidden');
        } else {
            btnAssign.classList.remove('hidden');
            btnResolve.classList.add('hidden');
        }

        this.modalEl.classList.remove('hidden');
    }

    closeDetail() {
        this.modalEl.classList.add('hidden');
        this.currentSelectedAlertId = null;
    }
}

// --- 6. SOS Controller ---
class SOSController {
    constructor() {
        this.triggerBtn = document.getElementById('sos-trigger');
        this.modal = document.getElementById('sos-modal');
        this.step1 = document.getElementById('sos-step-1');
        this.step2 = document.getElementById('sos-step-2');
        this.textInput = document.getElementById('sos-text');
        
        // Listeners
        this.triggerBtn.addEventListener('click', () => this.open());
        document.getElementById('close-sos').addEventListener('click', () => this.close());
        document.getElementById('dismiss-sos-success').addEventListener('click', () => this.close());
        
        const submitBtn = document.getElementById('submit-sos');
        submitBtn.addEventListener('click', () => this.submit());

        // Fake recording effect
        const recordBtn = document.getElementById('record-btn');
        recordBtn.addEventListener('mousedown', () => recordBtn.classList.add('recording'));
        recordBtn.addEventListener('mouseup', () => recordBtn.classList.remove('recording'));
        recordBtn.addEventListener('mouseleave', () => recordBtn.classList.remove('recording'));
    }

    open() {
        this.step1.classList.remove('hidden');
        this.step2.classList.add('hidden');
        this.textInput.value = '';
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
    }

    async submit() {
        const text = this.textInput.value.trim();
        if (!text) {
            alert("Please type or record a message first.");
            return;
        }

        const submitBtn = document.getElementById('submit-sos');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';

        // 1. Get Fake Location (near map center to ensure it shows clearly)
        const lat = MAP_CENTER[0] + (Math.random() - 0.5) * 0.005;
        const lng = MAP_CENTER[1] + (Math.random() - 0.5) * 0.005;

        // 2. Process with AI
        const aiAnalysis = await AIAnalyzer.processSignal(text);
        
        // 3. Add to store
        AlertStore.addAlert({
            location: { lat, lng },
            ...aiAnalysis
        });

        // 4. Show success screen
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Alert Now';
        this.step1.classList.add('hidden');
        this.step2.classList.remove('hidden');

        document.querySelector('.ai-insight-preview').innerHTML = `
            <strong>System Insight:</strong> Classified as <em>${aiAnalysis.type}</em>.<br>
            Priority Level: ${aiAnalysis.priority}/10
        `;
    }
}

// --- 7. Demo Generator ---
const runDemoLoad = async () => {
    const demoBtn = document.getElementById('demo-btn');
    demoBtn.disabled = true;
    demoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Simulating...';

    const scenarios = [
        "Massive fire breaking out on the 3rd floor near the elevators!",
        "Someone slipped on the wet floor near the pool and twisted their ankle",
        "Two guests are having a fist fight in the main lobby, they are very drunk",
        "There is a guy with a gun running towards the east entrance!",
        "Stuck in the elevator, it's getting hot in here"
    ];

    for (let i = 0; i < scenarios.length; i++) {
        setTimeout(async () => {
            const aiAnalysis = await AIAnalyzer.processSignal(scenarios[i]);
            
            const lat = MAP_CENTER[0] + (Math.random() - 0.5) * 0.01;
            const lng = MAP_CENTER[1] + (Math.random() - 0.5) * 0.01;
            
            AlertStore.addAlert({
                location: { lat, lng },
                ...aiAnalysis
            });
        }, i * 800); // Stagger them
    }

    setTimeout(() => {
        demoBtn.disabled = false;
        demoBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Demo Load';
    }, scenarios.length * 800 + 1500);
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    window.MapControllerInstance = new MapController();
    window.DashboardControllerInstance = new DashboardController();
    window.SOSControllerInstance = new SOSController();

    document.getElementById('demo-btn').addEventListener('click', runDemoLoad);
});
