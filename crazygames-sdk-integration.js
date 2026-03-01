// ============================================
// ADINPLAY SDK INTEGRATION
// Real ad network for HTML5 browser games
// https://www.adinplay.com
// ============================================
//
// SETUP REQUIRED:
// 1. Sign up at https://www.adinplay.com
// 2. Submit your game for review
// 3. Replace YOUR_GAME_KEY below with the key they give you
// 4. Add their script to your index.html <head>:
//    <script src="https://api.adinplay.com/libs/aiptag/pub/YOUR_PUB_ID/YOUR_GAME_KEY/api.min.js"></script>
//
// ============================================

const AIP_GAME_KEY = 'YOUR_GAME_KEY'; // ← Replace with your actual Adinplay game key

// ============================================
// AD STATE
// ============================================

let adIsPlaying = false;
let _rewardCallback = null;

// ============================================
// MIDGAME AD (Between waves — non-rewarded)
// ============================================

/**
 * Show a midgame/interstitial ad between waves.
 * Adinplay serves real CPM display/video ads here.
 */
function showMidgameAd() {
    if (adIsPlaying) return;

    if (typeof aiptag === 'undefined') {
        console.warn('[Ads] Adinplay SDK not loaded — skipping midgame ad');
        return;
    }

    adIsPlaying = true;
    isPaused = true;
    _muteAudio(true);

    aiptag.cmd.player.push(function () {
        aiptag.adplayer = new aiptag.AD_PLAYER({
            id: 'aip-container',
            game_width: window.innerWidth,
            game_height: window.innerHeight,
            autoplay: true,
            preroll: true,
            midroll: true,
            postroll: false,
            AIP_COMPLETE: function () { _onAdFinished(); },
            AIP_ERROR: function (e) {
                console.warn('[Ads] Midgame ad error/no fill:', e);
                _onAdFinished();
            }
        });
    });
}

// ============================================
// REWARDED AD (Revive, 2× Scraps, etc.)
// ============================================

/**
 * Show a rewarded ad. Calls onSuccess() only after the player watches it fully.
 * @param {Function} onSuccess - Reward callback
 */
function showRewardAd(onSuccess) {
    if (adIsPlaying) return;

    if (typeof aiptag === 'undefined') {
        console.warn('[Ads] Adinplay SDK not loaded — granting reward without ad');
        if (typeof onSuccess === 'function') onSuccess();
        return;
    }

    _rewardCallback = onSuccess;
    adIsPlaying = true;
    isPaused = true;
    _muteAudio(true);

    aiptag.cmd.player.push(function () {
        aiptag.adplayer = new aiptag.AD_PLAYER({
            id: 'aip-container',
            game_width: window.innerWidth,
            game_height: window.innerHeight,
            autoplay: true,
            preroll: false,
            midroll: false,
            postroll: false,
            rewarded: true,
            AIP_COMPLETE: function () {
                if (typeof _rewardCallback === 'function') {
                    _rewardCallback();
                    _rewardCallback = null;
                }
                _onAdFinished();
            },
            AIP_ERROR: function (e) {
                console.warn('[Ads] Rewarded ad error/no fill:', e);
                _rewardCallback = null;
                _onAdFinished();
                showLocalError('Ad failed to load. Try again later.', '#e67e22');
            }
        });
    });
}

// ============================================
// INTERNAL HELPERS
// ============================================

function _onAdFinished() {
    adIsPlaying = false;
    isPaused = false;
    _muteAudio(false);
}

function _muteAudio(mute) {
    if (typeof AudioSys !== 'undefined' && AudioSys.ctx) {
        try { mute ? AudioSys.ctx.suspend() : AudioSys.ctx.resume(); } catch (e) {}
    }
}

// ============================================
// WAVE HOOK
// ============================================

/**
 * Call from wave completion logic to trigger midgame ads every 5 waves.
 */
function onWaveComplete(waveNumber) {
    if (waveNumber % 5 === 0) {
        showMidgameAd();
    }
}

console.log('[Ads] Adinplay integration loaded. Add your script tag to index.html to activate.');
