// ============================================
// CRAZYGAMES SDK V2 INTEGRATION
// Complete implementation for Tower Defense Game
// ============================================

// Global SDK state tracking
let isCrazyGamesSDKReady = false;
let isGameplayActive = false;
let adIsPlaying = false;

// ============================================
// REQUIREMENT 1: SDK Installation
// Already in HTML: <script src="https://sdk.crazygames.com/crazygames-sdk-v2.js"></script>
// ============================================

// ============================================
// REQUIREMENT 2: Initialization & Loading Metrics
// ============================================

/**
 * Initialize CrazyGames SDK and report loading metrics
 * Call this immediately on window load
 */
function initCrazyGamesSDK() {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        console.warn('CrazyGames SDK not available - running in offline/testing mode');
        return;
    }

    try {
        // Start loading tracking immediately
        window.CrazyGames.SDK.game.loadingStart();
        console.log('✅ CrazyGames: Loading started');

        // Since there's no loading screen, mark loading as complete after 1 second
        setTimeout(() => {
            if (window.CrazyGames && window.CrazyGames.SDK) {
                window.CrazyGames.SDK.game.loadingStop();
                isCrazyGamesSDKReady = true;
                console.log('✅ CrazyGames: Loading complete (Time to Interactive reported)');
            }
        }, 1000);

    } catch (error) {
        console.error('CrazyGames SDK initialization error:', error);
    }
}

// Auto-initialize on window load
window.addEventListener('load', initCrazyGamesSDK);

// ============================================
// REQUIREMENT 3: Gameplay Tracking
// ============================================

/**
 * Call this when player clicks "Start Game" or enters Wave 1
 * Tracks "Average Playtime" metric for CrazyGames algorithm
 */
function startGameplayTracking() {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        console.log('CrazyGames SDK not available - skipping gameplay start');
        return;
    }

    if (isGameplayActive) {
        console.warn('Gameplay tracking already active');
        return;
    }

    try {
        window.CrazyGames.SDK.game.gameplayStart();
        isGameplayActive = true;
        console.log('✅ CrazyGames: Gameplay started');
    } catch (error) {
        console.error('Error starting gameplay tracking:', error);
    }
}

/**
 * Call this when:
 * - Player dies (Game Over)
 * - Player opens Pause Menu
 * - Player returns to Main Menu
 * - An ad is about to play
 */
function stopGameplayTracking() {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        console.log('CrazyGames SDK not available - skipping gameplay stop');
        return;
    }

    if (!isGameplayActive) {
        return; // Already stopped
    }

    try {
        window.CrazyGames.SDK.game.gameplayStop();
        isGameplayActive = false;
        console.log('✅ CrazyGames: Gameplay stopped');
    } catch (error) {
        console.error('Error stopping gameplay tracking:', error);
    }
}

// ============================================
// REQUIREMENT 4: Ad Implementation
// ============================================

/**
 * Show midgame ad (between waves)
 * This is a non-rewarded interstitial ad
 */
function showMidgameAd() {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        console.log('CrazyGames SDK not available - skipping midgame ad');
        return;
    }

    if (adIsPlaying) {
        console.warn('Ad already playing');
        return;
    }

    try {
        console.log('🎬 Requesting midgame ad...');

        window.CrazyGames.SDK.ad.requestAd('midgame', {
            adStarted: () => {
                console.log('✅ Midgame ad started');
                adIsPlaying = true;
                setGameFocus(false); // Pause game and mute audio
                stopGameplayTracking(); // Stop gameplay tracking during ad
            },
            adFinished: () => {
                console.log('✅ Midgame ad finished');
                adIsPlaying = false;
                setGameFocus(true); // Resume game and unmute audio
                // Note: Gameplay tracking should be restarted manually when appropriate
            },
            adError: (error) => {
                console.error('❌ Midgame ad error:', error);
                adIsPlaying = false;
                setGameFocus(true); // Resume game even on error
            }
        });
    } catch (error) {
        console.error('Error requesting midgame ad:', error);
        setGameFocus(true); // Ensure game resumes on error
    }
}

/**
 * Show rewarded ad (for Revive, +100 Gold, etc.)
 * @param {Function} onSuccess - Callback function to execute when ad is successfully watched
 */
function showRewardAd(onSuccess) {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        console.log('CrazyGames SDK not available - granting reward without ad');
        if (typeof onSuccess === 'function') {
            onSuccess();
        }
        return;
    }

    if (adIsPlaying) {
        console.warn('Ad already playing');
        return;
    }

    try {
        console.log('🎁 Requesting rewarded ad...');

        window.CrazyGames.SDK.ad.requestAd('rewarded', {
            adStarted: () => {
                console.log('✅ Rewarded ad started');
                adIsPlaying = true;
                setGameFocus(false); // Pause game and mute audio
                stopGameplayTracking(); // Stop gameplay tracking during ad
            },
            adFinished: () => {
                console.log('✅ Rewarded ad finished - granting reward');
                adIsPlaying = false;
                setGameFocus(true); // Resume game and unmute audio
                
                // Grant the reward
                if (typeof onSuccess === 'function') {
                    onSuccess();
                }
            },
            adError: (error) => {
                console.error('❌ Rewarded ad error:', error);
                adIsPlaying = false;
                setGameFocus(true); // Resume game even on error
                // Do NOT grant reward on error
                alert('Ad failed to load. Please try again.');
            }
        });
    } catch (error) {
        console.error('Error requesting rewarded ad:', error);
        setGameFocus(true); // Ensure game resumes on error
    }
}

// ============================================
// REQUIREMENT 5: Audio & Pause Handling
// ============================================

/**
 * Critical QA requirement: Manage game focus and audio
 * @param {boolean} hasFocus - true = game active, false = game paused
 */
function setGameFocus(hasFocus) {
    if (hasFocus) {
        // Resume game
        isPaused = false;
        
        // Resume audio if AudioSys exists
        if (typeof AudioSys !== 'undefined' && AudioSys.ctx) {
            try {
                AudioSys.ctx.resume();
                console.log('🔊 Audio resumed');
            } catch (error) {
                console.error('Error resuming audio:', error);
            }
        }
        
        console.log('▶️ Game focus restored');
    } else {
        // Pause game
        isPaused = true;
        
        // Suspend audio if AudioSys exists
        if (typeof AudioSys !== 'undefined' && AudioSys.ctx) {
            try {
                AudioSys.ctx.suspend();
                console.log('🔇 Audio suspended');
            } catch (error) {
                console.error('Error suspending audio:', error);
            }
        }
        
        console.log('⏸️ Game focus lost (paused)');
    }
}

// ============================================
// REQUIREMENT 6: "Happy Time" Algorithm Boost
// ============================================

/**
 * Call this when player wins a level or beats a Boss Wave
 * Signals positive engagement to CrazyGames algorithm
 */
function triggerHappyTime() {
    if (!window.CrazyGames || !window.CrazyGames.SDK) {
        console.log('CrazyGames SDK not available - skipping happy time');
        return;
    }

    try {
        window.CrazyGames.SDK.game.happytime();
        console.log('🎉 CrazyGames: Happy Time triggered!');
    } catch (error) {
        console.error('Error triggering happy time:', error);
    }
}

// ============================================
// REQUIREMENT 7: Environment Safety
// All functions already wrapped with SDK availability checks
// ============================================

// ============================================
// INTEGRATION HELPER FUNCTIONS
// ============================================

/**
 * Helper: Start game with proper tracking
 * Call this from your "Start Game" button
 */
function onStartGameClick() {
    startGameplayTracking();
    // Your existing start game logic here
}

/**
 * Helper: Handle Game Over
 * Call this when player dies
 */
function onGameOver() {
    stopGameplayTracking();
    // Your existing game over logic here
}

/**
 * Helper: Handle Pause Menu
 * Call this when pause menu opens
 */
function onPauseMenuOpen() {
    stopGameplayTracking();
    setGameFocus(false);
    // Your existing pause menu logic here
}

/**
 * Helper: Handle Pause Menu Close
 * Call this when pause menu closes
 */
function onPauseMenuClose() {
    startGameplayTracking();
    setGameFocus(true);
    // Your existing resume logic here
}

/**
 * Helper: Handle Return to Main Menu
 * Call this when player returns to main menu
 */
function onReturnToMainMenu() {
    stopGameplayTracking();
    // Your existing main menu logic here
}

/**
 * Helper: Handle Wave Complete (Boss Wave)
 * Call this when player beats a boss wave
 */
function onBossWaveComplete() {
    triggerHappyTime();
    // Your existing wave complete logic here
}

/**
 * Helper: Show ad between waves
 * Call this after wave X completes (e.g., every 5 waves)
 */
function onWaveComplete(waveNumber) {
    // Example: Show ad every 5 waves
    if (waveNumber % 5 === 0) {
        showMidgameAd();
    }
    // Your existing wave complete logic here
}

/**
 * Helper: Revive button with rewarded ad
 * Call this from your "Revive" button in game over screen
 */
function onReviveButtonClick() {
    showRewardAd(() => {
        // Grant revive
        console.log('Player revived!');
        // Your revive logic here:
        // - Restore player HP
        // - Reset wave or continue from checkpoint
        // - Resume gameplay tracking
        startGameplayTracking();
    });
}

/**
 * Helper: Bonus gold button with rewarded ad
 * Call this from your "+100 Gold" button
 */
function onBonusGoldButtonClick() {
    showRewardAd(() => {
        // Grant bonus gold
        console.log('Bonus gold granted!');
        // Your gold logic here:
        // gold += 100;
        // updateGoldUI();
    });
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
INTEGRATION CHECKLIST:

1. ✅ SDK is loaded in HTML <head>
   <script src="https://sdk.crazygames.com/crazygames-sdk-v2.js"></script>

2. ✅ Auto-initialization on window load (already done above)

3. Add gameplay tracking to your game flow:
   
   // When "Start Game" button is clicked:
   startGameplayTracking();
   
   // When player dies:
   stopGameplayTracking();
   
   // When pause menu opens:
   stopGameplayTracking();
   setGameFocus(false);
   
   // When pause menu closes:
   startGameplayTracking();
   setGameFocus(true);
   
   // When returning to main menu:
   stopGameplayTracking();

4. Add ad triggers:
   
   // Show midgame ad every 5 waves:
   if (currentWave % 5 === 0) {
       showMidgameAd();
   }
   
   // Revive button (in game over screen):
   <button onclick="onReviveButtonClick()">🔄 REVIVE (Watch Ad)</button>
   
   // Bonus gold button:
   <button onclick="onBonusGoldButtonClick()">💰 +100 Gold (Watch Ad)</button>

5. Add happy time triggers:
   
   // When boss wave is defeated:
   if (isBossWave && waveCleared) {
       triggerHappyTime();
   }
   
   // When player completes a difficult level:
   if (levelDifficulty === 'hard' && levelComplete) {
       triggerHappyTime();
   }

6. Ensure isPaused variable exists in your game loop:
   
   function gameLoop() {
       if (isPaused) return;
       // Your game logic...
   }

7. Test offline compatibility:
   
   - All functions check for SDK availability
   - Game will work on itch.io or localhost without errors
   - Console will show warnings instead of crashes

*/

console.log('✅ CrazyGames SDK v2 Integration Loaded');
console.log('📋 Integration Status:');
console.log('   - Auto-initialization: ✅ Enabled');
console.log('   - Gameplay tracking: ✅ Ready');
console.log('   - Ad system: ✅ Ready');
console.log('   - Audio handling: ✅ Ready');
console.log('   - Happy Time: ✅ Ready');
console.log('   - Offline protection: ✅ Enabled');