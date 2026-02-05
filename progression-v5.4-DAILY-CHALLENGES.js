/**
 * KARLO'S TD - PROGRESSION SYSTEM V5.2
 * 
 * NEW IN V5.2:
 * - Branch upgrades (tier 5 A/B paths) unlock at specific levels
 * - Each tower gets both branches unlocked progressively
 * - UI updates mid-game when upgrades unlock
 * - Level-based unlock system for all 10 towers
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
        console.log('🚀 Initializing Progression V5.2...');

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
        // Each tower gets branch unlocks at specific levels (21-40)
        // Formula: Level 21 + (tower_index * 2) for branch1, +1 for branch2
        if (!window.unlockedUpgrades) {
            window.unlockedUpgrades = {};
            allTowers.forEach(tower => {
                window.unlockedUpgrades[tower] = {
                    branch1: 0, // 0 = locked, 1-4 = unlocked up to that tier, 5 = unlocked tier 5
                    branch2: 0
                };
            });
        }

        // Calculate which level unlocks which branch for which tower
        window.branchUnlockLevels = {};
        allTowers.forEach((tower, index) => {
            window.branchUnlockLevels[tower] = {
                branch1: 21 + (index * 2),      // Branch A
                branch2: 21 + (index * 2) + 1   // Branch B
            };
        });

        if (!window.lifetimeStats) {
            window.lifetimeStats = {
                gamesPlayed: 0, gamesWon: 0, totalKills: 0,
                totalDamage: 0, totalGoldEarned: 0, highestWave: 0
            };
        }

        if (!window.sessionStats) {
            window.sessionStats = {
                kills: 0, damage: 0, wavesCompleted: 0, towersBuilt: 0, upgrades: 0
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
                    xpBoost: { level: 0, max: 5, cost: 1, name: 'Experience Gain', desc: '+15% XP earned' },
                    sellValue: { level: 0, max: 3, cost: 2, name: 'Salvage Expert', desc: '+10% sell value' },
                    startLives: { level: 0, max: 3, cost: 2, name: 'Extra Lives', desc: '+5 starting lives' }
                }
            };
        }

        if (!window.achievementDefinitions) {
            window.achievementDefinitions = [
                { id: 'first_win', name: 'First Victory', desc: 'Win your first game', reward: '200 XP', check: () => lifetimeStats.gamesWon >= 1 },
                { id: 'killer', name: 'Mass Destruction', desc: 'Kill 1000 enemies', reward: '500 XP + 1 SP', check: () => lifetimeStats.totalKills >= 1000 },
                { id: 'rich', name: 'Wealthy Defender', desc: 'Earn 50,000 gold', reward: '300 XP', check: () => lifetimeStats.totalGoldEarned >= 50000 },
                { id: 'survivor', name: 'Wave Master', desc: 'Reach wave 40', reward: '600 XP + 2 SP', check: () => lifetimeStats.highestWave >= 40 },
                { id: 'damage', name: 'Heavy Artillery', desc: 'Deal 100,000 damage', reward: '400 XP + 1 SP', check: () => lifetimeStats.totalDamage >= 100000 }
            ];
        }

        if (!window.unlockedAchievements) window.unlockedAchievements = [];

	if (!window.dailyChallenges) {
            window.dailyChallenges = []; 
        }

	// ============================================
        // DATA PERSISTENCE
        // ============================================
        window.loadPlayerData = function() {
            try {
                const saved = localStorage.getItem('karlos_td_progression_v52');
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
                    dailyChallenges = data.dailyChallenges || dailyChallenges;
                    console.log(`✅ Loaded: Level ${playerLevel}, ${unlockedTowers.length}/10 towers`);
                    console.log('📊 Branch unlocks:', unlockedUpgrades);
                }
		if (window.towerUnlockLevels) {
                    for (const [tower, lvl] of Object.entries(window.towerUnlockLevels)) {
                        // If player level is higher than requirement, but tower is missing...
                        if (window.playerLevel >= lvl && !window.unlockedTowers.includes(tower)) {
                            window.unlockedTowers.push(tower);
                            console.log(`🔄 Retroactively unlocked: ${tower} (Level ${lvl})`);
                        }
                    }
                    // Save immediately so it persists
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
                localStorage.setItem('karlos_td_progression_v52', JSON.stringify(data));
            } catch(e) {
                console.warn('Save failed:', e);
            }
        };

        // ============================================
        // DAILY CHALLENGES - ROTATING POOL
        // ============================================
        
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
        
        // Get today's date string for Middle European Time (CET/CEST)
        window.getTodayDateString = function() {
            const now = new Date();
            // Convert to CET/CEST (UTC+1/UTC+2)
            // Get UTC time and add 1 hour for CET (we'll handle DST separately)
            const cetOffset = 1; // Standard CET offset
            const cetTime = new Date(now.getTime() + (cetOffset * 60 * 60 * 1000));
            
            // Check if we're past noon CET (12:00)
            // If current hour is less than 12, use yesterday's date for challenges
            const year = cetTime.getUTCFullYear();
            const month = cetTime.getUTCMonth();
            const day = cetTime.getUTCDate();
            const hour = cetTime.getUTCHours();
            
            // If before noon CET, use yesterday's date
            const adjustedDate = new Date(Date.UTC(year, month, day));
            if (hour < 11) { // 11 UTC = 12 CET
                adjustedDate.setUTCDate(adjustedDate.getUTCDate() - 1);
            }
            
            return adjustedDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD
        };
        
        // Generate 3 random challenges for today
        window.generateDailyChallenges = function() {
            const dateString = getTodayDateString();
            
            // Use date as seed for consistent random selection per day
            let seed = 0;
            for (let i = 0; i < dateString.length; i++) {
                seed = ((seed << 5) - seed) + dateString.charCodeAt(i);
                seed = seed & seed; // Convert to 32-bit integer
            }
            
            // Seeded random function
            const seededRandom = function() {
                seed = (seed * 9301 + 49297) % 233280;
                return seed / 233280;
            };
            
            // Shuffle challenge pool using seeded random
            const shuffled = [...challengePool];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // Take first 3 challenges (ensuring variety)
            const selected = [];
            const usedTracks = new Set();
            
            for (const challenge of shuffled) {
                if (selected.length >= 3) break;
                
                // Try to get variety in challenge types
                if (selected.length < 2 || !usedTracks.has(challenge.track)) {
                    selected.push({...challenge}); // Clone the challenge
                    usedTracks.add(challenge.track);
                }
            }
            
            // If we don't have 3 yet (shouldn't happen), fill with remaining
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
            
            // If new day or never initialized, generate new challenges
            if (lastRefresh !== today || !window.dailyChallenges || window.dailyChallenges.length === 0) {
                console.log(`📅 New day detected! Generating fresh challenges for ${today}`);
                window.dailyChallenges = generateDailyChallenges();
                localStorage.setItem('karlos_td_challenge_date', today);
                
                if (typeof savePlayerData === 'function') {
                    savePlayerData();
                }
            } else {
                console.log(`✅ Challenges already set for today (${today})`);
            }
        };

        // ============================================
        // XP & LEVELING
        // ============================================
        window.getXPNeeded = function(level) {
            return Math.floor(100 * Math.pow(1.12, level - 1));
        };

        window.addXP = function(amount) {
            try {
                const xpBoost = 1 + (skills.special.xpBoost.level * 0.15);
                amount = Math.floor(amount * xpBoost);
                playerXP += amount;
                
                const xpNeeded = getXPNeeded(playerLevel);
                while (playerXP >= xpNeeded) {
                    playerXP -= xpNeeded;
                    playerLevel++;
                    
                    const rewards = calculateLevelRewards(playerLevel);
                    showLevelUpPopup(playerLevel, rewards);
                    applyLevelRewards(rewards);
                    
                    playSound('levelup');
                }
                
                updatePlayerLevelUI();
                savePlayerData();
            } catch(e) {
                console.warn('AddXP error:', e);
            }
        };

        window.calculateLevelRewards = function(level) {
    const rewards = [];
    
    try {
        // Tower unlocks (levels 1-20)
        for (const [towerName, unlockLevel] of Object.entries(towerUnlockLevels)) {
            // FIX: Removed "&& !unlockedTowers.includes(towerName)"
            // Now it shows the tower reward even if you already have it!
            if (level === unlockLevel) {
                rewards.push({ type: 'tower', name: towerName, icon: '🏰' });
            }
        }
        
        // Branch upgrade unlocks (levels 21-40)
        allTowers.forEach(tower => {
            const branch1Level = branchUnlockLevels[tower].branch1;
            const branch2Level = branchUnlockLevels[tower].branch2;
            
            if (level === branch1Level) {
                rewards.push({ 
                    type: 'upgrade', 
                    tower: tower, 
                    branch: 'branch1',
                    branchName: 'Path A',
                    icon: '⬆️' 
                });
            }
            
            if (level === branch2Level) {
                rewards.push({ 
                    type: 'upgrade', 
                    tower: tower, 
                    branch: 'branch2',
                    branchName: 'Path B',
                    icon: '⬆️' 
                });
            }
        });
        
        // Skill points every 5 levels
        if (level % 5 === 0) {
            rewards.push({ type: 'skillpoints', amount: 2, icon: '⭐' });
        }
        
        // Bonus XP every 10 levels
        if (level % 10 === 0) {
            rewards.push({ type: 'bonus', name: 'Bonus XP', amount: level * 50, icon: '✨' });
        }
    } catch(e) {
        console.warn('Calculate rewards error:', e);
    }
    
    return rewards;
};
        window.applyLevelRewards = function(rewards) {
            try {
                let needsUIRefresh = false;
                
                rewards.forEach(reward => {
                    if (reward.type === 'tower') {
                        if (!unlockedTowers.includes(reward.name)) {
                            unlockedTowers.push(reward.name);
                            needsUIRefresh = true;
                            console.log(`🏰 Unlocked tower: ${reward.name}`);
                        }
                    } else if (reward.type === 'upgrade') {
                        // Unlock branch upgrade (tier 5)
                        if (unlockedUpgrades[reward.tower]) {
                            unlockedUpgrades[reward.tower][reward.branch] = 5; // Unlock tier 5 branch
                            needsUIRefresh = true;
                            console.log(`⬆️ Unlocked ${reward.tower} ${reward.branchName} (tier 5)`);
                        }
                    } else if (reward.type === 'skillpoints') {
                        skillPoints += reward.amount;
                    }
                });
                
                // Refresh UI if needed
                if (needsUIRefresh) {
                    // Refresh tower grid
                    if (typeof populateTowerGrid === 'function') {
                        populateTowerGrid();
                    }
                    
                    // Refresh inspect panel if tower is selected
                    if (typeof selectedTower !== 'undefined' && selectedTower && typeof updateInspect === 'function') {
                        updateInspect();
                    }
                }
                
                savePlayerData();
            } catch(e) {
                console.warn('Apply rewards error:', e);
            }
        };

        window.showLevelUpPopup = function(level, rewards) {
            try {
                const popup = document.getElementById('level-up-popup');
                if (!popup) return;
                
                const levelText = document.getElementById('levelup-level');
                const rewardsList = document.getElementById('levelup-rewards');
                
                if (levelText) levelText.innerText = level;
                if (rewardsList) {
                    rewardsList.innerHTML = '';
                    
                    if (rewards.length === 0) {
                        rewardsList.innerHTML = '<div class="reward-item">🎯 Keep playing to unlock rewards!</div>';
                    } else {
                        rewards.forEach(reward => {
                            const div = document.createElement('div');
                            div.className = 'reward-item';
                            
                            if (reward.type === 'tower') {
                                div.innerHTML = `${reward.icon} <span>New Tower: <strong>${reward.name.toUpperCase()}</strong></span>`;
                            } else if (reward.type === 'upgrade') {
                                div.innerHTML = `${reward.icon} <span><strong>${reward.tower.toUpperCase()}</strong> ${reward.branchName} Unlocked</span>`;
                            } else if (reward.type === 'skillpoints') {
                                div.innerHTML = `${reward.icon} <span><strong>+${reward.amount} Skill Points</strong></span>`;
                            } else if (reward.type === 'bonus') {
                                div.innerHTML = `${reward.icon} <span>${reward.name}: <strong>+${reward.amount} XP</strong></span>`;
                            }
                            
                            rewardsList.appendChild(div);
                        });
                    }
                }
                
                popup.classList.add('show');
                setTimeout(() => popup.classList.remove('show'), 6000);
            } catch(e) {
                console.warn('Show popup error:', e);
            }
        };

        window.closeLevelUpPopup = function() {
            try {
                const popup = document.getElementById('level-up-popup');
                if (popup) popup.classList.remove('show');
            } catch(e) {}
        };

        window.updatePlayerLevelUI = function() {
            try {
                const badge = document.getElementById('player-level-badge');
                const fill = document.getElementById('xp-bar-fill');
                const text = document.getElementById('xp-bar-text');
                
                if (badge) badge.innerText = `LVL ${playerLevel}`;
                
                const xpNeeded = getXPNeeded(playerLevel);
                const xpPercent = Math.min(100, (playerXP / xpNeeded) * 100);
                
                if (fill) fill.style.width = xpPercent + '%';
                if (text) text.innerText = `${playerXP}/${xpNeeded}`;
            } catch(e) {
                console.warn('Update UI error:', e);
            }
        };

        window.forceXPBarVisible = function() {
            try {
                const bar = document.getElementById('player-level-container');
                if (bar) {
                    bar.style.display = 'flex';
                    bar.style.visibility = 'visible';
                    bar.style.opacity = '1';
                    bar.style.pointerEvents = 'auto';
                }
            } catch(e) {}
        };

        // ============================================
        // TROPHY ROAD
        // ============================================
        window.openTrophyRoad = function() {
            try {
                console.log('🏆 Trophy Road clicked! gameRunning:', typeof gameRunning !== 'undefined' ? gameRunning : 'undefined');
                
                // Only allow opening trophy road when not in a game
                if (typeof gameRunning !== 'undefined' && gameRunning) {
                    console.log('⚠️ Trophy Road disabled during gameplay');
                    return;
                }
                
                const modal = document.getElementById('trophy-road-modal');
                if (!modal) {
                    console.warn('❌ Trophy road modal not found!');
                    return;
                }
                
                const container = document.getElementById('trophy-road-container');
                if (!container) {
                    console.warn('❌ Trophy road container not found!');
                    return;
                }
                
                console.log('✅ Opening trophy road...');
                container.innerHTML = '';
                
                // Generate milestones up to level 50
                for (let level = 1; level <= 50; level++) {
                    const rewards = calculateLevelRewards(level);
                    if (rewards.length === 0) continue;
                    
                    const milestone = document.createElement('div');
                    milestone.className = 'trophy-milestone';
                    if (playerLevel >= level) milestone.classList.add('unlocked');
                    
                    const rewardText = rewards.map(r => {
                        if (r.type === 'tower') return `🏰 ${r.name.toUpperCase()}`;
                        if (r.type === 'upgrade') return `⬆️ ${r.tower.toUpperCase()} ${r.branchName}`;
                        if (r.type === 'skillpoints') return `⭐ ${r.amount} SP`;
                        if (r.type === 'bonus') return `✨ ${r.amount} XP`;
                        return '';
                    }).join(', ');
                    
                    milestone.innerHTML = `
    			<div class="milestone-level"><span>${level}</span></div>
    			<div class="milestone-rewards">${rewardText}</div>
		    `;
                    
                    container.appendChild(milestone);
                }
                
                modal.style.display = 'flex';
                console.log('✅ Trophy road opened successfully!');
            } catch(e) {
                console.error('❌ Trophy road error:', e);
            }
        };

        window.closeTrophyRoad = function() {
            try {
                const modal = document.getElementById('trophy-road-modal');
                if (modal) modal.style.display = 'none';
            } catch(e) {}
        };

        // ============================================
        // SKILL TREE
        // ============================================
        window.openSkillTree = function() {
            try {
                const modal = document.getElementById('skill-tree-modal');
                if (modal) {
                    modal.style.display = 'flex';
                    updateSkillTreeUI();
                }
            } catch(e) {
                console.warn('Open skill tree error:', e);
            }
        };

        window.closeSkillTree = function() {
            try {
                const modal = document.getElementById('skill-tree-modal');
                if (modal) modal.style.display = 'none';
            } catch(e) {}
        };

        window.updateSkillTreeUI = function() {
            try {
                const pointsDisplay = document.getElementById('skill-points-count');
                if (pointsDisplay) pointsDisplay.innerText = skillPoints;
                populateSkillTree();
            } catch(e) {
                console.warn('Update skill tree error:', e);
            }
        };

        window.populateSkillTree = function() {
            try {
                const categories = {
                    economy: document.getElementById('economy-skills'),
                    combat: document.getElementById('combat-skills'),
                    special: document.getElementById('special-skills')
                };

                for (const [category, container] of Object.entries(categories)) {
                    if (!container) continue;
                    container.innerHTML = '';
                    
                    for (const [key, skill] of Object.entries(skills[category])) {
                        const div = document.createElement('div');
                        div.className = 'skill-item';
                        
                        if (skill.level >= skill.max) {
                            div.classList.add('skill-maxed');
                        } else if (skillPoints < skill.cost) {
                            div.classList.add('skill-locked');
                        }

                        div.innerHTML = `
                            <div class="skill-name">${skill.name}</div>
                            <div class="skill-desc">${skill.desc}</div>
                            <div class="skill-level">Level: ${skill.level}/${skill.max}</div>
                            ${skill.level < skill.max ? `<div class="skill-cost">Cost: ${skill.cost} SP</div>` : '<div class="skill-cost" style="color: #2ecc71;">MAXED!</div>'}
                        `;

                        if (skill.level < skill.max && skillPoints >= skill.cost) {
                            div.onclick = () => upgradeSkill(category, key);
                        }

                        container.appendChild(div);
                    }
                }
            } catch(e) {
                console.warn('Populate skill tree error:', e);
            }
        };

        window.upgradeSkill = function(category, key) {
            try {
                const skill = skills[category][key];
                
                if (skill.level >= skill.max || skillPoints < skill.cost) return;

                skillPoints -= skill.cost;
                skill.level++;
                
                updateSkillTreeUI();
                savePlayerData();
                playSound('upgrade');
                
                console.log(`✅ ${skill.name} → Level ${skill.level}`);
            } catch(e) {
                console.warn('Upgrade skill error:', e);
            }
        };

        // ============================================
        // CHALLENGES
        // ============================================
        window.openChallenges = function() {
            try {
                // Check if it's a new day and refresh challenges if needed
                initDailyChallenges();
                
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
                console.warn('Update challenges error:', e);
            }
        };

        window.updateChallengeProgress = function(type, value) {
            try {
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
                            skillPoints++;
                        }

                        showAchievement(`✅ ${challenge.name}`, challenge.desc, challenge.reward);
                        savePlayerData();
                    }
                });
                
                // Update challenges UI to show progress
                updateChallengesUI();
            } catch(e) {}
        };

        // ============================================
        // ACHIEVEMENTS
        // ============================================
        window.checkAchievements = function() {
            try {
                achievementDefinitions.forEach(achDef => {
                    if (unlockedAchievements.includes(achDef.id)) return;
                    
                    if (achDef.check && achDef.check()) {
                        unlockedAchievements.push(achDef.id);
                        showAchievement(`🏆 ${achDef.name}`, achDef.desc, achDef.reward);
                        
                        if (achDef.reward.includes('XP')) {
                            const xp = parseInt(achDef.reward.match(/\d+/)[0]);
                            addXP(xp);
                        }
                        
                        if (achDef.reward.includes('SP')) {
                            const match = achDef.reward.match(/(\d+) SP/);
                            if (match) skillPoints += parseInt(match[1]);
                        }
                        
                        savePlayerData();
                    }
                });
            } catch(e) {}
        };

        window.showAchievement = function(title, desc, reward) {
            try {
                const popup = document.getElementById('achievement-popup');
                if (!popup) return;

                const titleEl = popup.querySelector('.achievement-title');
                const descEl = document.getElementById('achievement-desc-text');
                const rewardEl = document.getElementById('achievement-reward-text');
                
                if (titleEl) titleEl.innerText = title;
                if (descEl) descEl.innerText = desc;
                if (rewardEl) rewardEl.innerText = `Reward: ${reward}`;
                
                popup.classList.add('show');
                setTimeout(() => popup.classList.remove('show'), 5000);
                playSound('levelup');
            } catch(e) {}
        };

	window.openAchievements = function() {
        if (typeof gameRunning !== 'undefined' && gameRunning) return; // Block opening in game

        const modal = document.getElementById('achievements-modal');
        const list = document.getElementById('achievements-list');
        if (!modal || !list) return;

        list.innerHTML = ''; 

        window.achievementDefinitions.forEach(ach => {
            const isUnlocked = window.unlockedAchievements.includes(ach.id);
            const div = document.createElement('div');
            div.style.cssText = `display: flex; align-items: center; gap: 15px; background: ${isUnlocked ? 'linear-gradient(90deg, #1e3a8a, #1e293b)' : '#334155'}; padding: 12px; border-radius: 12px; border: 2px solid ${isUnlocked ? '#f1c40f' : '#000'}; opacity: ${isUnlocked ? '1' : '0.7'};`;
            
            div.innerHTML = `
                <div style="font-size: 24px; filter: ${isUnlocked ? 'none' : 'grayscale(1)'};">${isUnlocked ? '🏆' : '🔒'}</div>
                <div style="flex: 1;">
                    <div style="color: ${isUnlocked ? '#f1c40f' : '#fff'}; font-weight: bold; font-size: 14px;">${ach.name}</div>
                    <div style="color: #cbd5e1; font-size: 12px;">${ach.desc}</div>
                </div>
                <div style="background: ${isUnlocked ? '#f1c40f' : '#475569'}; color: ${isUnlocked ? '#000' : '#cbd5e1'}; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold;">${isUnlocked ? 'COMPLETED' : ach.reward}</div>
            `;
            list.appendChild(div);
        });
        modal.style.display = 'flex';
    };

    window.closeAchievements = function() {
        const modal = document.getElementById('achievements-modal');
        if (modal) modal.style.display = 'none';
    };

        // ============================================
        // UTILITY
        // ============================================
        window.playSound = function(soundName) {
            try {
                if (typeof AudioSys !== 'undefined' && AudioSys.playSound) {
                    AudioSys.playSound(soundName);
                }
            } catch(e) {}
        };

        // ============================================
        // GAME HOOKS
        // ============================================
        
        const originalDamageEnemy = window.damageEnemy;
        if (originalDamageEnemy) {
            window.damageEnemy = function(enemy, damage, splash, slow, stun, tower) {
                try {
                    const isMultiplayer = typeof currentGamemode !== 'undefined' && 
                                         (currentGamemode === 'shared' || currentGamemode === 'coop');
                    if (!isMultiplayer) {
                        damage = damage * (1 + skills.combat.damage.level * 0.05);
                    }
                    
                    sessionStats.damage += damage;
                    lifetimeStats.totalDamage += damage;
                    updateChallengeProgress('damage', sessionStats.damage);
                    
                    const hpBefore = enemy.hp;
                    const result = originalDamageEnemy.call(this, enemy, damage, splash, slow, stun, tower);
                    
                    if (hpBefore > 0 && enemy.hp <= 0) {
                        sessionStats.kills++;
                        lifetimeStats.totalKills++;
                        addXP(5);
                        updateChallengeProgress('kills', sessionStats.kills);
                        checkAchievements();
                    }
                    
                    return result;
                } catch(e) {
                    return originalDamageEnemy.call(this, enemy, damage, splash, slow, stun, tower);
                }
            };
            console.log('✅ Hooked damageEnemy');
        }

        const originalStartWave = window.startWave;
        if (originalStartWave) {
            window.startWave = function() {
                try {
                    const currentWave = window.wave || 0;
                    
                    if (currentWave > 0) {
                        sessionStats.wavesCompleted++;
                        addXP(10 + (currentWave * 2));
                        updateChallengeProgress('waves', sessionStats.wavesCompleted);
                    }
                    
                    lifetimeStats.highestWave = Math.max(lifetimeStats.highestWave, currentWave);
                    checkAchievements();
                } catch(e) {}
                
                return originalStartWave.apply(this, arguments);
            };
            console.log('✅ Hooked startWave');
        }

        window.trackTowerBuilt = function() {
            try {
                if (typeof towers !== 'undefined') {
                    sessionStats.towersBuilt = towers.length;
                    updateChallengeProgress('towers', sessionStats.towersBuilt);
                }
            } catch(e) {}
        };

        // ============================================
        // INITIALIZATION
        // ============================================
        try {
            loadPlayerData();
	    initDailyChallenges();
            updatePlayerLevelUI();
            
            const levelContainer = document.getElementById('player-level-container');
            if (levelContainer) {
                levelContainer.style.display = 'flex';
                levelContainer.style.visibility = 'visible';
                levelContainer.style.opacity = '1';
                levelContainer.style.pointerEvents = 'auto';
                levelContainer.onclick = openTrophyRoad;
                levelContainer.style.cursor = 'pointer';
            }
            
            setInterval(forceXPBarVisible, 300);
            
            const skillNotify = document.getElementById('skill-points-notify');
            if (skillNotify) {
                skillNotify.remove();
                console.log('✅ Removed skill points popup');
            }
            
            setInterval(() => {
                try {
                    checkAchievements();
                } catch(e) {}
            }, 5000);
            
            setInterval(() => {
                try {
                    savePlayerData();
                } catch(e) {}
            }, 30000);
            
            sessionStats.kills = 0;
            sessionStats.damage = 0;
            sessionStats.wavesCompleted = 0;
            sessionStats.towersBuilt = 0;
            sessionStats.upgrades = 0;
            
            window.openSkillTree = openSkillTree;
            window.openChallenges = openChallenges;
            window.closeLevelUpPopup = closeLevelUpPopup;
            window.closeTrophyRoad = closeTrophyRoad;
            window.openTrophyRoad = openTrophyRoad;
            
            console.log(`✅ V5.2 Ready!`);
            console.log(`Level ${playerLevel} | ${unlockedTowers.length}/10 towers | ${skillPoints} SP`);
            console.log('Branch unlocks:', branchUnlockLevels);
        } catch(e) {
            console.error('Init error:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForGame);
    } else {
        waitForGame();
    }

    // FORCE MENU BUTTONS TO WORK IMMEDIATELY
        setTimeout(() => {
            const ids = ['btn-multiplayer', 'btn-skills', 'btn-challenges', 'btn-settings', 'btn-credits'];
            ids.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    // Force pointer events
                    btn.style.pointerEvents = 'auto';
                    btn.style.zIndex = '10001'; // Bring above any invisible overlays
                    btn.style.cursor = 'pointer';
                    
                    // Re-attach clicks manually just in case
                    if (id === 'btn-skills') btn.onclick = window.openSkillTree;
                    if (id === 'btn-challenges') btn.onclick = window.openChallenges;
                }
            });
            console.log('✅ Menu buttons activated forcedly');
        }, 500);

    console.log('🎉 Progression V5.2 Loading...');

    // FORCE APPLY BONUSES (Enhanced with UI Force Update)
    window.applySkillBonuses = function() {
        console.log('⚡ Applying Skill Bonuses...');
        try {
            // 1. Starting Gold (Economy)
            if (skills.economy && skills.economy.startGold.level > 0) {
                const bonus = skills.economy.startGold.level * 100;
                window.gold += bonus; 
                console.log(`💰 Added ${bonus} Gold. New Total: ${window.gold}`);
                
                // FORCE UI UPDATE (Directly targeting the HTML)
                const uiGold = document.getElementById('ui-gold');
                if(uiGold) uiGold.innerText = Math.floor(window.gold);
            }

            // 2. Starting Lives (Special)
            if (skills.special && skills.special.startLives.level > 0) {
                const bonus = skills.special.startLives.level * 5;
                window.lives += bonus;
                console.log(`❤️ Added ${bonus} Lives. New Total: ${window.lives}`);
                
                // FORCE UI UPDATE
                const uiLives = document.getElementById('ui-lives');
                if(uiLives) uiLives.innerText = Math.floor(window.lives);
            }
            
        } catch(e) {
            console.warn('Bonus Application Error:', e);
        }
    };

})();