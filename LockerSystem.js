// ============================================================================
// LockerSystem.js — Scrap & Skin Progression System
// ============================================================================

// ── Default tower colours (mirror of TOWERS config) ──────────────────────────
// Used to render the correct default swatch in the Locker panel.
window.TOWER_DEFAULT_COLORS = {
    gunner:       { hex: '#7f8c8d', label: 'Slate Grey'     },
    sniper:       { hex: '#27ae60', label: 'Forest Green'    },
    ice:          { hex: '#00cec9', label: 'Arctic Teal'     },
    minigun:      { hex: '#f39c12', label: 'Amber Orange'    },
    cannon:       { hex: '#95a5a6', label: 'Brushed Silver'  },
    flamethrower: { hex: '#ff4500', label: 'Lava Orange'     },
    mortar:       { hex: '#34495e', label: 'Dark Slate'      },
    tesla:        { hex: '#3498db', label: 'Electric Blue'   },
    laser:        { hex: '#e74c3c', label: 'Laser Red'       },
    plasma:       { hex: '#9b59b6', label: 'Deep Violet'     },
    farm:         { hex: '#27ae60', label: 'Grass Green'     },
};

// ── Skin Catalogue ────────────────────────────────────────────────────────────
// TIER SYSTEM:
//   COMMON    (grey/white) — Pure flat recolor. Same geometry, same materials, new solid paint.
//                            No special metalness/roughness tricks, no emissive. Cheap.
//   RARE      (blue)       — Material + finish transformation: metalness, roughness, subtle emissive.
//                            Camo patterns that affect only the head mesh count as rare.
//   EPIC      (purple)     — Multi-tone full-body camo (head + base), heavy material combos,
//                            or strong dual-material effects that change the silhouette feel.
//   LEGENDARY (gold)       — Full geometry remodel (skinType:'remodel').
//                            Entirely new model, new materials, extreme emissive glow.

window.SKIN_CATALOG = {

  // ═══════ GUNNER (default: slate grey #7f8c8d) ══════════════════════════════

  gunner_olive: {
    id:'gunner_olive', towerType:'gunner', rarity:'common', cost:35,
    name:'Olive Drab',
    desc:'Standard military olive — flat, functional, no frills.',
    mainColor: 0x6B7C3A, metalness:0.15, roughness:0.85,
  },
  gunner_crimson: {
    id:'gunner_crimson', towerType:'gunner', rarity:'common', cost:40,
    name:'Crimson Guard',
    desc:'Deep, dark crimson armour — the colour of dried blood on steel.',
    mainColor: 0xA50014, metalness:0.15, roughness:0.85,
  },
  gunner_cobalt: {
    id:'gunner_cobalt', towerType:'gunner', rarity:'common', cost:40,
    name:'Cobalt Unit',
    desc:'Hard cobalt-blue coat — standard arctic operations colour.',
    mainColor: 0x0047AB, metalness:0.15, roughness:0.82,
  },
  gunner_camo: {
    id:'gunner_camo', towerType:'gunner', rarity:'rare', cost:110,
    skinType:'camo',
    name:'Jungle Camo',
    desc:'Full-body jungle camo — base AND head repainted in 5-tone olive/mud/shadow pattern.',
    mainColor: 0x4A5240,
    camoPalette: [0x3d4a2a, 0x5c4a1e, 0x8a7048, 0x252c1a, 0x6b5f2e],
  },
  gunner_molten: {
    id:'gunner_molten', towerType:'gunner', rarity:'epic', cost:250,
    skinType:'remodel',
    name:'Molten Core',
    desc:'The armour has cracked open. A glowing magma core pulses at the center, lava seams split every panel, and the barrel runs red-hot.',
    mainColor: 0x0d0805,
    emissive: 0xFF4500, emissiveIntensity:1.8,
  },
  gunner_voidstrike: {
    id:'gunner_voidstrike', towerType:'gunner', rarity:'legendary', cost:380,
    skinType:'remodel',
    name:'Void Strike',
    desc:'Obsidian hex-platform with 6 plasma orbs at the corners, dual void-black barrels with glowing purple seams, and a custom dark-matter housing. Pure darkness weaponized.',
    mainColor: 0x0D0010, metalness:0.9, roughness:0.1,
    emissive: 0x4400AA, emissiveIntensity:0.6,
  },

  // ═══════ SNIPER / RANGER (default: forest green #27ae60) ═══════════════════

  sniper_tan: {
    id:'sniper_tan', towerType:'sniper', rarity:'common', cost:35,
    name:'Field Tan',
    desc:'Flat tan — the most common field-issue colour worldwide.',
    mainColor: 0xB8934A, metalness:0.08, roughness:0.9,
  },
  sniper_midnight: {
    id:'sniper_midnight', towerType:'sniper', rarity:'common', cost:35,
    name:'Midnight Black',
    desc:'Flat black — no reflections, no tells.',
    mainColor: 0x1A1A1A, metalness:0.08, roughness:0.92,
  },
  sniper_arctic: {
    id:'sniper_arctic', towerType:'sniper', rarity:'rare', cost:140,
    skinType:'camo',
    name:'Arctic Camo',
    desc:'Snow white + mid-grey + dark shadow + icy blue — real winter warfare pattern with genuine contrast.',
    mainColor: 0xD0D8DC,
    camoPalette: [0xD8E0E4, 0x8A9AA0, 0x4A5860, 0xEEF2F4, 0x606E74],
  },
  sniper_desert: {
    id:'sniper_desert', towerType:'sniper', rarity:'rare', cost:120,
    skinType:'camo',
    name:'Desert Camo',
    desc:'Full-body desert camo — hot sand, burnt umber, and shadow brown across every surface.',
    mainColor: 0xC2A062,
    camoPalette: [0xC2A062, 0xA0784A, 0xD4B882, 0x6B4F2E, 0xE8CFA0],
  },
  sniper_ghostbarrel: {
    id:'sniper_ghostbarrel', towerType:'sniper', rarity:'epic', cost:280,
    skinType:'epic_recolor',
    name:'Ghost Protocol',
    desc:'EPIC. Near-invisible chalk-white casing with teal cryo-glass barrel and barely-visible edge glow. The shot arrives before the sound.',
    mainColor: 0xF2F8F8, metalness:0.05, roughness:0.95,
    emissive: 0x00FFCC, emissiveIntensity:0.7,
    accentColor: 0x00FFCC,
  },
  sniper_crystal: {
    id:'sniper_crystal', towerType:'sniper', rarity:'legendary', cost:400,
    skinType:'remodel',
    name:'Crystal Scope',
    desc:'The entire rifle is carved from void crystal — the faceted body refracts light like a prism and the barrel is a single transparent shard.',
    mainColor: 0xCCF4FF,
    emissive: 0x00BFFF, emissiveIntensity:0.7,
  },

  // ═══════ CRYO / ICE (default: arctic teal #00cec9) ════════════════════════

  ice_pale: {
    id:'ice_pale', towerType:'ice', rarity:'common', cost:35,
    name:'Ice Grey',
    desc:'Pale silver-grey — the colour of sleet on concrete.',
    mainColor: 0xB8CDD4, metalness:0.1, roughness:0.88,
  },
  ice_glacial: {
    id:'ice_glacial', towerType:'ice', rarity:'common', cost:40,
    name:'Deep Glacier',
    desc:'Ancient deep-ice blue — compressed over centuries into dense glassy cobalt.',
    mainColor: 0x0845A0, metalness:0.75, roughness:0.15,
    emissive: 0x001840, emissiveIntensity:0.45,
  },
  ice_frost: {
    id:'ice_frost', towerType:'ice', rarity:'common', cost:40,
    name:'Hoarfrost White',
    desc:'Matte chalky white — zero shine, like frozen breath on metal.',
    mainColor: 0xEDF4F8, metalness:0.0, roughness:0.96,
    emissive: 0x3060AA, emissiveIntensity:0.12,
  },
  ice_blackice: {
    id:'ice_blackice', towerType:'ice', rarity:'rare', cost:100,
    name:'Black Ice',
    desc:'Polished obsidian — jet-black arms and shell. No glow, no colour. Pure void.',
    mainColor: 0x000000, metalness:1.0, roughness:0.0,
  },
  ice_permafrost: {
    id:'ice_permafrost', towerType:'ice', rarity:'epic', cost:250,
    skinType:'remodel',
    name:'Permafrost Protocol',
    desc:'A living ice matrix of glowing spire-pillars — blazing blue-white from deep within like a frozen star surrounded by shards.',
    mainColor: 0xF0FAFA, metalness:1.0, roughness:0.0,
    emissive: 0x80DFFF, emissiveIntensity:1.6,
  },
  ice_abyssal: {
    id:'ice_abyssal', towerType:'ice', rarity:'legendary', cost:370,
    skinType:'remodel',
    name:'Abyssal Freeze',
    desc:'Void-crater platform with teal cryo-vent fissures, obsidian containment arms housing a blazing teal core column, and floating void emitter crystals at level 4.',
    mainColor: 0x000304, metalness:1.0, roughness:0.0,
  },

  // ═══════ MINIGUN / GATLING (default: amber orange #f39c12) ════════════════

  minigun_red: {
    id:'minigun_red', towerType:'minigun', rarity:'common', cost:40,
    name:'Blood Red',
    desc:'Flat blood red — intimidation through simplicity.',
    mainColor: 0xBB1100, metalness:0.12, roughness:0.85,
  },
  minigun_gunmetal: {
    id:'minigun_gunmetal', towerType:'minigun', rarity:'common', cost:40,
    name:'Gunmetal Grey',
    desc:'Brushed gunmetal alloy — high metalness, functional finish.',
    mainColor: 0x536878, metalness:0.82, roughness:0.32,
  },
  minigun_neon: {
    id:'minigun_neon', towerType:'minigun', rarity:'common', cost:40,
    name:'Neon Cyan',
    desc:'Electric cyan — the barrels glow like neon signs.',
    mainColor: 0x00E5D1, metalness:0.5, roughness:0.2,
    emissive: 0x007a70, emissiveIntensity:0.45,
  },
  minigun_urban: {
    id:'minigun_urban', towerType:'minigun', rarity:'rare', cost:130,
    skinType:'camo',
    name:'Urban Camo',
    desc:'Full-body city-block camo — cracked concrete, asphalt dark, and chalk white across every surface.',
    mainColor: 0x7D7D7D,
    camoPalette: [0x7D7D7D, 0x4A4A4A, 0xB0B0B0, 0x252525, 0xD0CFC8],
  },
  minigun_thunderclap: {
    id:'minigun_thunderclap', towerType:'minigun', rarity:'epic', cost:260,
    skinType:'epic_recolor',
    name:'Thunderclap',
    desc:'EPIC. Storm-grey barrels with electric-yellow discharge rings and a blue corona flash on each barrel tip. Thunder in metal form.',
    mainColor: 0x3A3F44, metalness:0.85, roughness:0.15,
    emissive: 0xFFDD00, emissiveIntensity:0.8,
    accentColor: 0x00AAFF,
  },
  minigun_liquidchrome: {
    id:'minigun_liquidchrome', towerType:'minigun', rarity:'legendary', cost:350,
    skinType:'remodel',
    name:'Liquid Chrome',
    desc:'Every surface is a perfect mercury mirror — chrome turret, chrome drum, chrome barrels.',
    mainColor: 0xC8C8CC, metalness:1.0, roughness:0.0,
    emissive: 0xFFFFFF, emissiveIntensity:0.35,
  },

  // ═══════ CANNON (default: brushed silver #95a5a6) ═════════════════════════

  cannon_black: {
    id:'cannon_black', towerType:'cannon', rarity:'common', cost:40,
    name:'Black Powder',
    desc:'Flat matte black — the colour every cannon should be.',
    mainColor: 0x1C1C1C, metalness:0.1, roughness:0.9,
  },
  cannon_bronze: {
    id:'cannon_bronze', towerType:'cannon', rarity:'common', cost:40,
    name:'Bronze Cannon',
    desc:'18th-century cast bronze — the original cannon material, high metalness finish.',
    mainColor: 0xCD7F32, metalness:0.85, roughness:0.38,
    emissive: 0x1a0800, emissiveIntensity:0.1,
  },
  cannon_navy: {
    id:'cannon_navy', towerType:'cannon', rarity:'common', cost:40,
    name:'Navy Blue',
    desc:'Royal navy midnight blue — formal and deadly.',
    mainColor: 0x1B2A6B, metalness:0.55, roughness:0.3,
    emissive: 0x050a22, emissiveIntensity:0.2,
  },
  cannon_rust: {
    id:'cannon_rust', towerType:'cannon', rarity:'rare', cost:110,
    skinType:'rust',
    name:'Battle Rust',
    desc:'A century of warfare left it fully corroded — deep russet flaking iron, salt-streaked pitting, and orange bleed patches. No shine. No mercy.',
    mainColor: 0x7B3020, metalness:0.0, roughness:1.0,
  },
  cannon_gilded: {
    id:'cannon_gilded', towerType:'cannon', rarity:'epic', cost:270,
    skinType:'remodel',
    name:'Gilded Siege',
    desc:'24-karat gold cannon on a rich wood carriage — jeweled rings, gold spoked wheels, crowned muzzle, ruby-tipped fuse.',
    mainColor: 0xFFD700, metalness:1.0, roughness:0.04,
    emissive: 0xFF8C00, emissiveIntensity:0.55,
  },
  cannon_hellfire: {
    id:'cannon_hellfire', towerType:'cannon', rarity:'legendary', cost:350,
    skinType:'remodel',
    name:'Hellfire Siege',
    desc:'Scorched-lava custom platform with radiating molten crack-lines, obsidian barrel with four glowing seam-veins, and ember-red muzzle that pulses like a volcanic vent.',
    mainColor: 0x0C0200, metalness:0.3, roughness:0.95,
    emissive: 0xFF2200, emissiveIntensity:0.5,
  },

  // ═══════ FLAMETHROWER / INFERNO (default: lava orange #ff4500) ════════════

  flamethrower_yellow: {
    id:'flamethrower_yellow', towerType:'flamethrower', rarity:'common', cost:40,
    name:'Hazard Yellow',
    desc:'Industrial hazard yellow — flat warning paint straight from the depot.',
    mainColor: 0xE8C010, metalness:0.1, roughness:0.88,
  },
  flamethrower_toxic: {
    id:'flamethrower_toxic', towerType:'flamethrower', rarity:'common', cost:40,
    name:'Biohazard',
    desc:'Screaming biohazard green — whatever it burns stays dead.',
    mainColor: 0x2EA500, metalness:0.35, roughness:0.4,
    emissive: 0x0d3300, emissiveIntensity:0.35,
  },
  flamethrower_cobalt: {
    id:'flamethrower_cobalt', towerType:'flamethrower', rarity:'common', cost:40,
    name:'Blue Flame',
    desc:'Deep cobalt blue — burns hotter than anything orange.',
    mainColor: 0x1565C0, metalness:0.6, roughness:0.2,
    emissive: 0x0033aa, emissiveIntensity:0.4,
  },
  flamethrower_camo: {
    id:'flamethrower_camo', towerType:'flamethrower', rarity:'rare', cost:120,
    skinType:'camo',
    name:'Scorched Camo',
    desc:'Full-body scorched camo — OD green, char-black, and burnt tan burned and battered by real combat.',
    mainColor: 0x4A5230,
    camoPalette: [0x4A5230, 0x2E3018, 0x7A6840, 0x1A1C10, 0x6B7048],
  },
  flamethrower_whitephosphorus: {
    id:'flamethrower_whitephosphorus', towerType:'flamethrower', rarity:'epic', cost:260,
    skinType:'remodel',
    name:'White Phosphorus',
    desc:'Ghost-white glowing tank, blazing sear-rings, a cone nozzle with igniter ball, rising white-hot exhaust plumes. Burns at 2760°C.',
    mainColor: 0xF0ECE0, metalness:0.2, roughness:0.55,
    emissive: 0xFFFFAA, emissiveIntensity:2.0,
  },
  flamethrower_dragonscale: {
    id:'flamethrower_dragonscale', towerType:'flamethrower', rarity:'legendary', cost:440,
    skinType:'remodel',
    name:'Dragon Scale',
    desc:'Obsidian dragon-spine platform with 8 ember fang spikes, armoured scale plates layered on the tank with glowing seams, and a maw nozzle that breathes pure fire.',
    mainColor: 0x1A0000, metalness:0.2, roughness:0.9,
    emissive: 0x550000, emissiveIntensity:0.4,
  },

  // ═══════ MORTAR (default: dark slate #34495e) ═════════════════════════════

  mortar_green: {
    id:'mortar_green', towerType:'mortar', rarity:'common', cost:35,
    name:'Field Green',
    desc:'Flat army green — the most deployed mortar colour in history.',
    mainColor: 0x3A5A30, metalness:0.1, roughness:0.9,
  },
  mortar_khaki: {
    id:'mortar_khaki', towerType:'mortar', rarity:'common', cost:40,
    name:'Desert Khaki',
    desc:'Sand-yellow military finish with a worn matte coat.',
    mainColor: 0xC3A862, metalness:0.08, roughness:0.92,
  },
  mortar_stealth: {
    id:'mortar_stealth', towerType:'mortar', rarity:'common', cost:35,
    name:'Stealth Black',
    desc:'Radar-absorbing matte black — completely silent on sensors.',
    mainColor: 0x141414, metalness:0.05, roughness:0.97,
  },
  mortar_nuclear: {
    id:'mortar_nuclear', towerType:'mortar', rarity:'common', cost:45,
    name:'Nuclear Green',
    desc:'Radioactive lime-green with inner glow — active nuclear reaction visible through the shell.',
    mainColor: 0x66BB00, metalness:0.3, roughness:0.45,
    emissive: 0x224400, emissiveIntensity:0.65,
  },
  mortar_orbital: {
    id:'mortar_orbital', towerType:'mortar', rarity:'epic', cost:240,
    skinType:'remodel',
    name:'Orbital Drop',
    desc:'Scorched titanium-black with re-entry heat streaks, plasma-scarred mount arms, and a blue-glowing orbital barrel tube.',
    mainColor: 0x080E14, metalness:1.0, roughness:0.0,
    emissive: 0x3388FF, emissiveIntensity:1.4,
  },
  mortar_ironclad: {
    id:'mortar_ironclad', towerType:'mortar', rarity:'legendary', cost:430,
    skinType:'remodel',
    name:'Ironclad',
    desc:'Battleship-hull octagonal platform with riveted armour plates, a turret ring base, heavy riveted barrel bands and a blazing ember muzzle. Straight from the dreadnought shipyard.',
    mainColor: 0x1E2430, metalness:0.95, roughness:0.25,
    emissive: 0x001133, emissiveIntensity:0.3,
  },

  // ═══════ TESLA (default: electric blue #3498db) ═══════════════════════════

  tesla_yellow: {
    id:'tesla_yellow', towerType:'tesla', rarity:'common', cost:40,
    name:'Caution Yellow',
    desc:'High-voltage caution yellow — the universally recognised "do not touch" colour.',
    mainColor: 0xF0C010, metalness:0.1, roughness:0.85,
  },
  tesla_copper: {
    id:'tesla_copper', towerType:'tesla', rarity:'common', cost:40,
    name:'Copper Coil',
    desc:'Hand-wound copper — every arc runs cleaner through pure copper.',
    mainColor: 0xB87333, metalness:0.9, roughness:0.32,
    emissive: 0x1a0800, emissiveIntensity:0.12,
  },
  tesla_silver: {
    id:'tesla_silver', towerType:'tesla', rarity:'common', cost:40,
    name:'Chrome Tesla',
    desc:'Mirror-polished chrome housing — arcs reflect off every surface.',
    mainColor: 0xBDC3C7, metalness:1.0, roughness:0.04,
  },
  tesla_iridescent: {
    id:'tesla_iridescent', towerType:'tesla', rarity:'common', cost:40,
    name:'Iridescent Coil',
    desc:'Deep violet + near-mirror finish + cyan emissive — shifts between violet, teal, and gold like an oil slick on steel.',
    mainColor: 0x4A1580, metalness:0.97, roughness:0.04,
    emissive: 0x00EEFF, emissiveIntensity:0.55,
  },
  tesla_overvolt: {
    id:'tesla_overvolt', towerType:'tesla', rarity:'epic', cost:270,
    skinType:'remodel',
    name:'Overvolt',
    desc:'Coils overcharged to 4× spec — four arc-emitter rods surround a blazing yellow-white core.',
    mainColor: 0x050508,
    emissive: 0xFFFF44, emissiveIntensity:2.2,
  },
  tesla_stormcore: {
    id:'tesla_stormcore', towerType:'tesla', rarity:'legendary', cost:450,
    skinType:'remodel',
    name:'Storm Core',
    desc:'Cracked-earth storm platform with lightning fissures, violet plasma coils climbing a void-black spire, and a barely-contained storm sphere that crackles white-hot at the crown.',
    mainColor: 0x04000F, metalness:0.9, roughness:0.1,
    emissive: 0x6600FF, emissiveIntensity:0.8,
  },

  // ═══════ LASER (default: laser red #e74c3c) ════════════════════════════════

  laser_white: {
    id:'laser_white', towerType:'laser', rarity:'common', cost:40,
    name:'Clean White',
    desc:'Flat clinical white — like a surgical instrument.',
    mainColor: 0xE8EAE8, metalness:0.1, roughness:0.85,
  },
  laser_emerald: {
    id:'laser_emerald', towerType:'laser', rarity:'common', cost:40,
    name:'Emerald Beam',
    desc:'Deep green emitter housing — clean, surgical precision.',
    mainColor: 0x009B77, metalness:0.7, roughness:0.18,
    emissive: 0x002a1e, emissiveIntensity:0.3,
  },
  laser_amber: {
    id:'laser_amber', towerType:'laser', rarity:'common', cost:40,
    name:'Amber Pulse',
    desc:'Warm amber casing — wide-spectrum burn efficiency.',
    mainColor: 0xDBA520, metalness:0.6, roughness:0.22,
    emissive: 0x3a2200, emissiveIntensity:0.28,
  },
  laser_plasma: {
    id:'laser_plasma', towerType:'laser', rarity:'rare', cost:75,
    name:'Plasma Overload',
    desc:'Deep violet + magenta-pink emissive — active plasma containment chambers glow through the casing.',
    mainColor: 0x5C0A6E, metalness:0.85, roughness:0.08,
    emissive: 0xFF00CC, emissiveIntensity:0.85,
  },
  laser_scarlet: {
    id:'laser_scarlet', towerType:'laser', rarity:'epic', cost:255,
    skinType:'epic_recolor',
    name:'Scarlet Beam',
    desc:'EPIC. Blood-scarlet anodized housing, razor-red lens glow and deep crimson conduits. The beam it fires leaves afterimages.',
    mainColor: 0x1A0003, metalness:0.7, roughness:0.12,
    emissive: 0xFF0022, emissiveIntensity:1.4,
    accentColor: 0xFF1133,
  },
  laser_voidcutter: {
    id:'laser_voidcutter', towerType:'laser', rarity:'legendary', cost:500,
    skinType:'remodel',
    name:'Void Cutter',
    desc:'A hexagonal void-matter housing that eats all light — six magenta seam lines and a void-core orb that looks like a cut in reality.',
    mainColor: 0x030306,
    emissive: 0xFF00FF, emissiveIntensity:1.9,
  },

  // ═══════ PLASMA (default: deep violet #9b59b6) ════════════════════════════

  plasma_navy: {
    id:'plasma_navy', towerType:'plasma', rarity:'common', cost:45,
    name:'Navy Shell',
    desc:'Flat navy paint — deep blue with zero special finish.',
    mainColor: 0x1A2860, metalness:0.12, roughness:0.88,
  },
  plasma_solar: {
    id:'plasma_solar', towerType:'plasma', rarity:'common', cost:40,
    name:'Solar Orange',
    desc:'Sun-core orange — matches the temperature of the plasma it fires.',
    mainColor: 0xFF8C00, metalness:0.7, roughness:0.18,
    emissive: 0x3a1400, emissiveIntensity:0.3,
  },
  plasma_void: {
    id:'plasma_void', towerType:'plasma', rarity:'common', cost:40,
    name:'Void Purple',
    desc:'Deeper, darker purple — almost black with a violet edge.',
    mainColor: 0x4A0072, metalness:0.65, roughness:0.2,
    emissive: 0x1a003a, emissiveIntensity:0.35,
  },
  plasma_singularity: {
    id:'plasma_singularity', towerType:'plasma', rarity:'rare', cost:80,
    name:'Event Horizon',
    desc:'Near-black + electric-blue emissive — tidal distortion rings visible at the edges of a dark matter housing.',
    mainColor: 0x060820, metalness:0.95, roughness:0.05,
    emissive: 0x0044FF, emissiveIntensity:1.1,
  },
  plasma_starcore: {
    id:'plasma_starcore', towerType:'plasma', rarity:'epic', cost:245,
    skinType:'remodel',
    name:'Star Core',
    desc:"Four gold solar-collection arms surround a compressed stellar core blazing white-gold. It doesn't fire plasma — it fires pieces of a star.",
    mainColor: 0xFFFAE0,
    emissive: 0xFFCC00, emissiveIntensity:2.5,
  },
  plasma_solarburst: {
    id:'plasma_solarburst', towerType:'plasma', rarity:'legendary', cost:500,
    skinType:'remodel',
    name:'Solar Burst',
    desc:'Solar forge platform with 8 gold panel wedges, an armillary sphere core with 4 gold solar collector arms, and stacking orbit rings that build up as you upgrade.',
    mainColor: 0x120A00, metalness:0.5, roughness:0.3,
    emissive: 0xFF8800, emissiveIntensity:0.7,
  },
  // ═══════ FARM (default: grass green #27ae60) ══════════════════════════════

  farm_red: {
    id:'farm_red', towerType:'farm', rarity:'common', cost:30,
    name:'Classic Red',
    desc:'The classic American red barn — the colour everyone pictures.',
    mainColor: 0xA01010, metalness:0.0, roughness:0.94,
  },
  farm_autumn: {
    id:'farm_autumn', towerType:'farm', rarity:'common', cost:40,
    name:'Autumn Harvest',
    desc:'Rich burnt-orange terracotta — warm harvest barn with weathered matte finish.',
    mainColor: 0xC1440E, metalness:0.0, roughness:0.92,
  },
  farm_snow: {
    id:'farm_snow', towerType:'farm', rarity:'common', cost:40,
    name:'Frost Farm',
    desc:'Crisp chalk-white barn with a faint blue-cold emissive dusting.',
    mainColor: 0xE8EEF2, metalness:0.05, roughness:0.88,
    emissive: 0x5588AA, emissiveIntensity:0.18,
  },
  farm_cyberpunk: {
    id:'farm_cyberpunk', towerType:'farm', rarity:'rare', cost:150,
    name:'Neon Grow',
    desc:'High-tech agri-lab — jet-black barn body with blinding hot-pink neon emissive material. Same model, same silhouette. Just made of pure light.',
    mainColor: 0x080010, metalness:0.0, roughness:0.95,
    emissive: 0xFF00AA, emissiveIntensity:2.8,
  },
  farm_goldrusher: {
    id:'farm_goldrusher', towerType:'farm', rarity:'epic', cost:275,
    skinType:'remodel',
    name:'Gold Rusher',
    desc:"A working gold mine — timber shaft entrance, ore cart on rails, nugget piles, glowing gold ore veins, and a pickaxe mount. This farm doesn't grow crops — it excavates pure gold.",
    mainColor: 0xC88000, metalness:0.95, roughness:0.08,
    emissive: 0xFFAA00, emissiveIntensity:0.5,
    accentColor: 0xFFD700,
  },
  farm_neonvault: {
    id:'farm_neonvault', towerType:'farm', rarity:'legendary', cost:400,
    skinType:'remodel',
    name:'Neon Vault',
    desc:'Chrome-black high-tech plot with a glowing neon grid, corner beacon pillars, a chrome barn with neon edge lines, and a holographic silo ring. Grows more tech with every upgrade.',
    mainColor: 0x020808, metalness:0.95, roughness:0.05,
  },

    farm_bioluminescent: {
    id:'farm_bioluminescent', towerType:'farm', rarity:'epic', cost:255,
    skinType:'remodel',
    name:'Bioluminescent',
    desc:'A living organism — jet-black organic shell with glowing teal veins, bioluminescent spore pods, and phosphorescent vent stacks.',
    mainColor: 0x040D0A,
    emissive: 0x00FF88, emissiveIntensity:2.2,
  },
};

// ── Rarity display ────────────────────────────────────────────────────────────
window.RARITY = {
    common:    { border:'#7f8c8d', label:'#aabbc0', bg:'rgba(127,140,141,0.10)' },
    rare:      { border:'#3498db', label:'#5dade2', bg:'rgba(52,152,219,0.10)'  },
    epic:      { border:'#9b59b6', label:'#c39af0', bg:'rgba(155,89,182,0.12)'  },
    legendary: { border:'#f1c40f', label:'#f9e74f', bg:'rgba(241,196,15,0.10)'  },
};

// Called by Towers.js — null means "use the tower's original color unchanged"
window.getActiveSkin = function(towerType) {
    if (!window.LockerSystem) return null;
    const eq = LockerSystem.getEquippedSkin(towerType);
    if (!eq || eq === 'default') return null;
    return window.SKIN_CATALOG[eq] || null;
};

// ============================================================================
// Core backend
// ============================================================================
const LockerSystem = (() => {
    const KEY = 'karlos_td_locker_v1';
    const def = { scraps:0, unlockedSkins:['default'], equippedSkins:{} };

    function load() {
        try {
            const r = localStorage.getItem(KEY);
            if (!r) return JSON.parse(JSON.stringify(def));
            return Object.assign(JSON.parse(JSON.stringify(def)), JSON.parse(r));
        } catch { return JSON.parse(JSON.stringify(def)); }
    }
    function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }

    let _s = load();

    const getScraps       = ()  => _s.scraps;
    const getUnlockedSkins= ()  => [..._s.unlockedSkins];
    const getEquippedSkin = (t) => _s.equippedSkins[t] || 'default';
    const getState        = ()  => _s;

    function updateHUD() {
        const el = document.getElementById('scrap-counter-value');
        if (el) {
            const prev = parseInt(el.dataset.prev||'0',10), next = _s.scraps;
            el.dataset.prev = next;
            if (next !== prev) {
                el.classList.remove('scrap-bump'); void el.offsetWidth;
                el.classList.add('scrap-bump');
            }
            el.textContent = next.toLocaleString();
        }
        const sh = document.getElementById('shop-scrap-value');  if(sh) sh.textContent = _s.scraps.toLocaleString();
        const lh = document.getElementById('locker-scrap-value'); if(lh) lh.textContent = _s.scraps.toLocaleString();
    }

    function calculateScraps(waves, diff, win) {
        const mult = { easy:1, medium:2, hard:3 }[diff] ?? 1;
        const base = waves, bonus = win ? 20 : 0, total = base*mult + bonus;
        return { base, multiplier:mult, winBonus:bonus, total };
    }
    function awardScraps(waves, diff, win) {
        const r = calculateScraps(waves, diff, win);
        _s.scraps += r.total; save(_s); updateHUD(); return r;
    }
    function buySkin(id, cost) {
        if (_s.scraps < cost)              return { ok:false, msg:'Not enough scraps' };
        if (_s.unlockedSkins.includes(id)) return { ok:false, msg:'Already owned' };
        _s.scraps -= cost; _s.unlockedSkins.push(id);
        save(_s); updateHUD(); return { ok:true };
    }
    function equipSkin(type, id) {
        if (id !== 'default' && !_s.unlockedSkins.includes(id)) return { ok:false, msg:'Not owned' };
        _s.equippedSkins[type] = id; save(_s); return { ok:true };
    }
    function init() { _s = load(); updateHUD(); }

    return { init, getState, getScraps, getUnlockedSkins, getEquippedSkin,
             calculateScraps, awardScraps, buySkin, equipSkin, updateHUD };
})();
window.LockerSystem = LockerSystem;

// ============================================================================
// SHOP PANEL
// ============================================================================

// ── Shared DST-aware reset helper ────────────────────────────────────────────
// 12:00 PM at UTC+01:00 (winter) / UTC+02:00 (summer)
// EU DST: last Sunday of March 1:00 UTC → last Sunday of October 1:00 UTC
window._cetResetUTCSecs = (function() {
    function _lastSunday(year, month0) {
        const d = new Date(Date.UTC(year, month0 + 1, 0));
        d.setUTCDate(d.getUTCDate() - d.getUTCDay());
        return d.getUTCDate();
    }
    return function() {
        const now   = new Date();
        const year  = now.getUTCFullYear();
        const cestStart = Date.UTC(year, 2, _lastSunday(year, 2), 1, 0, 0);
        const cestEnd   = Date.UTC(year, 9, _lastSunday(year, 9), 1, 0, 0);
        const isCEST    = now.getTime() >= cestStart && now.getTime() < cestEnd;
        return isCEST ? 10 * 3600 : 11 * 3600;
    };
})();

// ── Daily rotation helpers ────────────────────────────────────────────────────
// Resets at 12:00 PM UTC+01:00 / UTC+02:00 (DST-aware)
function _shopDateString() {
    const now      = new Date();
    const resetSec = window._cetResetUTCSecs();
    const utcSecs  = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
    const adj      = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (utcSecs < resetSec) adj.setUTCDate(adj.getUTCDate() - 1);
    return adj.toISOString().split('T')[0];
}

function _shopRNG(seedStr) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
        seed = seed & seed;
    }
    seed = Math.abs(seed);
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        if (seed < 0) seed += 233280;
        return seed / 233280;
    };
}

function _shopUserToken() {
    try {
        const u = JSON.parse(localStorage.getItem('karlos_auth_user') || 'null');
        if (u && u.userId) return String(u.userId);
        let t = localStorage.getItem('karlos_guest_token');
        if (!t) {
            t = Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('karlos_guest_token', t);
        }
        return t;
    } catch(e) { return 'guest'; }
}

// Global daily shop — identical for every player (guest or logged-in)
window.getDailyShopRotation = function() {
    const CACHE_KEY = 'karlos_shop_global_v4';
    const today = _shopDateString();
    localStorage.removeItem('karlos_shop_rotation'); // nuke old per-player cache

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const obj = JSON.parse(cached);
            if (obj.date === today && Array.isArray(obj.ids) && obj.ids.length === 8) return obj.ids;
        } catch(e) {}
    }

    const rng = _shopRNG('karlos_global_shop_v4|' + today);
    const all = Object.values(window.SKIN_CATALOG).sort((a, b) => a.id < b.id ? -1 : 1);
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    const ids = all.slice(0, 8).map(s => s.id);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, ids }));
    return ids;
};

window.getDailyFeatured = function() {
    const ids = getDailyShopRotation();
    return window.SKIN_CATALOG[ids[0]] || null;
};

window.getDailyDeal = function() {
    const ids = getDailyShopRotation();
    const skin = window.SKIN_CATALOG[ids[1]];
    if (!skin) return null;
    const discounted = Math.floor(skin.cost * 0.7);
    // Store globally so the preview panel can read the real price
    window._dealInfo = { id: skin.id, cost: discounted, originalCost: skin.cost };
    return { ...skin, originalCost: skin.cost, cost: discounted };
};

window.getShopResetTimer = function() {
    const now       = new Date();
    const resetSec  = window._cetResetUTCSecs();
    const secsInDay = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
    let   secsLeft  = resetSec - secsInDay;
    if (secsLeft <= 0) secsLeft += 86400;
    const hL = Math.floor(secsLeft / 3600);
    const mL = Math.floor((secsLeft % 3600) / 60);
    const sL = secsLeft % 60;
    return `${String(hL).padStart(2,'0')}:${String(mL).padStart(2,'0')}:${String(sL).padStart(2,'0')}`;
};

window.openShop = function() {
    document.getElementById('shop-panel').style.display = 'flex';
    renderShopPanel();
    if (typeof playClick==='function') playClick();
};
window.closeShop = function() {
    document.getElementById('shop-panel').style.display = 'none';
};

window.renderShopPanel = function() {
    const grid   = document.getElementById('shop-grid');
    const owned  = LockerSystem.getUnlockedSkins();
    const scraps = LockerSystem.getScraps();

    let wishlist = [];
    try { wishlist = JSON.parse(localStorage.getItem('karlos_wishlist') || '[]'); } catch(e) {}
    let seenSkins = [];
    try { seenSkins = JSON.parse(localStorage.getItem('karlos_seen_skins') || '[]'); } catch(e) {}

    const featured  = getDailyFeatured();
    const deal      = getDailyDeal(); // also sets window._dealInfo
    const rotationIds = getDailyShopRotation();
    // All 8 skins — featured=0, deal=1, regular=2-7
    const allSkins = rotationIds.map(id => window.SKIN_CATALOG[id]).filter(Boolean);

    // Mark all as seen now
    localStorage.setItem('karlos_seen_skins', JSON.stringify([...new Set([...seenSkins, ...rotationIds])]));

    window.toggleWishlist = function(id, btn) {
        let wl = [];
        try { wl = JSON.parse(localStorage.getItem('karlos_wishlist') || '[]'); } catch(e) {}
        const idx = wl.indexOf(id);
        if (idx === -1) { wl.push(id); btn.textContent = '★'; btn.style.color = '#f1c40f'; }
        else { wl.splice(idx, 1); btn.textContent = '☆'; btn.style.color = 'rgba(255,255,255,0.2)'; }
        localStorage.setItem('karlos_wishlist', JSON.stringify(wl));
    };

    function skinCard(s, opts = {}) {
        const { isFeatured = false, isDeal = false } = opts;
        const displayCost = isDeal && window._dealInfo ? window._dealInfo.cost : s.cost;
        const origCost    = isDeal && window._dealInfo ? window._dealInfo.originalCost : null;
        const isOwned = owned.includes(s.id);
        const canBuy  = !isOwned && scraps >= displayCost;
        const rc      = window.RARITY[s.rarity] || window.RARITY.rare;
        const hex     = '#' + s.mainColor.toString(16).padStart(6,'0');
        const glow    = s.emissive ? '#' + s.emissive.toString(16).padStart(6,'0') : hex;
        const isLeg   = s.rarity === 'legendary';
        const isWished = wishlist.includes(s.id);
        const isNewSkin = !seenSkins.includes(s.id) && !isOwned;

        let borderColor = isOwned ? '#2ecc71' : isFeatured ? 'rgba(230,126,34,0.6)' : isDeal ? 'rgba(46,204,113,0.5)' : isLeg ? 'rgba(241,196,15,0.6)' : rc.border;
        let bgColor = isFeatured ? 'rgba(230,126,34,0.06)' : isDeal ? 'rgba(46,204,113,0.05)' : isLeg ? 'rgba(241,196,15,0.07)' : rc.bg;

        const shimmer = isLeg ? `style="animation:legendaryShimmer 3s ease-in-out infinite;"` : '';

        // Label strip inside the card at the top (not a wrapper above — that breaks card sizing)
        let labelStrip = '';
        if (isFeatured) labelStrip = `<div style="font-size:6px;letter-spacing:3px;color:rgba(230,126,34,0.8);font-weight:900;text-align:center;padding:4px 0 2px;border-bottom:1px solid rgba(230,126,34,0.15);margin:-2px -2px 4px -2px;">&#9733; FEATURED</div>`;
        if (isDeal)     labelStrip = `<div style="font-size:6px;letter-spacing:3px;color:rgba(46,204,113,0.8);font-weight:900;text-align:center;padding:4px 0 2px;border-bottom:1px solid rgba(46,204,113,0.15);margin:-2px -2px 4px -2px;">&#9660; DEAL -30%</div>`;

        // NEW badge — bottom-left so it doesn't overlap the label strip
        const newBadge  = isNewSkin ? `<span style="position:absolute;top:${isFeatured||isDeal?'28':'6'}px;left:6px;background:#e67e22;color:#000;font-size:6px;font-weight:900;letter-spacing:2px;padding:2px 5px;border-radius:3px;z-index:2;">NEW</span>` : '';
        const wishBadge = isWished  ? `<span style="position:absolute;top:${isFeatured||isDeal?'26':'4'}px;right:6px;color:#f1c40f;font-size:12px;z-index:2;line-height:1;">★</span>` : '';

        const strikeHtml = isDeal && origCost ? `<span style="font-size:9px;color:rgba(255,255,255,0.25);text-decoration:line-through;margin-left:4px;">&#9881;${origCost}</span>` : '';
        const discBadge  = isDeal ? `<span style="font-size:7px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.35);color:#2ecc71;padding:1px 5px;border-radius:8px;font-weight:900;margin-left:4px;">-30%</span>` : '';

        return `
        <div class="skin-card" ${shimmer} style="border-color:${borderColor};background:${bgColor};cursor:pointer;position:relative;"
            onclick="openSkinPreview('shop','${s.id}',this,'${s.towerType}')">
            ${labelStrip}
            ${newBadge}${wishBadge}
            <div class="skin-swatch-wrap" style="${isLeg?'background:radial-gradient(circle,rgba(241,196,15,0.15),transparent)':''}">
                ${isLeg ? '<div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(241,196,15,0.08),transparent);animation:shimmerSlide 2.5s linear infinite;pointer-events:none;border-radius:inherit;overflow:hidden;"></div>' : ''}
                <div class="skin-swatch" style="background:${hex};box-shadow:0 0 ${isLeg?'30px':'20px'} ${glow}${isLeg?'CC':'88'};"></div>
                <span class="skin-rarity-tag" style="color:${rc.label}">${s.rarity.toUpperCase()}</span>
            </div>
            <div class="skin-name">${s.name}</div>
            <div class="skin-desc">${s.desc.substring(0,55)}${s.desc.length>55?'…':''}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0 10px 2px;">
                <div style="display:flex;align-items:center;gap:2px;flex-wrap:wrap;">
                    <div class="skin-cost">&#9881; ${displayCost}</div>${strikeHtml}${discBadge}
                </div>
                <button onclick="event.stopPropagation();toggleWishlist('${s.id}',this)"
                    style="background:none;border:none;cursor:pointer;font-size:15px;color:${isWished?'#f1c40f':'rgba(255,255,255,0.2)'};padding:0;line-height:1;transition:color 0.2s;"
                    title="${isWished?'Remove wishlist':'Wishlist'}">${isWished?'★':'☆'}</button>
            </div>
            ${isOwned
                ? `<button class="skin-btn skin-owned" disabled>&#10003; OWNED</button>`
                : `<button class="skin-btn ${canBuy?'skin-buy':'skin-broke'}"
                     onclick="event.stopPropagation();shopBuy('${s.id}',${displayCost})" ${canBuy?'':'disabled'}>
                     ${canBuy ? 'BUY' : `&#9881; ${displayCost}`}
                   </button>`}
        </div>`;
    }

    const resetTimer = getShopResetTimer();
    let html = `
    <style>
        @keyframes legendaryShimmer {
            0%,100% { box-shadow:0 0 0 1px rgba(241,196,15,0.3),0 0 14px rgba(241,196,15,0.06); }
            50%      { box-shadow:0 0 0 1px rgba(241,196,15,0.7),0 0 28px rgba(241,196,15,0.2); }
        }
        @keyframes shimmerSlide {
            0%   { transform:translateX(-100%); }
            100% { transform:translateX(300%); }
        }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div>
            <div style="font-size:13px;font-weight:900;letter-spacing:3px;color:#e67e22;">DAILY SHOP</div>
            <div style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.3);margin-top:3px;">8 SKINS &#xB7; SAME FOR ALL PLAYERS &#xB7; RESETS DAILY</div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:8px;letter-spacing:2px;color:rgba(255,255,255,0.2);margin-bottom:3px;">RESETS IN</div>
            <div style="font-size:14px;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:2px;color:rgba(230,126,34,0.8);font-family:'Orbitron',sans-serif;" id="shop-reset-timer">${resetTimer}</div>
        </div>
    </div>
    <div class="skin-row">`;

    allSkins.forEach((s, i) => {
        html += skinCard(s, { isFeatured: i === 0, isDeal: i === 1 });
    });
    html += `</div>`;

    grid.innerHTML = html;
    document.getElementById('shop-scrap-value').textContent = scraps.toLocaleString();

    clearInterval(window._shopTimerInterval);
    window._shopTimerInterval = setInterval(() => {
        const el = document.getElementById('shop-reset-timer');
        if (el) el.textContent = getShopResetTimer();
        else clearInterval(window._shopTimerInterval);
    }, 1000);
};

window.shopBuy = function(id, cost) {
    const r = LockerSystem.buySkin(id, cost);
    if (r.ok) { if(typeof playClick==='function') playClick(); renderShopPanel(); }
    else if (typeof kAlert === 'function') kAlert('PURCHASE FAILED', r.msg, { icon: '<i class="fa-solid fa-circle-xmark"></i>', danger: true });
    else alert(r.msg);
};

// LOCKER PANEL
// ============================================================================
window.openLockerPanel = function() {
    document.getElementById('locker-panel').style.display = 'flex';
    renderLockerPanel();
    if (typeof playClick==='function') playClick();
};
window.closeLockerPanel = function() {
    document.getElementById('locker-panel').style.display = 'none';
};

window.renderLockerPanel = function() {
    const grid   = document.getElementById('locker-grid');
    const owned  = LockerSystem.getUnlockedSkins();
    const eq     = LockerSystem.getState().equippedSkins;
    const allTypes = [...new Set(Object.values(window.SKIN_CATALOG).map(s => s.towerType))];

    let html = '';
    allTypes.forEach(type => {
        const skins = Object.values(window.SKIN_CATALOG)
            .filter(s => s.towerType===type && owned.includes(s.id));
        const eqId    = eq[type] || 'default';
        const defEq   = eqId === 'default';

        // Get this tower's actual default colour for the swatch
        const defData = window.TOWER_DEFAULT_COLORS[type] || { hex:'#888', label:'Default' };

        html += `<div class="pnl-section">${type.toUpperCase()} SKINS</div><div class="skin-row">`;

        // Default slot — clickable to preview
        html += `
        <div class="skin-card ${defEq?'skin-card-eq':''}" style="border-color:${defEq?'#e67e22':'#2c2c3a'};cursor:pointer" onclick="openSkinPreview('locker','default',this,'${type}')">
            <div class="skin-swatch-wrap">
                <div class="skin-swatch" style="background:${defData.hex};box-shadow:0 0 14px ${defData.hex}88"></div>
                ${defEq ? '<span class="skin-active-tag">ACTIVE</span>' : ''}
            </div>
            <div class="skin-name">Default</div>
            <div class="skin-desc">${defData.label} — original factory finish.</div>
            <div class="skin-cost" style="color:#444">Free</div>
            ${defEq
                ? `<button class="skin-btn skin-equipped" disabled onclick="event.stopPropagation()">✓ ACTIVE</button>`
                : `<button class="skin-btn skin-equip" onclick="event.stopPropagation();lockerEquip('${type}','default')">EQUIP</button>`}
        </div>`;

        if (skins.length === 0) {
            html += `<div class="skin-empty">— Visit the Shop to unlock skins —</div>`;
        } else {
            const tierOrder = { common:0, rare:1, epic:2, legendary:3 };
            skins.sort((a,b) => (tierOrder[a.rarity]||0) - (tierOrder[b.rarity]||0));
            skins.forEach(s => {
                const isEq  = eqId === s.id;
                const rc    = window.RARITY[s.rarity] || window.RARITY.rare;
                const hex   = '#'+s.mainColor.toString(16).padStart(6,'0');
                const glow  = s.emissive ? '#'+s.emissive.toString(16).padStart(6,'0') : hex;
                const isLeg = s.rarity === 'legendary';
                const cardStyle = isLeg
                    ? `border-color:${isEq?'#e67e22':'#f1c40f'};background:rgba(241,196,15,0.07);box-shadow:0 0 14px rgba(241,196,15,0.1);`
                    : `border-color:${isEq?'#e67e22':rc.border};background:${rc.bg};`;
                html += `
                <div class="skin-card ${isEq?'skin-card-eq':''}" style="${cardStyle};cursor:pointer" onclick="openSkinPreview('locker','${s.id}',this,'${s.towerType}')">
                    <div class="skin-swatch-wrap" style="${isLeg?'background:radial-gradient(circle,rgba(241,196,15,0.1),transparent)':''}">
                        <div class="skin-swatch" style="background:${hex};box-shadow:0 0 24px ${glow}AA"></div>
                        ${isEq ? '<span class="skin-active-tag">ACTIVE</span>' : ''}
                        ${isLeg ? '<span style="position:absolute;bottom:5px;right:5px;font-size:9px;color:#f1c40f;">✦</span>' : ''}
                    </div>
                    <div class="skin-name">${s.name}</div>
                    <div class="skin-desc">${s.desc.substring(0,55)}${s.desc.length>55?'…':''}</div>
                    <div class="skin-cost" style="color:#555">Owned</div>
                    ${isEq
                        ? `<button class="skin-btn skin-equipped" disabled onclick="event.stopPropagation()">✓ ACTIVE</button>`
                        : `<button class="skin-btn skin-equip" onclick="event.stopPropagation();lockerEquip('${s.towerType}','${s.id}')">EQUIP</button>`}
                </div>`;
            });
        }
        html += `</div>`;
    });
    grid.innerHTML = html;
    document.getElementById('locker-scrap-value').textContent = LockerSystem.getScraps().toLocaleString();
};

window.lockerEquip = function(type, id) {
    const r = LockerSystem.equipSkin(type, id);
    if (r.ok) { if(typeof playClick==='function') playClick(); renderLockerPanel(); }
    else alert(r.msg);
};

// Game-over breakdown
window.showScrapBreakdown = function(waves, diff, isVictory) {
    if (typeof LockerSystem === 'undefined') return;
    const r = LockerSystem.awardScraps(waves||0, diff||'easy', isVictory);
    const label = { easy:'Easy ×1', medium:'Medium ×2', hard:'Hard ×3' }[diff] || '×1';
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('sb-waves',r.base); set('sb-mult',label);
    set('sb-base',r.base*r.multiplier); set('sb-total',r.total+' ⚙');
    const b = document.getElementById('sb-bonus');
    if (b) { b.textContent='+'+r.winBonus; b.style.color='rgba(255,255,255,0.25)'; }
    set('sb-waves-v',r.base); set('sb-mult-v',label);
    set('sb-base-v',r.base*r.multiplier); set('sb-total-v',r.total+' ⚙');
    const bv = document.getElementById('sb-bonus-v');
    if (bv) bv.textContent = '+'+r.winBonus;
};

// Legacy alias
window.openLocker = window.openLockerPanel;

// ============================================================================
// SKIN PREVIEW SYSTEM — mini Three.js renderer inside the panel sidebar
// ============================================================================
(function() {

    // ── State ──────────────────────────────────────────────────────────────────
    function makeCtx(paneId, canvasWrapId, infoId, windowId) {
        return {
            paneId, canvasWrapId, infoId, windowId,
            renderer: null, scene: null, camera: null,
            modelGroup: null,
            raf: null,
            isDragging: false, lastX: 0, lastY: 0,
            rotY: 0.5, rotX: 0.18,
            zoom: 1.0, zoomMin: 0.35, zoomMax: 3.5,
            pinchStartDist: 0,
            activeCard: null, currentSkinId: null,
            currentLevel: 1, currentBranch: null,  // branch null = no branch
            isDefault: false, currentTowerType: null,
        };
    }

    const previews = {
        shop:   makeCtx('skin-preview-pane',   'shop-preview-canvas-wrap',  'shop-preview-info',   'shop-pnl-window'),
        locker: makeCtx('locker-preview-pane', 'locker-preview-canvas-wrap','locker-preview-info', 'locker-pnl-window'),
    };

    // ── Bootstrap the mini Three.js renderer ─────────────────────────────────
    // Must be called AFTER the pane has opened and has real dimensions.
    function initRenderer(ctx) {
        const wrap = document.getElementById(ctx.canvasWrapId);
        if (!wrap || typeof THREE === 'undefined') return;

        // Destroy old renderer if dimensions changed
        if (ctx.renderer) {
            ctx.renderer.dispose();
            const old = wrap.querySelector('canvas');
            if (old) wrap.removeChild(old);
            ctx.renderer = null;
        }

        const W = wrap.clientWidth  || 390;
        const H = wrap.clientHeight || 260;

        ctx.scene  = new THREE.Scene();
        ctx.camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
        // Camera stays fixed — we zoom by moving it along Z
        ctx.baseCamZ = 14;
        ctx.camera.position.set(0, 3.5, ctx.baseCamZ);
        ctx.camera.lookAt(0, 2.5, 0);

        ctx.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        ctx.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        ctx.renderer.setSize(W, H);
        ctx.renderer.setClearColor(0x000000, 0);
        ctx.renderer.shadowMap.enabled = false;
        ctx.renderer.outputEncoding = THREE.sRGBEncoding || 3001; // r128 compat
        wrap.insertBefore(ctx.renderer.domElement, wrap.firstChild);

        // Lighting
        const key = new THREE.DirectionalLight(0xffffff, 2.0);
        key.position.set(6, 10, 9); ctx.scene.add(key);
        const fill = new THREE.DirectionalLight(0x7090ee, 0.7);
        fill.position.set(-7, 2, -5); ctx.scene.add(fill);
        const rim = new THREE.DirectionalLight(0xfff0cc, 0.5);
        rim.position.set(0, -3, -10); ctx.scene.add(rim);
        ctx.scene.add(new THREE.AmbientLight(0x556080, 1.1));

        // Model wrapper group (rotation applied here)
        ctx.modelGroup = new THREE.Group();
        ctx.scene.add(ctx.modelGroup);

        // ── Input: drag to rotate ──────────────────────────────────────────────
        const canvas = ctx.renderer.domElement;
        canvas.addEventListener('mousedown', e => {
            ctx.isDragging = true; ctx.lastX = e.clientX; ctx.lastY = e.clientY;
            e.preventDefault();
        });
        canvas.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                ctx.isDragging = true;
                ctx.lastX = e.touches[0].clientX; ctx.lastY = e.touches[0].clientY;
            }
            if (e.touches.length === 2) {
                ctx.isDragging = false;
                ctx.pinchStartDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: true });
        window.addEventListener('mousemove', e => {
            if (!ctx.isDragging) return;
            ctx.rotY += (e.clientX - ctx.lastX) * 0.013;
            ctx.rotX += (e.clientY - ctx.lastY) * 0.009;
            ctx.rotX = Math.max(-0.6, Math.min(0.6, ctx.rotX)); // clamp vertical
            ctx.lastX = e.clientX; ctx.lastY = e.clientY;
        });
        window.addEventListener('touchmove', e => {
            if (e.touches.length === 1 && ctx.isDragging) {
                ctx.rotY += (e.touches[0].clientX - ctx.lastX) * 0.013;
                ctx.rotX += (e.touches[0].clientY - ctx.lastY) * 0.009;
                ctx.rotX = Math.max(-0.6, Math.min(0.6, ctx.rotX));
                ctx.lastX = e.touches[0].clientX; ctx.lastY = e.touches[0].clientY;
            }
            if (e.touches.length === 2) {
                const d = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY);
                ctx.zoom *= ctx.pinchStartDist / d;
                ctx.zoom = Math.max(ctx.zoomMin, Math.min(ctx.zoomMax, ctx.zoom));
                ctx.pinchStartDist = d;
            }
        }, { passive: true });
        window.addEventListener('mouseup',  () => { ctx.isDragging = false; });
        window.addEventListener('touchend', () => { ctx.isDragging = false; });

        // ── Scroll to zoom ─────────────────────────────────────────────────────
        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            ctx.zoom += e.deltaY * 0.001;
            ctx.zoom = Math.max(ctx.zoomMin, Math.min(ctx.zoomMax, ctx.zoom));
        }, { passive: false });
    }

    // ── Build preview model ───────────────────────────────────────────────────
    function buildPreviewModel(ctx, towerType, skinData, level, branch) {
        // Clear old model children
        while (ctx.modelGroup.children.length) ctx.modelGroup.remove(ctx.modelGroup.children[0]);

        // Temporarily override getActiveSkin
        const _orig = window.getActiveSkin;
        window.getActiveSkin = (t) => (t === towerType ? skinData : null);

        let model = null;
        try {
            model = createTowerModel(towerType, level || 1, branch || null);
        } catch (e) {
            console.warn('[SkinPreview] createTowerModel error:', e);
        }
        window.getActiveSkin = _orig;

        if (!model) {
            console.warn('[SkinPreview] model is null for', towerType);
            return;
        }

        // Centre the model on its own bounding box
        const box    = new THREE.Box3().setFromObject(model);
        const size   = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());

        // Shift model so its base sits at y=0 and is centred on XZ
        model.position.set(-centre.x, -box.min.y, -centre.z);

        // Scale so the tallest dimension fits nicely in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 6.5;
        if (maxDim > 0.01) model.scale.setScalar(targetSize / maxDim);

        ctx.modelGroup.add(model);

        // Reset rotation & zoom
        ctx.rotY = 0.5; ctx.rotX = 0.18; ctx.zoom = 1.0;
    }

    // ── Render loop ───────────────────────────────────────────────────────────
    function startLoop(ctx) {
        if (ctx.raf) return;
        function tick() {
            ctx.raf = requestAnimationFrame(tick);
            if (!ctx.renderer || !ctx.scene || !ctx.camera) return;
            // Auto-rotate when not dragging
            if (!ctx.isDragging) ctx.rotY += 0.006;
            ctx.modelGroup.rotation.y = ctx.rotY;
            ctx.modelGroup.rotation.x = ctx.rotX;
            // Zoom via camera Z
            ctx.camera.position.z = ctx.baseCamZ * ctx.zoom;
            ctx.renderer.render(ctx.scene, ctx.camera);
        }
        tick();
    }
    function stopLoop(ctx) {
        if (ctx.raf) { cancelAnimationFrame(ctx.raf); ctx.raf = null; }
    }

    // ── Render info panel ─────────────────────────────────────────────────────
    function renderPreviewInfo(ctx, towerType, skinData, mode) {
        const el = document.getElementById(ctx.infoId);
        if (!el) return;

        const isDefault = !skinData;
        const defData   = (window.TOWER_DEFAULT_COLORS || {})[towerType] || { hex:'#888', label:'Default' };
        const skin      = skinData;

        const rarity    = skin ? skin.rarity : 'default';
        const rc        = (window.RARITY || {})[rarity] || { border:'#444', label:'#888', bg:'rgba(255,255,255,0.04)' };
        const isOwned   = !skin || LockerSystem.getUnlockedSkins().includes(skin.id);
        // Use discounted price if this is the deal of the day
        const effectiveCost = (skin && window._dealInfo && skin.id === window._dealInfo.id)
            ? window._dealInfo.cost : (skin ? skin.cost : 0);
        const canBuy    = skin && !isOwned && LockerSystem.getScraps() >= effectiveCost;
        const eqId      = LockerSystem.getState().equippedSkins[towerType] || 'default';
        const isEq      = isDefault ? eqId === 'default' : skin && eqId === skin.id;
        const isLeg     = skin && skin.rarity === 'legendary';
        const towerLabel = towerType.toUpperCase() + ' TOWER';
        const skinName  = skin ? skin.name : 'Default';
        const skinDesc  = skin ? skin.desc : (defData.label + ' — original factory finish.');
        const lvl    = ctx.currentLevel  || 1;
        const branch = ctx.currentBranch || null;

        // Level picker: LV1–LV4, then branch A and B (both map to level 5)
        const lvlPicker = [1,2,3,4].map(l => `
            <button class="preview-lvl-btn ${l === lvl && !branch ? 'active' : ''}"
                onclick="previewSetLevel('${mode}',${l},null)">LV${l}</button>`
        ).join('') + `
            <button class="preview-lvl-btn ${branch === 'A' ? 'active' : ''}"
                onclick="previewSetLevel('${mode}',5,'A')">5-A</button>
            <button class="preview-lvl-btn ${branch === 'B' ? 'active' : ''}"
                onclick="previewSetLevel('${mode}',5,'B')">5-B</button>`;

        // Action button
        let btnHtml = '';
        if (mode === 'shop') {
            if (isOwned || isDefault) {
                btnHtml = `<button class="preview-action-btn owned">✓ OWNED</button>`;
            } else {
                btnHtml = `<button class="preview-action-btn ${canBuy?'buy':'broke'}"
                    ${canBuy ? `onclick="shopBuy('${skin.id}',${effectiveCost});refreshPreviewInfo('${mode}','${skin.id}')"` : 'disabled'}>
                    ${canBuy ? `⚙  BUY NOW` : `⚙ ${effectiveCost} — NOT ENOUGH`}
                </button>`;
            }
        } else {
            if (isEq) {
                btnHtml = `<button class="preview-action-btn equipped">✓ EQUIPPED</button>`;
            } else {
                const equipId = isDefault ? 'default' : skin.id;
                btnHtml = `<button class="preview-action-btn equip"
                    onclick="lockerEquip('${towerType}','${equipId}');refreshPreviewInfo('${mode}','${equipId}')">
                    EQUIP
                </button>`;
            }
        }

        el.innerHTML = `
            <div class="preview-rarity-badge" style="background:${rc.bg};border:1px solid ${rc.border};color:${rc.label}">
                ${isLeg ? '✦ ' : ''}${isDefault ? 'DEFAULT' : rarity.toUpperCase()}
            </div>
            <div class="preview-skin-name">${skinName}</div>
            <div class="preview-tower-label">${towerLabel}</div>
            <div class="preview-desc">${skinDesc}</div>
            ${skin ? `<div class="preview-price-row">
                <div class="preview-price">⚙ ${effectiveCost}</div>
                ${effectiveCost !== skin.cost ? `<div class="preview-price-label" style="text-decoration:line-through;opacity:0.4;">⚙ ${skin.cost}</div><div style="font-size:8px;color:#2ecc71;letter-spacing:1px;font-weight:900;">-30% DEAL</div>` : '<div class="preview-price-label">SCRAPS</div>'}
            </div>` : ''}
            <div class="preview-lvl-row">${lvlPicker}</div>
            ${btnHtml}
        `;
    }

    // ── Open preview (skin or default) ────────────────────────────────────────
    function openPreview(mode, skinIdOrDefault, cardEl, towerType) {
        const ctx      = previews[mode];
        if (!ctx) return;
        const isDefault = skinIdOrDefault === 'default' || !skinIdOrDefault;
        const skin      = isDefault ? null : (window.SKIN_CATALOG || {})[skinIdOrDefault];
        const type      = towerType || (skin && skin.towerType);
        if (!type) return;

        // Highlight card
        if (ctx.activeCard) ctx.activeCard.classList.remove('preview-active');
        ctx.activeCard = cardEl || null;
        if (ctx.activeCard) ctx.activeCard.classList.add('preview-active');

        ctx.currentSkinId   = isDefault ? null : skinIdOrDefault;
        ctx.currentLevel    = 1;
        ctx.currentBranch   = null;
        ctx.isDefault       = isDefault;
        ctx.currentTowerType = type;

        // Show pane + widen window
        const pane = document.getElementById(ctx.paneId);
        const win  = document.getElementById(ctx.windowId);
        if (pane) pane.classList.add('open');
        if (win)  win.classList.add('has-preview');

        // Wait for CSS transition to finish (320ms) then init renderer with real size
        stopLoop(ctx);
        setTimeout(() => {
            initRenderer(ctx);
            startLoop(ctx);
            buildPreviewModel(ctx, type, skin, ctx.currentLevel, ctx.currentBranch);
            renderPreviewInfo(ctx, type, skin, mode);
        }, 340);
    }
    window.openSkinPreview = openPreview;

    // ── Level picker callback ─────────────────────────────────────────────────
    window.previewSetLevel = function(mode, level, branch) {
        const ctx  = previews[mode];
        if (!ctx) return;
        ctx.currentLevel  = level;
        ctx.currentBranch = branch || null;
        const skin = ctx.currentSkinId ? (window.SKIN_CATALOG || {})[ctx.currentSkinId] : null;
        buildPreviewModel(ctx, ctx.currentTowerType, skin, level, branch || null);
        renderPreviewInfo(ctx, ctx.currentTowerType, skin, mode);
    };

    // ── Refresh info (after buy/equip) ────────────────────────────────────────
    window.refreshPreviewInfo = function(mode, skinId) {
        const ctx  = previews[mode];
        if (!ctx) return;
        const id   = skinId === 'default' ? null : skinId;
        const skin = id ? (window.SKIN_CATALOG || {})[id] : null;
        ctx.currentSkinId = id;
        renderPreviewInfo(ctx, ctx.currentTowerType, skin, mode);
        if (mode === 'shop') renderShopPanel();
        else renderLockerPanel();
    };

    // ── Close preview pane ────────────────────────────────────────────────────
    window.closePreview = function(mode) {
        const ctx = previews[mode];
        if (!ctx) return;
        stopLoop(ctx);
        const pane = document.getElementById(ctx.paneId);
        const win  = document.getElementById(ctx.windowId);
        if (pane) pane.classList.remove('open');
        if (win)  win.classList.remove('has-preview');
        if (ctx.activeCard) { ctx.activeCard.classList.remove('preview-active'); ctx.activeCard = null; }
        ctx.currentSkinId = null;
    };

    // ── Override panel-close functions to also tear down renderer ────────────
    window.closeShop = function() {
        closePreview('shop');
        document.getElementById('shop-panel').style.display = 'none';
    };
    window.closeLockerPanel = function() {
        closePreview('locker');
        document.getElementById('locker-panel').style.display = 'none';
    };

})();