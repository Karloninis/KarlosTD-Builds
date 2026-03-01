// ============================================================================
// Config.js - Global constants, game settings, and data tables
// ============================================================================

// GameJolt Credentials
// ⚠️ SECURITY WARNING: Never expose private keys in client-side code!
// These should be handled by a backend API for security.
const GAMEJOLT_GAME_ID = '1049499';
// PRIVATE_KEY removed - implement backend endpoint at /api/gamejolt instead

        /** --- CONFIG --- */
        const MAX_LEVEL = 5;
        const GRID_SIZE = 4;
        const ROAD_WIDTH = 4.0;
        
        let GAME_CONFIG = { maxWaves: 20, hpMult: 1.0, costMult: 1.0, gold: 650 };
        const ENEMIES = {
            red:    { color: 0xff0000, hp: 20, speed: 0.22, size: 1.0, score: 5 },
            blue:   { color: 0x3498db, hp: 35, speed: 0.30, size: 0.9, score: 10 },
            green:  { color: 0x27ae60, hp: 60, speed: 0.25, size: 1.0, score: 15 },
            yellow: { color: 0xf1c40f, hp: 40, speed: 0.55, size: 0.8, score: 20 },
            white:  { color: 0xecf0f1, hp: 30, speed: 0.50, size: 0.8, score: 20 },
            pink:   { color: 0xff69b4, hp: 25, speed: 0.75, size: 0.7, score: 25 },
            'shadow interceptor':  { color: 0x222222, hp: 120,speed: 0.20, size: 1.0, score: 30 },
            tank:   { color: 0x7f8c8d, hp: 300,speed: 0.15, size: 1.2, score: 40 }, // Armored
            zebra:  { color: 0xbdc3c7, hp: 140,speed: 0.40, size: 1.1, score: 40 },
            rainbow:{ color: 0xe67e22, hp: 230,speed: 0.55, size: 1.1, score: 50 },
            omnicrawler:{ color: 0xd35400, hp: 800,speed: 0.20, size: 1.3, score: 100 },
            
            // BOSSES
            'siege walker':   { color: 0x3498db, hp: 3000, speed: 0.15, size: 2.5, score: 500, type:'boss' },
            'dreadnought':    { color: 0xe74c3c, hp: 8000, speed: 0.10, size: 3.5, score: 1000, type:'boss' },
            'the obliterator':   { color: 0x27ae60, hp: 20000,speed: 0.08, size: 4.5, score: 3000, type:'boss' },
            'void stalker':    { color: 0x2c3e50, hp: 5000, speed: 0.45, size: 2.0, score: 2000, type:'boss' },
            'entropy monolith':    { color: 0x8e44ad, hp: 50000,speed: 0.05, size: 6.0, score: 10000, type:'boss' },

	    // SPECIALS
            healer: { color: 0x00ff00, hp: 200, speed: 0.25, size: 1.3, score: 60, type:'special', ability:'heal' },
            disruptor:{ color: 0x00ffff, hp: 300, speed: 0.35, size: 1.1, score: 70, type:'special', ability:'stun' },
            summoner: { color: 0x8e44ad, hp: 750,speed: 0.15, size: 1.6, score: 100,type:'special', ability:'summon' },
        };

	const TOWER_UPGRADES = {
            gunner: {
                A: { name: "Doomsday", desc: "Huge Damage & Splash", dmgMult: 4.0, rateMult: 1.5, rangeMult: 1.2, splash: 6, color: 0x2c3e50, cost: 2300 },
                B: { name: "Shredder", desc: "Insane Fire Rate", dmgMult: 0.8, rateMult: 0.25, rangeMult: 1.0, color: 0xc0392b, cost: 2900 }
            },
            sniper: {
                A: { name: "Cripple", desc: "Stuns MOABs", dmgMult: 1.5, rateMult: 1.0, rangeMult: 1.2, special: 'stun_boss', color: 0x8e44ad, cost: 3500 },
                B: { name: "Elite", desc: "Full Auto Fire", dmgMult: 0.6, rateMult: 0.3, rangeMult: 1.0, color: 0xf1c40f, cost: 3200 }
            },
            minigun: {
                A: { name: "Vulcan", desc: "No Spread Stream", dmgMult: 1.5, rateMult: 0.8, rangeMult: 1.2, color: 0xe67e22, cost: 4200 },
                B: { name: "Rockets", desc: "Explosive Rounds", dmgMult: 3.0, rateMult: 2.0, rangeMult: 1.0, splash: 5, color: 0x7f8c8d, cost: 4800 }
            },
            cannon: {
                A: { name: "Howitzer", desc: "Massive Explosions", dmgMult: 2.5, rateMult: 1.2, rangeMult: 1.3, splash: 10, color: 0x34495e, cost: 3800 },
                B: { name: "Grapeshot", desc: "Triple Cannonballs", dmgMult: 0.7, rateMult: 0.4, rangeMult: 1.0, splash: 4, color: 0x7f8c8d, cost: 3200 }
            },
            flamethrower: {
                A: { name: "Dragon's Breath", desc: "Long Lasting Burns", dmgMult: 1.5, rateMult: 1.0, rangeMult: 1.3, dotAdd: 5, dotDurMult: 2.5, color: 0xff6600, cost: 4200 },
                B: { name: "Ring of Fire", desc: "360° Inferno", dmgMult: 0.8, rateMult: 0.5, rangeMult: 0.8, special: 'area_fire', color: 0xffaa00, cost: 3800 }
            },
            mortar: {
                A: { name: "Nuke", desc: "Massive Nuke", dmgMult: 5.0, rateMult: 1.5, rangeMult: 1.2, splash: 15, color: 0x27ae60, cost: 5500 },
                B: { name: "Battery", desc: "Triple Shot", dmgMult: 0.8, rateMult: 0.3, rangeMult: 1.0, color: 0x2980b9, cost: 4500 }
            },
            tesla: {
                A: { name: "Superbolt", desc: "Chains 10 Enemies", dmgMult: 1.2, rateMult: 1.0, chainAdd: 7, color: 0x3498db, cost: 4900 },
                B: { name: "Plasma Arc", desc: "Single Target Melter", dmgMult: 4.0, rateMult: 0.8, chainSet: 1, color: 0x9b59b6, cost: 5800 }
            },
            ice: {
                A: { name: "Absolute Zero", desc: "Freeze Aura", dmgMult: 1.0, rateMult: 1.0, slowAdd: 0.3, rangeMult: 1.5, color: 0x00cec9, cost: 3000 },
                B: { name: "Icicles", desc: "Shoots Spikes", dmgMult: 5.0, rateMult: 0.5, rangeMult: 1.2, color: 0xffffff, cost: 3800 }
            },
            laser: {
                A: { name: "Death Ray", desc: "Insta-Destroy Damage", dmgMult: 5.0, rateMult: 1.0, rangeMult: 1.2, color: 0xff0000, cost: 6500 },
                B: { name: "Splitter", desc: "Hits 3 Targets", dmgMult: 0.8, rateMult: 1.0, rangeMult: 1.0, special: 'multi_target', color: 0xe91e63, cost: 5200 }
            },
            plasma: {
                A: { name: "Sun God", desc: "Massive Area", dmgMult: 2.0, rateMult: 1.0, splash: 10, color: 0xf1c40f, cost: 12500 },
                B: { name: "Black Hole", desc: "90% Slow Field", dmgMult: 0.5, rateMult: 0.5, splash: 6, special: 'black_hole', color: 0x000000, cost: 16000 }
            },
            farm: {
                A: { name: "Bank", desc: "Huge Payouts", incomeAdd: 150, rateMult: 1.5, color: 0xf39c12, cost: 3500 },
                B: { name: "Factory", desc: "Fast Production", incomeAdd: 50, rateMult: 0.5, color: 0x7f8c8d, cost: 4200 }
            }
        };

        const TOWERS = {
            // Global rebalance: slightly higher base costs to reduce extreme early-game spam on all difficulties
            gunner: { name: "Gunner", cost: 130, range: 14, dmg: 10, rate: 0.8, color: 0x7f8c8d, category: 'offense', hotkey: '1' },
            sniper: { name: "Ranger", cost: 280, range: 40, dmg: 50, rate: 2.5, color: 0x27ae60, category: 'offense', hotkey: '2' },
            ice:    { name: "Cryo",   cost: 330, range: 12, dmg: 5,  rate: 1.0, color: 0x00cec9, slow: 0.5, stunChance: 0.1, stunDur: 0.5, category: 'support', hotkey: '3' },
            minigun:{ name: "Gatling",cost: 430, range: 12, dmg: 4,  rate: 0.1, color: 0xf39c12, category: 'offense', hotkey: '4' },
            cannon: { name: "Cannon", cost: 500, range: 18, dmg: 30, rate: 2.0, color: 0x3d3d3d, splash: 6, category: 'offense', hotkey: '5' },
            flamethrower: { name: "Inferno", cost: 600, range: 10, dmg: 0.5, rate: 0.1, color: 0xff4500, dot: 2, dotDuration: 3.0, category: 'special', hotkey: 'Q' },
            mortar: { name: "Mortar", cost: 550, range: 50, dmg: 60, rate: 3.5, color: 0x34495e, splash: 10, minRange: 12, category: 'offense', hotkey: '6' },
            tesla:  { name: "Tesla",  cost: 700, range: 12, dmg: 15, rate: 0.9, color: 0x3498db, chain: 3, jump: 6, category: 'special', hotkey: '7' },
            laser:  { name: "Laser",  cost: 800, range: 16, dmg: 2,  rate: 0.05,color: 0xe74c3c, category: 'special', hotkey: '8' },
            plasma: { name: "Plasma", cost: 1300,range: 14, dmg: 60, rate: 1.5, color: 0x9b59b6, splash: 5, category: 'special', hotkey: '9' },
            farm:   { name: "Farm",   cost: 550, range: 0,  dmg: 0,  rate: 5.0, color: 0x27ae60, income: 40, category: 'economy', hotkey: '0' }
        };