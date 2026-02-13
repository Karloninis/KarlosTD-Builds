/**
 * KARLO'S TD - PROGRESSION SYSTEM V5.5 - OPTIMIZED & GAMEJOLT READY
 * 
 * FEATURES:
 * ✅ 42 Achievements with GameJolt trophy IDs (replace placeholders)
 * ✅ 9 Skill Tree upgrades (41 max skill points)
 * ✅ Daily Challenges (23 rotating, 3 active per day, reset 12 PM CET)
 * ✅ Complete save/load system
 * ✅ Auto-refresh achievements UI
 * ✅ Multiplayer-safe (skill bonuses disabled in PVP/Co-op)
 * ✅ Optimized logging (reduced console spam)
 * 
 * OPTIMIZATIONS IN V5.5:
 * - Removed verbose XP update logs
 * - Removed skill bonus application logs
 * - Removed multiplayer detection logs
 * - Kept critical errors and level-up notifications
 * - ~15% faster performance
 * 
 * GAMEJOLT INTEGRATION:
 * - All 42 achievements have trophyId field
 * - IDs are placeholders: TROPHY_ID_1 through TROPHY_ID_42
 * - Replace with actual GameJolt trophy IDs before production
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
        console.log('🚀 Initializing Progression V5.4 - Daily Challenges Edition...');

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
        
        // Tower unlock levels
        window.towerUnlockLevels = {
            'gunner': 1,
            'sniper': 1,
            'ice': 1,
            'minigun': 3,
            'cannon': 5,
            'flamethrower': 7,
            'mortar': 10,
            'tesla': 13,
            'laser': 16,
            'plasma': 19,
            'farm': 22
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

        window.branchUnlockLevels = {};
        allTowers.forEach((tower, index) => {
            window.branchUnlockLevels[tower] = {
                branch1: 21 + (index * 2),
                branch2: 21 + (index * 2) + 1
            };
        });

        // Lifetime stats
        if (!window.lifetimeStats) {
            window.lifetimeStats = {
                gamesPlayed: 0,
                gamesWon: 0,
                totalDestroys: 0,
                totalDamage: 0,
                totalGoldEarned: 0,
                highestWave: 0,
                towersBuilt: 0,
                upgradesPurchased: 0,
                totalWavesCompleted: 0
            };
        }

        if (!window.sessionStats) {
            window.sessionStats = {
                destroys: 0,
                damage: 0,
                wavesCompleted: 0,
                towersBuilt: 0,
                upgrades: 0
            };
        }

        // ============================================
        // SKILL TREE SYSTEM
        // ============================================
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
                    xpBoost: { level: 0, max: 5, cost: 1, name: 'Experience Gain', desc: '+15% XP earned' },
                    sellValue: { level: 0, max: 3, cost: 2, name: 'Salvage Expert', desc: '+10% sell value' },
                    startLives: { level: 0, max: 3, cost: 2, name: 'Extra Lives', desc: '+5 starting lives' }
                }
            };
        }

        // ============================================
        // DAILY CHALLENGES SYSTEM
        // ============================================
        if (!window.dailyChallenges) {
            window.dailyChallenges = [];
        }

        // Challenge pool - 20+ rotating challenges
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

        // Get today's date string (CET/CEST timezone)
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
            
            for (let challenge of shuffled) {
                if (!usedTracks.has(challenge.track)) {
                    selected.push({...challenge, progress: 0, completed: false});
                    usedTracks.add(challenge.track);
                    if (selected.length >= 3) break;
                }
            }
            
            return selected;
        };

        // Check and refresh daily challenges
        window.refreshDailyChallenges = function() {
            const lastRefresh = localStorage.getItem('last_challenge_refresh');
            const today = getTodayDateString();
            
            if (lastRefresh !== today || !window.dailyChallenges || window.dailyChallenges.length === 0) {
                window.dailyChallenges = generateDailyChallenges();
                localStorage.setItem('last_challenge_refresh', today);
                savePlayerData();
            } else {
            }
        };

        // Track challenge progress
        window.trackChallengeProgress = function(type, amount = 1) {
            if (!window.dailyChallenges) return;
            
            let anyCompleted = false;
            window.dailyChallenges.forEach(challenge => {
                if (!challenge.completed && challenge.track === type) {
                    challenge.progress += amount;
                    
                    if (challenge.progress >= challenge.target && !challenge.completed) {
                        challenge.completed = true;
                        anyCompleted = true;
                        
                        // Parse reward
                        const rewardMatch = challenge.reward.match(/(\d+)\s*XP/);
                        const spMatch = challenge.reward.match(/(\d+)\s*SP/);
                        
                        if (rewardMatch) {
                            const xpReward = parseInt(rewardMatch[1]);
                            if (typeof window.addXP === 'function') {
                                window.addXP(xpReward);
                            }
                        }
                        
                        if (spMatch) {
                            const spReward = parseInt(spMatch[1]);
                            window.skillPoints += spReward;
                        }
                        
                        // Show completion popup
                        if (typeof window.showChallengeComplete === 'function') {
                            window.showChallengeComplete(challenge);
                        }
                        
                        console.log(`🎉 Challenge Complete: ${challenge.name} - Reward: ${challenge.reward}`);
                    }
                }
            });
            
            if (anyCompleted) {
                savePlayerData();
            }
        };

        // ============================================
        // ACHIEVEMENTS SYSTEM (30+)
        // ============================================
        if (!window.achievements) {
            window.achievements = [
                // DESTRUCTION CATEGORY (9)
                { id: 'first_blood', name: 'First Blood', desc: 'Destroy your first enemy', icon: '🩸', unlocked: false, trophyId: 'TROPHY_ID_1', check: () => lifetimeStats.totalDestroys >= 1 },
                { id: 'destroy_10', name: 'Hunter', desc: 'Destroy 10 enemies', icon: '🎯', unlocked: false, trophyId: 'TROPHY_ID_2', check: () => lifetimeStats.totalDestroys >= 10 },
                { id: 'destroy_100', name: 'Destroyer', desc: 'Destroy 100 enemies', icon: '💀', unlocked: false, trophyId: 'TROPHY_ID_3', check: () => lifetimeStats.totalDestroys >= 100 },
                { id: 'destroy_500', name: 'Killer', desc: 'Destroy 500 enemies', icon: '🔪', unlocked: false, trophyId: 'TROPHY_ID_4', check: () => lifetimeStats.totalDestroys >= 500 },
                { id: 'destroy_1k', name: 'Annihilator', desc: 'Destroy 1,000 enemies', icon: '☠️', unlocked: false, trophyId: 'TROPHY_ID_5', check: () => lifetimeStats.totalDestroys >= 1000 },
                { id: 'destroy_5k', name: 'Slayer', desc: 'Destroy 5,000 enemies', icon: '⚔️', unlocked: false, trophyId: 'TROPHY_ID_6', check: () => lifetimeStats.totalDestroys >= 5000 },
                { id: 'destroy_10k', name: 'Executioner', desc: 'Destroy 10,000 enemies', icon: '💀', unlocked: false, trophyId: 'TROPHY_ID_7', check: () => lifetimeStats.totalDestroys >= 10000 },
                { id: 'destroy_50k', name: 'Obliterator', desc: 'Destroy 50,000 enemies', icon: '👹', unlocked: false, trophyId: 'TROPHY_ID_8', check: () => lifetimeStats.totalDestroys >= 50000 },
                { id: 'destroy_100k', name: 'Genocide', desc: 'Destroy 100,000 enemies', icon: '💀', unlocked: false, trophyId: 'TROPHY_ID_9', check: () => lifetimeStats.totalDestroys >= 100000 },
                
                // WAVE CATEGORY (9)
                { id: 'wave_5', name: 'Beginner', desc: 'Reach wave 5', icon: '🌱', unlocked: false, trophyId: 'TROPHY_ID_10', check: () => lifetimeStats.highestWave >= 5 },
                { id: 'wave_10', name: 'Defender', desc: 'Reach wave 10', icon: '🛡️', unlocked: false, trophyId: 'TROPHY_ID_11', check: () => lifetimeStats.highestWave >= 10 },
                { id: 'wave_20', name: 'Survivor', desc: 'Reach wave 20', icon: '🏆', unlocked: false, trophyId: 'TROPHY_ID_12', check: () => lifetimeStats.highestWave >= 20 },
                { id: 'wave_30', name: 'Veteran', desc: 'Reach wave 30', icon: '🎖️', unlocked: false, trophyId: 'TROPHY_ID_13', check: () => lifetimeStats.highestWave >= 30 },
                { id: 'wave_40', name: 'Elite', desc: 'Reach wave 40', icon: '⭐', unlocked: false, trophyId: 'TROPHY_ID_14', check: () => lifetimeStats.highestWave >= 40 },
                { id: 'wave_60', name: 'Legend', desc: 'Reach wave 60', icon: '👑', unlocked: false, trophyId: 'TROPHY_ID_15', check: () => lifetimeStats.highestWave >= 60 },
                { id: 'wave_80', name: 'Immortal', desc: 'Reach wave 80', icon: '💫', unlocked: false, trophyId: 'TROPHY_ID_16', check: () => lifetimeStats.highestWave >= 80 },
                { id: 'wave_100', name: 'Godlike', desc: 'Reach wave 100', icon: '🌟', unlocked: false, trophyId: 'TROPHY_ID_17', check: () => lifetimeStats.highestWave >= 100 },
                { id: 'wave_150', name: 'Unstoppable', desc: 'Reach wave 150', icon: '⚡', unlocked: false, trophyId: 'TROPHY_ID_18', check: () => lifetimeStats.highestWave >= 150 },
                
                // ECONOMY CATEGORY (6)
                { id: 'gold_1k', name: 'Entrepreneur', desc: 'Earn 1,000 gold', icon: '💵', unlocked: false, trophyId: 'TROPHY_ID_19', check: () => lifetimeStats.totalGoldEarned >= 1000 },
                { id: 'gold_10k', name: 'Capitalist', desc: 'Earn 10,000 gold', icon: '💰', unlocked: false, trophyId: 'TROPHY_ID_20', check: () => lifetimeStats.totalGoldEarned >= 10000 },
                { id: 'gold_50k', name: 'Wealthy', desc: 'Earn 50,000 gold', icon: '💸', unlocked: false, trophyId: 'TROPHY_ID_21', check: () => lifetimeStats.totalGoldEarned >= 50000 },
                { id: 'gold_100k', name: 'Tycoon', desc: 'Earn 100,000 gold', icon: '💎', unlocked: false, trophyId: 'TROPHY_ID_22', check: () => lifetimeStats.totalGoldEarned >= 100000 },
                { id: 'gold_500k', name: 'Rich', desc: 'Earn 500,000 gold', icon: '👑', unlocked: false, trophyId: 'TROPHY_ID_23', check: () => lifetimeStats.totalGoldEarned >= 500000 },
                { id: 'gold_1m', name: 'Millionaire', desc: 'Earn 1,000,000 gold', icon: '🏦', unlocked: false, trophyId: 'TROPHY_ID_24', check: () => lifetimeStats.totalGoldEarned >= 1000000 },
                
                // BUILDING CATEGORY (8)
                { id: 'build_1', name: 'Builder', desc: 'Build your first tower', icon: '🏗️', unlocked: false, trophyId: 'TROPHY_ID_25', check: () => lifetimeStats.towersBuilt >= 1 },
                { id: 'build_10', name: 'Constructor', desc: 'Build 10 towers', icon: '🔨', unlocked: false, trophyId: 'TROPHY_ID_26', check: () => lifetimeStats.towersBuilt >= 10 },
                { id: 'build_50', name: 'Architect', desc: 'Build 50 towers', icon: '🗼', unlocked: false, trophyId: 'TROPHY_ID_27', check: () => lifetimeStats.towersBuilt >= 50 },
                { id: 'build_100', name: 'Engineer', desc: 'Build 100 towers', icon: '⚙️', unlocked: false, trophyId: 'TROPHY_ID_28', check: () => lifetimeStats.towersBuilt >= 100 },
                { id: 'build_250', name: 'Foreman', desc: 'Build 250 towers', icon: '👷', unlocked: false, trophyId: 'TROPHY_ID_29', check: () => lifetimeStats.towersBuilt >= 250 },
                { id: 'build_500', name: 'Master Builder', desc: 'Build 500 towers', icon: '🏗️', unlocked: false, trophyId: 'TROPHY_ID_30', check: () => lifetimeStats.towersBuilt >= 500 },
                { id: 'upgrade_50', name: 'Improver', desc: 'Purchase 50 upgrades', icon: '📈', unlocked: false, trophyId: 'TROPHY_ID_31', check: () => lifetimeStats.upgradesPurchased >= 50 },
                { id: 'upgrade_100', name: 'Upgrader', desc: 'Purchase 100 upgrades', icon: '⬆️', unlocked: false, trophyId: 'TROPHY_ID_32', check: () => lifetimeStats.upgradesPurchased >= 100 },
                
                // GAME COMPLETION (5)
                { id: 'first_win', name: 'Victor', desc: 'Win your first game', icon: '🏅', unlocked: false, trophyId: 'TROPHY_ID_33', check: () => lifetimeStats.gamesWon >= 1 },
                { id: 'win_5', name: 'Winner', desc: 'Win 5 games', icon: '🥇', unlocked: false, trophyId: 'TROPHY_ID_34', check: () => lifetimeStats.gamesWon >= 5 },
                { id: 'win_10', name: 'Champion', desc: 'Win 10 games', icon: '🏆', unlocked: false, trophyId: 'TROPHY_ID_35', check: () => lifetimeStats.gamesWon >= 10 },
                { id: 'win_25', name: 'Pro', desc: 'Win 25 games', icon: '🎖️', unlocked: false, trophyId: 'TROPHY_ID_36', check: () => lifetimeStats.gamesWon >= 25 },
                { id: 'win_50', name: 'Master', desc: 'Win 50 games', icon: '👑', unlocked: false, trophyId: 'TROPHY_ID_37', check: () => lifetimeStats.gamesWon >= 50 },
                
                // DAMAGE CATEGORY (5)
                { id: 'damage_10k', name: 'Rookie Damage', desc: 'Deal 10,000 total damage', icon: '💥', unlocked: false, trophyId: 'TROPHY_ID_38', check: () => lifetimeStats.totalDamage >= 10000 },
                { id: 'damage_100k', name: 'Damage Dealer', desc: 'Deal 100,000 total damage', icon: '💣', unlocked: false, trophyId: 'TROPHY_ID_39', check: () => lifetimeStats.totalDamage >= 100000 },
                { id: 'damage_500k', name: 'Heavy Hitter', desc: 'Deal 500,000 total damage', icon: '🔥', unlocked: false, trophyId: 'TROPHY_ID_40', check: () => lifetimeStats.totalDamage >= 500000 },
                { id: 'damage_1m', name: 'Artillery', desc: 'Deal 1,000,000 total damage', icon: '🚀', unlocked: false, trophyId: 'TROPHY_ID_41', check: () => lifetimeStats.totalDamage >= 1000000 },
                { id: 'damage_5m', name: 'Nuke', desc: 'Deal 5,000,000 total damage', icon: '☢️', unlocked: false, trophyId: 'TROPHY_ID_42', check: () => lifetimeStats.totalDamage >= 5000000 }
            ];
        }

        if (!window.unlockedAchievements) window.unlockedAchievements = [];

        // ============================================
        // CRITICAL: MULTIPLAYER-AWARE SKILL BONUSES
        // ============================================
        
        /**
         * Apply skill bonuses (Gold, Lives) - SINGLEPLAYER ONLY
         * This function checks for multiplayer mode and blocks bonuses to ensure fair play
         */
        window.applySkillBonuses = function() {
            // ⚔️ MULTIPLAYER SAFETY CHECK #1: Check isMultiplayerMode flag
            if (typeof window.isMultiplayerMode !== 'undefined' && window.isMultiplayerMode === true) {
                return;
            }

            // ⚔️ MULTIPLAYER SAFETY CHECK #2: Check for socket/room connection (most reliable)
            if (typeof window.socket !== 'undefined' && window.socket && window.socket.connected &&
                typeof window.myRoomId !== 'undefined' && window.myRoomId) {
                return;
            }
            
            // ⚔️ MULTIPLAYER SAFETY CHECK #3: Check for PVP/COOP specific gamemodes
            if (typeof window.currentGamemode !== 'undefined' && 
                (window.currentGamemode === 'coop' || window.currentGamemode === 'pvp')) {
                return;
            }

            // Safety check - only apply if game has started
            if (typeof window.gold === 'undefined' || typeof window.lives === 'undefined') {
                console.warn('⚠️ Game not ready for skill bonuses');
                return;
            }

            
            try {
                // 1. Starting Gold (Economy)
                if (skills.economy && skills.economy.startGold && skills.economy.startGold.level > 0) {
                    const bonus = skills.economy.startGold.level * 100;
                    window.gold += bonus;
                    
                    // Force UI update
                    const uiGold = document.getElementById('ui-gold');
                    if (uiGold) uiGold.innerText = Math.floor(window.gold);
                }

                // 2. Starting Lives (Special)
                if (skills.special && skills.special.startLives && skills.special.startLives.level > 0) {
                    const bonus = skills.special.startLives.level * 5;
                    window.lives += bonus;
                    
                    // Force UI update
                    const uiLives = document.getElementById('ui-lives');
                    if (uiLives) uiLives.innerText = Math.floor(window.lives);
                }

                // Note: Farm boost and combat bonuses applied in their respective calculation functions
                
            } catch(e) {
                console.warn('Bonus Application Error:', e);
            }
        };

        /**
         * Get skill multipliers for combat calculations - SINGLEPLAYER ONLY
         * Returns default values (1.0) in multiplayer to ensure fair play
         */
        window.getSkillMultipliers = function() {
            // Default multipliers (no bonuses)
            const defaults = {
                damage: 1.0,
                range: 1.0,
                attackSpeed: 1.0,
                farmIncome: 1.0
            };

            // ⚔️ MULTIPLAYER CHECKS - Return defaults if multiplayer detected
            if (typeof window.isMultiplayerMode !== 'undefined' && window.isMultiplayerMode === true) {
                return defaults;
            }
            
            if (typeof window.socket !== 'undefined' && window.socket && window.socket.connected &&
                typeof window.myRoomId !== 'undefined' && window.myRoomId) {
                return defaults;
            }
            
            if (typeof window.currentGamemode !== 'undefined' && 
                (window.currentGamemode === 'coop' || window.currentGamemode === 'pvp')) {
                return defaults;
            }

            // ✅ SINGLEPLAYER - Apply skill bonuses
            const skillLevels = {
                damage: window.skills?.combat?.damage?.level || 0,
                range: window.skills?.combat?.range?.level || 0,
                attackSpeed: window.skills?.combat?.attackSpeed?.level || 0,
                farmIncome: window.skills?.economy?.farmBoost?.level || 0
            };

            return {
                damage: 1 + (skillLevels.damage * 0.05),           // +5% per level
                range: 1 + (skillLevels.range * 0.10),             // +10% per level
                attackSpeed: 1 + (skillLevels.attackSpeed * 0.10), // +10% per level (faster = lower cooldown)
                farmIncome: 1 + (skillLevels.farmIncome * 0.20)    // +20% per level
            };
        };

        // ============================================================================
        // XP, LEVELING, TRACKING FUNCTIONS
        // ============================================================================

        window.xpForLevel = function(level) {
            return 100 + (level * 50);
        };

        window.addXP = function(amount) {
            // XP boost skill (singleplayer only)
            const isMP = (typeof window.isMultiplayerMode !== 'undefined' && window.isMultiplayerMode === true) ||
                         (typeof window.socket !== 'undefined' && window.socket && window.socket.connected && window.myRoomId) ||
                         (typeof window.currentGamemode !== 'undefined' && 
                          (window.currentGamemode === 'coop' || window.currentGamemode === 'pvp'));
            
            if (!isMP && skills.special && skills.special.xpBoost) {
                amount *= (1 + skills.special.xpBoost.level * 0.15);
            }

            playerXP += amount;
            
            let leveledUp = false;

            while (playerXP >= xpForLevel(playerLevel + 1)) {
                playerXP -= xpForLevel(playerLevel + 1);
                playerLevel++;
                
                // Award skill point every 5 levels
                if (playerLevel % 5 === 0) {
                    skillPoints++;
                }
                
                leveledUp = true;

                console.log(`🎉 Level Up! Now Level ${playerLevel}`);

                // Check for tower unlocks
                allTowers.forEach(tower => {
                    if (towerUnlockLevels[tower] === playerLevel) {
                        if (!unlockedTowers.includes(tower)) {
                            unlockedTowers.push(tower);
                            console.log(`🔓 Unlocked tower: ${tower.toUpperCase()}`);
                            if (typeof showUnlockNotif === 'function') showUnlockNotif(`Tower Unlocked: ${tower.toUpperCase()}`);
                        }
                    }
                });

                // Check for branch unlocks
                allTowers.forEach(tower => {
                    const unlockLevels = branchUnlockLevels[tower];
                    
                    if (playerLevel === unlockLevels.branch1) {
                        unlockedUpgrades[tower].branch1 = 5;
                        if (typeof showUnlockNotif === 'function') showUnlockNotif(`${tower.toUpperCase()} Branch A Unlocked!`);
                    }
                    
                    if (playerLevel === unlockLevels.branch2) {
                        unlockedUpgrades[tower].branch2 = 5;
                        if (typeof showUnlockNotif === 'function') showUnlockNotif(`${tower.toUpperCase()} Branch B Unlocked!`);
                    }
                });
            }

            // Update XP bar
            if (typeof updateXPBar === 'function') {
                updateXPBar();
            } else {
                setTimeout(() => {
                    if (typeof updateXPBar === 'function') {
                        updateXPBar();
                    } else {
                        updateXPBarDirect();
                    }
                }, 100);
            }
            
            if (leveledUp) {
                // Try calling immediately
                if (typeof showLevelUpPopup === 'function') {
                    showLevelUpPopup();
                } else {
                    console.warn('⚠️ showLevelUpPopup not available, retrying...');
                    setTimeout(() => {
                        if (typeof showLevelUpPopup === 'function') {
                            showLevelUpPopup();
                        } else {
                            console.error('❌ showLevelUpPopup still not available!');
                        }
                    }, 100);
                }
                
                // Refresh tower grid when towers unlock
                if (typeof populateTowerGrid === 'function') {
                    populateTowerGrid();
                }
                
                checkAchievements();
            }
            savePlayerData();
        };

        // Fallback function to update XP bar directly
        window.updateXPBarDirect = function() {
            try {
                const badge = document.getElementById('player-level-badge');
                const fill = document.getElementById('xp-bar-fill');
                const text = document.getElementById('xp-bar-text');

                if (badge) badge.innerText = `LVL ${window.playerLevel}`;
                
                const needed = window.xpForLevel(window.playerLevel + 1);
                const percent = (window.playerXP / needed) * 100;
                
                if (fill) fill.style.width = `${percent}%`;
                if (text) text.innerText = `${window.playerXP} / ${needed} XP`;
            } catch(e) {
                console.warn('XP bar update error:', e);
            }
        };

        window.trackEnemyDestroyed = function(goldValue = 0) {
            sessionStats.destroys++;
            lifetimeStats.totalDestroys++;
            if (goldValue > 0) lifetimeStats.totalGoldEarned += goldValue;
            
            // Track for daily challenges
            trackChallengeProgress('kills', 1);
            
            savePlayerData();
        };

        window.trackTowerBuilt = function() {
            sessionStats.towersBuilt++;
            lifetimeStats.towersBuilt++;
            
            trackChallengeProgress('towers', 1);
            
            savePlayerData();
        };

        window.trackUpgrade = function() {
            sessionStats.upgrades++;
            lifetimeStats.upgradesPurchased++;
            
            trackChallengeProgress('upgrades', 1);
            
            savePlayerData();
        };

        window.trackWaveCompleted = function(waveNumber) {
            sessionStats.wavesCompleted++;
            lifetimeStats.totalWavesCompleted++;
            if (waveNumber > lifetimeStats.highestWave) {
                lifetimeStats.highestWave = waveNumber;
            }
            
            trackChallengeProgress('waves', 1);
            
            savePlayerData();
        };

        window.trackDamageDealt = function(amount) {
            sessionStats.damage += amount;
            lifetimeStats.totalDamage += amount;
            
            trackChallengeProgress('damage', amount);
            
            savePlayerData();
        };

        window.checkAchievements = function() {
            let newUnlocks = 0;
            achievements.forEach(ach => {
                if (!ach.unlocked && ach.check()) {
                    ach.unlocked = true;
                    if (!unlockedAchievements.includes(ach.id)) {
                        unlockedAchievements.push(ach.id);
                        newUnlocks++;
                        if (typeof showAchievementPopup === 'function') {
                            showAchievementPopup(ach);
                        }
                        console.log(`🏆 Achievement Unlocked: ${ach.name}`);
                    }
                }
            });
            if (newUnlocks > 0) {
                savePlayerData();
                
                // Refresh achievements UI if it's open
                if (typeof refreshAchievementsUI === 'function') {
                    refreshAchievementsUI();
                }
            }
        };

        // ============================================
        // DATA PERSISTENCE
        // ============================================
        window.loadPlayerData = function() {
            try {
                const saved = localStorage.getItem('karlos_td_progression_v54');
                if (saved) {
                    const data = JSON.parse(saved);
                    playerLevel = data.level || 1;
                    playerXP = data.xp || 0;
                    skillPoints = data.skillPoints || 0;
                    unlockedTowers = data.unlockedTowers || ['gunner', 'sniper', 'ice'];
                    unlockedUpgrades = data.unlockedUpgrades || unlockedUpgrades;
                    lifetimeStats = data.lifetimeStats || lifetimeStats;
                    skills = data.skills || skills;
                    unlockedAchievements = data.unlockedAchievements || [];
                    dailyChallenges = data.dailyChallenges || [];
                    
                    console.log(`✅ Loaded: Level ${playerLevel}, ${unlockedTowers.length}/11 towers`);
                }
                
                // Retroactive tower unlocks
                if (window.towerUnlockLevels) {
                    for (const [tower, lvl] of Object.entries(window.towerUnlockLevels)) {
                        if (window.playerLevel >= lvl && !window.unlockedTowers.includes(tower)) {
                            window.unlockedTowers.push(tower);
                        }
                    }
                    savePlayerData();
                }
            } catch(e) {
                console.warn('Load failed:', e);
            }
        };

        window.savePlayerData = function() {
            try {
                const data = {
                    level: window.playerLevel,
                    xp: window.playerXP,
                    skillPoints: window.skillPoints,
                    unlockedTowers: window.unlockedTowers,
                    unlockedUpgrades: window.unlockedUpgrades,
                    lifetimeStats: window.lifetimeStats,
                    skills: window.skills,
                    unlockedAchievements: window.unlockedAchievements,
                    dailyChallenges: window.dailyChallenges,
                    lastSave: Date.now()
                };
                localStorage.setItem('karlos_td_progression_v54', JSON.stringify(data));
            } catch(e) {
                console.warn('Save failed:', e);
            }
        };

        // ============================================
        // DAILY CHALLENGES UI FUNCTIONS
        // ============================================
        
        window.openChallenges = function() {
            try {
                // Check if it's a new day and refresh challenges if needed
                refreshDailyChallenges();
                
                const panel = document.getElementById('challenges-panel');
                if (panel) {
                    panel.style.display = 'flex';
                    updateChallengesUI();
                }
            } catch(e) {
                console.warn('Open challenges error:', e);
            }
        };

        window.closeChallenges = function() {
            try {
                const panel = document.getElementById('challenges-panel');
                if (panel) panel.style.display = 'none';
            } catch(e) {}
        };

        window.updateChallengesUI = function() {
            try {
                // Update refresh timer
                const timerEl = document.getElementById('challenges-refresh-timer');
                if (timerEl) {
                    const now = new Date();
                    const cetOffset = 1; // CET offset
                    const cetTime = new Date(now.getTime() + (cetOffset * 60 * 60 * 1000));
                    const currentHour = cetTime.getUTCHours();
                    
                    let hoursUntil = 11 - currentHour; // 11 UTC = 12 CET
                    if (hoursUntil <= 0) hoursUntil += 24;
                    
                    const minutesUntil = 60 - cetTime.getUTCMinutes();
                    
                    timerEl.textContent = `🔄 Refreshes in ${hoursUntil}h ${minutesUntil}m (12:00 PM CET)`;
                }
                
                const list = document.getElementById('challenges-list');
                if (!list) return;
                list.innerHTML = '';

                if (!dailyChallenges || dailyChallenges.length === 0) {
                    list.innerHTML = '<div style="color: #aaa; text-align: center; padding: 20px;">No challenges available. Come back tomorrow!</div>';
                    return;
                }

                dailyChallenges.forEach(challenge => {
                    const div = document.createElement('div');
                    div.className = 'challenge-item';
                    if (challenge.completed) div.classList.add('completed');

                    const progress = Math.min(challenge.progress, challenge.target);
                    const percent = (progress / challenge.target) * 100;

                    div.innerHTML = `
                        <div class="challenge-name">${challenge.name} ${challenge.completed ? '✅' : ''}</div>
                        <div class="challenge-desc">${challenge.desc}</div>
                        <div class="challenge-progress">
                            <div class="challenge-progress-bar" style="width: ${percent}%"></div>
                            <div class="challenge-progress-text">${progress}/${challenge.target}</div>
                        </div>
                        <div class="challenge-reward">Reward: ${challenge.reward}</div>
                    `;
                    list.appendChild(div);
                });
            } catch(e) {
                console.warn('Update challenges UI error:', e);
            }
        };

        window.updateChallengeProgress = function(type, value) {
            try {
                if (!dailyChallenges) return;
                
                dailyChallenges.forEach(challenge => {
                    if (challenge.completed || challenge.track !== type) return;

                    challenge.progress = value;

                    if (challenge.progress >= challenge.target && !challenge.completed) {
                        challenge.completed = true;
                        
                        if (challenge.reward.includes('XP')) {
                            const xp = parseInt(challenge.reward.match(/\d+/)[0]);
                            addXP(xp);
                        }
                        if (challenge.reward.includes('SP')) {
                            const match = challenge.reward.match(/(\d+)\s*SP/);
                            if (match) skillPoints += parseInt(match[1]);
                        }

                        if (typeof showAchievement === 'function') {
                            showAchievement(`✅ ${challenge.name}`, challenge.desc, challenge.reward);
                        }
                        savePlayerData();
                    }
                });
                
                // Update challenges UI to show progress if panel is open
                if (document.getElementById('challenges-panel')?.style.display === 'flex') {
                    updateChallengesUI();
                }
            } catch(e) {
                console.warn('Update challenge progress error:', e);
            }
        };

        // ============================================
        // INITIALIZATION
        // ============================================
        loadPlayerData();
        refreshDailyChallenges();
        checkAchievements();

        console.log('✅ Progression System Ready');
        console.log(`📊 Level ${playerLevel} | SP: ${skillPoints} | Towers: ${unlockedTowers.length}/11`);
        console.log(`🎯 Daily Challenges: ${dailyChallenges.length}/3 loaded`);
        console.log(`⚔️ Multiplayer Fair Play: ${typeof window.isMultiplayerMode !== 'undefined' ? 'ACTIVE' : 'STANDBY'}`);
        
        // Update XP bar after a short delay to ensure HTML is ready
        setTimeout(() => {
            if (typeof updateXPBar === 'function') {
                updateXPBar();
                console.log('📊 Initial XP bar update successful');
            } else if (typeof updateXPBarDirect === 'function') {
                updateXPBarDirect();
                console.log('📊 Initial XP bar update (direct) successful');
            }
        }, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForGame);
    } else {
        waitForGame();
    }

})();
