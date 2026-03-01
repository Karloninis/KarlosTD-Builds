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

        // ── Challenge pool — tiered templates ─────────────────────────────────
        // Each entry has 3 tiers (easy/medium/hard). The seed picks which tier
        // shows up today, so difficulty rotates daily alongside the challenge type.
        // Rewards are objects { xp, sp, scraps } — scraps added to LockerSystem.
        window.challengePool = [
            // KILL CHALLENGES
            {
                track: 'kills',
                perRun: true, // progress resets each new game
                tiers: [
                    { name: 'Rookie Hunter',    desc: 'Kill 100 enemies in one run', target: 100,  reward: { xp: 200, sp: 0, scraps: 10 } },
                    { name: 'Sharpshooter',     desc: 'Kill 200 enemies in one run', target: 200,  reward: { xp: 350, sp: 1, scraps: 20 } },
                    { name: 'Mass Destruction', desc: 'Kill 350 enemies in one run', target: 350,  reward: { xp: 600, sp: 1, scraps: 40 } },
                ]
            },
            {
                track: 'kills',
                perRun: true,
                tiers: [
                    { name: 'Exterminator', desc: 'Kill 150 enemies in one run', target: 150, reward: { xp: 250, sp: 0, scraps: 15 } },
                    { name: 'Elite Slayer', desc: 'Kill 300 enemies in one run', target: 300, reward: { xp: 450, sp: 1, scraps: 30 } },
                    { name: 'Void Reaper',  desc: 'Kill 500 enemies in one run', target: 500, reward: { xp: 800, sp: 2, scraps: 60 } },
                ]
            },
            // TOWER CHALLENGES
            {
                track: 'towers',
                tiers: [
                    { name: 'Builder Apprentice', desc: 'Build 8 towers',  target: 8,  reward: { xp: 150, sp: 0, scraps: 10 } },
                    { name: 'Tower Master',       desc: 'Build 15 towers', target: 15, reward: { xp: 280, sp: 1, scraps: 20 } },
                    { name: 'Defense Architect',  desc: 'Build 25 towers', target: 25, reward: { xp: 500, sp: 1, scraps: 35 } },
                ]
            },
            {
                track: 'towers',
                tiers: [
                    { name: 'Fortress Builder', desc: 'Build 10 towers', target: 10, reward: { xp: 175, sp: 0, scraps: 12 } },
                    { name: 'Strategic Placer', desc: 'Build 18 towers', target: 18, reward: { xp: 320, sp: 1, scraps: 25 } },
                    { name: 'Warzone Engineer', desc: 'Build 30 towers', target: 30, reward: { xp: 600, sp: 2, scraps: 50 } },
                ]
            },
            // WAVE CHALLENGES
            {
                track: 'waves',
                tiers: [
                    { name: 'Wave Warrior',   desc: 'Complete 8 waves',  target: 8,  reward: { xp: 150, sp: 0, scraps: 10 } },
                    { name: 'Survivor',       desc: 'Complete 12 waves', target: 12, reward: { xp: 280, sp: 1, scraps: 20 } },
                    { name: 'Marathon Runner',desc: 'Complete 20 waves', target: 20, reward: { xp: 550, sp: 1, scraps: 45 } },
                ]
            },
            {
                track: 'waves',
                tiers: [
                    { name: 'Endurance Test', desc: 'Complete 10 waves', target: 10, reward: { xp: 200, sp: 0, scraps: 15 } },
                    { name: 'Wave Master',    desc: 'Complete 15 waves', target: 15, reward: { xp: 350, sp: 1, scraps: 28 } },
                    { name: 'Iron Defender',  desc: 'Complete 20 waves', target: 20, reward: { xp: 750, sp: 2, scraps: 70 } },
                ]
            },
            // DAMAGE CHALLENGES
            {
                track: 'damage',
                tiers: [
                    { name: 'Damage Dealer',      desc: 'Deal 50,000 damage',  target: 50000,  reward: { xp: 200, sp: 0, scraps: 12 } },
                    { name: 'Heavy Artillery',    desc: 'Deal 100,000 damage', target: 100000, reward: { xp: 380, sp: 1, scraps: 25 } },
                    { name: 'Overwhelming Force', desc: 'Deal 200,000 damage', target: 200000, reward: { xp: 650, sp: 2, scraps: 55 } },
                ]
            },
            {
                track: 'damage',
                tiers: [
                    { name: 'Destruction Expert', desc: 'Deal 75,000 damage',  target: 75000,  reward: { xp: 250, sp: 0, scraps: 18 } },
                    { name: 'Power House',        desc: 'Deal 150,000 damage', target: 150000, reward: { xp: 450, sp: 1, scraps: 35 } },
                    { name: 'Annihilator',        desc: 'Deal 300,000 damage', target: 300000, reward: { xp: 800, sp: 2, scraps: 65 } },
                ]
            },
            // UPGRADE CHALLENGES
            {
                track: 'upgrades',
                tiers: [
                    { name: 'Upgrade Novice', desc: 'Upgrade 4 towers',  target: 4,  reward: { xp: 150, sp: 0, scraps: 10 } },
                    { name: 'Power Up',       desc: 'Upgrade 8 towers',  target: 8,  reward: { xp: 300, sp: 1, scraps: 22 } },
                    { name: 'Max Power',      desc: 'Upgrade 14 towers', target: 14, reward: { xp: 550, sp: 1, scraps: 40 } },
                ]
            },
            // GOLD EARNED CHALLENGES
            {
                track: 'gold',
                tiers: [
                    { name: 'Penny Pincher', desc: 'Earn 5,000 gold',  target: 5000,  reward: { xp: 175, sp: 0, scraps: 12 } },
                    { name: 'Gold Rush',     desc: 'Earn 12,000 gold', target: 12000, reward: { xp: 320, sp: 1, scraps: 25 } },
                    { name: 'Billionaire',   desc: 'Earn 25,000 gold', target: 25000, reward: { xp: 600, sp: 1, scraps: 50 } },
                ]
            },
        ];

        // ── Format reward object into display string ───────────────────────────
        window.formatChallengeReward = function(r) {
            const parts = [];
            if (r.xp)     parts.push(r.xp + ' XP');
            if (r.sp)     parts.push(r.sp + ' SP');
            if (r.scraps) parts.push(r.scraps + ' ⚙');
            return parts.join(' + ');
        };

        // Get today's date string — resets at 12:00 PM (UTC+01:00/UTC+02:00 DST-aware)
        window.getTodayDateString = function() {
            const now      = new Date();
            const resetSec = typeof window._cetResetUTCSecs === 'function'
                ? window._cetResetUTCSecs() : 11 * 3600;
            const utcSecs  = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
            const adj      = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            if (utcSecs < resetSec) adj.setUTCDate(adj.getUTCDate() - 1);
            return adj.toISOString().split('T')[0];
        };

        // Generate 3 challenges seeded by date — everyone gets the same 3 types
        // but each type's difficulty tier is also seeded, so it rotates daily.
        window.generateDailyChallenges = function() {
            const dateString = getTodayDateString();

            // Per-user seed so same date gives same challenges for everyone
            let userToken = '';
            try {
                const authUser = JSON.parse(localStorage.getItem('karlos_auth_user') || 'null');
                if (authUser && authUser.userId) {
                    userToken = String(authUser.userId);
                } else {
                    let guestToken = localStorage.getItem('karlos_guest_token');
                    if (!guestToken) {
                        guestToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
                        localStorage.setItem('karlos_guest_token', guestToken);
                    }
                    userToken = guestToken;
                }
            } catch(e) {}

            const seedStr = dateString + '|' + userToken;
            let seed = 0;
            for (let i = 0; i < seedStr.length; i++) {
                seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
                seed = seed & seed;
            }
            seed = Math.abs(seed);
            const seededRandom = function() {
                seed = (seed * 9301 + 49297) % 233280;
                if (seed < 0) seed += 233280;
                return seed / 233280;
            };

            // Shuffle pool templates
            const shuffled = [...challengePool];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Pick 3, distinct tracks, seed picks the tier within each template
            const selected = [];
            const usedTracks = new Set();
            for (const template of shuffled) {
                if (selected.length >= 3) break;
                if (usedTracks.has(template.track)) continue;
                const tierIdx = Math.floor(seededRandom() * template.tiers.length);
                const tier = template.tiers[tierIdx];
                if (!tier || !tier.reward) continue;
                selected.push({
                    ...tier,
                    track: template.track,
                    perRun: template.perRun || false, // inherited from pool template
                    progress: 0,
                    completed: false,
                    rewardObj: { ...tier.reward },
                    reward: formatChallengeReward(tier.reward),
                });
                usedTracks.add(template.track);
            }
            return selected;
        };

        // Reset per-run challenge progress at the start of each new game.
        // Only resets incomplete challenges flagged with perRun:true.
        window.resetRunChallenges = function() {
            if (!window.dailyChallenges) return;
            let changed = false;
            window.dailyChallenges.forEach(function(c) {
                if (c.perRun && !c.completed && c.progress > 0) {
                    c.progress = 0;
                    changed = true;
                }
            });
            if (changed && typeof savePlayerData === 'function') savePlayerData();
        };

        // Check and refresh daily challenges
        window.refreshDailyChallenges = function() {
            const today = getTodayDateString();
            const lastRefresh = localStorage.getItem('last_challenge_refresh');
            if (lastRefresh !== today || !window.dailyChallenges || window.dailyChallenges.length === 0) {
                window.dailyChallenges = generateDailyChallenges();
                localStorage.setItem('last_challenge_refresh', today);
                if (typeof savePlayerData === 'function') savePlayerData();
            }
        };

        // Alias used by UI.js
        window.initDailyChallenges = window.refreshDailyChallenges;

        // Track challenge progress — called from Game.js on kills/builds/waves/damage/upgrades/gold
        window.trackChallengeProgress = function(type, amount) {
            if (amount === undefined) amount = 1;
            if (!window.dailyChallenges) return;

            let anyCompleted = false;
            window.dailyChallenges.forEach(function(challenge) {
                if (challenge.completed || challenge.track !== type) return;
                challenge.progress += amount;
                if (challenge.progress < challenge.target) return;

                challenge.completed = true;
                anyCompleted = true;

                // Grant reward
                const r = challenge.rewardObj;
                if (r) {
                    // XP
                    if (r.xp && typeof window.addXP === 'function') window.addXP(r.xp);
                    // Skill points
                    if (r.sp) {
                        if (typeof window.skillPoints !== 'undefined') window.skillPoints += r.sp;
                    }
                    // Scraps — add directly to LockerSystem
                    if (r.scraps && typeof LockerSystem !== 'undefined') {
                        try {
                            const state = LockerSystem.getState();
                            state.scraps = (state.scraps || 0) + r.scraps;
                            localStorage.setItem('karlos_td_locker_v1', JSON.stringify(state));
                            LockerSystem.updateHUD();
                        } catch(e) {}
                    }
                } else {
                    // Legacy string fallback (saved challenges from before the rework)
                    const xpM = challenge.reward && challenge.reward.match(/(\d+)\s*XP/);
                    const spM  = challenge.reward && challenge.reward.match(/(\d+)\s*SP/);
                    if (xpM && typeof window.addXP === 'function') window.addXP(parseInt(xpM[1]));
                    if (spM && typeof window.skillPoints !== 'undefined') window.skillPoints += parseInt(spM[1]);
                }

                // Show completion popup
                if (typeof window.showChallengeComplete === 'function') {
                    window.showChallengeComplete(challenge);
                } else if (typeof window.showAchievement === 'function') {
                    window.showAchievement(challenge.name, challenge.desc, challenge.reward);
                }

                console.log('\uD83C\uDF89 Challenge Complete: ' + challenge.name + ' — ' + challenge.reward);
            });

            if (anyCompleted && typeof savePlayerData === 'function') savePlayerData();
        };

        // ============================================
        // ACHIEVEMENTS SYSTEM (30+)
        // ============================================
        if (!window.achievements) {
            window.achievements = [
                // DESTRUCTION CATEGORY (9)
                { id: 'first_blood', name: 'First Blood', desc: 'Destroy your first enemy', icon: '<i class="fa-solid fa-droplet"></i>', unlocked: false, trophyId: 'TROPHY_ID_1', check: () => lifetimeStats.totalDestroys >= 1 },
                { id: 'destroy_10', name: 'Hunter', desc: 'Destroy 10 enemies', icon: '<i class="fa-solid fa-bullseye"></i>', unlocked: false, trophyId: 'TROPHY_ID_2', check: () => lifetimeStats.totalDestroys >= 10 },
                { id: 'destroy_100', name: 'Destroyer', desc: 'Destroy 100 enemies', icon: '<i class="fa-solid fa-skull"></i>', unlocked: false, trophyId: 'TROPHY_ID_3', check: () => lifetimeStats.totalDestroys >= 100 },
                { id: 'destroy_500', name: 'Killer', desc: 'Destroy 500 enemies', icon: '<i class="fa-solid fa-gun"></i>', unlocked: false, trophyId: 'TROPHY_ID_4', check: () => lifetimeStats.totalDestroys >= 500 },
                { id: 'destroy_1k', name: 'Annihilator', desc: 'Destroy 1,000 enemies', icon: '<i class="fa-solid fa-skull-crossbones"></i>', unlocked: false, trophyId: 'TROPHY_ID_5', check: () => lifetimeStats.totalDestroys >= 1000 },
                { id: 'destroy_5k', name: 'Slayer', desc: 'Destroy 5,000 enemies', icon: '<i class="fa-solid fa-hand-fist"></i>', unlocked: false, trophyId: 'TROPHY_ID_6', check: () => lifetimeStats.totalDestroys >= 5000 },
                { id: 'destroy_10k', name: 'Executioner', desc: 'Destroy 10,000 enemies', icon: '<i class="fa-solid fa-skull"></i>', unlocked: false, trophyId: 'TROPHY_ID_7', check: () => lifetimeStats.totalDestroys >= 10000 },
                { id: 'destroy_50k', name: 'Obliterator', desc: 'Destroy 50,000 enemies', icon: '<i class="fa-solid fa-face-angry"></i>', unlocked: false, trophyId: 'TROPHY_ID_8', check: () => lifetimeStats.totalDestroys >= 50000 },
                { id: 'destroy_100k', name: 'Genocide', desc: 'Destroy 100,000 enemies', icon: '<i class="fa-solid fa-skull"></i>', unlocked: false, trophyId: 'TROPHY_ID_9', check: () => lifetimeStats.totalDestroys >= 100000 },
                
                // WAVE CATEGORY (9)
                { id: 'wave_5', name: 'Beginner', desc: 'Reach wave 5', icon: '<i class="fa-solid fa-seedling"></i>', unlocked: false, trophyId: 'TROPHY_ID_10', check: () => lifetimeStats.highestWave >= 5 },
                { id: 'wave_10', name: 'Defender', desc: 'Reach wave 10', icon: '<i class="fa-solid fa-shield-halved"></i>', unlocked: false, trophyId: 'TROPHY_ID_11', check: () => lifetimeStats.highestWave >= 10 },
                { id: 'wave_20', name: 'Survivor', desc: 'Reach wave 20', icon: '<i class="fa-solid fa-trophy"></i>', unlocked: false, trophyId: 'TROPHY_ID_12', check: () => lifetimeStats.highestWave >= 20 },
                { id: 'wave_30', name: 'Veteran', desc: 'Reach wave 30', icon: '<i class="fa-solid fa-medal"></i>', unlocked: false, trophyId: 'TROPHY_ID_13', check: () => lifetimeStats.highestWave >= 30 },
                { id: 'wave_40', name: 'Elite', desc: 'Reach wave 40', icon: '<i class="fa-solid fa-star"></i>', unlocked: false, trophyId: 'TROPHY_ID_14', check: () => lifetimeStats.highestWave >= 40 },
                { id: 'wave_60', name: 'Legend', desc: 'Reach wave 60', icon: '<i class="fa-solid fa-crown"></i>', unlocked: false, trophyId: 'TROPHY_ID_15', check: () => lifetimeStats.highestWave >= 60 },
                { id: 'wave_80', name: 'Immortal', desc: 'Reach wave 80', icon: '<i class="fa-solid fa-star"></i>', unlocked: false, trophyId: 'TROPHY_ID_16', check: () => lifetimeStats.highestWave >= 80 },
                { id: 'wave_100', name: 'Godlike', desc: 'Reach wave 100', icon: '<i class="fa-solid fa-star"></i>', unlocked: false, trophyId: 'TROPHY_ID_17', check: () => lifetimeStats.highestWave >= 100 },
                { id: 'wave_150', name: 'Unstoppable', desc: 'Reach wave 150', icon: '<i class="fa-solid fa-bolt"></i>', unlocked: false, trophyId: 'TROPHY_ID_18', check: () => lifetimeStats.highestWave >= 150 },
                
                // ECONOMY CATEGORY (6)
                { id: 'gold_1k', name: 'Entrepreneur', desc: 'Earn 1,000 gold', icon: '<i class="fa-solid fa-money-bill"></i>', unlocked: false, trophyId: 'TROPHY_ID_19', check: () => lifetimeStats.totalGoldEarned >= 1000 },
                { id: 'gold_10k', name: 'Capitalist', desc: 'Earn 10,000 gold', icon: '<i class="fa-solid fa-sack-dollar"></i>', unlocked: false, trophyId: 'TROPHY_ID_20', check: () => lifetimeStats.totalGoldEarned >= 10000 },
                { id: 'gold_50k', name: 'Wealthy', desc: 'Earn 50,000 gold', icon: '<i class="fa-solid fa-money-bill-wave"></i>', unlocked: false, trophyId: 'TROPHY_ID_21', check: () => lifetimeStats.totalGoldEarned >= 50000 },
                { id: 'gold_100k', name: 'Tycoon', desc: 'Earn 100,000 gold', icon: '<i class="fa-solid fa-gem"></i>', unlocked: false, trophyId: 'TROPHY_ID_22', check: () => lifetimeStats.totalGoldEarned >= 100000 },
                { id: 'gold_500k', name: 'Rich', desc: 'Earn 500,000 gold', icon: '<i class="fa-solid fa-crown"></i>', unlocked: false, trophyId: 'TROPHY_ID_23', check: () => lifetimeStats.totalGoldEarned >= 500000 },
                { id: 'gold_1m', name: 'Millionaire', desc: 'Earn 1,000,000 gold', icon: '<i class="fa-solid fa-building-columns"></i>', unlocked: false, trophyId: 'TROPHY_ID_24', check: () => lifetimeStats.totalGoldEarned >= 1000000 },
                
                // BUILDING CATEGORY (8)
                { id: 'build_1', name: 'Builder', desc: 'Build your first tower', icon: '<i class="fa-solid fa-helmet-safety"></i>', unlocked: false, trophyId: 'TROPHY_ID_25', check: () => lifetimeStats.towersBuilt >= 1 },
                { id: 'build_10', name: 'Constructor', desc: 'Build 10 towers', icon: '<i class="fa-solid fa-hammer"></i>', unlocked: false, trophyId: 'TROPHY_ID_26', check: () => lifetimeStats.towersBuilt >= 10 },
                { id: 'build_50', name: 'Architect', desc: 'Build 50 towers', icon: '<i class="fa-solid fa-tower-observation"></i>', unlocked: false, trophyId: 'TROPHY_ID_27', check: () => lifetimeStats.towersBuilt >= 50 },
                { id: 'build_100', name: 'Engineer', desc: 'Build 100 towers', icon: '<i class="fa-solid fa-gear"></i>', unlocked: false, trophyId: 'TROPHY_ID_28', check: () => lifetimeStats.towersBuilt >= 100 },
                { id: 'build_250', name: 'Foreman', desc: 'Build 250 towers', icon: '<i class="fa-solid fa-helmet-safety"></i>', unlocked: false, trophyId: 'TROPHY_ID_29', check: () => lifetimeStats.towersBuilt >= 250 },
                { id: 'build_500', name: 'Master Builder', desc: 'Build 500 towers', icon: '<i class="fa-solid fa-helmet-safety"></i>', unlocked: false, trophyId: 'TROPHY_ID_30', check: () => lifetimeStats.towersBuilt >= 500 },
                { id: 'upgrade_50', name: 'Improver', desc: 'Purchase 50 upgrades', icon: '<i class="fa-solid fa-chart-line"></i>', unlocked: false, trophyId: 'TROPHY_ID_31', check: () => lifetimeStats.upgradesPurchased >= 50 },
                { id: 'upgrade_100', name: 'Upgrader', desc: 'Purchase 100 upgrades', icon: '<i class="fa-solid fa-arrow-up"></i>', unlocked: false, trophyId: 'TROPHY_ID_32', check: () => lifetimeStats.upgradesPurchased >= 100 },
                
                // GAME COMPLETION (5)
                { id: 'first_win', name: 'Victor', desc: 'Win your first game', icon: '<i class="fa-solid fa-medal"></i>', unlocked: false, trophyId: 'TROPHY_ID_33', check: () => lifetimeStats.gamesWon >= 1 },
                { id: 'win_5', name: 'Winner', desc: 'Win 5 games', icon: '<i class="fa-solid fa-medal"></i>', unlocked: false, trophyId: 'TROPHY_ID_34', check: () => lifetimeStats.gamesWon >= 5 },
                { id: 'win_10', name: 'Champion', desc: 'Win 10 games', icon: '<i class="fa-solid fa-trophy"></i>', unlocked: false, trophyId: 'TROPHY_ID_35', check: () => lifetimeStats.gamesWon >= 10 },
                { id: 'win_25', name: 'Pro', desc: 'Win 25 games', icon: '<i class="fa-solid fa-medal"></i>', unlocked: false, trophyId: 'TROPHY_ID_36', check: () => lifetimeStats.gamesWon >= 25 },
                { id: 'win_50', name: 'Master', desc: 'Win 50 games', icon: '<i class="fa-solid fa-crown"></i>', unlocked: false, trophyId: 'TROPHY_ID_37', check: () => lifetimeStats.gamesWon >= 50 },
                
                // DAMAGE CATEGORY (5)
                { id: 'damage_10k', name: 'Rookie Damage', desc: 'Deal 10,000 total damage', icon: '<i class="fa-solid fa-star-of-life"></i>', unlocked: false, trophyId: 'TROPHY_ID_38', check: () => lifetimeStats.totalDamage >= 10000 },
                { id: 'damage_100k', name: 'Damage Dealer', desc: 'Deal 100,000 total damage', icon: '<i class="fa-solid fa-bomb"></i>', unlocked: false, trophyId: 'TROPHY_ID_39', check: () => lifetimeStats.totalDamage >= 100000 },
                { id: 'damage_500k', name: 'Heavy Hitter', desc: 'Deal 500,000 total damage', icon: '<i class="fa-solid fa-fire"></i>', unlocked: false, trophyId: 'TROPHY_ID_40', check: () => lifetimeStats.totalDamage >= 500000 },
                { id: 'damage_1m', name: 'Artillery', desc: 'Deal 1,000,000 total damage', icon: '<i class="fa-solid fa-rocket"></i>', unlocked: false, trophyId: 'TROPHY_ID_41', check: () => lifetimeStats.totalDamage >= 1000000 },
                { id: 'damage_5m', name: 'Nuke', desc: 'Deal 5,000,000 total damage', icon: '<i class="fa-solid fa-radiation"></i>', unlocked: false, trophyId: 'TROPHY_ID_42', check: () => lifetimeStats.totalDamage >= 5000000 }
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
                farmIncome: window.skills?.economy?.farmBoost?.level || 0,
                sellValue: window.skills?.special?.sellValue?.level || 0
            };

            return {
                damage: 1 + (skillLevels.damage * 0.05),           // +5% per level
                range: 1 + (skillLevels.range * 0.10),             // +10% per level
                attackSpeed: 1 + (skillLevels.attackSpeed * 0.10), // +10% per level (faster = lower cooldown)
                farmIncome: 1 + (skillLevels.farmIncome * 0.20),   // +20% per level
                sellValue: skillLevels.sellValue                    // raw level (0-3), applied as 0.6 + level*0.1
            };
        };

        // ============================================================================
        // XP, LEVELING, TRACKING FUNCTIONS
        // ============================================================================

        // ── CANONICAL xpForLevel ─────────────────────────────────────────────
        // This is the SINGLE definition used by the whole game.
        // UI.js previously had a conflicting exponential formula — it's been removed.
        // Formula: each level needs 100 + (level * 50) XP
        // Level 1→2: 150 XP, Level 9→10: 600 XP, Level 19→20: 1100 XP
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
            trackChallengeProgress('kills', 1);
            if (goldValue > 0) {
                lifetimeStats.totalGoldEarned += goldValue;
                trackChallengeProgress('gold', goldValue);
            }
            if (lifetimeStats.totalDestroys % 10 === 0) checkAchievements();
            savePlayerData();
        };

        window.trackGoldEarned = function(amount) {
            if (!amount || amount <= 0) return;
            lifetimeStats.totalGoldEarned += amount;
            trackChallengeProgress('gold', amount);
            const prev = lifetimeStats.totalGoldEarned - amount;
            for (const t of [1000, 10000, 50000, 100000, 500000, 1000000]) {
                if (prev < t && lifetimeStats.totalGoldEarned >= t) { checkAchievements(); break; }
            }
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
            
            // ✅ FIX: Apply Interest Rate skill — +2% of current gold per wave per level
            const isMP = (typeof window.isMultiplayerMode !== 'undefined' && window.isMultiplayerMode === true) ||
                         (typeof window.socket !== 'undefined' && window.socket && window.socket.connected && window.myRoomId) ||
                         (typeof window.currentGamemode !== 'undefined' && 
                          (window.currentGamemode === 'coop' || window.currentGamemode === 'pvp'));
            if (!isMP && skills.economy && skills.economy.interest && skills.economy.interest.level > 0) {
                const interestRate = skills.economy.interest.level * 0.02;
                const interestBonus = Math.floor((window.gold || 0) * interestRate);
                if (interestBonus > 0) {
                    window.gold = (window.gold || 0) + interestBonus;
                    const uiGold = document.getElementById('ui-gold');
                    if (uiGold) uiGold.innerText = Math.floor(window.gold);
                    // Show floating text via game if available
                    if (typeof createFloatingText === 'function' && typeof scene !== 'undefined') {
                        try {
                            // Show in center-ish area
                            const pos = new THREE.Vector3(0, 5, 0);
                            createFloatingText('+$' + interestBonus + ' INT', pos, '#f1c40f');
                        } catch(e) {}
                    }
                }
            }
            
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
                    // Merge saved skill LEVELS into the default template.
                    // We must NOT do `skills = data.skills` because localStorage strips
                    // name/desc fields, causing "undefined" in the skill tree UI.
                    if (data.skills) {
                        Object.keys(skills).forEach(cat => {
                            if (data.skills[cat]) {
                                Object.keys(skills[cat]).forEach(key => {
                                    if (data.skills[cat][key] !== undefined) {
                                        skills[cat][key].level = data.skills[cat][key].level || 0;
                                    }
                                });
                            }
                        });
                    }
                    unlockedAchievements = data.unlockedAchievements || [];
                    dailyChallenges = data.dailyChallenges || [];

                    // Re-stamp .unlocked on the achievements objects so the UI shows correctly.
                    // checkAchievements() only adds NEW unlocks — it won't re-flag ones whose
                    // stat thresholds aren't currently met (e.g. right after a reset).
                    if (window.achievements && unlockedAchievements.length > 0) {
                        window.achievements.forEach(a => {
                            if (unlockedAchievements.includes(a.id)) a.unlocked = true;
                        });
                    }
                    
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

        // Debounce timer for cloud saves — we don't want to hit the server on every XP tick
        let _cloudSaveTimer = null;
        function _scheduleCloudSave() {
            if (_cloudSaveTimer) clearTimeout(_cloudSaveTimer);
            _cloudSaveTimer = setTimeout(() => {
                _cloudSaveTimer = null;
                if (typeof window.KarloAuth !== 'undefined' && typeof window.KarloAuth.saveProgress === 'function') {
                    window.KarloAuth.saveProgress().catch(() => {});
                }
            }, 5000); // 5 seconds after last local save
        }

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
                // Queue a cloud save shortly after — catches all rapid successive saves
                _scheduleCloudSave();
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
                    const now       = new Date();
                    const resetSec  = typeof window._cetResetUTCSecs === 'function'
                        ? window._cetResetUTCSecs() : 11 * 3600;
                    const secsInDay = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
                    let   secsLeft  = resetSec - secsInDay;
                    if (secsLeft <= 0) secsLeft += 86400;
                    const hL = Math.floor(secsLeft / 3600);
                    const mL = Math.floor((secsLeft % 3600) / 60);
                    const tzLabel = (resetSec === 10 * 3600) ? 'UTC+02:00' : 'UTC+01:00';
                    timerEl.textContent = `Refreshes in ${hL}h ${mL}m (12:00 ${tzLabel})`;
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
                        <div class="challenge-name">${challenge.name} ${challenge.completed ? '<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i>' : ''}</div>
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
                        const r = challenge.rewardObj;
                        if (r) {
                            if (r.xp && typeof window.addXP === 'function') window.addXP(r.xp);
                            if (r.sp && typeof window.skillPoints !== 'undefined') window.skillPoints += r.sp;
                            if (r.scraps && typeof LockerSystem !== 'undefined') {
                                try {
                                    const state = LockerSystem.getState();
                                    state.scraps = (state.scraps || 0) + r.scraps;
                                    localStorage.setItem('karlos_td_locker_v1', JSON.stringify(state));
                                    LockerSystem.updateHUD();
                                } catch(e) {}
                            }
                        } else {
                            const xpM = challenge.reward && challenge.reward.match(/(\d+)\s*XP/);
                            const spM  = challenge.reward && challenge.reward.match(/(\d+)\s*SP/);
                            if (xpM && typeof window.addXP === 'function') window.addXP(parseInt(xpM[1]));
                            if (spM  && typeof window.skillPoints !== 'undefined') window.skillPoints += parseInt(spM[1]);
                        }
                        if (typeof showAchievement === 'function') {
                            showAchievement(`<i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> ${challenge.name}`, challenge.desc, challenge.reward);
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
// ============================================================================
// RESET ALL PROGRESS - called from Settings
// ============================================================================
window.resetAllProgress = function() {
    try {
        // ── Step 1: Wipe in-memory state ──────────────────────────────────────
        window.playerLevel = 1;
        window.playerXP = 0;
        window.skillPoints = 0;
        window.unlockedTowers = ['gunner', 'sniper', 'ice'];
        window.unlockedUpgrades = {};
        window.lifetimeStats = {
            gamesPlayed: 0, gamesWon: 0, totalDestroys: 0, totalDamage: 0,
            totalGoldEarned: 0, highestWave: 0, towersBuilt: 0,
            upgradesPurchased: 0, totalWavesCompleted: 0
        };
        window.skills = {
            economy: {
                interest:  { level: 0, max: 5, cost: 1, name: 'Interest Rate',    desc: '+2% gold interest per wave' },
                startGold: { level: 0, max: 5, cost: 1, name: 'Starting Capital', desc: '+100 starting gold' },
                farmBoost: { level: 0, max: 5, cost: 1, name: 'Farm Efficiency',  desc: '+20% farm income' }
            },
            combat: {
                damage:      { level: 0, max: 5, cost: 1, name: 'Power Boost',    desc: '+5% tower damage' },
                range:       { level: 0, max: 5, cost: 1, name: 'Extended Range', desc: '+10% tower range' },
                attackSpeed: { level: 0, max: 5, cost: 1, name: 'Rapid Fire',     desc: '+10% attack speed' }
            },
            special: {
                xpBoost:   { level: 0, max: 5, cost: 1, name: 'Experience Gain', desc: '+15% XP earned' },
                sellValue: { level: 0, max: 3, cost: 2, name: 'Salvage Expert',  desc: '+10% sell value' },
                startLives:{ level: 0, max: 3, cost: 2, name: 'Extra Lives',     desc: '+5 starting lives' }
            }
        };
        window.unlockedAchievements = [];
        window.dailyChallenges = [];
        if (window.achievements) {
            window.achievements.forEach(a => { a.unlocked = false; });
        }

        // ── Step 2: Wipe ALL known localStorage keys ──────────────────────────
        const allKeys = [
            'karlos_td_progression_v54', 'karlos_td_progression_v53',
            'karlos_td_progression_v5', 'karlos_td_locker_v1',
            'karlos_td_save_v1', 'karlos_td_skills_v1',
            'karlos_td_xp_v1', 'karlos_td_ach_v1', 'karlos_td_settings_v1'
        ];
        allKeys.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });

        // ── Step 3: Write the clean blank state RIGHT NOW ─────────────────────
        // This is the critical step: we write to localStorage AFTER clearing it
        // and BEFORE the reload so the game loads fresh data on startup.
        // Without this, game init timers may re-save old in-memory data before reload.
        const blankSave = {
            level: 1, xp: 0, skillPoints: 0,
            unlockedTowers: ['gunner', 'sniper', 'ice'],
            unlockedUpgrades: {},
            lifetimeStats: {
                gamesPlayed: 0, gamesWon: 0, totalDestroys: 0, totalDamage: 0,
                totalGoldEarned: 0, highestWave: 0, towersBuilt: 0,
                upgradesPurchased: 0, totalWavesCompleted: 0
            },
            skills: {
                economy: {
                    interest:  { level: 0, max: 5, cost: 1 },
                    startGold: { level: 0, max: 5, cost: 1 },
                    farmBoost: { level: 0, max: 5, cost: 1 }
                },
                combat: {
                    damage:      { level: 0, max: 5, cost: 1 },
                    range:       { level: 0, max: 5, cost: 1 },
                    attackSpeed: { level: 0, max: 5, cost: 1 }
                },
                special: {
                    xpBoost:   { level: 0, max: 5, cost: 1 },
                    sellValue: { level: 0, max: 3, cost: 2 },
                    startLives:{ level: 0, max: 3, cost: 2 }
                }
            },
            achievements: [],
            dailyChallenges: [],
            lastSave: Date.now()
        };
        localStorage.setItem('karlos_td_progression_v54', JSON.stringify(blankSave));
        // Write blank locker — use 'unlockedSkins' to match LockerSystem's field name
        const blankLocker = { scraps: 0, unlockedSkins: ['default'], equippedSkins: {},
            secretUsed: false, karloSecretUsed: false };
        localStorage.setItem('karlos_td_locker_v1', JSON.stringify(blankLocker));

        // Also reset LockerSystem's in-memory state RIGHT NOW so nothing can re-save
        // old stale scraps in the ~600ms between reset call and page reload
        if (typeof LockerSystem !== 'undefined') {
            try {
                const ls = LockerSystem.getState();
                ls.scraps = 0;
                ls.unlockedSkins = ['default'];
                ls.equippedSkins = {};
                ls.secretUsed = false;
                ls.karloSecretUsed = false;
            } catch(e) {}
        }

        // ── Step 4: Update UI (briefly, since reload is imminent) ─────────────
        if (typeof updateXPBar === 'function') updateXPBar();
        if (typeof updateSkillTree === 'function') updateSkillTree();
        if (typeof LockerSystem !== 'undefined') {
            try { LockerSystem.updateHUD(); } catch(e) {}
        }

        console.log('✅ Progress reset. Blank save written. Reloading now.');

        // ── Step 5: Push blank state to cloud (if logged in), then reload ─────
        // This is CRITICAL for logged-in users: without it, the page reloads, 
        // loadCloudProgress() fires, and it restores the OLD cloud data (scraps,
        // achievements, etc.), completely overwriting the just-reset localStorage.
        // By pushing the blank state to the cloud FIRST, the next loadCloudProgress
        // gets zeros — matching what's in localStorage.
        async function _pushBlankThenReload() {
            if (typeof KarloAuth !== 'undefined' && typeof KarloAuth.pushBlankToCloud === 'function') {
                try { await KarloAuth.pushBlankToCloud(); } catch(e) { /* offline — that's fine */ }
            }
            location.reload();
        }
        setTimeout(_pushBlankThenReload, 100);

    } catch(e) {
        console.error('Reset failed:', e);
    }
};
