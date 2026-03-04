let peer = null;
let conn = null;

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.target !== 'offscreen') return;

    if (msg.type === 'START_CONNECTION') {
        if (peer) peer.destroy();

        peer = new Peer(msg.settings.laptopId, {
            debug: 3,
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
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'connected' });

            conn.on('data', (data) => {
                chrome.runtime.sendMessage({
                    type: 'SENSOR_DATA',
                    beta: data.b || 0,
                    gamma: data.g || 0,
                    alpha: data.a || 0
                });
            });

            conn.on('close', () => {
                chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'disconnected' });
            });
        });
    }
});
