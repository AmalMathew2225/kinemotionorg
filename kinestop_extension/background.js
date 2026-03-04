let offscreenDocumentUrl = chrome.runtime.getURL('offscreen.html');

async function createOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: offscreenDocumentUrl,
        reasons: ['WEB_RTC'],
        justification: 'Receive sensor streams via WebRTC to stabilize the screen'
    });
}

chrome.runtime.onStartup.addListener(createOffscreen);
chrome.runtime.onInstalled.addListener(createOffscreen);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_CONNECTION') {
        createOffscreen().then(() => {
            chrome.runtime.sendMessage({ target: 'offscreen', ...msg });
            sendResponse({ status: 'ok' });
        });
        return true;
    }

    if (msg.type === 'SENSOR_DATA') {
        chrome.tabs.query({ active: true }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, msg).catch(() => { });
            });
        });
    }

    if (msg.type === 'UPDATE_SETTINGS') {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, msg).catch(() => { });
            });
        });
        if (msg.settings && msg.settings.laptopId) {
            chrome.storage.local.set({ laptopId: msg.settings.laptopId });
        }
    }
});
