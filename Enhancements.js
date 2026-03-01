// ============================================================================
// Enhancements.js - Quality of life improvements and optimizations
// ============================================================================

// ══════════════════════════════════════════════════════════════════════════
// LOADING SCREEN SYSTEM
// ══════════════════════════════════════════════════════════════════════════

let loadingScreen = null;

function showLoadingScreen() {
    if (loadingScreen) return; // Already showing
    
    loadingScreen = document.createElement('div');
    loadingScreen.id = 'game-loader';
    loadingScreen.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: linear-gradient(135deg, #0a0e27 0%, #1a1a2e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', sans-serif;
        transition: opacity 0.5s ease;
    `;
    
    loadingScreen.innerHTML = `
        <div style="text-align: center; max-width: 400px;">
            <h1 style="
                font-size: 48px;
                font-weight: 900;
                color: #e67e22;
                text-shadow: 0 0 20px rgba(230, 126, 34, 0.5);
                margin-bottom: 40px;
                letter-spacing: 4px;
            ">KARLO'S TD</h1>
            
            <div style="
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 20px;
            ">
                <div id="loader-progress" style="
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #e67e22, #f39c12);
                    transition: width 0.3s ease;
                    box-shadow: 0 0 10px rgba(230, 126, 34, 0.5);
                "></div>
            </div>
            
            <p id="load-status" style="
                color: rgba(255,255,255,0.6);
                font-size: 14px;
                letter-spacing: 2px;
            ">Initializing...</p>
        </div>
    `;
    
    document.body.appendChild(loadingScreen);
}

function updateLoadingProgress(percent, status) {
    const progressBar = document.getElementById('loader-progress');
    const statusText = document.getElementById('load-status');
    
    if (progressBar) progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    if (statusText) statusText.textContent = status || 'Loading...';
}

function hideLoadingScreen() {
    if (!loadingScreen) return;
    
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        if (loadingScreen && loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
        }
        loadingScreen = null;
    }, 500);
}

// ══════════════════════════════════════════════════════════════════════════
// MULTIPLAYER RECONNECTION SYSTEM
//
// Two scenarios handled:
//   1. Socket drops while tab is still open → styled popup with countdown,
//      auto-retries up to MAX_RECONNECT times, Cancel button to give up.
//   2. Page refresh / tab reopen mid-game → on load, if sessionStorage has a
//      recent room ID saved (< 5 min), show a "Rejoin?" prompt.
//
// Room state is persisted to sessionStorage on roomCreated/joinRoom and
// cleared on intentional leave/game-over so stale prompts don't appear.
// ══════════════════════════════════════════════════════════════════════════

const _RC_KEY   = 'karlos_td_reconnect';   // sessionStorage key
const MAX_RECONNECT = 5;

let _rcAttempts = 0;
let _rcTimeout  = null;
let _rcPopupEl  = null;
let _rcCountdownTimer = null;

// ── Persist / clear room state ─────────────────────────────────────────────

function _saveRoomState() {
    try {
        const state = {
            roomId:      (typeof myRoomId       !== 'undefined') ? myRoomId       : null,
            role:        (typeof myRole         !== 'undefined') ? myRole         : null,
            mapIndex:    (typeof selectedMapIndex !== 'undefined') ? selectedMapIndex : 0,
            difficulty:  (typeof currentDifficulty !== 'undefined') ? currentDifficulty : 'easy',
            ts:          Date.now()
        };
        if (state.roomId) sessionStorage.setItem(_RC_KEY, JSON.stringify(state));
    } catch(e) {}
}

function _clearRoomState() {
    try { sessionStorage.removeItem(_RC_KEY); } catch(e) {}
}

function _loadRoomState() {
    try {
        const raw = sessionStorage.getItem(_RC_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        // Only valid within 5 minutes
        if (Date.now() - s.ts > 5 * 60 * 1000) { _clearRoomState(); return null; }
        return s;
    } catch(e) { return null; }
}

// ── Reconnect popup (scenario 1 — socket drop, tab still open) ────────────

function _showReconnectPopup(attempt) {
    _closeReconnectPopup();

    const el = document.createElement('div');
    el.id = 'rc-popup';
    el.style.cssText = `
        position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
        z-index:700000;
        width:min(380px,90vw);
        background:linear-gradient(155deg,rgba(8,10,24,0.98),rgba(4,6,16,1));
        border:1px solid rgba(255,255,255,0.07);
        border-left:3px solid #e67e22;
        border-radius:12px;
        padding:18px 20px;
        font-family:'Orbitron',sans-serif;
        box-shadow:0 12px 40px rgba(0,0,0,0.85);
        display:flex;align-items:center;gap:14px;
        animation:rc-slide-up 0.25s cubic-bezier(0.34,1.4,0.64,1);
    `;

    // Inject keyframes once
    if (!document.getElementById('rc-keyframes')) {
        const s = document.createElement('style');
        s.id = 'rc-keyframes';
        s.textContent = `
            @keyframes rc-slide-up {
                from { opacity:0; transform:translateX(-50%) translateY(20px); }
                to   { opacity:1; transform:translateX(-50%) translateY(0); }
            }
            @keyframes rc-spin {
                to { transform:rotate(360deg); }
            }
        `;
        document.head.appendChild(s);
    }

    el.innerHTML = `
        <div style="font-size:22px;color:#e67e22;flex-shrink:0;
            animation:rc-spin 1s linear infinite;">
            <i class="fa-solid fa-arrows-rotate"></i>
        </div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:10px;font-weight:900;letter-spacing:3px;color:#fff;margin-bottom:4px">
                RECONNECTING
            </div>
            <div id="rc-status" style="font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,0.4)">
                Attempt ${attempt} of ${MAX_RECONNECT}...
            </div>
        </div>
        <button onclick="window._rcCancel()" style="
            background:none;border:1px solid rgba(255,255,255,0.1);
            border-radius:6px;padding:6px 12px;
            font-family:'Orbitron',sans-serif;font-size:8px;
            font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.35);
            cursor:pointer;white-space:nowrap;flex-shrink:0;
        ">CANCEL</button>
    `;

    document.body.appendChild(el);
    _rcPopupEl = el;
}

function _updateReconnectStatus(msg) {
    const el = document.getElementById('rc-status');
    if (el) el.textContent = msg;
}

function _closeReconnectPopup() {
    if (_rcCountdownTimer) { clearInterval(_rcCountdownTimer); _rcCountdownTimer = null; }
    if (_rcPopupEl) {
        _rcPopupEl.style.transition = 'opacity 0.2s ease';
        _rcPopupEl.style.opacity = '0';
        setTimeout(() => { if (_rcPopupEl) { _rcPopupEl.remove(); _rcPopupEl = null; } }, 220);
    }
}

function _showReconnectSuccess() {
    _closeReconnectPopup();
    if (typeof showToast === 'function') {
        showToast('✅ Reconnected!', 'success', 2500);
    }
}

function _showReconnectFailed() {
    _closeReconnectPopup();
    if (typeof kAlert === 'function') {
        kAlert('CONNECTION LOST', 'Could not reconnect to the server. Please reload the page.',
               { icon: '<i class="fa-solid fa-plug-circle-xmark"></i>', danger: true });
    }
    _clearRoomState();
}

window._rcCancel = function() {
    _rcAttempts = MAX_RECONNECT; // prevent further retries
    if (_rcTimeout) { clearTimeout(_rcTimeout); _rcTimeout = null; }
    _closeReconnectPopup();
    _clearRoomState();
    // Go back to main menu
    if (typeof goToMainMenu === 'function') goToMainMenu();
};

// ── Core reconnect logic ───────────────────────────────────────────────────

function setupReconnectionLogic() {
    if (typeof socket === 'undefined' || !socket) return;

    // Save room state so a refresh can offer rejoin
    _saveRoomState();

    socket.on('disconnect', (reason) => {
        console.warn('Disconnected:', reason);

        if (reason === 'io client disconnect') {
            // Intentional — clear saved state
            _rcAttempts = 0;
            _clearRoomState();
            return;
        }

        _rcAttempts = 0;
        _attemptReconnect();
    });

    socket.on('connect', () => {
        console.log('Reconnected to server');
        const wasReconnecting = _rcAttempts > 0;
        _rcAttempts = 0;
        if (_rcTimeout) { clearTimeout(_rcTimeout); _rcTimeout = null; }

        if (wasReconnecting) {
            _showReconnectSuccess();
            // Re-emit rejoin so server puts us back in the room
            const state = _loadRoomState();
            if (state && state.roomId) {
                socket.emit('rejoin', { roomId: state.roomId, role: state.role });
            }
        }

        // Refresh saved state with new socket
        _saveRoomState();
    });

    if (socket.io) {
        socket.io.on('reconnect_failed', _showReconnectFailed);
    }
}

function _attemptReconnect() {
    if (_rcAttempts >= MAX_RECONNECT) {
        _showReconnectFailed();
        return;
    }

    _rcAttempts++;
    const delay = Math.min(2000 * _rcAttempts, 10000);

    _showReconnectPopup(_rcAttempts);

    // Countdown in the popup
    let remaining = Math.ceil(delay / 1000);
    _updateReconnectStatus(`Attempt ${_rcAttempts} of ${MAX_RECONNECT} — retrying in ${remaining}s`);
    if (_rcCountdownTimer) clearInterval(_rcCountdownTimer);
    _rcCountdownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(_rcCountdownTimer);
            _updateReconnectStatus(`Attempting to reconnect...`);
        } else {
            _updateReconnectStatus(`Attempt ${_rcAttempts} of ${MAX_RECONNECT} — retrying in ${remaining}s`);
        }
    }, 1000);

    _rcTimeout = setTimeout(() => {
        if (typeof socket !== 'undefined' && socket && !socket.connected) {
            try { socket.connect(); }
            catch(e) {
                console.warn('socket.connect() failed:', e);
                _attemptReconnect();
            }
        }
    }, delay);
}

// ── Scenario 2: page refresh / reopen — check for saved room on load ────────

function checkForRejoinOnLoad() {
    const state = _loadRoomState();
    if (!state || !state.roomId) return;

    // Don't prompt if already in a game
    if (typeof gameRunning !== 'undefined' && gameRunning) return;
    if (typeof myRoomId !== 'undefined' && myRoomId) return;

    // Small delay so the UI is ready
    setTimeout(() => _showRejoinPrompt(state), 1200);
}

function _showRejoinPrompt(state) {
    if (document.getElementById('rejoin-popup')) return; // already showing

    const el = document.createElement('div');
    el.id = 'rejoin-popup';
    el.style.cssText = `
        position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
        z-index:700000;
        width:min(420px,92vw);
        background:linear-gradient(155deg,rgba(8,10,24,0.98),rgba(4,6,16,1));
        border:1px solid rgba(255,255,255,0.07);
        border-left:3px solid #3498db;
        border-radius:12px;
        padding:18px 20px;
        font-family:'Orbitron',sans-serif;
        box-shadow:0 12px 40px rgba(0,0,0,0.85);
        display:flex;align-items:center;gap:14px;
        animation:rc-slide-up 0.3s cubic-bezier(0.34,1.4,0.64,1);
    `;

    const mapName = (typeof MAPS !== 'undefined' && MAPS[state.mapIndex])
        ? MAPS[state.mapIndex].name : 'Unknown Map';

    el.innerHTML = `
        <div style="font-size:22px;color:#3498db;flex-shrink:0">
            <i class="fa-solid fa-rotate-left"></i>
        </div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:10px;font-weight:900;letter-spacing:3px;color:#fff;margin-bottom:4px">
                REJOIN GAME?
            </div>
            <div style="font-size:9px;letter-spacing:1px;color:rgba(255,255,255,0.38);text-transform:uppercase">
                ${mapName} · ${(state.difficulty||'').toUpperCase()} · ${(state.role||'').toUpperCase()}
            </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
            <button onclick="window._rejoinDecline()" style="
                background:none;border:1px solid rgba(255,255,255,0.1);
                border-radius:6px;padding:7px 12px;
                font-family:'Orbitron',sans-serif;font-size:8px;
                font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.3);cursor:pointer;
            ">NO</button>
            <button onclick="window._rejoinAccept()" style="
                background:rgba(52,152,219,0.12);border:1px solid rgba(52,152,219,0.35);
                border-radius:6px;padding:7px 14px;
                font-family:'Orbitron',sans-serif;font-size:8px;
                font-weight:900;letter-spacing:2px;color:#3498db;cursor:pointer;
            ">REJOIN</button>
        </div>
    `;

    document.body.appendChild(el);

    // Auto-dismiss after 15s
    setTimeout(() => {
        if (document.getElementById('rejoin-popup')) window._rejoinDecline();
    }, 15000);
}

window._rejoinAccept = function() {
    const el = document.getElementById('rejoin-popup');
    if (el) el.remove();

    const state = _loadRoomState();
    if (!state || !state.roomId) return;

    // Reconnect to server then emit rejoin
    const doRejoin = async () => {
        if (typeof showToast === 'function') showToast('Connecting to server...', 'info', 3000);

        let connected = (typeof socket !== 'undefined' && socket && socket.connected);
        if (!connected && typeof connectToServerWithFailover === 'function') {
            connected = await connectToServerWithFailover();
        }
        if (!connected) {
            if (typeof showToast === 'function') showToast('Could not reach server.', 'error', 3000);
            _clearRoomState();
            return;
        }

        socket.emit('rejoin', { roomId: state.roomId, role: state.role });
        if (typeof showToast === 'function') showToast('Rejoining room...', 'info', 2000);
    };

    doRejoin();
};

window._rejoinDecline = function() {
    const el = document.getElementById('rejoin-popup');
    if (el) {
        el.style.transition = 'opacity 0.2s ease';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 220);
    }
    _clearRoomState();
};

// ══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING UTILITIES
// ══════════════════════════════════════════════════════════════════════════

class ErrorHandler {
    static handle(error, context) {
        console.error(`[${context}]`, error);
        
        // Log to analytics if available
        if (typeof gtag !== 'undefined') {
            try {
                gtag('event', 'exception', {
                    description: `${context}: ${error.message}`,
                    fatal: false
                });
            } catch (e) {}
        }
        
        // Show user-friendly message
        const message = this.getUserMessage(error, context);
        if (typeof showLocalError === 'function') {
            showLocalError(message, '#e74c3c');
        }
    }
    
    static getUserMessage(error, context) {
        const msg = error.message || error.toString();
        
        // Socket/Connection errors
        if (msg.includes('socket') || msg.includes('disconnect') || context.includes('Socket')) {
            return 'Connection lost. Check your internet.';
        }
        
        // Storage errors
        if (msg.includes('localStorage') || msg.includes('quota') || context.includes('Storage')) {
            return 'Storage is full. Clear browser data.';
        }
        
        // Tower/Game errors
        if (context.includes('Tower') || context.includes('Enemy')) {
            return 'Game error. Try refreshing the page.';
        }
        
        // Generic fallback
        return 'Something went wrong. Please try again.';
    }
}

// ══════════════════════════════════════════════════════════════════════════
// TOWER UPGRADE VALIDATION
// ══════════════════════════════════════════════════════════════════════════

function getTowerUpgrade(towerType, branch) {
    // Safe access to TOWER_UPGRADES with validation
    if (typeof TOWER_UPGRADES === 'undefined') {
        console.error('TOWER_UPGRADES not loaded');
        return null;
    }
    
    if (!TOWER_UPGRADES[towerType]) {
        console.warn(`No upgrades defined for tower type: ${towerType}`);
        return null;
    }
    
    if (!TOWER_UPGRADES[towerType][branch]) {
        console.warn(`No ${branch} upgrade path for tower: ${towerType}`);
        return null;
    }
    
    return TOWER_UPGRADES[towerType][branch];
}

// ══════════════════════════════════════════════════════════════════════════
// PERFORMANCE MONITORING
// ══════════════════════════════════════════════════════════════════════════

class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.fps = 60;
        this.lastTime = performance.now();
        this.fpsHistory = [];
        this.warnings = [];
    }
    
    update() {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastTime;
        
        // Update FPS every second
        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.fpsHistory.push(this.fps);
            
            // Keep only last 60 seconds
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
            }
            
            // Check for performance issues
            this.checkPerformance();
            
            this.frameCount = 0;
            this.lastTime = now;
        }
    }
    
    checkPerformance() {
        // Warn if FPS drops below 30 for 3 consecutive seconds
        if (this.fpsHistory.length >= 3) {
            const recent = this.fpsHistory.slice(-3);
            const allLow = recent.every(fps => fps < 30);
            
            if (allLow && !this.warnings.includes('low_fps')) {
                console.warn('⚠️ Low FPS detected. Consider lowering graphics settings.');
                this.warnings.push('low_fps');
                
                // Suggest lowering graphics
                if (typeof showLocalError === 'function' && typeof graphicsMode !== 'undefined' && graphicsMode > 0) {
                    showLocalError('Low FPS detected. Lower graphics in settings?', '#e67e22');
                }
            }
        }
        
        // Check memory usage if available
        if (performance.memory) {
            const usedMB = performance.memory.usedJSHeapSize / 1048576;
            const limitMB = performance.memory.jsHeapSizeLimit / 1048576;
            const usage = (usedMB / limitMB) * 100;
            
            if (usage > 90 && !this.warnings.includes('high_memory')) {
                console.warn(`⚠️ High memory usage: ${usedMB.toFixed(0)}MB / ${limitMB.toFixed(0)}MB`);
                this.warnings.push('high_memory');
            }
        }
    }
    
    getFPS() {
        return this.fps;
    }
    
    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 60;
        return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    }
}

// Global instance
let perfMonitor = null;

function initPerformanceMonitor() {
    if (!perfMonitor) {
        perfMonitor = new PerformanceMonitor();
    }
}

function updatePerformanceMonitor() {
    if (perfMonitor) {
        perfMonitor.update();
    }
}

// ══════════════════════════════════════════════════════════════════════════
// TUTORIAL SYSTEM (Basic Framework)
// ══════════════════════════════════════════════════════════════════════════

const TUTORIAL_KEY = 'karlos_td_tutorial_completed';

function shouldShowTutorial() {
    try {
        return !localStorage.getItem(TUTORIAL_KEY);
    } catch (e) {
        return false; // If localStorage fails, skip tutorial
    }
}

function completeTutorial() {
    try {
        localStorage.setItem(TUTORIAL_KEY, 'true');
    } catch (e) {
        console.warn('Could not save tutorial completion');
    }
}

function showTutorial() {
    if (!shouldShowTutorial()) return;
    
    // Simple first-time hint overlay
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 500000;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', sans-serif;
        backdrop-filter: blur(5px);
    `;
    
    overlay.innerHTML = `
        <div style="
            max-width: 500px;
            padding: 40px;
            background: linear-gradient(135deg, #1a1a2e, #0a0e27);
            border-radius: 16px;
            border: 2px solid rgba(230, 126, 34, 0.3);
            text-align: center;
        ">
            <h2 style="
                color: #e67e22;
                font-size: 32px;
                margin-bottom: 20px;
                text-shadow: 0 0 10px rgba(230, 126, 34, 0.5);
            ">WELCOME TO KARLO'S TD!</h2>
            
            <p style="color: rgba(255,255,255,0.7); line-height: 1.8; margin-bottom: 30px;">
                <strong style="color: #fff;">Quick Tips:</strong><br><br>
                • Use <span style="color: #e67e22;">number keys (1-0)</span> to place towers<br>
                • Click towers to <span style="color: #3498db;">upgrade</span> them<br>
                • Defeat <span style="color: #2ecc71;">20 waves</span> to win<br>
                • Earn <span style="color: #f1c40f;">XP & Scraps</span> to unlock more towers
            </p>
            
            <button onclick="closeTutorial()" style="
                padding: 15px 40px;
                background: linear-gradient(135deg, #e67e22, #f39c12);
                border: none;
                border-radius: 8px;
                color: white;
                font-family: 'Orbitron', sans-serif;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(230, 126, 34, 0.4);
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                GOT IT! LET'S PLAY
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function closeTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }
    completeTutorial();
}

// ══════════════════════════════════════════════════════════════════════════
// ANALYTICS TRACKING (Optional)
// ══════════════════════════════════════════════════════════════════════════

class GameAnalytics {
    static trackEvent(category, action, label, value) {
        // Send to Google Analytics if available
        if (typeof gtag !== 'undefined') {
            try {
                gtag('event', action, {
                    event_category: category,
                    event_label: label,
                    value: value
                });
            } catch (e) {
                console.warn('Analytics tracking failed:', e);
            }
        }
    }
    
    static trackGameStart(difficulty, map) {
        this.trackEvent('Game', 'Start', `${difficulty} - ${map}`);
    }
    
    static trackGameEnd(waves, difficulty, victory) {
        this.trackEvent('Game', victory ? 'Victory' : 'Defeat', difficulty, waves);
    }
    
    static trackTowerPlaced(type) {
        this.trackEvent('Tower', 'Placed', type);
    }
    
    static trackTowerUpgraded(type, tier) {
        this.trackEvent('Tower', 'Upgraded', type, tier);
    }
    
    static trackSkinUnlocked(skinId) {
        this.trackEvent('Locker', 'Skin_Unlocked', skinId);
    }
}

// ══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════

console.log('✅ Enhancements.js loaded - Quality of life improvements active');
