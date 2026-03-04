let peer = null;
let conn = null;

// --- DOM Setup ---
const canvas = document.createElement('canvas');
canvas.id = 'kinestop-extension-canvas';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
canvas.style.pointerEvents = 'none'; // Click through the canvas
canvas.style.zIndex = '2147483647'; // Maximum z-index
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

// --- State ---
let width = window.innerWidth;
let height = window.innerHeight;
let dots = [];
let targetShiftX = 0;
let targetShiftY = 0;
let lastPacketTime = 0;

let currentSettings = {
    mode: 'stabilization',
    dotCount: 8,
    dotSize: 15,
    sensitivity: 2,
    color: '#00FFFF', // Default cyan glow
    connectedPhoneId: null
};

let sensorData = { beta: 0, gamma: 0, alpha: 0 };

// --- Logic ---
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initDots();
}
window.addEventListener('resize', resize);

class Dot {
    constructor(baseX, baseY) {
        this.baseX = baseX;
        this.baseY = baseY;
        this.x = baseX;
        this.y = baseY;
    }

    update(shiftX, shiftY, time) {
        let tX = this.baseX;
        let tY = this.baseY;

        if (currentSettings.mode === 'stabilization') {
            tX += shiftX;
            tY += shiftY;
        } else if (currentSettings.mode === 'counter') {
            tX -= shiftX;
            tY -= shiftY;
        } else if (currentSettings.mode === 'neutral') {
            tX += Math.sin(time * 0.002 + this.baseX) * 10;
            tY += Math.cos(time * 0.002 + this.baseY) * 10;
        }

        this.x += (tX - this.x) * 0.15;
        this.y += (tY - this.y) * 0.15;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSettings.dotSize, 0, Math.PI * 2);
        ctx.fillStyle = currentSettings.color;
        ctx.shadowBlur = currentSettings.dotSize * 1.5;
        ctx.shadowColor = currentSettings.color;
        ctx.fill();
        ctx.closePath();
    }
}

function initDots() {
    dots = [];
    const cols = Math.ceil(Math.sqrt(currentSettings.dotCount * (width / height)));
    const rows = Math.ceil(currentSettings.dotCount / cols);
    const paddingX = width * 0.1;
    const paddingY = height * 0.1;
    const spacingX = (width - paddingX * 2) / Math.max(1, cols - 1);
    const spacingY = (height - paddingY * 2) / Math.max(1, rows - 1);

    let created = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (created >= currentSettings.dotCount) break;
            const x = paddingX + (c * spacingX);
            const y = paddingY + (r * spacingY);
            dots.push(new Dot(x, y));
            created++;
        }
    }
}

document.addEventListener('mousemove', (e) => {
    if (!isConnected) {
        // Subtle tilt mapped to mouse movement
        const maxTilt = 20;
        const normalizedX = (e.clientX / width) * 2 - 1; // -1 to +1
        const normalizedY = (e.clientY / height) * 2 - 1; // -1 to +1

        // Simulating the phone sensor: beta=tilt up/down, gamma=tilt left/right
        sensorData.gamma = normalizedX * maxTilt;
        sensorData.beta = normalizedY * maxTilt;
        mouseX = e.clientX;
        mouseY = e.clientY;
    }
});

function render(time) {
    ctx.clearRect(0, 0, width, height);

    const sensMult = currentSettings.sensitivity * 5;
    let rawShiftX = sensorData.gamma * sensMult;
    let rawShiftY = sensorData.beta * sensMult;

    const maxShift = Math.min(width, height) * 0.4;
    rawShiftX = Math.max(-maxShift, Math.min(maxShift, rawShiftX));
    rawShiftY = Math.max(-maxShift, Math.min(maxShift, rawShiftY));

    targetShiftX += (rawShiftX - targetShiftX) * 0.2;
    targetShiftY += (rawShiftY - targetShiftY) * 0.2;

    dots.forEach(dot => {
        dot.update(targetShiftX, targetShiftY, time);
        dot.draw();
    });

    if (!isConnected) {
        sensorData.gamma *= 0.98;
        sensorData.beta *= 0.98;
    }

    requestAnimationFrame(render);
}

// --- Communication ---
function initPeerJS(myId) {
    if (peer) peer.destroy();

    peer = new Peer(myId, {
        debug: 1,
        config: {
            'iceServers': [
                { url: 'stun:stun.l.google.com:19302' },
                { url: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('error', (err) => {
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'error', error: err.type });
    });

    peer.on('open', (id) => {
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'waiting', myId: id });
    });

    peer.on('connection', (connection) => {
        conn = connection;
        isConnected = true; // Set connected status
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'connected' });

        conn.on('data', (data) => {
            sensorData.beta = data.b || 0;
            sensorData.gamma = data.g || 0;
            sensorData.alpha = data.a || 0;
        });

        conn.on('close', () => {
            isConnected = false; // Set disconnected status
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'disconnected' });
        });
    });
}

// --- Message Handling ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_CONNECTION') {
        const myId = request.settings.laptopId || Math.random().toString(36).substring(2, 6).toUpperCase();

        // Save ID for persistence across tabs
        chrome.storage.local.set({ laptopId: myId });

        Object.assign(currentSettings, request.settings);
        initDots();
        initPeerJS(myId);
        sendResponse({ status: "started", myId: myId });
    } else if (request.type === 'UPDATE_SETTINGS') {
        Object.assign(currentSettings, request.settings);
        initDots();
        sendResponse({ status: "updated" });
    } else if (request.type === 'GET_STATUS') {
        sendResponse({
            status: conn && conn.open ? 'connected' : (peer && !peer.destroyed ? 'waiting' : 'disconnected'),
            myId: peer ? peer.id : null
        });
    } else if (request.type === 'SENSOR_DATA') { // New message type for direct sensor data (e.g., from popup)
        isConnected = true;
        sensorData.beta = request.beta;
        sensorData.gamma = request.gamma;
        sensorData.alpha = request.alpha;
    }
});

chrome.storage.local.get(['settings'], (res) => {
    if (res.settings) {
        Object.assign(currentSettings, res.settings);
    }
    initDots();
});

resize();
requestAnimationFrame(render);
