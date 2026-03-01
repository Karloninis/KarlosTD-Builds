// ============================================================================
// Game.js - Game state, initialization, main loop, wave logic, socket/multiplayer
// ============================================================================

// ── Socket Error Handler Utility ──────────────────────────────────────────────
// Wraps socket event handlers with error handling to prevent connection breaks
function safeSocketHandler(eventName, handler) {
    return function(...args) {
        try {
            handler(...args);
        } catch (error) {
            console.error(`Socket handler error [${eventName}]:`, error);
            // Don't show error to user for most events (too spammy)
            // Critical errors are handled individually
        }
    };
}



// ── Multiplayer Skin Helper ───────────────────────────────────────────────────
// Applies a remote player's equipped skin to a freshly-created tower mesh.
// Called whenever we receive another player's build/sync that includes a skinId.
window._applyRemoteSkin = function(mesh, towerType, skinId) {
    if (!skinId || skinId === 'default' || !window.SKIN_CATALOG) return;
    const skin = window.SKIN_CATALOG[skinId];
    if (!skin) return;

    // Get the tower's BASE default color so we know which meshes are "main"
    const tData  = (typeof TOWERS !== 'undefined') && TOWERS[towerType];
    const baseHex = tData ? tData.color : null;

    mesh.traverse(child => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
            if (!mat || !mat.isMeshStandardMaterial) return;

            const r = (mat.color.r * 255) | 0;
            const g = (mat.color.g * 255) | 0;
            const b = (mat.color.b * 255) | 0;

            // Always skip: near-black bases/structural pieces
            const isBlack  = r < 60  && g < 60  && b < 60;
            // Always skip: gold trim
            const isGold   = r > 200 && g > 160 && b < 60;
            // Always skip: glass/transparent
            const isGlass  = mat.transparent && mat.opacity < 0.9;
            // Always skip: emissive-only (e.g. glowing indicators)
            const isMeshBasic = mat.isMeshBasicMaterial;

            if (isBlack || isGold || isGlass || isMeshBasic) return;

            // Apply skin to everything else — this matches the same breadth that
            // createTowerModel applies when the local player's skin is active.
            mat.color.setHex(skin.mainColor);
            mat.metalness = skin.metalness  !== undefined ? skin.metalness  : mat.metalness;
            mat.roughness = skin.roughness  !== undefined ? skin.roughness  : mat.roughness;
            if (skin.emissive !== null && skin.emissive !== undefined) {
                mat.emissive.setHex(skin.emissive);
                mat.emissiveIntensity = skin.emissiveIntensity || 0;
            }
            mat.needsUpdate = true;
        });
    });
};

// ── Scrap System Integration ──────────────────────────────────────────────────

// Called every time startGame runs (injected by UI.js startGame override below)
window.setCurrentDifficulty = function(diff) {
    currentDifficulty = diff || 'easy';
};

// Show the breakdown panel and award scraps
window.showScrapBreakdown = function(wavesCompleted, difficulty, isVictory) {
    if (typeof LockerSystem === 'undefined') return;

    // DEFERRED: calculate scraps but don't award yet.
    // Scraps are only committed when the player leaves (MENU / TRY AGAIN / CONTINUE).
    // This prevents revive → die → revive loops from multiplying scraps.
    const result = LockerSystem.calculateScraps(wavesCompleted || 0, difficulty || 'easy', isVictory);
    window._pendingScrap        = result;
    window._pendingScrapDiff    = difficulty || 'easy';
    window._pendingScrapIsWin   = isVictory;
    window._pendingScrapAwarded = false;
    window._bonusScrapsUsed     = false;

    const diffLabels = { easy: 'Easy ×1', medium: 'Medium ×2', hard: 'Hard ×3' };
    const label = diffLabels[difficulty] || '×1';
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // Defeat screen
    set('sb-waves', result.base);
    set('sb-mult',  label);
    set('sb-base',  result.base * result.multiplier);
    set('sb-total', result.total + ' scraps');
    const bonusEl = document.getElementById('sb-bonus');
    if (bonusEl) { bonusEl.textContent = '+' + result.winBonus; bonusEl.style.color = 'rgba(255,255,255,0.25)'; }

    // Victory screen
    set('sb-waves-v', result.base);
    set('sb-mult-v',  label);
    set('sb-base-v',  result.base * result.multiplier);
    set('sb-total-v', result.total + ' scraps');
    const bonusV = document.getElementById('sb-bonus-v');
    if (bonusV) bonusV.textContent = '+' + result.winBonus;

    // Hide ad buttons in multiplayer
    const isMP = !!(typeof socket !== 'undefined' && socket && typeof myRoomId !== 'undefined' && myRoomId);
    const hide = isMP ? 'none' : '';
    const reviveBtn      = document.getElementById('revive-ad-btn');
    const bonusLossBtn   = document.getElementById('bonus-scraps-loss-btn');
    const bonusWinBtn    = document.getElementById('bonus-scraps-win-btn');

    if (reviveBtn)    { reviveBtn.style.display    = hide; reviveBtn.disabled    = true; reviveBtn.innerHTML      = '<i class="fa-solid fa-heart" style="color:#9b59b6"></i> REVIVE — WATCH AD'; }
    if (bonusLossBtn) { bonusLossBtn.style.display = hide; bonusLossBtn.disabled = true; bonusLossBtn.innerHTML   = '<i class="fa-solid fa-clapperboard"></i> 2× SCRAPS — WATCH AD'; }
    if (bonusWinBtn)  { bonusWinBtn.style.display  = hide; bonusWinBtn.disabled  = true; bonusWinBtn.innerHTML    = '<i class="fa-solid fa-clapperboard"></i> 2× SCRAPS — WATCH AD'; }

    // Enable ad buttons only once IMA confirms an ad is loaded and ready.
    // If no ad available (SDK not loaded, no fill, etc.) buttons stay greyed
    // out — exactly the same look as when already used.
    if (!isMP && typeof window.checkAdAvailable === 'function') {
        window.checkAdAvailable().then(function(available) {
            if (!available) { console.log('[Ads] No ad available — keeping ad buttons disabled'); return; }
            if (reviveBtn    && !isVictory) { reviveBtn.disabled    = false; }
            if (bonusLossBtn && !isVictory) { bonusLossBtn.disabled = false; }
            if (bonusWinBtn  &&  isVictory) { bonusWinBtn.disabled  = false; }
        });
    }
};

// Called by UI.js when player exits (MENU / TRY AGAIN / CONTINUE).
// Commits the pending scraps exactly once per run.
window._awardPendingScraps = function() {
    if (!window._pendingScrap || window._pendingScrapAwarded) return;
    window._pendingScrapAwarded = true;
    if (typeof LockerSystem === 'undefined') return;
    // Re-use awardScraps but pass the (possibly doubled) total directly
    const state = LockerSystem.getState();
    state.scraps = (state.scraps || 0) + window._pendingScrap.total;
    try { 
        localStorage.setItem('karlos_td_locker_v1', JSON.stringify(state)); 
    } catch(e) {
        console.error('Failed to save progress to localStorage:', e);
        if (typeof showLocalError === 'function') {
            showLocalError('Failed to save progress locally!', '#e67e22');
        }
    }
    LockerSystem.updateHUD();
    if (typeof window.KarloAuth !== 'undefined' && typeof window.KarloAuth.saveProgress === 'function') {
        window.KarloAuth.saveProgress().catch((error) => {
            console.error('Cloud save failed:', error);
            if (typeof showLocalError === 'function') {
                showLocalError('Cloud sync failed - progress saved locally', '#e67e22');
            }
        });
    }
};

// ── Rewarded Ad: Revive ───────────────────────────────────────────────────────
window.handleReviveAd = function() {
    if (typeof showRewardAd !== 'function') { _doRevive(); return; }
    const btn = document.getElementById('revive-ad-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Loading ad...'; }
    showRewardAd(function() { _doRevive(); });
};

function _doRevive() {
    const btn = document.getElementById('revive-ad-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> REVIVED!'; }

    // Hide game-over screen
    document.getElementById('game-over-screen').style.display = 'none';

    // Clear all leaking enemies and projectiles so the player isn't instantly dead
    enemies.forEach(e => {
        if (e.mesh)    scene.remove(e.mesh);
        if (e.hpGroup) scene.remove(e.hpGroup);
    });
    enemies = [];
    projectiles.forEach(p => { if (p.mesh) scene.remove(p.mesh); });
    projectiles = [];

    // Roll back one wave — player replays the wave they just died on
    if (wave > 1) wave--;
    activeWave      = false;
    spawningFinished = true;

    // Reset Start Wave button
    const waveBtn = document.getElementById('btn-start-wave');
    if (waveBtn) { waveBtn.disabled = false; waveBtn.innerText = 'START WAVE'; waveBtn.style.backgroundColor = ''; }

    // Restore 1 life
    lives = 1;
    isPaused   = false;
    gameRunning = true;

    // Reset camera to default top-down view (same as game start)
    camera.position.set(0, 110, 50);
    camera.lookAt(0, 0, 0);

    updateUI();
    if (typeof notifyGameplayStart === 'function') notifyGameplayStart();
}

// ── Rewarded Ad: 2× Scraps ───────────────────────────────────────────────────
window.handleBonusScrapsAd = function(screen) {
    if (window._bonusScrapsUsed) return;
    if (typeof showRewardAd !== 'function') { _grantBonusScraps(screen); return; }
    const btnId = screen === 'win' ? 'bonus-scraps-win-btn' : 'bonus-scraps-loss-btn';
    const btn = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Loading ad...'; }
    showRewardAd(function() { _grantBonusScraps(screen); });
};

function _grantBonusScraps(screen) {
    window._bonusScrapsUsed = true;
    // Double the pending total — applied when player exits
    if (window._pendingScrap) {
        window._pendingScrap.total *= 2;
        // Refresh the displayed total so player can see it update immediately
        const el  = document.getElementById(screen === 'win' ? 'sb-total-v' : 'sb-total');
        if (el) el.textContent = window._pendingScrap.total + ' scraps';
    }
    const btnId = screen === 'win' ? 'bonus-scraps-win-btn' : 'bonus-scraps-loss-btn';
    const btn = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> 2× APPLIED!'; }
    // Disable other screen's button too (one claim per run)
    const otherId = screen === 'win' ? 'bonus-scraps-loss-btn' : 'bonus-scraps-win-btn';
    const other = document.getElementById(otherId);
    if (other) { other.disabled = true; other.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> CLAIMED'; }
}

// Placeholder for when Locker Shop UI is built (Phase 2)
window.openLocker = function() {
    const scraps = typeof LockerSystem !== 'undefined' ? LockerSystem.getScraps() : '?';
    if (typeof kAlert === 'function') {
        kAlert('LOCKER & SHOP', 'Coming soon!\n\nYou have ' + scraps + ' scraps saved.', { icon: '<i class="fa-solid fa-shirt"></i>' });
    }
};

// --- Game State Variables ---
        let currentDifficulty = 'easy'; // set by startGame
        let scene, camera, renderer, raycaster, mouse;
        var gold=650, lives=20, wave=0, activeWave=false;
	let lastSpendTime = 0;
        let spawningFinished = true; 
        let enemies=[], towers=[], projectiles=[], particles=[], mapProps=[];
        let selectedType=null, selectedTower=null, selectedEnemyId=null;
        let hoverMesh, rangeRing, deadZoneRing;
        let gameRunning = false;
        let isPaused = false;
        let selectedMapIndex = 0;
        let currentWaypoints = [];
        let graphicsHigh = true;
        let prevMenu = null;
        let autoWave = false;
        let isPanning = false;
        let panStart = new THREE.Vector2();
        let graphicsMode = 3; // 0=Low, 1=Medium, 2=High, 3=Ultra, 4=Custom
        
        // Track graphics state for shadow restart warning
        let previousGraphicsMode = 3;
        let previousShadowsEnabled = true;
        let pendingGraphicsChange = false;

        // Advanced graphics settings
        let advancedGraphicsSettings = {
            shadowsEnabled: true,
            shadowResolution: 4096,
            shadowSoftness: 2,
            lightingQuality: 1.0,
            bloomEnabled: true,
            bloomIntensity: 1.5,
            ssaoEnabled: true,
            ssaoIntensity: 1.0,
            motionBlurEnabled: false,
            motionBlurStrength: 0.5,
            dofEnabled: false,
            dofStrength: 0.5,
            particleMultiplier: 1.0,
            postProcessingEnabled: true,
            renderDistance: 1.0,
            lodBias: 1.0,
            pixelRatio: 2.0,
            antiAliasing: true,
            colorCorrection: true
        };

        // Achievement tracking
        let achievementsData = {
            first_blood: { unlocked: false, progress: 0, total: 1 },
            tower_master: { unlocked: false, progress: 0, total: 10 },
            wave_warrior: { unlocked: false, progress: 0, total: 50 },
            millionaire: { unlocked: false, progress: 0, total: 1000000 },
            no_damage: { unlocked: false, progress: 0, total: 1 },
            speed_demon: { unlocked: false, progress: 0, total: 1 },
            collector: { unlocked: false, progress: 0, total: 20 },
            survivor: { unlocked: false, progress: 0, total: 100 }
        };
        let totalKills = 0;
        let totalGoldEarned = 0;
        let totalWavesCompleted = 0
        let shadowsEnabled = true;
	let composer, bloomPass; // For visual effects
        let shakeEnabled = true;
        let dmgTextEnabled = true;
	let healthBarsEnabled = true;
        let showFPSCounter = true; // Default ON
        let bloomStrength = 1.5; // Default
        let cameraFOV = 45;
        let shakeIntensity = 0;
        let shakeDecay = 0.8; // How fast shake stops
        let originalCamPos = new THREE.Vector3(); // Stores position before shaking
        let currentGamemode = 'shared';
	let playerWallets = [0, 0, 0, 0]; // Stores gold for P1, P2, P3, P4
	let allPlayers = []; // Stores the player list from the server
	let playerLevels = {}; // Maps socket.id -> playerLevel for lobby display
        window.playerLevels = playerLevels; // expose for UI.js updateUI
	let myPlayerIndex = 0; // 0=Host, 1=Joiner1, etc.
	const PLAYER_COLORS = ['#e67e22', '#3498db', '#2ecc71', '#9b59b6']; // Orange, Blue, Green, Purple
	let TOWER_ICONS = {};
	let ENEMY_ICONS = {};
	let previewScene, previewCam, previewRenderer, previewModel;
	let isPreviewing = false;
	let lastSyncTime = 0;
	let isMultiplayerMode = false; // Track if in multiplayer

        // Performance Monitoring Variables
        let fpsCounter = { frames: 0, lastTime: performance.now(), fps: 60 };
        let pingMonitor = { lastPing: 0, samples: [], lastPingTime: 0 };
        let hostPing = 0;
        let serverLocation = 'UNKNOWN';
        let mpWarningShown = false;

        // Helper function to check if in multiplayer mode
        function checkIsMultiplayerMode() {
            return isMultiplayerMode === true;
        }


// --- init() ---
        // ── SHARED GEOMETRY & MATERIAL POOLS ──────────────────────────────────
        // Created once at startup, reused every frame — eliminates per-shot GC pressure
        const _GEO = {
            bullet_sm:  new THREE.SphereGeometry(0.3, 6, 6),
            bullet_lg:  new THREE.SphereGeometry(0.4, 6, 6),
            fire:       new THREE.SphereGeometry(0.4, 5, 5),
            cannonball: new THREE.SphereGeometry(0.5, 8, 8),
            plasma_ball:new THREE.SphereGeometry(0.5, 8, 8),
            particle:   new THREE.SphereGeometry(0.3, 4, 4),
        };
        const _MAT = {
            fire:    new THREE.MeshBasicMaterial({ color: 0xff4500 }),
            laser:   new THREE.MeshBasicMaterial({ color: 0xe74c3c }),
            tesla:   new THREE.LineBasicMaterial({ color: 0x5dade2 }),
            beam:    new THREE.LineBasicMaterial({ color: 0xe74c3c }),
        };
        // Per-tower-color bullet materials (keyed by hex color int)
        const _bulletMat = {};
        function getBulletMat(color) {
            if (!_bulletMat[color]) _bulletMat[color] = new THREE.MeshBasicMaterial({ color });
            return _bulletMat[color];
        }
        // Reusable Vector3s for hot-path calculations — avoids GC
        const _tmpV3a = new THREE.Vector3();
        const _tmpV3b = new THREE.Vector3();
        // ────────────────────────────────────────────────────────────────────────

        function init() {
            loadAchievements();
            loadData();     // Load Almanac
	    initPreviewSystem();

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x111111);
            scene.fog = new THREE.FogExp2(0x111111, 0.007);

            camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 1000);
            camera.position.set(0, 110, 50); 
            camera.lookAt(0, 0, 0);

            renderer = new THREE.WebGLRenderer({ 
                antialias: true, 
                preserveDrawingBuffer: true,
                powerPreference: "high-performance",
                alpha: false,
                stencil: false
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x
            
            // Enhanced rendering settings
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            renderer.outputEncoding = THREE.sRGBEncoding;
            
            document.body.appendChild(renderer.domElement);
	    initMobileControls();
	    initPostProcessing();

            // ============ ENHANCED LIGHTING SYSTEM ============
            
            // 1. Ambient Light (Base illumination)
            const amb = new THREE.AmbientLight(0xffffff, 0.4);
            scene.add(amb);
            
            // 2. Main Directional Light (Sun)
            const dir = new THREE.DirectionalLight(0xffffff, 0.8);
            dir.position.set(-30, 80, 20);
            dir.castShadow = true;
            dir.shadow.mapSize.set(4096, 4096); // Higher quality shadows
            dir.shadow.camera.left = -100;
            dir.shadow.camera.right = 100;
            dir.shadow.camera.top = 100;
            dir.shadow.camera.bottom = -100;
            dir.shadow.camera.near = 0.5;
            dir.shadow.camera.far = 200;
            dir.shadow.bias = -0.0001;
            scene.add(dir);
            
            // 3. Hemisphere Light (Sky/Ground color blend)
            const hemi = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, 0.3);
            hemi.position.set(0, 50, 0);
            scene.add(hemi);
            
            // 4. Rim Light (Back lighting for depth)
            const rim = new THREE.DirectionalLight(0x6699ff, 0.3);
            rim.position.set(50, 30, -50);
            scene.add(rim);
            
            // Store lights for quality adjustments
            window.mainLights = { amb, dir, hemi, rim };
	    createStarfield();

	    loadCustomIcons();
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            
            window.addEventListener('resize', onResize);
            window.addEventListener('wheel', (e) => {
                camera.position.y += e.deltaY * 0.05;
                camera.position.y = Math.max(30, Math.min(180, camera.position.y));
            });
            
            renderer.domElement.addEventListener('mousemove', onMM);
            renderer.domElement.addEventListener('mousedown', onMD);
            renderer.domElement.addEventListener('mouseup', onMU);
	    
	    loadMap(0);
            initUI();
	    loadSettings(); // NEW: Load Volume & Graphics
            
            // ═══════════════════════════════════════════════════════════
            // ENHANCEMENTS INITIALIZATION
            // ═══════════════════════════════════════════════════════════
            if (typeof initPerformanceMonitor === 'function') {
                initPerformanceMonitor();
                console.log('✅ Performance monitor initialized');
            }
            
            // Show tutorial for new players (after 1 second delay)
            setTimeout(() => {
                if (typeof shouldShowTutorial === 'function' && shouldShowTutorial()) {
                    if (typeof showTutorial === 'function') {
                        showTutorial();
                    }
                }
            }, 1000);
            // ═══════════════════════════════════════════════════════════
            
            animate();

            // Check if player was mid-game before a refresh
            setTimeout(() => {
                if (typeof checkForRejoinOnLoad === 'function') checkForRejoinOnLoad();
            }, 800);
            
            // Audio init on any click
            ['click', 'touchstart'].forEach(evt => 
    	    window.addEventListener(evt, () => AudioSys.init(), {once:true})
	    );
            
            // CRITICAL: Notify CrazyGames that loading is complete
            // Main menu is now visible and ready
            notifyLoadingComplete();
        }

// --- Game control: resetGame, pause, loadMap, environment ---
        function resetGame() {
            // 1. Cleanup Scene
            enemies.forEach(e => { scene.remove(e.mesh); if(e.hpGroup) scene.remove(e.hpGroup); });
            towers.forEach(t => scene.remove(t.mesh));
            projectiles.forEach(p => scene.remove(p.mesh));
            mapProps.forEach(m => scene.remove(m));
            particles.forEach(p => scene.remove(p.mesh));
            
            if(hoverMesh) scene.remove(hoverMesh);
            if(rangeRing) scene.remove(rangeRing);
            
            // 2. Clear Arrays
            enemies = []; 
            towers = []; 
            projectiles = []; 
            particles = []; 
            mapProps = [];

            // 3. Reset State & Gold (FIXED)
            // We use GAME_CONFIG.gold so Easy mode gets $800 and Hard gets $500
            gold = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.gold) ? GAME_CONFIG.gold : 650;
            
            // Reset Multiplayer Wallets
	    playerWallets = [gold, gold, gold, gold];

            lives = 20; 
            wave = 0; 
            activeWave = false; 
            spawningFinished = true;
            selectedType = null; 
            selectedTower = null;

            // 4. Reset UI
            const btn = document.getElementById('btn-start-wave');
            if(btn) {
                btn.disabled = false;
                btn.innerText = "START WAVE";
                btn.style.backgroundColor = "";
            }
            
            // Safety: Ensure end screens are hidden immediately
            document.getElementById('game-over-screen').style.display = 'none';
            document.getElementById('victory-screen').style.display = 'none';
        }

        window.togglePause = function() {
            // Multiplayer Logic
            if(socket && myRoomId) {
                if(myRole === 'host') {
                    socket.emit('requestPause', { roomId: myRoomId, isPaused: !isPaused });
                }
                return; // Joiners cannot toggle locally
            }

            // Single Player Logic
            runPauseLogic(!isPaused);
        }

        // New helper to handle the actual UI/State change
        function runPauseLogic(pauseState) {
            isPaused = pauseState;
            
            // CrazyGames SDK Integration: Stop/Start gameplay tracking
            if (pauseState) {
                // Game is being paused
                notifyGameplayStop();
            } else {
                // Game is being resumed
                notifyGameplayStart();
            }
            
            // If we are unpausing, force hide ALL modals so players aren't stuck in Settings
            if (!pauseState) {
                hideAllScreens();
                setGameUIVisible(true);
            } else {
                document.getElementById('pause-menu').style.display = 'flex';
            }
        }
        window.restartLevel = function() {
            if(socket && myRoomId) {
                if(myRole === 'host') {
                    socket.emit('requestRestart', myRoomId);
                }
                return;
            }
            // Commit deferred scraps before wiping game state
            if (typeof window._awardPendingScraps === 'function') window._awardPendingScraps();
            // Single player logic
            startGame(GAME_CONFIG.maxWaves === 20 ? 'easy' : GAME_CONFIG.maxWaves === 40 ? 'medium' : 'hard');
        }
// --- MAP GENERATION ---
        function loadMap(idx) {
            const data = MAPS[idx];
            currentWaypoints = data.path;
            
            // Apply graphics settings after map loads to ensure they persist
            if (typeof applyGraphicsSettings === 'function') {
                applyGraphicsSettings();
            }

            // --- 1. NEW ATMOSPHERE (FIXED FOG) ---
            if (idx === 0) { // Canyon
                scene.background = new THREE.Color(0x000000); 
                scene.fog = new THREE.FogExp2(0xE6C288, 0.002); 
            } else if (idx === 1) { // Frozen
                scene.background = new THREE.Color(0x2c3e50); 
                scene.fog = new THREE.FogExp2(0xaaddff, 0.004); 
            } else if (idx === 2) { // Volcano
                scene.background = new THREE.Color(0x050000); 
                scene.fog = new THREE.FogExp2(0x550000, 0.005); 
            } else if (idx === 3) { // --- KITTY KINGDOM ---
                scene.background = new THREE.Color(0xffcce0); // Light Pink Sky
                scene.fog = new THREE.FogExp2(0xffcce0, 0.006); 
	    } else if (idx === 4) { // --- THE VOID ---
                scene.background = new THREE.Color(0x050010); // Deep Purple/Black
                scene.fog = new THREE.FogExp2(0x050010, 0.008); 
            } else if (idx === 5) { // Crystal Caves
                scene.background = new THREE.Color(0x1a0b2e); // Deep Purple
                scene.fog = new THREE.FogExp2(0x1a0b2e, 0.006);
            } else if (idx === 6) { // Neon City
                scene.background = new THREE.Color(0x000022); // Cyber Blue/Black
                scene.fog = new THREE.FogExp2(0x000022, 0.004);
            } else if (idx === 7) { // Toxic Swamp
                scene.background = new THREE.Color(0x0a1a0a); // Murky Green
                scene.fog = new THREE.FogExp2(0x0a1a0a, 0.015); // Heavy Fog
            } else if (idx === 8) { // Space Station
                scene.background = new THREE.Color(0x000000); // Pure Space
                scene.fog = new THREE.FogExp2(0x000000, 0.001); // Almost no fog
            } else if (idx === 9) { // Harvest Valley (Farm)
                scene.background = new THREE.Color(0x87CEEB); // Sky Blue
                scene.fog = new THREE.FogExp2(0x87CEEB, 0.003); // Light fog
            } else if (idx === 10) { // Jungle Temple
                scene.background = new THREE.Color(0x2d4a2b); // Dark jungle green
                scene.fog = new THREE.FogExp2(0x2d4a2b, 0.008); // Dense jungle fog
            } else if (idx === 11) { // Mushroom Forest
                scene.background = new THREE.Color(0x4a2c5e); // Purple twilight
                scene.fog = new THREE.FogExp2(0x6a4c7e, 0.007); // Magical purple mist
            }
            // Floor
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(240, 180), new THREE.MeshStandardMaterial({ color: data.floorColor, roughness: 0.9 }));
            plane.rotation.x = -Math.PI/2;
            plane.receiveShadow = shadowsEnabled; scene.add(plane); mapProps.push(plane);

            // Path Generation
            const pathMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            for(let i=0; i<currentWaypoints.length-1; i++) {
                const a = currentWaypoints[i], b = currentWaypoints[i+1];
                const len = a.distanceTo(b);
                const mid = new THREE.Vector3().lerpVectors(a,b,0.5);
                const road = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.2, len), pathMat);
                road.position.copy(mid);
                road.position.y = 0.05; road.lookAt(b); road.receiveShadow = shadowsEnabled;
                scene.add(road); mapProps.push(road);
                const joint = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.2, ROAD_WIDTH), pathMat);
                joint.position.copy(a);
                joint.position.y = 0.05; scene.add(joint); mapProps.push(joint);
                if(i===currentWaypoints.length-2) { const end = joint.clone(); end.position.copy(b); scene.add(end); mapProps.push(end); }
            }

            // Grid removed - freeform tower placement enabled
            
            // Ghost tower preview (Group swapped per selectedType)
            hoverMesh = new THREE.Group();
            scene.add(hoverMesh);
            rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
            rangeRing.rotation.x = -Math.PI/2; rangeRing.position.y = 0.5; rangeRing.visible = false; scene.add(rangeRing);
            
            // Dead zone ring (red inner circle for mortars)
            deadZoneRing = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
            deadZoneRing.rotation.x = -Math.PI/2; deadZoneRing.position.y = 0.51; deadZoneRing.visible = false; scene.add(deadZoneRing);

            // ── GHOST TOWER HELPERS ───────────────────────────────────────────────────
            let _ghostType = null;
            const _ghostTint = new THREE.Color();

            function _ghostify(group, valid) {
                _ghostTint.setHex(valid ? 0x44ccff : 0xff3333);
                group.traverse(child => {
                    if (!child.isMesh) return;
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(m => {
                        m.transparent = true;
                        m.opacity      = 0.42;
                        m.depthWrite   = false;
                        if (m.color)    m.color.lerp(_ghostTint, 0.5);
                        if (m.emissive) m.emissive.copy(_ghostTint).multiplyScalar(0.2);
                        m.needsUpdate  = true;
                    });
                });
            }

            window._rebuildGhostTower = function(type, valid) {
                if (!type) { _ghostType = null; hoverMesh.visible = false; return; }
                if (type !== _ghostType) {
                    while (hoverMesh.children.length) hoverMesh.remove(hoverMesh.children[0]);
                    hoverMesh.add(createTowerModel(type, 1));
                    _ghostType = type;
                }
                _ghostify(hoverMesh, valid);
                hoverMesh.visible = true;
            };

            window._updateGhostValidity = function(valid) {
                if (_ghostType) _ghostify(hoverMesh, valid);
            };
            // ─────────────────────────────────────────────────────────────────────────

            // --- NEW: Calculate Road Directions for alignment ---
            // Start Dir: Pointing FROM start TO first waypoint
            const p0 = currentWaypoints[0];
            const p1 = currentWaypoints[1];
            const startDir = new THREE.Vector3().subVectors(p1, p0).normalize();

            // End Dir: Pointing FROM last waypoint TO base
            const last = currentWaypoints[currentWaypoints.length-1];
            const secondLast = currentWaypoints[currentWaypoints.length-2];
            const endDir = new THREE.Vector3().subVectors(last, secondLast).normalize();

            createEnvironmentProps(p0, last, startDir, endDir);
            // ----------------------------------------------------
            
            createDecorations(idx);
            createAtmosphericParticles(idx);
            buildMapBiome(idx);
        }

        // ============================================================================
        // buildMapBiome — adds world-boundary geometry so the map feels grounded
        // in a real place rather than a floating platform.
        // Adds: extended ground skirt, perimeter backdrop walls, road kerbs.
        // Nothing here affects gameplay — all pushed to mapProps for cleanup.
        // ============================================================================
        function buildMapBiome(idx) {

            // ── helpers ──────────────────────────────────────────────────────────────
            function addProp(mesh) { scene.add(mesh); mapProps.push(mesh); }
            function mat(color, rough, metal, emissive, emissiveInt) {
                return new THREE.MeshStandardMaterial({
                    color, roughness: rough ?? 0.9,
                    metalness: metal ?? 0,
                    emissive: emissive ?? 0x000000,
                    emissiveIntensity: emissiveInt ?? 0
                });
            }
            function matBasic(color, opacity) {
                return new THREE.MeshBasicMaterial({
                    color, transparent: opacity < 1, opacity: opacity ?? 1
                });
            }

            // ── per-map config ────────────────────────────────────────────────────────
            // skirtColor: the extended ground beyond the play area
            // wallColor / wallColor2: primary and accent wall colours
            // wallH: wall height (how tall the backdrop feels)
            // fogDensity / fogColor: override fog per biome so backdrop blends
            const biomes = [
                // 0 Canyon
                { skirt: 0xb5651d, wall1: 0xc0392b, wall2: 0x8b4513, wallH: 45, road: 0x8b7355,
                  kerb: 0xd4c5a9, groundLayer: 0xa0522d },
                // 1 Frozen
                { skirt: 0xd0e8f0, wall1: 0xaaddff, wall2: 0x85c1e9, wallH: 55, road: 0x888888,
                  kerb: 0xffffff, groundLayer: 0xc8dfe8 },
                // 2 Volcano
                { skirt: 0x1a0a00, wall1: 0x4d0000, wall2: 0xff4500, wallH: 40, road: 0x111111,
                  kerb: 0xff6600, groundLayer: 0x2a1000 },
                // 3 Kitty
                { skirt: 0xffb3c6, wall1: 0xff69b4, wall2: 0xffd1e8, wallH: 30, road: 0xff99bb,
                  kerb: 0xfff0f5, groundLayer: 0xffc8da },
                // 4 Void
                { skirt: 0x050008, wall1: 0x150020, wall2: 0x6600aa, wallH: 60, road: 0x0a0012,
                  kerb: 0x8800ff, groundLayer: 0x080010 },
                // 5 Crystal Caves
                { skirt: 0x0d0621, wall1: 0x1a0b2e, wall2: 0x9b59b6, wallH: 50, road: 0x0a0620,
                  kerb: 0xaa44ff, groundLayer: 0x120830 },
                // 6 Neon City
                { skirt: 0x060612, wall1: 0x0f0f2e, wall2: 0x00ffff, wallH: 70, road: 0x0a0a1a,
                  kerb: 0x00ffcc, groundLayer: 0x0a0a20 },
                // 7 Toxic Swamp
                { skirt: 0x0a1a08, wall1: 0x1a3a10, wall2: 0x39d353, wallH: 35, road: 0x111a0a,
                  kerb: 0x2ecc71, groundLayer: 0x0f2010 },
                // 8 Space
                { skirt: 0x000005, wall1: 0x05050f, wall2: 0x3498db, wallH: 50, road: 0x080818,
                  kerb: 0x3498db, groundLayer: 0x030310 },
                // 9 Farm
                { skirt: 0x6aaa40, wall1: 0x4a7c1a, wall2: 0x8db94e, wallH: 28, road: 0x8b7355,
                  kerb: 0xffd700, groundLayer: 0x5a9a30 },
                // 10 Jungle
                { skirt: 0x1a3a10, wall1: 0x2d5a1a, wall2: 0x27ae60, wallH: 50, road: 0x2d4a2b,
                  kerb: 0x2ecc71, groundLayer: 0x1a3015 },
                // 11 Mushroom
                { skirt: 0x1a0f08, wall1: 0x2a1a30, wall2: 0x9966ff, wallH: 45, road: 0x1a1008,
                  kerb: 0x88ffaa, groundLayer: 0x1f1220 },
            ];
            const b = biomes[idx] || biomes[0];

            // ── 1. EXTENDED GROUND SKIRT ─────────────────────────────────────────────
            // Sits at y=-0.5 so it's just below the play floor, extending way out.
            // This hides the hard "cliff edge" of the play area.
            const skirtGeo = new THREE.PlaneGeometry(800, 600);
            const skirtMesh = new THREE.Mesh(skirtGeo, mat(b.skirt, 1.0));
            skirtMesh.rotation.x = -Math.PI / 2;
            skirtMesh.position.y = -0.5;
            addProp(skirtMesh);

            // Transition ring — slightly raised skirt directly at the play-area border
            // so it looks like a natural terrain edge rather than a flat cut
            for (let side = 0; side < 4; side++) {
                const isX = side < 2;
                const sign = (side % 2 === 0) ? 1 : -1;
                const w = isX ? 100 : 240;
                const d = isX ? 180 : 100;
                const slope = new THREE.Mesh(
                    new THREE.PlaneGeometry(w, d),
                    mat(b.skirt, 1.0)
                );
                slope.rotation.x = -Math.PI / 2;
                slope.position.set(
                    isX ? sign * 170 : 0,
                    -0.1,
                    isX ? 0 : sign * 140
                );
                addProp(slope);
            }

            // ── 2. ROAD KERBS ─────────────────────────────────────────────────────────
            // Each segment: two box strips along the sides, pulled in by half a tile
            // at each end so they stop cleanly at every junction.
            // Each junction: a square cap tile using the bisector of the two meeting
            // directions so it sits symmetrically regardless of turn angle.
            const kerbMat = mat(b.kerb, 0.6);
            const kerbH   = 0.28;                       // taller than road (0.2)
            const kerbW   = 0.35;                       // strip width
            const kerbOff = ROAD_WIDTH / 2 + kerbW / 2; // centre of strip from road centre

            // Pre-compute all segment directions
            const _sd = [];
            for (let i = 0; i < currentWaypoints.length - 1; i++)
                _sd.push(new THREE.Vector3().subVectors(currentWaypoints[i+1], currentWaypoints[i]).normalize());

            const _rv = d => new THREE.Vector3(-d.z, 0, d.x); // right-perp of d

            for (let i = 0; i < currentWaypoints.length - 1; i++) {
                const a  = currentWaypoints[i];
                const b2 = currentWaypoints[i + 1];
                const dir   = _sd[i];
                const right = _rv(dir);
                const sLen  = Math.max(0.01, a.distanceTo(b2) - kerbW); // pulled in half-tile each end
                const mid   = new THREE.Vector3().lerpVectors(a, b2, 0.5);

                // straight strips
                for (const s of [-1, 1]) {
                    const k = new THREE.Mesh(new THREE.BoxGeometry(kerbW, kerbH, sLen), kerbMat);
                    k.position.copy(mid).addScaledVector(right, s * kerbOff);
                    k.position.y = kerbH / 2;
                    k.lookAt(k.position.clone().add(dir));
                    addProp(k);
                }

                // cap / corner square helper
                const square = (pos, offsetDir) => {
                    for (const s of [-1, 1]) {
                        const sq = new THREE.Mesh(new THREE.BoxGeometry(kerbW, kerbH, kerbW), kerbMat);
                        sq.position.copy(pos).addScaledVector(offsetDir, s * kerbOff);
                        sq.position.y = kerbH / 2;
                        addProp(sq);
                    }
                };

                // start cap (first segment only)
                if (i === 0) square(a, right);

                if (i < currentWaypoints.length - 2) {
                    // interior corner: bisect the two right-perps
                    const bis = new THREE.Vector3().addVectors(right, _rv(_sd[i+1])).normalize();
                    square(b2, bis);
                } else {
                    // end cap
                    square(b2, right);
                }
            }

            // ── 3. PERIMETER BACKDROPS ───────────────────────────────────────────────
            // Four large walls around the map perimeter, styled per biome.
            // They're far enough away to not obstruct gameplay camera but close enough
            // to be clearly visible and give a sense of being inside somewhere.

            const W = 260, D = 200;  // map extents
            const wallDist = { x: W / 2 + 10, z: D / 2 + 10 };

            function makeWall(wx, wz, ww, wh, wd, rotY) {
                const g = new THREE.Group();
                // Base wall panel
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(ww, wh, wd),
                    mat(b.wall1, 1.0)
                );
                wall.position.y = wh / 2;
                g.add(wall);
                g.position.set(wx, 0, wz);
                if (rotY) g.rotation.y = rotY;
                return g;
            }

            // --- biome-specific perimeter ---

            if (idx === 0) {
                // CANYON: Tall sandstone cliff faces N+S, river gorge walls E+W
                const cliffMat = mat(0xc0392b, 1.0);
                const sandMat  = mat(0xd2691e, 1.0);
                [1, -1].forEach(s => {
                    // North/South cliff — wide, very tall, layered bands
                    const cliff = new THREE.Group();
                    const layers = [
                        { h: 15, c: 0xb5651d }, { h: 12, c: 0xc0392b },
                        { h: 10, c: 0xd2691e }, { h: 8,  c: 0xa0522d }
                    ];
                    let yOff = 0;
                    layers.forEach(l => {
                        const band = new THREE.Mesh(
                            new THREE.BoxGeometry(260, l.h, 8),
                            mat(l.c, 1.0)
                        );
                        band.position.y = yOff + l.h / 2;
                        yOff += l.h;
                        cliff.add(band);
                    });
                    // Overhang on top
                    const overhang = new THREE.Mesh(
                        new THREE.BoxGeometry(260, 5, 14),
                        mat(0x8b4513, 1.0)
                    );
                    overhang.position.set(0, yOff + 2, 3);
                    cliff.add(overhang);
                    // Vertical crack lines
                    for (let k = 0; k < 8; k++) {
                        const crack = new THREE.Mesh(
                            new THREE.BoxGeometry(0.5, 35 + Math.random() * 10, 9),
                            mat(0x6b3a1f, 1.0)
                        );
                        crack.position.set(-110 + k * 30, 20, 0);
                        cliff.add(crack);
                    }
                    cliff.position.set(0, 0, s * wallDist.z);
                    addProp(cliff);
                });
                // E+W: lower rocky gorge sides
                [1, -1].forEach(s => {
                    const side = new THREE.Group();
                    for (let k = 0; k < 5; k++) {
                        const rock = new THREE.Mesh(
                            new THREE.BoxGeometry(12, 18 + k * 4, 180),
                            mat(0xa0522d - k * 0x0a0a00, 1.0)
                        );
                        rock.position.set(s * (wallDist.x + k * 6), (18 + k * 4) / 2, 0);
                        side.add(rock);
                    }
                    addProp(side);
                });

            } else if (idx === 1) {
                // FROZEN: Jagged ice mountain range on all sides
                [1, -1].forEach(s => {
                    // N/S mountain range
                    const range = new THREE.Group();
                    const peakCount = 14;
                    for (let k = 0; k < peakCount; k++) {
                        const h = 25 + (k % 3) * 15 + Math.sin(k) * 8;
                        const peak = new THREE.Mesh(
                            new THREE.ConeGeometry(6 + k % 3 * 2, h, 6),
                            mat(k % 2 === 0 ? 0xaaddff : 0xffffff, 0.3, 0.2)
                        );
                        peak.position.set(-120 + k * 18, h / 2, s * wallDist.z);
                        // Snow cap
                        const cap = new THREE.Mesh(
                            new THREE.ConeGeometry(3, h * 0.3, 6),
                            mat(0xffffff, 0.1)
                        );
                        cap.position.set(-120 + k * 18, h * 0.88, s * wallDist.z);
                        addProp(peak); addProp(cap);
                    }
                });
                [1, -1].forEach(s => {
                    const peakCount = 10;
                    for (let k = 0; k < peakCount; k++) {
                        const h = 20 + (k % 4) * 10;
                        const peak = new THREE.Mesh(
                            new THREE.ConeGeometry(5, h, 6),
                            mat(k % 2 === 0 ? 0x85c1e9 : 0xffffff, 0.3, 0.1)
                        );
                        peak.position.set(s * wallDist.x, h / 2, -80 + k * 16);
                        addProp(peak);
                    }
                });

            } else if (idx === 2) {
                // VOLCANO: Lava walls + smoking vents
                [1, -1].forEach(s => {
                    const wall = new THREE.Group();
                    // Basalt wall
                    const base = new THREE.Mesh(
                        new THREE.BoxGeometry(260, 35, 10),
                        mat(0x222222, 0.4, 0.3)
                    );
                    base.position.y = 17;
                    wall.add(base);
                    // Lava glow cracks
                    for (let k = 0; k < 10; k++) {
                        const crack = new THREE.Mesh(
                            new THREE.BoxGeometry(2 + Math.random() * 3, 35, 11),
                            mat(0xff4500, 0.5, 0, 0xff4500, 1.5)
                        );
                        crack.position.set(-120 + k * 24, 17, 0);
                        wall.add(crack);
                    }
                    wall.position.set(0, 0, s * wallDist.z);
                    addProp(wall);
                    // Smoke columns
                    for (let k = 0; k < 5; k++) {
                        const vent = new THREE.Mesh(
                            new THREE.CylinderGeometry(1.5, 3, 25, 8),
                            mat(0x111111, 1.0)
                        );
                        vent.position.set(-100 + k * 50, 12, s * wallDist.z);
                        addProp(vent);
                    }
                });
                // Side walls
                [1, -1].forEach(s => {
                    const wall = new THREE.Mesh(
                        new THREE.BoxGeometry(10, 30, 180),
                        mat(0x1a0a00, 0.4, 0.3)
                    );
                    wall.position.set(s * wallDist.x, 15, 0);
                    addProp(wall);
                });
                // Lava floor pits (glowing flat planes between play area and wall)
                for (let k = 0; k < 6; k++) {
                    const pit = new THREE.Mesh(
                        new THREE.PlaneGeometry(20, 15),
                        mat(0xff4500, 0.5, 0, 0xff2200, 2.0)
                    );
                    pit.rotation.x = -Math.PI / 2;
                    pit.position.set(-100 + k * 40, -0.4, (k % 2 === 0 ? 1 : -1) * 105);
                    addProp(pit);
                }

            } else if (idx === 3) {
                // KITTY KINGDOM: Candy castle towers + cloud platforms
                const towerColors = [0xff69b4, 0xffb3de, 0xffa0d0, 0xff88cc];
                const positions = [
                    [-wallDist.x, wallDist.z], [wallDist.x, wallDist.z],
                    [-wallDist.x, -wallDist.z], [wallDist.x, -wallDist.z],
                    [0, wallDist.z], [0, -wallDist.z]
                ];
                positions.forEach(([px, pz], i) => {
                    const tower = new THREE.Group();
                    const c = towerColors[i % towerColors.length];
                    const body = new THREE.Mesh(
                        new THREE.CylinderGeometry(5, 6, 25, 8),
                        mat(c, 0.5)
                    );
                    body.position.y = 12;
                    const cone = new THREE.Mesh(
                        new THREE.ConeGeometry(6, 12, 8),
                        mat(0xff4499, 0.5)
                    );
                    cone.position.y = 31;
                    // Battlements
                    for (let k = 0; k < 8; k++) {
                        const bat = new THREE.Mesh(
                            new THREE.BoxGeometry(2, 3, 2),
                            mat(c, 0.6)
                        );
                        const angle = (k / 8) * Math.PI * 2;
                        bat.position.set(Math.cos(angle) * 5, 26, Math.sin(angle) * 5);
                        tower.add(bat);
                    }
                    tower.add(body, cone);
                    tower.position.set(px, 0, pz);
                    addProp(tower);
                });
                // Cloud platforms at mid-height
                for (let k = 0; k < 8; k++) {
                    const cloud = new THREE.Mesh(
                        new THREE.SphereGeometry(5 + k % 3 * 2, 8, 6),
                        mat(0xffffff, 0.1)
                    );
                    cloud.scale.y = 0.4;
                    cloud.position.set(
                        -100 + k * 28, 15 + (k % 3) * 5,
                        (k % 2 === 0 ? 1 : -1) * (wallDist.z - 5)
                    );
                    addProp(cloud);
                }

            } else if (idx === 4) {
                // THE VOID: Floating cosmic debris + energy pillars
                // Giant void obelisks at corners
                [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx, sz]) => {
                    const obelisk = new THREE.Group();
                    const shaft = new THREE.Mesh(
                        new THREE.BoxGeometry(4, 60, 4),
                        mat(0x150020, 0.4, 0.5, 0x6600aa, 0.8)
                    );
                    shaft.position.y = 30;
                    const tip = new THREE.Mesh(
                        new THREE.OctahedronGeometry(4),
                        mat(0x8800ff, 0.2, 0, 0x8800ff, 3.0)
                    );
                    tip.position.y = 62;
                    obelisk.add(shaft, tip);
                    obelisk.position.set(sx * wallDist.x, 0, sz * wallDist.z);
                    addProp(obelisk);
                });
                // Floating debris chunks in the distance
                for (let k = 0; k < 20; k++) {
                    const debris = new THREE.Mesh(
                        new THREE.OctahedronGeometry(2 + k % 4),
                        mat(0x150020, 0.5, 0.3, 0x330066, 0.3)
                    );
                    const angle = (k / 20) * Math.PI * 2;
                    const dist = 140 + k % 3 * 20;
                    debris.position.set(
                        Math.cos(angle) * dist,
                        5 + k % 6 * 8,
                        Math.sin(angle) * dist
                    );
                    debris.rotation.set(k, k * 0.5, k * 0.3);
                    addProp(debris);
                }
                // Void abyss glow — dark plane with emissive ring far out
                const abyss = new THREE.Mesh(
                    new THREE.RingGeometry(120, 250, 64),
                    mat(0x0a0015, 0.8, 0, 0x330055, 0.5)
                );
                abyss.rotation.x = -Math.PI / 2;
                abyss.position.y = -2;
                addProp(abyss);

            } else if (idx === 5) {
                // CRYSTAL CAVES: Cave ceiling + massive crystal walls
                // Ceiling
                const ceiling = new THREE.Mesh(
                    new THREE.PlaneGeometry(400, 300),
                    mat(0x0d0621, 1.0)
                );
                ceiling.rotation.x = Math.PI / 2;
                ceiling.position.y = 55;
                addProp(ceiling);
                // Stalactites hanging from ceiling
                for (let k = 0; k < 30; k++) {
                    const h = 8 + (k % 4) * 6;
                    const stalactite = new THREE.Mesh(
                        new THREE.ConeGeometry(0.8 + k % 3 * 0.5, h, 6),
                        mat(k % 2 === 0 ? 0x9b59b6 : 0x1a0b2e, 0.3, 0.5, k%3===0 ? 0x9b59b6 : 0x000000, k%3===0 ? 0.5:0)
                    );
                    stalactite.rotation.x = Math.PI;
                    stalactite.position.set(
                        -110 + (k % 12) * 20, 55 - h / 2,
                        -80 + Math.floor(k / 12) * 80
                    );
                    addProp(stalactite);
                }
                // Giant crystal clusters at walls
                [1, -1].forEach(s => {
                    for (let k = 0; k < 8; k++) {
                        const h = 20 + k % 3 * 15;
                        const crystal = new THREE.Mesh(
                            new THREE.ConeGeometry(3 + k % 2 * 2, h, 6),
                            mat(k%2===0 ? 0x9b59b6 : 0xaa44ff, 0.2, 0.8, k%2===0 ? 0x9b59b6:0xaa44ff, 0.6)
                        );
                        crystal.position.set(s * wallDist.x, h / 2, -60 + k * 17);
                        crystal.rotation.z = s * 0.2;
                        addProp(crystal);
                    }
                });
                [1, -1].forEach(s => {
                    for (let k = 0; k < 10; k++) {
                        const h = 15 + k % 4 * 10;
                        const crystal = new THREE.Mesh(
                            new THREE.ConeGeometry(2 + k % 3, h, 6),
                            mat(k%3===0 ? 0x8e44ad:k%3===1?0xaa44ff:0x6c3483, 0.2, 0.8, 0x9b59b6, 0.4)
                        );
                        crystal.position.set(-100 + k * 22, h/2, s * wallDist.z);
                        crystal.rotation.x = s * 0.15;
                        addProp(crystal);
                    }
                });

            } else if (idx === 6) {
                // NEON CITY: Glowing skyscrapers + neon signs
                const buildingData = [
                    // [x, z, width, depth, height, wallColor, glowColor, glowIntensity]
                    ...[-1,1].flatMap(s => [
                        [-90, s*wallDist.z, 18, 16, 55, 0x0f0f2e, 0x00ffff, 1.2],
                        [-55, s*wallDist.z, 14, 12, 70, 0x0a0a20, 0xff0080, 1.0],
                        [-20, s*wallDist.z, 16, 14, 48, 0x080818, 0x00ff88, 1.0],
                        [15,  s*wallDist.z, 20, 18, 80, 0x0f0f2e, 0xff00ff, 1.5],
                        [55,  s*wallDist.z, 15, 13, 60, 0x080820, 0x00ccff, 1.0],
                        [88,  s*wallDist.z, 17, 15, 45, 0x0a0a2a, 0xffcc00, 0.8],
                    ])
                ];
                buildingData.forEach(([bx, bz, bw, bd, bh, bc, gc, gi]) => {
                    const building = new THREE.Group();
                    // Dark glass body
                    const body = new THREE.Mesh(
                        new THREE.BoxGeometry(bw, bh, bd),
                        mat(bc, 0.3, 0.6)
                    );
                    body.position.y = bh / 2;
                    building.add(body);
                    // Neon edge strips (glowing outlines)
                    [[bw/2+0.1,0],[-(bw/2+0.1),0]].forEach(([ex, ez]) => {
                        const strip = new THREE.Mesh(
                            new THREE.BoxGeometry(0.4, bh, bd + 0.4),
                            mat(gc, 0.2, 0, gc, gi)
                        );
                        strip.position.set(ex, bh / 2, ez);
                        building.add(strip);
                    });
                    // Roof light
                    const roofLight = new THREE.Mesh(
                        new THREE.BoxGeometry(bw, 0.8, bd),
                        mat(gc, 0.2, 0, gc, gi * 1.5)
                    );
                    roofLight.position.y = bh + 0.4;
                    building.add(roofLight);
                    // Window grid (light patches)
                    const rows = Math.floor(bh / 8), cols = Math.floor(bw / 5);
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            if (Math.random() > 0.4) {
                                const win = new THREE.Mesh(
                                    new THREE.PlaneGeometry(2.5, 3),
                                    mat(gc, 0.5, 0, gc, 0.4)
                                );
                                win.position.set(
                                    -bw/2 + c * 5 + 2.5,
                                    5 + r * 8,
                                    bd / 2 + 0.15
                                );
                                building.add(win);
                            }
                        }
                    }
                    building.position.set(bx, 0, bz);
                    addProp(building);
                });
                // Side buildings (shorter, E+W edges)
                [1, -1].forEach(s => {
                    for (let k = 0; k < 6; k++) {
                        const bh = 30 + k % 3 * 20;
                        const building = new THREE.Mesh(
                            new THREE.BoxGeometry(12, bh, 14),
                            mat(0x080820, 0.3, 0.5, 0x00ffff, 0.2)
                        );
                        building.position.set(s * wallDist.x, bh / 2, -80 + k * 32);
                        addProp(building);
                    }
                });

            } else if (idx === 7) {
                // TOXIC SWAMP: Murky water + gnarled dead trees + gas vents
                // Water plane surrounding the elevated play area
                const swampWater = new THREE.Mesh(
                    new THREE.PlaneGeometry(800, 600),
                    mat(0x0d2010, 0.8, 0, 0x003300, 0.3)
                );
                swampWater.rotation.x = -Math.PI / 2;
                swampWater.position.y = -1.5;
                addProp(swampWater);
                // Murky surface shimmer patches
                for (let k = 0; k < 12; k++) {
                    const patch = new THREE.Mesh(
                        new THREE.CircleGeometry(8 + k % 4 * 4, 16),
                        mat(0x39d353, 0.7, 0, 0x00aa00, 0.8)
                    );
                    patch.rotation.x = -Math.PI / 2;
                    patch.position.set(
                        -100 + (k % 6) * 40, -1.4,
                        (k < 6 ? 1 : -1) * (wallDist.z + 5 + k * 3)
                    );
                    addProp(patch);
                }
                // Dead gnarled trees at border
                [1, -1].forEach(s => {
                    for (let k = 0; k < 8; k++) {
                        const tree = new THREE.Group();
                        const trunk = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.6, 1, 15 + k % 3 * 5, 6),
                            mat(0x2d1b00, 1.0)
                        );
                        trunk.position.y = 8;
                        tree.add(trunk);
                        // Twisted branches
                        for (let b2 = 0; b2 < 4; b2++) {
                            const branch = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.2, 0.4, 5, 5),
                                mat(0x1a1000, 1.0)
                            );
                            branch.position.set((b2%2?1:-1)*2, 12+b2*1.5, (b2<2?1:-1)*1.5);
                            branch.rotation.z = (b2%2?0.6:-0.6);
                            branch.rotation.x = (b2<2?0.4:-0.4);
                            tree.add(branch);
                        }
                        tree.position.set(-110 + k * 32, 0, s * wallDist.z);
                        addProp(tree);
                    }
                });
                // Gas vent columns
                for (let k = 0; k < 8; k++) {
                    const vent = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.8, 1.2, 3, 8),
                        mat(0x1a3a10, 0.9)
                    );
                    vent.position.set(
                        (k % 2 === 0 ? 1 : -1) * (wallDist.x + 15),
                        1.5, -60 + k * 18
                    );
                    addProp(vent);
                }

            } else if (idx === 8) {
                // SPACE STATION: Hull panels + solar arrays + distant planet
                // Hull walls
                [1, -1].forEach(s => {
                    const hull = new THREE.Group();
                    const plate = new THREE.Mesh(
                        new THREE.BoxGeometry(260, 30, 10),
                        mat(0x2c3e50, 0.3, 0.7)
                    );
                    plate.position.y = 15;
                    hull.add(plate);
                    // Riveted panels
                    for (let k = 0; k < 8; k++) {
                        const panel = new THREE.Mesh(
                            new THREE.BoxGeometry(28, 25, 11),
                            mat(0x1a2a3a, 0.4, 0.8)
                        );
                        panel.position.set(-112 + k * 32, 15, 0);
                        hull.add(panel);
                        // Panel light
                        const light = new THREE.Mesh(
                            new THREE.BoxGeometry(2, 2, 12),
                            mat(0x3498db, 0.2, 0, 0x3498db, 1.5)
                        );
                        light.position.set(-112 + k * 32, 28, 0);
                        hull.add(light);
                    }
                    hull.position.set(0, 0, s * wallDist.z);
                    addProp(hull);
                });
                // Solar panel arrays on E+W
                [1, -1].forEach(s => {
                    const array = new THREE.Group();
                    for (let k = 0; k < 4; k++) {
                        const arm = new THREE.Mesh(
                            new THREE.BoxGeometry(2, 1, 18),
                            mat(0x95a5a6, 0.4, 0.8)
                        );
                        arm.position.y = 4 + k * 6;
                        array.add(arm);
                        const panel = new THREE.Mesh(
                            new THREE.BoxGeometry(1, 20, 10),
                            mat(0x1a3a60, 0.3, 0.1, 0x2255aa, 0.3)
                        );
                        panel.position.set(0, 4 + k * 6, 14);
                        array.add(panel);
                    }
                    array.position.set(s * wallDist.x, 0, 0);
                    addProp(array);
                });
                // Distant planet (huge sphere, very far)
                const planet = new THREE.Mesh(
                    new THREE.SphereGeometry(60, 32, 24),
                    mat(0x1a4a8a, 0.6, 0, 0x0a2244, 0.2)
                );
                planet.position.set(200, 80, -300);
                addProp(planet);
                // Planet ring
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(70, 95, 64),
                    mat(0x4a6a8a, 0.7, 0, 0x2a4a6a, 0.15)
                );
                ring.rotation.x = -0.4;
                ring.position.set(200, 80, -300);
                addProp(ring);

            } else if (idx === 9) {
                // HARVEST VALLEY: Rolling hills + barn + fields
                // Rolling terrain on N/S (gentle hill silhouettes)
                [1, -1].forEach(s => {
                    for (let k = 0; k < 12; k++) {
                        const h = 8 + (k % 4) * 5;
                        const hill = new THREE.Mesh(
                            new THREE.SphereGeometry(12 + k%3*4, 12, 8),
                            mat(k%2===0 ? 0x4a9a28:0x6aaa40, 0.9)
                        );
                        hill.scale.y = 0.5;
                        hill.position.set(-110 + k * 20, h * 0.25, s * wallDist.z);
                        addProp(hill);
                    }
                });
                // Barn on east side
                const barn = new THREE.Group();
                const barnBody = new THREE.Mesh(
                    new THREE.BoxGeometry(20, 15, 18),
                    mat(0xcc3300, 0.9)
                );
                barnBody.position.y = 7.5;
                const barnRoof = new THREE.Mesh(
                    new THREE.CylinderGeometry(0, 13, 10, 4),
                    mat(0x881100, 0.9)
                );
                barnRoof.position.y = 17;
                barnRoof.rotation.y = Math.PI / 4;
                // White siding boards
                for (let k = 0; k < 3; k++) {
                    const board = new THREE.Mesh(
                        new THREE.BoxGeometry(20.2, 0.6, 0.4),
                        mat(0xffffff, 0.9)
                    );
                    board.position.set(0, 3 + k * 5, 9.1);
                    barn.add(board);
                }
                barn.add(barnBody, barnRoof);
                barn.position.set(wallDist.x + 15, 0, 20);
                addProp(barn);
                // Wheat fields (flat strips with warm color)
                for (let k = 0; k < 6; k++) {
                    const field = new THREE.Mesh(
                        new THREE.PlaneGeometry(30, 20),
                        mat(k%2===0 ? 0xd4af37:0xc8a820, 0.9)
                    );
                    field.rotation.x = -Math.PI / 2;
                    field.position.set(-110 + k * 40, 0.05, (k%2===0?1:-1) * (wallDist.z - 15));
                    addProp(field);
                }
                // Wooden fence posts along perimeter
                for (let k = 0; k < 15; k++) {
                    const post = new THREE.Mesh(
                        new THREE.BoxGeometry(0.8, 3, 0.8),
                        mat(0x8b4513, 1.0)
                    );
                    post.position.set(-120 + k * 17, 1.5, wallDist.z + 2);
                    addProp(post);
                    const rail = new THREE.Mesh(
                        new THREE.BoxGeometry(17, 0.4, 0.4),
                        mat(0x8b4513, 1.0)
                    );
                    rail.position.set(-111 + k * 17, 2.2, wallDist.z + 2);
                    addProp(rail);
                }

            } else if (idx === 10) {
                // JUNGLE TEMPLE: Stone temple ruins + canopy + waterfalls
                // Dense canopy ceiling
                for (let k = 0; k < 20; k++) {
                    const canopy = new THREE.Mesh(
                        new THREE.SphereGeometry(12 + k%4*4, 10, 6),
                        mat(k%3===0?0x1a5c1a:k%3===1?0x228b22:0x2ecc71, 1.0)
                    );
                    canopy.scale.y = 0.5;
                    canopy.position.set(
                        -100 + (k%10)*22, 28 + (k%3)*5,
                        (k<10?wallDist.z:-wallDist.z) + (k%3)*5
                    );
                    addProp(canopy);
                }
                // Temple ruins — broken stone columns + archways
                [wallDist.x, -wallDist.x].forEach(px => {
                    for (let k = 0; k < 5; k++) {
                        const colH = 8 + k % 3 * 5;
                        const col = new THREE.Mesh(
                            new THREE.CylinderGeometry(1.5, 1.8, colH, 8),
                            mat(0x7a7a7a, 1.0)
                        );
                        col.position.set(px, colH/2, -60 + k * 28);
                        addProp(col);
                        // Broken top
                        if (k % 2 === 0) {
                            const cap = new THREE.Mesh(
                                new THREE.BoxGeometry(4, 1.5, 4),
                                mat(0x666666, 0.9)
                            );
                            cap.position.set(px, colH + 0.75, -60 + k * 28);
                            addProp(cap);
                        }
                    }
                });
                // Waterfall on one side
                const waterfall = new THREE.Mesh(
                    new THREE.PlaneGeometry(8, 30),
                    mat(0x3498db, 0.3, 0, 0x3498db, 0.5)
                );
                waterfall.position.set(-wallDist.x - 5, 15, 0);
                waterfall.rotation.y = Math.PI / 2;
                addProp(waterfall);
                // Jungle wall (dense foliage backdrop)
                [1, -1].forEach(s => {
                    const wall = new THREE.Mesh(
                        new THREE.BoxGeometry(260, 40, 6),
                        mat(0x1a3a10, 1.0)
                    );
                    wall.position.set(0, 20, s * wallDist.z);
                    addProp(wall);
                });

            } else if (idx === 11) {
                // MUSHROOM FOREST: Giant glowing mushrooms at border + bioluminescent ground
                // Bioluminescent ground patches on skirt
                for (let k = 0; k < 16; k++) {
                    const glow = new THREE.Mesh(
                        new THREE.CircleGeometry(6 + k%4*3, 12),
                        mat(k%3===0?0x88ffaa:k%3===1?0x44ffcc:0xaaff44, 0.7, 0, k%3===0?0x44ff88:k%3===1?0x00ffaa:0x88ff00, 0.8)
                    );
                    glow.rotation.x = -Math.PI / 2;
                    glow.position.set(
                        -110 + (k%8)*32, 0.05,
                        (k<8?1:-1) * (wallDist.z + 8)
                    );
                    addProp(glow);
                }
                // Giant border mushrooms
                const mushroomColors = [0xff4444, 0x4488ff, 0x9966ff, 0xff8844];
                for (let k = 0; k < 14; k++) {
                    const mush = new THREE.Group();
                    const c = mushroomColors[k % mushroomColors.length];
                    const stemH = 15 + k%4*8;
                    const capR  = 8 + k%3*4;
                    const stem = new THREE.Mesh(
                        new THREE.CylinderGeometry(1.5, 2.5, stemH, 10),
                        mat(0xf5f5dc, 0.8)
                    );
                    stem.position.y = stemH / 2;
                    const cap = new THREE.Mesh(
                        new THREE.SphereGeometry(capR, 12, 8, 0, Math.PI*2, 0, Math.PI*0.55),
                        mat(c, 0.6, 0, c, 0.5)
                    );
                    cap.position.y = stemH + capR * 0.3;
                    // Spots
                    for (let s = 0; s < 5; s++) {
                        const spot = new THREE.Mesh(
                            new THREE.CircleGeometry(0.8, 8),
                            mat(0xffffff, 0.3)
                        );
                        const sa = (s/5)*Math.PI*2;
                        spot.position.set(
                            Math.cos(sa)*capR*0.5, stemH+capR*0.5, Math.sin(sa)*capR*0.5
                        );
                        mush.add(spot);
                    }
                    mush.add(stem, cap);
                    // Place around perimeter, alternating N/S and corners
                    const side = k % 2;
                    mush.position.set(
                        -120 + k * 18,
                        0,
                        (side === 0 ? 1 : -1) * wallDist.z
                    );
                    addProp(mush);
                }
                // Forest canopy — dark overhead plane with glow
                const canopy = new THREE.Mesh(
                    new THREE.PlaneGeometry(400, 300),
                    mat(0x1a0f08, 1.0, 0, 0x2a1020, 0.1)
                );
                canopy.rotation.x = Math.PI / 2;
                canopy.position.y = 45;
                addProp(canopy);
            }

            // ── 4. PER-MAP GROUND TEXTURE LAYER ─────────────────────────────────────
            // Scattered flat boxes at y≈0.02 to break up the monotone floor.
            // Uses mapSeed so it's deterministic per map.
            const savedSeed = mapSeed;
            mapSeed = idx * 99991 + 7;
            const patchMat = mat(b.groundLayer, 1.0);
            for (let k = 0; k < 40; k++) {
                const px = (seededRandom() - 0.5) * 200;
                const pz = (seededRandom() - 0.5) * 140;
                // Only place patches away from road
                let nearRoad = false;
                for (let j = 0; j < currentWaypoints.length - 1; j++) {
                    const a = currentWaypoints[j], bp2 = currentWaypoints[j+1];
                    const ll = a.distanceToSquared(bp2);
                    if (ll === 0) continue;
                    const tt = Math.max(0, Math.min(1, ((px-a.x)*(bp2.x-a.x)+(pz-a.z)*(bp2.z-a.z))/ll));
                    const proj = new THREE.Vector3(
                        a.x + (bp2.x-a.x)*tt, 0, a.z + (bp2.z-a.z)*tt
                    );
                    if (Math.abs(px-proj.x)<8 && Math.abs(pz-proj.z)<8) { nearRoad=true; break; }
                }
                if (nearRoad) continue;
                const pw = 4 + seededRandom() * 12;
                const pd = 4 + seededRandom() * 12;
                const patch = new THREE.Mesh(
                    new THREE.PlaneGeometry(pw, pd),
                    patchMat
                );
                patch.rotation.x = -Math.PI / 2;
                patch.rotation.z = seededRandom() * Math.PI;
                patch.position.set(px, 0.02, pz);
                addProp(patch);
            }
            mapSeed = savedSeed;
        }

        function createEnvironmentProps(startPos, endPos, startDir, endDir) {
            const matDark = new THREE.MeshStandardMaterial({color:0x2c3e50, roughness: 0.8});
            const matMetal = new THREE.MeshStandardMaterial({color:0x95a5a6, metalness:0.9, roughness:0.2});
            const matGlow = new THREE.MeshBasicMaterial({color:0x00ff00}); // Portal Glow
            const matBaseColor = new THREE.MeshStandardMaterial({color:0xe74c3c, roughness:0.6}); // Enemy Base Red
            const matGold = new THREE.MeshStandardMaterial({color:0xffd700, metalness:1.0, roughness:0.1});
            const matBlack = new THREE.MeshStandardMaterial({color:0x0a0a0a, roughness:0.9});

            // --- 1. SPAWN PORTAL (Advanced Stargate) ---
            const spawnGate = new THREE.Group();
            
            // Outer Ring (Thick)
            const outerRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.6, 20, 32), matDark);
            outerRing.position.y = 3.5;
            spawnGate.add(outerRing);
            
            // Inner Ring (Glowing)
            const innerRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.3, 16, 32), matGold);
            innerRing.position.y = 3.5;
            spawnGate.add(innerRing);
            
            // Chevrons (9 symbols around the ring)
            for(let i = 0; i < 9; i++) {
                const angle = (i / 9) * Math.PI * 2;
                const chevron = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6, 0.8, 0.4),
                    matMetal
                );
                chevron.position.set(
                    Math.cos(angle) * 3.5,
                    3.5 + Math.sin(angle) * 3.5,
                    0.5
                );
                chevron.rotation.z = angle;
                spawnGate.add(chevron);
            }

            // Event Horizon (Swirling portal)
            const portalMesh = new THREE.Mesh(
                new THREE.CircleGeometry(2.9, 32),
                new THREE.MeshBasicMaterial({
                    color:0x00ff00,
                    transparent:true,
                    opacity:0.6,
                    side:THREE.DoubleSide
                })
            );
            portalMesh.position.y = 3.5;
            spawnGate.add(portalMesh);
            
            // Inner vortex layer
            const vortex = new THREE.Mesh(
                new THREE.CircleGeometry(2.3, 32),
                new THREE.MeshBasicMaterial({
                    color:0x00aa00,
                    transparent:true,
                    opacity:0.8,
                    side:THREE.DoubleSide
                })
            );
            vortex.position.y = 3.5;
            vortex.position.z = -0.1;
            spawnGate.add(vortex);

            // Base Platform (Hexagonal)
            const basePlat = new THREE.Mesh(
                new THREE.CylinderGeometry(5, 5.5, 0.8, 6),
                matMetal
            );
            basePlat.position.y = 0.4;
            spawnGate.add(basePlat);
            
            // Glowing energy lines on platform
            for(let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const line = new THREE.Mesh(
                    new THREE.BoxGeometry(4, 0.1, 0.2),
                    matGlow
                );
                line.position.set(
                    Math.cos(angle) * 2,
                    0.85,
                    Math.sin(angle) * 2
                );
                line.rotation.y = angle + Math.PI/2;
                spawnGate.add(line);
            }

            // Support Pylons (4 corners)
            for(let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + Math.PI/4;
                const pylon = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8, 6, 0.8),
                    matDark
                );
                pylon.position.set(
                    Math.cos(angle) * 4,
                    3,
                    Math.sin(angle) * 4
                );
                spawnGate.add(pylon);
                
                // Pylon caps (gold)
                const cap = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8),
                    matGold
                );
                cap.position.set(
                    Math.cos(angle) * 4,
                    6.2,
                    Math.sin(angle) * 4
                );
                spawnGate.add(cap);
            }

            // ALIGNMENT LOGIC:
            spawnGate.position.copy(startPos).sub(startDir.clone().multiplyScalar(2));
            spawnGate.lookAt(startPos.clone().add(startDir.clone().multiplyScalar(10)));
            
            // Mark as portal for collision detection
            spawnGate.userData.isPortal = true;
            
            scene.add(spawnGate); mapProps.push(spawnGate);


            // --- 2. PLAYER BASE (Fortified Command Center) ---
            const bunker = new THREE.Group();

            // Main Building (Wider, more detailed)
            const mainBuilding = new THREE.Mesh(
                new THREE.BoxGeometry(10, 6, 10),
                matDark
            );
            mainBuilding.position.y = 3;
            bunker.add(mainBuilding);
            
            // Reinforced corners
            for(let i = 0; i < 4; i++) {
                const x = (i % 2) ? 5 : -5;
                const z = (i < 2) ? 5 : -5;
                const pillar = new THREE.Mesh(
                    new THREE.BoxGeometry(1.2, 7, 1.2),
                    matMetal
                );
                pillar.position.set(x, 3.5, z);
                bunker.add(pillar);
            }

            // Roof Dome (Larger, more detailed)
            const domeLower = new THREE.Mesh(
                new THREE.CylinderGeometry(4.5, 5, 1.2, 12),
                matMetal
            );
            domeLower.position.y = 6.6;
            bunker.add(domeLower);
            
            const domeUpper = new THREE.Mesh(
                new THREE.SphereGeometry(3.5, 12, 8, 0, Math.PI*2, 0, Math.PI/2),
                matMetal
            );
            domeUpper.position.y = 7.3;
            bunker.add(domeUpper);

            // Multiple Antennas
            const antennaPositions = [[3, 9, -3], [-3, 9, -3], [0, 10, 0]];
            antennaPositions.forEach(pos => {
                const ant = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.08, pos[1] === 10 ? 2.5 : 2),
                    new THREE.MeshStandardMaterial({color:0xffffff, metalness:0.9})
                );
                ant.position.set(...pos);
                bunker.add(ant);
                
                // Antenna tip (red light)
                const tip = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15),
                    new THREE.MeshBasicMaterial({color:0xff0000})
                );
                tip.position.set(pos[0], pos[1] + 1, pos[2]);
                bunker.add(tip);
            });

            // Entrance Gate (Massive)
            const gateFrame = new THREE.Mesh(
                new THREE.BoxGeometry(5, 4.5, 1.5),
                matBaseColor
            );
            gateFrame.position.set(0, 2.25, 5.2);
            bunker.add(gateFrame);

            // Gate doorway (black)
            const doorway = new THREE.Mesh(
                new THREE.BoxGeometry(3.5, 3.5, 0.5),
                matBlack
            );
            doorway.position.set(0, 1.75, 5.5);
            bunker.add(doorway);
            
            // Warning stripes on gate
            for(let i = 0; i < 6; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6, 4.4, 1.52),
                    new THREE.MeshStandardMaterial({
                        color: i % 2 === 0 ? 0xffff00 : 0x000000
                    })
                );
                stripe.position.set(-2.5 + i * 1, 2.25, 5.2);
                bunker.add(stripe);
            }

            // Defensive turret platforms (2 on roof)
            for(let side = -1; side <= 1; side += 2) {
                const turretBase = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.8, 1, 0.5, 8),
                    matMetal
                );
                turretBase.position.set(side * 3.5, 7.3, 2);
                bunker.add(turretBase);
                
                const turretBarrel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8),
                    matDark
                );
                turretBarrel.rotation.x = Math.PI/2;
                turretBarrel.position.set(side * 3.5, 7.6, 1);
                bunker.add(turretBarrel);
            }

            // ALIGNMENT LOGIC:
            bunker.position.copy(endPos).add(endDir.clone().multiplyScalar(4));
            bunker.lookAt(endPos); 

            // Mark as base for collision detection
            bunker.userData.isPortal = true;

            scene.add(bunker); mapProps.push(bunker);
            
            // Labels
            createLabel("PORTAL", spawnGate.position.clone().add(new THREE.Vector3(0,8,0)), "#2ecc71");
            createLabel("BASE", bunker.position.clone().add(new THREE.Vector3(0,16,0)), "#e74c3c");
        }

        function createLabel(text, pos, col) {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            canvas.width=256; canvas.height=64; ctx.font="Bold 40px Arial"; ctx.fillStyle=col; ctx.textAlign="center"; ctx.strokeStyle="black"; ctx.lineWidth=4;
            ctx.strokeText(text,128,48); ctx.fillText(text,128,48);
            const s = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas), transparent:true}));
            s.position.copy(pos); s.scale.set(12,3,1); scene.add(s); mapProps.push(s);
        }

	function getMuzzlePosition(tower) {
            // How high up is the gun?
            let yOffset = 2.5; 
            // How far forward is the barrel tip?
            let forwardOffset = 2.0; 

            if(tower.type === 'sniper') { yOffset = 3.5; forwardOffset = 5.5; }
            else if(tower.type === 'minigun') { yOffset = 2.5; forwardOffset = 3.5; }
            else if(tower.type === 'gunner') { yOffset = 2.0; forwardOffset = 2.2; }
            else if(tower.type === 'cannon') { yOffset = 2.5; forwardOffset = 2.5; }
            else if(tower.type === 'flamethrower') { yOffset = 2.5; forwardOffset = 2.5; }
            else if(tower.type === 'laser') { yOffset = 2.0; forwardOffset = 1.8; }
            else if(tower.type === 'mortar') { yOffset = 3.5; forwardOffset = 0.5; } // Fires slightly up
            else if(tower.type === 'tesla') { yOffset = 5.0; forwardOffset = 0; }
            else if(tower.type === 'plasma') { yOffset = 4.0; forwardOffset = 0; }
            
            // Calculate the position based on rotation
            const rot = tower.mesh.children[1].rotation.y;
            const offset = new THREE.Vector3(0, 0, forwardOffset);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
            
            return tower.mesh.position.clone().add(new THREE.Vector3(0, yOffset, 0)).add(offset);
        }
	
	    function runEnemyAbilities(e, dt) {
            if(!e.abilityType) return;
            e.abilityCooldown -= dt;
            if(e.abilityCooldown > 0) return;

            // --- HEALER (Area Heal) ---
            if(e.abilityType === 'heal') {
                e.abilityCooldown = 2.0; 
                
                // 1. Find allies
                enemies.forEach(ally => {
                    if(ally !== e && ally.hp < ally.maxHp && ally.mesh.position.distanceToSquared(e.mesh.position) < 64) {
                        const healAmount = 20;
                        ally.hp = Math.min(ally.hp + healAmount, ally.maxHp);
                        
                        // 2. VISUAL: Green Popup "+20"
                        createFloatingText("+" + healAmount, ally.mesh.position.clone().add(new THREE.Vector3(0, 3, 0)), "#2ecc71");
                        
                        // 3. VISUAL: Sparkles
                        createParticles(ally.mesh.position, 3, 0x00ff00);

                        // --- FIX: Sync to Client ---
                        if(socket && myRoomId && myRole === 'host') {
                            socket.emit('gameAction', { 
                                type: 'visual_effect', 
                                effect: 'heal_area', 
                                roomId: myRoomId, 
                                x: ally.mesh.position.x, 
                                z: ally.mesh.position.z 
                            });
                        }
                    }
                });
            }

            // --- DISRUPTOR (Stun Towers) ---
            if(e.abilityType === 'stun') {
                e.abilityCooldown = 3.0; 
                towers.forEach(t => {
                    if(t.mesh.position.distanceToSquared(e.mesh.position) < 36) {
                        t.stunned = 3.0; 
                        createFloatingText("ZAP!", t.mesh.position.clone().add(new THREE.Vector3(0,4,0)), "#3498db");
                        createParticles(t.mesh.position.clone().add(new THREE.Vector3(0,2,0)), 10, 0x00ffff);
                        if(socket && myRoomId && myRole === 'host') {
                            socket.emit('gameAction', { type: 'tower_stun', roomId: myRoomId, tx: t.mesh.position.x, tz: t.mesh.position.z });
                        }
                    }
                });
            }

            // --- SUMMONER (Spawn Minions) ---
            if(e.abilityType === 'summon') {
                e.abilityCooldown = 4.0;
                spawnMinion(e.pathIdx, e.mesh.position);
            }
        }


// --- spawnMinion ---
function spawnMinion(pathIdx, pos) {
    // Local Spawn
    const id = Date.now() + Math.random();
    spawnEnemy('red', id); 
    // Hack: Move the just-spawned enemy to the Summoner's location
    const minion = enemies[enemies.length-1];
    minion.pathIdx = pathIdx;
    minion.mesh.position.copy(pos);

    // Network Spawn
    if(socket && myRoomId && myRole === 'host') {
        socket.emit('gameAction', { 
            type: 'spawn_minion', 
            roomId: myRoomId, 
            key: 'red', 
            id: id, 
            idx: pathIdx, 
            x: pos.x, z: pos.z 
        });
    }
}
	
        // --- GAME LOOP ---
        // =====================================================
        // PERFORMANCE MONITORING FUNCTIONS
        // =====================================================


// --- Performance monitoring + main animate() loop ---
        function updateFPS() {
            fpsCounter.frames++;
            const currentTime = performance.now();
            const delta = currentTime - fpsCounter.lastTime;
            
            if (delta >= 1000) {
                fpsCounter.fps = Math.round((fpsCounter.frames * 1000) / delta);
                fpsCounter.frames = 0;
                fpsCounter.lastTime = currentTime;
                
                const fpsEl = document.getElementById('fps-counter');
                if (fpsEl) {
                    // Respect user's FPS counter setting
                    if (showFPSCounter) {
                        fpsEl.style.display = 'block';
                        fpsEl.textContent = `FPS: ${fpsCounter.fps}`;
                        
                        // Color code based on performance
                        if (fpsCounter.fps < 30) {
                            fpsEl.className = 'perf-stat critical';
                        } else if (fpsCounter.fps < 50) {
                            fpsEl.className = 'perf-stat warning';
                        } else {
                            fpsEl.className = 'perf-stat';
                        }
                    } else {
                        fpsEl.style.display = 'none';
                    }
                }
            }
        }

        function updatePing(latency) {
            pingMonitor.samples.push(latency);
            if (pingMonitor.samples.length > 10) pingMonitor.samples.shift();
            
            const avgPing = Math.round(pingMonitor.samples.reduce((a, b) => a + b, 0) / pingMonitor.samples.length);
            pingMonitor.lastPing = avgPing;
            
            const pingEl = document.getElementById('ping-counter');
            if (pingEl) {
                pingEl.textContent = `PING: ${avgPing}ms`;
                pingEl.style.display = 'inline-block';
                
                if (avgPing > 200) {
                    pingEl.className = 'perf-stat critical';
                } else if (avgPing > 100) {
                    pingEl.className = 'perf-stat warning';
                } else {
                    pingEl.className = 'perf-stat';
                }
            }
        }

        function updateHostPing(latency) {
            hostPing = latency;
            const hostPingEl = document.getElementById('host-ping-counter');
            if (hostPingEl) {
                hostPingEl.textContent = `HOST: ${latency}ms`;
                hostPingEl.style.display = 'inline-block';
                
                const lagWarning = document.getElementById('lag-warning');
                if (latency > 200) {
                    hostPingEl.className = 'perf-stat critical';
                    if (lagWarning) lagWarning.style.display = 'block';
                } else if (latency > 100) {
                    hostPingEl.className = 'perf-stat warning';
                    if (lagWarning) lagWarning.style.display = 'none';
                } else {
                    hostPingEl.className = 'perf-stat';
                    if (lagWarning) lagWarning.style.display = 'none';
                }
            }
        }

        function setServerLocation(location) {
            serverLocation = location; // tracked but element removed from UI
        }

        function showPerformanceStats() {
            const statsDiv = document.getElementById('performance-stats');
            if (statsDiv) statsDiv.style.display = 'flex';
        }

        function hidePerformanceStats() {
            const statsDiv = document.getElementById('performance-stats');
            if (statsDiv) statsDiv.style.display = 'none';
        }

        function closeMpWarning() {
            const modal = document.getElementById('mp-warning-modal');
            if (modal) modal.style.display = 'none';
            mpWarningShown = true;
            enterMpMenu();
        }

        function _handleGameOver() {
            isPaused = true; gameRunning = false;
            notifyGameplayStop();
            document.getElementById('final-wave-loss').innerText = wave;
            window.showScrapBreakdown(wave, currentDifficulty, false);
            document.getElementById('game-over-screen').style.display = 'flex';
            if (typeof GameAnalytics !== 'undefined') GameAnalytics.trackGameEnd(wave, currentDifficulty, false);
            if (socket && myRoomId) socket.emit('gameStateUpdate', { roomId: myRoomId, state: 'loss', finalWave: wave });
        }

                let _animLast = 0;
        function animate(now) {
            requestAnimationFrame(animate);
            const dt = Math.min(now ? (now - _animLast) / 1000 : 0.016, 0.05);
            _animLast = now || _animLast;
            
            // Update Performance Monitor (from Enhancements.js)
            if (typeof updatePerformanceMonitor === 'function') {
                updatePerformanceMonitor();
            }
            
            // Update FPS Counter
            updateFPS();
		
		// --- PREVIEW RENDER (Only when almanac is open) ---
		if(isPreviewing && previewModel && document.getElementById('almanac-menu').style.display !== 'none') {
                previewModel.rotation.y += 0.01;
                previewRenderer.render(previewScene, previewCam);
            	}
		
    		// 1. MENU MODE: If game isn't running, just spin the camera and render
    		if (!gameRunning) {
                const time = Date.now() * 0.0002;
                camera.position.x = Math.cos(time) * 100;
                camera.position.z = Math.sin(time) * 100;
                camera.position.y = 80;
                camera.lookAt(0, 0, 0);

                // Render and exit (don't run game logic)
                if(composer) composer.render();
                else renderer.render(scene, camera);
                return;
            	}

    		if (isPaused) {
                // OPTIMIZATION: Still render the scene when paused, but skip all game logic
                if(graphicsMode === 2 && composer) composer.render();
                else renderer.render(scene, camera);
                return;
            }

            // --- CAMERA SHAKE (only when active) ---
            let shakeOffset = new THREE.Vector3();
            if(shakeEnabled && shakeIntensity > 0) {
                const power = shakeIntensity * 10;
                shakeOffset.set(
                    (Math.random() - 0.5) * power,
                    (Math.random() - 0.5) * power * 0.5,
                    (Math.random() - 0.5) * power
                );
                camera.position.add(shakeOffset);
                shakeIntensity -= dt * shakeDecay;
                if(shakeIntensity < 0) shakeIntensity = 0;
            }

            // --- MASTER LOGIC (Runs for Single Player OR Host) ---
            if (!socket || myRole === 'host') {
                
                // OPTIMIZATION: Track if UI needs updating (instead of calling every frame)
                let needsUIUpdate = false;
                
                // 1. Enemies Movement & Lives
                for(let i=enemies.length-1; i>=0; i--) {
                    const e = enemies[i];

		    if (!socket || myRole === 'host') {
                        runEnemyAbilities(e, dt);
                    }

                    if(e.stunned > 0) {
                        e.stunned -= dt;
                        
                        // Simple ice effect when stunned
                        if(!e.iceEffect && e.mesh.material) {
                            e.originalColor = e.mesh.material.color.getHex();
                            e.mesh.material.color.setHex(0x88ddff); // Light blue tint
                            e.iceEffect = true;
                        }
                    } else {
                        // Remove ice tint when not stunned
                        if(e.iceEffect && e.mesh.material && e.originalColor) {
                            e.mesh.material.color.setHex(e.originalColor);
                            e.iceEffect = false;
                        }
                        
                        // SAFETY CHECK: Ensure pathIdx is valid
                        if(e.pathIdx >= currentWaypoints.length) {
                            // Enemy reached end, remove it
                            lives--;
                            addTrauma(0.5);
                            AudioSys.lifeLoss();
                            scene.remove(e.mesh); 
                            if(e.hpGroup) scene.remove(e.hpGroup);
                            enemies.splice(i,1);
                            needsUIUpdate = true;
                            if (lives <= 0) _handleGameOver();
                            continue;
                        }
                        
                        const target = currentWaypoints[e.pathIdx];
                        // OPTIMIZATION: Cache position and calculate distance squared (faster)
                        const dx = target.x - e.mesh.position.x;
                        const dz = target.z - e.mesh.position.z;
                        const distSq = dx * dx + dz * dz;
                        const dist = Math.sqrt(distSq);
                        let s = e.speed;
                        if(e.slowTime > 0) { s *= 0.5; e.slowTime -= dt; }
                        // OPTIMIZATION: Reuse dx/dz for direction calculation
                        const invDist = dist > 0 ? 1 / dist : 0;
                        e.mesh.position.x += dx * invDist * s;
                        e.mesh.position.z += dz * invDist * s;
                        if (distSq > 0.01) {
                            _tmpV3a.copy(target); _tmpV3a.y = e.mesh.position.y;
                            e.mesh.lookAt(_tmpV3a);
                        }
                        
                        if(distSq < 1) { // Use squared distance for comparison (faster)
                            e.pathIdx++;
                            if(e.pathIdx >= currentWaypoints.length) {
                                lives--;
				addTrauma(0.5);
                                AudioSys.lifeLoss(); // Life loss alarm sound
                                scene.remove(e.mesh); scene.remove(e.hpGroup);
                                enemies.splice(i,1);
                                needsUIUpdate = true; // OPTIMIZATION: Mark UI for update
                                if (lives <= 0) _handleGameOver();
                                continue;
                            }
                        }
                    }
                    
                    // BURNING EFFECT (DoT from flamethrower)
                    if(e.burning) {
                        e.burning.duration -= dt;
                        e.burning.nextTick -= dt;
                        
                        if(e.burning.nextTick <= 0) {
                            // Apply burn damage
                            e.hp -= e.burning.damage;
                            e.burning.nextTick = e.burning.tickRate;
                            
                            // Spawn fire particle (throttled + shared geo/mat)
                            if (Math.random() < 0.25) {
                                const fireParticle = new THREE.Mesh(_GEO.fire, _MAT.fire);
                                fireParticle.position.set(
                                    e.mesh.position.x + (Math.random()-0.5)*0.5,
                                    e.mesh.position.y + 1,
                                    e.mesh.position.z + (Math.random()-0.5)*0.5
                                );
                                scene.add(fireParticle);
                                particles.push({
                                    mesh: fireParticle,
                                    vel: new THREE.Vector3((Math.random()-0.5), 3, (Math.random()-0.5)),
                                    life: 0.4,
                                    maxLife: 0.4,
                                    _shared: true  // flag: don't dispose geometry/material
                                });
                            }
                            
                            // Update HP bar
                            if(e.fg) {
                                const hpRatio = Math.max(0, e.hp / e.maxHp);
                                e.fg.scale.x = hpRatio;
                                if(hpRatio > 0.5) e.fg.material.color.setHex(0x00ff00);
                                else if(hpRatio > 0.2) e.fg.material.color.setHex(0xffaa00);
                                else e.fg.material.color.setHex(0xff0000);
                            }
                            
                            // Check if enemy died from burn
                            if(e.hp <= 0) {

				if(e.burning && e.burning.source) {
        			    e.burning.source.destroys++;
    				}

                                gold += e.score;
                                needsUIUpdate = true;
                                scene.remove(e.mesh);
                                scene.remove(e.hpGroup);
                                
                                // Achievement & XP tracking (single call — duplicate was removed)
                                trackKill();
                                trackGoldEarned(e.score);
                                if (typeof window.addXP === 'function') window.addXP(5);
                                if (typeof window.trackEnemyDestroyed === 'function') window.trackEnemyDestroyed(e.score);
                                
                                // Explosion
                                createExplosion(e.mesh.position, e.mesh.userData.mainColor || 0xff6600, 3);
                                AudioSys.explosion();
                                
                                enemies.splice(i, 1);
                                continue;
                            }
                        }
                        
                        // Remove burn when duration expires
                        if(e.burning.duration <= 0) {
                            delete e.burning;
                            // Remove fire glow
                            if(e.mesh) {
                                e.mesh.traverse(child => {
                                    if(child.isMesh && child.material && child.material.emissive) {
                                        child.material.emissive.setHex(0x000000);
                                        child.material.emissiveIntensity = 0;
                                    }
                                });
                            }
                        }
                    }
                    
                    // OPTIMIZATION: Only update HP bar if health bars are enabled
                    if(healthBarsEnabled && e.hpGroup) { 
                        e.hpGroup.position.copy(e.mesh.position); 
                        e.hpGroup.position.y += e.hpHeight; 
                        e.hpGroup.quaternion.copy(camera.quaternion); 
                    } else if(e.hpGroup) {
                        e.hpGroup.visible = false;
                    }
                }

                // 2. Wave Sync & Auto Start
                if(enemies.length === 0 && spawningFinished && activeWave) {
                    activeWave = false;
                    
                    // Achievement tracking
                    trackWaveComplete();
                    if (typeof window.trackWaveCompleted === 'function') {
                        window.trackWaveCompleted(wave);
                    }
                    if(socket && myRoomId) socket.emit('gameAction', { type: 'wave_finished', roomId: myRoomId, wave: wave });
                    
                    // HAPPY TIME: Trigger on boss waves (every 10 waves)
                    if (wave % 10 === 0) {
                        triggerHappyTime();
                    }
                    
                    if(wave >= GAME_CONFIG.maxWaves) { 
                        isPaused = true;
                        gameRunning = false;
                        
                        // Notify CrazyGames that gameplay stopped
                        notifyGameplayStop();
                        
                        // HAPPY TIME: Victory!
                        triggerHappyTime();
                        
                        // Track victory in lifetime stats
                        if(typeof lifetimeStats !== 'undefined') {
                            lifetimeStats.gamesWon++;
                            if(typeof saveProgression === 'function') saveProgression();
                            if(typeof checkAchievements === 'function') checkAchievements();
                        }
                        
                        // ✅ CRITICAL: Track game won for special achievements
                        if (typeof window.trackGameWon === 'function') {
                            const finalLives = lives;
                            const totalTowers = towers.length;
                            window.trackGameWon(finalLives, totalTowers);
                        }
                        
                        window.showScrapBreakdown(wave, currentDifficulty, true);
                        document.getElementById('victory-screen').style.display='flex';
                        if (typeof _clearRoomState === 'function') _clearRoomState();
                        
                        if(socket && myRoomId) {
                            socket.emit('gameStateUpdate', { roomId: myRoomId, state: 'win' });
                        }
                    } else {
                        const btn = document.getElementById('btn-start-wave');
                        btn.disabled = false;
                        if (autoWave && !isPaused && gameRunning && wave > 0) {
                            btn.innerText = "AUTO STARTING...";
                            btn.style.backgroundColor = "#555";
                            setTimeout(() => { if(!activeWave && gameRunning && !isPaused) startWave(); }, 1500);
                        } else {
                            btn.innerText = "START WAVE";
                            btn.style.backgroundColor = ""; 
                        }
                    }
                }

                // 3. Towers Combat
                for (let _ti = 0; _ti < towers.length; _ti++) { const t = towers[_ti];
                    // --- STUNNED LOGIC ---
                    if(t.stunned > 0) {
                        t.stunned -= dt;
                        
                        // OPTIMIZATION: Reduced spark frequency
                        if(Math.random() < 0.08) {
                            _tmpV3a.set(
                                t.mesh.position.x + (Math.random()-0.5)*2,
                                t.mesh.position.y + Math.random()*3,
                                t.mesh.position.z + (Math.random()-0.5)*2
                            );
                            createParticles(_tmpV3a, 1, 0x00ffff);
                        }
                        return;
                    }
                    
                    // OPTIMIZATION: Cache tower position (it never changes!)
                    const tPos = t.mesh.position;
                    
                    // Tower tracking (only for towers that need it)
                    if(t.type !== 'farm' && ['gunner','sniper','minigun','cannon','mortar','laser','flamethrower'].includes(t.type)) {
                        const _rangeSq = t.range * t.range;
                        const target = enemies.find(e => e.mesh.position.distanceToSquared(tPos) <= _rangeSq);
                        if(target) {
                            const dx = target.mesh.position.x - tPos.x;
                            const dz = target.mesh.position.z - tPos.z;
                            const angle = Math.atan2(dx, dz);
                            t.mesh.children[1].rotation.y = angle;
                            t.currentRotY = angle; 
                        }
                    }

		    if(t.type === 'plasma' || t.type === 'ice') {
                        if(t.mesh.children[1]) {
                             t.mesh.children[1].rotation.y += dt;
                             t.currentRotY = t.mesh.children[1].rotation.y; // <--- ADD THIS (Saves spin for Sync)
                        }
                    }
                    // 2. Tracking Animations (Client Side Smoothing)
                    if(myRole !== 'host' && t.currentRotY !== undefined && t.mesh.children[1]) {
                    // Smoothly lerp to the rotation sent by server
                    t.mesh.children[1].rotation.y += (t.currentRotY - t.mesh.children[1].rotation.y) * 0.1;
                    }

                    if(t.type === 'farm') {
                         if(activeWave) {
                             t.cooldown -= dt;
                             if(t.cooldown <= 0) {
                                 t.cooldown = t.rate;
                                 
                                 // Apply Farm Efficiency skill multiplier (singleplayer only)
                                 const farmMult = (typeof window.getSkillMultipliers === 'function') ? window.getSkillMultipliers().farmIncome : 1.0;
                                 const actualIncome = Math.floor(t.income * farmMult);
                                 
                                 // --- FIX: USE NEW WALLET SYSTEM ---
                                 if(currentGamemode === 'shared') {
                                     gold += actualIncome; trackGoldEarned(actualIncome);;
                                 } else {
                                     const ownerIdx = (typeof t.ownerIndex === 'number') ? t.ownerIndex : 0;
                                     playerWallets[ownerIdx] += actualIncome;
                                     if(ownerIdx === myPlayerIndex) gold = playerWallets[myPlayerIndex];
                                 }
                                 
                                 t.totalGenerated = (t.totalGenerated || 0) + actualIncome;

                                 needsUIUpdate = true; // OPTIMIZATION: Mark UI for update
                                 AudioSys.shoot('farm');
                                 createFloatingText("+$"+actualIncome, t.mesh.position.clone().add(new THREE.Vector3(0, 6, 0)), "#2ecc71");

                                 if(socket && myRole === 'host') {
                                     socket.emit('gameAction', { 
                                         type: 'visual_effect', effect: 'farm_text', roomId: myRoomId, 
                                         x: t.mesh.position.x, z: t.mesh.position.z, value: t.income 
                                     });
                                     
                                     // FIX: Sync wallet update in separate mode
                                     if(currentGamemode === 'separate') {
                                         socket.emit('gameAction', { 
                                             type: 'wallet_update', 
                                             roomId: myRoomId, 
                                             wallets: playerWallets,
                                             gold: gold,
                                             mode: currentGamemode
                                         });
                                     }
                                 }
                             }
                         }
                         return;
                    }

                    t.cooldown -= dt;
                    if(t.cooldown <= 0) {
                        // OPTIMIZATION: Tower position is cached in tPos above
                        // MORTAR FIX: Find target OUTSIDE minimum range
                        let target;
                        if(t.type === 'mortar' && t.minRange) {
                            const _minRSq = t.minRange * t.minRange;
                            const _maxRSq = t.range * t.range;
                            target = enemies.find(e => {
                                const dsq = e.mesh.position.distanceToSquared(tPos);
                                return dsq >= _minRSq && dsq <= _maxRSq;
                            });
                        } else {
                            const _tRangeSq = t.range * t.range;
                            target = enemies.find(e => e.mesh.position.distanceToSquared(tPos) <= _tRangeSq);
                        }
                        
                        if(target) {
                            t.cooldown = t.rate;
                            
			    // --- SPECIAL ABILITIES ---
                            if (t.special === 'multi_target') {
                                // LASER SPLITTER: Find 2 other enemies
                                let extras = 0;
                                enemies.forEach(e2 => {
                                    if(extras < 2 && e2 !== target && e2.mesh.position.distanceTo(t.mesh.position) <= t.range) {
                                        // Draw extra beam
                                        const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([muzzlePos, e2.mesh.position]), new THREE.LineBasicMaterial({color: t.color}));
                                        scene.add(beam); setTimeout(()=>scene.remove(beam), 50);
                                        damageEnemy(e2, t.dmg, 0, 0);
                                        extras++;
                                    }
                                });
                            }
                            
                            if (t.special === 'black_hole') {
                                // PLASMA BLACK HOLE: Suck enemies in? Or just massive slow
                                damageEnemy(target, t.dmg, t.splash, 0.9); // 90% Slow!
                            }

                            if (t.special === 'stun_boss') {
                                // SNIPER CRIPPLE: Stun bosses specifically
                                if(target.maxHp > 2000) { // Rough check for boss
                                    target.stunned = 0.5; // Mini-stun
                                }
                            }

                            // 1. Get Exact Barrel Tip Position
                            const muzzlePos = getMuzzlePosition(t);

                            // --- HITSCAN WEAPONS ---
                            if(t.type === 'tesla') {
                                createMuzzleFlash(muzzlePos, 0x5dade2);
                                AudioSys.shoot('tesla'); // Fixed sound name
                                
                                let chainTargets = [target]; let curr = target;
                                // Calculate full chain
                                for(let k=0; k < t.chain - 1; k++) {
                                    let next = null; let minDist = t.jump || 6;
                                    enemies.forEach(e => {
                                        if(!chainTargets.includes(e)) {
                                            const d = e.mesh.position.distanceTo(curr.mesh.position);
                                            if(d < minDist) { minDist = d; next = e; }
                                        }
                                    });
                                    if(next) { chainTargets.push(next); curr = next; } else { break; }
                                }

                                // Draw & Damage
                                let prevPos = muzzlePos; 
                                const syncPoints = [ {x: muzzlePos.x, y: muzzlePos.y, z: muzzlePos.z} ]; // Store points for MP

                                chainTargets.forEach(e => {
                                    damageEnemy(e, t.dmg, 0, 0, 0, t);
                                    createImpact(e.mesh.position, 0x5dade2, 3);
                                    
                                    // Visuals
                                    const bolt = new THREE.Line(
                                        new THREE.BufferGeometry().setFromPoints([prevPos, e.mesh.position]),
                                        _MAT.tesla
                                    );
                                    scene.add(bolt); setTimeout(() => scene.remove(bolt), 80);
                                    
                                    prevPos = e.mesh.position;
                                    syncPoints.push({ x: e.mesh.position.x, y: e.mesh.position.y, z: e.mesh.position.z });
                                });

                                // --- FIX: Send Full Chain to Client ---
                                if(socket && myRole === 'host') {
                                    socket.emit('gameAction', { 
                                        type: 'visual_effect', 
                                        effect: 'tesla_chain', 
                                        roomId: myRoomId, 
                                        points: syncPoints 
                                    });
                                }
                            }
                            else if(t.type==='laser') {
                                createMuzzleFlash(muzzlePos, 0xe74c3c);
                                AudioSys.shoot('laser');
                                const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([muzzlePos, target.mesh.position]), _MAT.beam);
                                scene.add(line); setTimeout(()=>scene.remove(line), 50);
                                damageEnemy(target, t.dmg, 0, 0, 0, t);
                                createImpact(target.mesh.position, 0xe74c3c, 2);
                            }
                            else if (t.type==='ice') {
                                 AudioSys.shoot('ice');
                                 // VISUAL FIX: Specific Frost Ring so you see it working
                                 const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, t.range, 32), new THREE.MeshBasicMaterial({color:0xaaddff, transparent:true, opacity:0.5, side:THREE.DoubleSide}));
                                 ring.rotation.x = -Math.PI/2; ring.position.copy(t.mesh.position).add(new THREE.Vector3(0,0.5,0));
                                 scene.add(ring);
                                 particles.push({ mesh:ring, life:0.3, type:'expand_fade' });

                                 enemies.forEach(e => {
                                     if(e.mesh.position.distanceTo(t.mesh.position) <= t.range) {
                                         damageEnemy(e, t.dmg, 0, t.slow, Math.random() < t.stunChance ? t.stunDur : 0, t);
                                     }
                                 });
                            } 
                            // --- PROJECTILES (Balls) ---
                            else {
                AudioSys.shoot(t.type);
                createMuzzleFlash(muzzlePos, t.color);
                
                let pMesh;
                let isArc = false;
                let velocity = null;
                let gravity = 0;

                if(t.type === 'mortar') {
                    // 1. VISUALS: Big Shell
                    const shellGroup = new THREE.Group();
                    const body = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8),
                        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7 })
                    );
                    body.rotation.x = Math.PI / 2;
                    const tip = new THREE.Mesh(
                        new THREE.ConeGeometry(0.25, 0.4, 8),
                        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8 })
                    );
                    tip.rotation.x = Math.PI / 2;
                    tip.position.z = 0.8;
                    shellGroup.add(body, tip);
                    pMesh = shellGroup;
                    pMesh.scale.set(1.5, 1.5, 1.5);
                    
                    // 2. ARC-BASED MOVEMENT
                    // No prediction needed - projectile tracks enemy during flight!
                    scene.add(pMesh);
                    pMesh.position.copy(muzzlePos);
                    
                    projectiles.push({
                        mesh: pMesh,
                        target: target, // Projectile will track this target's position every frame
                        dmg: t.dmg,
                        splash: t.splash || 0,
                        slow: t.slow || 0,
                        type: 'mortar',
                        start: muzzlePos.clone(),
                        // No targetPos needed - tracks enemy's current position every frame!
                        progress: 0,
                        speed: 0.015, // Slow floaty mortar
                        arcHeight: 18, // High arc
                        source: t
                    });
                    
                    return; // Skip normal projectile creation (forEach uses return, not continue)

                } else if(t.type === 'cannon') {
                    // CANNON: Normal straight projectile with splash damage (no arc)
                    
                    // 1. VISUALS: Iron Ball
                    pMesh = new THREE.Mesh(
                        _GEO.plasma_ball,
                        new THREE.MeshStandardMaterial({ color: 0x2c2c2c, metalness: 0.9 })
                    );
                    
                    // 2. STANDARD PROJECTILE (Not arc-based, shoots straight like other towers)
                    scene.add(pMesh);
                    pMesh.position.copy(muzzlePos);
                    
                    projectiles.push({
                        mesh: pMesh,
                        target: target,
                        dmg: t.dmg, // FIX: Use t.dmg instead of t.damage
                        splash: t.splash || 0, // Has splash damage
                        slow: t.slow || 0,
                        type: 'cannon', // Still labeled as cannon for explosion visuals
                        source: t
                    });
                    
                    return; // Skip the else block projectile creation
                }
                                else if(t.type === 'flamethrower') {
                                    // FLAMETHROWER: Continuous fire stream (no projectile, instant hit with DoT)
                                    
                                    
                                    // Fire particles along stream
                                    for(let i = 0; i < 25; i++) { 
        // Randomize position slightly around the path for a "spray" effect
        const randomOffset = Math.random(); 
        const particlePos = new THREE.Vector3().lerpVectors(muzzlePos, target.mesh.position, randomOffset);
        
        // Add spread to the spray
        particlePos.x += (Math.random() - 0.5) * 1.5;
        particlePos.z += (Math.random() - 0.5) * 1.5;
        particlePos.y += (Math.random() - 0.5) * 1.5;

        const fireParticle = new THREE.Mesh(
            _GEO.particle, // Shared geometry — no per-particle allocation
            getBulletMat(Math.random() > 0.5 ? 0xff4500 : 0xffaa00)
        );
        fireParticle.position.copy(particlePos);
        scene.add(fireParticle);

        // Particles float up and fade
        particles.push({ 
            mesh: fireParticle, 
            vel: new THREE.Vector3((Math.random()-0.5)*0.5, 0.5, (Math.random()-0.5)*0.5), 
            life: 0.3, 
            maxLife: 0.3 
        });
    }
                                    
                                    // Apply initial damage
                                    damageEnemy(target, t.dmg, 0, t.slow || 0, 0, t);
                                    
                                    // Apply BURNING effect (DoT)
                                    if(!target.burning) {
                                        target.burning = {
                                            damage: t.dot || 3,
                                            duration: t.dotDuration || 2.0,
                                            tickRate: 0.5,
                                            nextTick: 0.5,
					    source: t
                                        };
                                        
                                        // Visual: Set enemy on fire
                                        if(target.mesh) {
                                            target.mesh.traverse(child => {
                                                if(child.isMesh && child.material && child.material.emissive) {
                                                    child.material.emissive.setHex(0xff4500);
                                                    child.material.emissiveIntensity = 0.6;
                                                }
                                            });
                                        }
                                    } else {
                                        // Refresh burn duration
                                        target.burning.duration = Math.max(target.burning.duration, t.dotDuration || 2.0);
                                        target.burning.damage = Math.max(target.burning.damage, t.dot || 3);
                                    }
                                    
                                    AudioSys.shoot('flamethrower');
                                    
                                    // Flamethrower doesn't create projectiles - it's instant hit
                                    // Skip the projectile creation below by not setting pMesh
                                    pMesh = null;
                                }
                                else {
                                    // STANDARD BULLET — shared geo/mat, zero GC per shot
                                    const geo = t.type === 'sniper' ? _GEO.bullet_sm : _GEO.bullet_lg;
                                    pMesh = new THREE.Mesh(geo, getBulletMat(t.color));
                                }

                                // Only create projectile if pMesh was set (not flamethrower)
                                if(pMesh) {
                                    pMesh.position.copy(muzzlePos);
                                    scene.add(pMesh);
                                    
                                    projectiles.push({ 
                                        mesh: pMesh, 
                                        target: target, 
                                        dmg: t.dmg, 
                                        splash: t.splash, 
                                        slow: t.slow,
                                        stunChance: t.stunChance || 0,
                                        stunDur: t.stunDur || 0,
                                        color: t.color,
                                        type: t.type,
                                        isArc: isArc,
                                        velocity: velocity,
				        source: t // FIX: Changed from sourceTower to source for consistency
                                    });
                                }
                            }

                            // Multiplayer Sync
                            if(socket && myRole === 'host') {
                                socket.emit('gameAction', { 
                                    type: 'visual_effect', 
                                    effect: 'shoot', 
                                    roomId: myRoomId, 
                                    towerX: t.mesh.position.x, 
                                    towerZ: t.mesh.position.z, 
                                    targetId: target.id,
                                    towerType: t.type,
                                    rotY: t.currentRotY 
                                });
                            }
                        }
                    }
                }

                // 4. BROADCAST MASTER STATE (Original 60 Tick)
            if(socket && myRoomId && myRole === 'host') {
                
                const tSync = towers.map(t => ({
                    x: t.mesh.position.x,
                    z: t.mesh.position.z,
                    rotY: t.currentRotY || 0,
                    type: t.type,
                    level: t.level,
                    branch: t.branch,
                    owner: t.ownerRole,
                    destroys: t.destroys,
                    ownerIndex: t.ownerIndex,
                    skin: t.skin || 'default'
                }));
                
                const eSync = enemies.map(e => ({
                    id: e.id,
                    type: e.type,
                    x: e.mesh.position.x,
                    z: e.mesh.position.z,
                    hp: e.hp,
                    maxHp: e.maxHp,
		    rot: e.mesh.rotation.y,
                    freeze: e.freezeTimer > 0,
                    slow: e.slowTimer > 0
                }));

                socket.emit('gameAction', { 
                    type: 'master_sync', 
                    roomId: myRoomId, 
                    towers: tSync, 
                    enemies: eSync, 
                    lives: lives, 
                    wave: wave,
                    gold: gold,
                    wallets: playerWallets,
                    mode: currentGamemode,
                    hostFPS: fpsCounter.fps  // Include host FPS for performance monitoring
                });
            }
            
            // OPTIMIZATION: Only update UI when needed
            if(needsUIUpdate) updateUI();
	}
            // --- UNIVERSAL VISUALS (Runs on all clients) ---
            for(let i=projectiles.length-1; i>=0; i--) {
        const p = projectiles[i];
        
        // If target is dead/gone: non-mortar projectiles vanish; mortars continue arc to last known position
        if(!p.target || !p.target.mesh.parent) {
            if(p.type === 'mortar' && !p.freefall) {
                // Lock in the last known target position so the shell completes its arc normally
                p.freefall = true;
                // p.lockedTarget is set each frame below (see the lerp block) — use whatever was last stored
                // If for some reason it was never stored, fall back to current position
                if (!p.lockedTargetPos) {
                    p.lockedTargetPos = p.mesh.position.clone();
                    p.lockedTargetPos.y = 0;
                }
                p.target = null;
            } else if(p.type !== 'mortar') {
                scene.remove(p.mesh);
                projectiles.splice(i,1);
                continue;
            }
        }

        // MORTAR FREEFALL — continue arc to last known target position (enemy died mid-flight)
        if(p.type === 'mortar' && p.freefall) {
            // Use the locked target position to continue the arc normally
            const targetPos = p.lockedTargetPos;
            p.progress += p.speed;
            const t = Math.min(p.progress, 1.0);
            const invT = 1 - t;
            p.mesh.position.x = p.start.x * invT + targetPos.x * t;
            p.mesh.position.z = p.start.z * invT + targetPos.z * t;
            p.mesh.position.y = (p.start.y * invT + targetPos.y * t) + Math.sin(t * Math.PI) * p.arcHeight;
            // Shell orientation
            if (p.progress < 0.99) {
                const nextT = Math.min(p.progress + 0.01, 1);
                const nextInvT = 1 - nextT;
                const nextX = p.start.x * nextInvT + targetPos.x * nextT;
                const nextY = (p.start.y * nextInvT + targetPos.y * nextT) + Math.sin(nextT * Math.PI) * p.arcHeight;
                const nextZ = p.start.z * nextInvT + targetPos.z * nextT;
                p.mesh.lookAt(new THREE.Vector3(nextX, nextY, nextZ));
            }
            // Explode on landing
            if(p.progress >= 1.0) {
                if(p.splash > 0 && typeof enemies !== 'undefined') {
                    if(!socket || myRole === 'host') {
                        const ix = p.mesh.position.x, iz = p.mesh.position.z;
                        for(let ei = enemies.length-1; ei >= 0; ei--) {
                            const e = enemies[ei];
                            if(!e || !e.mesh) continue;
                            const dx2 = e.mesh.position.x - ix;
                            const dz2 = e.mesh.position.z - iz;
                            if(dx2*dx2 + dz2*dz2 <= p.splash * p.splash) {
                                damageEnemy(e, p.dmg, 0, p.slow || 0, 0, p.source);
                            }
                        }
                    }
                }
                if(p.splash > 0) {
                    createExplosion(p.mesh.position, 0xff5500, p.splash);
                    addTrauma(0.6);
                }
                scene.remove(p.mesh);
                projectiles.splice(i,1);
            }
            continue;
        }

        // LERP-BASED ARC MOVEMENT (Mortar ONLY - tracks enemy!)
        if(p.type === 'mortar') {
            // Track previous position for freefall velocity calculation
            p._prevX = p.mesh.position.x;
            p._prevZ = p.mesh.position.z;

            const targetPos = p.target.mesh.position;
            if (!p.lockedTargetPos) p.lockedTargetPos = new THREE.Vector3();
            p.lockedTargetPos.copy(targetPos);

            // Update progress
            p.progress += p.speed;
            const t = p.progress;
            const invT = 1 - t;
            
            // OPTIMIZATION: Direct calculation instead of Vector3.lerpVectors
            p.mesh.position.x = p.start.x * invT + targetPos.x * t;
            p.mesh.position.z = p.start.z * invT + targetPos.z * t;
            p.mesh.position.y = (p.start.y * invT + targetPos.y * t) + Math.sin(t * Math.PI) * p.arcHeight;
            
            if (p.progress < 0.99) {
                const _nt = Math.min(p.progress + 0.01, 1), _ni = 1 - _nt;
                _tmpV3a.set(
                    p.start.x * _ni + targetPos.x * _nt,
                    (p.start.y * _ni + targetPos.y * _nt) + Math.sin(_nt * Math.PI) * p.arcHeight,
                    p.start.z * _ni + targetPos.z * _nt
                );
                p.mesh.lookAt(_tmpV3a);
            }
            
            // Hit when progress reaches 1.0 (arrived at target)
            if(p.progress >= 1.0) {
                // Damage Logic
                if (!socket || myRole === 'host') {
                    const stunToApply = (p.stunChance && Math.random() < p.stunChance) ? p.stunDur : 0;
                    damageEnemy(p.target, p.dmg, p.splash, p.slow, stunToApply, p.source);
                }

                // Explosion visuals
                if(p.splash > 0) {
                    createExplosion(p.mesh.position, 0xff5500, p.splash);
                    addTrauma(0.8); // Mortar has big explosion
                }

                scene.remove(p.mesh);
                projectiles.splice(i,1);
            }
            continue;
        }

        // OLD ARC PHYSICS (Keep for compatibility, but won't be used by mortar/cannon anymore)
        if(p.isArc && p.velocity) {
            // 1. Apply Gravity (based on calculated gravity per second)
            // We divide by 60 assuming ~60FPS for simple physics step
            p.velocity.y -= p.gravity * dt; 
            
            // 2. SOFT HOMING (The Fix for Missing)
            // OPTIMIZATION: Calculate direction directly without creating new vectors
            const dx = p.target.mesh.position.x - p.mesh.position.x;
            const dz = p.target.mesh.position.z - p.mesh.position.z;
            const distH = Math.sqrt(dx * dx + dz * dz);
            
            // Calculate horizontal speed for rotation check
            const speedH = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
            
            if(distH > 0.01 && speedH > 0.01) {
                // Calculate ideal direction
                const idealX = dx / distH;
                const idealZ = dz / distH;
                
                // Current velocity direction
                const currentX = p.velocity.x / speedH;
                const currentZ = p.velocity.z / speedH;
                
                // Blend current direction with ideal direction (Steer Factor)
                const steer = p.type === 'mortar' ? 0.1 : 0.05;
                const newX = (currentX * (1 - steer) + idealX * steer);
                const newZ = (currentZ * (1 - steer) + idealZ * steer);
                const newLen = Math.sqrt(newX * newX + newZ * newZ);
                
                // Apply new horizontal velocity
                if(newLen > 0.01) {
                    p.velocity.x = (newX / newLen) * speedH;
                    p.velocity.z = (newZ / newLen) * speedH;
                }
            }

            // 3. Move Mesh - OPTIMIZATION: Direct calculation instead of clone
            const moveScale = dt * 60;
            p.mesh.position.x += p.velocity.x * moveScale;
            p.mesh.position.y += p.velocity.y * moveScale;
            p.mesh.position.z += p.velocity.z * moveScale;

            // 4. Rotation (Face flight direction) - OPTIMIZATION: Only if needed
            if(speedH > 0.01) {
                p.mesh.lookAt(new THREE.Vector3(
                    p.mesh.position.x + p.velocity.x,
                    p.mesh.position.y + p.velocity.y,
                    p.mesh.position.z + p.velocity.z
                ));
                if(p.type === 'cannon') p.mesh.rotateX(Math.PI / 2); // Fix cannonball rotation
            }

            // 5. Hit Detection - OPTIMIZATION: Use squared distance
            const targetPos = p.target.mesh.position;
            const hitDx = p.mesh.position.x - targetPos.x;
            const hitDy = p.mesh.position.y - targetPos.y;
            const hitDz = p.mesh.position.z - targetPos.z;
            const hitDistSq = hitDx * hitDx + hitDy * hitDy + hitDz * hitDz;
            // Using a larger hit radius (2.5) for arc weapons to ensure they land
            if(p.mesh.position.y <= targetPos.y + 0.5 || hitDistSq < 6.25) { // 2.5^2 = 6.25
                
                // Damage Logic
                if (!socket || myRole === 'host') {
                    const stunToApply = (p.stunChance && Math.random() < p.stunChance) ? p.stunDur : 0;
                    damageEnemy(p.target, p.dmg, p.splash, p.slow, stunToApply, p.source);
                }

                // Visuals
                if(p.splash > 0) {
                    createExplosion(p.mesh.position, 0xff5500, p.splash);
                    addTrauma(p.type === 'mortar' ? 0.8 : 0.5);
                }

                scene.remove(p.mesh);
                projectiles.splice(i,1);
            }
            continue;
        }

        // STANDARD BULLET MOVEMENT
        // OPTIMIZATION: Calculate direction and distance together
        const dx = p.target.mesh.position.x - p.mesh.position.x;
        const dy = p.target.mesh.position.y - p.mesh.position.y;
        const dz = p.target.mesh.position.z - p.mesh.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        const speed = (p.type === 'sniper') ? 80 : 60;
        const moveDist = speed * dt;
        
        // OPTIMIZATION: Only move if not already at target
        if(dist > 0.1) {
            const invDist = 1 / dist;
            p.mesh.position.x += dx * invDist * moveDist;
            p.mesh.position.y += dy * invDist * moveDist;
            p.mesh.position.z += dz * invDist * moveDist;
        }

        if(distSq < 2.25) { // 1.5^2 = 2.25 (use squared distance for comparison)
            // Hit Logic
            if (!socket || myRole === 'host') {
                const stunToApply = (p.stunChance && Math.random() < p.stunChance) ? p.stunDur : 0;
                damageEnemy(p.target, p.dmg, p.splash, p.slow, stunToApply, p.source);
            }
            if(p.splash > 0) createExplosion(p.mesh.position, 0xff5500, p.splash);
            
            scene.remove(p.mesh);
            projectiles.splice(i,1);
        }
    }

            // SAFETY: Limit particles array size to prevent memory leaks
            if (particles.length > 1000) {
                console.warn(`Particle limit exceeded (${particles.length}). Cleaning old particles...`);
                // Keep only particles with life remaining and remove from scene
                const toKeep = [];
                for (let i = 0; i < particles.length; i++) {
                    if (particles[i].life > 0) {
                        toKeep.push(particles[i]);
                    } else {
                        scene.remove(particles[i].mesh);
                    }
                }
                particles = toKeep;
            }

            // Particle update — swap-and-pop removal avoids O(n) array shifts
            let _pLen = particles.length;
            for(let i = _pLen - 1; i >= 0; i--) {
                const p = particles[i];

                // PHYSICS (Gravity & Bounce)
                if(p.isPhysics) {
                    p.vel.y -= 0.03;
                    p.mesh.position.x += p.vel.x;
                    p.mesh.position.y += p.vel.y;
                    p.mesh.position.z += p.vel.z;
                    p.mesh.rotation.x += p.vel.z;
                    p.mesh.rotation.z -= p.vel.x;
                    if(p.mesh.position.y < 0.25) {
                        p.mesh.position.y = 0.25;
                        p.vel.y *= -0.6;
                        p.vel.x *= 0.8;
                        p.vel.z *= 0.8;
                    }
                } else {
                    if(p.vel) {
                        p.mesh.position.x += p.vel.x;
                        p.mesh.position.y += p.vel.y;
                        p.mesh.position.z += p.vel.z;
                    }
                }

                p.life -= dt;

                if(p.type === 'floating_text') {
                    p.mesh.position.y += dt * 2.0;
                } else if(!p.isPhysics) {
                    p.mesh.scale.multiplyScalar(0.9);
                } else if(p.life < 0.5) {
                    p.mesh.scale.multiplyScalar(0.9);
                }

                if(p.life <= 0) {
                    scene.remove(p.mesh);
                    // Swap-and-pop: O(1) removal instead of O(n) splice
                    if(i < _pLen - 1) particles[i] = particles[_pLen - 1];
                    particles.length = --_pLen;
                }
            }
		    
            // --- FINAL RENDER (All visual updates complete) ---
            // Reset camera shake before rendering
            if(shakeEnabled && shakeIntensity > 0) {
                camera.position.sub(shakeOffset);
            }
            
            // Animate atmospheric particles — flat Float32Array velocities (3× cache-friendly vs object array)
            if (window.atmosphericParticles && window.particleVelocities && graphicsMode > 0) {
                const pos = window.atmosphericParticles.geometry.attributes.position.array;
                const vel = window.particleVelocities; // Float32Array: [vx0,vy0,vz0, vx1,vy1,vz1, ...]
                const len = pos.length; // pos.length === vel.length
                for (let i = 0; i < len; i += 3) {
                    pos[i]   += vel[i];
                    pos[i+1] += vel[i+1];
                    pos[i+2] += vel[i+2];
                    if (pos[i]   >  100) pos[i]   *= -0.9;
                    if (pos[i]   < -100) pos[i]   *= -0.9;
                    if (pos[i+1] >  100) pos[i+1] = 0;
                    if (pos[i+1] <    0) pos[i+1] = 100;
                    if (pos[i+2] >  100) pos[i+2] *= -0.9;
                    if (pos[i+2] < -100) pos[i+2] *= -0.9;
                }
                window.atmosphericParticles.geometry.attributes.position.needsUpdate = true;
            }
            
            // Rotate starfield slowly
            if (window.starfield) {
                window.starfield.rotation.y += 0.0001;
            }
            
            // Choose rendering method based on graphics settings
            if(graphicsMode === 2 && composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }

        // --- SPAWNER ---
        // --- SPAWNER ---

// --- runWaveLogic, mouse handlers, onClick ---
        function runWaveLogic() {
            if(activeWave) return;
            wave++; 
            activeWave = true;
            spawningFinished = false;
            
            // ✅ CRITICAL: Track wave completion for achievements
            if (typeof window.trackWaveCompleted === 'function') {
                window.trackWaveCompleted(wave);
            }
            
            // Notify CrazyGames that gameplay started
            notifyGameplayStart();
            
            // Show midgame ad every 5 waves (DISABLED - ad-free version)
            // if (wave > 1 && wave % 5 === 0) {
            //     showIntermissionAd();
            // }
            
            const btn = document.getElementById('btn-start-wave');
            btn.disabled = true; btn.innerText = "IN PROGRESS..."; btn.style.backgroundColor = "#555";
            updateUI();
            
            const wavePlan = getWaveData(wave);
            let groupIndex = 0;
            let enemiesInGroup = wavePlan[0].count;
            
            function spawnLoop() {
                if(!activeWave) return;
                if(isPaused || !gameRunning) { setTimeout(spawnLoop, 100); return; }

                spawnEnemy(wavePlan[groupIndex].type);
                enemiesInGroup--;

                if(enemiesInGroup <= 0) {
                    groupIndex++;
                    if(groupIndex >= wavePlan.length) {
                        spawningFinished = true;
                        return;
                    }
                    enemiesInGroup = wavePlan[groupIndex].count;
                }
                setTimeout(spawnLoop, wavePlan[groupIndex].interval);
            }
            spawnLoop();
        }

        // --- INTERACTION ---
        function onMD(e) {
            if (e.button === 1) { isPanning = true; panStart.set(e.clientX, e.clientY); return; } // Middle click
            onClick(e); // Pass event
        }
        function onMU(e) { if(e.button===1) isPanning = false; }
        
        function onMM(e) {
            if(!gameRunning) return;
            if (isPanning) {
                const dx = (e.clientX - panStart.x) * 0.1;
                const dy = (e.clientY - panStart.y) * 0.1;
                camera.position.x -= dx;
                camera.position.z -= dy;
                
                // Camera bounds - keep within play area
                camera.position.x = Math.max(-100, Math.min(100, camera.position.x));
                camera.position.z = Math.max(-75, Math.min(75, camera.position.z));
                
                panStart.set(e.clientX, e.clientY);
                return;
            }
            
            mouse.x = (e.clientX/window.innerWidth)*2-1; mouse.y = -(e.clientY/window.innerHeight)*2+1;
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(mapProps);
            for(let h of hits) {
                if(h.object.geometry instanceof THREE.PlaneGeometry && h.point.y < 1) {
                    // Freeform placement - no grid snapping!
                    const x = h.point.x;
                    const z = h.point.z;
                    hoverMesh.position.set(x, 0, z);
                    if (selectedType) {
                        const _valid = canBuild(x, z);
                        rangeRing.position.set(x, 0.5, z);
                        window._updateGhostValidity(_valid);
                        hoverMesh.visible = true;
                        if (TOWERS[selectedType].minRange) {
                            deadZoneRing.visible = true;
                            deadZoneRing.position.set(x, 0.51, z);
                            deadZoneRing.scale.set(TOWERS[selectedType].minRange, TOWERS[selectedType].minRange, 1);
                        } else {
                            deadZoneRing.visible = false;
                        }
                    }
                    break;
                }
            }
        }

        function onClick(e) {
            if(!gameRunning || lives<=0 || isPaused) return;

            if(e.button === 2) { deselectAll(); return; } // Right click
            if(e.button !== 0) return; // Only Left click

            // 1. Check for clicking EXISTING towers (Select)
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(scene.children, true);
            let clicked = null;
            for(let h of hits) {
                let p = h.object; while(p.parent&&p.parent!==scene) p=p.parent;
                const t = towers.find(tow => tow.mesh===p);
                if(t) { clicked=t; break; }
            }
            if(clicked) {
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
                selectedTower = clicked;
                selectedType = null;
                window._rebuildGhostTower(null, false);
                rangeRing.visible=true; 
                rangeRing.position.copy(clicked.mesh.position); 
                rangeRing.position.y=0.5; 
                rangeRing.scale.set(clicked.range,clicked.range,1);
                
                // Show dead zone for mortar
                if(clicked.minRange) {
                    deadZoneRing.visible = true;
                    deadZoneRing.position.copy(clicked.mesh.position);
                    deadZoneRing.position.y = 0.51;
                    deadZoneRing.scale.set(clicked.minRange, clicked.minRange, 1);
                } else {
                    deadZoneRing.visible = false;
                }
                
                updateInspect(); 
                return;
            }
            
            // 2. BUILD LOGIC
            if(selectedType) {
                const x = hoverMesh.position.x; const z = hoverMesh.position.z;
                
                // ANTI-SPAM: Prevent double-charging bug
                const now = Date.now();
                if(now - lastSpendTime < 100) return; // 100ms cooldown between builds
                
                // CHECK: Can we build here?
                if(canBuild(x,z)) {
                    const data = TOWERS[selectedType];
                    const cost = Math.floor(data.cost * GAME_CONFIG.costMult);
                    
                    // CHECK: Money
                    const myGold = (currentGamemode === 'separate' && socket) ? playerWallets[myPlayerIndex] : gold;
                    if(myGold < cost) {
                        showLocalError("INSUFFICIENT FUNDS");
                        return;
                    }

                    // CHECK: Farm Limit
                    if(selectedType === 'farm') {
                        const MAX_FARMS = 5;
                        let farmCount = 0;
                        if(currentGamemode === 'separate') {
                            // Count ONLY my farms
                            farmCount = towers.filter(t => t.type === 'farm' && t.ownerIndex === myPlayerIndex).length;
                        } else {
                            // Shared/Single: Count ALL farms
                            farmCount = towers.filter(t => t.type === 'farm').length;
                        }

                        if(farmCount >= MAX_FARMS) {
                            showLocalError(`MAX FARMS REACHED (${MAX_FARMS})`);
                            return;
                        }
                    }

                    // --- EXECUTE BUILD ---
                    // ANTI-SPAM: Mark spend time
                    lastSpendTime = now;
                    
                    // Deduct Money
                    if(currentGamemode === 'separate') {
                        playerWallets[myPlayerIndex] -= cost;
                        lastSpendTime = Date.now(); 
                        
                        // FIX: Update visual 'gold' immediately for EVERYONE, not just Host
                        gold = playerWallets[myPlayerIndex]; 
                    } else {
                        gold -= cost;
                    }
                    
                    AudioSys.click();

                    if(socket && myRoomId) {
                        const _bSkin = (typeof LockerSystem !== 'undefined')
                            ? LockerSystem.getEquippedSkin(selectedType) : 'default';
                        socket.emit('gameAction', { 
                            roomId: myRoomId, type: 'build', key: selectedType, 
                            x: x, z: z, pIndex: myPlayerIndex,
                            skin: _bSkin
                        });
                    }

                    // Local Build
                    const mesh = createTowerModel(selectedType, 1);
                    mesh.position.set(x, 0, z);
                    scene.add(mesh);
                    createParticles(mesh.position, 10, 0xcccccc);

                    towers.push({ 
                        mesh, 
                        ...JSON.parse(JSON.stringify(data)), 
                        type: selectedType, 
                        level: 1, 
                        cooldown: 0,
                        destroys: 0, // Initialize destroy counter
                        ownerRole: (socket && myRoomId) ? myRole : 'host',
                        ownerIndex: myPlayerIndex,
                        totalGenerated: 0, // <--- NEW: Init Farm Stats
                        skin: (typeof LockerSystem !== 'undefined')
                            ? LockerSystem.getEquippedSkin(selectedType) : 'default'
                    });
                    
                    
                    // Achievement tracking
                    trackTowerBuild();
                    
                    // Track tower built for challenges
                    if (typeof window.trackTowerBuilt === 'function') {
                        window.trackTowerBuilt();
                    }
                    
                    // Deduct from local display immediately to feel responsive
                    updateUI();
                } else {
                    // Cannot build here (Red square)
                    showLocalError("CANNOT BUILD HERE");
                }
            }
        }

function canBuild(x, z) {
            const p = new THREE.Vector3(x,0,z);

            // 1. Check if within play area boundaries (120x90 platform)
            if(Math.abs(x) > 115 || Math.abs(z) > 85) return false;

            // 2. Check distance to other towers (prevent stacking)
            if(towers.some(t => t.mesh.position.distanceTo(p) < 3)) return false;

            // 3. Check distance to the road path
            for(let i=0; i<currentWaypoints.length-1; i++) {
                const a = currentWaypoints[i], b = currentWaypoints[i+1];
                // Math to find the closest point on the line segment
                const t = Math.max(0, Math.min(1, ((p.x-a.x)*(b.x-a.x)+(p.z-a.z)*(b.z-a.z)) / a.distanceToSquared(b)));
                const proj = new THREE.Vector3().copy(a).add(new THREE.Vector3().subVectors(b,a).multiplyScalar(t));
                
                // Increased from 3.5 to 4.5 for smoother curved paths
                if(p.distanceTo(proj) < 4.5) return false;
            }

            // 4. Check distance to waypoint joints (path corners)
            for(let i=0; i<currentWaypoints.length; i++) {
                if(p.distanceTo(currentWaypoints[i]) < 4) return false;
            }

            // 5. Check Environment Obstacles (Trees, Rocks, Cave, Portals, Base)
            // We filter mapProps for "Group" types, which are the 3D decor objects
            const obstacleCollision = mapProps.some(obj => {
                if (obj.type === 'Group') {
                    // Check if we are within collision range
                    const dist = obj.position.distanceTo(p);
                    // Portals and base are larger, need more space
                    const minDist = (obj.userData && obj.userData.isPortal) ? 8 : 4.5;
                    return dist < minDist;
                }
                return false;
            });

            if (obstacleCollision) return false;

            return true;
        }

        // =====================================================
        // MODERN TOWER UI FUNCTIONS
        // =====================================================
        
        
        // Populate tower grid

// --- onResize, initPreviewSystem, initPostProcessing ---
        function onResize() { 
            camera.aspect = window.innerWidth/window.innerHeight; 
            camera.updateProjectionMatrix(); 
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // NEW: Update the Composer size too!
            if(composer) composer.setSize(window.innerWidth, window.innerHeight);
        }

	// --- MOBILE CONTROLS ---
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
    // server-location element removed — ping counters are managed elsewhere
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
	
        let dockOpen = true;

// --- initMenuCanvas, live player counter ---
        function toggleDock() {
            dockOpen = !dockOpen;
            const dock = document.getElementById('tower-dock');
            const btn  = document.getElementById('dock-toggle');
            if (dockOpen) {
                dock.classList.remove('hiding');
                dock.style.display = 'flex';
                // Re-trigger entrance animation
                dock.style.animation = 'none';
                dock.offsetHeight; // force reflow
                dock.style.animation = '';
                btn.innerHTML = '▲ ARSENAL';
                btn.classList.remove('dock-closed');
            } else {
                btn.innerHTML = '▼ ARSENAL';
                btn.classList.add('dock-closed');
                dock.classList.add('hiding');
                setTimeout(() => {
                    if (!dockOpen) dock.style.display = 'none';
                    dock.classList.remove('hiding');
                }, 220);
            }
        }
        init();
        
        // ========================================================================
        // INITIALIZE CRAZYGAMES SDK ON PAGE LOAD
        // ========================================================================
        window.addEventListener('load', () => {
            initCrazyGamesSDK();
            
            // Check for invite link room parameter
            checkInviteLink();
            
            // Start live player counter
            initLivePlayerCounter();

            // Menu background animation
            initMenuCanvas();
        });

        function initMenuCanvas() {
            const canvas = document.getElementById('menu-bg-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let W = canvas.width  = window.innerWidth;
            let H = canvas.height = window.innerHeight;
            window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

            // Subtle hex grid
            const dots = [];
            const sp = 70;
            for (let r = 0; r < Math.ceil(H/sp)+2; r++)
                for (let c = 0; c < Math.ceil(W/sp)+2; c++)
                    dots.push({ x: c*sp+(r%2)*sp/2, y: r*sp*0.866, p: Math.random()*Math.PI*2 });

            // Floating enemy shapes
            const ICONS = ['◆','▲','●','■','⬟'];
            const floaters = Array.from({length:24}, () => ({
                x: Math.random()*W, y: Math.random()*H,
                vx: (Math.random()-.5)*.45, vy: Math.random()*.32+.07,
                sz: Math.random()*11+6, icon: ICONS[Math.floor(Math.random()*ICONS.length)],
                col: ['#e74c3c','#e67e22','#9b59b6','#3498db'][Math.floor(Math.random()*4)],
                alpha: Math.random()*.16+.04, rot: Math.random()*Math.PI*2, rv: (Math.random()-.5)*.011
            }));

            // Bullet streaks
            const bullets = Array.from({length:18}, () => ({
                x: Math.random()*W, y: Math.random()*H,
                vx: (Math.random()-.5)*3.8, vy: (Math.random()-.5)*3.8,
                len: Math.random()*18+7,
                col: ['#3498db','#2ecc71','#e67e22'][Math.floor(Math.random()*3)],
                alpha: Math.random()*.13+.04
            }));

            let f = 0;
            (function draw() {
                ctx.clearRect(0,0,W,H);
                // Hex dots
                dots.forEach(d => {
                    const a = .025+.018*Math.sin(d.p+f*.007);
                    ctx.beginPath(); ctx.arc(d.x,d.y,1.2,0,Math.PI*2);
                    ctx.fillStyle=`rgba(230,126,34,${a})`; ctx.fill();
                });
                // Bullets
                bullets.forEach(b => {
                    b.x+=b.vx; b.y+=b.vy;
                    if(b.x<-60)b.x=W+60; if(b.x>W+60)b.x=-60;
                    if(b.y<-60)b.y=H+60; if(b.y>H+60)b.y=-60;
                    ctx.save(); ctx.globalAlpha=b.alpha;
                    ctx.strokeStyle=b.col; ctx.lineWidth=1.5;
                    ctx.shadowColor=b.col; ctx.shadowBlur=4;
                    ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*b.len,b.y-b.vy*b.len);
                    ctx.stroke(); ctx.restore();
                });
                // Floaters
                floaters.forEach(e => {
                    e.x+=e.vx; e.y+=e.vy; e.rot+=e.rv;
                    if(e.y>H+30){e.y=-30;e.x=Math.random()*W;}
                    if(e.x<-30)e.x=W+30; if(e.x>W+30)e.x=-30;
                    ctx.save(); ctx.globalAlpha=e.alpha;
                    ctx.translate(e.x,e.y); ctx.rotate(e.rot);
                    ctx.font=`${e.sz}px sans-serif`; ctx.fillStyle=e.col;
                    ctx.shadowColor=e.col; ctx.shadowBlur=7;
                    ctx.textAlign='center'; ctx.textBaseline='middle';
                    ctx.fillText(e.icon,0,0); ctx.restore();
                });
                f++; requestAnimationFrame(draw);
            })();
        }
        
        /**
         * Live Player Counter System
         * Fetches total player count from Render.com tracking server
         * Also sends heartbeat to register this player as active
         */
        let playerHeartbeatInterval = null;
        let playerSessionId = null;
        
        // ⚠️ CHANGE THIS TO YOUR RENDER.COM URL! ⚠️
        const TRACKING_SERVER = 'https://karlostdplayercounter.onrender.com';
        
        function initLivePlayerCounter() {
            const counterElement = document.getElementById('live-player-count');
            if (!counterElement) return;
            
            // Generate unique session ID for this player
            playerSessionId = 'player_' + Date.now() + '_' + Math.random().toString(36).substring(7);
            
            // Start sending heartbeat to register as active player
            startPlayerHeartbeat();
            
            // Update counter immediately
            updateLivePlayerCount();
            
            // Update every 30 seconds
            setInterval(updateLivePlayerCount, 30000);
        }
        
        /**
         * Send heartbeat to servers to register this player as active
         * Heartbeats are sent every 25 seconds (servers expire after 60s of no heartbeat)
         */
        function startPlayerHeartbeat() {
            // Send initial heartbeat
            sendHeartbeat();
            
            // Send heartbeat every 25 seconds
            playerHeartbeatInterval = setInterval(sendHeartbeat, 25000);
            
            // Stop heartbeat when page unloads
            window.addEventListener('beforeunload', stopPlayerHeartbeat);
        }
        
        function stopPlayerHeartbeat() {
            if (playerHeartbeatInterval) {
                clearInterval(playerHeartbeatInterval);
                playerHeartbeatInterval = null;
            }
        }
        
        async function sendHeartbeat() {
            if (!playerSessionId) return;
            
            try {
                await fetch(TRACKING_SERVER + '/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: playerSessionId,
                        platform: window.location.hostname.includes('itch') ? 'itch.io' : 
                                 window.location.hostname.includes('crazygames') ? 'crazygames' : 'web',
                        timestamp: Date.now()
                    }),
                    cache: 'no-cache'
                });
            } catch (err) {
                // Heartbeat failed - server might be offline or sleeping
                console.log('Heartbeat failed:', err.message);
            }
        }
        
        async function updateLivePlayerCount() {
            const counterElement = document.getElementById('live-player-count');
            if (!counterElement) return;
            
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(TRACKING_SERVER + '/player-count', {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-cache'
                });
                
                clearTimeout(timeout);
                
                if (response.ok) {
                    const data = await response.json();
                    const count = data.count || 0;
                    
                    counterElement.textContent = count;
                    counterElement.parentElement.title = `${count} players with game open`;
                    
                    // Add animation when count changes
                    counterElement.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        counterElement.style.transform = 'scale(1)';
                    }, 200);
                } else {
                    counterElement.textContent = '0';
                    counterElement.parentElement.title = 'Unable to fetch player count';
                }
            } catch (error) {
                console.log('Failed to update player count:', error.message);
                counterElement.textContent = '0';
                counterElement.parentElement.title = 'Checking for active players...';
            }
        }
        
        /**
         * Check URL for room parameter and auto-join
         * Handles CrazyGames invite links
         */
        function checkInviteLink() {
            const urlParams = new URLSearchParams(window.location.search);
            const roomId = urlParams.get('room') || urlParams.get('roomId');
            
            if (roomId) {
                console.log('🔗 Invite link detected! Room:', roomId);
                setTimeout(() => {
                    // Auto-fill name from auth
                    const autoName = (typeof KarloAuth !== 'undefined') ? KarloAuth.getUsername() : null;
                    const inp = document.getElementById('player-name-input');
                    if (inp && autoName) inp.value = autoName;
                    // Pre-fill code
                    const codeInp = document.getElementById('room-code-input');
                    if (codeInp) codeInp.value = roomId.toUpperCase();
                    // Go straight to region selector so they connect then auto-join
                    hideAllScreens();
                    /* region-selector removed */;
                    setTimeout(() => measureAllRegions(), 300);
                    console.log('✅ Ready to join room:', roomId);
                }, 500);
            }
        }


	// --- MULTIPLAYER LOGIC ---
        let socket;
        let myRole = null; 
        let myRoomId = null;

	const SERVER_REGIONS = [
    {
        region: "US West (Oregon)",
        code: "us-west",
        group: "us",
        location: "West Coast USA, Canada",
        servers: [
            "https://td-game-server-ygr0.onrender.com",
            "https://karlos-td-oregon-2.onrender.com",
            "https://td-game-server-k409.onrender.com"
        ]
    },
    {
        region: "US East (Ohio)",
        code: "us-east-1",
        group: "us",
        location: "Central & East USA",
        servers: [
            "https://karlos-td-ohio-1.onrender.com",
            "https://karlos-td-ohio-2.onrender.com",
            "https://karlos-td-ohio-3.onrender.com"
        ]
    },
    {
        region: "US East (Virginia)",
        code: "us-east-2",
        group: "us",
        location: "East Coast USA, South America",
        servers: [
            "https://karlos-td-virginia-1.onrender.com",
            "https://karlos-td-virginia-2.onrender.com",
            "https://karlos-td-virginia-3.onrender.com"
        ]
    },
    {
        region: "EU Central (Frankfurt)",
        code: "eu-central",
        group: "eu",
        location: "Europe, Middle East, Africa",
        servers: [
            "https://karlos-td-frankfurt-1.onrender.com",
            "https://karlos-td-frankfurt-2.onrender.com",
            "https://karlos-td-frankfurt-3.onrender.com"
        ]
    },
    {
        region: "Asia (Singapore)",
        code: "asia-southeast",
        group: "asia",
        location: "Asia-Pacific, Oceania",
        servers: [
            "https://karlos-td-singapore-1.onrender.com",
            "https://karlos-td-singapore-2.onrender.com",
            "https://karlos-td-singapore-3.onrender.com"
        ]
    }
];

	let selectedRegion = null;
let pingLoop = null;
let selectedServerIndex = 0;
let regionPings = {};
let isPingingServers = false;
let currentServerURL = null;
let connectionAttempts = 0;
let connectedServerInfo = null; // {region, serverNumber, url}

	async function pingServer(url) {
    const startTime = Date.now();
    try {
        // Try HTTP fetch first
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        await fetch(url + '/ping', { 
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return Date.now() - startTime;
    } catch (error) {
        // Fallback to Socket.io ping
        return await pingViaSocket(url);
    }
}


// --- Ping, region selection, socket / multiplayer ---
function pingViaSocket(url) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const testSocket = io(url, {
            timeout: 5000,
            reconnection: false,
            transports: ['websocket', 'polling']
        });
        
        testSocket.on('connect', () => {
            const latency = Date.now() - startTime;
            testSocket.disconnect();
            resolve(latency);
        });
        
        testSocket.on('connect_error', () => {
            testSocket.disconnect();
            resolve(9999); // Offline marker
        });
        
        setTimeout(() => {
            testSocket.disconnect();
            resolve(9999);
        }, 5000);
    });
}

async function measureAllRegions() {
    if (isPingingServers) return;
    isPingingServers = true;
    
    console.log('🌐 Measuring latency to all regions...');
    updateRegionStatus('<i class="fa-solid fa-magnifying-glass"></i> Measuring latency to all regions...');
    
    const pingPromises = SERVER_REGIONS.map(async (region) => {
        const ping = await pingServer(region.servers[0]);
        regionPings[region.code] = ping;
        updateRegionUI(region.code, ping);
        console.log(`📊 ${region.region}: ${ping}ms`);
        return { region, ping };
    });
    
    const results = await Promise.all(pingPromises);
    
    // Auto-select best region (lowest ping)
    const bestRegion = results.reduce((best, current) => {
        return current.ping < best.ping ? current : best;
    });
    
    selectRegion(bestRegion.region.code);
    isPingingServers = false;
    
    console.log(`✅ Auto-selected: ${bestRegion.region.region} (${bestRegion.ping}ms)`);
    updateRegionStatus(`<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> Best region selected: ${bestRegion.region.region}`);
}

function updateRegionUI(regionCode, ping) {
    const regionItem = document.getElementById('region-' + regionCode);
    if (!regionItem) return;
    
    const statusDot = regionItem.querySelector('.region-status-dot');
    const pingDisplay = regionItem.querySelector('.region-ping');
    
    // Update status dot color
    let color, boxShadow;
    if (ping < 100) {
        color = '#00ff00';
        boxShadow = '0 0 10px #00ff00';
    } else if (ping < 200) {
        color = '#ffff00';
        boxShadow = '0 0 10px #ffff00';
    } else if (ping < 9999) {
        color = '#ff6600';
        boxShadow = '0 0 10px #ff6600';
    } else {
        color = '#ff0000';
        boxShadow = '0 0 10px #ff0000';
    }
    
    statusDot.style.background = color;
    statusDot.style.boxShadow = boxShadow;
    
    // Update ping display
    if (ping < 9999) {
        pingDisplay.textContent = ping + 'ms';
        pingDisplay.style.color = ping < 100 ? '#00ff00' : ping < 200 ? '#ffff00' : '#ff6600';
    } else {
        pingDisplay.textContent = 'Offline';
        pingDisplay.style.color = '#ff0000';
    }
}

function selectRegion(regionCode) {
    selectedRegion = SERVER_REGIONS.find(r => r.code === regionCode);
    if (!selectedRegion) return;
    
    // Update UI selection
    document.querySelectorAll('.region-item').forEach(item => {
        item.classList.remove('region-selected');
    });
    
    const regionItem = document.getElementById('region-' + regionCode);
    if (regionItem) {
        regionItem.classList.add('region-selected');
    }
    
    selectedServerIndex = 0;
    updateConnectionDisplay();
    
    console.log(`📍 Region selected: ${selectedRegion.region}`);
}

function updateConnectionDisplay() {
    const display = document.getElementById('selected-region-display');
    if (!display || !selectedRegion) return;
    
    const ping = regionPings[selectedRegion.code] || '...';
    display.innerHTML = `
        <div style="font-size: 16px; color: #00ff88; font-weight: bold; margin-bottom: 5px;">
            ${selectedRegion.region}
        </div>
        <div style="font-size: 14px; color: #aaa;">
            ${ping < 9999 ? 'Ping: ' + ping + 'ms' : 'Status: Checking...'}
        </div>
    `;
}

function updateRegionStatus(message) {
    const statusEl = document.getElementById('region-status-message');
    if (statusEl) {
        statusEl.innerHTML = message;
    }
}

	async function connectToServerWithFailover() {
    if (!selectedRegion) {
        showToast('<i class="fa-solid fa-triangle-exclamation"></i> Please select a region first!', 'warning');
        return false;
    }
    
    connectionAttempts = 0;
    const servers = selectedRegion.servers;
    
    for (let i = 0; i < servers.length; i++) {
        selectedServerIndex = i;
        const serverURL = servers[i];
        currentServerURL = serverURL;
        
        console.log(`🔌 Attempting: ${selectedRegion.region} Server #${i + 1}`);
        showToast(`Connecting to ${selectedRegion.region} Server #${i + 1}...`, 'info');
        
        const connected = await attemptConnection(serverURL, i + 1);
        
        if (connected) {
            connectedServerInfo = {
                region: selectedRegion.region,
                serverNumber: i + 1,
                url: serverURL,
                ping: regionPings[selectedRegion.code]
            };
            console.log('✅ Connected successfully!');
            showToast(`<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> Connected to ${selectedRegion.region} Server #${i + 1}`, 'success');
            updateLobbyServerInfo();
	    document.getElementById('mp-menu').style.display = 'flex';
            return true;
        }
        
        console.log(`❌ Server #${i + 1} failed, trying next...`);
    }
    
    // All servers failed
    console.error('❌ All servers in region failed!');
    showToast(`<i class="fa-solid fa-circle-xmark" style="color:#e74c3c"></i> All ${selectedRegion.region} servers are offline. Please try another region.`, 'error');
    return false;
}

function attemptConnection(serverURL, serverNumber) {
    return new Promise((resolve) => {
        let wakingUpShown = false;
        
        const tempSocket = io(serverURL, {
            timeout: 60000,
            reconnection: false,
            transports: ['websocket', 'polling']
        });
        
        // Show "waking up" message after 3 seconds
        const wakingTimer = setTimeout(() => {
            wakingUpShown = true;
            showToast(`⏳ Server #${serverNumber} is sleeping... Waking up (may take 30-50 seconds)`, 'warning', 0);
        }, 3000);
        
        // Total timeout (60 seconds for Render wake-up)
        const timeoutTimer = setTimeout(() => {
            clearTimeout(wakingTimer);
            tempSocket.disconnect();
            resolve(false);
        }, 60000);
        
        tempSocket.on('connect', () => {
            clearTimeout(wakingTimer);
            clearTimeout(timeoutTimer);
            socket = tempSocket;
            setupSocketListeners();
            resolve(true);
        });
        
        tempSocket.on('connect_error', (error) => {
            clearTimeout(wakingTimer);
            clearTimeout(timeoutTimer);
            console.error('Connection error:', error);
            tempSocket.disconnect();
            resolve(false);
        });
    });
}

function setupSocketListeners() {
    if (!socket) return;
    
    // ═══════════════════════════════════════════════════════════
    // SETUP AUTO-RECONNECTION (from Enhancements.js)
    // ═══════════════════════════════════════════════════════════
    if (typeof setupReconnectionLogic === 'function') {
        setupReconnectionLogic();
        console.log('✅ Auto-reconnection enabled');
    }
    // ═══════════════════════════════════════════════════════════
    
    // Server info
    socket.on('serverInfo', (data) => {
        console.log('Server location:', data.location);
        // server-location element removed from UI
    });
    
    // Ping Heartbeat (Updates every 5 seconds)
        // Ping Heartbeat (Updates every 2 seconds)
        setInterval(() => {
            if (!socket || !socket.connected) return;

            const start = Date.now();
            
            // 1. Send the pulse
            socket.emit('ping');
            
            // 2. Wait for the echo
            socket.once('pong', () => {
                const latency = Date.now() - start;
                
                // Update the global ping tracker
                if (connectedServerInfo) {
                    connectedServerInfo.ping = latency;
                    
                    // Force the HTML to update
                    const infoEl = document.getElementById('server-connection-info');
                    if (infoEl) {
                        // We rebuild just the latency part to prevent flickering
                        const latencyEl = infoEl.querySelector('div[style*="font-size: 12px"]');
                        if (latencyEl) {
                            latencyEl.innerText = `Latency: ${latency}ms`;
                        } else {
                            // Fallback: Rebuild the whole thing
                            updateLobbyServerInfo();
                        }
                    }
                }
            });
        }, 5000);
    
    socket.on('roomCreated', (data) => {
        myRoomId = data.roomId;
        myRole   = 'host';
        // Persist room state so refresh can offer rejoin
        if (typeof _saveRoomState === 'function') _saveRoomState();

        // Store our own level in the map so it's always accessible
        if (socket && window.playerLevel) {
            playerLevels[socket.id] = window.playerLevel;
        }

        // MUST set _lastLobbyName BEFORE calling updateLobbyUI, otherwise host sees blank name
        const playerDisplayName = (typeof KarloAuth !== 'undefined' ? KarloAuth.getUsername() : '')
                                   || document.getElementById('player-name-input')?.value || 'Host';
        const _lobbyDisplayName = _pendingLobbyName || playerDisplayName;
        window._lastLobbyName = _pendingLobbyName || playerDisplayName; // persist for updateLobbyUI
        _pendingLobbyName = ''; // clear after use

        // Now safe to render the lobby — name is already set
        updateLobbyUI(data.players);
        // Region info for the server browser filter tabs
        const _announceRegion = connectedServerInfo ? connectedServerInfo.region : (selectedRegion ? selectedRegion.region : '');
        const _announceRegionGroup = connectedServerInfo
            ? (SERVER_REGIONS.find(r => r.region === connectedServerInfo.region) || {}).group || ''
            : (selectedRegion ? selectedRegion.group || '' : '');
        function _announce(status) {
            if (!socket?.connected || !myRoomId) return;
            // Encode maxPlayers into status (e.g. "waiting|3") because some servers
            // don't return the maxPlayers field in getRooms responses — but status always comes through
            const encodedStatus = status + '|' + _lobbyMaxPlayers;
            socket.emit('announceRoom', {
                roomId:      myRoomId,
                hostName:    _lobbyDisplayName,
                isPrivate:   !lobbyIsPublic,
                playerCount: allPlayers.length,
                maxPlayers:  _lobbyMaxPlayers,
                region:      _announceRegion,
                regionGroup: _announceRegionGroup,
                location:    _announceRegion,
                status:      encodedStatus
            });
        }
        _announce('waiting');
        if (_lobbyKeepAlive) clearInterval(_lobbyKeepAlive);
        _lobbyKeepAlive = setInterval(() => _announce('waiting'), 15000);
        // Expose so gameStart can call _announce('playing')
        window._mpAnnounce = _announce;
    });

    // Server list responses
    socket.on('rooms',       (rooms) => _renderRoomList(rooms || []));
    socket.on('publicRooms', (rooms) => _renderRoomList(rooms || []));

    socket.on('playerJoined', (players) => {
        // Enforce max players: if we're host and over limit, boot the newest joiner
        if (myRole === 'host' && players.length > _lobbyMaxPlayers) {
            const excess = players.filter(p => p.role !== 'host').pop();
            if (excess && socket?.connected) {
                socket.emit('kickPlayer', { roomId: myRoomId, targetId: excess.id });
            }
        }
        updateLobbyUI(players);
        // Store and broadcast our level so others can see it
        if (socket && myRoomId && window.playerLevel) {
            playerLevels[socket.id] = window.playerLevel;
            socket.emit('gameAction', {
                type: 'share_level',
                roomId: myRoomId,
                playerId: socket.id,
                level: window.playerLevel
            });
        }
        // HOST: broadcast lobby config (name + maxPlayers) so joiners see the correct lobby
        if (myRole === 'host' && socket && myRoomId) {
            socket.emit('gameAction', {
                type: 'lobby_config',
                roomId: myRoomId,
                maxPlayers: _lobbyMaxPlayers,
                lobbyName: window._lastLobbyName || ''
            });
            // Re-announce immediately so server list reflects the new player count
            if (typeof window._mpAnnounce === 'function') window._mpAnnounce('waiting');
        }
    });

    socket.on('playerLeft', (id) => {
        const idx = allPlayers.findIndex(p => p.id === id);
        if (idx !== -1) {
            const pName = allPlayers[idx].name;
            showLocalError(`${pName} LEFT THE GAME`, '#f1c40f');

            // Remove from ready set
            _readyPlayers.delete(id);
            
            allPlayers.splice(idx, 1);
            playerWallets.splice(idx, 1);
            playerWallets.push(0);

            towers.forEach(t => {
                if (t.ownerIndex === idx) {
                    t.ownerIndex = -1;
                } else if (t.ownerIndex > idx) {
                    t.ownerIndex--;
                }
            });

            myPlayerIndex = allPlayers.findIndex(p => p.id === socket.id);

            // If still in lobby (not yet in-game), refresh the lobby slots
            const lobbyScreen = document.getElementById('lobby-screen');
            if (lobbyScreen && lobbyScreen.style.display !== 'none') {
                updateLobbyUI(allPlayers);
            } else {
                updateUI();
            }

            // HOST: immediately re-announce updated player count to server list
            if (myRole === 'host' && typeof window._mpAnnounce === 'function') {
                window._mpAnnounce('waiting');
            }
        }
    });

    socket.on('hostLeft', () => {
        if (typeof kAlert === 'function') {
            kAlert('HOST DISCONNECTED', 'The host left the game.\nReturning to main menu.', { icon: '<i class="fa-solid fa-plug-circle-xmark"></i>', danger: true });
            setTimeout(goToMainMenu, 2000);
        } else {
            goToMainMenu();
        }
    });

    socket.on('errorMsg', (msg) => {
        if (typeof kAlert === 'function') kAlert('ERROR', msg, { icon: '<i class="fa-solid fa-circle-xmark"></i>', danger: true });
        else alert(msg);
    });
    socket.on('forceStartWave', () => { runWaveLogic(); });
    socket.on('forceRestart', () => { location.reload(); });

    socket.on('forceGameState', (data) => {
        isPaused = true;
        gameRunning = false;
        if (data.state === 'loss') {
            wave = data.finalWave;
            document.getElementById('ui-wave').innerText = wave;
            document.getElementById('final-wave-loss').innerText = data.finalWave;
            window.showScrapBreakdown(wave, currentDifficulty, false);
            document.getElementById('game-over-screen').style.display = 'flex';
        } else if (data.state === 'win') {
            window.showScrapBreakdown(wave, currentDifficulty, true);
            document.getElementById('victory-screen').style.display = 'flex';
        }
    });

    socket.on('forcePause', (pauseState) => { runPauseLogic(pauseState); });
    
    // Continue with existing remoteAction handler...
    socket.on('remoteAction', (data) => {
                    
                    // --- LEVEL SHARING ---
                    if (data.type === 'share_level') {
                        playerLevels[data.playerId] = data.level;
                        window.playerLevels = playerLevels; // keep window ref in sync
                        // Refresh lobby display if we're in the lobby
                        if (allPlayers.length > 0 && document.getElementById('lobby-screen')?.style.display === 'flex') {
                            updateLobbyUI(allPlayers);
                        }
                        return;
                    }

                    // --- LOBBY CONFIG (maxPlayers + name broadcast by host to joiners) ---
                    if (data.type === 'lobby_config') {
                        if (myRole !== 'host') {
                            _lobbyMaxPlayers = data.maxPlayers || _lobbyMaxPlayers;
                            if (data.lobbyName) window._lastLobbyName = data.lobbyName;
                            // Refresh lobby if we're currently in it
                            if (allPlayers.length > 0 && document.getElementById('lobby-screen')?.style.display === 'flex') {
                                updateLobbyUI(allPlayers);
                            }
                        }
                        return;
                    }

                    // --- READY STATE ---
                    if (data.type === 'player_ready') {
                        if (data.ready) {
                            _readyPlayers.add(data.playerId);
                        } else {
                            _readyPlayers.delete(data.playerId);
                        }
                        if (document.getElementById('lobby-screen')?.style.display === 'flex') {
                            updateLobbyUI(allPlayers);
                        }
                        return;
                    }

                    // --- 1. MASTER SYNC ---
                    if (data.type === 'master_sync') {
    		    lives = data.lives;
    		    currentGamemode = data.mode;
    		    wave = data.wave;
                    
                    // Update host performance metrics
                    if (data.hostFPS !== undefined && myRole !== 'host') {
                        // Calculate effective ping based on host FPS
                        const effectivePing = data.hostFPS < 30 ? 200 : (data.hostFPS < 50 ? 100 : 50);
                        updateHostPing(effectivePing);
                    }

    		    // Sync Wallets
                    if (currentGamemode === 'shared') {
                        gold = data.gold;
                    } else {
                        const serverWallets = data.wallets;
                        for(let i=0; i<4; i++) {
                            // 1. Always update the array storage
                            playerWallets[i] = serverWallets[i];

                            // 2. If this is ME, update my display
                            if (i === myPlayerIndex) {
                                // If I haven't clicked anything for 500ms, trust the server completely.
                                // This lets income/destroys update your UI, while protecting your clicks.
                                if (Date.now() - lastSpendTime > 500) {
                                    gold = serverWallets[i];
                                }
                            }
                        }
                    }
                    updateUI();
                        
                        // Sync Enemies
                        data.enemies.forEach(syncE => {
                            let localE = enemies.find(e => e.id === syncE.id);
                            
                            // 1. UPDATE EXISTING ENEMY (This handles the turning!)
                            if(localE) {
                                localE.mesh.position.x = syncE.x; 
                                localE.mesh.position.z = syncE.z;
                                
                                // --- THIS IS THE LINE YOU ARE MISSING ---
                                // Without this, they only rotate once when created!
                                if(syncE.rot !== undefined) localE.mesh.rotation.y = syncE.rot; 
                                // ----------------------------------------

                                localE.hp = syncE.hp;
				localE.maxHp = syncE.maxHp;
                                
                                // Health Bar Update
                                const pct = Math.max(0, localE.hp / localE.maxHp);
                                localE.fg.scale.x = pct; 
                                localE.fg.material.color.setHSL(pct * 0.3, 1, 0.5);
                                
                                if(localE.hpGroup) {
                                    localE.hpGroup.position.copy(localE.mesh.position);
                                    localE.hpGroup.position.y += localE.hpHeight; 
                                    localE.hpGroup.quaternion.copy(camera.quaternion); 
                                }
                            } 
                            // 2. CREATE MISSING ENEMY
                            else {
                                spawnEnemy(syncE.type, syncE.id);
                                localE = enemies.find(e => e.id === syncE.id);
                                if(localE) {
                                    localE.mesh.position.set(syncE.x, 0, syncE.z);
                                    // Apply rotation immediately on spawn
                                    if(syncE.rot !== undefined) localE.mesh.rotation.y = syncE.rot;
                                    localE.hp = syncE.hp;
                                }
                            }
                        });
                        // Sync Towers (Rotation + Repair)
                        if(data.towers) {
                            data.towers.forEach(syncT => {
                                let localT = towers.find(t => Math.abs(t.mesh.position.x - syncT.x) < 0.1 && Math.abs(t.mesh.position.z - syncT.z) < 0.1);
                                if(localT) {
                                    if(localT.mesh.children[1]) localT.mesh.children[1].rotation.y = syncT.rotY;
				    localT.destroys = syncT.destroys;
                                } else {
                                    // Create missing tower
                                    const mesh = createTowerModel(syncT.type, syncT.level, syncT.branch);
                                    // Apply skin from the player who placed this tower
                                    if (syncT.skin && syncT.skin !== 'default') {
                                        const isMe = syncT.ownerIndex === myPlayerIndex;
                                        if (isMe) {
                                            // My own tower — getActiveSkin already handled it in createTowerModel
                                        } else {
                                            window._applyRemoteSkin(mesh, syncT.type, syncT.skin);
                                        }
                                    }
                                    mesh.position.set(syncT.x, 0, syncT.z);
                                    scene.add(mesh);
                                    const tData = TOWERS[syncT.type];
                                    towers.push({
                                        mesh, 
                                        ...JSON.parse(JSON.stringify(tData)),
                                        type: syncT.type,
                                        level: syncT.level,
                                        branch: syncT.branch,
                                        cooldown: 0,
                                        destroys: syncT.destroys || 0,
                                        ownerRole: syncT.owner,
                                        ownerIndex: syncT.ownerIndex,
                                        skin: syncT.skin || 'default'
                                    });
                                    
                                    // Track tower for challenges
                                    if (typeof window.trackTowerBuilt === 'function') {
                                        window.trackTowerBuilt();
                                    }
                                }
                            });

                            // Cleanup Ghosts
                            const hostTowerSigs = new Set(data.towers.map(t => `${Math.round(t.x)},${Math.round(t.z)}`));
                            for(let i = towers.length - 1; i >= 0; i--) {
                                const t = towers[i];
                                const sig = `${Math.round(t.mesh.position.x)},${Math.round(t.mesh.position.z)}`;
                                if(!hostTowerSigs.has(sig)) {
                                    scene.remove(t.mesh);
                                    towers.splice(i, 1);
                                }
                            }
                        }

                        // Remove Dead Enemies
                        const hostIds = data.enemies.map(e => e.id);
                        for(let i=enemies.length-1; i>=0; i--) {
                            if(!hostIds.includes(enemies[i].id)) {
                                scene.remove(enemies[i].mesh); if(enemies[i].hpGroup) scene.remove(enemies[i].hpGroup);
                                enemies.splice(i, 1);
                            }
                        }
                    }

                    // --- 2. TOWER STUN ---
                    else if(data.type === 'tower_stun') {
                        const t = towers.find(tow => Math.abs(tow.mesh.position.x - data.tx) < 0.1 && Math.abs(tow.mesh.position.z - data.tz) < 0.1);
                        if(t) {
                            t.stunned = 2.0;
                            createFloatingText("ZAP!", t.mesh.position.clone().add(new THREE.Vector3(0,4,0)), "#3498db");
                            createParticles(t.mesh.position.clone().add(new THREE.Vector3(0,2,0)), 10, 0x00ffff);
                        }
                    }

                    // --- 3. SPAWN MINION ---
                    else if(data.type === 'spawn_minion') {
                        spawnEnemy(data.key, data.id);
                        const minion = enemies[enemies.length-1];
                        minion.pathIdx = data.idx;
                        minion.mesh.position.set(data.x, 0, data.z);
                    }

                    // --- 4. VISUAL EFFECTS (Shooting, Healing, Damage) ---
                    else if(data.type === 'visual_effect') {
                        
                        // A. SHOOTING (This is what was broken!)
                        if(data.effect === 'shoot') {
                            const t = towers.find(tow => Math.abs(tow.mesh.position.x - data.towerX) < 0.1 && Math.abs(tow.mesh.position.z - data.towerZ) < 0.1);
                            const target = enemies.find(en => en.id === data.targetId);
                            
                            if(t && target) {
                                // Rotate Turret
                                if(t.mesh.children[1]) t.mesh.children[1].rotation.y = data.rotY;
                                t.currentRotY = data.rotY; // Save for smoothing

                                // Flash Target
                                triggerFlash(target);
                                AudioSys.shoot(data.towerType);

                                // Create Projectile Visuals
                                const muzzlePos = getMuzzlePosition(t);

                                if(data.towerType === 'laser') {
                                    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([muzzlePos, target.mesh.position]), _MAT.beam);
                                    scene.add(line); setTimeout(()=>scene.remove(line), 50);
                                    createImpact(target.mesh.position, 0xe74c3c, 2);
                                } 
                                else if (data.towerType === 'ice') {
                                    createExplosion(t.mesh.position, 0xaaddff, t.range/2);
                                } 
                                else if (data.towerType === 'tesla') {
                                    // Base bolt (Chain is handled by 'tesla_chain' effect below)
                                    const geo = new THREE.BufferGeometry().setFromPoints([muzzlePos, target.mesh.position]);
                                    const bolt = new THREE.Line(geo, _MAT.tesla);
                                    scene.add(bolt); setTimeout(() => scene.remove(bolt), 100);
                                } 
                                else {
                                    // Standard Projectile (Minigun, Gunner, Sniper, Plasma, Mortar)
                                    createMuzzleFlash(muzzlePos, t.color);
                                    
                                    const pMesh = new THREE.Mesh(_GEO.bullet_lg, getBulletMat(t.color));
                                    pMesh.position.copy(muzzlePos);
                                    scene.add(pMesh);
                                    
                                    // Add to local array so client animate() moves it
                                    projectiles.push({ 
                                        mesh: pMesh, 
                                        target: target, 
                                        dmg: 0, splash: t.splash, slow: 0, color: t.color 
                                    });
                                }
                            }
                        }
                        
                        // B. DAMAGE TEXT
                        else if(data.effect === 'dmg_text') {
                            const color = data.crit ? "#e74c3c" : "#fff";
                            const randPos = new THREE.Vector3((Math.random()-0.5)*2, 2, (Math.random()-0.5)*2);
                            createFloatingText("-" + data.val, new THREE.Vector3(data.x, 0, data.z).add(randPos), color);
                        }

                        // C. FARM TEXT
                        else if(data.effect === 'farm_text') {
                            createFloatingText("+$"+data.value, new THREE.Vector3(data.x, 6, data.z), "#2ecc71");
                            AudioSys.shoot('farm');
                        }

                        // D. HEAL EFFECT
                        else if(data.effect === 'heal_area') {
                            createParticles(new THREE.Vector3(data.x, 2, data.z), 10, 0x00ff00);
                        }

                        // E. TESLA CHAIN
                        else if(data.effect === 'tesla_chain') {
                            const points = data.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
                            for(let i=0; i<points.length-1; i++) {
                                const geo = new THREE.BufferGeometry().setFromPoints([points[i], points[i+1]]);
                                const bolt = new THREE.Line(geo, _MAT.tesla);
                                scene.add(bolt); 
                                setTimeout(() => scene.remove(bolt), 80);
                            }
                            AudioSys.shoot('tesla');
                        }

                        // F. SHATTER
                        else if(data.effect === 'shatter') {
                            createShatter(new THREE.Vector3(data.x, 0, data.z), data.color, data.count);
                            AudioSys.tone(100, 'sawtooth', 0.1, 0.1);
                        }
                    }

                    // --- 5. BUILD ---
                    else if (data.type === 'build') {
                        const tData = TOWERS[data.key];
                        const cost = Math.floor(tData.cost * GAME_CONFIG.costMult);
                        
                        // FIX: Check farm limit in separate mode (prevent joiners from spamming farms)
                        if(data.key === 'farm' && currentGamemode === 'separate') {
                            const MAX_FARMS = 5;
                            const builderFarmCount = towers.filter(t => 
                                t.type === 'farm' && t.ownerIndex === data.pIndex
                            ).length;
                            
                            if(builderFarmCount >= MAX_FARMS) {
                                console.log(`Player ${data.pIndex} tried to exceed farm limit`);
                                return; // Ignore this build
                            }
                        }

                        // HOST LOGIC: Sync wallets for late joiners
                        if (myRole === 'host') {
                            if (currentGamemode === 'shared') {
                                if (data.pIndex !== myPlayerIndex) gold -= cost;
                            } else {
                                if (data.pIndex !== undefined && data.pIndex !== myPlayerIndex) {
                                    playerWallets[data.pIndex] -= cost;
                                }
                            }
                        }

    const mesh = createTowerModel(data.key, 1);
    // Apply remote player's skin (they may have a different skin than us)
    if (data.skin && data.skin !== 'default' && data.pIndex !== myPlayerIndex) {
        window._applyRemoteSkin(mesh, data.key, data.skin);
    }
    mesh.position.set(data.x, 0, data.z);
    scene.add(mesh);

    const newTower = {
        mesh,
        ...JSON.parse(JSON.stringify(tData)),
        type: data.key,
        level: 1,
        cooldown: 0,
        destroys: 0,
        ownerIndex: data.pIndex,
        skin: data.skin || 'default'
    };

    // Apply combat skill multipliers at placement (singleplayer only)
    if (typeof window.getSkillMultipliers === 'function') {
        const mults = window.getSkillMultipliers();
        if (mults.damage && mults.damage !== 1.0) newTower.dmg   *= mults.damage;
        if (mults.range !== 1.0)       newTower.range  *= mults.range;
        if (mults.attackSpeed !== 1.0) newTower.rate   *= (1 / mults.attackSpeed); // higher attackSpeed = lower cooldown
    }

    towers.push(newTower);
    
    // Track tower for challenges
    if (typeof window.trackTowerBuilt === 'function') {
        window.trackTowerBuilt();
    }
    
    updateUI();
}

                    // --- 6. SPAWN ENEMY ---
                    else if(data.type === 'spawn') {
                        spawnEnemy(data.typeKey, data.enemyId);
                    } 

                    // --- 7. UPGRADE ---
                    else if(data.type === 'upgrade') {
                        const t = towers.find(tow => Math.abs(tow.mesh.position.x - data.x) < 0.1 && Math.abs(tow.mesh.position.z - data.z) < 0.1);
                        if(t) {
                            let cost = 0;
                            if(t.level === 4 && data.branch) {
                                cost = Math.floor(TOWER_UPGRADES[t.type][data.branch].cost * GAME_CONFIG.costMult);
                            } else {
                                cost = Math.floor((t.cost * GAME_CONFIG.costMult) * (t.level + 0.5));
                            }

                            // HOST LOGIC
                            if(myRole === 'host') {
                                if(currentGamemode === 'shared') {
                                    if(data.playerRole !== 'host') gold -= cost; // Only deduct if joiner did it
                                } else {
                                    // Separate: Update the upgrader's wallet
                                    // FIX: Don't deduct from myself twice
                                    const pIdx = (data.pIndex !== undefined) ? data.pIndex : t.ownerIndex;
                                    if(pIdx !== undefined && pIdx !== myPlayerIndex) {
                                        playerWallets[pIdx] -= cost;
                                    }
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
                            
                            // ✅ CRITICAL: Track upgrade for achievements
                            if (typeof window.trackUpgrade === 'function') {
                                window.trackUpgrade();
                            }
                            
                            // ... (Rest of the upgrade logic stays the same from here down) ...
                            if(t.level === 5 && data.branch) {
                                t.branch = data.branch;
                                if(TOWER_UPGRADES[t.type] && TOWER_UPGRADES[t.type][data.branch]) {
                                    const stats = TOWER_UPGRADES[t.type][data.branch];
                                    t.dmg *= stats.dmgMult || 1;
                                    t.range *= stats.rangeMult || 1;
                                    t.rate *= stats.rateMult || 1;
                                    t.color = stats.color;
                                    if(stats.splash) t.splash = stats.splash;
                                    if(stats.special) t.special = stats.special;
                                    if(t.type === 'tesla' && stats.chainAdd) t.chain += stats.chainAdd;
                                    if(t.type === 'tesla' && stats.chainSet) t.chain = stats.chainSet;
                                    if(t.type === 'ice' && stats.slowAdd) t.slow += stats.slowAdd;
                                    if(t.type === 'farm' && stats.incomeAdd) t.income += stats.incomeAdd;
                                }
                            } else {
                                t.dmg *= 1.5; t.range *= 1.1; t.rate *= 0.9;
                                if(t.type === 'ice') { t.slow += 0.1; t.stunChance += 0.05; t.stunDur += 0.2; }
                                if(t.type === 'farm') { t.income += 30; }
                                if(t.type === 'tesla' && t.level % 2 === 0) { t.chain += 1; }
                            }

                            const oldPos = t.mesh.position.clone();
                            const oldRot = t.mesh.children[1].rotation.clone();
                            scene.remove(t.mesh);
                            
                            t.mesh = createTowerModel(t.type, t.level, t.branch);
                            // Re-apply skin after model rebuild — always use _applyRemoteSkin
                            // so the result is identical regardless of who owns the tower.
                            // For the local player, getActiveSkin inside createTowerModel
                            // already sets mainColor, but _applyRemoteSkin is idempotent
                            // and ensures every material is consistently updated.
                            if (t.skin && t.skin !== 'default' && typeof window._applyRemoteSkin === 'function') {
                                window._applyRemoteSkin(t.mesh, t.type, t.skin);
                            }
                            
                            t.mesh.position.copy(oldPos);
                            t.mesh.children[1].rotation.copy(oldRot);
                            scene.add(t.mesh);
                            updateUI();
                        }
                    }

                    // --- NEW: 9. WALLET UPDATE (Real-time Money Sync) ---
                    else if(data.type === 'wallet_update') {
                        if(data.mode === 'shared') {
                            gold = data.gold;
                        } else {
                            playerWallets = data.wallets;
                            gold = playerWallets[myPlayerIndex];
                        }
                        updateUI();
                    }

                    // --- 8. SELL ---
                    else if(data.type === 'sell') {
                        const t = towers.find(tow => Math.abs(tow.mesh.position.x - data.x) < 0.1 && Math.abs(tow.mesh.position.z - data.z) < 0.1);
                        if(t) {
                            if(myRole === 'host') {
                                const sellMult = (typeof window.getSkillMultipliers === 'function') ? (0.6 + window.getSkillMultipliers().sellValue * 0.1) : 0.6;
                                const refund = Math.floor((t.cost * GAME_CONFIG.costMult * t.level) * sellMult);
                                if(currentGamemode === 'shared') gold += refund;
                                else {
                                    // Refund to Owner
                                    if(t.ownerIndex !== undefined) playerWallets[t.ownerIndex] += refund;
                                }
                            }
                            createParticles(t.mesh.position, 10, 0xcccccc); 
                            scene.remove(t.mesh);
                            towers = towers.filter(x => x !== t);
                            updateUI();
                        }
                    }
                });
		socket.on('gameStart', (config) => {
                    hideAllScreens();
                    hideInviteButton();

                    // Remove room from server list + stop keep-alive
                    if (myRole === 'host') {
                        if (typeof window._mpAnnounce === 'function') window._mpAnnounce('playing');
                        if (_lobbyKeepAlive) { clearInterval(_lobbyKeepAlive); _lobbyKeepAlive = null; }
                    }
                    
                    selectedMapIndex = config.mapIndex;
                    mapSeed = config.seed; 
                    currentGamemode = config.mode;

		    // --- NEW: Set Info Panel Text (MP) ---
            	    document.getElementById('info-map-name').innerText = MAPS[selectedMapIndex].name;
            	    document.getElementById('info-diff').innerText = config.diff.toUpperCase();
            
            	    const diffColor = (config.diff==='easy'?'#2ecc71':(config.diff==='medium'?'#f1c40f':'#e74c3c'));
            	    document.getElementById('info-diff').style.color = diffColor;
            
            	    document.getElementById('info-mode').innerText = (config.mode === 'shared' ? "SHARED" : "SEPARATE");
            	    // -------------------------------------

                    // Apply same difficulty config here as single-player (original values)
                    if(config.diff === 'easy') { GAME_CONFIG = { maxWaves:20, hpMult:0.7, costMult:0.85, gold:800 }; }
                    else if(config.diff === 'medium') { GAME_CONFIG = { maxWaves:40, hpMult:0.9, costMult:1.0, gold:650 }; }
                    else { GAME_CONFIG = { maxWaves:60, hpMult:1.1, costMult:1.2, gold:500 }; }

                    document.getElementById('ui-max-wave').innerText = GAME_CONFIG.maxWaves;
                    resetGame(); 
                    
                    gold = GAME_CONFIG.gold;
                    goldHost = gold;
                    goldJoiner = gold; 

                    loadMap(selectedMapIndex); 
                    AudioSys.playMusic(MAPS[selectedMapIndex].track);
                    camera.position.set(0, 110, 50);
                    camera.lookAt(0, 0, 0);
                    
                    if(myRole !== 'host') {
                        const btn = document.getElementById('btn-start-wave');
                        btn.disabled = true; 
                        btn.innerText = "WAITING FOR HOST"; 
                        btn.style.backgroundColor = "#333";
                    }

                    // Populate tower grid with new UI
                    populateTowerGrid();

                    setGameUIVisible(true); 
                    gameRunning = true; 
                    isPaused = false;

                    // Re-share our level so all players display correctly in-game
                    if (socket && myRoomId && window.playerLevel) {
                        playerLevels[socket.id] = window.playerLevel;
                        window.playerLevels = playerLevels;
                        socket.emit('gameAction', {
                            type: 'share_level',
                            roomId: myRoomId,
                            playerId: socket.id,
                            level: window.playerLevel
                        });
                    }

                    updateUI();
                    
                    // Show performance stats in multiplayer
                    showPerformanceStats();
                });
            }
        



function updateLobbyServerInfo() {
    const infoEl = document.getElementById('server-connection-info');
    if (!infoEl || !connectedServerInfo) return;
    
    infoEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
            <div class="server-status-dot-connected"></div>
            <div>
                <div style="font-size: 14px; color: #00ff88; font-weight: bold;">
                    Connected: ${connectedServerInfo.region} #${connectedServerInfo.serverNumber}
                </div>
                <div style="font-size: 12px; color: #aaa;">
                    Latency: ${connectedServerInfo.ping}ms
                </div>
            </div>
        </div>
    `;
}

	function showToast(message, type = 'info', duration = 3000) {
    let toast = document.getElementById('connection-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'connection-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            animation: slideDown 0.3s ease;
            max-width: 500px;
            text-align: center;
        `;
        document.body.appendChild(toast);
    }
    
    const colors = {
        info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        error: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
    };
    
    toast.innerHTML = message;
    toast.style.background = colors[type] || colors.info;
    toast.style.color = 'white';
    toast.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }
}

	function initSocket() {
    if (!socket) {
        if (typeof io === 'undefined') {
            console.error('Socket.IO library not loaded.');
            if (typeof kAlert === 'function') kAlert('MULTIPLAYER UNAVAILABLE', 'Please reload the page to enable multiplayer.', { icon: '<i class="fa-solid fa-wifi-slash"></i>', danger: true });
            else alert('Multiplayer features unavailable. Please reload the page.');
            return;
        }
        
        if (!selectedRegion) {
            showToast('<i class="fa-solid fa-triangle-exclamation"></i> Please select a region first!', 'warning');
            return;
        }
        
        connectToServerWithFailover();
    }
}

        // --- MP UI Functions ---
        function showMpName() {
            hideAllScreens();
            const autoName = (typeof KarloAuth !== 'undefined') ? KarloAuth.getUsername() : null;
            const inp = document.getElementById('player-name-input');
            if (inp && autoName) inp.value = autoName;
            // Notice is now an inline panel in the mp-menu — go straight to menu
            enterMpMenu();
        }
        
        function enterMpMenu() {
            let name = '';
            if (typeof KarloAuth !== 'undefined') name = KarloAuth.getUsername();
            if (!name) name = 'Guest' + Math.floor(100000 + Math.random() * 900000);
            const inp = document.getElementById('player-name-input');
            if (inp) inp.value = name;

            hideAllScreens();
            document.getElementById('mp-menu').style.display = 'flex';

            // Measure pings in background but don't auto-connect — show rooms first
            measureAllRegions().then(() => refreshServerBrowser());
        }

        // Temporary socket to fetch rooms from one region's server, then close
        function _fetchRoomsFromRegion(regionDef) {
            return new Promise(resolve => {
                const url = regionDef.servers[0];
                let done = false;
                let tempSock;
                const finish = (rooms) => {
                    if (done) return;
                    done = true;
                    try { tempSock && tempSock.disconnect(); } catch(e) {}
                    (rooms || []).forEach(r => {
                        r.region      = r.region      || regionDef.region;
                        r.regionGroup = r.regionGroup || regionDef.group;
                    });
                    resolve(rooms || []);
                };
                const timer = setTimeout(() => finish([]), 6000);
                try {
                    tempSock = io(url, { transports: ['websocket'], timeout: 5000, reconnection: false });
                    tempSock.on('connect',       () => tempSock.emit('getRooms'));
                    tempSock.on('rooms',         rooms => { clearTimeout(timer); finish(rooms); });
                    tempSock.on('publicRooms',   rooms => { clearTimeout(timer); finish(rooms); });
                    tempSock.on('connect_error', ()    => { clearTimeout(timer); finish([]); });
                } catch(e) { clearTimeout(timer); finish([]); }
            });
        }

        async function _mpBackgroundConnect() {
            await measureAllRegions();
            if (!socket || !socket.connected) await connectToServerWithFailover();
        }

	function proceedToMultiplayer() {
    if (pingLoop) clearInterval(pingLoop);
    if (!socket || !socket.connected) {
        connectToServerWithFailover();
    }
}

        // ══════════════════════════════════════════════════════════════════════
        //  MULTIPLAYER LOBBY SYSTEM
        //  The game server only supports: createRoom(name), joinRoom({roomId,playerName})
        //  The room list is powered by server-side announceRoom / getRooms events
        //  which you need to add to your Node.js server (see server-patch.js).
        // ══════════════════════════════════════════════════════════════════════

        let lobbyIsPublic = true;
        let _lobbyMaxPlayers = 3;
        let _pendingLobbyName = ''; // lobby display name, separate from player name
        let _lobbyRegion = 'auto';
        let _clpAutoName = true;
        let _lobbyKeepAlive  = null;
        let _browserTimer    = null;
        let _pendingPrivateId = null;
        let _currentRegionTab = 'all';

        // ── Region filter tab ─────────────────────────────────────────────────
        function setMpRegionTab(tab) {
            _currentRegionTab = tab;
            document.querySelectorAll('.mp-rtab').forEach(b => b.classList.remove('mp-rtab-active'));
            const btn = document.querySelector(`.mp-rtab[data-region="${tab}"]`);
            if (btn) btn.classList.add('mp-rtab-active');
            const labels = { all:'ALL REGIONS', us:'UNITED STATES', eu:'EUROPE', asia:'ASIA PACIFIC' };
            const lbl = document.getElementById('mp-region-label');
            if (lbl) lbl.textContent = labels[tab] || 'ALL REGIONS';
            refreshServerBrowser();
        }

        // ── Create Lobby Panel controls ───────────────────────────────────────
        function openCreateLobbyPanel() {
            // Pre-fill lobby name from username
            const inp = document.getElementById('clp-name');
            if (inp && _clpAutoName) {
                const uname = (typeof KarloAuth !== 'undefined' ? KarloAuth.getUsername() : '') || 'Guest';
                inp.value = uname + "'s Lobby";
            }
            // Show sleep note if servers might be sleeping (no active rooms)
            const list = document.getElementById('server-browser-list');
            const hasBrowserRooms = list && !list.querySelector('.sb-empty');
            const note = document.getElementById('clp-sleep-note');
            if (note) note.style.display = hasBrowserRooms ? 'none' : 'block';
            document.getElementById('create-lobby-panel').style.display = 'flex';
        }
        function closeCreateLobbyPanel() {
            document.getElementById('create-lobby-panel').style.display = 'none';
            const msg = document.getElementById('clp-msg');
            if (msg) msg.textContent = '';
        }
        function clpSetVis(v) {
            lobbyIsPublic = v === 'public';
            document.getElementById('clp-vis-pub').classList.toggle('active', lobbyIsPublic);
            document.getElementById('clp-vis-priv').classList.toggle('active', !lobbyIsPublic);
        }
        function clpSetMax(n) {
            _lobbyMaxPlayers = n;
            [2,3,4].forEach(x => {
                const b = document.getElementById('clp-p' + x);
                if (b) b.classList.toggle('active', x === n);
            });
        }
        function clpSetRegion(r) {
            _lobbyRegion = r;
            // Clear all top-level region buttons
            ['clp-r-auto','clp-r-us','clp-r-eu','clp-r-asia'].forEach(id => {
                const b = document.getElementById(id);
                if (b) b.classList.remove('active');
            });
            // Clear US sub-region buttons
            ['clp-r-us-west','clp-r-us-east-1','clp-r-us-east-2'].forEach(id => {
                const b = document.getElementById(id);
                if (b) b.classList.remove('active');
            });
            // Highlight correct button
            if (r === 'auto') {
                document.getElementById('clp-r-auto')?.classList.add('active');
            } else if (r === 'eu-central') {
                document.getElementById('clp-r-eu')?.classList.add('active');
            } else if (r === 'asia-southeast') {
                document.getElementById('clp-r-asia')?.classList.add('active');
            } else if (['us-west','us-east-1','us-east-2'].includes(r)) {
                document.getElementById('clp-r-us')?.classList.add('active');
                document.getElementById('clp-r-' + r)?.classList.add('active');
                // Make sure sub-panel is visible
                const sub = document.getElementById('clp-us-sub');
                if (sub) sub.style.display = 'flex';
            }
        }
        function clpToggleUS() {
            const sub = document.getElementById('clp-us-sub');
            const chev = document.getElementById('clp-us-chevron');
            if (!sub) return;
            const open = sub.style.display === 'flex';
            sub.style.display = open ? 'none' : 'flex';
            if (chev) chev.style.transform = open ? '' : 'rotate(180deg)';
            // If currently no US region selected, default to auto
            if (!open && !['us-west','us-east-1','us-east-2'].includes(_lobbyRegion)) {
                // Don't auto-select - let user pick
            }
        }
        async function clpCreate() {
            const nameEl = document.getElementById('clp-name');
            const msgEl  = document.getElementById('clp-msg');
            const lobbyName = (nameEl?.value || '').trim();
            if (!lobbyName) { if (msgEl) msgEl.textContent = 'Enter a lobby name.'; return; }

            const btn = document.getElementById('clp-create-btn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CREATING...'; }
            if (msgEl) msgEl.textContent = '';

            // If not connected yet, connect first (may wake server)
            if (!socket || !socket.connected) {
                if (_lobbyRegion !== 'auto') {
                    selectedRegion = SERVER_REGIONS.find(r => r.code === _lobbyRegion);
                }
                const ok = await connectToServerWithFailover();
                if (!ok) {
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> CREATE'; }
                    if (msgEl) msgEl.textContent = 'Could not reach server. Try again.';
                    return;
                }
            }

            closeCreateLobbyPanel();
            // Player's display name (used in-game) — NOT the lobby name
            const playerName = (typeof KarloAuth !== 'undefined' ? KarloAuth.getUsername() : '')
                               || ('Guest' + Math.floor(100000 + Math.random() * 900000));
            document.getElementById('player-name-input').value = playerName;
            // Store lobby name separately so announceRoom can use it
            _pendingLobbyName = lobbyName;
            // Pass playerName to createRoom so in-game display name is correct
            socket.emit('createRoom', playerName);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> CREATE'; }
        }

        // ── Host a room (legacy entry point) ──────────────────────────────────
        function hostGame() {
            openCreateLobbyPanel();
        }

        // ── Visibility toggle (legacy) ────────────────────────────────────────
        function setLobbyVisibility(vis) { clpSetVis(vis); }

        // ── Join by room code (from private popup) ────────────────────────────
        function joinGame() {
            const code = (document.getElementById('mp-code-popup-input')?.value || '').toUpperCase().trim();
            const msg  = document.getElementById('mp-code-popup-msg');
            if (code.length < 4) { if (msg) msg.textContent = 'Enter the full room code.'; return; }
            _doJoin(code);
            closeMpCodePopup();
        }

        function showJoinInput() { /* removed — use server browser */ }

        // ── Internal join helper ──────────────────────────────────────────────
        async function _doJoin(roomId, regionHint, lobbyName) {
            const name = (typeof KarloAuth !== 'undefined' ? KarloAuth.getUsername() : '')
                         || ('Guest' + Math.floor(100000 + Math.random() * 900000));
            document.getElementById('player-name-input').value = name;
            // Store lobby name so updateLobbyUI can display it
            if (lobbyName) window._lastLobbyName = lobbyName;

            if (!socket || !socket.connected) {
                if (regionHint) {
                    const match = SERVER_REGIONS.find(r =>
                        regionHint.includes(r.group) || regionHint.includes(r.code || '') ||
                        regionHint.includes((r.region || '').toLowerCase())
                    );
                    if (match) selectedRegion = match;
                }
                await measureAllRegions();
                const ok = await connectToServerWithFailover();
                if (!ok) { showToast('Could not reach server. Try again.', 'error'); return; }
            }

            socket.emit('joinRoom', { roomId, playerName: name });
            myRoomId = roomId;
            myRole   = 'joiner';
            if (typeof _saveRoomState === 'function') _saveRoomState();
        }

        // ── Server browser ────────────────────────────────────────────────────
        async function refreshServerBrowser() {
            const list = document.getElementById('server-browser-list');
            if (!list) return;
            if (_browserTimer) { clearInterval(_browserTimer); _browserTimer = null; }

            list.innerHTML = '<div class="sb-empty"><i class="fa-solid fa-arrows-rotate fa-spin"></i> Scanning regions...</div>';

            const rooms = await _queryRoomsForTab(_currentRegionTab);
            _renderRoomList(rooms);

            _browserTimer = setInterval(async () => {
                const menu = document.getElementById('mp-menu');
                if (menu && menu.style.display !== 'none') {
                    _renderRoomList(await _queryRoomsForTab(_currentRegionTab));
                } else {
                    clearInterval(_browserTimer);
                }
            }, 3000);
        }

        async function _queryRoomsForTab(tab) {
            if (tab === 'all') {
                const reps = SERVER_REGIONS.filter((r, i, arr) =>
                    arr.findIndex(x => x.group === r.group) === i
                );
                const results = await Promise.all(reps.map(r => _fetchRoomsFromRegion(r)));
                return results.flat();
            }
            const groupMap = { us:'us', eu:'eu', asia:'asia' };
            const regionDef = SERVER_REGIONS.find(r => r.group === groupMap[tab]);
            return regionDef ? await _fetchRoomsFromRegion(regionDef) : [];
        }

        function _renderRoomList(rooms) {
            const list = document.getElementById('server-browser-list');
            if (!list) return;

            if (!rooms || rooms.length === 0) {
                const tabName = {all:'any region', us:'US servers', eu:'EU servers', asia:'Asia servers'}[_currentRegionTab] || 'this region';
                list.innerHTML = `<div class="sb-empty">No lobbies in ${tabName} — be the first to host!</div>`;
                return;
            }

            list.innerHTML = rooms.map(r => {
                // Decode maxPlayers from status string (e.g. "waiting|3" → maxPl=3, status="waiting")
                // This is needed because some servers don't return maxPlayers in getRooms
                let rawStatus = r.status || 'waiting';
                let maxPl = r.maxPlayers || 2;
                if (rawStatus.includes('|')) {
                    const parts = rawStatus.split('|');
                    rawStatus = parts[0];
                    const parsed = parseInt(parts[1]);
                    if (!isNaN(parsed) && parsed >= 2) maxPl = parsed;
                }
                const full    = r.playerCount >= maxPl;
                const playing = rawStatus === 'playing';
                const priv    = r.isPrivate;
                const rg = (r.regionGroup || r.region || '').toLowerCase();

                // Region badge — FA icons only
                let regionLabel = '', regionColor = 'rgba(255,255,255,0.4)', regionBorder = 'rgba(255,255,255,0.12)';
                if (rg.includes('eu') || rg.includes('frankfurt')) {
                    regionLabel = '<i class="fa-solid fa-globe"></i> EU';
                    regionColor = 'rgba(52,152,219,0.85)'; regionBorder = 'rgba(52,152,219,0.3)';
                } else if (rg.includes('asia') || rg.includes('singapore')) {
                    regionLabel = '<i class="fa-solid fa-globe"></i> ASIA';
                    regionColor = 'rgba(155,89,182,0.85)'; regionBorder = 'rgba(155,89,182,0.3)';
                } else if (rg.includes('us') || rg.includes('west') || rg.includes('east') || rg.includes('oregon') || rg.includes('virginia') || rg.includes('ohio')) {
                    regionLabel = '<i class="fa-solid fa-flag"></i> US';
                    regionColor = 'rgba(230,126,34,0.85)'; regionBorder = 'rgba(230,126,34,0.3)';
                }
                const regionBadge = regionLabel
                    ? `<span class="sb-badge" style="color:${regionColor};border-color:${regionBorder};">${regionLabel}</span>`
                    : '';

                let statusBadge = '', btn = '';
                if (playing) {
                    statusBadge = '<span class="sb-badge sb-badge-red">IN GAME</span>';
                    btn = '<button class="sb-btn" disabled>IN GAME</button>';
                } else if (full) {
                    statusBadge = '<span class="sb-badge sb-badge-red">FULL</span>';
                    btn = '<button class="sb-btn" disabled>FULL</button>';
                } else if (priv) {
                    statusBadge = '<span class="sb-badge sb-badge-yellow"><i class="fa-solid fa-lock"></i> PRIVATE</span>';
                    btn = `<button class="sb-btn sb-btn-yellow" onclick="openPrivateLobby('${r.roomId}','${(r.hostName||'').replace(/'/g,'')}')">CODE</button>`;
                } else {
                    btn = `<button class="sb-btn sb-btn-green" onclick="_doJoin('${r.roomId}','${rg}','${(r.hostName||'').replace(/'/g,'')}')">JOIN</button>`;
                }

                // Player count bar
                const pct = Math.min(100, Math.round((r.playerCount / maxPl) * 100));
                const barColor = full ? '#e74c3c' : playing ? '#e67e22' : '#2ecc71';

                return `<div class="sb-card">
                    <div class="sb-card-left">
                        <div class="sb-name">${r.hostName || 'Lobby'}&nbsp;${statusBadge}&nbsp;${regionBadge}</div>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:5px;">
                            <span style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px;white-space:nowrap;"><i class="fa-solid fa-users" style="margin-right:3px;"></i>PLAYERS</span>
                            <div style="flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:${barColor};border-radius:2px;transition:width 0.3s;"></div>
                            </div>
                            <span class="sb-players">${r.playerCount}/${maxPl}</span>
                        </div>
                    </div>
                    <div class="sb-card-right">
                        ${btn}
                    </div>
                </div>`;
            }).join('');
        }


        // ── Private room code popup ───────────────────────────────────────────
        function openPrivateLobby(roomId, hostName) {
            _pendingPrivateId = roomId;
            const popup = document.getElementById('mp-code-popup');
            const host  = document.getElementById('mp-code-popup-host');
            const inp   = document.getElementById('mp-code-popup-input');
            const msg   = document.getElementById('mp-code-popup-msg');
            if (host) host.textContent = 'Hosted by ' + (hostName || 'someone');
            if (inp)  { inp.value = ''; setTimeout(() => inp.focus(), 80); }
            if (msg)  msg.textContent = '';
            if (popup) popup.style.display = 'flex';
        }
        function closeMpCodePopup() {
            const p = document.getElementById('mp-code-popup');
            if (p) p.style.display = 'none';
            _pendingPrivateId = null;
        }

        function leaveLobby() {
            if (_lobbyKeepAlive) clearInterval(_lobbyKeepAlive);
            if (_browserTimer)  clearInterval(_browserTimer);
            // Tell the server we're leaving NOW so other players see us removed immediately
            // (instead of waiting for socket timeout)
            if (socket && socket.connected && myRoomId) {
                socket.emit('leaveRoom', { roomId: myRoomId });
                socket.disconnect();
            }
            location.reload();
        }

        // ── Ready System ─────────────────────────────────────────────────────
        let _readyPlayers = new Set(); // socket IDs of players who pressed ready

        function toggleReady() {
            if (!socket || !myRoomId) return;
            const myId = socket.id;
            if (_readyPlayers.has(myId)) {
                _readyPlayers.delete(myId);
            } else {
                _readyPlayers.add(myId);
            }
            // Broadcast to all players in room
            socket.emit('gameAction', {
                type: 'player_ready',
                roomId: myRoomId,
                playerId: myId,
                ready: _readyPlayers.has(myId)
            });
            updateLobbyUI(allPlayers);
        }

        function updateLobbyUI(players) {
    allPlayers = players;
    myPlayerIndex = allPlayers.findIndex(p => p.id === socket.id);
    if (myPlayerIndex === -1) myPlayerIndex = 0;

    // Host is always considered ready
    const hostPlayer = allPlayers.find(p => p.role === 'host');
    if (hostPlayer) _readyPlayers.add(hostPlayer.id);

    hideAllScreens();
    checkMultiplayerStats();
    document.getElementById('lobby-screen').style.display = 'flex';

    // ── Room name ─────────────────────────────────────────────────────────
    const nameEl = document.getElementById('lobby-room-name');
    if (nameEl) {
        nameEl.textContent = window._lastLobbyName || '';
    }

    // ── Room code / visibility header ─────────────────────────────────────
    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) {
        if (lobbyIsPublic) {
            codeEl.innerHTML = `<span style="font-size:13px;opacity:.5;letter-spacing:3px;"><i class="fa-solid fa-globe"></i> PUBLIC LOBBY</span>`;
        } else {
            codeEl.innerHTML = `
                <span style="font-size:11px;opacity:.4;letter-spacing:3px;"><i class="fa-solid fa-lock"></i> PRIVATE — SHARE CODE</span><br>
                <span style="font-size:36px;letter-spacing:10px;font-weight:900;color:#3498db;">${myRoomId}</span>`;
        }
    }

    showInviteButton();

    // ── Player slots ──────────────────────────────────────────────────────
    const list = document.getElementById('lobby-player-list');
    const slots = [];

    for (let i = 0; i < _lobbyMaxPlayers; i++) {
        const p = players[i];
        if (p) {
            let level;
            if (i === myPlayerIndex && window.playerLevel) {
                level = window.playerLevel;
            } else if (playerLevels[p.id]) {
                level = playerLevels[p.id];
            } else {
                level = '?';
            }
            const isHost = p.role === 'host';
            const isReady = isHost || _readyPlayers.has(p.id);
            const color  = PLAYER_COLORS[i];
            const readyColor = isReady ? '#2ecc71' : '#e67e22';
            const readyBg    = isReady ? 'rgba(46,204,113,0.15)' : 'rgba(230,126,34,0.15)';
            const readyIcon  = isReady ? 'fa-circle-check' : 'fa-circle-xmark';
            const readyText  = isReady ? 'READY' : 'NOT READY';
            slots.push(`
                <div class="lobby-slot lobby-slot-filled" style="border-color:${color}22;background:linear-gradient(135deg,${color}12,${color}06);">
                    <div class="lobby-slot-index" style="color:${color};">P${i+1}</div>
                    <div class="lobby-slot-info">
                        <div class="lobby-slot-name" style="color:${color};">
                            ${p.name}
                            ${isHost ? `<span class="lobby-host-crown"><i class="fa-solid fa-crown"></i> HOST</span>` : ''}
                        </div>
                        <div class="lobby-slot-level"><i class="fa-solid fa-star"></i> LVL ${level}</div>
                    </div>
                    <div class="lobby-slot-status" style="background:${readyBg};color:${readyColor};border-color:${readyColor}33;">
                        <i class="fa-solid ${readyIcon}" style="font-size:8px;"></i> ${readyText}
                    </div>
                </div>`);
        } else {
            slots.push(`
                <div class="lobby-slot lobby-slot-empty">
                    <div class="lobby-slot-index" style="color:rgba(255,255,255,0.15);">P${i+1}</div>
                    <div class="lobby-slot-info">
                        <div style="font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:3px;">WAITING...</div>
                    </div>
                    <div class="lobby-slot-status" style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.2);">
                        <i class="fa-solid fa-ellipsis"></i>
                    </div>
                </div>`);
        }
    }

    list.innerHTML = slots.join('');

    // ── Start / wait controls ─────────────────────────────────────────────
    const enough    = players.length >= 2;
    // Everyone except host must be ready
    const nonHosts  = players.filter(p => p.role !== 'host');
    const allReady  = nonHosts.length > 0 && nonHosts.every(p => _readyPlayers.has(p.id));
    const canStart  = enough && allReady;

    const startBtn   = document.getElementById('lobby-start-btn');
    const notEnough  = document.getElementById('lobby-not-enough');
    const readyBtn   = document.getElementById('lobby-ready-btn');

    if (myRole === 'host') {
        if (startBtn) {
            startBtn.style.display  = 'block';
            startBtn.disabled       = !canStart;
            startBtn.style.opacity  = canStart ? '1' : '0.4';
            startBtn.style.cursor   = canStart ? 'pointer' : 'not-allowed';
        }
        if (readyBtn) readyBtn.style.display = 'none';
        if (notEnough) {
            if (!enough) {
                notEnough.textContent = 'NEED AT LEAST 2 PLAYERS';
                notEnough.style.display = 'block';
            } else if (!allReady) {
                notEnough.textContent = 'WAITING FOR ALL PLAYERS TO READY UP';
                notEnough.style.display = 'block';
            } else {
                notEnough.style.display = 'none';
            }
        }
        document.getElementById('lobby-status').style.display = 'none';
    } else {
        if (startBtn)  startBtn.style.display  = 'none';
        if (notEnough) notEnough.style.display  = 'none';
        // Show ready button for non-hosts
        if (readyBtn) {
            readyBtn.style.display = 'block';
            const iAmReady = _readyPlayers.has(socket.id);
            readyBtn.innerHTML = iAmReady
                ? `<i class="fa-solid fa-circle-xmark"></i> UNREADY`
                : `<i class="fa-solid fa-circle-check"></i> READY UP`;
            readyBtn.style.background = iAmReady
                ? 'linear-gradient(135deg, #c0392b, #e74c3c)'
                : 'linear-gradient(135deg, #27ae60, #2ecc71)';
        }
        const st = document.getElementById('lobby-status');
        const iAmReady = _readyPlayers.has(socket.id);
        st.textContent = iAmReady ? 'Waiting for host to start...' : 'Press READY UP to confirm!';
        st.style.color = iAmReady ? 'rgba(255,255,255,0.3)' : '#e67e22';
        st.style.display = 'block';
    }
}

        function setGamemode(mode) {
    currentGamemode = mode;
    isMultiplayerMode = true; // Set multiplayer flag
    hideAllScreens();
    document.getElementById('level-select').style.display = 'flex';
    
    // Override Map Selection for Multiplayer
    window.selectMap = function(idx) {
        selectedMapIndex = idx;
        hideAllScreens();
        document.getElementById('diff-select').style.display = 'flex';
	balanceMapGrid();
        
        // Override Start Game for Multiplayer
        window.startGame = function(diff) {
            console.log("Requesting start:", diff); // Debug check
            if(!socket || !myRoomId) {
                if (typeof kAlert === 'function') kAlert('CONNECTION LOST', 'Lost connection to the server.', { icon: '<i class="fa-solid fa-plug-circle-xmark"></i>', danger: true });
                else alert("Connection lost!");
                return;
            }
            socket.emit('requestStart', { 
                roomId: myRoomId, 
                mapIndex: selectedMapIndex, 
                diff: diff,
                mode: currentGamemode 
            });
        }
    }
}

	function showLevelSelectMP() {
            hideAllScreens();
            document.getElementById('mode-select').style.display = 'flex';
        }

