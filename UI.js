// ============================================================================
// UI.js - All DOM manipulation, menus, event listeners, and UI helpers
// ============================================================================

// --- GameJolt Functions + Map Editor UI ---
window.initGameJolt = function() {
    console.log('🎮 Initializing Game Jolt API...');
    
    // Check if GJAPI is loaded
    if (typeof GJAPI === 'undefined') {
        console.warn('⚠️ Game Jolt API not loaded. Skipping initialization.');
        return;
    }

    // Initialize with credentials
    GJAPI.init(GAMEJOLT_GAME_ID, GAMEJOLT_PRIVATE_KEY, '1.0', function(result) {
        if (result === 'SUCCESS') {
            console.log('✅ Game Jolt API initialized successfully');
            
            // Auto-login if user is on Game Jolt
            GJAPI.GetAutoLogin(function(username, token) {
                if (username && token) {
                    GJAPI.VerifyUser(username, token, function(loginResult) {
                        if (loginResult === 'SUCCESS') {
                            console.log(`✅ Logged in as: ${username}`);
                            window.GJAPI.bLoggedIn = true;
                            window.GJAPI.username = username;
                            
                            // Sync local achievements with Game Jolt
                            syncAchievementsToGameJolt();
                        } else {
                            console.log('⚠️ Auto-login failed');
                        }
                    });
                } else {
                    console.log('ℹ️ No auto-login available');
                }
            });
        } else {
            console.error('❌ Game Jolt API initialization failed');
        }
    });
};

// ============================================================================
// PART 2: TROPHY BRIDGE (Achievement Sync)
// ============================================================================

window.unlockTrophy = function(trophyID) {
    console.log(`🏆 Unlocking trophy: ${trophyID}`);
    
    // 1. Save locally
    const localTrophies = JSON.parse(localStorage.getItem('unlockedTrophies') || '[]');
    if (!localTrophies.includes(trophyID)) {
        localTrophies.push(trophyID);
        localStorage.setItem('unlockedTrophies', JSON.stringify(localTrophies));
    }

    // 2. Show visual popup (handled by progression.js showAchievementPopup)
    console.log(`✅ Trophy ${trophyID} saved locally`);

    // 3. Sync to Game Jolt (if logged in)
    if (window.GJAPI && window.GJAPI.bLoggedIn) {
        GJAPI.TrophyAchieve(trophyID, function(result) {
            if (result === 'SUCCESS') {
                console.log(`✅ Trophy ${trophyID} synced to Game Jolt`);
            } else {
                console.warn(`⚠️ Failed to sync trophy ${trophyID} to Game Jolt`);
            }
        });
    } else {
        console.log('ℹ️ Not logged into Game Jolt, trophy saved locally only');
    }
};

// ============================================================================
// PART 3: SYNC LOCAL ACHIEVEMENTS TO GAME JOLT
// ============================================================================

window.syncAchievementsToGameJolt = function() {
    if (!window.GJAPI || !window.GJAPI.bLoggedIn) {
        console.log('ℹ️ Cannot sync - not logged into Game Jolt');
        return;
    }

    console.log('🔄 Syncing local achievements to Game Jolt...');

    const localTrophies = JSON.parse(localStorage.getItem('unlockedTrophies') || '[]');
    const unlockedAchievements = window.unlockedAchievements || [];

    // Combine both sources
    const allUnlocked = [...new Set([...localTrophies, ...unlockedAchievements])];

    let syncCount = 0;
    allUnlocked.forEach(trophyID => {
        GJAPI.TrophyAchieve(trophyID, function(result) {
            if (result === 'SUCCESS') {
                syncCount++;
                console.log(`✅ Synced: ${trophyID}`);
            }
        });
    });

    console.log(`🔄 Synced ${syncCount} achievements to Game Jolt`);
};

// ============================================================================
// MAP EDITOR UI FUNCTIONS
// ============================================================================

function setEditorTool(tool) {
    if (!mapEditorState) return;
    mapEditorState.currentTool = tool;
    
    // Update button states
    document.querySelectorAll('.editor-toolbar button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('btn-editor-' + tool).classList.add('active');
    
    console.log('🛠️ Tool:', tool);
}

function toggleSymmetry() {
    if (!mapEditorState) return;
    mapEditorState.symmetryMode = !mapEditorState.symmetryMode;
    
    const btn = document.getElementById('btn-symmetry');
    btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> SYMMETRY: ' + (mapEditorState.symmetryMode ? 'ON' : 'OFF');
    btn.classList.toggle('active', mapEditorState.symmetryMode);
    
    updateInfoPanel();
}

function selectDecoration(type) {
    if (!mapEditorState) return;
    mapEditorState.selectedDecoration = type;
    mapEditorState.currentTool = 'decoration';
    
    // Update UI
    document.querySelectorAll('.deco-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    console.log('🌳 Selected decoration:', type);
}

function updateMapName(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.name = value;
}

function updateBgColor(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.bgColor = value;
    scene.background = new THREE.Color(value);
}

function updateFloorColor(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.floorColor = value;
    // Update floor mesh color if exists
}

function updateTrackColor(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.trackColor = value;
    mapEditorState.rebuildVisuals();
}

function updateParticleColor(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.particleColor = value;
}

function updateParticleDensity(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.particleDensity = value / 100;
    document.getElementById('value-particle-density').textContent = value + '%';
}

function updateParticleSpeed(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.particleSpeed = value / 100;
    document.getElementById('value-particle-speed').textContent = value + '%';
}

function updateFogColor(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.fogColor = value;
}

function updateFogDensity(value) {
    if (!mapEditorState) return;
    mapEditorState.mapData.settings.fogDensity = value / 100;
    document.getElementById('value-fog-density').textContent = value + '%';
}

function updateInfoPanel() {
    if (!mapEditorState) return;
    
    document.getElementById('info-path-length').textContent = mapEditorState.mapData.path.length;
    document.getElementById('info-deco-count').textContent = mapEditorState.mapData.decorations.length;
    document.getElementById('info-symmetry').textContent = mapEditorState.symmetryMode ? 'ON' : 'OFF';
    
    const validation = MapValidator.validate(mapEditorState.mapData);
    document.getElementById('info-valid').innerHTML = validation.valid ? '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i>' : '<i class="fa-solid fa-circle-xmark" style="color:#e74c3c"></i>';
}

function clearAllMap() {
    if (!mapEditorState) return;
    
    if (!confirm('️ Clear entire map? This cannot be undone!')) return;
    
    mapEditorState.mapData.path = [];
    mapEditorState.mapData.decorations = [];
    mapEditorState.pathHead = null;
    mapEditorState.undoStack = [];
    mapEditorState.redoStack = [];
    mapEditorState.rebuildVisuals();
    updateInfoPanel();
}

function testMap() {
    const gameMap = testCustomMap();
    if (gameMap) {
        // Hide editor UI
        document.getElementById('map-editor-ui').classList.remove('active');
        
        // TODO: Start game with custom map
        alert(' Map valid! Ready to test.\n\n(Integration with startGame() needed)');
    }
}

function saveMap() {
    if (!mapEditorState) return;
    
    const slot = prompt('Enter save slot name:', 'my_map_' + Date.now());
    if (!slot) return;
    
    const success = MapStorage.saveMap(mapEditorState.mapData, slot);
    if (success) {
        alert(' Map saved to slot: ' + slot);
    }
}

function loadMap() {
    if (!mapEditorState) return;
    
    const slot = prompt('Enter save slot name to load:');
    if (!slot) return;
    
    const mapData = MapStorage.loadMap(slot);
    if (mapData) {
        mapEditorState.mapData = mapData;
        mapEditorState.rebuildVisuals();
        updateInfoPanel();
        alert(' Map loaded from slot: ' + slot);
    } else {
        alert(' No map found in slot: ' + slot);
    }
}

function shareMap() {
    if (!mapEditorState) return;
    
    const code = MapValidator.generateShareCode(mapEditorState.mapData);
    document.getElementById('share-code-input').value = code;
    document.getElementById('share-modal').classList.add('active');
}

function copyShareCode() {
    const input = document.getElementById('share-code-input');
    input.select();
    document.execCommand('copy');
    alert(' Share code copied to clipboard!');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.remove('active');
}

function loadFromCode() {
    const code = document.getElementById('load-code-input').value.trim();
    if (!code) return;
    
    const mapData = MapValidator.loadFromShareCode(code);
    if (mapData) {
        mapEditorState.mapData = mapData;
        mapEditorState.rebuildVisuals();
        updateInfoPanel();
        closeLoadModal();
        alert(' Map loaded from share code!');
    } else {
        alert(' Invalid share code!');
    }
}

function closeLoadModal() {
    document.getElementById('load-modal').classList.remove('active');
}

function exitEditor() {
    if (!confirm('Exit editor? Unsaved changes will be lost.')) return;
    
    // Auto-save
    MapStorage.saveMap(mapEditorState.mapData, 'autosave');
    
    // Hide editor UI
    document.getElementById('map-editor-ui').classList.remove('active');
    mapEditorState.isActive = false;
    
    // TODO: Return to main menu
    goToMainMenu();
}

function toggleShortcutsHelp() {
    const panel = document.getElementById('shortcuts-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Auto-update info panel
setInterval(() => {
    if (mapEditorState && mapEditorState.isActive) {
        updateInfoPanel();
    }
}, 500);

// --- CrazyGames SDK + Ad + Return-to-menu functions ---
        let crazygamesSDK = null;
        let isSDKReady = false;
        let gameLoadingComplete = false;
        
        /**
         * CRITICAL QA METRIC #1: Initialize SDK and START loading timer
         * This IIFE runs IMMEDIATELY when the script executes
         */
        // ==========================================
// 🎮 KARLOS TD - CRAZYGAMES SDK INTEGRATION
// ==========================================

async function initCrazyGamesSDK() {
    console.log("⏳ Initializing CrazyGames SDK...");

    try {
        // 1. Wait for SDK to be ready
        if (!window.CrazyGames || !window.CrazyGames.SDK) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (window.CrazyGames && window.CrazyGames.SDK) {
            const sdk = window.CrazyGames.SDK;
            
            // Initialize the SDK
            await sdk.init();
            console.log("🎉 SDK Initialized. Environment:", sdk.environment);

            // Tell CrazyGames we started loading
            sdk.game.sdkGameLoadingStart();
            console.log("📊 Loading metrics started");

            // Since you have no loading screen, wait a moment and then report ready
            setTimeout(() => {
                sdk.game.sdkGameLoadingStop();
                console.log("✅ Game Ready - Loading Complete (Time to Interactive reported)");
            }, 1000);
            
            // Store SDK reference globally for invite link
            crazygamesSDK = sdk;
            isSDKReady = true;
        } else {
            console.log("⚠️ CrazyGames SDK not available - running in offline/dev mode");
        }

    } catch (e) {
        console.error("❌ SDK Init Failed:", e);
        console.log("⚠️ Continuing in offline mode...");
    }
}

// ==========================================
// CRAZYGAMES INVITE LINK (Multiplayer)
// ==========================================

/**
 * Generate and show CrazyGames invite link
 * Called when entering multiplayer lobby
 */
function showInviteButton() {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        console.log('⚠️ SDK not available - invite button unavailable');
        return;
    }
    
    try {
        const sdk = window.CrazyGames.SDK;
        
        // Show invite button in CrazyGames interface
        if (sdk.game && sdk.game.showInviteButton) {
            sdk.game.showInviteButton({
                roomId: myRoomId || 'unknown'
            });
            console.log('✅ Invite button shown');
        }
    } catch (e) {
        console.error('Error showing invite button:', e);
    }
}

/**
 * Hide CrazyGames invite link
 * Called when leaving multiplayer lobby
 */
function hideInviteButton() {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        return;
    }
    
    try {
        const sdk = window.CrazyGames.SDK;
        
        // Hide invite button
        if (sdk.game && sdk.game.hideInviteButton) {
            sdk.game.hideInviteButton();
            console.log('✅ Invite button hidden');
        }
    } catch (e) {
        console.error('Error hiding invite button:', e);
    }
}

/**
 * Get invite link for current room
 * Returns URL that players can share
 */
function getInviteLink() {
    if (!myRoomId) {
        console.log('⚠️ No room ID available');
        return null;
    }
    
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        // Fallback for offline mode
        return `${window.location.origin}${window.location.pathname}?room=${myRoomId}`;
    }
    
    try {
        const sdk = window.CrazyGames.SDK;
        
        // Get invite link from SDK
        if (sdk.game && sdk.game.inviteLink) {
            const link = sdk.game.inviteLink({
                roomId: myRoomId
            });
            console.log('✅ Invite link generated:', link);
            return link;
        }
    } catch (e) {
        console.error('Error getting invite link:', e);
    }
    
    // Fallback
    return `${window.location.origin}${window.location.pathname}?room=${myRoomId}`;
}

// ==========================================
// LEVEL UP & UNLOCK NOTIFICATIONS
// ==========================================

/**
 * Show level up popup with animation
 * Called by progression system when player levels up
 */
window.showLevelUpPopup = function() {
    console.log('🎉 showLevelUpPopup called for level', window.playerLevel);
    const earnedSP = (window.playerLevel % 5 === 0);
    
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: linear-gradient(135deg, #9b59b6, #8e44ad);
        color: white;
        padding: 40px 60px;
        border-radius: 20px;
        font-size: 32px;
        font-weight: 900;
        text-align: center;
        box-shadow: 0 15px 40px rgba(0,0,0,0.7);
        z-index: 2000000;
        animation: popIn 0.6s ease-out forwards;
    `;
    popup.innerHTML = `
        <div style="font-size: 72px; margin-bottom: 15px;"><i class="fa-solid fa-star" style="color:#f1c40f"></i></div>
        <div>LEVEL UP!</div>
        <div style="font-size: 48px; margin-top: 10px;">Level ${window.playerLevel}</div>
        ${earnedSP ? '<div style="font-size: 18px; margin-top: 15px; opacity: 0.9; color: #f1c40f;"><i class="fa-solid fa-star" style="color:#f1c40f"></i> +1 Skill Point <i class="fa-solid fa-star" style="color:#f1c40f"></i></div>' : ''}
    `;
    document.body.appendChild(popup);
    console.log('✅ Level up popup added to DOM');

    setTimeout(() => {
        popup.style.animation = 'popOut 0.4s ease-in forwards';
        setTimeout(() => popup.remove(), 400);
    }, 2500);
};

/**
 * Show tower/upgrade unlock notification
 * Called when player unlocks new content
 */
window.showUnlockNotif = function(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 180px;
        right: 20px;
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        z-index: 1000000;
        animation: slideIn 0.4s ease-out;
    `;
    notif.innerText = message;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'slideOut 0.4s ease-in';
        setTimeout(() => notif.remove(), 400);
    }, 3000);
};

// Add CSS animations for popups
if (!document.getElementById('popup-animations')) {
    const style = document.createElement('style');
    style.id = 'popup-animations';
    style.textContent = `
        @keyframes popIn {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes popOut {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        }
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ==========================================
// MULTIPLAYER LOBBY RETURN (CrazyGames Requirement)
// ==========================================

/**
 * Smart function that returns to lobby in multiplayer or menu in singleplayer
 * CrazyGames requires players stay in lobby after game ends
 */
function returnToLobbyOrMenu() {
    // Commit deferred scraps before navigating away
    if (typeof window._awardPendingScraps === 'function') window._awardPendingScraps();

    if (isMultiplayerMode && socket && myRoomId) {
        returnToLobby();
    } else {
        goToMainMenu();
    }
}

	function startGameWithCustomMap(customMap) {
    console.log('🎮 Starting game with custom map:', customMap.name);
    
    // Add custom map to MAPS array temporarily
    const tempMapIndex = MAPS.length;
    MAPS.push(customMap);
    
    // Start game with this map
    selectedMapIndex = tempMapIndex;
    
    // Your existing startGame() logic here
    hideAllScreens();
    setGameUIVisible(true);
    resetGame();
    loadMap(tempMapIndex);
    
    // Apply custom settings
    if (customMap.customSettings) {
        applyCustomMapSettings(customMap.customSettings);
    }
    
    gameRunning = true;
    isPaused = false;
}

/**
 * Return to multiplayer lobby after game ends
 * Shows lobby screen with same players
 */
function returnToLobby() {
    console.log('🔄 Returning to lobby...');
    
    // Stop gameplay tracking
    notifyGameplayStop();
    
    // Reset game state but keep multiplayer data
    resetGame();
    loadMap(0); // Load dummy map for background
    
    gameRunning = false;
    isPaused = false;
    // Keep isMultiplayerMode = true
    
    // Update XP bar when returning to lobby
    if (typeof window.updateXPBar === 'function') {
        window.updateXPBar();
    } else if (typeof window.updateXPBarDirect === 'function') {
        window.updateXPBarDirect();
    }
    
    // ✅ FIX: Use the same updateLobbyUI that the pre-game lobby uses
    // so it renders the new slot-based design, not the old basic HTML
    if (allPlayers && allPlayers.length > 0 && typeof updateLobbyUI === 'function') {
        updateLobbyUI(allPlayers);
    } else {
        // Fallback if somehow allPlayers is empty
        hideAllScreens();
        document.getElementById('lobby-screen').style.display = 'flex';
        if (myRole === 'host') {
            document.getElementById('lobby-start-btn').style.display = 'block';
            document.getElementById('lobby-status').style.display = 'none';
        } else {
            document.getElementById('lobby-start-btn').style.display = 'none';
            document.getElementById('lobby-status').innerText = 'Waiting for host to select map...';
            document.getElementById('lobby-status').style.display = 'block';
        }
    }

    // ✅ FIX: Show legal links in lobby
    const legal = document.getElementById('legal-links');
    if (legal) legal.style.display = 'block';

    // Show invite button again
    showInviteButton();
    
    console.log('✅ Back in lobby!');
}

function setGameFocus(hasFocus) {
            if (!hasFocus) {
                // 1. Pause Game Logic
                isPaused = true; 
                // 2. Mute Audio Engine (Instant Silence)
                if (AudioSys && AudioSys.ctx) AudioSys.ctx.suspend();
                console.log("🔇 Game Paused & Muted for Ad");
            } else {
                // 1. Resume Game Logic
                isPaused = false;
                // 2. Resume Audio Engine
                if (AudioSys && AudioSys.ctx) AudioSys.ctx.resume();
                console.log("🔊 Game Resumed");
            }
        }

// ============================================================================
// AD SYSTEM — Google IMA SDK (Interactive Media Ads)
// ============================================================================
//
// HOW TO SET UP YOUR ADS:
//
//   1. Go to https://admanager.google.com and create a free account.
//   2. Create a new Ad Unit:  Inventory → Ad units → New ad unit
//      - Type: Video → Rewarded   (for the REVIVE / 2× SCRAPS buttons)
//      - Type: Video → Interstitial (for between-wave midgame ads)
//   3. Generate an ad tag:  Delivery → Create order → New line item
//      Then copy the VAST tag URL and paste it into AD_TAG_REWARDED below.
//   4. For testing right now, the default tag below is a Google test ad
//      that always fills — swap it out once your real tag is approved.
//
// ============================================================================

const AD_TAG_REWARDED = (function() {
    // ← Paste your real Google Ad Manager rewarded VAST tag here.
    // Default = Google's public test tag (fills instantly, no real money):
    return 'https://pubads.g.doubleclick.net/gampad/ads?' +
        'iu=/21775744923/external/single_preroll_skippable&sz=640x480&' +
        'ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&' +
        'unviewed_position_start=1&env=vp&impl=s&correlator=';
})();

const AD_TAG_MIDGAME = AD_TAG_REWARDED; // Use same tag or swap for a separate unit

// ── Internal state ────────────────────────────────────────────────────────────
let _adDisplayContainer = null;
let _adsLoader          = null;
let _adsManager         = null;
let _adAvailable        = false;   // true once IMA confirms an ad is loaded
let _adPlaying          = false;
let _rewardCallback     = null;
let _imaInitialized     = false;

// ── Get/create the fullscreen ad overlay div ──────────────────────────────────
function _getAdContainer() {
    let el = document.getElementById('ima-ad-container');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ima-ad-container';
        el.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
            'z-index:999999', 'display:none', 'background:#000'
        ].join(';');
        document.body.appendChild(el);
    }
    return el;
}

// ── Restore game state after ad ends ─────────────────────────────────────────
function _resumeAfterAd() {
    const el = document.getElementById('ima-ad-container');
    if (el) el.style.display = 'none';
    _adPlaying = false;
    if (typeof isPaused !== 'undefined') isPaused = false;
    if (typeof AudioSys !== 'undefined' && AudioSys.ctx) {
        try { AudioSys.ctx.resume(); } catch(e) {}
    }
}

// ── IMA event handlers ────────────────────────────────────────────────────────
function _onAdsManagerLoaded(evt) {
    _adsManager = evt.getAdsManager(document.getElementById('ima-ad-container'));
    _adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR,   _onAdError);
    _adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE,         _onAdComplete);
    _adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED,_onAdComplete);
    _adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED,          _onAdSkipped);
    _adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE,       _onAdSkipped);
    _adAvailable = true;
    console.log('[Ads] IMA: Ad ready ✓');
}

function _onAdComplete() {
    console.log('[Ads] IMA: Ad completed — granting reward');
    _resumeAfterAd();
    if (_rewardCallback) { _rewardCallback(); _rewardCallback = null; }
    _adAvailable = false;
    setTimeout(_requestAd, 500);
}

function _onAdSkipped() {
    // The test tag is a skippable preroll — skip after 5s counts as watched.
    // Real non-skippable rewarded ads from Ad Manager won't show a skip button anyway.
    console.log('[Ads] IMA: Ad skipped — granting reward (watched mandatory portion)');
    _resumeAfterAd();
    if (_rewardCallback) { _rewardCallback(); _rewardCallback = null; }
    _adAvailable = false;
    setTimeout(_requestAd, 500);
}

function _onAdError(evt) {
    const err = evt.getError ? evt.getError() : evt;
    console.warn('[Ads] IMA error:', err);
    _resumeAfterAd();
    _rewardCallback = null;
    _adAvailable = false;
    setTimeout(_requestAd, 5000); // Retry after 5s
}

// ── Request a new ad (pre-load) ───────────────────────────────────────────────
function _requestAd(tagUrl) {
    if (!_adsLoader) return;
    const req = new google.ima.AdsRequest();
    req.adTagUrl = (tagUrl || AD_TAG_REWARDED) + Math.floor(Math.random() * 1e9);
    req.linearAdSlotWidth  = window.innerWidth;
    req.linearAdSlotHeight = window.innerHeight;
    req.nonLinearAdSlotWidth  = window.innerWidth;
    req.nonLinearAdSlotHeight = 150;
    _adsLoader.requestAds(req);
}

// ── Bootstrap IMA once SDK is on the page ────────────────────────────────────
function _initIMA() {
    if (_imaInitialized) return;
    if (typeof google === 'undefined' || !google.ima) return;
    _imaInitialized = true;

    const container = _getAdContainer();
    _adDisplayContainer = new google.ima.AdDisplayContainer(container);
    _adsLoader = new google.ima.AdsLoader(_adDisplayContainer);
    _adsLoader.addEventListener(
        google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, _onAdsManagerLoaded);
    _adsLoader.addEventListener(
        google.ima.AdErrorEvent.Type.AD_ERROR, _onAdError);

    _requestAd();
    console.log('[Ads] IMA SDK initialised — pre-loading ad');
}

// Try to init immediately, and again once the page fully loads
(function() {
    if (document.readyState === 'complete') { _initIMA(); }
    else { window.addEventListener('load', _initIMA); }
    // Also poll briefly in case the SDK loads after this script
    let _initAttempts = 0;
    const _poll = setInterval(() => {
        if (_imaInitialized || _initAttempts++ > 20) { clearInterval(_poll); return; }
        _initIMA();
    }, 500);

    // ── Ad click-through recovery ─────────────────────────────────────────────
    // When the player clicks the ad it opens a new tab. IMA keeps _adPlaying=true
    // freezing the game. When they come back we grant the reward (they did engage
    // with the ad) and cleanly tear down the ad player.
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && _adPlaying) {
            console.log('[Ads] Tab regained focus during ad — granting reward and resuming');
            setTimeout(function() {
                if (!_adPlaying) return; // IMA already resolved naturally, nothing to do
                // Grant reward — player clicked through to the advertiser, that counts
                const cb = _rewardCallback;
                _rewardCallback = null;
                try { if (_adsManager) _adsManager.stop(); } catch(e) {}
                _resumeAfterAd();
                if (cb) cb();
                // Queue next ad pre-load
                _adAvailable = false;
                setTimeout(_requestAd, 1000);
            }, 600);
        }
    });
})();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolves true if a rewarded ad is pre-loaded and ready to play.
 * Waits up to 4 seconds for IMA to respond before giving up.
 */
window.checkAdAvailable = function() {
    return new Promise(resolve => {
        // IMA SDK not on page → no ads
        if (typeof google === 'undefined' || !google.ima) { resolve(false); return; }
        if (_adAvailable) { resolve(true); return; }
        if (!_imaInitialized) _initIMA();

        let waited = 0;
        const poll = setInterval(() => {
            if (_adAvailable)    { clearInterval(poll); resolve(true);  return; }
            if (waited >= 4000)  { clearInterval(poll); resolve(false); return; }
            waited += 100;
        }, 100);
    });
};

/**
 * Show a rewarded ad. Calls onSuccess() only after the ad plays to completion.
 * If no ad is available, does nothing (buttons should already be greyed out).
 */
function showRewardAd(onSuccess) {
    if (!_adAvailable || !_adsManager) {
        console.warn('[Ads] showRewardAd called but no ad is available — ignoring');
        return;
    }
    if (_adPlaying) return;
    _adPlaying = true;
    _rewardCallback = onSuccess;

    // Pause game + audio
    if (typeof isPaused !== 'undefined') isPaused = true;
    if (typeof AudioSys !== 'undefined' && AudioSys.ctx) {
        try { AudioSys.ctx.suspend(); } catch(e) {}
    }

    // Show the ad overlay and play
    const container = _getAdContainer();
    container.style.display = 'block';
    _adDisplayContainer.initialize();

    try {
        _adsManager.init(window.innerWidth, window.innerHeight, google.ima.ViewMode.FULLSCREEN);
        _adsManager.start();
    } catch(e) {
        console.error('[Ads] IMA start error:', e);
        _resumeAfterAd();
        _rewardCallback = null;
    }
}

/**
 * Show a non-rewarded interstitial (between waves).
 * Plays the ad, game resumes automatically when done.
 */
function showIntermissionAd() {
    if (!_adAvailable || !_adsManager || _adPlaying) return;
    showRewardAd(null); // Same flow, just no reward callback
}

/**
 * Alias — called by wave completion hook.
 */
function showMidgameAd() {
    showIntermissionAd();
}
        
        /**
         * CRITICAL QA METRIC #2: Stop loading timer when main menu appears
         * Call this the EXACT moment the main menu is visible and interactive
         */
        function notifyLoadingComplete() {
            if (window.CrazyGames && window.CrazyGames.SDK && !gameLoadingComplete) {
                try {
                    window.CrazyGames.SDK.game.sdkGameLoadingStop();
                    gameLoadingComplete = true;
                    console.log('✅ Loading Complete - Main Menu Ready');
                    console.log('⏹️ Loading Timer Stopped (Time to Play recorded)');
                } catch (e) {
                    console.warn('Loading complete tracking failed:', e);
                }
            }
        }
        
        /**
         * CRITICAL QA METRIC #3: Start gameplay tracking
         * Call ONLY when player enters actual gameplay (wave starts)
         * NOT when in menus, map select, or paused
         */
        function notifyGameplayStart() {
            if (window.CrazyGames && window.CrazyGames.SDK) {
                try {
                    window.CrazyGames.SDK.game.gameplayStart();
                    console.log('🎮 Gameplay Started (Average Playtime tracking)');
                } catch (e) {
                    console.warn('Gameplay start tracking failed:', e);
                }
            }
        }
        
        /**
         * CRITICAL QA METRIC #4: Stop gameplay tracking
         * Call when:
         * - Player pauses
         * - Player dies (game over)
         * - Player returns to menu
         * - Ad is playing
         */
        function notifyGameplayStop() {
            if (window.CrazyGames && window.CrazyGames.SDK) {
                try {
                    window.CrazyGames.SDK.game.gameplayStop();
                    console.log('⏸️ Gameplay Stopped (Playtime paused)');
                } catch (e) {
                    console.warn('Gameplay stop tracking failed:', e);
                }
            }
        }
        
        /**
         * HAPPY TIME: Celebration event
         * Call when player achieves something positive:
         * - Beats a boss wave
         * - Completes a difficult level
         * - Gets a high score
         * 
         * This creates positive engagement metrics
         */
        function triggerHappyTime() {
            if (window.CrazyGames && window.CrazyGames.SDK) {
                try {
                    window.CrazyGames.SDK.game.happytime();
                    console.log('🎉 Happy Time! (Player achieved something)');
                } catch (e) {
                    console.warn('Happy time tracking failed:', e);
                }
            }
        }
        
        // ========================================================================
        // AD FUNCTIONS
        // ========================================================================
        
        // (Duplicate showMidgameAd removed - using stub above)
        
        // (Duplicate ad functions removed - using stubs above)
        
        /**
         * Revive Player (Rewarded Ad Reward)
         * - Clears all enemies (prevents instant death)
         * - Resets camera to default position
         * - Gives 1 life
         * - Restarts current wave
         */
        function revivePlayer() {
            // 1. Clear all enemies and projectiles
            enemies.forEach(e => { 
                scene.remove(e.mesh); 
                if(e.hpGroup) scene.remove(e.hpGroup); 
            });
            projectiles.forEach(p => scene.remove(p.mesh));
            enemies = [];
            projectiles = [];
            
            // 2. Reset camera to default position
            camera.position.set(0, 110, 50);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
            
            // 3. Give player 1 life
            lives = 1;
            
            // 4. Reset wave state (will restart current wave)
            activeWave = false;
            spawningFinished = true;
            wave--; // Decrement so next start goes to same wave
            
            // 5. Close game over screen and resume game
            document.getElementById('game-over-screen').style.display = 'none';
            isPaused = false;
            gameRunning = true;
            
            // 6. Enable start wave button
            const btn = document.getElementById('btn-start-wave');
            if(btn) {
                btn.disabled = false;
                btn.innerText = "START WAVE";
                btn.style.backgroundColor = "";
            }
            
            // 7. Resume gameplay tracking
            notifyGameplayStart();
            
            // 8. Update UI
            updateUI();
            
            console.log('🔄 Player revived! Wave ' + (wave + 1) + ' ready to restart.');
        }
        
        // --- SYNCED RANDOMNESS ---
        let mapSeed = 12345;

// --- Settings, Skill Tree, Trophy Road ---

        // =====================================================
        // MODERN TOWER UI FUNCTIONS
        // =====================================================
        
        let currentTowerCategory = 'all';
        let currentSearchTerm = '';
        
        // Populate tower grid
        function populateTowerGrid() {
            const grid = document.getElementById('tower-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            let visibleCount = 0;
            
            Object.keys(TOWERS).forEach((k, index) => {
                const t = TOWERS[k];
                const cost = Math.floor(t.cost * GAME_CONFIG.costMult);
                
                // Filter by category
                if (currentTowerCategory !== 'all' && t.category !== currentTowerCategory) {
                    return;
                }
                
                // Filter by search
                if (currentSearchTerm && !t.name.toLowerCase().includes(currentSearchTerm.toLowerCase())) {
                    return;
                }
                
                visibleCount++;
                
                const btn = document.createElement('div');
                btn.className = 'tower-btn';
                btn.dataset.tower = k;
                btn.dataset.category = t.category;
                
                // Check if tower is unlocked (only in singleplayer or if not in a game)
                const isUnlocked = !window.unlockedTowers || !window.towerUnlockLevels || window.unlockedTowers.includes(k);
                const unlockLevel = window.towerUnlockLevels ? window.towerUnlockLevels[k] : 1;
                
                // Check if affordable
                if (cost > gold || !isUnlocked) {
                    btn.classList.add('disabled');
                }
                
                // Show unlock level for locked towers
                let costDisplay = isUnlocked 
                    ? `<div class="tower-cost ${cost > gold ? 'expensive' : ''}">$${cost}</div>`
                    : `<div class="tower-cost" style="color: #e67e22;">UNLOCKS LVL ${unlockLevel}</div>`;
                
                btn.innerHTML = `
                    ${t.hotkey ? `<div class="tower-hotkey">${t.hotkey}</div>` : ''}
                    <img src="${TOWER_ICONS[k]}" class="tower-preview" style="${!isUnlocked ? 'filter: grayscale(1) brightness(0.5);' : ''}">
                    <div class="tower-info">
                        <div class="tower-name">${t.name}</div>
                        ${costDisplay}
                    </div>
                `;
                
                btn.onclick = (e) => { 
                    e.stopPropagation(); 
                    if (cost <= gold && isUnlocked) {
                        playClick(); 
                        selectTool(k, btn); 
                    }
                };
                
                grid.appendChild(btn);
            });
            
            // Update counter
            const counter = document.getElementById('tower-count');
            if (counter) {
                const total = Object.keys(TOWERS).length;
                counter.textContent = `${visibleCount} / ${total}`;
            }
            
            // Show empty state if no towers
            const emptyState = document.getElementById('tower-empty-state');
            if (emptyState) {
                emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
            }
        }
        
        // Filter by category
        function filterTowerCategory(category) {
            currentTowerCategory = category;
            
            // Update tab styles
            document.querySelectorAll('.category-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.category === category) {
                    tab.classList.add('active');
                }
            });
            
            populateTowerGrid();
        }
        
        // Search towers
        function searchTowers() {
            const searchInput = document.getElementById('tower-search');
            if (!searchInput) return;
            
            currentSearchTerm = searchInput.value;
            populateTowerGrid();
        }
        
        // Keyboard shortcuts for tower selection
        document.addEventListener('keydown', (e) => {
            if (!(typeof gameRunning !== "undefined" && gameRunning) || (typeof isPaused !== "undefined" && isPaused)) return;
            
            // Don't trigger if typing in search
            if (document.activeElement.id === 'tower-search') return;
            
            // Number keys 0-9 for tower hotkeys
            const key = e.key;
            Object.keys(TOWERS).forEach(k => {
                const t = TOWERS[k];
                if (t.hotkey === key) {
                    const cost = Math.floor(t.cost * GAME_CONFIG.costMult);
                    const isUnlocked = !window.unlockedTowers || !window.towerUnlockLevels || window.unlockedTowers.includes(k);
                    if (cost <= gold && isUnlocked) {
                        const btn = document.querySelector(`.tower-btn[data-tower="${k}"]`);
                        if (btn && !btn.classList.contains('disabled')) {
                            playClick();
                            selectTool(k, btn);
                        }
                    }
                }
            });
        });

        function selectTool(k, el) {
            if (selectedType === k) { deselectAll(); return; }
            selectedType = k; selectedTower = null;
            rangeRing.visible = true;
            rangeRing.scale.set(TOWERS[k].range, TOWERS[k].range, 1);
            if (TOWERS[k].minRange) {
                deadZoneRing.visible = true;
                deadZoneRing.scale.set(TOWERS[k].minRange, TOWERS[k].minRange, 1);
            } else {
                deadZoneRing.visible = false;
            }
            // Build ghost model (tint updated each mousemove)
            if (typeof window._rebuildGhostTower === 'function') window._rebuildGhostTower(k, true);
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            el.classList.add('selected');
            document.getElementById('inspect-panel').style.display = 'none';
        }

        function deselectAll() {
            selectedType = null; selectedTower = null;
            rangeRing.visible = false; deadZoneRing.visible = false;
            if (typeof window._rebuildGhostTower === 'function') window._rebuildGhostTower(null, false);
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            document.getElementById('inspect-panel').style.display = 'none';
        }
        
        function upgradeTower(branch = null) {
            const t = selectedTower; if(!t) return;
            
            // --- NEW: Calculate Cost based on Branch ---
            let cost = 0;
            if(t.level === 4 && branch) {
                // If it's a Level 5 upgrade, get the SPECIFIC price from the object
                const basePrice = TOWER_UPGRADES[t.type][branch].cost;
                // Apply difficulty multiplier (Easy/Hard mode scaling)
                cost = Math.floor(basePrice * GAME_CONFIG.costMult); 
            } else {
                // Standard 1-4 Scaling logic
                cost = Math.floor((t.cost * GAME_CONFIG.costMult) * (t.level + 0.5));
            }

            if(gold >= cost && t.level < MAX_LEVEL) {
                gold -= cost; 
                
                // Multiplayer Wallet Logic
                if(currentGamemode === 'separate') {
    // Subtract from my specific wallet
    playerWallets[myPlayerIndex] -= cost;
    
    // If I am the host, update the main display gold immediately
    if(myRole === 'host') gold = playerWallets[0];
    
    // FIX: Sync wallet updates to all players after tower purchase
    if(socket && myRoomId) {
        socket.emit('gameAction', { 
            type: 'wallet_update', 
            roomId: myRoomId, 
            wallets: playerWallets,
            gold: gold,
            mode: currentGamemode
        });
    }
}

                t.level++;
                
                // Track upgrade for challenges
                if (typeof window.sessionStats !== 'undefined') {
                    window.sessionStats.upgrades = (window.sessionStats.upgrades || 0) + 1;
                    if (typeof window.updateChallengeProgress === 'function') {
                        window.updateChallengeProgress('upgrades', window.sessionStats.upgrades);
                    }
                }
                
                // --- APPLY UPGRADE STATS ---
                if(t.level === 5 && branch) {
                    t.branch = branch; // Save the choice!
                    
                    // Safety check: Ensure upgrades exist
                    if(TOWER_UPGRADES[t.type] && TOWER_UPGRADES[t.type][branch]) {
                        const stats = TOWER_UPGRADES[t.type][branch];
                        
                        t.dmg *= stats.dmgMult || 1;
                        t.range *= stats.rangeMult || 1;
                        t.rate *= stats.rateMult || 1;
                        
                        if(stats.splash) t.splash = stats.splash;
                        if(stats.special) t.special = stats.special;
                        
                        // Overrides
                        if(t.type === 'tesla') {
                            if(stats.chainAdd) t.chain += stats.chainAdd;
                            if(stats.chainSet) t.chain = stats.chainSet;
                        }
                        if(t.type === 'farm') {
                            if(stats.incomeAdd) t.income += stats.incomeAdd;
                        }
                        if(t.type === 'ice') {
                            if(stats.slowAdd) t.slow += stats.slowAdd;
                        }
                        
                        // Change bullet color to match theme
                        t.color = stats.color; 
                    }
                } else {
                    // Standard 1-4 Scaling
                    t.dmg *= 1.5;
                    t.range *= 1.1;
                    t.rate *= 0.9;
                    if(t.type === 'farm') t.income += 30;
                    if(t.type === 'tesla' && t.level%2===0) t.chain++;
                    
                    // Ice/Tesla special scaling
                    if(t.type === 'ice') { t.slow += 0.1; t.stunChance += 0.05; t.stunDur += 0.2; }
                    if(t.type === 'tesla' && t.level % 2 === 0) { t.chain += 1; }
                }

                // MP Sync
                if(socket && myRoomId) {
                    socket.emit('gameAction', { 
                           roomId: myRoomId, 
                           type: 'upgrade', 
                           key: selectedType, 
                           x: t.mesh.position.x, 
                           z: t.mesh.position.z,
                           playerRole: myRole,
                           branch: branch 
                    });
                }

                AudioSys.click();
                
                // Rebuild Mesh
                scene.remove(t.mesh);
                const oldPos = t.mesh.position.clone();
                const oldRot = t.mesh.children[1].rotation.clone();
                
                // PASS THE BRANCH TO THE MODEL GENERATOR
                t.mesh = createTowerModel(t.type, t.level, t.branch); 
                
                t.mesh.position.copy(oldPos);
                t.mesh.children[1].rotation.copy(oldRot);
                scene.add(t.mesh);
                
                rangeRing.scale.set(t.range, t.range, 1);
                
                if(typeof unlockTowerLevel === 'function') unlockTowerLevel(t.type, t.level);
                updateUI(); updateInspect();
            }
        }

        function sellTower() {
            const t = selectedTower; if(!t) return;
            
            // Calculate Sell Price
            const sellPrice = Math.floor((t.cost * GAME_CONFIG.costMult * t.level) * 0.6);
            
            // Economy Logic (UPDATED FOR 4 PLAYERS)
            if(currentGamemode === 'shared') {
                gold += sellPrice;
            } else {
                // Refund to the specific owner
                if(typeof t.ownerIndex !== 'undefined') {
                    playerWallets[t.ownerIndex] += sellPrice;
                    
                    // Update my display if I own it
                    if(t.ownerIndex === myPlayerIndex) {
                        gold = playerWallets[myPlayerIndex];
                    }
                }
            }

            AudioSys.click();
            
            // FIX: Sync wallet updates after selling
            if(socket && myRoomId && currentGamemode === 'separate') {
                socket.emit('gameAction', { 
                    type: 'wallet_update', 
                    roomId: myRoomId, 
                    wallets: playerWallets,
                    gold: gold,
                    mode: currentGamemode
                });
            }
            
            // Sync Selling
            if(socket && myRoomId) {
                socket.emit('gameAction', { 
                    type: 'sell', 
                    roomId: myRoomId, 
                    x: t.mesh.position.x, 
                    z: t.mesh.position.z 
                });
            }

            scene.remove(t.mesh); 
            towers = towers.filter(x => x !== t);
            deselectAll(); 
            updateUI();
        }

        function createFloatingText(text, pos, color) {
            const canvas = document.createElement('canvas'); 
            const ctx = canvas.getContext('2d');
            canvas.width=128; canvas.height=64; 
            ctx.font="Bold 40px Arial"; 
            ctx.fillStyle=color; 
            ctx.textAlign="center"; 
            ctx.strokeStyle="black"; 
            ctx.lineWidth=4;
            ctx.strokeText(text,64,48); 
            ctx.fillText(text,64,48);
            
            const tex = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({map:tex, transparent:true});
            const sprite = new THREE.Sprite(mat);
            sprite.position.copy(pos); 
            sprite.scale.set(6,3,1);
            
            scene.add(sprite);
            particles.push({ mesh: sprite, life: 1.5, type: 'floating_text', vel: new THREE.Vector3(0,0,0) });
        }

        function createParticles(pos, count, color) {
            const mat = new THREE.MeshBasicMaterial({color});
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            for(let i=0; i<count; i++) {
                const m = new THREE.Mesh(geo, mat);
                m.position.copy(pos); m.position.x += (Math.random()-0.5)*2; m.position.z += (Math.random()-0.5)*2;
                scene.add(m);
                particles.push({ mesh: m, vel: new THREE.Vector3((Math.random()-0.5), Math.random()*0.5, (Math.random()-0.5)), life: 0.5 });
            }
        }

        // --- NEW VFX SYSTEMS ---
        
        // 1. Muzzle Flash (Bright expand/fade at barrel)
        function createMuzzleFlash(pos, color) {
            if(graphicsMode === 0) return; // Skip on Low settings
            
            const geo = new THREE.PlaneGeometry(1.5, 1.5);
            const mat = new THREE.MeshBasicMaterial({
                color: color, 
                transparent: true, 
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.lookAt(camera.position); // Billboard
            mesh.rotation.z = Math.random() * Math.PI; // Random rotation
            
            scene.add(mesh);
            
            // Flash is very short-lived
            particles.push({ 
                mesh: mesh, 
                life: 0.08, 
                type: 'flash',
                onUpdate: (p, dt) => {
                    p.mesh.scale.multiplyScalar(1.2); // Expand
                    p.mesh.material.opacity -= dt * 10; // Fade fast
                }
            });
        }

        // 2. Impact Sparks (Directional spray)
        function createImpact(pos, color, count=5) {
            if(graphicsMode === 0) return;
            
            const geo = new THREE.BoxGeometry(0.15, 0.15, 0.4);
            const mat = new THREE.MeshBasicMaterial({ color: color });
            
            for(let i=0; i<count; i++) {
                const m = new THREE.Mesh(geo, mat);
                m.position.copy(pos);
                m.lookAt(pos.clone().add(new THREE.Vector3(Math.random()-0.5, Math.random(), Math.random()-0.5)));
                scene.add(m);
                
                particles.push({
                    mesh: m,
                    life: 0.3 + Math.random() * 0.2,
                    vel: new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5),
                    isPhysics: true // Use gravity logic
                });
            }
        }

        // 3. Upgraded Explosion (Ring + Debris)
        function createExplosion(pos, color, radius) {
            addTrauma(0.4);
            AudioSys.noise(0.5, 0.4, 600); 

            // A. The Core Sphere (Flash) - Brighter and bigger
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 1.2, 16, 16), 
                new THREE.MeshBasicMaterial({ 
                    color: color, 
                    transparent: true, 
                    opacity: 1.0 
                })
            );
            sphere.position.copy(pos);
            scene.add(sphere);
            particles.push({ mesh: sphere, life: 0.3, type: 'expand_fade' });

            // B. The Shockwave Ring
            if(graphicsMode > 0) {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(0.1, 0.5, 32),
                    new THREE.MeshBasicMaterial({ 
                        color: color, 
                        transparent: true, 
                        opacity: 0.8, 
                        side: THREE.DoubleSide 
                    })
                );
                ring.position.copy(pos);
                ring.rotation.x = -Math.PI/2;
                scene.add(ring);
                
                particles.push({ 
                    mesh: ring, 
                    life: 0.4, 
                    type: 'shockwave',
                    maxSize: radius * 3.0 
                });
                
                // C. NEW: Fire particles shooting outward
                if(graphicsMode === 2) {
                    for(let i=0; i<12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const spark = new THREE.Mesh(
                            new THREE.BoxGeometry(0.3, 0.3, 0.8),
                            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
                        );
                        spark.position.copy(pos);
                        spark.lookAt(
                            pos.x + Math.cos(angle),
                            pos.y,
                            pos.z + Math.sin(angle)
                        );
                        scene.add(spark);
                        
                        particles.push({
                            mesh: spark,
                            life: 0.4,
                            vel: new THREE.Vector3(
                                Math.cos(angle) * 0.5,
                                Math.random() * 0.3,
                                Math.sin(angle) * 0.5
                            )
                        });
                    }
                }
            }
        }
	
	function createShatter(pos, color, count) {
            for(let i=0; i<count; i++) {
                const size = 0.3 + Math.random() * 0.4;
                const geo = new THREE.BoxGeometry(size, size, size);
                const mat = new THREE.MeshBasicMaterial({ color: color });
                const mesh = new THREE.Mesh(geo, mat);
                
                mesh.position.copy(pos);
                // Random offset
                mesh.position.x += (Math.random() - 0.5);
                mesh.position.y += (Math.random() - 0.5);
                mesh.position.z += (Math.random() - 0.5);
                
                // Random rotation
                mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                
                scene.add(mesh);
                
                // Add to particles array with physics
                particles.push({
                    mesh: mesh,
                    life: 1.0 + Math.random() * 0.5,
                    vel: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.8,
                        Math.random() * 0.8 + 0.2, // Pop up
                        (Math.random() - 0.5) * 0.8
                    ),
                    rotVel: new THREE.Vector3(
                        (Math.random()-0.5) * 0.2,
                        (Math.random()-0.5) * 0.2,
                        (Math.random()-0.5) * 0.2
                    ),
                    isPhysics: true // Use gravity
                });
            }
            
            // Sync Shatter to Clients
            if(socket && myRoomId && myRole === 'host') {
                socket.emit('gameAction', { 
                    type: 'visual_effect', effect: 'shatter', roomId: myRoomId, 
                    x: pos.x, z: pos.z, color: color, count: count 
                });
            }
        }
	
	// Added 'color' parameter with default red
        function showLocalError(msg, color = '#e74c3c') {
            AudioSys.tone(150, 'sawtooth', 0.2, 0.2);

            const err = document.createElement('div');
            err.innerText = msg;
            err.style.position = 'absolute';
            err.style.color = color; // Use the custom color
            // ... (keep the rest of the styling logic below)
            err.style.fontFamily = 'Orbitron, sans-serif';
            err.style.fontWeight = 'bold';
            err.style.fontSize = '24px';
            err.style.top = '40%';
            err.style.left = '50%';
            err.style.transform = 'translate(-50%, -50%)';
            err.style.textShadow = '0 0 10px black';
            err.style.pointerEvents = 'none';
            err.style.zIndex = '2000';
            err.style.transition = 'all 1s ease';
            document.body.appendChild(err);

            setTimeout(() => {
                err.style.opacity = '0';
                err.style.transform = 'translate(-50%, -100%)';
            }, 50);

            setTimeout(() => err.remove(), 1000);
        }

	function balanceMapGrid() {
            // 1. Get the map list container
            const container = document.querySelector('#level-select .map-container');
            if(!container) return;
            
            // 2. Count the maps
            const cards = container.querySelectorAll('.map-card');
            const count = cards.length;
            if(count === 0) return;

            // 3. Calculate "Symmetrical" Columns
            // 9 maps -> 4.5 -> Ceil(4.5) = 5 columns (5 up, 4 down)
            // 10 maps -> 5 -> 5 columns (5 up, 5 down)
            // 11 maps -> 5.5 -> Ceil(5.5) = 6 columns (6 up, 5 down)
            const cols = Math.ceil(count / 2);
            
            // 4. Force the Width
            // Width = (cols * 240px card) + ((cols - 1) * 25px gap)
            // We add 20px padding just to be safe
            const targetWidth = (cols * 240) + ((cols - 1) * 25) + 20;
            
            container.style.maxWidth = targetWidth + 'px';
        }

        function updateUI() {
    document.getElementById('ui-gold').innerText = Math.floor(gold);
    document.getElementById('ui-lives').innerText = lives;
    document.getElementById('ui-wave').innerText = wave;

    // --- MULTIPLAYER PLAYER LIST ---
    if (socket && myRoomId && allPlayers.length > 0) {
        for (let i = 0; i < 4; i++) {
            const el = document.getElementById('info-p' + (i + 1));
            if (el) {
                if (i < allPlayers.length) {
                    el.style.display = 'flex';
                    const pName = allPlayers[i].name;
                    
                    // Show level: own from window.playerLevel, others from playerLevels map
                    let level = '?';
                    if (i === myPlayerIndex && window.playerLevel) {
                        level = window.playerLevel;
                    } else if (typeof playerLevels !== 'undefined' && playerLevels[allPlayers[i].id]) {
                        level = playerLevels[allPlayers[i].id];
                    } else if (typeof window.playerLevels !== 'undefined' && window.playerLevels[allPlayers[i].id]) {
                        level = window.playerLevels[allPlayers[i].id];
                    }
                    const levelBadge = `<span style="background: linear-gradient(135deg, #e67e22, #e74c3c); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 5px;">LVL ${level}</span>`;
                    
                    // FIX: Explicitly check which variable to show
                    let displayGold = 0;
                    
                    if (currentGamemode === 'separate') {
                        // If it's ME, show my local 'gold' variable (which we synced above)
                        if (i === myPlayerIndex) {
                            displayGold = gold;
                        } else {
                            // If it's OTHERS, show the array value from the server
                            displayGold = playerWallets[i];
                        }
                    } else {
                        displayGold = gold; // Shared mode always uses global gold
                    }

                    const pColor = PLAYER_COLORS[i] || '#fff';
                    el.innerHTML = `${levelBadge}<span style="color:${pColor}">${pName}:</span> <span style="color:#f1c40f">$${Math.floor(displayGold)}</span>`;
                } else {
                    el.style.display = 'none';
                }
            }
        }
    }
      else {
        // Single Player
        document.getElementById('info-p1').innerHTML = `<span>You:</span> <span style="color:#f1c40f">$${Math.floor(gold)}</span>`;
        document.getElementById('info-p2').style.display = 'none';
        document.getElementById('info-p3').style.display = 'none';
        document.getElementById('info-p4').style.display = 'none';
    }

    if (selectedTower) updateInspect();
    
    // Update tower affordability in the grid
    document.querySelectorAll('.tower-btn').forEach(btn => {
        const towerKey = btn.dataset.tower;
        if (towerKey) {
            const cost = Math.floor(TOWERS[towerKey].cost * GAME_CONFIG.costMult);
            if (cost > gold) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
            
            // Update cost display color
            const costEl = btn.querySelector('.tower-cost');
            if (costEl) {
                if (cost > gold) {
                    costEl.classList.add('expensive');
                } else {
                    costEl.classList.remove('expensive');
                }
            }
        }
    });
}

        function updateInspect() {
            if(!selectedTower) { 
                document.getElementById('inspect-panel').style.display = 'none'; 
                return; 
            }
            const p = document.getElementById('inspect-panel'); 
            p.style.display = 'block';
            
            const t = selectedTower;
            
            // Basic Info
            let nameText = t.name;
            if(t.level === 5 && t.branch && TOWER_UPGRADES[t.type]) {
                nameText += " (" + (t.branch === 'A' ? TOWER_UPGRADES[t.type].A.name : TOWER_UPGRADES[t.type].B.name) + ")";
            }
            document.getElementById('ins-name').innerText = nameText;
            document.getElementById('ins-lvl').innerText = t.level + (t.level>=MAX_LEVEL ? " (MAX)" : "");
            
            // Owner Label
            const ownerLbl = document.getElementById('ins-owner');
            if (socket && myRoomId && t.ownerIndex !== undefined && allPlayers[t.ownerIndex]) {
                ownerLbl.style.display = 'block';
                const ownerName = allPlayers[t.ownerIndex].name.toUpperCase();
                ownerLbl.innerText = "OWNER: " + ownerName;
                ownerLbl.style.color = PLAYER_COLORS[t.ownerIndex];
            } else {
                ownerLbl.style.display = 'none';
            }

            // Stats
            const standardRows = ['ins-dmg','ins-range','ins-rate'].map(id => document.getElementById(id).parentNode);
            const s1 = document.getElementById('row-special-1');
            const s2 = document.getElementById('row-special-2');
            s1.style.display='none'; s2.style.display='none';

            if(t.type === 'farm') {
                standardRows.forEach(r => r.style.display = 'none');
                // Show total generated next to level like other towers show destroys
                document.getElementById('ins-type').innerHTML = `Level <span id="ins-lvl">${t.level}</span> | Total: <span style="color:#2ecc71">$${t.totalGenerated||0}</span>`;
                
                s1.style.display = 'flex';
                document.getElementById('lbl-special-1').innerText = "Income";
                document.getElementById('val-special-1').innerText = "$" + t.income;
                
                s2.style.display = 'flex';
                document.getElementById('lbl-special-2').innerText = "Rate";
                document.getElementById('val-special-2').innerText = t.rate.toFixed(1) + "s";
            } 
            else {
                standardRows.forEach(r => r.style.display = 'flex');
		document.getElementById('ins-type').innerHTML = `Level <span id="ins-lvl">${t.level}</span> | Destroyed: <span style="color:#e74c3c">${t.destroys||0}</span>`;
                document.getElementById('ins-dmg').innerText = Math.floor(t.dmg);
                document.getElementById('ins-range').innerText = t.range.toFixed(1);
                document.getElementById('ins-rate').innerText = t.rate.toFixed(2) + "s";
                
                if(t.type === 'ice') {
                    s1.style.display = 'flex'; s2.style.display = 'flex';
                    document.getElementById('lbl-special-1').innerText = "Stun Chance";
                    document.getElementById('val-special-1').innerText = Math.floor(t.stunChance*100) + "%";
                    document.getElementById('lbl-special-2').innerText = "Slow Dur";
                    document.getElementById('val-special-2').innerText = t.slow.toFixed(1) + "s";
                }
                if(t.type === 'tesla') {
                    s1.style.display = 'flex';
                    document.getElementById('lbl-special-1').innerText = "Chain Limit";
                    document.getElementById('val-special-1').innerText = t.chain + " Targets";
                }
            }

            // --- BRANCHING LOGIC (FIXED) ---
            const btnUp = document.getElementById('btn-upgrade');
            const actionGroup = document.querySelector('.action-group');
            let branchContainer = document.getElementById('branch-container');

            if (t.level === 4) {
                btnUp.style.display = 'none'; 
                
                // BUG FIX: If we switched from Gunner to Cryo, we must clear the old Gunner buttons!
                if (branchContainer && branchContainer.dataset.towerType !== t.type) {
                    branchContainer.remove();
                    branchContainer = null;
                }
                
                // Only create if it doesn't exist (Prevents Spam Click Bug)
                if(!branchContainer) {
                    const upData = TOWER_UPGRADES[t.type];
                    branchContainer = document.createElement('div');
                    branchContainer.id = 'branch-container';
                    branchContainer.dataset.towerType = t.type; // Mark this container as belonging to this tower type
                    branchContainer.style.display = 'flex';
                    branchContainer.style.gap = '5px';
                    branchContainer.style.marginBottom = '10px';

                    const createChoiceBtn = (data, branchCode, color) => {
                        const branchCost = Math.floor(data.cost * GAME_CONFIG.costMult);
                        const b = document.createElement('button');
                        b.className = 'action-btn branch-btn-' + branchCode; 
                        b.style.background = color;
                        b.style.border = '1px solid #fff';
                        
                        // Check if branch upgrade is unlocked (tier 5)
                        const branchKey = branchCode === 'A' ? 'branch1' : 'branch2';
                        const isUnlocked = !window.unlockedUpgrades || 
                                         checkIsMultiplayerMode() || 
                                         (window.unlockedUpgrades[t.type] && window.unlockedUpgrades[t.type][branchKey] >= 5);
                        
                        if (!isUnlocked) {
                            // Get required level from branchUnlockLevels
                            const requiredLevel = window.branchUnlockLevels && window.branchUnlockLevels[t.type] 
                                ? window.branchUnlockLevels[t.type][branchKey]
                                : 21;
                            
                            b.innerHTML = `<b>${data.name}</b><br><span style="font-size:10px"><i class="fa-solid fa-lock"></i> Level ${requiredLevel}</span><br><span style="font-size:9px; opacity:0.7;">Unlock via leveling</span>`;
                            b.style.opacity = 0.5;
                            b.style.cursor = 'not-allowed';
                            b.onclick = null; // No action when locked (no annoying popup)
                        } else {
                            b.innerHTML = `<b>${data.name}</b><br><span style="font-size:10px">${data.desc}</span><br>$${branchCost}`;
                            b.onclick = () => upgradeTower(branchCode);
                        }
                        
                        return b;
                    };

                    branchContainer.appendChild(createChoiceBtn(upData.A, 'A', '#e67e22'));
                    branchContainer.appendChild(createChoiceBtn(upData.B, 'B', '#8e44ad'));
                    // Insert before the Sell/Close buttons
                    document.getElementById('inspect-panel').insertBefore(branchContainer, actionGroup);
                }

                // Update Button States (Disable if poor)
                const myGold = (currentGamemode === 'separate') ? playerWallets[myPlayerIndex] : gold;
                const upData = TOWER_UPGRADES[t.type];

                ['A', 'B'].forEach(code => {
                    const btn = branchContainer.querySelector('.branch-btn-' + code);
                    if(btn) {
                        const cost = Math.floor(upData[code].cost * GAME_CONFIG.costMult);
                        if(myGold < cost) {
                            btn.style.opacity = 0.5;
                            btn.style.cursor = 'not-allowed';
                        } else {
                            btn.style.opacity = 1;
                            btn.style.cursor = 'pointer';
                        }
                    }
                });

            } else {
                // Not level 4: Hide/Remove branch container
                if(branchContainer) branchContainer.remove();
                
                if (t.level >= MAX_LEVEL) {
                    btnUp.style.display = 'none';
                } else {
                    btnUp.style.display = 'block';
                    const cost = Math.floor((t.cost * GAME_CONFIG.costMult) * (t.level + 0.5));
                    
                    // Tiers 1-4 are always unlocked - no level requirement
                    // Only tier 5 branch paths (A/B) require unlocking
                    btnUp.innerText = `UPGRADE ($${cost})`;
                    const myGold = (currentGamemode === 'separate') ? playerWallets[myPlayerIndex] : gold;
                    btnUp.disabled = (myGold < cost);
                    btnUp.style.opacity = btnUp.disabled ? 0.5 : 1;
                }
            }
            
            document.getElementById('val-sell').innerText = Math.floor((t.cost * GAME_CONFIG.costMult * t.level) * 0.6);
        }

        function onResize() { 
            camera.aspect = window.innerWidth/window.innerHeight; 
            camera.updateProjectionMatrix(); 
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // NEW: Update the Composer size too!
            if(composer) composer.setSize(window.innerWidth, window.innerHeight);
        }

	// --- MOBILE CONTROLS ---
        function initMobileControls() {
            const el = renderer.domElement;
            let touchStartX = 0;
            let touchStartY = 0;
            let initialPinchDist = 0;
            let initialCamY = 0;
            let hasMoved = false;
            let startTime = 0;

            el.addEventListener('touchstart', (e) => {
                // Don't prevent default on UI elements
                if(e.target !== el) return;
                e.preventDefault();
                
                hasMoved = false;
                startTime = Date.now();
                
                if(e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    
                    // Update mouse position for hover effect
                    mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                    mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                    onMM({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
                } 
                else if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    initialPinchDist = Math.sqrt(dx*dx + dy*dy);
                    initialCamY = camera.position.y;
                }
            }, {passive: false});

            el.addEventListener('touchmove', (e) => {
                if(e.target !== el) return;
                e.preventDefault();
                
                if(e.touches.length === 1) {
                    const dx = e.touches[0].clientX - touchStartX;
                    const dy = e.touches[0].clientY - touchStartY;
                    
                    // Only start panning if moved more than 10 pixels
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    if(distance > 10) {
                        hasMoved = true;
                        
                        // Pan camera
                        camera.position.x -= dx * 0.15;
                        camera.position.z -= dy * 0.15;
                        
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        
                        // Update hover while panning
                        mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                        mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                        onMM({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
                    }
                }
                else if (e.touches.length === 2) {
                    hasMoved = true;
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if(initialPinchDist > 0) {
                        const scale = initialPinchDist / dist;
                        camera.position.y = Math.max(30, Math.min(180, initialCamY * scale));
                    }
                }
            }, {passive: false});

            el.addEventListener('touchend', (e) => {
                if(e.target !== el) return;
                
                const touchDuration = Date.now() - startTime;
                
                // Only click if it was a quick tap and didn't move much
                if(!hasMoved && touchDuration < 300) {
                    onClick({ button: 0 });
                }
                
                hasMoved = false;
            }, {passive: false});
        }


// --- Trophy Road, Level-Select and menu navigation (Block 3) ---

/**
 * KARLO'S TD - PROGRESSION SYSTEM V5.5 - GAME JOLT EDITION
 * 
 * NEW IN V5.5:
 * - 30+ Achievements with Game Jolt sync
 * - "Kill" → "Destroy" terminology throughout
 * - Fixed tracking for towers, upgrades, waves, gold
 * - Creative achievements (AFK, Close Call, Speedrunner, etc.)
 * - Trophy bridge to Game Jolt API
 */

(function() {
    'use strict';

    function waitForGame() {
        if (typeof scene === 'undefined' || typeof TOWERS === 'undefined') {
            setTimeout(waitForGame, 100);
            return;
        }
        initProgression();
    }

    function initProgression() {
        console.log('🚀 Initializing Progression V5.5 - Game Jolt Edition...');

        // ============================================
        // GLOBAL STATE
        // ============================================
        if (!window.playerLevel) window.playerLevel = 1;
        if (!window.playerXP) window.playerXP = 0;
        if (!window.skillPoints) window.skillPoints = 0;
        
        if (!window.unlockedTowers) {
            window.unlockedTowers = ['gunner', 'sniper', 'ice'];
        }

        window.allTowers = ['gunner', 'sniper', 'ice', 'minigun', 'cannon', 'flamethrower', 'mortar', 'tesla', 'laser', 'plasma', 'farm'];
        
        // Tower unlock levels (10 towers)
        window.towerUnlockLevels = {
            'gunner': 1,   // Starter
            'sniper': 1,   // Starter  
            'ice': 1,      // Starter
            'minigun': 3,  // Level 3
            'cannon': 5,   // Level 5
	    'flamethrower': 7,   // Level 7
            'mortar': 10,   // Level 10
            'tesla': 13,   // Level 13
            'laser': 16,   // Level 16
            'plasma': 19,  // Level 19
            'farm': 22     // Level 22
        };

        // Branch upgrade unlock system
        if (!window.unlockedUpgrades) {
            window.unlockedUpgrades = {};
            allTowers.forEach(tower => {
                window.unlockedUpgrades[tower] = {
                    branch1: 0,
                    branch2: 0
                };
            });
        }

        // Calculate which level unlocks which branch for which tower
        window.branchUnlockLevels = {};
        allTowers.forEach((tower, index) => {
            window.branchUnlockLevels[tower] = {
                branch1: 21 + (index * 2),
                branch2: 21 + (index * 2) + 1
            };
        });

        // FIXED: Enhanced lifetime stats tracking
        if (!window.lifetimeStats) {
            window.lifetimeStats = {
                gamesPlayed: 0,
                gamesWon: 0,
                totalDestroys: 0,        // Changed from totalKills
                totalDamage: 0,
                totalGoldEarned: 0,
                highestWave: 0,
                towersBuilt: 0,          // NEW: Track towers built
                upgradesPurchased: 0,    // NEW: Track upgrades
                totalWavesCompleted: 0   // NEW: Track total waves across all games
            };
        }

        if (!window.sessionStats) {
            window.sessionStats = {
                destroys: 0,           // Changed from kills
                damage: 0,
                wavesCompleted: 0,
                towersBuilt: 0,
                upgrades: 0
            };
        }

        if (!window.skills) {
            window.skills = {
                economy: {
                    interest: { level: 0, max: 5, cost: 1, name: 'Interest Rate', desc: '+2% gold interest per wave' },
                    startGold: { level: 0, max: 5, cost: 1, name: 'Starting Capital', desc: '+100 starting gold' },
                    farmBoost: { level: 0, max: 5, cost: 1, name: 'Farm Efficiency', desc: '+20% farm income' }
                },
                combat: {
                    damage: { level: 0, max: 5, cost: 1, name: 'Power Boost', desc: '+5% tower damage' },
                    range: { level: 0, max: 5, cost: 1, name: 'Extended Range', desc: '+10% tower range' },
                    attackSpeed: { level: 0, max: 5, cost: 1, name: 'Rapid Fire', desc: '+10% attack speed' }
                },
                special: {
                    xpBoost:    { level: 0, max: 5, cost: 1, name: 'Experience Gain', desc: '+15% XP earned' },
                    sellValue:  { level: 0, max: 3, cost: 2, name: 'Salvage Expert',  desc: '+10% sell value' },
                    startLives: { level: 0, max: 3, cost: 2, name: 'Extra Lives',     desc: '+5 starting lives' }
                }
            };
        }

        // Achievement definitions are in progression-FINAL-v5.js (42 achievements)
        // Do NOT define window.achievements here — progression.js handles it

        if (!window.unlockedAchievements) {
            window.unlockedAchievements = [];
        }

        // ============================================
        // XP & LEVELING
        // ============================================
        window.xpForLevel = function(level) {
            return Math.floor(100 * Math.pow(1.15, level - 1));
        };

        // ============================================
        // TRACKING HOOKS - CRITICAL FOR ACHIEVEMENTS
        // ============================================
        
        // Hook into tower building
        window.trackTowerBuilt = function() {
            lifetimeStats.towersBuilt++;
            sessionStats.towersBuilt++;
            saveProgress();
            checkAchievements();
            
            // Update daily challenges
            if (typeof updateDailyChallenges === 'function') {
                updateDailyChallenges();
            }
        };

        // Hook into tower upgrades
        window.trackUpgrade = function() {
            lifetimeStats.upgradesPurchased++;
            sessionStats.upgrades++;
            saveProgress();
            checkAchievements();
            
            // Update daily challenges
            if (typeof updateDailyChallenges === 'function') {
                updateDailyChallenges();
            }
        };

        // Hook into enemy destruction
        window.trackEnemyDestroyed = function(goldValue = 0) {
            lifetimeStats.totalDestroys++;
            sessionStats.destroys++;
            
            if (goldValue > 0) {
                lifetimeStats.totalGoldEarned += goldValue;
            }
            
            saveProgress();
            checkAchievements();
            
            // Update daily challenges
            if (typeof updateDailyChallenges === 'function') {
                updateDailyChallenges();
            }
        };

        // Hook into wave completion
        window.trackWaveCompleted = function(waveNumber) {
            lifetimeStats.totalWavesCompleted++;
            sessionStats.wavesCompleted++;
            
            if (waveNumber > lifetimeStats.highestWave) {
                lifetimeStats.highestWave = waveNumber;
            }
            
            saveProgress();
            checkAchievements();
            
            // Update daily challenges
            if (typeof updateDailyChallenges === 'function') {
                updateDailyChallenges();
            }
        };

        // Hook into game completion
        window.trackGameWon = function(finalLives, totalTowers) {
            lifetimeStats.gamesWon++;
            
            // Check special achievements
            if (finalLives === 1) {
                unlockAchievement('close_call');
            }
            
            if (totalTowers < 10) {
                unlockAchievement('minimalist');
            }
            
            saveProgress();
            checkAchievements();
        };

        // ============================================
        // ACHIEVEMENT SYSTEM WITH GAME JOLT SYNC
        // ============================================
        window.checkAchievements = function() {
            if (!window.achievements) return;
            window.achievements.forEach(ach => {
                if (!ach.unlocked && !ach.tracked) {
                    if (ach.check && ach.check()) {
                        unlockAchievement(ach.id);
                    }
                }
            });
        };

        window.unlockAchievement = function(achId) {
            const ach = achievements.find(a => a.id === achId);
            if (!ach || ach.unlocked) return;

            ach.unlocked = true;
            unlockedAchievements.push(achId);

            console.log(`🏆 Achievement Unlocked: ${ach.name}`);
            
            // Show local popup
            showAchievementPopup(ach);

            // CRITICAL: Sync to Game Jolt
            if (typeof window.unlockTrophy === 'function') {
                window.unlockTrophy(achId);
            }

            saveProgress();
        };

        window.showAchievementPopup = function(ach) {
            const popup = document.createElement('div');
            popup.id = 'achievement-popup';
            popup.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #27ae60, #229954);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 8px 25px rgba(0,0,0,0.5);
                z-index: 1000000;
                animation: slideIn 0.5s ease-out;
                max-width: 350px;
            `;
            popup.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 48px;">${ach.icon}</div>
                    <div>
                        <div style="font-size: 14px; opacity: 0.9;">Achievement Unlocked!</div>
                        <div style="font-size: 20px; margin-top: 5px;">${ach.name}</div>
                        <div style="font-size: 14px; opacity: 0.8; margin-top: 3px;">${ach.desc}</div>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);

            setTimeout(() => {
                popup.style.animation = 'slideOut 0.5s ease-in';
                setTimeout(() => popup.remove(), 500);
            }, 4000);
        };

        // ============================================
        // SKILL TREE
        // ============================================
        window.unlockSkill = function(category, skill) {
            const s = skills[category][skill];
            if (s.level >= s.max) return alert('Max level!');
            if (skillPoints < s.cost) return alert('Not enough skill points!');

            skillPoints -= s.cost;
            s.level++;

            console.log(`✨ Unlocked ${s.name} Level ${s.level}`);
            updateSkillTree();
            saveProgress();
            
            // Apply bonuses immediately
            if (typeof applySkillBonuses === 'function') {
                applySkillBonuses();
            }
        };
        
        // ✅ APPLY SKILL BONUSES - Called when game starts (SINGLEPLAYER ONLY)
        window.applySkillBonuses = function() {
            // Block in multiplayer
            if (typeof window.isMultiplayerMode !== 'undefined' && window.isMultiplayerMode) return;
            if (typeof window.socket !== 'undefined' && window.socket && window.socket.connected &&
                typeof window.myRoomId !== 'undefined' && window.myRoomId) return;

            if (typeof window.gold === 'undefined' || typeof window.lives === 'undefined') {
                console.warn('⚠️ applySkillBonuses: game not ready yet');
                return;
            }

            try {
                // 1. Starting Gold bonus
                const startGoldLevel = (skills.economy && skills.economy.startGold) ? skills.economy.startGold.level : 0;
                if (startGoldLevel > 0) {
                    const bonus = startGoldLevel * 100;
                    window.gold += bonus;
                    const uiGold = document.getElementById('ui-gold');
                    if (uiGold) uiGold.innerText = Math.floor(window.gold);
                    console.log(`💰 Starting gold bonus: +${bonus}`);
                }

                // 2. Starting Lives bonus — support both key names (startLives / lives)
                const livesSkill = skills.special && (skills.special.startLives || skills.special.lives);
                if (livesSkill && livesSkill.level > 0) {
                    const bonus = livesSkill.level * 5;
                    window.lives += bonus;
                    const uiLives = document.getElementById('ui-lives');
                    if (uiLives) uiLives.innerText = Math.floor(window.lives);
                    console.log(`❤️ Extra lives bonus: +${bonus}`);
                }

                console.log('✅ Skill bonuses applied');
            } catch(e) {
                console.warn('applySkillBonuses error:', e);
            }
        };
        
        // Get skill multipliers for game mechanics
        window.getSkillMultipliers = function() {
            // CRITICAL: Disable skill bonuses in multiplayer mode
            if (typeof window.isMultiplayerMode !== 'undefined' && window.isMultiplayerMode) {
                return { damage: 1, range: 1, attackSpeed: 1, farmIncome: 1, farmBoost: 1,
                         startGold: 0, extraLives: 0, interest: 0, sellValue: 0,
                         critChance: 0, multishotChance: 0 };
            }

            const s  = window.skills  || {};
            const ec = s.economy      || {};
            const cb = s.combat       || {};
            const sp = s.special      || {};

            // Support both key naming conventions between save formats
            const livesSkill = sp.startLives || sp.lives || { level: 0 };
            const sellSkill  = sp.sellValue  || { level: 0 };
            const farmBoost  = 1 + ((ec.farmBoost || { level: 0 }).level * 0.20);

            return {
                damage:          1 + ((cb.damage       || { level: 0 }).level * 0.05),
                range:           1 + ((cb.range        || { level: 0 }).level * 0.10),
                attackSpeed:     1 + ((cb.attackSpeed  || { level: 0 }).level * 0.10),
                farmIncome:      farmBoost,   // alias used by Game.js farm income tick
                farmBoost:       farmBoost,
                startGold:       (ec.startGold  || { level: 0 }).level * 100,
                extraLives:      livesSkill.level * 5,
                interest:        (ec.interest   || { level: 0 }).level * 0.02,
                sellValue:       sellSkill.level,   // raw level used in Game.js sell formula
                critChance:      0,
                multishotChance: 0
            };
        };

        // ============================================
        // UI UPDATES
        // ============================================
        window.updateXPBar = function() {
            const badge = document.getElementById('player-level-badge');
            const fill = document.getElementById('xp-bar-fill');
            const text = document.getElementById('xp-bar-text');

            if (badge) {
                badge.innerText = `LVL ${window.playerLevel}`;
            }
            
            const needed = window.xpForLevel(window.playerLevel + 1);
            const percent = (window.playerXP / needed) * 100;
            
            if (fill) {
                fill.style.width = `${percent}%`;
            }
            
            if (text) {
                text.innerText = `${window.playerXP} / ${needed} XP`;
            }
        };

        window.showLevelUpPopup = function() {
            console.log('🎉 showLevelUpPopup called for level', window.playerLevel);
            const earnedSP = (window.playerLevel % 5 === 0);
            
            const popup = document.createElement('div');
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0);
                background: linear-gradient(135deg, #9b59b6, #8e44ad);
                color: white;
                padding: 40px 60px;
                border-radius: 20px;
                font-size: 32px;
                font-weight: 900;
                text-align: center;
                box-shadow: 0 15px 40px rgba(0,0,0,0.7);
                z-index: 2000000;
                animation: popIn 0.6s ease-out forwards;
            `;
            popup.innerHTML = `
                <div style="font-size: 72px; margin-bottom: 15px;"><i class="fa-solid fa-star" style="color:#f1c40f"></i></div>
                <div>LEVEL UP!</div>
                <div style="font-size: 48px; margin-top: 10px;">Level ${window.playerLevel}</div>
                ${earnedSP ? '<div style="font-size: 18px; margin-top: 15px; opacity: 0.9; color: #f1c40f;"><i class="fa-solid fa-star" style="color:#f1c40f"></i> +1 Skill Point <i class="fa-solid fa-star" style="color:#f1c40f"></i></div>' : ''}
            `;
            document.body.appendChild(popup);
            console.log('✅ Level up popup added to DOM');

            setTimeout(() => {
                popup.style.animation = 'popOut 0.4s ease-in forwards';
                setTimeout(() => popup.remove(), 400);
            }, 2500);
        };

        window.showUnlockNotif = function(message) {
            const notif = document.createElement('div');
            notif.style.cssText = `
                position: fixed;
                top: 180px;
                right: 20px;
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                padding: 15px 25px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                z-index: 1000000;
                animation: slideIn 0.4s ease-out;
            `;
            notif.innerText = message;
            document.body.appendChild(notif);

            setTimeout(() => {
                notif.style.animation = 'slideOut 0.4s ease-in';
                setTimeout(() => notif.remove(), 400);
            }, 3000);
        };

        // Show achievement/challenge completion popup
        window.showAchievement = function(title, desc, reward) {
            const popup = document.createElement('div');
            popup.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #f39c12, #e67e22);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 8px 25px rgba(0,0,0,0.5);
                z-index: 1000000;
                animation: slideIn 0.5s ease-out;
                max-width: 350px;
            `;
            popup.innerHTML = `
                <div style="font-size: 14px; opacity: 0.9;">Challenge Complete!</div>
                <div style="font-size: 20px; margin-top: 5px;">${title}</div>
                <div style="font-size: 14px; opacity: 0.8; margin-top: 3px;">${desc}</div>
                <div style="font-size: 16px; margin-top: 8px; color: #2ecc71;"><i class="fa-solid fa-circle-check"></i> ${reward}</div>
            `;
            document.body.appendChild(popup);

            setTimeout(() => {
                popup.style.animation = 'slideOut 0.5s ease-in';
                setTimeout(() => popup.remove(), 500);
            }, 4000);
        };

        // ============================================
        // SAVE/LOAD
        // ============================================
        window.saveProgress = function() {
            const data = {
                playerLevel, playerXP, skillPoints,
                unlockedTowers, unlockedUpgrades, lifetimeStats,
                skills, unlockedAchievements, dailyChallenges
            };
            // FIXED: Use same key as progression-FINAL-v5.js (karlos_td_progression_v54)
            localStorage.setItem('karlos_td_progression_v54', JSON.stringify(data));
        };

        window.loadProgress = function() {
            // FIXED: Load from the correct key that matches savePlayerData()
            const saved = localStorage.getItem('karlos_td_progression_v54');
            if (!saved) return;

            try {
                const data = JSON.parse(saved);
                // Support both field name conventions (playerLevel vs level, etc.)
                window.playerLevel = data.playerLevel || data.level || 1;
                window.playerXP = data.playerXP || data.xp || 0;
                window.skillPoints = data.skillPoints || 0;
                window.unlockedTowers = data.unlockedTowers || ['gunner', 'sniper', 'ice'];
                window.unlockedUpgrades = data.unlockedUpgrades || {};
                window.dailyChallenges = data.dailyChallenges || [];
                window.lifetimeStats = data.lifetimeStats || {
                    gamesPlayed: 0, gamesWon: 0, totalDestroys: 0,
                    totalDamage: 0, totalGoldEarned: 0, highestWave: 0,
                    towersBuilt: 0, upgradesPurchased: 0, totalWavesCompleted: 0
                };
                window.unlockedAchievements = data.unlockedAchievements || [];

                // Merge skill LEVELS only — never overwrite name/desc/max/cost
                // Prevents "undefined" skill names in the UI after loading
                if (data.skills && window.skills) {
                    Object.keys(window.skills).forEach(cat => {
                        if (data.skills[cat]) {
                            Object.keys(window.skills[cat]).forEach(key => {
                                const saved = data.skills[cat][key];
                                if (saved !== undefined) {
                                    window.skills[cat][key].level =
                                        (typeof saved === 'object' ? saved.level : saved) || 0;
                                }
                            });
                        }
                    });
                }

                // Mark achievements as unlocked
                window.unlockedAchievements.forEach(achId => {
                    const ach = window.achievements && window.achievements.find(a => a.id === achId);
                    if (ach) ach.unlocked = true;
                });

                console.log('✅ Progress loaded');
            } catch (e) {
                console.error('Failed to load progress:', e);
            }
        };

        // ============================================
        // INITIALIZE
        // ============================================
        loadProgress();
        updateXPBar();
        checkAchievements();
        
        // Delayed XP bar update to ensure it shows after all scripts load
        setTimeout(() => {
            if (typeof window.updateXPBar === 'function') {
                window.updateXPBar();
                console.log('🔄 XP bar updated after delayed init');
            }
        }, 500);

        // Add CSS animations
        if (!document.getElementById('achievement-animations')) {
            const style = document.createElement('style');
            style.id = 'achievement-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
                @keyframes popIn {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes popOut {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        console.log('✅ Progression V5.5 initialized with 30+ achievements');
        
        // ============================================
        // DAILY CHALLENGES SYSTEM
        // ============================================
        
        if (!window.dailyChallenges) {
            window.dailyChallenges = [];
        }
        
        // All possible challenges (20+)
        window.challengePool = [
            // KILL CHALLENGES (5)
            { name: 'Rookie Hunter', desc: 'Kill 100 enemies', progress: 0, target: 100, reward: '150 XP', completed: false, track: 'kills' },
            { name: 'Sharpshooter', desc: 'Kill 200 enemies', progress: 0, target: 200, reward: '300 XP', completed: false, track: 'kills' },
            { name: 'Mass Destruction', desc: 'Kill 300 enemies', progress: 0, target: 300, reward: '500 XP + 1 SP', completed: false, track: 'kills' },
            { name: 'Exterminator', desc: 'Kill 150 enemies', progress: 0, target: 150, reward: '250 XP', completed: false, track: 'kills' },
            { name: 'Elite Slayer', desc: 'Kill 250 enemies', progress: 0, target: 250, reward: '400 XP + 1 SP', completed: false, track: 'kills' },
            
            // TOWER CHALLENGES (5)
            { name: 'Builder Apprentice', desc: 'Build 10 towers', progress: 0, target: 10, reward: '150 XP', completed: false, track: 'towers' },
            { name: 'Tower Master', desc: 'Build 15 towers', progress: 0, target: 15, reward: '200 XP', completed: false, track: 'towers' },
            { name: 'Defense Architect', desc: 'Build 20 towers', progress: 0, target: 20, reward: '300 XP + 1 SP', completed: false, track: 'towers' },
            { name: 'Fortress Builder', desc: 'Build 12 towers', progress: 0, target: 12, reward: '175 XP', completed: false, track: 'towers' },
            { name: 'Strategic Placer', desc: 'Build 18 towers', progress: 0, target: 18, reward: '250 XP', completed: false, track: 'towers' },
            
            // WAVE CHALLENGES (5)
            { name: 'Wave Warrior', desc: 'Complete 10 waves', progress: 0, target: 10, reward: '150 XP', completed: false, track: 'waves' },
            { name: 'Survivor', desc: 'Complete 15 waves', progress: 0, target: 15, reward: '200 XP', completed: false, track: 'waves' },
            { name: 'Marathon Runner', desc: 'Complete 20 waves', progress: 0, target: 20, reward: '300 XP + 1 SP', completed: false, track: 'waves' },
            { name: 'Endurance Test', desc: 'Complete 25 waves', progress: 0, target: 25, reward: '400 XP + 1 SP', completed: false, track: 'waves' },
            { name: 'Wave Master', desc: 'Complete 12 waves', progress: 0, target: 12, reward: '175 XP', completed: false, track: 'waves' },
            
            // DAMAGE CHALLENGES (5)
            { name: 'Damage Dealer', desc: 'Deal 50,000 damage', progress: 0, target: 50000, reward: '200 XP', completed: false, track: 'damage' },
            { name: 'Heavy Artillery', desc: 'Deal 100,000 damage', progress: 0, target: 100000, reward: '300 XP + 1 SP', completed: false, track: 'damage' },
            { name: 'Destruction Expert', desc: 'Deal 75,000 damage', progress: 0, target: 75000, reward: '250 XP', completed: false, track: 'damage' },
            { name: 'Overwhelming Force', desc: 'Deal 150,000 damage', progress: 0, target: 150000, reward: '500 XP + 2 SP', completed: false, track: 'damage' },
            { name: 'Power House', desc: 'Deal 60,000 damage', progress: 0, target: 60000, reward: '225 XP', completed: false, track: 'damage' },
            
            // UPGRADE CHALLENGES (3)
            { name: 'Upgrade Novice', desc: 'Upgrade 5 towers', progress: 0, target: 5, reward: '150 XP', completed: false, track: 'upgrades' },
            { name: 'Power Up', desc: 'Upgrade 10 towers', progress: 0, target: 10, reward: '250 XP', completed: false, track: 'upgrades' },
            { name: 'Max Power', desc: 'Upgrade 15 towers', progress: 0, target: 15, reward: '350 XP + 1 SP', completed: false, track: 'upgrades' }
        ];
        
        // Get today's date string
        window.getTodayDateString = function() {
            const now = new Date();
            const cetOffset = 1;
            const cetTime = new Date(now.getTime() + (cetOffset * 60 * 60 * 1000));
            
            const year = cetTime.getUTCFullYear();
            const month = cetTime.getUTCMonth();
            const day = cetTime.getUTCDate();
            const hour = cetTime.getUTCHours();
            
            const adjustedDate = new Date(Date.UTC(year, month, day));
            if (hour < 11) {
                adjustedDate.setUTCDate(adjustedDate.getUTCDate() - 1);
            }
            
            return adjustedDate.toISOString().split('T')[0];
        };
        
        // Generate 3 random challenges for today
        window.generateDailyChallenges = function() {
            const dateString = getTodayDateString();
            
            let seed = 0;
            for (let i = 0; i < dateString.length; i++) {
                seed = ((seed << 5) - seed) + dateString.charCodeAt(i);
                seed = seed & seed;
            }
            
            const seededRandom = function() {
                seed = (seed * 9301 + 49297) % 233280;
                return seed / 233280;
            };
            
            const shuffled = [...challengePool];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            const selected = [];
            const usedTracks = new Set();
            
            for (const challenge of shuffled) {
                if (selected.length >= 3) break;
                
                if (selected.length < 2 || !usedTracks.has(challenge.track)) {
                    selected.push({...challenge});
                    usedTracks.add(challenge.track);
                }
            }
            
            while (selected.length < 3 && selected.length < shuffled.length) {
                const next = shuffled.find(c => !selected.includes(c));
                if (next) selected.push({...next});
            }
            
            return selected;
        };
        
        // Initialize or refresh daily challenges
        window.initDailyChallenges = function() {
            const today = getTodayDateString();
            const lastRefresh = localStorage.getItem('karlos_td_challenge_date');
            
            if (lastRefresh !== today || !window.dailyChallenges || window.dailyChallenges.length === 0) {
                console.log(`📅 New day detected! Generating fresh challenges for ${today}`);
                window.dailyChallenges = generateDailyChallenges();
                localStorage.setItem('karlos_td_challenge_date', today);
                saveProgress();
            } else {
                console.log(`✅ Challenges already set for today (${today})`);
            }
        };
        
        // Update challenge progress
        window.updateDailyChallenges = function() {
            if (!window.dailyChallenges || window.dailyChallenges.length === 0) return;
            
            dailyChallenges.forEach(challenge => {
                if (challenge.completed) return;
                
                let current = 0;
                switch(challenge.track) {
                    case 'kills':
                        current = sessionStats.destroys || 0;
                        break;
                    case 'towers':
                        current = sessionStats.towersBuilt || 0;
                        break;
                    case 'waves':
                        current = sessionStats.wavesCompleted || 0;
                        break;
                    case 'damage':
                        current = sessionStats.damage || 0;
                        break;
                    case 'upgrades':
                        current = sessionStats.upgrades || 0;
                        break;
                }
                
                challenge.progress = Math.min(current, challenge.target);
                
                if (challenge.progress >= challenge.target && !challenge.completed) {
                    challenge.completed = true;
                    
                    // Parse reward
                    const rewardMatch = challenge.reward.match(/(\d+)\s*XP/);
                    const spMatch = challenge.reward.match(/(\d+)\s*SP/);
                    
                    if (rewardMatch) {
                        const xp = parseInt(rewardMatch[1]);
                        addXP(xp);
                        showFloatingText(`+${xp} XP`, 'xp');
                    }
                    
                    if (spMatch) {
                        const sp = parseInt(spMatch[1]);
                        skillPoints += sp;
                        showFloatingText(`+${sp} SP`, 'sp');
                    }
                    
                    console.log(`🎉 Daily Challenge Complete: ${challenge.name}`);
                    saveProgress();
                }
            });
        };
        
        // Initialize challenges on game load
        initDailyChallenges();
        
        console.log('✅ Daily Challenges system initialized');
    }

    // Start initialization
    waitForGame();
})();

// --- Skill Tree and Daily Challenges (Block 4) ---

// ============================================
// MISSING FUNCTIONS - ADD THEM GLOBALLY
// ============================================

/**
 * Update Skill Tree Display
 * Called when skill tree modal opens
 */
window.updateSkillTree = function() {
    console.log('🌳 Updating skill tree display...');
    const container = document.getElementById('skill-tree-container');
    if (!container) {
        console.error('❌ skill-tree-container not found');
        return;
    }
    
    // Update skill points display
    const spCount = document.getElementById('skill-points-count');
    if (spCount) spCount.innerText = window.skillPoints || 0;
    
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="color: #f39c12;">Skill Points: ${window.skillPoints || 0}</h3>
        </div>
    `;
    
    if (!window.skills) {
        container.innerHTML += '<p style="color: #e74c3c;">Skills not loaded yet. Please restart the game.</p>';
        return;
    }
    
    Object.keys(window.skills).forEach(category => {
        const catDiv = document.createElement('div');
        catDiv.style.cssText = 'background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-bottom: 15px;';
        
        const categoryIcons = {
            economy: '<i class="fa-solid fa-sack-dollar"></i>',
            combat: '<i class="fa-solid fa-hand-fist"></i>',
            special: '<i class="fa-solid fa-wand-magic-sparkles"></i>'
        };
        
        catDiv.innerHTML = `<h4 style="color: #3498db; text-transform: uppercase;">${categoryIcons[category] || ''} ${category}</h4>`;
        
        Object.keys(window.skills[category]).forEach(skillKey => {
            const skill = window.skills[category][skillKey];
            const skillDiv = document.createElement('div');
            skillDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 10px;';
            skillDiv.innerHTML = `
                <div>
                    <strong style="color: white;">${skill.name}</strong><br>
                    <small style="color: #aaa;">${skill.desc}</small><br>
                    <small style="color: #f39c12;">Level: ${skill.level}/${skill.max}</small>
                </div>
                <button class="btn" style="padding: 8px 15px; ${skill.level >= skill.max || (window.skillPoints || 0) < skill.cost ? 'opacity: 0.5; cursor: not-allowed;' : ''}" 
                    ${skill.level >= skill.max || (window.skillPoints || 0) < skill.cost ? 'disabled' : ''}
                    onclick="upgradeSkill('${category}', '${skillKey}')">
                    ${skill.level >= skill.max ? 'MAXED' : `Upgrade (${skill.cost} SP)`}
                </button>
            `;
            catDiv.appendChild(skillDiv);
        });
        
        container.appendChild(catDiv);
    });
};

/**
 * Upgrade a skill
 */
window.upgradeSkill = function(category, skillKey) {
    if (!window.skills || !window.skills[category] || !window.skills[category][skillKey]) return;
    
    const skill = window.skills[category][skillKey];
    if (skill.level >= skill.max || (window.skillPoints || 0) < skill.cost) return;
    
    window.skillPoints -= skill.cost;
    skill.level++;
    
    if (typeof window.saveProgress === 'function') {
        window.saveProgress();
    }
    
    updateSkillTree();
    if (typeof window.updateXPBar === 'function') {
        window.updateXPBar();
    }
    
    console.log(`✅ Upgraded ${skill.name} to level ${skill.level}`);
};

/**
 * Generate Daily Challenge
 */
window.generateDailyChallenge = function() {
    console.log('📅 Generating daily challenge...');
    const today = new Date().toDateString();
    
    if (window.dailyChallenges && window.dailyChallenges.length > 0 && window.dailyChallenges[0].date === today) {
        return window.dailyChallenges[0];
    }
    
    const challenges = [
        { type: 'destroys', target: 50, desc: 'Destroy 50 enemies', reward: '100 XP', icon: '<i class="fa-solid fa-skull"></i>' },
        { type: 'waves', target: 10, desc: 'Survive 10 waves', reward: '150 XP', icon: '<i class="fa-solid fa-water"></i>' },
        { type: 'noLoss', target: 1, desc: 'Complete a game without losing lives', reward: '200 XP', icon: '<i class="fa-solid fa-heart" style="color:#e74c3c"></i>' },
        { type: 'gold', target: 5000, desc: 'Earn 5,000 gold in one game', reward: '120 XP', icon: '<i class="fa-solid fa-sack-dollar"></i>' },
        { type: 'towers', target: 20, desc: 'Build 20 towers in one game', reward: '100 XP', icon: '<i class="fa-solid fa-tower-observation"></i>' }
    ];
    
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];
    challenge.date = today;
    challenge.progress = 0;
    challenge.completed = false;
    
    if (!window.dailyChallenges) window.dailyChallenges = [];
    window.dailyChallenges = [challenge];
    
    if (typeof window.saveProgress === 'function') {
        window.saveProgress();
    }
    
    return challenge;
};

/**
 * Update Daily Challenge Display
 */
window.updateDailyChallenges = function() {
    const container = document.getElementById('challenges-container');
    if (!container) return;
    
    const challenge = generateDailyChallenge();
    const progressPct = Math.min((challenge.progress / challenge.target * 100), 100);
    
    container.innerHTML = `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <div style="font-size: 48px; text-align: center; margin-bottom: 10px;">${challenge.icon || '<i class="fa-solid fa-clipboard"></i>'}</div>
            <h3 style="color: #f39c12; margin: 0 0 10px 0; text-align: center;"><i class="fa-solid fa-calendar"></i> Daily Challenge</h3>
            <p style="font-size: 18px; margin: 0 0 15px 0; text-align: center;">${challenge.desc}</p>
            <div style="background: rgba(0,0,0,0.3); padding: 3px; border-radius: 10px; margin-bottom: 10px;">
                <div style="
                    background: linear-gradient(90deg, #2ecc71, #27ae60);
                    height: 30px;
                    border-radius: 8px;
                    width: ${progressPct}%;
                    transition: width 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <span style="color: white; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${challenge.progress} / ${challenge.target}
                    </span>
                </div>
            </div>
            <p style="color: #2ecc71; margin: 10px 0 0 0; text-align: center; font-size: 16px;">
                ${challenge.completed ? '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> COMPLETED!' : `Reward: ${challenge.reward}`}
            </p>
        </div>
    `;
};
	// Prevent scrolling inside these panels from zooming the game camera
        ['tower-panel', 'tower-grid-container', 'inspect-panel', 'settings-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('wheel', function(e) {
                    e.stopPropagation(); // Stop the event from reaching the Game Camera
                }, { passive: false });
            }
        });

	function toggleHealthBars() {
            healthBarsEnabled = !healthBarsEnabled;
            document.getElementById('set-hp-btn').innerText = healthBarsEnabled ? "ON" : "OFF";
            saveSettings();
            
            // Apply immediately
            enemies.forEach(e => {
                if(e.hpGroup) e.hpGroup.visible = healthBarsEnabled;
            });
        }

        function setBloomStrength(val) {
            bloomStrength = val / 10; // Slider 0-50 becomes 0.0 - 5.0
            if(bloomPass) bloomPass.strength = bloomStrength;
            saveSettings();
        }

        function setFOV(val) {
            cameraFOV = parseInt(val);
            camera.fov = cameraFOV;
            camera.updateProjectionMatrix();
            saveSettings();
        }

	function startPreview(key, isEnemy) {
            const container = document.getElementById('preview-stage');
            if(!container) return;

            if(previewModel) previewScene.remove(previewModel);
            isPreviewing = false;

            setTimeout(() => {
                const w = container.clientWidth || 300; 
                const h = container.clientHeight || 200;
                if (w === 0 || h === 0) return; 

                previewRenderer.setSize(w, h);
                previewCam.aspect = w / h;
                previewCam.updateProjectionMatrix();
                
                container.innerHTML = '';
                container.appendChild(previewRenderer.domElement);

                // Create & Center Model
                if(isEnemy) {
                    const def = ENEMIES[key];
                    previewModel = createEnemyModel(key, def.color, 0.8); 
                } else {
                    previewModel = createTowerModel(key, 1);
                }
                
                // --- FIX: Center the preview model ---
                centerModel(previewModel);
                // -------------------------------------

                previewCam.position.set(0, 2, 6); // Move camera closer
                previewCam.lookAt(0, 0, 0);       // Look at absolute center

                previewScene.add(previewModel);
                isPreviewing = true;
            }, 50); 
        }

function showTowerDetails(key, t, maxLvl) {
    const det = document.getElementById('almanac-details');
    det.style.display = 'block';
    let html = `
                <div id="preview-stage" style="
                    width:100%; height:200px; 
                    background: radial-gradient(circle, #2c3e50 0%, #000 90%); 
                    border-radius:8px; margin-bottom:15px; 
                    display:flex; justify-content:center; align-items:center; 
                    border:1px solid #444; box-shadow: inset 0 0 20px #000;">
                </div>
                <h2 style="color:#${t.color.toString(16)}">${t.name}</h2>
            `;
    
    // --- NEW: Tower Descriptions ---
    let desc = "";
    switch(key) {
        case 'gunner':
            desc = "The basic tower. Reliable mid-range shooter with decent damage and fire rate.";
            break;
        case 'sniper':
            desc = "Long-range precision attacker with high single-target damage but slow rate of fire.";
            break;
        case 'minigun':
            desc = "Rapid-fire tower that unleashes constant bullets at close range, ideal for shredding fast enemies.";
            break;
        case 'mortar':
            desc = "Fires explosive shells that deal area damage — excellent for groups of enemies.";
            break;
        case 'laser':
            desc = "Continuous beam weapon. Deals constant direct damage over a short period to a single enemy.";
            break;
        case 'plasma':
            desc = "Launches slow, high-energy bursts that deal splash damage to multiple targets.";
            break;
        case 'ice':
            desc = "Freezes and slows enemies in range. Has a chance to stun and delay their movement.";
            break;
        case 'farm':
            desc = "Generates additional gold every few seconds. Boost your economy to build faster.";
            break;
	case 'tesla':
            desc = "Uses high-voltage arcs to zap enemies. The attack chains to nearby targets, making it great for clusters.";
            break;
        default:
            desc = "No description.";
    }

    html += `<p style="font-style:italic; color:#ccc">${desc}</p>`;

    // --- Existing Info ---
    html += `<p>Cost: $${t.cost} | Range: ${t.range} | Speed: ${t.rate}</p>`;
    if(key === 'ice') html += `<p style="color:#00cec9">Base: 0.5s Slow / 10% Stun</p>`;
    if(key === 'farm') html += `<p style="color:#2ecc71">Base: $40 / 5s</p>`;
    
    html += `<h3>Upgrades</h3>`;
    for(let i=1; i<=5; i++) {
        if(i <= maxLvl) {
            let d = t.dmg * Math.pow(1.5, i-1);
            let spd = t.rate * Math.pow(0.8, i-1);
            let extras = "";
            if(key==='ice') extras = ` | Slow ${ (0.5 + (i-1)*0.1).toFixed(1) }s`;
            if(key==='farm') extras = ` | Income $${ 40 + (i-1)*30 }`;
            if(key==='tesla') extras = ` | Chains: ${ t.chain + (i%2===0 && i>0 ? Math.floor(i/2) : Math.floor((i-1)/2)) }`;
            
            html += `<div style="margin-bottom:5px; color:#aaa;">Lvl ${i}: Dmg ${Math.floor(d)} | Spd ${spd.toFixed(2)}s${extras}</div>`;
        } else {
            html += `<div style="margin-bottom:5px; color:#444;">Lvl ${i}: Locked</div>`;
        }
    }
    det.innerHTML = html;
	startPreview(key, false);
}


        function showEnemyDetails(key, e) {
            const det = document.getElementById('almanac-details');
            det.style.display = 'block';
            
            // 1. Inject the "Preview Stage" div
            det.innerHTML = `
                <div id="preview-stage" style="
                    width:100%; height:200px; 
                    background: radial-gradient(circle, #2c3e50 0%, #000 90%); 
                    border-radius:8px; margin-bottom:15px; 
                    display:flex; justify-content:center; align-items:center; 
                    border:1px solid #444; box-shadow: inset 0 0 20px #000;">
                </div>
                <h2 style="color:#${e.color.toString(16)}">${key.toUpperCase()}</h2>
                <p>Base Health: ${e.hp}</p>
                <p>Speed: ${e.speed}</p>
                <p>Score: ${e.score}</p>
                ${e.type==='boss' ? '<p style="color:#e74c3c; font-weight:bold;">BOSS CLASS</p>' : ''}
            `;

            // 2. Activate the 3D Preview
            startPreview(key, true);
        }

	function openSettingsTab(tabName) {
            // 1. Hide all contents
            ['graphics', 'audio', 'gameplay', 'account'].forEach(t => {
                const content = document.getElementById('tab-content-' + t);
                const btn = document.getElementById('tab-btn-' + t);
                if (content) content.style.display = 'none';
                if (btn) btn.classList.remove('active');
            });

            // 2. Show selected content
            const sel = document.getElementById('tab-content-' + tabName);
            if (sel) sel.style.display = 'flex';
            const selBtn = document.getElementById('tab-btn-' + tabName);
            if (selBtn) selBtn.classList.add('active');

            // 3. If account tab opened, refresh it
            if (tabName === 'account' && typeof window._karloAuthUpdateSettingsTab === 'function') {
                window._karloAuthUpdateSettingsTab();
            }
        }

        // --- SETTINGS ---
        function showSettings() {
            if(document.getElementById('pause-menu').style.display === 'flex') prevMenu = 'pause';
            else prevMenu = 'main';
            
            // Save current graphics state before opening settings
            previousGraphicsMode = graphicsMode;
            previousShadowsEnabled = advancedGraphicsSettings.shadowsEnabled;
            pendingGraphicsChange = false;
            
            hideAllScreens();
            document.getElementById('settings-menu').style.display = 'flex';
            
            // Reset to Graphics tab by default
            openSettingsTab('graphics'); 
        }
        
        // ============================================================================
        // ✅ MISSING FUNCTIONS - SKILL TREE & TROPHY ROAD
        // ============================================================================
        
        function openSkillTree() {
            console.log('🌳 Opening skill tree...');
            hideAllScreens();
            const skillModal = document.getElementById('skill-tree-modal');
            if (skillModal) {
                skillModal.style.display = 'flex';
                
                // Update skill tree display
                if (typeof updateSkillTree === 'function') {
                    updateSkillTree();
                } else {
                    console.warn('⚠️ updateSkillTree function not found');
                }
            } else {
                console.error('❌ Skill tree modal not found in HTML!');
            }
        }
        
        
        function closeSkillTree() {
            const skillModal = document.getElementById('skill-tree-modal');
            if (skillModal) {
                skillModal.style.display = 'none';
            }
            document.getElementById('main-menu').style.display = 'flex';
        }
        
        function openTrophyRoad() {
            console.log('🏆 Opening trophy road...');
            const modal = document.getElementById('trophy-road-modal');
            if (modal) {
                modal.style.display = 'flex';
                buildTrophyRoadDisplay();
            } else {
                console.error('❌ Trophy road modal not found');
            }
        }
        
        function closeTrophyRoad() {
            const modal = document.getElementById('trophy-road-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
        
        function buildTrophyRoadDisplay() {
            const container = document.getElementById('trophy-road-container');
            if (!container) {
                console.error('Trophy road container not found');
                return;
            }
            
            if (typeof playerLevel === 'undefined') {
                container.innerHTML = '<p style="text-align:center; color:#fff; padding: 40px;"><i class="fa-solid fa-triangle-exclamation"></i> Progression system not loaded yet. Please wait...</p>';
                return;
            }
            
            let html = '<div style="padding: 20px; max-height: 70vh; overflow-y: auto;">';
            html += `<h2 style="color: #e67e22; text-align: center; margin-bottom: 10px; font-size: 32px;">Level ${playerLevel}</h2>`;
            html += `<p style="text-align: center; color: #bdc3c7; margin-bottom: 30px;">XP: ${playerXP} / ${typeof xpForLevel === 'function' ? xpForLevel(playerLevel + 1) : '???'}</p>`;
            
            // Tower Unlocks
            if (typeof towerUnlockLevels !== 'undefined') {
                html += '<h3 style="color: #3498db; margin-top: 30px; border-bottom: 2px solid #3498db; padding-bottom: 10px;"><i class="fa-solid fa-tower-observation"></i> Tower Unlocks</h3>';
                html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-top: 15px;">';
                
                Object.entries(towerUnlockLevels).sort((a, b) => a[1] - b[1]).forEach(([tower, level]) => {
                    const unlocked = playerLevel >= level;
                    const bgColor = unlocked ? 'rgba(46, 204, 113, 0.3)' : 'rgba(52, 73, 94, 0.5)';
                    const borderColor = unlocked ? '#2ecc71' : '#7f8c8d';
                    const textColor = unlocked ? '#2ecc71' : '#95a5a6';
                    
                    html += `
                        <div style="background: ${bgColor}; padding: 15px; border-radius: 10px; border: 2px solid ${borderColor}; text-align: center;">
                            <div style="font-size: 32px; margin-bottom: 5px;">${unlocked ? '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i>' : '<i class="fa-solid fa-lock"></i>'}</div>
                            <div style="font-weight: bold; color: ${textColor}; font-size: 14px; text-transform: uppercase;">${tower}</div>
                            <div style="font-size: 12px; color: #bdc3c7; margin-top: 5px;">Level ${level}</div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            // Branch Unlocks
            if (typeof branchUnlockLevels !== 'undefined') {
                html += '<h3 style="color: #9b59b6; margin-top: 40px; border-bottom: 2px solid #9b59b6; padding-bottom: 10px;"><i class="fa-solid fa-bolt"></i> Branch Upgrades (Tier 5)</h3>';
                html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; margin-top: 15px;">';
                
                Object.entries(branchUnlockLevels).sort((a, b) => a[1].branch1 - b[1].branch1).forEach(([tower, branches]) => {
                    const branch1Unlocked = playerLevel >= branches.branch1;
                    const branch2Unlocked = playerLevel >= branches.branch2;
                    const anyUnlocked = branch1Unlocked || branch2Unlocked;
                    
                    const bgColor = anyUnlocked ? 'rgba(155, 89, 182, 0.3)' : 'rgba(52, 73, 94, 0.5)';
                    const borderColor = anyUnlocked ? '#9b59b6' : '#7f8c8d';
                    
                    html += `
                        <div style="background: ${bgColor}; padding: 15px; border-radius: 10px; border: 2px solid ${borderColor};">
                            <div style="font-weight: bold; color: #ecf0f1; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">${tower}</div>
                            <div style="font-size: 12px; color: ${branch1Unlocked ? '#2ecc71' : '#95a5a6'}; margin-bottom: 5px;">
                                ${branch1Unlocked ? '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i>' : '<i class="fa-solid fa-lock"></i>'} Branch A (Level ${branches.branch1})
                            </div>
                            <div style="font-size: 12px; color: ${branch2Unlocked ? '#2ecc71' : '#95a5a6'};">
                                ${branch2Unlocked ? '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i>' : '<i class="fa-solid fa-lock"></i>'} Branch B (Level ${branches.branch2})
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            html += '</div>';
            container.innerHTML = html;
        }
        
        function showControls() {
            hideAllScreens();
            document.getElementById('controls-menu').style.display = 'flex';
        }
        function backFromSettings() {
            // Check if shadow state changed
            const currentShadowsEnabled = advancedGraphicsSettings.shadowsEnabled;
            const shadowStateChanged = (previousShadowsEnabled !== currentShadowsEnabled);
            
            // Check graphics mode categories
            const wasLowMedium = (previousGraphicsMode === 0 || previousGraphicsMode === 1);
            const isLowMedium = (graphicsMode === 0 || graphicsMode === 1);
            const wasHighUltra = (previousGraphicsMode === 2 || previousGraphicsMode === 3);
            const isHighUltra = (graphicsMode === 2 || graphicsMode === 3);
            const wasHigh = (previousGraphicsMode === 2);
            const isHigh = (graphicsMode === 2);
            const wasUltra = (previousGraphicsMode === 3);
            const isUltra = (graphicsMode === 3);
            const wasLow = (previousGraphicsMode === 0);
            const isLow = (graphicsMode === 0);
            const wasMedium = (previousGraphicsMode === 1);
            const isMedium = (graphicsMode === 1);
            
            // Check if this is a downgrade (HIGH/ULTRA → LOW/MEDIUM)
            const isDowngrade = wasHighUltra && isLowMedium;
            
            // Check if switching between LOW and MEDIUM (no popup needed)
            const switchingLowMedium = (wasLow && isMedium) || (wasMedium && isLow);
            
            // Show popup ONLY when:
            // 1. Going from LOW/MEDIUM → HIGH/ULTRA (upgrading)
            // 2. Going HIGH ↔ ULTRA (switching between high tier)
            // 3. Shadows changed via advanced settings (BUT NOT if it's a downgrade or LOW↔MEDIUM)
            // NO popup when going HIGH/ULTRA → LOW/MEDIUM (downgrading is fine)
            // NO popup when going LOW ↔ MEDIUM (switching low tier is fine)
            const upgradingToHighTier = wasLowMedium && isHighUltra;
            const switchingHighTier = (wasHigh && isUltra) || (wasUltra && isHigh);
            // Only include shadowStateChanged if it's NOT a downgrade and NOT LOW↔MEDIUM
            const needsRestart = upgradingToHighTier || switchingHighTier || (shadowStateChanged && !isDowngrade && !switchingLowMedium);
            
            // Only show if graphics mode actually changed or shadows changed (and not downgrading or LOW↔MEDIUM)
            if(needsRestart && (graphicsMode !== previousGraphicsMode || (shadowStateChanged && !isDowngrade && !switchingLowMedium))) {
                // Show restart warning popup
                pendingGraphicsChange = true;
                hideAllScreens();
                document.getElementById('graphics-restart-warning').style.display = 'flex';
                // Block background interaction
                document.body.style.overflow = 'hidden';
                // Prevent scrolling
                document.addEventListener('wheel', preventScroll, { passive: false });
                document.addEventListener('touchmove', preventScroll, { passive: false });
                return;
            }
            
            // Clean up event listeners if they were added
            document.removeEventListener('wheel', preventScroll);
            document.removeEventListener('touchmove', preventScroll);
            
            // No restart needed, proceed normally
            hideAllScreens();
            // Ensure graphics settings are applied when returning from settings
            if (typeof applyGraphicsSettings === 'function') {
                applyGraphicsSettings();
            }
            if(prevMenu === 'pause') {
                document.getElementById('pause-menu').style.display = 'flex';
                setGameUIVisible(true);
            } else {
                document.getElementById('main-menu').style.display = 'flex';
                // Show legal links in main menu
                const legalLinks = document.getElementById('legal-links');
                if(legalLinks) legalLinks.style.display = 'block';
            }
        }
        
        function confirmGraphicsRestart() {
            // Hide first popup, show confirmation popup
            document.getElementById('graphics-restart-warning').style.display = 'none';
            document.getElementById('graphics-restart-confirm').style.display = 'flex';
        }
        
        function preventScroll(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        
        function cancelGraphicsChange() {
            // Revert graphics settings to previous state
            graphicsMode = previousGraphicsMode;
            applyGraphicsPreset(previousGraphicsMode);
            
            // Hide popups
            document.getElementById('graphics-restart-warning').style.display = 'none';
            document.getElementById('graphics-restart-confirm').style.display = 'none';
            document.body.style.overflow = '';
            
            // Remove scroll prevention
            document.removeEventListener('wheel', preventScroll);
            document.removeEventListener('touchmove', preventScroll);
            
            // Return to settings menu
            hideAllScreens();
            document.getElementById('settings-menu').style.display = 'flex';
            openSettingsTab('graphics');
        }
        
        function proceedWithRestart() {
            // Remove scroll prevention before reload
            document.removeEventListener('wheel', preventScroll);
            document.removeEventListener('touchmove', preventScroll);
            // Save settings before restart
            saveSettings();
            // Reload the page
            window.location.reload();
        }
        function toggleSettingsSound() {
            const m = AudioSys.toggle();
            // This is old toggle logic, sliders handle this now. Kept for safety.
        }
        function toggleGraphics() {
            graphicsMode = (graphicsMode + 1) % 4; // 0=Low, 1=Medium, 2=High, 3=Ultra (skip Custom when cycling)
            applyGraphicsPreset(graphicsMode);
        }
        
        function applyGraphicsPreset(preset) {
            const btn = document.getElementById('set-gfx-btn');
            if (!btn) return;
            
            graphicsMode = preset;
            let presetName = '';
            
            if (preset === 0) { // LOW
                presetName = "LOW";
                advancedGraphicsSettings = {
                    shadowsEnabled: false, shadowResolution: 512, shadowSoftness: 0,
                    lightingQuality: 0.5, bloomEnabled: false, bloomIntensity: 0,
                    ssaoEnabled: false, ssaoIntensity: 0, motionBlurEnabled: false,
                    motionBlurStrength: 0, dofEnabled: false, dofStrength: 0,
                    particleMultiplier: 0.5, postProcessingEnabled: false,
                    renderDistance: 0.7, lodBias: 0.5, pixelRatio: 0.75,
                    antiAliasing: false, colorCorrection: false
                };
            } else if (preset === 1) { // MEDIUM
                presetName = "MEDIUM";
                advancedGraphicsSettings = {
                    shadowsEnabled: true, shadowResolution: 1024, shadowSoftness: 0,
                    lightingQuality: 0.7, bloomEnabled: true, bloomIntensity: 1.0,
                    ssaoEnabled: false, ssaoIntensity: 0, motionBlurEnabled: false,
                    motionBlurStrength: 0, dofEnabled: false, dofStrength: 0,
                    particleMultiplier: 0.75, postProcessingEnabled: true,
                    renderDistance: 0.85, lodBias: 0.75, pixelRatio: 1.0,
                    antiAliasing: false, colorCorrection: false
                };
            } else if (preset === 2) { // HIGH
                presetName = "HIGH";
                advancedGraphicsSettings = {
                    shadowsEnabled: true, shadowResolution: 2048, shadowSoftness: 1,
                    lightingQuality: 0.9, bloomEnabled: true, bloomIntensity: 1.3,
                    ssaoEnabled: true, ssaoIntensity: 0.8, motionBlurEnabled: false,
                    motionBlurStrength: 0.3, dofEnabled: false, dofStrength: 0.3,
                    particleMultiplier: 1.0, postProcessingEnabled: true,
                    renderDistance: 1.0, lodBias: 1.0, pixelRatio: 1.5,
                    antiAliasing: true, colorCorrection: true
                };
            } else if (preset === 3) { // ULTRA
                presetName = "ULTRA";
                advancedGraphicsSettings = {
                    shadowsEnabled: true, shadowResolution: 4096, shadowSoftness: 2,
                    lightingQuality: 1.0, bloomEnabled: true, bloomIntensity: 1.5,
                    ssaoEnabled: true, ssaoIntensity: 1.0, motionBlurEnabled: true,
                    motionBlurStrength: 0.5, dofEnabled: true, dofStrength: 0.5,
                    particleMultiplier: 1.5, postProcessingEnabled: true,
                    renderDistance: 1.2, lodBias: 1.2, pixelRatio: 2.0,
                    antiAliasing: true, colorCorrection: true
                };
            } else { // CUSTOM
                presetName = "CUSTOM";
            }
            
            btn.innerText = presetName;
            applyGraphicsSettings();
            if (typeof updateAdvancedUI === 'function') updateAdvancedUI();
            saveSettings();
        }
        
        function applyGraphicsSettings() {
            const s = advancedGraphicsSettings;
            shadowsEnabled = s.shadowsEnabled;
            
            if (renderer) {
                renderer.shadowMap.enabled = s.shadowsEnabled;
                if (s.shadowsEnabled) {
                    if (s.shadowSoftness === 0) renderer.shadowMap.type = THREE.BasicShadowMap;
                    else if (s.shadowSoftness === 1) renderer.shadowMap.type = THREE.PCFShadowMap;
                    else renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                }
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, s.pixelRatio));
            }
            
            scene.traverse(o => {
                if (o.isLight && o.shadow) {
                    o.shadow.mapSize.width = s.shadowResolution;
                    o.shadow.mapSize.height = s.shadowResolution;
                    o.shadow.needsUpdate = true;
                }
                if (o.isMesh) {
                    o.castShadow = s.shadowsEnabled;
                    o.receiveShadow = s.shadowsEnabled;
                }
                if (o.isLight) {
                    if (o.isAmbientLight) o.intensity = 0.3 + (s.lightingQuality * 0.2);
                    if (o.isDirectionalLight) o.intensity = 0.5 + (s.lightingQuality * 0.5);
                }
            });
            
            if (bloomPass) {
                bloomPass.enabled = s.bloomEnabled && s.postProcessingEnabled;
                bloomPass.strength = s.bloomIntensity;
                bloomPass.threshold = 0.85;
                bloomPass.radius = 0.4;
            }
            
            if (window.ssaoPass) window.ssaoPass.enabled = s.ssaoEnabled && s.postProcessingEnabled;
            if (window.smaaPass) window.smaaPass.enabled = s.antiAliasing && s.postProcessingEnabled;
            if (window.colorCorrectionPass) window.colorCorrectionPass.enabled = s.colorCorrection && s.postProcessingEnabled;
            
            if (scene.fog) scene.fog.density = 0.002 / s.renderDistance;
            
            console.log(`Graphics preset applied: ${graphicsMode === 4 ? 'CUSTOM' : ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'][graphicsMode]}`);
        }
        
        // Achievement System
        function checkAchievement(achievementId) {
            if (!achievementsData[achievementId]) return;
            const ach = achievementsData[achievementId];
            if (ach.unlocked) return;
            if (ach.progress >= ach.total) {
                ach.unlocked = true;
                showAchievementUnlock(achievementId);
                saveAchievements();
            }
        }
        
        function showAchievementUnlock(achievementId) {
            // Use live data from progression.js if available
            const liveAch = window.achievements && window.achievements.find(a => a.id === achievementId);
            const icon = liveAch ? liveAch.icon : ({
                first_blood:'<i class="fa-solid fa-skull"></i>',
                destroy_10:'<i class="fa-solid fa-bullseye"></i>',
                destroy_100:'<i class="fa-solid fa-skull"></i>',
                destroy_500:'<i class="fa-solid fa-gun"></i>',
                destroy_1k:'<i class="fa-solid fa-skull-crossbones"></i>',
                destroy_5k:'<i class="fa-solid fa-hand-fist"></i>',
                destroy_10k:'<i class="fa-solid fa-skull"></i>',
                destroy_50k:'<i class="fa-solid fa-face-angry"></i>',
                destroy_100k:'<i class="fa-solid fa-skull"></i>',
                wave_5:'<i class="fa-solid fa-seedling"></i>',
                wave_10:'<i class="fa-solid fa-shield-halved"></i>',
                wave_20:'<i class="fa-solid fa-trophy"></i>',
                wave_30:'<i class="fa-solid fa-medal"></i>',
                wave_40:'<i class="fa-solid fa-star"></i>',
                wave_60:'<i class="fa-solid fa-crown"></i>',
                wave_80:'<i class="fa-solid fa-star"></i>',
                wave_100:'<i class="fa-solid fa-star"></i>',
                wave_150:'<i class="fa-solid fa-bolt"></i>',
                gold_1k:'<i class="fa-solid fa-money-bill"></i>',
                gold_10k:'<i class="fa-solid fa-sack-dollar"></i>',
                gold_50k:'<i class="fa-solid fa-money-bill-wave"></i>',
                gold_100k:'<i class="fa-solid fa-gem"></i>',
                gold_500k:'<i class="fa-solid fa-crown"></i>',
                gold_1m:'<i class="fa-solid fa-building-columns"></i>',
                build_1:'<i class="fa-solid fa-helmet-safety"></i>',
                build_10:'<i class="fa-solid fa-hammer"></i>',
                build_50:'<i class="fa-solid fa-tower-observation"></i>',
                build_100:'<i class="fa-solid fa-gear"></i>',
                build_250:'<i class="fa-solid fa-helmet-safety"></i>',
                build_500:'<i class="fa-solid fa-helmet-safety"></i>',
                upgrade_50:'<i class="fa-solid fa-chart-line"></i>',
                upgrade_100:'<i class="fa-solid fa-arrow-up"></i>',
                first_win:'<i class="fa-solid fa-medal"></i>',
                win_5:'<i class="fa-solid fa-medal"></i>',
                win_10:'<i class="fa-solid fa-trophy"></i>',
                win_25:'<i class="fa-solid fa-medal"></i>',
                win_50:'<i class="fa-solid fa-crown"></i>',
                damage_10k:'<i class="fa-solid fa-star-of-life"></i>',
                damage_100k:'<i class="fa-solid fa-bomb"></i>',
                damage_500k:'<i class="fa-solid fa-fire"></i>',
                damage_1m:'<i class="fa-solid fa-rocket"></i>',
                damage_5m:'<i class="fa-solid fa-radiation"></i>',
                tower_master:'<i class="fa-solid fa-tower-observation"></i>',
                wave_warrior:'<i class="fa-solid fa-water"></i>',
                no_damage:'<i class="fa-solid fa-shield-halved"></i>',
                speed_demon:'<i class="fa-solid fa-bolt"></i>',
                collector:'<i class="fa-solid fa-box"></i>',
                survivor:'<i class="fa-solid fa-trophy"></i>',
                millionaire:'<i class="fa-solid fa-building-columns"></i>',
            }[achievementId] || '<i class="fa-solid fa-trophy"></i>');
            const name = liveAch ? liveAch.name : achievementId.replace(/_/g,' ');
            const popup = document.createElement('div');
            popup.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#27ae60,#229954);color:#fff;padding:20px;border-radius:14px;z-index:999999;font-size:18px;font-weight:bold;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:260px;animation:slideIn 0.4s ease;';
            popup.innerHTML = `<div style="font-size:40px;text-align:center;margin-bottom:6px;">${icon}</div><div style="font-size:11px;letter-spacing:2px;opacity:0.8;margin-bottom:4px;">ACHIEVEMENT UNLOCKED</div><div style="font-size:16px;">${name}</div>`;
            document.body.appendChild(popup);
            setTimeout(() => popup.remove(), 3500);
        }
        
	function openLegal(type) {
    const title = document.getElementById('legal-title');
    const content = document.getElementById('legal-content');
    const modal = document.getElementById('legal-modal');

    if (type === 'terms') {
        title.innerText = "Terms of Service";
        content.innerHTML = `
        <strong>Last Updated: February 2026</strong><br><br>
        
        <strong>1. Acceptance of Terms</strong><br>
        By accessing and playing Karlos TD, you agree to be bound by these Terms of Service. If you do not agree, please do not use this game.<br><br>
        
        <strong>2. Game Usage</strong><br>
        • The game is provided "as is" for entertainment purposes<br>
        • You must be at least 12 years old to play<br>
        • You are responsible for your gameplay and account actions<br>
        • No warranties are made regarding availability, performance, or features<br><br>
        
        <strong>3. Intellectual Property</strong><br>
        • Karlos TD, including all game code, graphics, audio, and design elements, is owned by the game developer<br>
        • You retain ownership of gameplay strategies, tower placement patterns, and user-generated content<br>
        • You may not copy, modify, distribute, or create derivative works of the game without permission<br>
        • Screenshots and gameplay videos for personal use are permitted<br><br>
        
        <strong>4. Prohibited Conduct</strong><br>
        You agree NOT to:<br>
        • Exploit bugs, glitches, or game vulnerabilities<br>
        • Use cheats, hacks, or third-party software to gain unfair advantages<br>
        • Harass, abuse, or disrupt other players in multiplayer mode<br>
        • Attempt to access unauthorized areas or data<br>
        • Use offensive names or communicate inappropriately<br>
        • Reverse engineer, decompile, or disassemble the game code<br><br>
        
        <strong>5. Multiplayer & User Content</strong><br>
        • Multiplayer sessions are temporary and may be terminated at any time<br>
        • We reserve the right to remove players who violate these terms<br>
        • You retain ownership of any gameplay strategies or tower placements<br>
        • By playing multiplayer, you consent to interaction with other players<br>
        • We are not responsible for the conduct of other players in multiplayer sessions<br><br>
        
        <strong>6. Modifications & Updates</strong><br>
        • We may update game features, balance, or content without notice<br>
        • Progression data may be reset during major updates (we will attempt to notify users when possible)<br>
        • These terms may change; continued use means acceptance<br>
        • We reserve the right to modify, suspend, or discontinue any aspect of the game<br><br>
        
        <strong>7. Limitation of Liability</strong><br>
        • The game is provided "as is" without warranties of any kind<br>
        • We are not liable for any indirect, incidental, or consequential damages<br>
        • Our total liability is limited to the amount you paid for the game (if any)<br>
        • No guarantee of uninterrupted service or data persistence<br>
        • Not responsible for loss of progress, items, or achievements due to technical issues<br><br>
        
        <strong>8. Termination</strong><br>
        • We may terminate or suspend your access to the game at any time for violations of these terms<br>
        • You may stop playing at any time<br>
        • Upon termination, your local game data may be deleted<br>
        • Multiplayer sessions may be terminated without notice<br><br>
        
        <strong>9. Disclaimers</strong><br>
        • Platform features (like CrazyGames) operate under their own terms<br>
        • Third-party services integrated into the game have their own terms and privacy policies<br>
        • We are not responsible for third-party platform outages or issues<br><br>
        
        <strong>10. Governing Law</strong><br>
        • These terms are governed by applicable local laws<br>
        • Any disputes will be resolved through appropriate legal channels<br>
        • If any provision is found unenforceable, the remaining provisions remain in effect<br><br>
        
        <strong>11. Contact</strong><br>
        For questions or concerns, visit: <a href="https://k4rl0.itch.io/karlos-td" target="_blank" style="color:#3498db;">k4rl0.itch.io/karlos-td</a>
        `;
    }

    if (type === 'privacy') {
        title.innerText = "Privacy Policy";
        content.innerHTML = `
        <strong>Last Updated: February 2026</strong><br><br>
        
        <strong>1. Information We Collect</strong><br>
        Karlos TD is designed to respect your privacy. We collect minimal information:<br><br>
        
        <strong>Locally Stored Data (Your Device Only):</strong><br>
        • Game progression and unlocked towers<br>
        • Settings preferences (audio, graphics, controls)<br>
        • Achievement progress and statistics<br>
        • Player level and experience points<br>
        • Skill tree progress and skill point allocations<br>
        <em>This data stays on your device and is never transmitted to our servers.</em><br><br>
        
        <strong>Multiplayer Session Data (Temporary):</strong><br>
        • Player display name (chosen by you)<br>
        • Temporary room codes and session identifiers<br>
        • Real-time gameplay actions (tower placement, wave progress)<br>
        • Connection quality metrics (ping, latency)<br>
        <em>This data is deleted when the multiplayer session ends and is not stored permanently.</em><br><br>
        
        <strong>2. Cookies & Local Storage</strong><br>
        • The game uses browser localStorage to save your game progress and settings<br>
        • No tracking cookies are used by the game itself<br>
        • You can clear your browser's localStorage to delete all game data<br>
        • Third-party platforms (like CrazyGames) may use their own cookies - see their privacy policies<br><br>
        
        <strong>3. What We Do NOT Collect</strong><br>
        • Personal identification (real names, emails, phone numbers)<br>
        • Passwords or login credentials<br>
        • IP addresses or precise location data<br>
        • Financial or payment information<br>
        • Browsing history or external data<br>
        • Device identifiers or advertising IDs<br>
        • Biometric data or sensitive personal information<br><br>
        
        <strong>4. Third-Party Platforms</strong><br>
        If you play on CrazyGames or similar platforms:<br>
        • They may collect analytics for performance and engagement<br>
        • They operate under their own privacy policies<br>
        • We do not control or access their data collection<br>
        • Review their privacy policies: <a href="https://www.crazygames.com/privacy-policy" target="_blank" style="color:#3498db;">CrazyGames Privacy Policy</a><br>
        • GameJolt integration (if enabled) operates under GameJolt's privacy policy<br><br>
        
        <strong>5. Data Retention</strong><br>
        • Local game data persists until you clear your browser's localStorage<br>
        • Multiplayer session data is deleted immediately when sessions end<br>
        • No data is retained on our servers after multiplayer sessions conclude<br>
        • Achievement data is stored locally and can be cleared at any time<br><br>
        
        <strong>6. Children's Privacy</strong><br>
        • We do not knowingly collect data from children under 12<br>
        • No account creation or personal information required<br>
        • Parents: Game is safe for supervised play<br>
        • If you believe we have collected data from a child under 12, please contact us<br>
        • We comply with COPPA (Children's Online Privacy Protection Act) requirements<br><br>
        
        <strong>7. Data Security</strong><br>
        • Local data is stored using browser localStorage (encrypted by the browser)<br>
        • Multiplayer uses secure WebSocket connections (WSS) for encrypted communication<br>
        • No permanent servers store your personal data<br>
        • We implement reasonable security measures, but no system is 100% secure<br>
        • You are responsible for keeping your device secure<br><br>
        
        <strong>8. International Users</strong><br>
        • If you are in the European Economic Area (EEA), you have rights under GDPR<br>
        • If you are in California, you have rights under CCPA<br>
        • You can request access to, deletion of, or correction of your data<br>
        • To exercise these rights, clear your browser's localStorage or contact us<br>
        • We do not sell your personal data to third parties<br><br>
        
        <strong>9. Your Rights</strong><br>
        • <strong>Right to Access:</strong> View your local game data through browser developer tools<br>
        • <strong>Right to Deletion:</strong> Clear your browser data to delete local progression<br>
        • <strong>Right to Correction:</strong> Reset game progress or settings as needed<br>
        • <strong>Right to Portability:</strong> Export your save data (via browser localStorage)<br>
        • Close multiplayer sessions to remove temporary data<br>
        • Use incognito/private mode for no data storage<br><br>
        
        <strong>10. Changes to This Policy</strong><br>
        • We may update this privacy policy from time to time<br>
        • Changes will be reflected in the "Last Updated" date at the top<br>
        • Significant changes will be communicated through the game or our website<br>
        • Continued use of the game after changes means you accept the updated policy<br>
        • We encourage you to review this policy periodically<br><br>
        
        <strong>11. Contact & Updates</strong><br>
        For privacy questions or to exercise your rights: <a href="https://k4rl0.itch.io/karlos-td" target="_blank" style="color:#3498db;">k4rl0.itch.io/karlos-td</a><br>
        We will respond to privacy inquiries within a reasonable timeframe.
        `;
    }

    modal.style.display = "flex";
}

function closeLegal() {
    document.getElementById('legal-modal').style.display = "none";
}

        function trackKill() {
            totalKills++;
            achievementsData.first_blood.progress = Math.max(1, achievementsData.first_blood.progress);
            checkAchievement('first_blood');
            saveAchievements();
        }
        
        function trackTowerBuild() {
            if (achievementsData.tower_master.progress < towers.length) {
                achievementsData.tower_master.progress = towers.length;
                checkAchievement('tower_master');
            }
            saveAchievements();
        }
        
        function trackWaveComplete() {
            wavesCompleted++;
            achievementsData.wave_warrior.progress = wavesCompleted;
            achievementsData.survivor.progress = wavesCompleted;
            checkAchievement('wave_warrior');
            checkAchievement('survivor');
            saveAchievements();
        }
        
        function trackGoldEarned(amount) {
            totalGoldEarned += amount;
            if (achievementsData.millionaire) {
                achievementsData.millionaire.progress = totalGoldEarned;
                checkAchievement('millionaire');
                saveAchievements();
            }
            // Forward to progression system for gold challenges + achievements
            if (typeof window.trackGoldEarned === 'function') window.trackGoldEarned(amount);
        }
        
        function saveAchievements() {
            try {
                localStorage.setItem('achievements', JSON.stringify(achievementsData));
                localStorage.setItem('achievementStats', JSON.stringify({ totalKills, totalGoldEarned, wavesCompleted }));
            } catch(e) {}
        }
        
        function loadAchievements() {
            try {
                const saved = localStorage.getItem('achievements');
                if (saved) Object.assign(achievementsData, JSON.parse(saved));
                const stats = localStorage.getItem('achievementStats');
                if (stats) {
                    const s = JSON.parse(stats);
                    totalKills = s.totalKills || 0;
                    totalGoldEarned = s.totalGoldEarned || 0;
                    wavesCompleted = s.wavesCompleted || 0;
                }
            } catch(e) {}
        }
        
        function openAchievements() {
            const modal = document.getElementById('achievements-modal');
            if (modal) {
                modal.style.display = 'flex';
                refreshAchievementsUI();
            }
        }
        
        // Separate function to refresh the achievements list without opening the modal
        window.refreshAchievementsUI = function() {
            const list = document.getElementById('achievements-list');
            if (!list) return;
            
            list.innerHTML = '';
            
            // Use achievements from progression.js if available
            if (typeof window.achievements !== 'undefined' && window.achievements.length > 0) {
                console.log(`📋 Showing ${window.achievements.length} achievements from progression.js`);
                
                // Count unlocked achievements
                const unlockedCount = window.achievements.filter(ach => ach.unlocked).length;
                const totalCount = window.achievements.length;
                
                // Add progress header
                const header = document.createElement('div');
                header.style.cssText = `
                    background: linear-gradient(135deg, #9b59b6, #8e44ad);
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 15px;
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                `;
                header.innerHTML = `<i class="fa-solid fa-trophy"></i> ${unlockedCount}/${totalCount} Achievements Unlocked`;
                list.appendChild(header);
                
                window.achievements.forEach(ach => {
                    const item = document.createElement('div');
                    item.style.cssText = `background:${ach.unlocked ? '#2ecc71' : '#34495e'};padding:15px;border-radius:10px;display:flex;align-items:center;gap:15px;margin-bottom:10px;transition:all 0.3s;`;
                    item.innerHTML = `
                        <div style="font-size:30px;">${ach.icon}</div>
                        <div style="flex:1;">
                            <div style="font-weight:bold;font-size:16px;">${ach.name}</div>
                            <div style="font-size:14px;opacity:0.8;">${ach.desc}</div>
                        </div>
                        <div style="font-size:20px;">${ach.unlocked ? '<i class="fa-solid fa-check" style="color:#2ecc71"></i>' : '<i class="fa-solid fa-lock"></i>'}</div>
                    `;
                    list.appendChild(item);
                });
            } else {
                // Fallback to old system
                console.log('⚠️ Using fallback achievements (progression.js not loaded)');
                
                const achievements = {
                    first_blood: { name: "First Blood", desc: "Destroy your first enemy", icon: '<i class=\"fa-solid fa-skull\"></i>' },
                    tower_master: { name: "Tower Master", desc: "Build 10 towers", icon: '<i class=\"fa-solid fa-tower-observation\"></i>' },
                    wave_warrior: { name: "Wave Warrior", desc: "Complete 50 waves", icon: '<i class=\"fa-solid fa-water\"></i>' },
                    millionaire: { name: "Millionaire", desc: "Earn 1,000,000 gold total", icon: '<i class=\"fa-solid fa-sack-dollar\"></i>' },
                    no_damage: { name: "Untouchable", desc: "Complete a map without taking damage", icon: '<i class=\"fa-solid fa-shield-halved\"></i>' },
                    speed_demon: { name: "Speed Demon", desc: "Complete a wave in under 30 seconds", icon: '<i class=\"fa-solid fa-bolt\"></i>' },
                    collector: { name: "Collector", desc: "Unlock all 20 towers", icon: '<i class=\"fa-solid fa-box\"></i>' },
                    survivor: { name: "Survivor", desc: "Reach wave 100", icon: '<i class=\"fa-solid fa-trophy\"></i>' }
                };
                
                Object.keys(achievements).forEach(id => {
                    const ach = achievements[id];
                    const data = achievementsData[id];
                    const unlocked = data && data.unlocked;
                    const progress = data ? data.progress : 0;
                    const total = data ? data.total : 1;
                    
                    const item = document.createElement('div');
                    item.style.cssText = `background:${unlocked ? '#2ecc71' : '#34495e'};padding:15px;border-radius:10px;display:flex;align-items:center;gap:15px;`;
                    item.innerHTML = `
                        <div style="font-size:30px;">${ach.icon}</div>
                        <div style="flex:1;">
                            <div style="font-weight:bold;font-size:16px;">${ach.name}</div>
                            <div style="font-size:14px;opacity:0.8;">${ach.desc}</div>
                            ${!unlocked ? `<div style="font-size:12px;margin-top:5px;">Progress: ${progress}/${total}</div>` : ''}
                        </div>
                        <div style="font-size:20px;">${unlocked ? '<i class="fa-solid fa-check" style="color:#2ecc71"></i>' : '<i class="fa-solid fa-lock"></i>'}</div>
                    `;
                    list.appendChild(item);
                });
            }
        };
        
        function closeAchievements() {
            const modal = document.getElementById('achievements-modal');
            if (modal) modal.style.display = 'none';
        }
        
        // Advanced Graphics UI
        function openAdvancedGraphics() {
            const modal = document.getElementById('advanced-graphics-modal');
            if (modal) {
                modal.style.display = 'flex';
                updateAdvancedUI();
            }
        }
        
        function closeAdvancedGraphics() {
            const modal = document.getElementById('advanced-graphics-modal');
            if (modal) modal.style.display = 'none';
        }
        
        function updateAdvancedUI() {
            const s = advancedGraphicsSettings;
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            const setChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
            
            setChecked('adv-shadows', s.shadowsEnabled);
            setVal('adv-shadow-res', s.shadowResolution);
            setVal('adv-shadow-soft', s.shadowSoftness);
            setVal('adv-lighting', s.lightingQuality);
            setChecked('adv-bloom', s.bloomEnabled);
            setVal('adv-bloom-int', s.bloomIntensity);
            setChecked('adv-ssao', s.ssaoEnabled);
            setVal('adv-ssao-int', s.ssaoIntensity);
            setChecked('adv-post', s.postProcessingEnabled);
            setVal('adv-render-dist', s.renderDistance);
            setVal('adv-pixel', s.pixelRatio);
            setChecked('adv-aa', s.antiAliasing);
        }
        
        function updateAdvancedSetting(setting, value) {
            advancedGraphicsSettings[setting] = value;
            graphicsMode = 4; // Switch to CUSTOM
            const btn = document.getElementById('set-gfx-btn');
            if (btn) btn.innerText = "CUSTOM";
            applyGraphicsSettings();
            saveSettings();
            
            // Track if shadows were changed (for restart warning)
            if(setting === 'shadowsEnabled') {
                pendingGraphicsChange = (previousShadowsEnabled !== value);
            }
        }
	function toggleShake() {
            shakeEnabled = !shakeEnabled;
            document.getElementById('set-shake-btn').innerText = shakeEnabled ? "ON" : "OFF";
	    saveSettings(); // Save it!
        }

        function toggleDmgText() {
            dmgTextEnabled = !dmgTextEnabled;
            document.getElementById('set-dmg-btn').innerText = dmgTextEnabled ? "ON" : "OFF";
	    saveSettings(); // Save it!
        }
        
        // Helper to trigger shake (Call this when explosions happen!)
        let activeShake = null; // Track active shake interval
        
        function addTrauma(amount) {
    if(!shakeEnabled) return;
    
    // Clear any existing shake
    if(activeShake) {
        clearInterval(activeShake);
        activeShake = null;
    }

    // 1. Capture where the camera IS RIGHT NOW
    const startPos = camera.position.clone(); 
    
    const shakeDuration = 200; 
    const shakeIntensity = amount * 2; 

    activeShake = setInterval(() => {
        // 2. Shake relative to the SAVED position, not the current one
        // This prevents the camera from drifting away
        camera.position.x = startPos.x + (Math.random()-0.5) * shakeIntensity;
        camera.position.y = startPos.y + (Math.random()-0.5) * shakeIntensity;
        camera.position.z = startPos.z + (Math.random()-0.5) * shakeIntensity;
    }, 16);

    setTimeout(() => {
        clearInterval(activeShake);
        activeShake = null;
        // 3. Restore the camera to exactly where it was before the shake
        camera.position.copy(startPos); 
    }, shakeDuration);
}

// --- Game UI toggles, main menu, level select ---
        function toggleAutoStart() {
            autoWave = !autoWave;
            document.getElementById('set-auto-btn').innerText = autoWave ? "ON" : "OFF";
	    saveSettings(); // Save it!
        }
        
        function toggleFPSCounter() {
            showFPSCounter = !showFPSCounter;
            const btn = document.getElementById('set-fps-btn');
            const fpsEl = document.getElementById('fps-counter');
            
            if (btn) btn.innerText = showFPSCounter ? "ON" : "OFF";
            if (fpsEl) fpsEl.style.display = showFPSCounter ? 'block' : 'none';
            
            saveSettings(); // Save it!
        }

        // --- MENU NAVIGATION ---
        function goToMainMenu() {
            // Notify CrazyGames that gameplay stopped
            notifyGameplayStop();
            
            // Intentional leave — clear any saved room state so rejoin isn't offered
            if (typeof _clearRoomState === 'function') _clearRoomState();

            // Hide invite button when leaving multiplayer
            hideInviteButton();
            
            resetGame();
            loadMap(0); // Load dummy map for background
            
            // --- FIX: Reset game state ---
            gameRunning = false;
            isPaused = false;
            isMultiplayerMode = false;
            // -----------------------------
            
            // --- FIX: Re-enable XP bar clickability ---
            const xpBar = document.getElementById('player-level-container');
            if (xpBar) {
                xpBar.style.pointerEvents = 'auto';
                xpBar.style.cursor = 'pointer';
            }
            // -----------------------------------------
            
            // --- FIX: Reset Gamemode to Shared for Single Player ---
            currentGamemode = 'shared'; 
            // -------------------------------------------------------

            // --- FIX: RESTORE SINGLE PLAYER LOGIC ---
            // 1. Reset Map Selector to Single Player Mode
            window.selectMap = function(idx) {
                selectedMapIndex = idx;
                hideAllScreens();
                document.getElementById('diff-select').style.display = 'flex';
            }

            // 2. Reset Start Game to Single Player Mode
            window.startGame = function(diff) {
                hideAllScreens();
                setGameUIVisible(true);

		// --- NEW: Set Info Panel Text (Solo) ---
    		document.getElementById('info-map-name').innerText = MAPS[selectedMapIndex].name;
    		document.getElementById('info-diff').innerText = diff.toUpperCase();
    
    		// Color code difficulty
    		const diffColor = (diff==='easy'?'#2ecc71':(diff==='medium'?'#f1c40f':'#e74c3c'));
    		document.getElementById('info-diff').style.color = diffColor;
    
    		document.getElementById('info-mode').innerText = "SOLO";

                // Ensure Single Player uses Shared logic
                currentGamemode = 'shared';

                // Diff Config (original values restored)
                if(diff === 'easy') { GAME_CONFIG = { maxWaves:20, hpMult:0.7, costMult:0.85, gold:800 }; }
                else if(diff === 'medium') { GAME_CONFIG = { maxWaves:40, hpMult:0.9, costMult:1.0, gold:650 }; }
                else { GAME_CONFIG = { maxWaves:60, hpMult:1.1, costMult:1.2, gold:500 }; }
                if (typeof window.setCurrentDifficulty === 'function') window.setCurrentDifficulty(diff);
                
                gold = GAME_CONFIG.gold;
                // Reset multiplayer wallets to match just in case
                goldHost = gold;
                goldJoiner = gold;

                document.getElementById('ui-max-wave').innerText = GAME_CONFIG.maxWaves;
                
                resetGame();

                // Reset per-run challenge progress (kills "in one run" etc.)
                if (typeof window.resetRunChallenges === 'function') window.resetRunChallenges();

		if (typeof applySkillBonuses === 'function') {
        	applySkillBonuses();
    		}

                loadMap(selectedMapIndex);
                // Graphics settings are applied in loadMap, but ensure they're still active
                if (typeof applyGraphicsSettings === 'function') {
                    applyGraphicsSettings();
                }
                camera.position.set(0, 110, 50);
                camera.lookAt(0, 0, 0);
                AudioSys.playMusic(MAPS[selectedMapIndex].track);
                
                // Populate tower grid with new UI
                populateTowerGrid();

                gameRunning = true; 
                isPaused = false;
                updateUI();
            };
            // ----------------------------------------

            hideAllScreens();
            document.getElementById('main-menu').style.display = 'flex';
            AudioSys.playMusic('menu');
            
            // Ensure graphics settings are applied when returning to menu
            if (typeof applyGraphicsSettings === 'function') {
                applyGraphicsSettings();
            }
            
            // Update XP bar when returning to menu
            if (typeof window.updateXPBar === 'function') {
                window.updateXPBar();
            } else if (typeof window.updateXPBarDirect === 'function') {
                window.updateXPBarDirect();
            }
            
            // Show legal links in main menu
            const legalLinks = document.getElementById('legal-links');
            if(legalLinks) legalLinks.style.display = 'block';

	    // ✅ FIX 3: Ensure Multiplayer stats are gone
    const serverLoc = document.getElementById('server-location');
    const pingDisp = document.getElementById('ping-display');
    if(serverLoc) serverLoc.style.display = 'none';
    if(pingDisp) pingDisp.style.display = 'none';
            
            // Disconnect socket if we leave MP so it doesn't interfere
            if(socket) {
                socket.disconnect();
                socket = null;
                myRoomId = null;
                myRole = null;
            }
        }
        function showLevelSelect() {
            hideAllScreens();
            document.getElementById('level-select').style.display = 'flex';
            AudioSys.init();
	    balanceMapGrid();
        }
        window.selectMap = function(idx) {
            selectedMapIndex = idx;
            hideAllScreens();
            document.getElementById('diff-select').style.display = 'flex';
        }
        function hideAllScreens() {
    isPreviewing = false;
    const screens = document.querySelectorAll('.fullscreen-modal');
    screens.forEach(s => s.style.display = 'none');

    const uiLayer = document.getElementById('ui-layer');
    Array.from(uiLayer.children).forEach(d => {
        // ✅ FIX 1: REMOVED 'legal-links' from this list. 
        // Now they will automatically hide when we enter the game.
        if(!d.classList.contains('fullscreen-modal') 
           && d.id !== 'fps-counter' 
           && d.id !== 'author-tag'
           && d.id !== 'performance-stats') { 
            d.style.display = 'none';
        }
    });

    // Also force hide the multiplayer stats when switching screens
    const serverLoc = document.getElementById('server-location');
    const pingDisp = document.getElementById('ping-display');
    if(serverLoc) serverLoc.style.display = 'none';
    if(pingDisp) pingDisp.style.display = 'none';

    document.getElementById('menu-btn').style.display = 'none';
    
    // Ensure XP bar stays visible
    const xpBar = document.getElementById('player-level-container');
    if(xpBar) xpBar.style.display = 'flex';
}

        function setGameUIVisible(visible) {
            // Hide/show author tag with game UI
            const authorTag = document.getElementById('author-tag');
            if (authorTag) authorTag.style.display = visible ? 'none' : '';
            const display = visible ? 'flex' : 'none';
            const blockDisplay = visible ? 'block' : 'none';
            
            document.getElementById('stats-bar').style.display = display;
            document.getElementById('wave-controls').style.display = display;
            
            // dock-toggle pill is always shown when game UI is visible
            // tower-dock (the panel) only shows if dockOpen is true
            const toggleBtn = document.getElementById('dock-toggle');
            if (toggleBtn) toggleBtn.style.display = visible ? 'block' : 'none';
            document.getElementById('tower-dock').style.display = (visible && (typeof dockOpen === 'undefined' || dockOpen)) ? 'flex' : 'none';

            document.getElementById('menu-btn').style.display = blockDisplay;
            document.getElementById('game-info-panel').style.display = blockDisplay;
            document.getElementById('controls-hint').style.display = blockDisplay;
            
            if (!visible) document.getElementById('inspect-panel').style.display = 'none';
        }

        window.startGame = function(diff) {
    hideAllScreens();
    setGameUIVisible(true);
    
    // ✅ FIX: Force Multiplayer Stats to SHOW if we are in Multiplayer
    if (typeof isMultiplayerMode !== 'undefined' && isMultiplayerMode) {
        const locEl = document.getElementById('server-location');
        const pingEl = document.getElementById('ping-counter'); // Note: ID is ping-counter in your HTML
        
        if(locEl) locEl.style.display = 'block';
        if(pingEl) pingEl.style.display = 'block';
        
        // Optional: Update the text color to show it's active
        if(locEl) locEl.style.color = '#00ff00';
    }

    // Set to singleplayer mode
    isMultiplayerMode = false;
    
    // Set Info Panel
    document.getElementById('info-map-name').innerText = MAPS[selectedMapIndex].name;
    document.getElementById('info-diff').innerText = diff.toUpperCase();
    const diffColor = (diff==='easy'?'#2ecc71':(diff==='medium'?'#f1c40f':'#e74c3c'));
    document.getElementById('info-diff').style.color = diffColor;
    document.getElementById('info-mode').innerText = "SOLO";

    // 1. Configure Difficulty (Sets Base Gold) - original values restored
    if(diff === 'easy') { GAME_CONFIG = { maxWaves:20, hpMult:0.7, costMult:0.85, gold:800 }; }
    else if(diff === 'medium') { GAME_CONFIG = { maxWaves:40, hpMult:0.9, costMult:1.0, gold:650 }; }
    else { GAME_CONFIG = { maxWaves:60, hpMult:1.1, costMult:1.2, gold:500 }; }
    
    document.getElementById('ui-max-wave').innerText = GAME_CONFIG.maxWaves;
    
    // 2. Reset Game (This sets 'gold' to GAME_CONFIG.gold)
    resetGame();

    // Reset per-run challenge progress (kills "in one run" etc.)
    if (typeof window.resetRunChallenges === 'function') window.resetRunChallenges();

    // 3. Apply Skills (Must happen AFTER resetGame)
    if (window.applySkillBonuses) {
        console.log("👉 Attempting to apply skills..."); // Check F12 Console for this
        window.applySkillBonuses(); 
    } else {
        console.warn("⚠️ applySkillBonuses function not found!");
    }

    loadMap(selectedMapIndex);
    // Ensure graphics settings are applied after map loads
    if (typeof applyGraphicsSettings === 'function') {
        applyGraphicsSettings();
    }
    camera.position.set(0, 110, 50);
    camera.lookAt(0, 0, 0);
    
    AudioSys.playMusic(MAPS[selectedMapIndex].track);
    populateTowerGrid();

    gameRunning = true;
    isPaused = false;
    
    // 4. Final UI Update (Shows the total gold)
    updateUI();
};


// --- updateUI, updateInspect ---
        function updateUI() {
    document.getElementById('ui-gold').innerText = Math.floor(gold);
    document.getElementById('ui-lives').innerText = lives;
    document.getElementById('ui-wave').innerText = wave;

    // --- MULTIPLAYER PLAYER LIST ---
    if (socket && myRoomId && allPlayers.length > 0) {
        for (let i = 0; i < 4; i++) {
            const el = document.getElementById('info-p' + (i + 1));
            if (el) {
                if (i < allPlayers.length) {
                    el.style.display = 'flex';
                    const pName = allPlayers[i].name;
                    
                    // Show level: own from window.playerLevel, others from playerLevels map
                    let level = '?';
                    if (i === myPlayerIndex && window.playerLevel) {
                        level = window.playerLevel;
                    } else if (typeof playerLevels !== 'undefined' && playerLevels[allPlayers[i].id]) {
                        level = playerLevels[allPlayers[i].id];
                    } else if (typeof window.playerLevels !== 'undefined' && window.playerLevels[allPlayers[i].id]) {
                        level = window.playerLevels[allPlayers[i].id];
                    }
                    const levelBadge = `<span style="background: linear-gradient(135deg, #e67e22, #e74c3c); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 5px;">LVL ${level}</span>`;
                    
                    // FIX: Explicitly check which variable to show
                    let displayGold = 0;
                    
                    if (currentGamemode === 'separate') {
                        // If it's ME, show my local 'gold' variable (which we synced above)
                        if (i === myPlayerIndex) {
                            displayGold = gold;
                        } else {
                            // If it's OTHERS, show the array value from the server
                            displayGold = playerWallets[i];
                        }
                    } else {
                        displayGold = gold; // Shared mode always uses global gold
                    }

                    const pColor = PLAYER_COLORS[i] || '#fff';
                    el.innerHTML = `${levelBadge}<span style="color:${pColor}">${pName}:</span> <span style="color:#f1c40f">$${Math.floor(displayGold)}</span>`;
                } else {
                    el.style.display = 'none';
                }
            }
        }
    }
      else {
        // Single Player
        document.getElementById('info-p1').innerHTML = `<span>You:</span> <span style="color:#f1c40f">$${Math.floor(gold)}</span>`;
        document.getElementById('info-p2').style.display = 'none';
        document.getElementById('info-p3').style.display = 'none';
        document.getElementById('info-p4').style.display = 'none';
    }

    if (selectedTower) updateInspect();
    
    // Update tower affordability in the grid
    document.querySelectorAll('.tower-btn').forEach(btn => {
        const towerKey = btn.dataset.tower;
        if (towerKey) {
            const cost = Math.floor(TOWERS[towerKey].cost * GAME_CONFIG.costMult);
            if (cost > gold) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
            
            // Update cost display color
            const costEl = btn.querySelector('.tower-cost');
            if (costEl) {
                if (cost > gold) {
                    costEl.classList.add('expensive');
                } else {
                    costEl.classList.remove('expensive');
                }
            }
        }
    });
}

        function updateInspect() {
            if(!selectedTower) { 
                document.getElementById('inspect-panel').style.display = 'none'; 
                return; 
            }
            const p = document.getElementById('inspect-panel'); 
            p.style.display = 'block';
            
            const t = selectedTower;
            
            // Basic Info
            let nameText = t.name;
            if(t.level === 5 && t.branch && TOWER_UPGRADES[t.type]) {
                nameText += " (" + (t.branch === 'A' ? TOWER_UPGRADES[t.type].A.name : TOWER_UPGRADES[t.type].B.name) + ")";
            }
            document.getElementById('ins-name').innerText = nameText;
            document.getElementById('ins-lvl').innerText = t.level + (t.level>=MAX_LEVEL ? " (MAX)" : "");
            
            // Owner Label
            const ownerLbl = document.getElementById('ins-owner');
            if (socket && myRoomId && t.ownerIndex !== undefined && allPlayers[t.ownerIndex]) {
                ownerLbl.style.display = 'block';
                const ownerName = allPlayers[t.ownerIndex].name.toUpperCase();
                ownerLbl.innerText = "OWNER: " + ownerName;
                ownerLbl.style.color = PLAYER_COLORS[t.ownerIndex];
            } else {
                ownerLbl.style.display = 'none';
            }

            // Stats
            const standardRows = ['ins-dmg','ins-range','ins-rate'].map(id => document.getElementById(id).parentNode);
            const s1 = document.getElementById('row-special-1');
            const s2 = document.getElementById('row-special-2');
            s1.style.display='none'; s2.style.display='none';
            const _s3el = document.getElementById('row-special-3'); if(_s3el) _s3el.style.display='none';

            if(t.type === 'farm') {
                standardRows.forEach(r => r.style.display = 'none');
                // Show total generated next to level like other towers show destroys
                document.getElementById('ins-type').innerHTML = `Level <span id="ins-lvl">${t.level}</span> | Total: <span style="color:#2ecc71">$${t.totalGenerated||0}</span>`;
                
                s1.style.display = 'flex';
                document.getElementById('lbl-special-1').innerText = "Income";
                document.getElementById('val-special-1').innerText = "$" + t.income;
                
                s2.style.display = 'flex';
                document.getElementById('lbl-special-2').innerText = "Rate";
                document.getElementById('val-special-2').innerText = t.rate.toFixed(1) + "s";

                const s3 = document.getElementById('row-special-3');
                if (s3) {
                    const farmMult = (typeof getSkillMultipliers === 'function') ? getSkillMultipliers().farmIncome : 1;
                    const bonusIncome = Math.floor(t.income * (farmMult - 1));
                    if (bonusIncome > 0) {
                        s3.style.display = 'flex';
                        document.getElementById('lbl-special-3').innerText = "Skill Bonus";
                        document.getElementById('val-special-3').innerText = "+$" + bonusIncome;
                    } else {
                        s3.style.display = 'none';
                    }
                }
            } 
            else {
                standardRows.forEach(r => r.style.display = 'flex');
		document.getElementById('ins-type').innerHTML = `Level <span id="ins-lvl">${t.level}</span> | Destroyed: <span style="color:#e74c3c">${t.destroys||0}</span>`;
                document.getElementById('ins-dmg').innerText = Math.floor(t.dmg);
                document.getElementById('ins-range').innerText = t.range.toFixed(1);
                document.getElementById('ins-rate').innerText = t.rate.toFixed(2) + "s";
                
                if(t.type === 'ice') {
                    s1.style.display = 'flex'; s2.style.display = 'flex';
                    document.getElementById('lbl-special-1').innerText = "Stun Chance";
                    document.getElementById('val-special-1').innerText = Math.floor(t.stunChance*100) + "%";
                    document.getElementById('lbl-special-2').innerText = "Slow Dur";
                    document.getElementById('val-special-2').innerText = t.slow.toFixed(1) + "s";
                }
                if(t.type === 'tesla') {
                    s1.style.display = 'flex';
                    document.getElementById('lbl-special-1').innerText = "Chain Limit";
                    document.getElementById('val-special-1').innerText = t.chain + " Targets";
                }
            }

            // --- BRANCHING LOGIC (FIXED) ---
            const btnUp = document.getElementById('btn-upgrade');
            const actionGroup = document.querySelector('.action-group');
            let branchContainer = document.getElementById('branch-container');

            if (t.level === 4) {
                btnUp.style.display = 'none'; 
                
                // BUG FIX: If we switched from Gunner to Cryo, we must clear the old Gunner buttons!
                if (branchContainer && branchContainer.dataset.towerType !== t.type) {
                    branchContainer.remove();
                    branchContainer = null;
                }
                
                // Only create if it doesn't exist (Prevents Spam Click Bug)
                if(!branchContainer) {
                    const upData = TOWER_UPGRADES[t.type];
                    branchContainer = document.createElement('div');
                    branchContainer.id = 'branch-container';
                    branchContainer.dataset.towerType = t.type; // Mark this container as belonging to this tower type
                    branchContainer.style.display = 'flex';
                    branchContainer.style.gap = '5px';
                    branchContainer.style.marginBottom = '8px';

                    const createChoiceBtn = (data, branchCode, color) => {
                        const branchCost = Math.floor(data.cost * GAME_CONFIG.costMult);
                        const b = document.createElement('button');
                        b.className = 'action-btn branch-btn-' + branchCode; 
                        b.style.background = color;
                        b.style.border = '1px solid #fff';
                        b.style.padding = '8px 5px';
                        b.style.fontSize = '10px';
                        
                        // Check if branch upgrade is unlocked (tier 5)
                        const branchKey = branchCode === 'A' ? 'branch1' : 'branch2';
                        const isUnlocked = !window.unlockedUpgrades || 
                                         checkIsMultiplayerMode() || 
                                         (window.unlockedUpgrades[t.type] && window.unlockedUpgrades[t.type][branchKey] >= 5);
                        
                        if (!isUnlocked) {
                            // Get required level from branchUnlockLevels
                            const requiredLevel = window.branchUnlockLevels && window.branchUnlockLevels[t.type] 
                                ? window.branchUnlockLevels[t.type][branchKey]
                                : 21;
                            
                            b.innerHTML = `<b>${data.name}</b><br><span style="font-size:10px"><i class="fa-solid fa-lock"></i> Level ${requiredLevel}</span><br><span style="font-size:9px; opacity:0.7;">Unlock via leveling</span>`;
                            b.style.opacity = 0.5;
                            b.style.cursor = 'not-allowed';
                            b.onclick = null; // No action when locked (no annoying popup)
                        } else {
                            b.innerHTML = `<b>${data.name}</b><br><span style="font-size:10px">${data.desc}</span><br>$${branchCost}`;
                            b.onclick = () => upgradeTower(branchCode);
                        }
                        
                        return b;
                    };

                    branchContainer.appendChild(createChoiceBtn(upData.A, 'A', '#e67e22'));
                    branchContainer.appendChild(createChoiceBtn(upData.B, 'B', '#8e44ad'));
                    // Insert before the Sell/Close buttons
                    document.getElementById('inspect-panel').insertBefore(branchContainer, actionGroup);
                }

                // Update Button States (Disable if poor)
                const myGold = (currentGamemode === 'separate') ? playerWallets[myPlayerIndex] : gold;
                const upData = TOWER_UPGRADES[t.type];

                ['A', 'B'].forEach(code => {
                    const btn = branchContainer.querySelector('.branch-btn-' + code);
                    if(btn) {
                        const cost = Math.floor(upData[code].cost * GAME_CONFIG.costMult);
                        if(myGold < cost) {
                            btn.style.opacity = 0.5;
                            btn.style.cursor = 'not-allowed';
                        } else {
                            btn.style.opacity = 1;
                            btn.style.cursor = 'pointer';
                        }
                    }
                });

            } else {
                // Not level 4: Hide/Remove branch container
                if(branchContainer) branchContainer.remove();
                
                if (t.level >= MAX_LEVEL) {
                    btnUp.style.display = 'none';
                } else {
                    btnUp.style.display = 'block';
                    const cost = Math.floor((t.cost * GAME_CONFIG.costMult) * (t.level + 0.5));
                    
                    // Tiers 1-4 are always unlocked - no level requirement
                    // Only tier 5 branch paths (A/B) require unlocking
                    btnUp.innerText = `UPGRADE ($${cost})`;
                    const myGold = (currentGamemode === 'separate') ? playerWallets[myPlayerIndex] : gold;
                    btnUp.disabled = (myGold < cost);
                    btnUp.style.opacity = btnUp.disabled ? 0.5 : 1;
                }
            }
            
            document.getElementById('val-sell').innerText = Math.floor((t.cost * GAME_CONFIG.costMult * t.level) * 0.6);
        }


// --- initMobileControls, initUI, initMenuCanvas, livePlayerCounter ---
        function initMobileControls() {
            const el = renderer.domElement;
            let touchStartX = 0;
            let touchStartY = 0;
            let initialPinchDist = 0;
            let initialCamY = 0;
            let hasMoved = false;
            let startTime = 0;

            el.addEventListener('touchstart', (e) => {
                // Don't prevent default on UI elements
                if(e.target !== el) return;
                e.preventDefault();
                
                hasMoved = false;
                startTime = Date.now();
                
                if(e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    
                    // Update mouse position for hover effect
                    mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                    mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                    onMM({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
                } 
                else if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    initialPinchDist = Math.sqrt(dx*dx + dy*dy);
                    initialCamY = camera.position.y;
                }
            }, {passive: false});

            el.addEventListener('touchmove', (e) => {
                if(e.target !== el) return;
                e.preventDefault();
                
                if(e.touches.length === 1) {
                    const dx = e.touches[0].clientX - touchStartX;
                    const dy = e.touches[0].clientY - touchStartY;
                    
                    // Only start panning if moved more than 10 pixels
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    if(distance > 10) {
                        hasMoved = true;
                        
                        // Pan camera
                        camera.position.x -= dx * 0.15;
                        camera.position.z -= dy * 0.15;
                        
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        
                        // Update hover while panning
                        mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                        mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                        onMM({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
                    }
                }
                else if (e.touches.length === 2) {
                    hasMoved = true;
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if(initialPinchDist > 0) {
                        const scale = initialPinchDist / dist;
                        camera.position.y = Math.max(30, Math.min(180, initialCamY * scale));
                    }
                }
            }, {passive: false});

            el.addEventListener('touchend', (e) => {
                if(e.target !== el) return;
                
                const touchDuration = Date.now() - startTime;
                
                // Only click if it was a quick tap and didn't move much
                if(!hasMoved && touchDuration < 300) {
                    onClick({ button: 0 });
                }
                
                hasMoved = false;
            }, {passive: false});
        }

        function initUI() {
	    window.addEventListener('keydown', (e) => {
                if(!(typeof gameRunning !== 'undefined' && gameRunning) || isPaused) return;

                // Map numbers 1-9 to tower keys
                const keys = ['gunner','sniper','ice','minigun','mortar','tesla','laser','plasma','farm'];
                const num = parseInt(e.key);
                
                if(num >= 1 && num <= keys.length) {
                    const type = keys[num-1];
                    // Find the button and trigger the click logic
                    // We need to find the DOM element to highlight it
                    const btn = Array.from(document.querySelectorAll('.tower-btn'))[num-1];
                    if(btn) selectTool(type, btn);
                    AudioSys.hover();
                }
                
                // ESC to deselect
                if(e.key === 'Escape') {
                    if(selectedType || selectedTower) deselectAll();
                    else togglePause();
                }
                
                // U to Upgrade (if tower selected)
                if(e.code === 'KeyU' && selectedTower) upgradeTower();
                
                // S to Sell (if tower selected)
                if(e.code === 'KeyS' && selectedTower) sellTower();
            });
            document.getElementById('btn-start-wave').onclick = (e) => { e.stopPropagation(); playClick(); startWave(); };
            // dock-toggle onclick is set inline in HTML
            document.getElementById('btn-upgrade').onclick = (e) => { e.stopPropagation(); upgradeTower(); };
            document.getElementById('btn-sell').onclick = (e) => { e.stopPropagation(); sellTower(); };
            
            const menuBtn = document.getElementById('menu-btn');
            if(menuBtn) menuBtn.onclick = (e) => { e.stopPropagation(); playClick(); togglePause(); };

            document.getElementById('inspect-panel').onmousedown = (e) => e.stopPropagation();
            document.getElementById('tower-dock').onmousedown = (e) => e.stopPropagation();
            
            // Disable context menu for right click
            document.body.oncontextmenu = (e) => e.preventDefault();
	    
	    let lastHovered = null;
            document.addEventListener('mouseover', (e) => {
                // Check if we touched a Button, Tower Card, or Map Card
                const target = e.target.closest('.btn') || 
                               e.target.closest('.tower-btn') || 
                               e.target.closest('.map-card') ||
                               e.target.closest('.almanac-item');

                // If we found a button AND it's different from the last one we touched...
                if(target && target !== lastHovered) {
                    AudioSys.hover(); // Play the blip!
                    lastHovered = target; // Remember this button so we don't spam sound while moving mouse inside it
                }
                // If we aren't touching a button anymore, reset the memory
                else if (!target) {
                    lastHovered = null;
                }
            });
        }
	
	function initPreviewSystem() {
            previewScene = new THREE.Scene();
            
            // Studio Lights for the Preview
            const amb = new THREE.AmbientLight(0xffffff, 0.6);
            const spot = new THREE.SpotLight(0xffffff, 1.5);
            spot.position.set(5, 10, 8);
            spot.castShadow = false; // No shadows for perf
            
            // Rim light for that "Premium" look
            const rim = new THREE.DirectionalLight(0x3498db, 0.8);
            rim.position.set(-5, 2, -5);
            
            previewScene.add(amb, spot, rim);

            previewCam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
            
            // Transparent Renderer
            previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            previewRenderer.setClearColor(0x000000, 0); // Fully transparent
            previewRenderer.setSize(300, 200);
        }

	function checkMultiplayerStats() {
    // Only run if we are actually connected
    if (!socket || !socket.connected) return;

    const locEl = document.getElementById('server-location');
    const pingEl = document.getElementById('ping-display'); // check if ID is 'ping-display' or 'ping-counter'

    // Force them to be visible with !important via JS
    if(locEl) {
        locEl.style.display = 'inline-block';
        locEl.style.zIndex = '9999'; // Force it on top of everything
        locEl.style.position = 'fixed'; // Keep it stuck to the screen
        // Adjust these positions to fit your UI
        locEl.style.botton = '10px'; 
        locEl.style.left = '90px'; 
    }
    
    if(pingEl) {
        pingEl.style.display = 'inline-block';
        pingEl.style.zIndex = '9999';
        pingEl.style.position = 'fixed';
        pingEl.style.botton = '10px';
        pingEl.style.left = '180px';
    }
}

	function initPostProcessing() {
    // Create the Composer (Effect Manager)
    composer = new THREE.EffectComposer(renderer);

    // 1. Base Render Pass
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 2. SSAO Pass (Screen Space Ambient Occlusion) - Adds depth/shadows
    if (typeof THREE.SSAOPass !== 'undefined') {
        window.ssaoPass = new THREE.SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
        ssaoPass.kernelRadius = 16;
        ssaoPass.minDistance = 0.005;
        ssaoPass.maxDistance = 0.1;
        composer.addPass(ssaoPass);
    }

    // 3. Bloom Pass (Glow Effect)
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 
        1.5,  // Strength
        0.4,  // Radius
        0.85  // Threshold
    );
    composer.addPass(bloomPass);

    // 4. SMAA Pass (Anti-Aliasing) - Smooth edges
    if (typeof THREE.SMAAPass !== 'undefined') {
        window.smaaPass = new THREE.SMAAPass(window.innerWidth, window.innerHeight);
        composer.addPass(smaaPass);
    }

    // 5. Color Correction Pass
    if (typeof THREE.ShaderPass !== 'undefined' && THREE.ColorCorrectionShader) {
        window.colorCorrectionPass = new THREE.ShaderPass(THREE.ColorCorrectionShader);
        colorCorrectionPass.uniforms.powRGB.value.set(1.2, 1.2, 1.2);
        colorCorrectionPass.uniforms.mulRGB.value.set(1.1, 1.1, 1.1);
        composer.addPass(colorCorrectionPass);
    }

    console.log('✅ Post-processing initialized');
}
	
// toggleDock defined in Game.js

// --- Skill Tree, Daily Challenges, Map filtering (moved here from blocks D/E) ---

// --- Skill Tree, Daily Challenges (Block D) ---
// ============================================
// MISSING FUNCTIONS - ADD THEM GLOBALLY
// ============================================

/**
 * Update Skill Tree Display
 * Called when skill tree modal opens
 */
window.updateSkillTree = function() {
    console.log('🌳 Updating skill tree display...');
    const container = document.getElementById('skill-tree-container');
    if (!container) {
        console.error('❌ skill-tree-container not found');
        return;
    }
    
    // Update skill points display
    const spCount = document.getElementById('skill-points-count');
    if (spCount) spCount.innerText = window.skillPoints || 0;
    
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="color: #f39c12;">Skill Points: ${window.skillPoints || 0}</h3>
        </div>
    `;
    
    if (!window.skills) {
        container.innerHTML += '<p style="color: #e74c3c;">Skills not loaded yet. Please restart the game.</p>';
        return;
    }
    
    Object.keys(window.skills).forEach(category => {
        const catDiv = document.createElement('div');
        catDiv.style.cssText = 'background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-bottom: 15px;';
        
        const categoryIcons = {
            economy: '<i class="fa-solid fa-sack-dollar"></i>',
            combat: '<i class="fa-solid fa-hand-fist"></i>',
            special: '<i class="fa-solid fa-wand-magic-sparkles"></i>'
        };
        
        catDiv.innerHTML = `<h4 style="color: #3498db; text-transform: uppercase;">${categoryIcons[category] || ''} ${category}</h4>`;
        
        Object.keys(window.skills[category]).forEach(skillKey => {
            const skill = window.skills[category][skillKey];
            const skillDiv = document.createElement('div');
            skillDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 10px;';
            skillDiv.innerHTML = `
                <div>
                    <strong style="color: white;">${skill.name}</strong><br>
                    <small style="color: #aaa;">${skill.desc}</small><br>
                    <small style="color: #f39c12;">Level: ${skill.level}/${skill.max}</small>
                </div>
                <button class="btn" style="padding: 8px 15px; ${skill.level >= skill.max || (window.skillPoints || 0) < skill.cost ? 'opacity: 0.5; cursor: not-allowed;' : ''}" 
                    ${skill.level >= skill.max || (window.skillPoints || 0) < skill.cost ? 'disabled' : ''}
                    onclick="upgradeSkill('${category}', '${skillKey}')">
                    ${skill.level >= skill.max ? 'MAXED' : `Upgrade (${skill.cost} SP)`}
                </button>
            `;
            catDiv.appendChild(skillDiv);
        });
        
        container.appendChild(catDiv);
    });
};

/**
 * Upgrade a skill
 */
window.upgradeSkill = function(category, skillKey) {
    if (!window.skills || !window.skills[category] || !window.skills[category][skillKey]) return;
    
    const skill = window.skills[category][skillKey];
    if (skill.level >= skill.max || (window.skillPoints || 0) < skill.cost) return;
    
    window.skillPoints -= skill.cost;
    skill.level++;
    
    if (typeof window.saveProgress === 'function') {
        window.saveProgress();
    }
    
    updateSkillTree();
    if (typeof window.updateXPBar === 'function') {
        window.updateXPBar();
    }
    
    console.log(`✅ Upgraded ${skill.name} to level ${skill.level}`);
};

/**
 * Generate Daily Challenge
 */
window.generateDailyChallenge = function() {
    console.log('📅 Generating daily challenge...');
    const today = new Date().toDateString();
    
    if (window.dailyChallenges && window.dailyChallenges.length > 0 && window.dailyChallenges[0].date === today) {
        return window.dailyChallenges[0];
    }
    
    const challenges = [
        { type: 'destroys', target: 50, desc: 'Destroy 50 enemies', reward: '100 XP', icon: '<i class="fa-solid fa-skull"></i>' },
        { type: 'waves', target: 10, desc: 'Survive 10 waves', reward: '150 XP', icon: '<i class="fa-solid fa-water"></i>' },
        { type: 'noLoss', target: 1, desc: 'Complete a game without losing lives', reward: '200 XP', icon: '<i class="fa-solid fa-heart" style="color:#e74c3c"></i>' },
        { type: 'gold', target: 5000, desc: 'Earn 5,000 gold in one game', reward: '120 XP', icon: '<i class="fa-solid fa-sack-dollar"></i>' },
        { type: 'towers', target: 20, desc: 'Build 20 towers in one game', reward: '100 XP', icon: '<i class="fa-solid fa-tower-observation"></i>' }
    ];
    
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];
    challenge.date = today;
    challenge.progress = 0;
    challenge.completed = false;
    
    if (!window.dailyChallenges) window.dailyChallenges = [];
    window.dailyChallenges = [challenge];
    
    if (typeof window.saveProgress === 'function') {
        window.saveProgress();
    }
    
    return challenge;
};

/**
 * Update Daily Challenge Display
 */
window.updateDailyChallenges = function() {
    const container = document.getElementById('challenges-container');
    if (!container) return;
    
    const challenge = generateDailyChallenge();
    const progressPct = Math.min((challenge.progress / challenge.target * 100), 100);
    
    container.innerHTML = `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <div style="font-size: 48px; text-align: center; margin-bottom: 10px;">${challenge.icon || '<i class="fa-solid fa-clipboard"></i>'}</div>
            <h3 style="color: #f39c12; margin: 0 0 10px 0; text-align: center;"><i class="fa-solid fa-calendar"></i> Daily Challenge</h3>
            <p style="font-size: 18px; margin: 0 0 15px 0; text-align: center;">${challenge.desc}</p>
            <div style="background: rgba(0,0,0,0.3); padding: 3px; border-radius: 10px; margin-bottom: 10px;">
                <div style="
                    background: linear-gradient(90deg, #2ecc71, #27ae60);
                    height: 30px;
                    border-radius: 8px;
                    width: ${progressPct}%;
                    transition: width 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <span style="color: white; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${challenge.progress} / ${challenge.target}
                    </span>
                </div>
            </div>
            <p style="color: #2ecc71; margin: 10px 0 0 0; text-align: center; font-size: 16px;">
                ${challenge.completed ? '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> COMPLETED!' : `Reward: ${challenge.reward}`}
            </p>
        </div>
    `;
};

// --- Map filtering, offline protection, DOM init (Block E) ---
    // Map category filtering
    let currentMapCategory = 'all';

    function filterMapCategory(category) {
        currentMapCategory = category;
        
        // Update tab styles
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            }
        });
        
        // FIX: Only target map cards inside the 'map-container' ID
        // This prevents it from hiding the Difficulty or Gamemode buttons!
        const cards = document.querySelectorAll('#map-container .map-card');
        
        cards.forEach(card => {
            const difficulty = card.dataset.difficulty;
            if (category === 'all' || difficulty === category) {
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // --- OFFLINE PROTECTION SYSTEM ---
    
    // 1. Check internet before opening Multiplayer Menu
    // Wait for DOM to be fully loaded just in case
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎮 DOM loaded, initializing UI updates...');
        
        // Initial XP bar update after a short delay to ensure progression is loaded
        setTimeout(() => {
            if (typeof window.updateXPBar === 'function') {
                window.updateXPBar();
                console.log('✅ Initial XP bar update completed');
            }
        }, 1000);
        
        // Update XP bar every 2 seconds (backup in case event updates fail)
        setInterval(() => {
            if (typeof window.updateXPBar === 'function' && window.playerLevel) {
                window.updateXPBar();
            }
        }, 2000);
        
        const multiBtn = document.getElementById('btn-multiplayer');
        
        if(multiBtn) {
            console.log("✅ Offline Protection Active: Multiplayer button found.");
            // Save the original onclick function
            const originalOnClick = multiBtn.onclick; 
            
            multiBtn.onclick = function(e) {
                if (!navigator.onLine) {
                    // Player is Offline
                    alert("OFFLINE MODE\n\nYou are not connected to the internet.\nMultiplayer features are disabled.");
                    e.preventDefault();
                    e.stopPropagation();
                    return; // Stop here! Don't run the multiplayer code.
                }
                
                // If Online, run the original code
                if(originalOnClick) originalOnClick.call(this, e);
            };
        } else {
            console.warn("⚠️ Offline Protection: 'btn-multiplayer' not found!");
        }
    });

    // 2. Handle Server Connection Failures
    const checkSocketInterval = setInterval(() => {
        if (typeof socket !== 'undefined') {
            clearInterval(checkSocketInterval);
            
            socket.on('connect_error', () => {
                // Only alert if we are actually in a multiplayer screen
                const lobby = document.getElementById('lobby-screen');
                const mpMenu = document.getElementById('mp-menu');
                
                if((lobby && lobby.style.display === 'flex') || (mpMenu && mpMenu.style.display === 'flex')) {
                    alert("SERVER ERROR\n\nCould not connect to the game server.\nIt might be down for maintenance.");
                    // Force them back to main menu
                    if(typeof goToMainMenu === 'function') goToMainMenu();
                }
            });
        }
    }, 1000);


