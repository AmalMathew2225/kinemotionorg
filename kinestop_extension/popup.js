let currentSettings = {
    mode: 'stabilization',
    dotCount: 8,
    dotSize: 15,
    sensitivity: 2,
    color: '#00FFFF',
    laptopId: ''
};

const domStatus = document.getElementById('status-text');
const domLaptopId = document.getElementById('laptop-id');
const idContainer = document.getElementById('id-container');
const btnConnect = document.getElementById('btn-connect');

const inMode = document.getElementById('mode-select');
const inDotCount = document.getElementById('dot-count');
const valDotCount = document.getElementById('dot-count-val');
const inDotSize = document.getElementById('dot-size');
const valDotSize = document.getElementById('dot-size-val');

function syncUI() {
    inMode.value = currentSettings.mode;
    inDotCount.value = currentSettings.dotCount;
    valDotCount.innerText = currentSettings.dotCount;
    inDotSize.value = currentSettings.dotSize;
    valDotSize.innerText = currentSettings.dotSize;
}

// Load saved settings
chrome.storage.local.get(['settings', 'laptopId'], (res) => {
    if (res.settings) {
        Object.assign(currentSettings, res.settings);
    }
    if (res.laptopId) {
        currentSettings.laptopId = res.laptopId;
    }
    syncUI();
});

function updateSettings() {
    chrome.storage.local.set({ settings: currentSettings });
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: currentSettings });
}

inMode.addEventListener('change', (e) => { currentSettings.mode = e.target.value; updateSettings(); });
inDotCount.addEventListener('input', (e) => { currentSettings.dotCount = parseInt(e.target.value); valDotCount.innerText = e.target.value; updateSettings(); });
inDotSize.addEventListener('input', (e) => { currentSettings.dotSize = parseInt(e.target.value); valDotSize.innerText = e.target.value; updateSettings(); });

btnConnect.addEventListener('click', () => {
    if (!currentSettings.laptopId) {
        currentSettings.laptopId = Math.random().toString(36).substring(2, 6).toUpperCase();
        chrome.storage.local.set({ laptopId: currentSettings.laptopId });
    }
    domLaptopId.innerText = currentSettings.laptopId;
    idContainer.style.display = 'block';
    btnConnect.style.display = 'none';

    chrome.runtime.sendMessage({ type: 'START_CONNECTION', settings: currentSettings }, () => {
        domStatus.innerText = 'Waiting for phone...';
        domStatus.style.color = '#00FFFF';
    });
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATUS_UPDATE') {
        if (msg.status === 'connected') {
            domStatus.innerText = 'Connected to Phone!';
            domStatus.style.color = '#00FF9D';
        } else if (msg.status === 'waiting') {
            domStatus.innerText = 'Waiting for phone...';
            domStatus.style.color = '#00FFFF';
        } else if (msg.status === 'error') {
            domStatus.innerText = 'Connection Error';
            domStatus.style.color = '#ff4757';
        } else {
            domStatus.innerText = 'Disconnected (Using Mouse)';
            domStatus.style.color = '#888';
        }
    }
});
