// ============================================================================
// Towers.js - Tower model creation, upgrade logic, targeting
// ============================================================================


// ─────────────────────────────────────────────────────────────────────────────
// SKIN HELPERS  (called from inside createTowerModel)
// ─────────────────────────────────────────────────────────────────────────────

// ── RUST TEXTURE ENGINE ────────────────────────────────────────────────────────
// Builds a procedural rust canvas texture: dark iron base + orange/brown bloom
// patches + streaky vertical staining + pitted flakes. Real corrosion look.
function _makeRustTexture(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. Dark iron base
    ctx.fillStyle = '#3B1A0D';
    ctx.fillRect(0, 0, size, size);

    // 2. Rust bloom patches — radial gradients at random positions
    const patches = [
        { x: 0.25, y: 0.3,  r: 0.22, ca: 'rgba(160,60,10,0.85)',  cb: 'rgba(90,20,5,0)' },
        { x: 0.7,  y: 0.15, r: 0.18, ca: 'rgba(180,80,15,0.75)',  cb: 'rgba(70,15,5,0)' },
        { x: 0.5,  y: 0.65, r: 0.28, ca: 'rgba(190,100,20,0.9)',  cb: 'rgba(80,25,5,0)' },
        { x: 0.15, y: 0.75, r: 0.16, ca: 'rgba(200,120,30,0.7)',  cb: 'rgba(100,35,5,0)' },
        { x: 0.82, y: 0.55, r: 0.20, ca: 'rgba(170,70,12,0.8)',   cb: 'rgba(60,10,3,0)' },
        { x: 0.4,  y: 0.45, r: 0.14, ca: 'rgba(220,140,40,0.65)', cb: 'rgba(90,25,5,0)' },
        { x: 0.6,  y: 0.85, r: 0.12, ca: 'rgba(200,110,25,0.75)', cb: 'rgba(70,20,5,0)' },
    ];
    patches.forEach(p => {
        const grd = ctx.createRadialGradient(p.x*size, p.y*size, 0, p.x*size, p.y*size, p.r*size);
        grd.addColorStop(0, p.ca);
        grd.addColorStop(1, p.cb);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(p.x*size, p.y*size, p.r*size, p.r*size*0.7, p.x*3, 0, Math.PI*2);
        ctx.fill();
    });

    // 3. Vertical rust streaks (gravity-fed corrosion drips)
    const streakPositions = [0.18, 0.35, 0.52, 0.68, 0.81];
    streakPositions.forEach(xf => {
        const grd = ctx.createLinearGradient(xf*size, 0, xf*size + 8, size);
        grd.addColorStop(0,   'rgba(160,70,15,0)');
        grd.addColorStop(0.2, 'rgba(180,85,20,0.55)');
        grd.addColorStop(0.7, 'rgba(160,65,10,0.45)');
        grd.addColorStop(1,   'rgba(130,50,8,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(xf*size - 2, 0, 5 + Math.random()*4, size);
    });

    // 4. Flaking pits — tiny dark spots scattered over
    ctx.fillStyle = 'rgba(20,8,3,0.7)';
    for (let i = 0; i < 80; i++) {
        const px = Math.random() * size, py = Math.random() * size;
        const pr = 1 + Math.random() * 4;
        ctx.beginPath(); ctx.ellipse(px, py, pr, pr*0.6, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
    }

    // 5. Bright orange highlight flecks
    ctx.fillStyle = 'rgba(240,140,30,0.45)';
    for (let i = 0; i < 40; i++) {
        const px = Math.random() * size, py = Math.random() * size;
        ctx.beginPath(); ctx.ellipse(px, py, 1.5, 1, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    return tex;
}

function _makeRustMaterial() {
    const rustTex = _makeRustTexture(256);
    return new THREE.MeshStandardMaterial({
        map: rustTex,
        roughnessMap: rustTex,   // rougher where rust patches are
        color: 0xBB6622,         // warm tint to blend with texture
        roughness: 1.0,
        metalness: 0.05,         // almost no metalness - rust kills conductivity
    });
}

// ── CAMO TEXTURE ENGINE ───────────────────────────────────────────────────────
// Builds a large, blurry organic camo texture at 256×256 — real military look.
// Technique: multi-pass blob fill with soft gaussian blur simulation via shadow.
function _makeCamoTexture(palette, seed) {
    const SIZE = 256;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    // Seeded LCG — stable, reproducible patterns per tower mesh
    let s = (seed || 42) & 0x7fffffff;
    const rand = () => { s = Math.imul(s, 1664525) + 1013904223 | 0; return (s >>> 0) / 0x100000000; };

    const toHex = c => '#' + (c | 0x1000000).toString(16).slice(-6);

    // 1. Solid base coat
    ctx.fillStyle = toHex(palette[0]);
    ctx.fillRect(0, 0, SIZE, SIZE);

    // 2. Generate organic amoeba-shaped blobs for each palette colour
    // More blobs for richer coverage, with soft feathered edges via shadowBlur
    const layerBlobs = [14, 12, 10, 8];  // blobs per palette layer
    for (let p = 1; p < palette.length; p++) {
        const count = layerBlobs[p - 1] || 8;
        ctx.fillStyle = toHex(palette[p]);
        // Soft edge: use a radial glow trick — draw the same blob twice,
        // second pass blurred. This gives authentic soft-edged camo patches.
        ctx.shadowColor = toHex(palette[p]);
        ctx.shadowBlur = 6 + rand() * 8;

        for (let i = 0; i < count; i++) {
            // Scatter centre across full canvas + wrap overflow by drawing copies
            const cx = rand() * SIZE;
            const cy = rand() * SIZE;
            // Camo blobs are wide and short (horizontal elongation)
            const rx = SIZE * (0.08 + rand() * 0.15);   // 8%–23% of canvas width
            const ry = rx * (0.45 + rand() * 0.55);     // height 45%–100% of rx
            const rot = rand() * Math.PI * 2;
            const pts = 7 + Math.floor(rand() * 6);      // 7–12 control points

            // Build the wobbly organic outline
            const drawBlob = (ox, oy) => {
                ctx.beginPath();
                for (let j = 0; j <= pts; j++) {
                    const t  = (j / pts) * Math.PI * 2;
                    const wobble = 0.55 + rand() * 0.70;  // per-point radius wobble
                    const bx = ox + Math.cos(rot) * Math.cos(t) * rx * wobble
                                  - Math.sin(rot) * Math.sin(t) * ry * wobble;
                    const by = oy + Math.sin(rot) * Math.cos(t) * rx * wobble
                                  + Math.cos(rot) * Math.sin(t) * ry * wobble;
                    j === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
                }
                ctx.closePath();
                ctx.fill();
            };

            // Draw blob + tiled copies so pattern tiles seamlessly at borders
            drawBlob(cx, cy);
            if (cx < rx * 1.5) drawBlob(cx + SIZE, cy);
            if (cx > SIZE - rx * 1.5) drawBlob(cx - SIZE, cy);
            if (cy < ry * 1.5) drawBlob(cx, cy + SIZE);
            if (cy > SIZE - ry * 1.5) drawBlob(cx, cy - SIZE);
        }
        ctx.shadowBlur = 0;
    }

    // 3. Very light noise pass — adds texture grain (tiny 1px dots)
    const grain = 28;
    for (let i = 0; i < grain; i++) {
        const col = palette[Math.floor(rand() * palette.length)];
        ctx.fillStyle = toHex(col);
        ctx.globalAlpha = 0.18 + rand() * 0.25;
        const gx = rand() * SIZE, gy = rand() * SIZE;
        ctx.fillRect(gx, gy, 1 + rand() * 2, 1 + rand() * 2);
    }
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    // One full pattern per mesh face — no stretching
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
    return tex;
}

// ── Shared camo texture cache — same palette + seed → same texture object ─────
const _camoCache = new Map();
function _getCamoTex(palette, seed) {
    const key = palette.join(',') + ':' + seed;
    if (!_camoCache.has(key)) _camoCache.set(key, _makeCamoTexture(palette, seed));
    return _camoCache.get(key);
}

// Applies real multi-blob camo texture to all non-dark, non-trim meshes
function _applyCamo(root, palette) {
    let seed = 100;
    root.traverse(child => {
        if (!child.isMesh || !child.material) return;
        const mat = child.material;
        // MeshBasicMaterial = emissive glow parts — skip them
        if (mat.isMeshBasicMaterial) return;
        if (!mat.isMeshStandardMaterial) return;
        const r = (mat.color.r * 255) | 0;
        const g = (mat.color.g * 255) | 0;
        const b = (mat.color.b * 255) | 0;
        // Skip near-black structural parts
        if (r < 45 && g < 45 && b < 45) return;
        // Skip gold trim
        if (r > 190 && g > 150 && b < 80) return;

        child.material = new THREE.MeshStandardMaterial({
            map:       _getCamoTex(palette, seed),
            roughness: 0.97,
            metalness: 0.0,
        });
        child.material.needsUpdate = true;
        seed += 53; // Different blob layout per mesh part
    });
}

// ── MOLTEN CORE GUNNER remodel ────────────────────────────────────────────────
// Replaces the gunner head with a cracked-armour + glowing-core structure.
function _buildGunnerMolten(head, level = 1, branch = null) {
    const matCracked = new THREE.MeshStandardMaterial({
        color: 0x0d0805, metalness: 0.1, roughness: 0.94 });
    const coreIntensity = 2.2 + (level - 1) * 0.3; // brightens with level
    const matLava = new THREE.MeshStandardMaterial({
        color: 0x1a0500, roughness: 0.5, metalness: 0.0,
        emissive: new THREE.Color(0xFF4500), emissiveIntensity: coreIntensity });
    const matCore = new THREE.MeshStandardMaterial({
        color: 0x2a0800, roughness: 0.25, metalness: 0.0,
        emissive: new THREE.Color(0xFF6600), emissiveIntensity: 2.8 + (level - 1) * 0.4 });
    const matBarrel = new THREE.MeshStandardMaterial({
        color: 0x0a0400, roughness: 0.6, metalness: 0.2,
        emissive: new THREE.Color(0xFF2200), emissiveIntensity: 1.4 });
    const matGlow = new THREE.MeshStandardMaterial({
        color: 0x0d0300, roughness: 0.3, metalness: 0.0,
        emissive: new THREE.Color(0xFF8800), emissiveIntensity: 1.0 });
    // Level 5 Branch B (Shredder): electric-orange overcharge
    const matOvercharge = new THREE.MeshStandardMaterial({
        color: 0x0a0200, roughness: 0.2, metalness: 0.0,
        emissive: new THREE.Color(0xFFAA00), emissiveIntensity: 4.0 });

    // Swivel ring (dark charcoal)
    const swivel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.5 })
    );
    swivel.position.y = 0.18; head.add(swivel);

    // 4 cracked armour panels — size + spread grow with level
    const panelAngles = [0, Math.PI/2, Math.PI, Math.PI*1.5];
    const outward  = 0.58 + (level - 1) * 0.06;
    const panelH   = 1.1 + (level - 1) * 0.12;
    const panelW   = 0.85 + (level - 1) * 0.08;
    panelAngles.forEach((ang) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.32), matCracked);
        panel.position.set(Math.sin(ang)*outward, 1.05, Math.cos(ang)*outward);
        panel.rotation.y = -ang;
        panel.rotation.z = Math.sin(ang) * 0.14;
        panel.rotation.x = Math.cos(ang) * 0.14;
        head.add(panel);

        // Lava crack in gap
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.25, 0.06), matLava);
        const crackAng = ang + Math.PI/4;
        crack.position.set(Math.sin(crackAng)*0.78, 1.05, Math.cos(crackAng)*0.78);
        head.add(crack);
    });

    // Lava crack cross
    const topCrackH = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), matLava);
    topCrackH.position.set(0, 1.75, 0); head.add(topCrackH);
    const topCrackV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.5), matLava);
    topCrackV.position.set(0, 1.75, 0); head.add(topCrackV);

    // Lv2+: diagonal cracks added
    if (level >= 2) {
        [Math.PI/4, Math.PI*3/4, Math.PI*5/4, Math.PI*7/4].forEach(ang => {
            const dc = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.0), matLava);
            dc.position.set(Math.cos(ang)*0.35, 1.65, Math.sin(ang)*0.35);
            dc.rotation.y = ang; head.add(dc);
        });
    }

    // Glowing MOLTEN CORE sphere
    const coreSize = 0.45 + (level - 1) * 0.05;
    const core = new THREE.Mesh(new THREE.SphereGeometry(coreSize, 12, 12), matCore);
    core.position.set(0, 1.05, 0); head.add(core);

    // Inner corona ring
    const corona = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 8, 20), matGlow);
    corona.rotation.x = Math.PI/2; corona.position.set(0, 1.05, 0); head.add(corona);

    // Lv3+: second outer corona
    if (level >= 3) {
        const corona2 = new THREE.Mesh(new THREE.TorusGeometry(0.80, 0.045, 8, 24), matLava);
        corona2.rotation.x = Math.PI/2; corona2.position.set(0, 1.05, 0); head.add(corona2);
    }

    // Horizontal lava belt
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 6, 20), matLava);
    belt.rotation.x = Math.PI/2; belt.position.set(0, 1.05, 0); head.add(belt);

    if (level >= 4) {
        // Lv4+: TWIN barrels only — the single center barrel is gone
        [-0.35, 0.35].forEach(offX => {
            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4), matBarrel);
            b2.rotation.x = Math.PI/2; b2.position.set(offX, 1.05, 1.6); head.add(b2);
            // Each twin barrel gets its own muzzle knob
            const muzzle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.28), matGlow);
            muzzle2.rotation.x = Math.PI/2; muzzle2.position.set(offX, 1.05, 2.85); head.add(muzzle2);
        });
    } else {
        // Lv1-3: single center barrel with muzzle knob
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.4), matBarrel);
        barrel.rotation.x = Math.PI/2; barrel.position.set(0, 1.05, 1.6); head.add(barrel);
        // Muzzle brake
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3), matGlow);
        muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 1.05, 2.85); head.add(muzzle);
    }

    // Side heat exhaust vents
    [-0.72, 0.72].forEach(xOff => {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.25), matLava);
        vent.position.set(xOff, 1.35, -0.2); head.add(vent);
        const plume = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), matGlow);
        plume.rotation.x = Math.PI; plume.position.set(xOff, 1.78, -0.2); head.add(plume);
    });

    // Floating lava droplets
    [[-0.3, 1.7, 0.2],[0.3, 1.8, -0.1],[0, 1.85, 0.3]].forEach(([x,y,z]) => {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), matGlow);
        drop.position.set(x, y, z); head.add(drop);
    });

    // Lv5 Branch A (Doomsday): Full eruption — WIDE blast plates + magma crown + eruption pillar
    if (level === 5 && branch === 'A') {
        // Blast-open extra wide side panels
        [-0.9, 0.9].forEach(xOff => {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.18), matCracked);
            plate.position.set(xOff, 1.05, 0);
            plate.rotation.z = xOff > 0 ? 0.35 : -0.35;
            head.add(plate);
        });
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.9, 8), matCore);
        pillar.position.set(0, 2.35, 0); head.add(pillar);
        for (let i = 0; i < 8; i++) {
            const ang = (i/8)*Math.PI*2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 4), matLava);
            spike.position.set(Math.cos(ang)*0.28, 2.7, Math.sin(ang)*0.28);
            spike.rotation.z = -ang + Math.PI/2; head.add(spike);
        }
        // Extra magma pools on top of each panel
        panelAngles.forEach(ang => {
            const pool = new THREE.Mesh(new THREE.SphereGeometry(0.11, 5, 5), matCore);
            pool.position.set(Math.sin(ang)*outward, 1.75, Math.cos(ang)*outward);
            head.add(pool);
        });
    }
    // Lv5 Branch B (Shredder): OVERCHARGE — panels clamp TIGHT, core BLAZES, 3 angled rapid-fire coronas
    if (level === 5 && branch === 'B') {
        // Compressed tight shell: push panels inward
        panelAngles.forEach((ang) => {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.18), matOvercharge);
            cap.position.set(Math.sin(ang)*0.45, 1.75, Math.cos(ang)*0.45);
            cap.rotation.y = -ang; head.add(cap);
        });
        [0, Math.PI/3, Math.PI*2/3].forEach(angle => {
            const oc = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 6, 20), matOvercharge);
            oc.rotation.x = Math.PI/2 + angle * 0.55;
            oc.rotation.z = angle;
            oc.position.set(0, 1.05, 0); head.add(oc);
        });
        // Chainsaw-style ring at muzzle end
        const buzzRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 16), matOvercharge);
        buzzRing.rotation.x = Math.PI/2; buzzRing.position.set(0, 1.05, 2.85); head.add(buzzRing);
    }
}

// ── CRYSTAL SCOPE SNIPER remodel ─────────────────────────────────────────────
// Lv1: sleek crystal carbine — hexagonal prism stock, single barrel, cyan gem
// Lv2: TWIN barrels + wide power-crystal chassis + side resonators
// Lv3: Floating shard array + holographic sight ring + conduit rails
// Lv4: Massive shrouded cannon body + orbital gem ring + focus cone
// Lv5A: RAILGUN LANCE — ultra-long barrel with convergence coils
// Lv5B: PRISM SCATTER — triangular splitter + 3 fan barrels + shard crown
function _buildSniperCrystal(head, level = 1, branch = null) {
    const glow = 0.7 + (level - 1) * 0.35;
    const matX = new THREE.MeshStandardMaterial({
        color: 0xAAEEFF, metalness: 0.9, roughness: 0.0,
        emissive: 0x00AADD, emissiveIntensity: glow * 0.5,
        transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const matSolid = new THREE.MeshStandardMaterial({
        color: 0xDDF8FF, metalness: 1.0, roughness: 0.0,
        emissive: 0x60D0FF, emissiveIntensity: 0.35 + (level-1) * 0.1 });
    const matCore = new THREE.MeshStandardMaterial({
        color: 0x001C2E, roughness: 0.3,
        emissive: 0x00E8FF, emissiveIntensity: 2.5 + (level-1) * 0.5 });
    const matVein = new THREE.MeshStandardMaterial({
        color: 0x000510, roughness: 0.2,
        emissive: 0x0066FF, emissiveIntensity: 3.0 + (level-1) * 0.4 });

    // Hexagonal crystal stock
    const stock = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 6), matX);
    stock.rotation.x = Math.PI/2; stock.position.set(0, 0.9, -0.5); head.add(stock);
    // Chrome grip block
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), matSolid);
    grip.position.set(0, 0.8, 0.4); head.add(grip);
    // Core gem
    const gem = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), matX);
    gem.position.set(0, 0.9, 0.4); gem.rotation.z = 0.4; head.add(gem);
    const gemCore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), matCore);
    gemCore.position.set(0, 0.9, 0.4); head.add(gemCore);
    // Single barrel (visible only at lv1)
    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.0, 6), matSolid);
    barrel1.rotation.x = Math.PI/2; barrel1.position.set(0, 0.95, 1.9); head.add(barrel1);
    const muzzle1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), matCore);
    muzzle1.position.set(0, 0.95, 3.4); head.add(muzzle1);
    // Scope
    const scopeBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.9), matX);
    scopeBox.position.set(0, 1.28, 0.5); head.add(scopeBox);
    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), matCore);
    scopeLens.rotation.x = Math.PI/2; scopeLens.position.set(0, 1.28, 0.03); head.add(scopeLens);

    // ── LEVEL 2: Twin barrels + power crystal chassis ─────────────────────────
    if (level >= 2) {
        barrel1.visible = false; muzzle1.visible = false;
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 1.1), matSolid);
        chassis.position.set(0, 0.85, 0.4); head.add(chassis);
        const chassisGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), matX);
        chassisGem.position.set(0, 0.85, 0.4); chassisGem.rotation.x = 0.3; head.add(chassisGem);
        const chassisCore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), matCore);
        chassisCore.position.set(0, 0.85, 0.4); head.add(chassisCore);
        [-0.28, 0.28].forEach(ox => {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.10, 3.4, 6), matSolid);
            b.rotation.x = Math.PI/2; b.position.set(ox, 0.95, 2.1); head.add(b);
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), matCore);
            tip.position.set(ox, 0.95, 3.8); head.add(tip);
        });
        [-0.7, 0.7].forEach(ox => {
            const res = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), matX);
            res.position.set(ox, 0.9, 0.3); head.add(res);
            const resV = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4), matVein);
            resV.position.set(ox > 0 ? ox-0.35 : ox+0.35, 0.9, 0.3); resV.rotation.z = Math.PI/2; head.add(resV);
        });
    }

    // ── LEVEL 3: Floating shard array + holographic sight ring ───────────────
    if (level >= 3) {
        const bigCrystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), matX);
        bigCrystal.position.set(0, 0.9, -0.3); bigCrystal.rotation.y = 0.6; head.add(bigCrystal);
        const bigCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), matCore);
        bigCore.position.set(0, 0.9, -0.3); head.add(bigCore);
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const shard = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38, 4), matX);
            shard.position.set(Math.cos(ang)*0.65, 0.9 + Math.sin(ang)*0.2, -0.3 + Math.sin(ang)*0.4);
            shard.rotation.z = ang; head.add(shard);
        }
        const sightRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 24), matVein);
        sightRing.position.set(0, 0.95, 2.8); head.add(sightRing);
        [-0.52, 0.52].forEach(ox => {
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 6), matVein);
            tube.rotation.x = Math.PI/2; tube.position.set(ox, 0.95, 2.0); head.add(tube);
        });
    }

    // ── LEVEL 4: Massive barrel shroud + orbital gem ring ─────────────────────
    if (level >= 4) {
        const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 2.8, 6), matSolid);
        shroud.rotation.x = Math.PI/2; shroud.position.set(0, 0.92, 1.8); head.add(shroud);
        const channel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.85, 8), matCore);
        channel.rotation.x = Math.PI/2; channel.position.set(0, 0.92, 1.8); head.add(channel);
        const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 6, 32), matSolid);
        orbitRing.rotation.x = Math.PI/2; orbitRing.position.set(0, 0.92, 0.3); head.add(orbitRing);
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            const orbGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), matX);
            orbGem.position.set(Math.cos(ang)*0.85, 0.92, 0.3 + Math.sin(ang)*0.85); head.add(orbGem);
        }
        const focusCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.6, 6), matSolid);
        focusCone.rotation.x = -Math.PI/2; focusCone.position.set(0, 0.92, 3.55); head.add(focusCone);
        const focusCore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), matCore);
        focusCore.position.set(0, 0.92, 3.9); head.add(focusCore);
    }

    // ── LEVEL 5A: RAILGUN LANCE ───────────────────────────────────────────────
    if (level === 5 && branch === 'A') {
        const lanceLen = 6.2;
        const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, lanceLen, 6), matSolid);
        lance.rotation.x = Math.PI/2; lance.position.set(0, 0.92, 2.6); head.add(lance);
        const lanceChannel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, lanceLen+0.1, 6), matCore);
        lanceChannel.rotation.x = Math.PI/2; lanceChannel.position.set(0, 0.92, 2.6); head.add(lanceChannel);
        for (let i = 0; i < 7; i++) {
            const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 16), matVein);
            coil.rotation.x = Math.PI/2; coil.position.set(0, 0.92, -0.2 + i * 0.9); head.add(coil);
        }
        const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 6), matCore);
        spearTip.rotation.x = -Math.PI/2; spearTip.position.set(0, 0.92, 5.95); head.add(spearTip);
    }

    // ── LEVEL 5B: PRISM SCATTER RIFLE ────────────────────────────────────────
    if (level === 5 && branch === 'B') {
        const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 3), matX);
        prism.rotation.x = Math.PI/2; prism.position.set(0, 0.92, 2.2); head.add(prism);
        const prismCore = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), matCore);
        prismCore.position.set(0, 0.92, 2.2); head.add(prismCore);
        [[-0.45, 0.08, 1.4], [0, 0, 1.5], [0.45, 0.08, 1.4]].forEach(([ox, oy, oz], i) => {
            const tilt = (i - 1) * 0.18;
            const fb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), matSolid);
            fb.rotation.x = Math.PI/2; fb.rotation.z = tilt;
            fb.position.set(ox + tilt*2.0, 0.92 + oy, 2.2 + oz); head.add(fb);
            const ftip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), matCore);
            ftip.position.set(ox + tilt*3.0, 0.92 + oy, 3.35 + oz); head.add(ftip);
        });
        [[-0.4, 1.5, 2.0],[0, 1.8, 1.9],[0.4, 1.5, 2.0]].forEach(([px,py,pz]) => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 4), matX);
            spike.position.set(px, py, pz); head.add(spike);
        });
    }
}

// ── OVERVOLT TESLA remodel ────────────────────────────────────────────────────
function _buildTeslaOvervolt(head, level = 1, branch = null) {
    const arcIntensity = 2.6 + (level - 1) * 0.35;
    const matBlackCore = new THREE.MeshStandardMaterial({
        color: 0x04040a, metalness: 0.2, roughness: 0.65 });
    const matArc = new THREE.MeshStandardMaterial({
        color: 0x050505, metalness: 0.0, roughness: 0.3,
        emissive: new THREE.Color(0xFFFF00), emissiveIntensity: arcIntensity });
    const matCoil = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a, metalness: 0.8, roughness: 0.1,
        emissive: new THREE.Color(0xEEEE00), emissiveIntensity: 0.8 + (level - 1) * 0.15 });
    const matSpark = new THREE.MeshStandardMaterial({
        color: 0x010101, metalness: 0.0, roughness: 0.2,
        emissive: new THREE.Color(0xFFFFAA), emissiveIntensity: 3.5 + (level - 1) * 0.3 });

    // Heavy base ring
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.4, 16), matBlackCore);
    baseRing.position.y = 0.2; head.add(baseRing);

    // Lv2+: outer insulator ring
    if (level >= 2) {
        const outer = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 6, 20), matCoil);
        outer.rotation.x = Math.PI/2; outer.position.y = 0.4; head.add(outer);
    }

    // Central containment cylinder
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 1.6, 8), matBlackCore);
    chamber.position.y = 1.2; head.add(chamber);

    // Arc emitter rods — more rods at higher levels
    const rodCount = Math.min(4 + (level - 1), 8);
    for (let i = 0; i < rodCount; i++) {
        const ang = (i/rodCount) * Math.PI * 2;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.0, 6), matCoil);
        rod.position.set(Math.cos(ang)*0.72, 1.2, Math.sin(ang)*0.72);
        head.add(rod);
        // Arc tip ball
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), matSpark);
        tip.position.set(Math.cos(ang)*0.72, 2.3, Math.sin(ang)*0.72);
        head.add(tip);
        // Arc diagonal line to center
        const arcLine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.8, 4), matArc);
        arcLine.position.set(Math.cos(ang)*0.36, 2.0, Math.sin(ang)*0.36);
        arcLine.rotation.x = Math.cos(ang+Math.PI/4) * 0.5;
        arcLine.rotation.z = -Math.sin(ang+Math.PI/4) * 0.5;
        head.add(arcLine);
    }

    // Overloaded core orb
    const coreSize = 0.38 + (level - 1) * 0.05;
    const core = new THREE.Mesh(new THREE.SphereGeometry(coreSize, 10, 10), matArc);
    core.position.y = 2.25; head.add(core);

    // Primary corona ring
    const corona = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 20), matCoil);
    corona.rotation.x = Math.PI/2; corona.position.y = 2.25; head.add(corona);

    // Second corona
    const corona2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 20), matArc);
    corona2.rotation.x = Math.PI/3; corona2.position.y = 2.25; head.add(corona2);

    // Lv3+: third orbital corona at different angle
    if (level >= 3) {
        const corona3 = new THREE.Mesh(new THREE.TorusGeometry(0.60, 0.04, 6, 24), matSpark);
        corona3.rotation.z = Math.PI/4; corona3.position.y = 2.25; head.add(corona3);
    }

    // Chamber crack seams
    ['x','z'].forEach(axis => {
        const seam = new THREE.Mesh(new THREE.BoxGeometry(
            axis==='x'?0.05:1.32, 1.62, axis==='z'?0.05:1.32), matArc);
        seam.position.y = 1.2; head.add(seam);
    });

    // Lv4+: diagonal seams on chamber
    if (level >= 4) {
        [Math.PI/4, Math.PI*3/4].forEach(ang => {
            const ds = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.62, 0.04), matArc);
            ds.position.y = 1.2; ds.rotation.y = ang; head.add(ds);
        });
    }

    // Lv5 Branch A (Storm): crown of extra spark tips above core
    if (level === 5 && branch === 'A') {
        for (let i = 0; i < 8; i++) {
            const ang = (i/8)*Math.PI*2;
            const crown = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 4), matSpark);
            crown.position.set(Math.cos(ang)*0.45, 2.75, Math.sin(ang)*0.45);
            crown.rotation.z = Math.cos(ang) * 0.7;
            crown.rotation.x = Math.sin(ang) * 0.7;
            head.add(crown);
        }
    }
    // Lv5 Branch B (Chain): extra outer ring of satellite rods
    if (level === 5 && branch === 'B') {
        for (let i = 0; i < 4; i++) {
            const ang = (i/4)*Math.PI*2 + Math.PI/4;
            const satRod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), matCoil);
            satRod.position.set(Math.cos(ang)*1.1, 1.4, Math.sin(ang)*1.1);
            head.add(satRod);
            const satTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), matSpark);
            satTip.position.set(Math.cos(ang)*1.1, 2.2, Math.sin(ang)*1.1);
            head.add(satTip);
        }
    }
}

// ── VOID CUTTER LASER remodel ─────────────────────────────────────────────────
function _buildLaserVoid(head, baseGroup, level = 1, branch = null) {
    const seamIntensity = 2.5 + (level - 1) * 0.35;
    const matVoid = new THREE.MeshStandardMaterial({
        color: 0x020204, metalness: 1.0, roughness: 0.0 });
    const matSeam = new THREE.MeshStandardMaterial({
        color: 0x050003, metalness: 0.0, roughness: 0.2,
        emissive: new THREE.Color(0xFF00FF), emissiveIntensity: seamIntensity });
    const matEdge = new THREE.MeshStandardMaterial({
        color: 0x080005, metalness: 0.8, roughness: 0.02,
        emissive: new THREE.Color(0xCC00DD), emissiveIntensity: 1.2 + (level - 1) * 0.25 });
    const matCore = new THREE.MeshStandardMaterial({
        color: 0x020002, metalness: 0.0, roughness: 0.1,
        emissive: new THREE.Color(0xFF44FF), emissiveIntensity: 3.5 + (level - 1) * 0.45 });
    const matCrack = new THREE.MeshStandardMaterial({
        color: 0x030004, emissive: new THREE.Color(0xDD00FF), emissiveIntensity: 4.0 });

    // ── LEGENDARY CUSTOM PLATFORM — void-shattered obsidian base ──────────
    // Build directly on baseGroup if available, else on head offset
    // We'll add all platform pieces to baseGroup at world y level
    // Cracked obsidian slab platform
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.15, 0.38, 6), matVoid);
    slab.position.y = 0.19; baseGroup.add(slab);
    // Void crack lines radiating from center (magenta energy seeping from fractures)
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.7), matCrack);
        crack.position.set(Math.cos(ang)*0.7, 0.39, Math.sin(ang)*0.7);
        crack.rotation.y = ang; baseGroup.add(crack);
    }
    // 6 obsidian spike shards at platform rim, tilted outward
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 4), matVoid);
        shard.position.set(Math.cos(ang)*1.82, 0.72, Math.sin(ang)*1.82);
        shard.rotation.z = Math.cos(ang)*0.35;
        shard.rotation.x = Math.sin(ang)*0.35;
        baseGroup.add(shard);
        // Magenta shard tip glow
        const shardTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), matSeam);
        shardTip.position.set(Math.cos(ang)*2.04, 1.05, Math.sin(ang)*2.04); baseGroup.add(shardTip);
    }
    // Platform magenta seam ring
    const platRing = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.05, 6, 30), matSeam);
    platRing.rotation.x = Math.PI/2; platRing.position.y = 0.4; baseGroup.add(platRing);
    // Central void pillar rising from platform
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.95, 1.0, 6), matVoid);
    pillar.position.y = 0.88; baseGroup.add(pillar);
    // Pillar void seams
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const pvs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), matSeam);
        pvs.position.set(Math.cos(ang)*0.78, 0.88, Math.sin(ang)*0.88); baseGroup.add(pvs);
    }

    // ── VOID HOUSING — angular hexagonal prism atop pillar ────────────────
    const hexBody = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 1.5, 6), matVoid);
    hexBody.position.y = 1.88; head.add(hexBody);
    // Magenta seam lines along hex body edges
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), matSeam);
        seam.position.set(Math.cos(ang)*0.66, 1.88, Math.sin(ang)*0.66); head.add(seam);
    }
    // Horizontal void seam band at housing equator
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.045, 6, 22), matSeam);
    band.rotation.x = Math.PI/2; band.position.y = 1.88; head.add(band);
    // Housing top cap
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.2, 6), matEdge);
    topCap.position.y = 2.68; head.add(topCap);

    // Lv2+: second raised edge ring on housing
    if (level >= 2) {
        const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 22), matSeam);
        band2.rotation.x = Math.PI/2; band2.position.y = 2.35; head.add(band2);
        // Twin void emitter nodes on housing sides
        for (let side of [-1, 1]) {
            const node = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), matVoid);
            node.position.set(side*0.72, 1.88, 0); head.add(node);
            const nodeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), matCore);
            nodeGlow.position.set(side*0.88, 1.88, 0); head.add(nodeGlow);
        }
    }

    // Lv3+: floating void crystal orbiting ring
    if (level >= 3) {
        const band3 = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.04, 6, 22), matSeam);
        band3.rotation.x = Math.PI/2; band3.position.y = 2.55; head.add(band3);
        // 3 small floating void crystals around housing
        for (let i = 0; i < 3; i++) {
            const ang = (i/3)*Math.PI*2;
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), matEdge);
            crystal.position.set(Math.cos(ang)*1.05, 2.2, Math.sin(ang)*1.05);
            crystal.rotation.y = ang; head.add(crystal);
        }
    }

    // Top seam cross on cap
    const seamH = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.04), matSeam);
    seamH.position.y = 2.72; head.add(seamH);
    const seamV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.4), matSeam);
    seamV.position.y = 2.72; head.add(seamV);

    // Void core orb — deep black with magenta aura
    const coreSize = 0.32 + (level - 1) * 0.04;
    const core = new THREE.Mesh(new THREE.SphereGeometry(coreSize, 10, 10), matCore);
    core.position.y = 2.72; head.add(core);

    // ── BARREL — razor-edged hexagonal void lance ──────────────────────────
    const barrelLen = 3.0 + (level - 1) * 0.28;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, barrelLen, 6), matVoid);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 1.88, 2.0 + (level - 1) * 0.14);
    head.add(barrel);
    // Barrel magenta seam line
    const bSeam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, barrelLen), matSeam);
    bSeam.position.set(0.09, 1.88, 2.0 + (level - 1) * 0.14); head.add(bSeam);

    // Muzzle void aperture ring
    const muzzleZ = 1.88 + barrelLen * 0.5 + 0.6;
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.09, 0.22, 6), matEdge);
    muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 1.88, muzzleZ); head.add(muzzle);
    const muzzleCore = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 6), matCore);
    muzzleCore.rotation.x = Math.PI/2; muzzleCore.position.set(0, 1.88, muzzleZ); head.add(muzzleCore);

    // Lv4+: twin void blades flanking barrel + extra platform shard ring
    if (level >= 4) {
        [-0.28, 0.28].forEach(offX => {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, barrelLen * 0.75), matSeam);
            blade.position.set(offX, 1.88, 1.9); head.add(blade);
        });
        // Extra inner shard ring on platform
        for (let i = 0; i < 4; i++) {
            const ang = (i/4)*Math.PI*2 + Math.PI/8;
            const innerShard = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 4), matEdge);
            innerShard.position.set(Math.cos(ang)*1.25, 0.65, Math.sin(ang)*1.25);
            innerShard.rotation.z = Math.cos(ang)*0.3;
            innerShard.rotation.x = Math.sin(ang)*0.3; head.add(innerShard);
        }
    }

    // Lv5 Branch A (Death Ray): extended deep-void lance + giant aperture
    if (level === 5 && branch === 'A') {
        const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.4, 6), matCore);
        lance.rotation.x = Math.PI/2; lance.position.set(0, 1.88, muzzleZ + 0.82); head.add(lance);
        // Giant void aperture ring at lance tip
        const apertureRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 18), matSeam);
        apertureRing.rotation.y = Math.PI/2; apertureRing.position.set(0, 1.88, muzzleZ + 1.52); head.add(apertureRing);
    }
    // Lv5 Branch B (Splitter): void prism + 3 split lances radiating out
    if (level === 5 && branch === 'B') {
        const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matEdge);
        prism.position.set(0, 1.88, muzzleZ + 0.3); head.add(prism);
        // Three split beams: center + two angled
        [[0, 0], [-0.4, 0.32], [0.4, 0.32]].forEach(([xOff, zAdd], i) => {
            const split = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), matCore);
            split.rotation.x = Math.PI/2;
            split.rotation.z = i === 0 ? 0 : (i === 1 ? 0.45 : -0.45);
            split.position.set(xOff, 1.88, muzzleZ + 0.7 + zAdd); head.add(split);
        });
    }
}

// ── STAR CORE PLASMA remodel ──────────────────────────────────────────────────
function _buildPlasmaStarcore(head, level = 1, branch = null) {
    const starIntensity = 3.0 + (level - 1) * 0.4;
    const matStellar = new THREE.MeshStandardMaterial({
        color: 0xFFFBF0, metalness: 0.9, roughness: 0.02,
        emissive: new THREE.Color(0xFFDD00), emissiveIntensity: 1.2 + (level - 1) * 0.15 });
    const matStarFlare = new THREE.MeshStandardMaterial({
        color: 0xFFF0C0, metalness: 0.0, roughness: 0.1,
        emissive: new THREE.Color(0xFFCC00), emissiveIntensity: starIntensity });
    const matSolarWind = new THREE.MeshStandardMaterial({
        color: 0x201000, metalness: 0.0, roughness: 0.3,
        emissive: new THREE.Color(0xFF8800), emissiveIntensity: 1.8 + (level - 1) * 0.25 });
    const matFrame = new THREE.MeshStandardMaterial({
        color: 0xE8E0C0, metalness: 1.0, roughness: 0.05,
        emissive: new THREE.Color(0xFFAA00), emissiveIntensity: 0.3 });

    // Base containment ring
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.35, 16), matFrame);
    ring.position.y = 0.18; head.add(ring);

    // Lv2+: outer gravity ring
    if (level >= 2) {
        const gravRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 6, 24), matStellar);
        gravRing.rotation.x = Math.PI/2; gravRing.position.y = 0.35; head.add(gravRing);
    }

    // Solar panel arms — at higher levels they glow brighter
    for (let i = 0; i < 4; i++) {
        const ang = (i/4)*Math.PI*2;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.35), matFrame);
        arm.position.set(Math.cos(ang)*0.8, 1.1, Math.sin(ang)*0.8);
        arm.rotation.y = -ang;
        arm.rotation.z = Math.cos(ang) * 0.2;
        arm.rotation.x = Math.sin(ang) * 0.2;
        head.add(arm);
        // Solar collector panel
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.04), matStellar);
        panel.position.set(Math.cos(ang)*1.1, 1.3, Math.sin(ang)*1.1);
        panel.rotation.y = -ang;
        head.add(panel);
    }

    // Lv3+: secondary smaller solar arms between the main ones
    if (level >= 3) {
        for (let i = 0; i < 4; i++) {
            const ang = (i/4)*Math.PI*2 + Math.PI/4;
            const miniArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.2, 0.22), matStellar);
            miniArm.position.set(Math.cos(ang)*0.7, 1.1, Math.sin(ang)*0.7);
            miniArm.rotation.y = -ang; head.add(miniArm);
        }
    }

    // Star core — blazing white-gold sphere, grows with level
    const starSize = 0.5 + (level - 1) * 0.06;
    const star = new THREE.Mesh(new THREE.SphereGeometry(starSize, 12, 12), matStarFlare);
    star.position.y = 1.85; head.add(star);

    // Solar flare spikes — more spikes at higher levels
    const spikeCount = 6 + (level - 1) * 2;
    for (let i = 0; i < spikeCount; i++) {
        const ang = (i/spikeCount)*Math.PI*2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.6, 4), matSolarWind);
        spike.position.set(
            Math.cos(ang)*(starSize + 0.1),
            1.85 + Math.sin(ang)*0.2,
            Math.sin(ang)*(starSize + 0.1)
        );
        spike.rotation.z = -ang + Math.PI/2; head.add(spike);
    }

    // Orbital rings
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 8, 30), matStellar);
    orbitRing.rotation.x = 0.4; orbitRing.position.y = 1.85; head.add(orbitRing);
    const orbitRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.04, 6, 28), matSolarWind);
    orbitRing2.rotation.z = 0.9; orbitRing2.position.y = 1.85; head.add(orbitRing2);

    // Lv4+: third tilted orbit ring
    if (level >= 4) {
        const orbitRing3 = new THREE.Mesh(new THREE.TorusGeometry(0.80, 0.04, 8, 32), matStarFlare);
        orbitRing3.rotation.x = 1.1; orbitRing3.rotation.y = 0.6; orbitRing3.position.y = 1.85;
        head.add(orbitRing3);
    }

    // No barrel on Starcore — plasma spins 360° so it would look wrong.
    // Instead: a 4th solar arm pointing "forward" completes the symmetry.
    // (The 4-arm layout is already fully symmetrical — nothing extra needed.)

    // Lv5 Branch A (Nova): massive star burst — extra flare ring and corona
    if (level === 5 && branch === 'A') {
        const nova = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 36), matStarFlare);
        nova.rotation.x = Math.PI/2; nova.position.y = 1.85; head.add(nova);
        const novaCrown = new THREE.Mesh(new THREE.SphereGeometry(starSize + 0.12, 10, 10), 
            new THREE.MeshStandardMaterial({ color: 0xFFF8D0, metalness: 0.0, roughness: 0.1,
                emissive: new THREE.Color(0xFFEE00), emissiveIntensity: 1.5, transparent: true, opacity: 0.35 }));
        novaCrown.position.y = 1.85; head.add(novaCrown);
    }
    // Lv5 Branch B (Singularity): dark matter rings — additional void-black rings
    if (level === 5 && branch === 'B') {
        const matDarkMatter = new THREE.MeshStandardMaterial({
            color: 0x050204, metalness: 0.0, roughness: 0.1,
            emissive: new THREE.Color(0xAA00FF), emissiveIntensity: 2.5 });
        [0.55, 0.88].forEach(r => {
            const dm = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 28), matDarkMatter);
            dm.rotation.y = r * 2; dm.position.y = 1.85; head.add(dm);
        });
    }
}

// ── PERMAFROST ICE remodel ────────────────────────────────────────────────────
function _buildIcePermafrost(head, level = 1, branch = null) {
    const glow = 2.0 + (level - 1) * 0.3;
    const matIce = new THREE.MeshStandardMaterial({
        color: 0xDDF8FF, metalness: 1.0, roughness: 0.0,
        emissive: new THREE.Color(0x80DFFF), emissiveIntensity: glow });
    const matFrost = new THREE.MeshStandardMaterial({
        color: 0xEEF8FF, metalness: 0.8, roughness: 0.08,
        emissive: new THREE.Color(0xAAEEFF), emissiveIntensity: 0.7 + (level-1)*0.1 });
    const matCore = new THREE.MeshStandardMaterial({
        color: 0xF8FFFF, metalness: 0.0, roughness: 0.1,
        emissive: new THREE.Color(0xCCF4FF), emissiveIntensity: 3.8 + (level-1)*0.4 });

    // Icy base disc
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.4, 12), matIce);
    base.position.y = 0.2; head.add(base);

    // Icicle fringe around base
    for (let i = 0; i < 10; i++) {
        const ang = (i/10)*Math.PI*2;
        const sz = 0.25 + Math.sin(i*1.7)*0.12;
        const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.06, sz+0.3, 4), matFrost);
        icicle.position.set(Math.cos(ang)*1.15, 0.0 - sz/2, Math.sin(ang)*1.15);
        icicle.rotation.x = Math.PI; head.add(icicle);
    }

    // Ice spike pillars radiating outward — count grows with level
    const pillarCount = 3 + Math.min(level-1, 3);
    for (let i = 0; i < pillarCount; i++) {
        const ang = (i/pillarCount)*Math.PI*2;
        const h = 2.4 + (level-1)*0.15;
        const pillar = new THREE.Mesh(new THREE.ConeGeometry(0.26, h, 4), matFrost);
        pillar.position.set(Math.cos(ang)*0.88, h/2 + 0.4, Math.sin(ang)*0.88);
        pillar.rotation.z = Math.cos(ang)*0.16;
        pillar.rotation.x = Math.sin(ang)*0.16;
        head.add(pillar);
        // Inner glow shard inside each pillar
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.13, h*0.75, 4), matCore);
        inner.position.set(Math.cos(ang)*0.88, h/2 + 0.5, Math.sin(ang)*0.88);
        inner.rotation.z = Math.cos(ang)*0.16; inner.rotation.x = Math.sin(ang)*0.16;
        head.add(inner);
    }

    // Frost cage rings connecting pillars
    for (let r = 0; r < 2 + level; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.045, 5, 18), matIce);
        ring.rotation.x = Math.PI/2; ring.position.y = 0.8 + r * 0.65; head.add(ring);
    }

    // Blazing frozen core
    const coreSize = 0.42 + (level-1)*0.05;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(coreSize, 1), matCore);
    core.position.y = 1.85; head.add(core);
    const disc1 = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 8, 24), matIce);
    disc1.rotation.x = Math.PI/2; disc1.position.y = 1.85; head.add(disc1);
    if (level >= 3) {
        const disc2 = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.04, 6, 20), matFrost);
        disc2.rotation.x = Math.PI/3; disc2.position.y = 1.85; head.add(disc2);
    }
    if (level === 5 && branch === 'A') {
        const shell = new THREE.Mesh(new THREE.SphereGeometry(1.55, 10, 10), matIce);
        shell.material = shell.material.clone(); shell.material.transparent = true; shell.material.opacity = 0.22;
        shell.position.y = 1.85; head.add(shell);
    }
    if (level === 5 && branch === 'B') {
        for (let i = 0; i < 8; i++) {
            const ang = (i/8)*Math.PI*2;
            const lance = new THREE.Mesh(new THREE.ConeGeometry(0.1, 2.0, 4), matIce);
            lance.position.set(Math.cos(ang)*0.95, 1.5, Math.sin(ang)*0.95);
            lance.rotation.z = Math.cos(ang)*1.05; lance.rotation.x = Math.sin(ang)*1.05;
            head.add(lance);
        }
    }
}

// ── LIQUID CHROME MINIGUN remodel ─────────────────────────────────────────────
function _buildMinigunLiquidChrome(head, level = 1, branch = null) {
    // Chrome sheen intensifies each level
    const sheen = 0.25 + (level-1)*0.12;
    const matChrome = new THREE.MeshStandardMaterial({
        color: 0xE0E0E4, metalness: 1.0, roughness: 0.0,
        emissive: new THREE.Color(0xFFFFFF), emissiveIntensity: sheen });
    const matMirror = new THREE.MeshStandardMaterial({
        color: 0xC8C8CC, metalness: 1.0, roughness: 0.0 });
    const matAccent = new THREE.MeshStandardMaterial({
        color: 0xB0B8C0, metalness: 1.0, roughness: 0.02,
        emissive: new THREE.Color(0xCCEEFF), emissiveIntensity: 0.3 + (level-1)*0.1 });
    const matBlue = new THREE.MeshStandardMaterial({
        color: 0x001828, emissive: new THREE.Color(0x44AAFF), emissiveIntensity: 1.8 + (level-1)*0.3 });

    // ── LEVEL 1: Core chrome platform ─────────────────────────────────────
    // Heavy mirror-polish swivel base with rim bevel
    const swivel = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.32, 18), matMirror);
    swivel.position.y = 0.16; head.add(swivel);
    const swivelRim = new THREE.Mesh(new THREE.TorusGeometry(1.07, 0.06, 6, 22), matAccent);
    swivelRim.rotation.x = Math.PI/2; swivelRim.position.y = 0.3; head.add(swivelRim);

    // Chrome turret body — wider, more imposing than default
    const turret = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.05, 1.65), matChrome);
    turret.position.y = 0.8; head.add(turret);
    // Turret edge trim strips
    for (let side of [-1, 1]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, 1.65), matAccent);
        trim.position.set(side*0.62, 0.8, 0); head.add(trim);
    }

    // Chrome ammo drum (larger than default)
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.9, 22), matChrome);
    drum.rotation.z = Math.PI/2; drum.position.set(1.0, 0.8, -0.2); head.add(drum);
    const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.05, 8, 22), matAccent);
    dRing.rotation.y = Math.PI/2; dRing.position.set(1.0, 0.8, -0.2); head.add(dRing);
    // Drum face plate
    const drumFace = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), matMirror);
    drumFace.rotation.z = Math.PI/2; drumFace.position.set(1.48, 0.8, -0.2); head.add(drumFace);

    // Barrel cluster — mirror chrome tubes
    const gunGroup = new THREE.Group();
    gunGroup.position.set(-0.22, 0.8, 0.85); head.add(gunGroup);
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 1.1), matMirror);
    gunGroup.add(motor);
    // Motor face ring
    const motorRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 14), matAccent);
    motorRing.position.z = 0.55; gunGroup.add(motorRing);

    const barrelCount = (level >= 4) ? 8 : 6;
    for (let i = 0; i < barrelCount; i++) {
        const ang = (i/barrelCount)*Math.PI*2;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 3.1), matChrome);
        b.rotation.x = Math.PI/2;
        b.position.set(Math.cos(ang)*0.27, Math.sin(ang)*0.27, 1.55); gunGroup.add(b);
        // Polished chrome muzzle tip per barrel
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.065, 0.18, 8), matAccent);
        tip.rotation.x = Math.PI/2;
        tip.position.set(Math.cos(ang)*0.27, Math.sin(ang)*0.27, 3.2); gunGroup.add(tip);
    }
    // Barrel clamp rings
    const cl1 = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.05, 6, 14), matMirror);
    cl1.position.z = 1.7; gunGroup.add(cl1);
    const cl2 = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.05, 6, 14), matMirror);
    cl2.position.z = 2.95; gunGroup.add(cl2);

    // ── LEVEL 2: Targeting sensor head + blue glow strip ──────────────────
    if (level >= 2) {
        const sBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.48), matAccent);
        sBase.position.set(0, 1.52, 0); head.add(sBase);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.5), matChrome);
        lens.rotation.x = Math.PI/2; lens.position.set(0, 1.52, 0.3); head.add(lens);
        const lensGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), matBlue);
        lensGlow.rotation.x = Math.PI/2; lensGlow.position.set(0, 1.52, 0.58); head.add(lensGlow);
        // Blue glow strip along turret top
        const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.05, 0.06), matBlue);
        glowStrip.position.set(0, 1.34, 0.8); head.add(glowStrip);
    }

    // ── LEVEL 3: Side heat-sink vanes + second drum ring ──────────────────
    if (level >= 3) {
        // Large heat-sink fins on turret sides
        for (let side of [-1, 1]) {
            for (let f = 0; f < 4; f++) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.05), matMirror);
                fin.position.set(side*1.06, 0.85, -0.4 + f*0.28); head.add(fin);
            }
        }
        // Second ring on drum
        const dRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.05, 8, 22), matAccent);
        dRing2.rotation.y = Math.PI/2; dRing2.position.set(1.0, 0.8, -0.55); head.add(dRing2);
        // Third clamp ring on barrels
        const cl3 = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.05, 6, 14), matMirror);
        cl3.position.z = 2.3; gunGroup.add(cl3);
    }

    // ── LEVEL 4: 8 barrels (already handled above) + blast deflectors ─────
    if (level >= 4 && !(level === 5 && branch === 'B')) {
        // Two large angled blast deflector plates flanking barrel cluster
        for (let side of [-1, 1]) {
            const def = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 1.8), matChrome);
            def.rotation.z = side * 0.2;
            def.position.set(side*0.62, 0.8, 1.8); head.add(def);
            // Deflector chrome edge bead
            const bead = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.8), matAccent);
            bead.position.set(side*0.65, 1.17, 1.8); head.add(bead);
        }
        // Heavy forward turret brow with blue accent
        const brow = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.18, 0.22), matMirror);
        brow.position.set(0, 1.38, 0.82); head.add(brow);
        const browGlow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), matBlue);
        browGlow.position.set(0, 1.38, 0.95); head.add(browGlow);
    }

    // ── LEVEL 5A: Vulcan — chrome barrel shroud + extra clamps ────────────
    if (level === 5 && branch === 'A') {
        // Full barrel shroud — smooth chrome cylinder encasing all barrels
        const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.4, 16, 1, true), matChrome);
        shroud.rotation.x = Math.PI/2; shroud.position.set(-0.22, 0.8, 2.05); head.add(shroud);
        // Two thick clamp rings on shroud
        for (let z of [1.1, 3.0]) {
            const sc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 18), matAccent);
            sc.position.z = z; gunGroup.add(sc);
        }
        // Muzzle brake crown — wide chrome disc with slots
        const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.48, 0.22, 18), matMirror);
        muzzleBrake.rotation.x = Math.PI/2; muzzleBrake.position.set(-0.22, 0.8, 3.6); head.add(muzzleBrake);
        const muzzleGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), matBlue);
        muzzleGlow.rotation.x = Math.PI/2; muzzleGlow.position.set(-0.22, 0.8, 3.75); head.add(muzzleGlow);
    }

    // ── LEVEL 5B: Rockets — chrome rocket pod replaces barrel cluster ─────
    if (level === 5 && branch === 'B') {
        gunGroup.visible = false; // hide barrel cluster
        // Wide chrome rocket pod housing
        const podHousing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 1.6), matChrome);
        podHousing.position.set(0, 0.95, 0.5); head.add(podHousing);
        // Pod trim
        for (let side of [-1, 1]) {
            const podTrim = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 1.62), matAccent);
            podTrim.position.set(side*1.02, 0.95, 0.5); head.add(podTrim);
        }
        // 4 chrome rocket tubes in 2x2 grid
        [[-0.55, 1.22, 0.4],[0.55, 1.22, 0.4],[-0.55, 0.68, 0.4],[0.55, 0.68, 0.4]].forEach(([x,y,z]) => {
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.55, 12), matMirror);
            tube.rotation.x = Math.PI/2; tube.position.set(x, y, z); head.add(tube);
            // Rocket warhead cone
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 12), matAccent);
            cone.rotation.x = -Math.PI/2; cone.position.set(x, y, z+1.02); head.add(cone);
            // Glow exhaust nozzle at back
            const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.18, 12), matBlue);
            nozzle.rotation.x = Math.PI/2; nozzle.position.set(x, y, z-0.86); head.add(nozzle);
        });
        // Cross brace between pods
        const brace = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), matAccent);
        brace.position.set(0, 0.95, 1.0); head.add(brace);
    }
}

// ── GILDED SIEGE CANNON remodel ───────────────────────────────────────────────
function _buildCannonGilded(head, level = 1, branch = null) {
    const gleam = 0.58 + (level-1)*0.12;
    const matGoldLeaf = new THREE.MeshStandardMaterial({
        color: 0xFFD700, metalness: 1.0, roughness: 0.03,
        emissive: new THREE.Color(0xFF8C00), emissiveIntensity: gleam });
    const matPolished = new THREE.MeshStandardMaterial({
        color: 0xE8C000, metalness: 1.0, roughness: 0.0,
        emissive: new THREE.Color(0xFFAA00), emissiveIntensity: 0.3 });
    const matRichWood = new THREE.MeshStandardMaterial({
        color: 0x6B3A1F, metalness: 0.0, roughness: 0.88 });
    const matJewel = new THREE.MeshStandardMaterial({
        color: 0xFF1100, metalness: 0.0, roughness: 0.05,
        emissive: new THREE.Color(0xFF4400), emissiveIntensity: 1.8 });

    // Ornate gold-leaf carriage sides
    const carriageL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.6, 0.42), matRichWood);
    carriageL.position.set(-1.05, 0.85, -0.55); carriageL.rotation.z = 0.28; head.add(carriageL);
    const carriageR = carriageL.clone(); carriageR.position.set(1.05, 0.85, -0.55);
    carriageR.rotation.z = -0.28; head.add(carriageR);

    // Gold platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.4, 2.1), matGoldLeaf);
    platform.position.y = 0.2; head.add(platform);
    // Filigree trim strips on platform edges
    for (let side = -1; side <= 1; side += 2) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 0.1), matPolished);
        trim.position.set(0, 0.44, side*1.0); head.add(trim);
    }

    // Gilded wheels with gold spokes
    [[-1.45, 0.7, -0.45],[1.45, 0.7, -0.45]].forEach(([x,y,z]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.3, 14), matRichWood);
        wheel.rotation.z = Math.PI/2; wheel.position.set(x,y,z); head.add(wheel);
        for (let i = 0; i < 8; i++) {
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.58, 0.055), matGoldLeaf);
            const a = (i/8)*Math.PI*2; spoke.rotation.z = a;
            spoke.position.set(Math.sin(a)*0.3, Math.cos(a)*0.3, 0); wheel.add(spoke);
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 8), matGoldLeaf);
        hub.rotation.z = Math.PI/2; wheel.add(hub);
    });

    // Magnificent gold barrel
    const barLen = (branch === 'A') ? 2.9 : 4.1;
    const barRad = (branch === 'A') ? 0.70 : 0.58;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(barRad, barRad*1.15, barLen, 22), matGoldLeaf);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 1.2, 1.55); head.add(barrel);

    // Jeweled bands — evenly spread within barrel bounds so none float in air
    const barrelStart = 1.55 - barLen/2 + 0.3;
    const barrelEnd   = 1.55 + barLen/2 - 0.35;
    const bandCount   = 2 + Math.min(level - 1, 3); // 2..5 bands, never overflows
    const gildedBands = [];
    const gildedJewels = [];
    for (let i = 0; i < bandCount; i++) {
        const bz = barrelStart + i * (bandCount > 1 ? (barrelEnd - barrelStart) / (bandCount - 1) : 0);
        const band = new THREE.Mesh(new THREE.TorusGeometry(barRad+0.1, 0.09, 12, 22), matPolished);
        band.rotation.y = Math.PI/2; band.position.set(0, 1.2, bz); head.add(band);
        gildedBands.push(band);
        if (i % 2 === 0) {
            const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), matJewel);
            jewel.position.set(0, 1.2 + barRad + 0.12, bz); head.add(jewel);
            gildedJewels.push(jewel);
        }
    }

    // Ornate muzzle crown at the actual barrel tip
    const muzzleZ = 1.55 + barLen/2;
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(barRad+0.18, barRad+0.05, 0.44, 22), matGoldLeaf);
    muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 1.2, muzzleZ + 0.1); head.add(muzzle);
    // Crown spikes — stored so we can hide them on branch B
    const crownSpikes = [];
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 4), matGoldLeaf);
        spike.position.set(Math.cos(ang)*(barRad+0.14), 1.2 + Math.sin(ang)*(barRad+0.14), muzzleZ + 0.32);
        spike.rotation.x = Math.cos(ang)*0.4; spike.rotation.z = -Math.sin(ang)*0.4;
        head.add(spike);
        crownSpikes.push(spike);
    }

    // Cannon supports
    const suppL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.32), matRichWood);
    suppL.position.set(-0.72, 0.92, 0); head.add(suppL);
    const suppR = suppL.clone(); suppR.position.set(0.72, 0.92, 0); head.add(suppR);

    // Gold fuse with ruby tip
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 8), matGoldLeaf);
    fuse.position.set(0, 1.75, -0.28); head.add(fuse);
    const fuseTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), matJewel);
    fuseTip.position.set(0, 1.88, -0.28); head.add(fuseTip);

    // Gold cannonball stack
    if (level >= 2) {
        [[0.95,0.5,0.75],[1.15,0.5,0.55],[1.05,0.82,0.65],[-0.95,0.5,0.75],[-1.15,0.5,0.55]].forEach(([x,y,z]) => {
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), matGoldLeaf);
            ball.position.set(x,y,z); head.add(ball);
        });
    }
    if (branch === 'A') { // Howitzer — royal blast shield
        const shield = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.55, 0.26), matGoldLeaf);
        shield.position.set(0, 1.2, -1.05); head.add(shield);
        const crest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), matPolished);
        crest.position.set(0, 1.2, -1.2); head.add(crest);
    }
    if (branch === 'B') { // Grapeshot — three gold barrels
        barrel.visible = false; muzzle.visible = false;
        gildedBands.forEach(b => b.visible = false);
        gildedJewels.forEach(j => j.visible = false);
        crownSpikes.forEach(s => s.visible = false);
        for (let i = -1; i <= 1; i++) {
            const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.42, 1.9, 16), matGoldLeaf);
            sb.rotation.x = Math.PI/2; sb.position.set(i*0.72, 1.2, 0.45); head.add(sb);
            // Two rings per sub-barrel, within barrel span
            for (let r = 0; r < 2; r++) {
                const sbRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 8, 16), matPolished);
                sbRing.rotation.y = Math.PI/2; sbRing.position.set(i*0.72, 1.2, -0.1 + r*0.65); head.add(sbRing);
            }
            const smz = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.37, 0.3, 16), matGoldLeaf);
            smz.rotation.x = Math.PI/2; smz.position.set(i*0.72, 1.2, 1.36); head.add(smz);
            // 4 crown spikes at the muzzle face of each sub-barrel
            for (let s = 0; s < 4; s++) {
                const sAng = (s/4)*Math.PI*2;
                const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), matGoldLeaf);
                sp.position.set(i*0.72 + Math.cos(sAng)*0.42, 1.2 + Math.sin(sAng)*0.42, 1.53);
                sp.rotation.x = Math.cos(sAng)*0.4; sp.rotation.z = -Math.sin(sAng)*0.4;
                head.add(sp);
            }
        }
        // Gold cross-brace
        const cb = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.16), matPolished);
        cb.position.set(0, 1.2, 0.1); head.add(cb);
    }
}

// ── WHITE PHOSPHORUS FLAMETHROWER remodel ─────────────────────────────────────


// ── GOLD RUSHER FARM remodel ──────────────────────────────────────────────────
// Legendary: a working gold mine operation — shaft entrance, mining cart,
// nugget piles, pickaxe frame, and glowing gold ore veins. Completely different
// silhouette from the default barn. This doesn't grow crops — it mines wealth.
function _buildFarmGoldRusher(head, level = 1, branch = null) {
    const matGold = new THREE.MeshStandardMaterial({
        color: 0xFFD700, metalness: 0.95, roughness: 0.08,
        emissive: new THREE.Color(0xFF9900), emissiveIntensity: 0.5 });
    const matDarkGold = new THREE.MeshStandardMaterial({
        color: 0xB8860B, metalness: 0.85, roughness: 0.15,
        emissive: new THREE.Color(0xCC7700), emissiveIntensity: 0.3 });
    const matWood = new THREE.MeshStandardMaterial({ color: 0x5C3A1E, roughness: 0.95 });
    const matRock = new THREE.MeshStandardMaterial({ color: 0x3A3530, roughness: 0.9 });
    const matOre = new THREE.MeshStandardMaterial({
        color: 0x100A00, emissive: new THREE.Color(0xFFCC00), emissiveIntensity: 2.8 });

    // ── Rock base mound (mine entrance cliff face) ─────────────────────────
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.85, 9), matRock);
    cliff.position.y = 0.42; head.add(cliff);
    // Rocky face variation bumps
    [[-0.8,0.75,0.7],[0.7,0.7,-0.65],[-0.4,0.85,-1.0],[1.1,0.82,0.2]].forEach(([x,y,z]) => {
        const bump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), matRock);
        bump.position.set(x, y, z); head.add(bump);
    });

    // ── Mine shaft entrance frame ───────────────────────────────────────────
    // Vertical support beams
    for (let side of [-0.62, 0.62]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.16), matWood);
        post.position.set(side, 1.45, 0); head.add(post);
    }
    // Horizontal lintel beam
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.18, 0.16), matWood);
    lintel.position.set(0, 2.2, 0); head.add(lintel);
    // Diagonal braces
    for (let side of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), matWood);
        brace.rotation.z = side * 0.65;
        brace.position.set(side*0.35, 2.02, 0); head.add(brace);
    }
    // Dark tunnel void behind frame
    const tunnel = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.45, 0.25), matRock);
    tunnel.position.set(0, 1.42, 0.02); head.add(tunnel);
    // Glowing gold ore veins inside tunnel
    for (let i = 0; i < 4; i++) {
        const vein = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3+i*0.1, 0.06), matOre);
        vein.position.set(-0.4+i*0.25, 0.8+i*0.1, 0.08); vein.rotation.z = 0.3-i*0.15;
        head.add(vein);
    }

    // ── Mining cart on rails ────────────────────────────────────────────────
    // Rails extending from shaft
    for (let side of [-0.3, 0.3]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.8), matDarkGold);
        rail.position.set(side, 0.85, 1.05); head.add(rail);
    }
    // Rail ties
    for (let i = 0; i < 4; i++) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.1), matWood);
        tie.position.set(0, 0.82, 0.3 + i*0.4); head.add(tie);
    }
    // Cart body
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), matDarkGold);
    cart.position.set(0, 1.15, 1.0); head.add(cart);
    // Cart gold trim
    for (let side of [-0.46, 0.46]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.72), matGold);
        trim.position.set(side, 1.15, 1.0); head.add(trim);
    }
    // Cart wheels
    [[-0.35,0.9,0.72],[0.35,0.9,0.72],[-0.35,0.9,1.28],[0.35,0.9,1.28]].forEach(([x,y,z]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), matRock);
        wheel.rotation.z = Math.PI/2; wheel.position.set(x, y, z); head.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), matGold);
        hub.rotation.z = Math.PI/2; hub.position.set(x, y, z); head.add(hub);
    });
    // Gold nuggets heaped in cart
    [[0.12,1.46,0.9],[-0.12,1.44,1.05],[0.05,1.5,1.15],[-0.18,1.48,0.95]].forEach(([x,y,z]) => {
        const nugget = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), matGold);
        nugget.position.set(x, y, z); head.add(nugget);
    });

    // ── Gold nugget pile beside shaft ───────────────────────────────────────
    [[-0.88,0.88,0.55],[-1.0,0.92,0.85],[-0.78,0.96,0.72],[-0.95,0.98,0.6]].forEach(([x,y,z]) => {
        const n = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), matGold);
        n.position.set(x, y, z); head.add(n);
    });

    // ── Level upgrades ──────────────────────────────────────────────────────
    if (level >= 2) {
        // Pickaxe display leaning on frame post
        const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 1.4, 6), matWood);
        haft.rotation.z = 0.35; haft.position.set(0.85, 1.2, 0.55); head.add(haft);
        const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.08), matGold);
        axeHead.rotation.z = 0.35; axeHead.position.set(1.1, 1.85, 0.55); head.add(axeHead);
        // Gold ore glow node at cliff face
        const oreNode = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), matOre);
        oreNode.position.set(-0.95, 0.75, 0.4); head.add(oreNode);
    }
    if (level >= 3) {
        // Golden frame crown on lintel top
        const crown = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 0.22), matGold);
        crown.position.set(0, 2.36, 0); head.add(crown);
        for (let i = 0; i < 5; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4), matGold);
            spike.position.set(-0.6+i*0.3, 2.56, 0); head.add(spike);
        }
        // Second cart farther back on rails
        const cart2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.6), matDarkGold);
        cart2.position.set(0, 1.12, -0.3); head.add(cart2);
    }
    if (level >= 4) {
        // Gold vein network spreading from shaft — glowing ore lines on ground
        for (let i = 0; i < 6; i++) {
            const ang = (i/6)*Math.PI*2;
            const vein2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.9), matOre);
            vein2.position.set(Math.cos(ang)*0.9, 0.9, Math.sin(ang)*0.9);
            vein2.rotation.y = ang; head.add(vein2);
        }
        // Large gold deposit sphere floating over cart
        const bigNugget = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), matGold);
        bigNugget.position.set(0, 1.65, 1.05); head.add(bigNugget);
    }

    // ── Branch upgrades ─────────────────────────────────────────────────────
    if (branch === 'A') { // Bank — golden counting house chimney & vault door
        // Vault wheel on cliff face
        const vaultRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 20), matGold);
        vaultRing.rotation.x = Math.PI/2; vaultRing.position.set(1.1, 1.0, 0.4); head.add(vaultRing);
        for (let i = 0; i < 6; i++) {
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.82), matDarkGold);
            spoke.rotation.z = (i/6)*Math.PI; spoke.position.set(1.1, 1.0, 0.4); head.add(spoke);
        }
        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 1.0, 8), matWood);
        chimney.position.set(-0.5, 2.7, -0.3); head.add(chimney);
        const chimneyTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.12, 8), matGold);
        chimneyTop.position.set(-0.5, 3.22, -0.3); head.add(chimneyTop);
    } else if (branch === 'B') { // Factory — smelter furnace with glowing core
        const furnace = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 8), matRock);
        furnace.position.set(1.0, 1.12, -0.5); head.add(furnace);
        const furnaceGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 8), matOre);
        furnaceGlow.position.set(1.0, 1.63, -0.5); head.add(furnaceGlow);
        // 3 smoke rings
        for (let i = 0; i < 3; i++) {
            const smoke = new THREE.Mesh(new THREE.TorusGeometry(0.14+i*0.06, 0.04, 6, 14), new THREE.MeshStandardMaterial({
                color: 0x1A1510, emissive: new THREE.Color(0xFF8800), emissiveIntensity: 0.8-i*0.2,
                transparent: true, opacity: 0.7-i*0.15 }));
            smoke.rotation.x = Math.PI/2; smoke.position.set(1.0, 1.9+i*0.35, -0.5); head.add(smoke);
        }
    }
}

// ── BIOLUMINESCENT FARM remodel ───────────────────────────────────────────────
// Bioluminescence: living organisms that produce and emit light.
// Aesthetic: glowing mushroom colony / deep-sea creature — dark organic mass
// studded with luminous caps, pulsing filaments, and phosphorescent vent blooms.
function _buildFarmBioluminescent(head, level = 1, branch = null) {
    const matFlesh = new THREE.MeshStandardMaterial({
        color: 0x06100A, metalness: 0.0, roughness: 0.95 });
    const matGlowTeal = new THREE.MeshStandardMaterial({
        color: 0x001A0F, emissive: new THREE.Color(0x00FFAA), emissiveIntensity: 3.5 });
    const matGlowBlue = new THREE.MeshStandardMaterial({
        color: 0x00040F, emissive: new THREE.Color(0x2299FF), emissiveIntensity: 2.8 });
    const matGlowPurple = new THREE.MeshStandardMaterial({
        color: 0x0A0010, emissive: new THREE.Color(0xBB44FF), emissiveIntensity: 2.2 });
    const matCap = new THREE.MeshStandardMaterial({
        color: 0x050D0A, roughness: 0.7, metalness: 0.0,
        emissive: new THREE.Color(0x00EE88), emissiveIntensity: 0.6 });

    // ── Root mass: gnarled organic mound base ──────────────────────────────
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.55, 9, 7, 0, Math.PI*2, 0, Math.PI*0.55), matFlesh);
    mound.position.y = 0.05; head.add(mound);
    // Glowing mycelium network lines across mound surface
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 1.8, 4), matGlowTeal);
        vein.position.set(Math.cos(ang)*0.7, 0.25, Math.sin(ang)*0.7);
        vein.rotation.x = Math.cos(ang+Math.PI/5)*0.5;
        vein.rotation.z = -Math.sin(ang+Math.PI/5)*0.5;
        head.add(vein);
    }

    // ── Central mushroom tower — the "silo" equivalent ────────────────────
    // Stalk
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.6, 10), matFlesh);
    stalk.position.y = 0.95; head.add(stalk);
    // Glowing ring bands up stalk (bioluminescent gill rings)
    [0.45, 0.9, 1.38].forEach((y, i) => {
        const gill = new THREE.Mesh(new THREE.TorusGeometry(0.32 - i*0.02, 0.035, 5, 16), matGlowTeal);
        gill.rotation.x = Math.PI/2; gill.position.y = y; head.add(gill);
    });
    // Large mushroom cap — the most iconic bioluminescent shape
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8, 0, Math.PI*2, 0, Math.PI*0.62), matCap);
    cap.position.y = 1.75; head.add(cap);
    // Glowing cap underside disc
    const capGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.28, 0.08, 12), matGlowTeal);
    capGlow.position.y = 1.72; head.add(capGlow);

    // ── Smaller mushrooms scattered around base — "barn" cluster ──────────
    const smallMushroomData = [
        [-0.9, 0, 0.5, 0.45, matGlowBlue], [0.85, 0, -0.5, 0.38, matGlowTeal],
        [-0.5, 0, -0.9, 0.35, matGlowPurple], [1.05, 0, 0.3, 0.3, matGlowBlue]
    ];
    smallMushroomData.forEach(([x, y, z, sz, glowMat]) => {
        const sk = new THREE.Mesh(new THREE.CylinderGeometry(sz*0.3, sz*0.4, sz*1.8, 8), matFlesh);
        sk.position.set(x, sz*0.9, z); head.add(sk);
        const cp = new THREE.Mesh(new THREE.SphereGeometry(sz, 8, 6, 0, Math.PI*2, 0, Math.PI*0.65), matCap);
        cp.material = glowMat; // glowing cap
        cp.position.set(x, sz*1.9, z); head.add(cp);
        // Spore dots under cap
        const spore = new THREE.Mesh(new THREE.CylinderGeometry(sz*0.7, sz*0.3, 0.06, 10), glowMat);
        spore.position.set(x, sz*1.75, z); head.add(spore);
    });

    // Glowing spore pods on ground surface
    [[-0.4, 0.12, 1.1],[0.6, 0.12, 1.0],[-1.1, 0.12, -0.3],[1.2, 0.12, -0.4]].forEach(([x,y,z]) => {
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), matGlowPurple);
        pod.position.set(x, y, z); head.add(pod);
    });

    // ── LEVEL 2: Second ring of mini mushrooms + outer spore circle ────────
    if (level >= 2) {
        for (let i = 0; i < 5; i++) {
            const ang = (i/5)*Math.PI*2 + 0.3;
            const sz = 0.2 + Math.abs(Math.sin(i))*0.08;
            const sk2 = new THREE.Mesh(new THREE.CylinderGeometry(sz*0.28, sz*0.36, sz*1.6, 7), matFlesh);
            sk2.position.set(Math.cos(ang)*1.35, sz*0.8, Math.sin(ang)*1.35); head.add(sk2);
            const cp2 = new THREE.Mesh(new THREE.SphereGeometry(sz*1.1, 7, 5, 0, Math.PI*2, 0, Math.PI*0.62), matGlowBlue);
            cp2.position.set(Math.cos(ang)*1.35, sz*1.7, Math.sin(ang)*1.35); head.add(cp2);
        }
        // Outer bioluminescent halo ring
        const halo = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.04, 5, 28), matGlowTeal);
        halo.rotation.x = Math.PI/2; halo.position.y = 0.18; head.add(halo);
    }

    // ── LEVEL 3: Cap grows taller — second cap tier + purple node ──────────
    if (level >= 3) {
        // Second elevated cap tier on central tower
        const stalk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.7, 8), matFlesh);
        stalk2.position.y = 2.5; head.add(stalk2);
        const cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI*2, 0, Math.PI*0.62), matGlowPurple);
        cap2.position.y = 2.95; head.add(cap2);
        const cap2Glow = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.16, 0.06, 10), matGlowPurple);
        cap2Glow.position.y = 2.9; head.add(cap2Glow);
        // Purple mycelium ring at mid height
        const midRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 5, 24), matGlowPurple);
        midRing.rotation.x = Math.PI/2; midRing.position.y = 1.0; head.add(midRing);
    }

    // ── LEVEL 4: 4 tall filament tendrils reaching upward ──────────────────
    if (level >= 4) {
        for (let i = 0; i < 4; i++) {
            const ang = (i/4)*Math.PI*2;
            const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 1.6, 5), matGlowTeal);
            tendril.position.set(Math.cos(ang)*1.0, 0.8, Math.sin(ang)*1.0);
            tendril.rotation.z = Math.cos(ang)*0.45;
            tendril.rotation.x = Math.sin(ang)*0.45;
            head.add(tendril);
            // Glowing bulb tip on each tendril
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), matGlowBlue);
            bulb.position.set(Math.cos(ang)*1.5, 1.5, Math.sin(ang)*1.5); head.add(bulb);
        }
    }

    // ── BRANCH UPGRADES ────────────────────────────────────────────────────
    if (branch === 'A') { // Bank — bioluminescent gold spore mandala
        // 8 gold-glowing coin spores orbiting central cap
        for (let i = 0; i < 8; i++) {
            const ang = (i/8)*Math.PI*2;
            const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10),
                new THREE.MeshStandardMaterial({ color:0x0D0A00, roughness:0.2,
                    emissive: new THREE.Color(0xFFCC00), emissiveIntensity: 2.5 }));
            coin.rotation.x = Math.PI/2;
            coin.position.set(Math.cos(ang)*0.62, 1.9+Math.sin(ang)*0.22, Math.sin(ang)*0.62);
            head.add(coin);
        }
        // Gold ring connecting the coins
        const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.035, 5, 24),
            new THREE.MeshStandardMaterial({ color:0x0D0800, emissive: new THREE.Color(0xFFAA00), emissiveIntensity: 2.0 }));
        goldRing.rotation.x = Math.PI/2; goldRing.position.y = 1.9; head.add(goldRing);
    } else if (branch === 'B') { // Factory — triple smokestack spires glowing purple
        for (let i = 0; i < 3; i++) {
            const stalkH = 1.4 + i*0.5;
            const stalkY = 1.9 + i*0.12;
            const spireStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.1-i*0.015, 0.16-i*0.01, stalkH, 7), matFlesh);
            spireStalk.position.set(-0.5+i*0.5, stalkY, 0.1-i*0.1); head.add(spireStalk);
            const spireCap = new THREE.Mesh(new THREE.SphereGeometry(0.18-i*0.02, 7, 5, 0, Math.PI*2, 0, Math.PI*0.6), matGlowPurple);
            spireCap.position.set(-0.5+i*0.5, stalkY + stalkH/2 + 0.1, 0.1-i*0.1); head.add(spireCap);
        }
    }
}

function _buildFlamethrowerWhitePhosphorus(head, level = 1, branch = null) {
    // CONCEPT: Chemical siege drum — wide pressurized horizontal cylinder,
    // twin side-feed tubes converging into a single lance. Every seam blindingly white-hot.
    // Totally different silhouette from the default boxy housing.
    const matCasing = new THREE.MeshStandardMaterial({
        color: 0x0C0B08, metalness: 0.4, roughness: 0.55 });
    const matSeam = new THREE.MeshStandardMaterial({
        color: 0x060500, metalness: 0.0, roughness: 0.3,
        emissive: new THREE.Color(0xFFFFCC), emissiveIntensity: 3.2 + (level-1)*0.4 });
    const matCore = new THREE.MeshStandardMaterial({
        color: 0x080600, metalness: 0.0, roughness: 0.2,
        emissive: new THREE.Color(0xFFFFFF), emissiveIntensity: 4.8 + (level-1)*0.5 });
    const matTube = new THREE.MeshStandardMaterial({
        color: 0x0E0C08, metalness: 0.7, roughness: 0.3,
        emissive: new THREE.Color(0xFFEEBB), emissiveIntensity: 0.9 });

    // ── Main pressure drum — wide, low-profile, horizontal ───────────────────
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 1.4, 14), matCasing);
    drum.rotation.x = Math.PI/2;  // Lie flat (horizontal cylinder facing forward)
    drum.position.set(0, 1.1, -0.15); head.add(drum);

    // Drum seam rings (glowing hot seams along drum length)
    for (let i = 0; i < 5; i++) {
        const seamRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 6, 22), matSeam);
        seamRing.rotation.x = Math.PI/2;
        seamRing.position.set(0, 1.1, -0.65 + i*0.35); head.add(seamRing);
    }

    // Pressure relief cross (two seam lines across front face)
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.05), matSeam);
    crossH.position.set(0, 1.1, 0.56); head.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.05), matSeam);
    crossV.position.set(0, 1.1, 0.56); head.add(crossV);

    // Overloaded core — visible through cracked front
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), matCore);
    core.position.set(0, 1.1, 0.52); head.add(core);

    // ── Twin feed tubes — converge from drum sides into single lance ─────────
    for (let side of [-1, 1]) {
        // Lateral arm from drum
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.1, 8), matTube);
        arm.rotation.z = Math.PI/2;
        arm.position.set(side * 0.85, 1.1, 0.4); head.add(arm);
        // Angled feed pipe going forward and inward
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.15, 8), matTube);
        pipe.rotation.x = -Math.PI*0.38;
        pipe.rotation.y = side * 0.35;
        pipe.position.set(side * 0.62, 1.25, 1.1); head.add(pipe);
        // Pipe glow joint
        const joint = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), matSeam);
        joint.position.set(side * 0.65, 1.1, 0.82); head.add(joint);
    }

    // ── Single convergence lance ────────────────────────────────────────────
    const lanceStem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.6, 10), matTube);
    lanceStem.rotation.x = Math.PI/2; lanceStem.position.set(0, 1.25, 1.6); head.add(lanceStem);

    // Lance seam
    const lanceSeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 4), matSeam);
    lanceSeam.rotation.x = Math.PI/2; lanceSeam.position.set(0, 1.36, 1.6); head.add(lanceSeam);

    // Muzzle — wide hexagonal output bell
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 0.28, 6), matCasing);
    muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 1.25, 2.45); head.add(muzzle);

    // Muzzle core (blinding WP flash point)
    const muzzleCore = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 6), matCore);
    muzzleCore.rotation.x = Math.PI/2; muzzleCore.position.set(0, 1.25, 2.55); head.add(muzzleCore);

    // ── Exhaust / blow-off vents on drum top ────────────────────────────────
    for (let i of [-0.42, 0, 0.42]) {
        const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.42, 6), matCasing);
        vent.position.set(i, 2.08, -0.1); head.add(vent);
        const ventFlare = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.35, 6), matSeam);
        ventFlare.position.set(i, 2.55, -0.1); head.add(ventFlare);
    }

    if (level >= 2) {
        // Secondary pressure band on drum
        const band = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.06, 6, 18), matTube);
        band.rotation.x = Math.PI/2; band.position.set(0, 1.1, 0.1); head.add(band);
    }
    if (level >= 3) {
        // Reinforced lance bracket
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.12), matTube);
        bracket.position.set(0, 1.62, 1.6); head.add(bracket);
    }
    if (level >= 4) {
        // Quad-point stabiliser fins
        for (let i = 0; i < 4; i++) {
            const ang = (i/4)*Math.PI*2;
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.32), matCasing);
            fin.position.set(Math.cos(ang)*0.82, 1.1, -0.48 + Math.sin(ang)*0.05);
            fin.rotation.z = ang; head.add(fin);
        }
    }
    if (branch === 'A') { // Dragon's Breath — dragon-skull lance head
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.6), matCasing);
        jaw.position.set(0, 1.3, 2.85); head.add(jaw);
        // Fangs (2 pairs of spikes)
        for (let s = -1; s <= 1; s += 2) {
            const fang = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 5), matSeam);
            fang.position.set(s*0.22, 1.3, 3.12); fang.rotation.x = -Math.PI/2;
            head.add(fang);
        }
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), matCore);
        eyeL.position.set(-0.2, 1.52, 2.82); head.add(eyeL);
        const eyeR = eyeL.clone(); eyeR.position.set(0.2, 1.52, 2.82); head.add(eyeR);
    }
    if (branch === 'B') { // Ring of Fire — 8-nozzle radial fire crown
        muzzle.visible = false; muzzleCore.visible = false;
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.18, 16), matCasing);
        crown.position.y = 2.25; head.add(crown);
        for (let i = 0; i < 8; i++) {
            const ang = (i/8)*Math.PI*2;
            const nz = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 7), matCasing);
            nz.rotation.x = Math.PI/2; nz.rotation.z = ang;
            nz.position.set(Math.cos(ang)*1.1, 2.35, Math.sin(ang)*1.1); head.add(nz);
            const fl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), matCore);
            fl.position.set(Math.cos(ang)*1.46, 2.35, Math.sin(ang)*1.46); head.add(fl);
        }
    }
}

// ── ORBITAL DROP MORTAR remodel ───────────────────────────────────────────────
function _buildMortarOrbital(head, level = 1, branch = null) {
    const blueGlow = 1.6 + (level-1)*0.25;
    const matTitanium = new THREE.MeshStandardMaterial({
        color: 0x080E14, metalness: 1.0, roughness: 0.0,
        emissive: new THREE.Color(0x3388FF), emissiveIntensity: blueGlow });
    const matScorch = new THREE.MeshStandardMaterial({
        color: 0x0C1420, metalness: 0.9, roughness: 0.05,
        emissive: new THREE.Color(0x1166DD), emissiveIntensity: 0.6 });
    const matPlasma = new THREE.MeshStandardMaterial({
        color: 0x040810, metalness: 0.0, roughness: 0.2,
        emissive: new THREE.Color(0x55AAFF), emissiveIntensity: 3.4 + (level-1)*0.4 });
    const matHeat = new THREE.MeshStandardMaterial({
        color: 0x080C18, metalness: 0.8, roughness: 0.1,
        emissive: new THREE.Color(0xFF6600), emissiveIntensity: 0.9 });

    // Scorched titanium base plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.22, 16), matTitanium);
    plate.position.y = 0.11; head.add(plate);

    // Re-entry burn mark streaks on plate
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const streak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.2), matHeat);
        streak.position.set(Math.cos(ang)*0.9, 0.24, Math.sin(ang)*0.9);
        streak.rotation.y = ang; head.add(streak);
    }

    // Heavy mount arms
    const mountL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.55, 1.55), matScorch);
    mountL.position.set(1.05, 0.82, 0); head.add(mountL);
    const mountR = mountL.clone(); mountR.position.set(-1.05, 0.82, 0); head.add(mountR);
    // Heat streaks on mounts
    [mountL, mountR].forEach(m => {
        for (let i = 0; i < 3; i++) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), matHeat);
            s.position.set(0, 0, -0.5 + i*0.35); m.add(s);
        }
    });

    // Tube group — tilted forward
    const tubeGroup = new THREE.Group();
    tubeGroup.rotation.x = Math.PI/4; tubeGroup.position.set(0, 0.82, 0);
    head.add(tubeGroup);

    if (branch === 'B') {
        // Triple orbital tube battery
        for (let i = -1; i <= 1; i++) {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3.6, 16), matTitanium);
            t.position.set(i*1.12, 1.05, 0); tubeGroup.add(t);
            const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), matPlasma);
            glow.position.set(i*1.12, 2.92, 0); tubeGroup.add(glow);
        }
    } else {
        const r = (branch === 'A') ? 1.2 : 0.82;
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r+0.1, 3.6, 16), matTitanium);
        tube.position.y = 1.05; tubeGroup.add(tube);
        // Orbital seam lines
        for (let i = 0; i < 4; i++) {
            const ang = (i/4)*Math.PI*2;
            const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.62, 0.04), matPlasma);
            seam.position.set(Math.cos(ang)*r, 1.05, Math.sin(ang)*r); tubeGroup.add(seam);
        }
        // Re-entry heat bands
        for (let i = 0; i < 4; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(r+0.15, 0.08, 4, 18), matHeat);
            ring.rotation.x = Math.PI/2; ring.position.y = -0.4 + i*0.9; tubeGroup.add(ring);
        }
        // Blue plasma glow inside barrel opening
        const tubeGlow = new THREE.Mesh(new THREE.CylinderGeometry(r*0.62, r*0.62, 0.22, 16), matPlasma);
        tubeGlow.position.y = 2.92; tubeGroup.add(tubeGlow);
        if (branch === 'A') { // Nuke — inner plasma core visible
            const core = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 3.65), matPlasma);
            core.position.y = 1.05; tubeGroup.add(core);
            const nukeRing = new THREE.Mesh(new THREE.TorusGeometry(r+0.38, 0.12, 8, 22), matPlasma);
            nukeRing.rotation.x = Math.PI/2; nukeRing.position.y = 2.0; tubeGroup.add(nukeRing);
        }
    }
    if (level >= 2) {
        const pis = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.05), matScorch);
        pis.position.set(0.82, 0.52, -0.52); pis.rotation.x = -0.5; head.add(pis);
    }
    if (level >= 3) {
        const loader = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.82, 1.05), matTitanium);
        loader.position.set(0, 0.52, -1.05); head.add(loader);
    }
}

// ── EPIC REMODEL: VOID STRIKE (Gunner) ───────────────────────────────────────
// Custom obsidian war-platform with hovering void orbs and plasma-veined barrel
function _buildGunnerVoidStrike(head, baseGroup, level = 1, branch = null) {
    const matVoid = new THREE.MeshStandardMaterial({
        color: 0x050008, metalness: 0.9, roughness: 0.1,
        emissive: new THREE.Color(0x4400AA), emissiveIntensity: 0.6 });
    const matPlasma = new THREE.MeshStandardMaterial({
        color: 0x0A0020, emissive: new THREE.Color(0x9900FF), emissiveIntensity: 3.5 });
    const matEdge = new THREE.MeshStandardMaterial({
        color: 0x0A0018, metalness: 1.0, roughness: 0.0,
        emissive: new THREE.Color(0x7700DD), emissiveIntensity: 1.8 });

    // ── Custom hovering hex-platform — fills baseGroup directly ──
    const hexPad = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.35, 6), matVoid);
    hexPad.position.y = 0.18; baseGroup.add(hexPad);
    // Glowing hex edge ring
    const hexRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.08, 6, 6), matPlasma);
    hexRing.rotation.x = Math.PI/2; hexRing.position.y = 0.35; baseGroup.add(hexRing);
    // 6 void-orb emitters at hex corners
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), matPlasma);
        orb.position.set(Math.cos(ang)*1.85, 0.55, Math.sin(ang)*1.85); baseGroup.add(orb);
    }
    // Central dark pillar
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.9, 6), matVoid);
    pillar.position.y = 0.65; baseGroup.add(pillar);
    // Plasma veins on pillar
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const vein = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.04), matPlasma);
        vein.position.set(Math.cos(ang)*0.88, 0.65, Math.sin(ang)*0.88); baseGroup.add(vein);
    }

    // ── Gun body — angular void-black housing ──
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.8), matVoid);
    body.position.set(0, 1.5, 0.1); head.add(body);
    // Edge glow strips on body sides
    [-0.76, 0.76].forEach(x => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 1.8), matEdge);
        strip.position.set(x, 1.5, 0.1); head.add(strip);
    });
    // Back wall glow strip
    const backStrip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.04), matEdge);
    backStrip.position.set(0, 1.5, -0.8); head.add(backStrip);

    // ── Level upgrades (added before barrel so barrel appears in front) ──
    if (level >= 2) {
        // Side ammo feed modules
        [-0.9, 0.9].forEach(x => {
            const feedBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 1.0), matVoid);
            feedBox.position.set(x, 1.5, 0.3); head.add(feedBox);
            const feedGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), matPlasma);
            feedGlow.position.set(x > 0 ? x+0.12 : x-0.12, 1.5, 0.3); head.add(feedGlow);
        });
    }
    if (level >= 3) {
        // Top targeting scope
        const scopeBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.9), matVoid);
        scopeBase.position.set(0, 1.98, 0.1); head.add(scopeBase);
        const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8), matPlasma);
        scopeLens.rotation.x = Math.PI/2; scopeLens.position.set(0, 1.98, 0.55); head.add(scopeLens);
        const scopeRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 12), matEdge);
        scopeRing.rotation.y = Math.PI/2; scopeRing.position.set(0, 1.98, 0.55); head.add(scopeRing);
    }
    if (level >= 4) {
        // Side power coils — 3 glowing rings along the barrel sides
        [-0.7, 0.7].forEach(x => {
            for (let c = 0; c < 3; c++) {
                const coil = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 10), matPlasma);
                coil.rotation.x = Math.PI/2;
                coil.position.set(x, 1.5, 1.0 + c * 0.55); head.add(coil);
            }
        });
    }

    // ── Barrel — attached flush to front face of body (body front = z = 0.1 + 0.9 = 1.0) ──
    const barrelLen = 2.2 + (level - 1) * 0.15;
    const bodyFront = 1.0; // front face of body
    const bCount = (level >= 4) ? 2 : 1;
    const bOffsets = bCount === 2 ? [-0.28, 0.28] : [0];
    bOffsets.forEach(yo => {
        const bY = 1.5 + yo;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, barrelLen, 8), matVoid);
        barrel.rotation.x = Math.PI/2;
        barrel.position.set(0, bY, bodyFront + barrelLen/2); head.add(barrel);
        const seam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, barrelLen, 4), matPlasma);
        seam.rotation.x = Math.PI/2;
        seam.position.set(0, bY, bodyFront + barrelLen/2); head.add(seam);
        // Muzzle glow at very tip
        const muzz = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.22, 8), matPlasma);
        muzz.rotation.x = Math.PI/2;
        muzz.position.set(0, bY, bodyFront + barrelLen + 0.11); head.add(muzz);
    });

    // Branch specific
    if (branch === 'A') { // Doomsday — large void ring mount around muzzle
        const splashRing = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 8, 24), matEdge);
        splashRing.rotation.y = Math.PI/2;
        splashRing.position.set(0, 1.5, bodyFront + barrelLen); head.add(splashRing);
        // Second outer ring
        const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24), matPlasma);
        outerRing.rotation.y = Math.PI/2;
        outerRing.position.set(0, 1.5, bodyFront + barrelLen); head.add(outerRing);
    } else if (branch === 'B') { // Shredder — spinning void disc array + serrated muzzle
        // Wide flat shredder disc housing flanking the barrel cluster
        [-0.6, 0.6].forEach(x => {
            const discHub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 10), matEdge);
            discHub.rotation.x = Math.PI/2;
            discHub.position.set(x, 1.5, bodyFront + barrelLen * 0.6); head.add(discHub);
            // Serrated rim ring on each disc
            const discRim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 5, 10), matPlasma);
            discRim.rotation.x = Math.PI/2;
            discRim.position.set(x, 1.5, bodyFront + barrelLen * 0.6); head.add(discRim);
        });
        // Void shredder muzzle — jagged crown shape
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.3, 6), matVoid);
        crownBase.rotation.x = Math.PI/2;
        crownBase.position.set(0, 1.5, bodyFront + barrelLen + 0.15); head.add(crownBase);
        // 6 serrated spikes projecting forward from crown
        for (let i = 0; i < 6; i++) {
            const ang = (i/6)*Math.PI*2;
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 4), matPlasma);
            tooth.rotation.x = -Math.PI/2;
            tooth.position.set(Math.cos(ang)*0.22, 1.5 + Math.sin(ang)*0.22, bodyFront + barrelLen + 0.4);
            head.add(tooth);
        }
        // Central void energy disc at muzzle
        const energyDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 8), matPlasma);
        energyDisc.rotation.x = Math.PI/2;
        energyDisc.position.set(0, 1.5, bodyFront + barrelLen + 0.32); head.add(energyDisc);
        // Plasma arc emitter above barrel exit — asymmetric fin
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.42), matEdge);
        fin.position.set(0, 1.94, bodyFront + barrelLen * 0.75); head.add(fin);
        const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), matPlasma);
        finGlow.position.set(0, 1.96, bodyFront + barrelLen * 0.75 + 0.18); head.add(finGlow);
    }
}

// ── EPIC REMODEL: HELLFIRE SIEGE (Cannon) ────────────────────────────────────
// Volcano-plate custom base, obsidian barrel with molten crack veins
function _buildCannonHellfire(head, baseGroup, level = 1, branch = null) {
    const matObsidian = new THREE.MeshStandardMaterial({
        color: 0x0C0200, metalness: 0.3, roughness: 0.95,
        emissive: new THREE.Color(0xFF2200), emissiveIntensity: 0.5 });
    const matMolten = new THREE.MeshStandardMaterial({
        color: 0x200000, emissive: new THREE.Color(0xFF4400), emissiveIntensity: 4.0 });
    const matChar = new THREE.MeshStandardMaterial({
        color: 0x1A0800, metalness: 0.1, roughness: 0.98 });

    // ── Custom scorched-lava platform ──
    const lavaBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.4, 8), matChar);
    lavaBase.position.y = 0.2; baseGroup.add(lavaBase);
    // Molten crack lines radiating out
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.8), matMolten);
        crack.position.set(Math.cos(ang)*0.9, 0.42, Math.sin(ang)*0.9);
        crack.rotation.y = ang; baseGroup.add(crack);
    }
    // Lava pool puddle rings
    for (let r = 0; r < 3; r++) {
        const lRing = new THREE.Mesh(new THREE.TorusGeometry(0.5+r*0.45, 0.04, 4, 16), matMolten);
        lRing.rotation.x = Math.PI/2; lRing.position.y = 0.42; baseGroup.add(lRing);
    }
    // Scorched obsidian center mount
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 1.0, 8), matObsidian);
    mount.position.y = 0.9; baseGroup.add(mount);
    // Molten seams on mount
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), matMolten);
        s.position.set(Math.cos(ang)*0.93, 0.9, Math.sin(ang)*0.93); baseGroup.add(s);
    }

    // ── Wooden carriage — charred black ──
    const carriageL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.6, 0.42), matChar);
    carriageL.position.set(-1.05, 0.85, -0.55); carriageL.rotation.z = 0.28; head.add(carriageL);
    const carriageR = carriageL.clone(); carriageR.position.set(1.05, 0.85, -0.55); carriageR.rotation.z = -0.28; head.add(carriageR);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.4, 2.0), matChar); platform.position.y = 0.2; head.add(platform);
    // Molten cracks on platform
    for (let i = 0; i < 5; i++) {
        const cr = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 0.04), matMolten);
        cr.position.set(0, 0.43, -0.8+i*0.4); head.add(cr);
    }

    // Hellfire wheels with ember spokes
    [[-1.4, 0.7, -0.5],[1.4, 0.7, -0.5]].forEach(([x,y,z]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.3, 12), matChar);
        wheel.rotation.z = Math.PI/2; wheel.position.set(x,y,z); head.add(wheel);
        for (let i = 0; i < 8; i++) {
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.58, 0.055), matMolten);
            const a = (i/8)*Math.PI*2; spoke.rotation.z = a;
            spoke.position.set(Math.sin(a)*0.3, Math.cos(a)*0.3, 0); wheel.add(spoke);
        }
    });

    // ── Obsidian barrel with molten crack veins ──
    const barrelLen = (branch === 'A') ? 2.8 : 4.0;
    const barrelR = (branch === 'A') ? 0.65 : 0.55;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(barrelR, barrelR*1.15, barrelLen, 20), matObsidian);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 1.2, 1.5); head.add(barrel);
    // Molten crack seams along barrel
    for (let i = 0; i < 4; i++) {
        const ang = (i/4)*Math.PI*2;
        const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, barrelLen, 4), matMolten);
        cv.rotation.x = Math.PI/2;
        cv.position.set(Math.cos(ang)*(barrelR-0.05), 1.2+Math.sin(ang)*(barrelR-0.05), 1.5); head.add(cv);
    }
    // Molten muzzle bell
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(barrelR+0.16, barrelR, 0.4, 20), matMolten);
    muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 1.2, 1.5+barrelLen/2+0.1); head.add(muzzle);
    // Ring bands — glowing ember (positioned within barrel bounds, hidden for branch B)
    const hellfireRingGroup = new THREE.Group();
    head.add(hellfireRingGroup);
    const barrelStart = 1.5 - barrelLen/2;
    const ringSpacing = (barrelLen - 0.3) / 3;
    for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(barrelR+0.07, 0.07, 8, 20), matMolten);
        ring.rotation.y = Math.PI/2; ring.position.set(0, 1.2, barrelStart + 0.15 + i * ringSpacing); hellfireRingGroup.add(ring);
    }
    if (branch === 'B') hellfireRingGroup.visible = false;
    // Supports
    const suppL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.3), matObsidian);
    suppL.position.set(-0.7, 0.9, 0); head.add(suppL);
    const suppR = suppL.clone(); suppR.position.set(0.7, 0.9, 0); head.add(suppR);

    // ── Level upgrades ──
    if (level >= 2) {
        // Side ember-glow ammo crates flanking the carriage
        [-1.6, 1.6].forEach(x => {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), matChar);
            crate.position.set(x, 0.62, -0.3); head.add(crate);
            const crateGlow = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.04, 0.57), matMolten);
            crateGlow.position.set(x, 0.92, -0.3); head.add(crateGlow);
        });
    }
    if (level >= 3) {
        // Targeting scope on top of barrel — obsidian tube with ember lens
        const scopeMount = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, barrelLen * 0.6), matChar);
        scopeMount.rotation.x = Math.PI/2; scopeMount.position.set(0, 1.2 + barrelR + 0.1, 1.5); head.add(scopeMount);
        const scopeEye = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), matMolten);
        scopeEye.rotation.x = Math.PI/2; scopeEye.position.set(0, 1.2 + barrelR + 0.1, 1.5 + barrelLen*0.3 + 0.1); head.add(scopeEye);
    }
    if (level >= 4 && !branch) {
        // Extra ember heat-collar near muzzle
        const collar = new THREE.Mesh(new THREE.TorusGeometry(barrelR + 0.22, 0.12, 8, 20), matMolten);
        collar.rotation.y = Math.PI/2; collar.position.set(0, 1.2, 1.5 + barrelLen/2 - 0.3); head.add(collar);
    }

    if (branch === 'A') {
        const shield = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.25), matObsidian);
        shield.position.set(0, 1.2, -1.0); head.add(shield);
        // Molten cracks on shield
        for (let i = 0; i < 5; i++) {
            const sc = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), matMolten);
            sc.position.set(-1.0+i*0.5, 1.2, -0.97); head.add(sc);
        }
    }
    if (branch === 'B') {
        barrel.visible = false; muzzle.visible = false;
        for (let i = -1; i <= 1; i++) {
            const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 2.0, 16), matObsidian);
            sb.rotation.x = Math.PI/2; sb.position.set(i*0.78, 1.2, 0.5); head.add(sb);
            for (let a = 0; a < 4; a++) {
                const ang2 = (a/4)*Math.PI*2;
                const sv = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 4), matMolten);
                sv.rotation.x = Math.PI/2;
                sv.position.set(i*0.78+Math.cos(ang2)*0.32, 1.2+Math.sin(ang2)*0.32, 0.5); head.add(sv);
            }
            const smz = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.35, 0.28, 16), matMolten);
            smz.rotation.x = Math.PI/2; smz.position.set(i*0.78, 1.2, 1.42); head.add(smz);
        }
    }
}

// ── EPIC REMODEL: STORM CORE (Tesla) ─────────────────────────────────────────
// Cracked-earth custom platform, imprisoned plasma orb, crackling storm shell
function _buildTeslaStormCore(head, baseGroup, level = 1, branch = null) {
    const matStorm = new THREE.MeshStandardMaterial({
        color: 0x04000F, metalness: 0.9, roughness: 0.1,
        emissive: new THREE.Color(0x6600FF), emissiveIntensity: 0.8 });
    const matLightning = new THREE.MeshStandardMaterial({
        color: 0x080010, emissive: new THREE.Color(0xCCFFFF), emissiveIntensity: 5.0 });
    const matViolet = new THREE.MeshStandardMaterial({
        color: 0x050012, emissive: new THREE.Color(0x8800FF), emissiveIntensity: 3.0 });

    // ── Custom cracked storm-ground platform ──
    const stormBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.4, 8), matStorm);
    stormBase.position.y = 0.2; baseGroup.add(stormBase);
    // Lightning crack lines
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.7), matLightning);
        crack.position.set(Math.cos(ang)*0.8, 0.42, Math.sin(ang)*0.8);
        crack.rotation.y = ang + 0.2; baseGroup.add(crack);
    }
    // Central plasma core emitter
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.0, 6), matStorm);
    emitter.position.y = 0.9; baseGroup.add(emitter);
    // Coil rings on emitter
    for (let i = 0; i < 4; i++) {
        const cr = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 16), matViolet);
        cr.rotation.x = Math.PI/2; cr.position.y = 0.45+i*0.2; baseGroup.add(cr);
    }

    // ── Storm tower — tall central spire ──
    // Shaft center y=1.6, height=3.2 → bottom=0.0, top=3.2
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 3.2, 8), matStorm);
    shaft.position.y = 1.6; head.add(shaft);

    if (level >= 2) {
        // Reinforced collar at base of shaft
        const capBase = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.5), matStorm);
        capBase.position.y = 0.25; head.add(capBase);
        // Rivet row on collar
        for (let i = 0; i < 8; i++) {
            const ang = (i/8)*Math.PI*2;
            const rv = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), matViolet);
            rv.position.set(Math.cos(ang)*1.04, 0.52, Math.sin(ang)*1.04); head.add(rv);
        }
    }

    // Plasma coils — spread evenly within shaft body (0 to 3.2)
    const coilCount = level >= 3 ? 7 : 5;
    for (let i = 0; i < coilCount; i++) {
        const t = i / (coilCount - 1); // 0..1
        const cy = 0.25 + t * 2.9; // sweep from near-bottom to near-top
        const radius = 0.82 - i * 0.045; // shrinks slightly top to top
        const coil = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 8, 16), matViolet);
        coil.rotation.x = Math.PI/2; coil.position.y = cy; head.add(coil);
    }

    if (level >= 4 && !branch) {
        // 4 lightning spike emitters at top of shaft
        for (let i = 0; i < 4; i++) {
            const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.65), matLightning);
            sp.position.set(Math.cos(i*1.57)*0.75, 3.25, Math.sin(i*1.57)*0.75); head.add(sp);
        }
        // Crackling arc ring at top
        const arcRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 6, 24), matLightning);
        arcRing.rotation.x = Math.PI/2; arcRing.position.y = 3.15; head.add(arcRing);
    }

    if (branch === 'A') { // Superbolt — chained storm sphere
        const outerShell = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), matStorm);
        outerShell.position.y = 3.7; head.add(outerShell);
        const innerCore = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), matLightning);
        innerCore.position.y = 3.7; head.add(innerCore);
        // Lightning bolt corona rings
        for (let i = 0; i < 3; i++) {
            const bRing = new THREE.Mesh(new THREE.TorusGeometry(2.0+i*0.3, 0.06, 4, 32), matViolet);
            bRing.rotation.x = i*0.4; bRing.rotation.y = i*0.6; bRing.position.y = 3.7; head.add(bRing);
        }
    } else if (branch === 'B') { // Plasma Arc — precision beam dish
        const dish = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 16, 1, true), matStorm);
        dish.position.y = 3.7; head.add(dish);
        const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.45, 2.1), matLightning);
        beamCore.position.y = 3.7; head.add(beamCore);
    } else {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.85), matStorm);
        sphere.position.y = 3.4; head.add(sphere);
        for (let i = 0; i < 4; i++) {
            const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9), matViolet);
            sp.position.set(Math.cos(i*1.57), 3.8, Math.sin(i*1.57));
            sp.lookAt(0, 3.4, 0); head.add(sp);
        }
    }
}

// ── EPIC REMODEL: IRONCLAD (Mortar) ──────────────────────────────────────────
// Battleship-hull custom platform, riveted armour plates on barrel, ember muzzle
function _buildMortarIronclad(head, baseGroup, level = 1, branch = null) {
    const matIron = new THREE.MeshStandardMaterial({
        color: 0x1E2430, metalness: 0.95, roughness: 0.25,
        emissive: new THREE.Color(0x001133), emissiveIntensity: 0.3 });
    const matNavy = new THREE.MeshStandardMaterial({
        color: 0x101828, metalness: 0.85, roughness: 0.35 });
    const matEmber = new THREE.MeshStandardMaterial({
        color: 0x100400, emissive: new THREE.Color(0xFF7700), emissiveIntensity: 4.0 });
    const matRivet = new THREE.MeshStandardMaterial({
        color: 0x8899AA, metalness: 1.0, roughness: 0.1 });

    // ── Custom battleship-hull platform ──
    // Hull plating — octagonal base
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, 0.5, 8), matIron);
    hull.position.y = 0.25; baseGroup.add(hull);
    // Armour plates on top of hull
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.45), matNavy);
        plate.position.set(Math.cos(ang)*1.6, 0.56, Math.sin(ang)*1.6);
        plate.rotation.y = ang+Math.PI/2; baseGroup.add(plate);
    }
    // Row of rivets around hull edge
    for (let i = 0; i < 16; i++) {
        const ang = (i/16)*Math.PI*2;
        const rv = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), matRivet);
        rv.position.set(Math.cos(ang)*2.1, 0.52, Math.sin(ang)*2.1); baseGroup.add(rv);
    }
    // Central turret ring
    const turretRing = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 1.0, 8), matIron);
    turretRing.position.y = 1.0; baseGroup.add(turretRing);
    // Rivets on turret ring
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const rv = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), matRivet);
        rv.position.set(Math.cos(ang)*1.05, 1.0, Math.sin(ang)*1.05); baseGroup.add(rv);
    }

    // ── Mortar head — armoured plates + ember muzzle ──
    const plate2 = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.25, 8), matNavy);
    plate2.position.y = 0.05; head.add(plate2);
    // Riveted surface
    for (let i = 0; i < 12; i++) {
        const ang = (i/12)*Math.PI*2;
        const rv = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), matRivet);
        rv.position.set(Math.cos(ang)*1.6, 0.18, Math.sin(ang)*1.6); head.add(rv);
    }

    const mountL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.6, 1.6), matIron);
    mountL.position.set(1.1, 0.9, 0); head.add(mountL);
    const mountR = mountL.clone(); mountR.position.set(-1.1, 0.9, 0); head.add(mountR);
    // Rivet rows on mounts
    [mountL, mountR].forEach(m => {
        for (let i = 0; i < 4; i++) {
            const rv = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), matRivet);
            rv.position.set(0, -0.5+i*0.35, 0.85); m.add(rv);
        }
    });

    const tubeGroup = new THREE.Group();
    tubeGroup.rotation.x = Math.PI/4; tubeGroup.position.set(0, 0.8, 0); head.add(tubeGroup);

    if (level >= 2) {
        // Hydraulic elevation pistons
        const pisL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.3), matNavy);
        pisL.position.set(0.95, 0.55, -0.55); pisL.rotation.x = -0.5; head.add(pisL);
        const pisR = pisL.clone(); pisR.position.set(-0.95, 0.55, -0.55); head.add(pisR);
        // Piston caps
        [pisL, pisR].forEach(p => {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), matRivet);
            cap.position.set(0, 0.65, 0); p.add(cap);
        });
    }
    if (level >= 3) {
        // Armoured ammo box with shells
        const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.05, 1.3), matNavy);
        ammoBox.position.set(1.85, 0.55, -0.55); head.add(ammoBox);
        // Rivet edges on ammo box
        for (let e = 0; e < 4; e++) {
            const ang = (e/4)*Math.PI*2;
            const edgeRv = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), matRivet);
            edgeRv.position.set(Math.cos(ang)*0.68, 0.55, Math.sin(ang)*0.6); ammoBox.add(edgeRv);
        }
        for (let i = 0; i < 3; i++) {
            const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.65, 8), matIron);
            shell.position.set(-0.3+i*0.3, 0.58, 0); ammoBox.add(shell);
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 8), matEmber);
            tip.position.y = 0.43; shell.add(tip);
        }
    }
    if (level >= 4 && !branch) {
        // Range-finder scope bolted to the side of mount
        const scopeBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.9), matNavy);
        scopeBody.position.set(1.35, 1.45, -0.2); head.add(scopeBody);
        const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8), matEmber);
        scopeLens.rotation.x = Math.PI/2; scopeLens.position.set(1.35, 1.45, 0.28); head.add(scopeLens);
        // Mounting bracket
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.12), matIron);
        bracket.position.set(1.35, 1.1, -0.2); head.add(bracket);
    }

    if (branch === 'B') {
        // Triple battery — 3 tubes with rivet rings and ember muzzles
        for(let i=-1; i<=1; i++) {
            const tubeH = 3.9;
            const tCenter = 1.1; // tube center in tubeGroup
            const tTop = tCenter + tubeH/2;
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.64, tubeH, 8), matIron);
            t.position.set(i*1.2, tCenter, 0); tubeGroup.add(t);
            // Rivet rings evenly spaced along tube body
            for (let r = 0; r < 3; r++) {
                const ry = tCenter - tubeH/2 + 0.5 + r * ((tubeH - 0.5) / 3);
                const rr = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.08, 4, 8), matRivet);
                rr.rotation.x = Math.PI/2; rr.position.set(i*1.2, ry, 0); tubeGroup.add(rr);
            }
            // Ember muzzle flush at tube top
            const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.54, 0.4, 8), matEmber);
            flare.position.set(i*1.2, tTop + 0.2, 0); tubeGroup.add(flare);
        }
    } else {
        const r = (branch === 'A') ? 1.3 : 0.92;
        const tubeH = 4.0;
        const tCenter = 1.2;
        const tBottom = tCenter - tubeH/2; // = -0.8
        const tTop    = tCenter + tubeH/2; // = 3.2
        const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r+0.14, tubeH, 8), matIron);
        t.position.y = tCenter; tubeGroup.add(t);
        // Armour rings — evenly spaced within tube body
        const ringCount = 4 + (level >= 4 ? 1 : 0);
        for (let ri = 0; ri < ringCount; ri++) {
            const ry = tBottom + 0.4 + ri * ((tubeH - 0.8) / (ringCount - 1));
            const ring = new THREE.Mesh(new THREE.TorusGeometry(r+0.2, 0.1, 4, 8), matNavy);
            ring.rotation.x = Math.PI/2; ring.position.y = ry; tubeGroup.add(ring);
            for (let rv = 0; rv < 4; rv++) {
                const ang = (rv/4)*Math.PI*2;
                const rvMesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), matRivet);
                rvMesh.position.set(Math.cos(ang)*(r+0.22), ry, Math.sin(ang)*(r+0.22));
                tubeGroup.add(rvMesh);
            }
        }
        // Ember muzzle — sits flush at very top of tube
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(r+0.32, r+0.04, 0.48, 8), matEmber);
        muzzle.position.y = tTop + 0.24; tubeGroup.add(muzzle);
        if (branch === 'A') {
            // Nuke core — glowing ember column inside barrel
            const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, tubeH), matEmber);
            core.position.y = tCenter; tubeGroup.add(core);
            // Warning band — bright ring above midpoint
            const warnRing = new THREE.Mesh(new THREE.TorusGeometry(r+0.35, 0.12, 6, 16), matEmber);
            warnRing.rotation.x = Math.PI/2; warnRing.position.y = tTop + 0.52; tubeGroup.add(warnRing);
        }
    }
}


// ── EPIC REMODEL: DRAGON SCALE (Flamethrower) ────────────────────────────────
// Obsidian dragon-spine platform, armoured scale plates on tank, ember nozzle
function _buildFlamethrowerDragonScale(head, baseGroup, level = 1, branch = null) {
    const matScale = new THREE.MeshStandardMaterial({
        color: 0x1A0000, metalness: 0.2, roughness: 0.9,
        emissive: new THREE.Color(0x550000), emissiveIntensity: 0.4 });
    const matEmber = new THREE.MeshStandardMaterial({
        color: 0x200000, emissive: new THREE.Color(0xFF4400), emissiveIntensity: 4.5 });
    const matGold = new THREE.MeshStandardMaterial({
        color: 0x2A1000, emissive: new THREE.Color(0xFF8800), emissiveIntensity: 2.5 });

    // ── Custom dragon-bone platform ──
    const dragonBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.25, 0.4, 8), matScale);
    dragonBase.position.y = 0.2; baseGroup.add(dragonBase);
    // 8 spine ridges radiating out like dragon scales
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 4), matEmber);
        spine.position.set(Math.cos(ang)*1.75, 0.55, Math.sin(ang)*1.75);
        spine.rotation.z = Math.cos(ang)*0.35; spine.rotation.x = -Math.sin(ang)*0.35;
        baseGroup.add(spine);
    }
    // Central obsidian pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.9, 6), matScale);
    pedestal.position.y = 0.85; baseGroup.add(pedestal);
    // Ember seam lines on pedestal
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 0.04), matEmber);
        seam.position.set(Math.cos(ang)*0.84, 0.85, Math.sin(ang)*0.84); baseGroup.add(seam);
    }

    // ── Dragon-armoured fuel tank ──
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.88, 1.85, 12), matScale);
    tank.position.y = 0.95; head.add(tank);
    // Scale plates layered on tank — rows of overlapping diamond shapes
    const scaleRows = 4;
    for (let row = 0; row < scaleRows; row++) {
        const ry = 0.2 + row * 0.42;
        const scaleCount = 8;
        for (let s = 0; s < scaleCount; s++) {
            const ang = (s/scaleCount)*Math.PI*2 + (row%2)*Math.PI/scaleCount;
            const scale = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.08), matScale);
            scale.position.set(Math.cos(ang)*0.84, ry, Math.sin(ang)*0.84);
            scale.rotation.y = ang;
            // Ember glowing seam on each plate
            const plateSeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), matGold);
            plateSeam.position.y = 0.15; scale.add(plateSeam);
            tank.add(scale);
        }
    }

    // Level upgrades
    if (level >= 2) {
        // Secondary side tank
        const sideT = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.1, 8), matScale);
        sideT.position.set(-1.1, 0.85, 0.1); head.add(sideT);
        const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), matGold);
        conn.rotation.z = Math.PI/2; conn.position.set(-0.68, 0.85, 0.1); head.add(conn);
    }
    if (level >= 3) {
        // Targeting scope on top
        const scopeRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.8), matScale);
        scopeRail.position.set(0, 1.93, 0.15); head.add(scopeRail);
        const scopeEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8), matEmber);
        scopeEnd.rotation.x = Math.PI/2; scopeEnd.position.set(0, 1.93, 0.55); head.add(scopeEnd);
    }
    if (level >= 4 && !branch) {
        // Dragon-head nozzle shroud — larger maw with fang tips
        for (let f = 0; f < 4; f++) {
            const ang = (f/4)*Math.PI*2;
            const fang = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), matGold);
            fang.position.set(Math.cos(ang)*0.28, 1.0 + Math.sin(ang)*0.28, 2.2);
            fang.rotation.x = Math.cos(ang)*0.5; fang.rotation.z = -Math.sin(ang)*0.5;
            head.add(fang);
        }
    }

    // Ember nozzle pipe — thick dragon maw
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.4, 12), matScale);
    nozzle.rotation.x = Math.PI/2; nozzle.position.set(0, 1.0, 1.4); head.add(nozzle);
    // Ember glow at nozzle tip
    const nozzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.3, 12), matEmber);
    nozzleTip.rotation.x = Math.PI/2; nozzleTip.position.set(0, 1.0, 2.12); head.add(nozzleTip);
    // Gold seam along nozzle
    const nozzleSeam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 4), matGold);
    nozzleSeam.rotation.x = Math.PI/2; nozzleSeam.position.set(0, 1.0 + 0.3, 1.4); head.add(nozzleSeam);

    if (branch === 'A') { // Napalm — massive wide maw with spread ring
        const spreadRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 20), matEmber);
        spreadRing.rotation.y = Math.PI/2; spreadRing.position.set(0, 1.0, 2.28); head.add(spreadRing);
    } else if (branch === 'B') { // Focused — longer thinner nozzle with precision tip
        const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.0, 10), matScale);
        ext.rotation.x = Math.PI/2; ext.position.set(0, 1.0, 2.6); head.add(ext);
        const extTip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.22, 10), matEmber);
        extTip.rotation.x = Math.PI/2; extTip.position.set(0, 1.0, 3.12); head.add(extTip);
    }
}

// ── EPIC REMODEL: SOLAR BURST (Plasma) ───────────────────────────────────────
// Radiant solar-forge platform, golden orbit rings, blazing corona core
function _buildPlasmaSolarBurst(head, baseGroup, level = 1, branch = null) {
    const matSolar = new THREE.MeshStandardMaterial({
        color: 0x120A00, metalness: 0.5, roughness: 0.3,
        emissive: new THREE.Color(0xFF8800), emissiveIntensity: 0.7 });
    const matCorona = new THREE.MeshStandardMaterial({
        color: 0x0A0500, emissive: new THREE.Color(0xFFCC00), emissiveIntensity: 5.0 });
    const matGold = new THREE.MeshStandardMaterial({
        color: 0xFFD700, metalness: 1.0, roughness: 0.1,
        emissive: new THREE.Color(0xFF9900), emissiveIntensity: 0.4 });

    // ── Custom solar forge platform ──
    const solarBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.4, 16), matSolar);
    solarBase.position.y = 0.2; baseGroup.add(solarBase);
    // 8 gold solar panel wedges on the platform surface
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.55), matGold);
        panel.position.set(Math.cos(ang)*1.35, 0.43, Math.sin(ang)*1.35);
        panel.rotation.y = ang + Math.PI/2; baseGroup.add(panel);
    }
    // Glowing solar ring
    const solarRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.08, 8, 32), matCorona);
    solarRing.rotation.x = Math.PI/2; solarRing.position.y = 0.42; baseGroup.add(solarRing);
    // Central forge pillar
    const forgePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 1.0, 8), matSolar);
    forgePillar.position.y = 0.9; baseGroup.add(forgePillar);
    // Corona seams on pillar
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), matCorona);
        seam.position.set(Math.cos(ang)*0.84, 0.9, Math.sin(ang)*0.84); baseGroup.add(seam);
    }

    // ── Solar core — spinning armillary sphere ──
    // Central glass-sphere housing with bright corona core
    const housing = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 14), new THREE.MeshStandardMaterial({
        color: 0x110800, transparent: true, opacity: 0.5, metalness: 0.9, roughness: 0.0,
        emissive: new THREE.Color(0xFF9900), emissiveIntensity: 0.3, side: THREE.DoubleSide }));
    housing.position.y = 1.8; head.add(housing);
    // Blazing inner core
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), matCorona);
    core.position.y = 1.8; head.add(core);

    // 4 solar collector arms
    for (let i = 0; i < 4; i++) {
        const ang = (i/4)*Math.PI*2;
        const armGroup = new THREE.Group();
        armGroup.rotation.y = ang;
        // Main arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.2), matSolar);
        arm.position.set(0, 1.8, 0.85); armGroup.add(arm);
        // Gold solar cell on end of arm
        const cell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.45), matGold);
        cell.position.set(0, 1.8, 1.5); armGroup.add(cell);
        // Corona glow line on cell
        const cellGlow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), matCorona);
        cellGlow.position.set(0, 1.82, 0); cell.add(cellGlow);
        head.add(armGroup);
    }

    // Gold equatorial orbit ring
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.07, 8, 32), matGold);
    orbitRing.rotation.x = Math.PI/2; orbitRing.position.y = 1.8; head.add(orbitRing);

    // Level upgrades
    if (level >= 2) {
        // Second tilted orbit ring
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.055, 8, 32), matGold);
        ring2.rotation.x = Math.PI/4; ring2.position.y = 1.8; head.add(ring2);
    }
    if (level >= 3) {
        // Third polar orbit ring
        const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.055, 8, 32), matCorona);
        ring3.rotation.z = Math.PI/4; ring3.position.y = 1.8; head.add(ring3);
    }
    if (level >= 4) {
        // 6 corona flare spikes around housing equator — always visible at level 4
        for (let i = 0; i < 6; i++) {
            const ang = (i/6)*Math.PI*2;
            const flare = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 4), matCorona);
            flare.position.set(Math.cos(ang)*1.52, 1.8, Math.sin(ang)*1.52);
            flare.rotation.z = Math.cos(ang)*Math.PI/2 + Math.PI/2;
            flare.rotation.x = Math.sin(ang)*Math.PI/2;
            head.add(flare);
        }
        // Outer gold ring halo (new at level 4, always visible)
        const haloRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.04, 6, 36), matGold);
        haloRing.rotation.x = Math.PI/2; haloRing.position.y = 1.8; head.add(haloRing);
    }

    // Branch diff handled by housing opacity — branch A = brighter core, B = black hole
    if (branch === 'A') { // Sun God — massive corona burst
        const bigCore = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), matCorona);
        bigCore.position.y = 1.8; head.add(bigCore);
        const outerShell = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 14), new THREE.MeshStandardMaterial({
            color: 0x080400, transparent: true, opacity: 0.35, metalness: 0.9, roughness: 0.0,
            emissive: new THREE.Color(0xFF7700), emissiveIntensity: 0.6, side: THREE.DoubleSide }));
        outerShell.position.y = 1.8; head.add(outerShell);
        // Extra crown flares (6 more between the level-4 ones)
        for (let i = 0; i < 6; i++) {
            const ang = (i/6)*Math.PI*2 + Math.PI/6;
            const flare2 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.38, 4), matCorona);
            flare2.position.set(Math.cos(ang)*1.28, 1.8, Math.sin(ang)*1.28);
            flare2.rotation.z = Math.cos(ang)*Math.PI/2 + Math.PI/2;
            flare2.rotation.x = Math.sin(ang)*Math.PI/2;
            head.add(flare2);
        }
    } else if (branch === 'B') { // Black Hole — collapsed singularity
        // Replace the solar housing with a void event horizon
        housing.visible = false;
        core.visible = false;
        orbitRing.visible = false;
        // Singularity — deep black sphere
        const singularity = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 14),
            new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.0, roughness: 1.0 }));
        singularity.position.y = 1.8; head.add(singularity);
        // Accretion disk — flat glowing ring (90% slow = purple/violet)
        const matAccretion = new THREE.MeshStandardMaterial({
            color: 0x100010, emissive: new THREE.Color(0xCC00FF), emissiveIntensity: 3.5,
            transparent: true, opacity: 0.85, side: THREE.DoubleSide });
        const accretionDisk = new THREE.Mesh(new THREE.RingGeometry(0.65, 2.1, 48), matAccretion);
        accretionDisk.rotation.x = Math.PI/2; accretionDisk.position.y = 1.8; head.add(accretionDisk);
        // Inner hot ring — bright violet
        const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 8, 36), new THREE.MeshStandardMaterial({
            color: 0x080008, emissive: new THREE.Color(0xFF44FF), emissiveIntensity: 4.5 }));
        innerRing.rotation.x = Math.PI/2; innerRing.position.y = 1.8; head.add(innerRing);
        // Two tilted polar rings showing gravitational warping
        [Math.PI/3, -Math.PI/3].forEach(tilt => {
            const polarRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 5, 32), new THREE.MeshStandardMaterial({
                color: 0x080008, emissive: new THREE.Color(0x9900DD), emissiveIntensity: 2.0,
                transparent: true, opacity: 0.7 }));
            polarRing.rotation.x = tilt; polarRing.position.y = 1.8; head.add(polarRing);
        });
    } else {
        // Pre-branch top focusing cap
        const focusCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.6, 12), matSolar);
        focusCap.position.y = 2.55; head.add(focusCap);
    }
}

// ── EPIC REMODEL: ABYSSAL FREEZE (Ice/Cryo) ──────────────────────────────────
// Void-crater custom platform, obsidian containment arms, teal cryo-vent core
function _buildIceAbyssal(head, baseGroup, level = 1, branch = null) {
    const matVoid = new THREE.MeshStandardMaterial({
        color: 0x000304, metalness: 1.0, roughness: 0.0 });
    const matCryo = new THREE.MeshStandardMaterial({
        color: 0x000A08, emissive: new THREE.Color(0x00FFDD), emissiveIntensity: 4.5 });
    const matGlass = new THREE.MeshStandardMaterial({
        color: 0x000000, transparent: true, opacity: 0.85,
        metalness: 1.0, roughness: 0.0, side: THREE.DoubleSide });

    // ── Custom void-crater platform ──
    const craterBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.4, 8), matVoid);
    craterBase.position.y = 0.2; baseGroup.add(craterBase);
    // Cryo-vent cracks radiating from center
    for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2;
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.65), matCryo);
        crack.position.set(Math.cos(ang)*0.75, 0.42, Math.sin(ang)*0.75);
        crack.rotation.y = ang; baseGroup.add(crack);
    }
    // Cryo vent pods at platform edge
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), matCryo);
        pod.position.set(Math.cos(ang)*1.78, 0.55, Math.sin(ang)*1.78); baseGroup.add(pod);
    }
    // Obsidian void pillar
    const voidPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.05, 1.0, 6), matVoid);
    voidPillar.position.y = 0.9; baseGroup.add(voidPillar);
    for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2;
        const vs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), matCryo);
        vs.position.set(Math.cos(ang)*0.87, 0.9, Math.sin(ang)*0.87); baseGroup.add(vs);
    }

    // ── Obsidian cryo-spire ──
    // Core column — void glass with teal glow inside
    const coreOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 2.6, 6), matGlass);
    coreOuter.position.y = 1.25; head.add(coreOuter);
    const coreInner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6), matCryo);
    coreInner.position.y = 1.25; head.add(coreInner);

    // 3 void containment arms
    for (let i = 0; i < 3; i++) {
        const ang = (i/3)*Math.PI*2;
        const armGroup = new THREE.Group();
        armGroup.rotation.y = ang;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.2, 0.38), matVoid);
        pillar.position.set(0, 1.1, 1.2); armGroup.add(pillar);
        const conn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.8), matVoid);
        conn.position.set(0, 1.1, 0.6); armGroup.add(conn);
        // Cryo seam on pillar
        const aseam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.18, 0.04), matCryo);
        aseam.position.set(0, 1.1, 1.4); armGroup.add(aseam);
        head.add(armGroup);
    }

    // Level upgrades
    if (level >= 2) {
        // Bottom cryo diffuser ring
        const diffRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.09, 4, 32), matCryo);
        diffRing.rotation.x = Math.PI/2; diffRing.position.y = 0.4; head.add(diffRing);
    }
    if (level >= 3) {
        // Upper containment ring
        const topRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.09, 4, 32), matCryo);
        topRing.rotation.x = Math.PI/2; topRing.position.y = 2.25; head.add(topRing);
    }
    if (level >= 4 && !branch) {
        // Floating void emitter crystals between arms
        for (let i = 0; i < 3; i++) {
            const ang = (i/3)*Math.PI*2 + Math.PI/3;
            const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 4), matCryo);
            crystal.position.set(Math.cos(ang)*1.05, 2.7, Math.sin(ang)*1.05);
            head.add(crystal);
        }
    }

    if (branch === 'A') { // Absolute Zero — full cryo-sphere
        coreOuter.visible = false; coreInner.visible = false;
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), matGlass);
        sphere.position.y = 1.5; head.add(sphere);
        const sphereCore = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 12), matCryo);
        sphereCore.position.y = 1.5; head.add(sphereCore);
    } else if (branch === 'B') { // Shard Storm — 6 outward void spikes
        for (let i = 0; i < 6; i++) {
            const ang = (i/6)*Math.PI*2;
            const shard = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.8), matCryo);
            const sx = Math.cos(ang)*1.4, sz = Math.sin(ang)*1.4;
            shard.position.set(sx, 1.5, sz);
            shard.rotation.y = -ang; shard.rotation.z = Math.PI/2;
            head.add(shard);
        }
    }
}

// ── EPIC REMODEL: NEON VAULT (Farm) ──────────────────────────────────────────
// Chrome-black high-tech barn with neon edge grid and holographic silo ring
function _buildFarmNeonVault(head, baseGroup, level = 1, branch = null) {
    const matChrome = new THREE.MeshStandardMaterial({
        color: 0x020808, metalness: 0.95, roughness: 0.05 });
    const matNeon = new THREE.MeshStandardMaterial({
        color: 0x000A08, emissive: new THREE.Color(0x00FFEE), emissiveIntensity: 5.0 });
    const matPanel = new THREE.MeshStandardMaterial({
        color: 0x040E0D, metalness: 0.8, roughness: 0.15,
        emissive: new THREE.Color(0x00AACC), emissiveIntensity: 0.35 });

    // ── Custom high-tech plot ──
    const techBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 3.6), matChrome);
    techBase.position.y = 0.22; baseGroup.add(techBase);
    // Neon grid lines on base surface — 3×3
    for (let g = 0; g < 4; g++) {
        const lineH = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.03, 0.04), matNeon);
        lineH.position.set(0, 0.46, -1.5+g); baseGroup.add(lineH);
        const lineV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 3.55), matNeon);
        lineV.position.set(-1.5+g, 0.46, 0); baseGroup.add(lineV);
    }
    // 4 corner pillars
    [[1.7,1.7],[1.7,-1.7],[-1.7,1.7],[-1.7,-1.7]].forEach(([x,z]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6), matChrome);
        post.position.set(x, 0.7, z); baseGroup.add(post);
        const postGlow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), matNeon);
        postGlow.position.set(x, 0.95, z); baseGroup.add(postGlow);
    });

    // ── Chrome barn body ──
    const barnBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 2.2), matChrome);
    barnBody.position.set(0, 1.3, 0.1); head.add(barnBody);
    // Neon edge lines on barn faces
    // Front face edges
    [[0,2.12,0.1],[0,0.52,0.1]].forEach(([x,y,z]) => {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.04, 0.04), matNeon);
        edge.position.set(x,y,z); head.add(edge);
    });
    // Side vertical edges
    [[-1.3,1.3,0.1],[1.3,1.3,0.1]].forEach(([x,y,z]) => {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.58, 0.04), matNeon);
        edge.position.set(x,y,z); head.add(edge);
    });

    // Roof — angled chrome panels with neon ridge
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 2.2), matChrome);
    roofL.rotation.z = 0.45; roofL.position.set(-0.62, 2.25, 0.1); head.add(roofL);
    const roofR = roofL.clone(); roofR.rotation.z = -0.45; roofR.position.set(0.62, 2.25, 0.1); head.add(roofR);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 2.2), matNeon);
    ridge.position.set(0, 2.6, 0.1); head.add(ridge);

    // Silo — chrome cylinder with neon ring bands
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 1.8, 12), matChrome);
    silo.position.set(-1.45, 1.3, 0.1); head.add(silo);
    for (let r = 0; r < 3; r++) {
        const siloRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 6, 20), matNeon);
        siloRing.rotation.x = Math.PI/2; siloRing.position.set(-1.45, 0.5+r*0.6, 0.1); head.add(siloRing);
    }
    const siloCap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.45, 12), matChrome);
    siloCap.position.set(-1.45, 2.32, 0.1); head.add(siloCap);
    const siloCapGlow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 6, 20), matNeon);
    siloCapGlow.rotation.x = Math.PI/2; siloCapGlow.position.set(-1.45, 2.1, 0.1); head.add(siloCapGlow);

    // Level upgrades
    if (level >= 2) {
        // Holographic data display panel on barn front
        const display = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.06), matPanel);
        display.position.set(0, 1.5, 1.16); head.add(display);
        // Scan lines on display
        for (let l = 0; l < 4; l++) {
            const sline = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.04), matNeon);
            sline.position.set(0, 1.25+l*0.15, 1.2); head.add(sline);
        }
    }
    if (level >= 3) {
        // Second silo on right side
        const silo2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 1.35, 10), matChrome);
        silo2.position.set(1.48, 1.18, 0.1); head.add(silo2);
        const s2Ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), matNeon);
        s2Ring.rotation.x = Math.PI/2; s2Ring.position.set(1.48, 1.0, 0.1); head.add(s2Ring);
        const s2Cap = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.38, 10), matChrome);
        s2Cap.position.set(1.48, 1.9, 0.1); head.add(s2Cap);
    }
    if (level >= 4 && !branch) {
        // Antenna array on roof ridge
        for (let a = 0; a < 3; a++) {
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), matChrome);
            ant.position.set(-0.5+a*0.5, 2.9, 0.1); head.add(ant);
            const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), matNeon);
            antTip.position.set(-0.5+a*0.5, 3.22, 0.1); head.add(antTip);
        }
    }

    if (branch === 'A') { // Cash Vault — reinforced chrome safe door on barn front
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.14), matChrome);
        door.position.set(0, 1.35, 1.22); head.add(door);
        const doorRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 20), matNeon);
        doorRing.position.set(0, 1.35, 1.3); head.add(doorRing);
    } else if (branch === 'B') { // Factory — conveyor pipe on the side
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 8), matChrome);
        pipe.rotation.z = Math.PI/2; pipe.position.set(0.3, 1.1, -1.1); head.add(pipe);
        for (let b = 0; b < 4; b++) {
            const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 12), matNeon);
            band.rotation.x = Math.PI/2; band.position.set(-0.55+b*0.5, 1.1, -1.1); head.add(band);
        }
    }
}

function createTowerModel(type, level = 1, branch = null) {
    const root = new THREE.Group();

    // --- 1. SHARED MATERIALS ---
    const tData = TOWERS[type] || { color: 0xffffff };
    let mainColor = tData.color;
    if (level === 5 && branch && typeof TOWER_UPGRADES !== 'undefined' && TOWER_UPGRADES[type]) {
        mainColor = TOWER_UPGRADES[type][branch].color;
    }

    // ── SKIN SYSTEM ────────────────────────────────────────────────────────────
    let _skinEmissive = null, _skinEmissiveInt = 0;
    let _skinMetalness = 0.2, _skinRoughness = 0.3;
    let _camoMode = false, _camoPalette = null;
    let _activeSkinId = null, _activeSkin = null;

    if (typeof window.getActiveSkin === 'function') {
        _activeSkin = window.getActiveSkin(type); // null = default
        if (_activeSkin) {
            _activeSkinId = _activeSkin.id;
            if (_activeSkin.skinType === 'remodel') {
                // Handled per-tower inside the type blocks below
            } else if (_activeSkin.skinType === 'camo') {
                mainColor      = _activeSkin.mainColor;
                _skinMetalness = 0.0;
                _skinRoughness = 0.97;
                _camoMode      = true;
                _camoPalette   = _activeSkin.camoPalette || [0x3d4a2a, 0x5c4a1e, 0x8a7048, 0x1a1c14];
            } else {
                mainColor        = _activeSkin.mainColor;
                _skinMetalness   = _activeSkin.metalness          ?? 0.2;
                _skinRoughness   = _activeSkin.roughness          ?? 0.3;
                _skinEmissive    = _activeSkin.emissive            || null;
                _skinEmissiveInt = _activeSkin.emissiveIntensity   || 0;
            }
        }
    }
    // ── END SKIN SYSTEM ────────────────────────────────────────────────────────

    const matBase = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 });
    const matMain = new THREE.MeshStandardMaterial({
        color:     mainColor,
        roughness: _skinRoughness,
        metalness: _skinMetalness,
        ...(_skinEmissive !== null ? { emissive: _skinEmissive, emissiveIntensity: _skinEmissiveInt } : {})
    });
    const matDetail = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.2, metalness: 0.8 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.2 });
    const matEnergy = new THREE.MeshBasicMaterial({ color: mainColor });
    
    // FIX: Added side: THREE.DoubleSide to fix the invisible wall glitch
    const matGlass = new THREE.MeshStandardMaterial({ 
        color: 0xaaddff, 
        transparent: true, 
        opacity: 0.6, 
        metalness: 0.9, 
        roughness: 0.0,
        side: THREE.DoubleSide 
    });
    
    // Gatling Materials (Modernized)
    const matGunMetal = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });

    // --- 2. HELPER FUNCTIONS ---
    const addBolts = (target, count, radius, yPos, size = 0.05) => {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const b = new THREE.Mesh(new THREE.DodecahedronGeometry(size), matDetail);
            b.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
            target.add(b);
        }
    };
    const addVents = (target, w, h, x, y, z) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), matDark);
        g.add(frame);
        for(let i=0; i<5; i++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(w*0.9, h/10, 0.06), matDetail);
            slat.position.y = (i - 2) * (h/6);
            g.add(slat);
        }
        target.add(g);
    };

    // --- 3. BASE GENERATION ---
    const baseGroup = new THREE.Group();
    root.add(baseGroup);

    // Epic remodel skins that supply their own custom platform
    const _epicWithCustomBase = ['gunner_voidstrike','cannon_hellfire','tesla_stormcore','mortar_ironclad','flamethrower_dragonscale','plasma_solarburst','ice_abyssal','farm_neonvault','laser_voidcutter'];
    const _hasCustomBase = _epicWithCustomBase.includes(_activeSkinId);

    if (_hasCustomBase) {
        // Base will be filled by the epic builder function below — skip default base
    } else if (type === 'plasma' || type === 'laser' || type === 'tesla') {
        // --- HOVER TECH BASE (Unchanged) ---
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 0.4, 8), matBase);
        pad.position.y = 0.2;
        baseGroup.add(pad);
        
        const ringGeo = new THREE.TorusGeometry(1.8, 0.15, 6, 16);
        const r1 = new THREE.Mesh(ringGeo, matDetail); r1.rotation.x = Math.PI/2; r1.position.y = 0.6;
        const r2 = new THREE.Mesh(ringGeo, matMain); r2.rotation.x = Math.PI/2; r2.position.y = 0.9;
        baseGroup.add(r1, r2);
        
        for(let i=0; i<4; i++) {
            const em = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8), matEnergy);
            em.position.set(Math.cos(i*1.57)*1.8, 1.2, Math.sin(i*1.57)*1.8);
            baseGroup.add(em);
        }
    }
    else if (type === 'farm') {
        // --- LAND PLOT (Unchanged) ---
        const soil = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 3.5), matBase);
        soil.position.y = 0.25;
        baseGroup.add(soil);
        const grass = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.1, 3.3), new THREE.MeshStandardMaterial({color:0x2ecc71}));
        grass.position.y = 0.55;
        baseGroup.add(grass);
    }
    else {
        // --- HEAVY MILITARY BASE (Unchanged) ---
        const footGeo = new THREE.BoxGeometry(0.8, 0.4, 1.2);
        for(let i=0; i<4; i++) {
            const foot = new THREE.Mesh(footGeo, matBase);
            const ang = (i/4)*Math.PI*2 + Math.PI/4;
            foot.position.set(Math.cos(ang)*1.5, 0.2, Math.sin(ang)*1.5);
            foot.lookAt(0,0.2,0);
            baseGroup.add(foot);
            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, 0.4), matBase);
            strut.position.set(Math.cos(ang)*1.0, 0.5, Math.sin(ang)*1.0);
            strut.rotation.x = -0.3; strut.lookAt(0, 1.5, 0);
            baseGroup.add(strut);
        }
        const center = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.0, 8), matDark);
        center.position.y = 0.5;
        baseGroup.add(center);
        addBolts(baseGroup, 8, 1.1, 0.9);
    }

    // --- 4. HEAD GENERATION ---
    const head = new THREE.Group();
    if (type === 'minigun') head.position.y = 1.0; // Adjusted for new base
    else if (type === 'farm') head.position.y = 0.6;
    else if (type === 'cannon') head.position.y = 1.0; // Cannon rotates
    else if (type === 'flamethrower') head.position.y = 1.0; // Flamethrower rotates
    else if (type === 'mortar') head.position.y = 1.2;
    else head.position.y = 1.0;
    
    root.add(head);

    // ===========================================
    //               TOWER LOGIC
    // ===========================================

    if (type === 'gunner') {
        // ── LEGENDARY SKIN: Molten Core — full remodel ──────────────────────
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'gunner_molten') {
            _buildGunnerMolten(head, level, branch);
        // ── EPIC SKIN: Void Strike — full remodel with custom platform ──────
        } else if (_activeSkinId === 'gunner_voidstrike') {
            _buildGunnerVoidStrike(head, baseGroup, level, branch);
        } else {
        // --- DEFAULT LOOK ---
        const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.4, 16), matDetail);
        swivel.position.y = 0.2; head.add(swivel);
        
        const housing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.0), matMain);
        housing.position.set(0, 1.0, 0); head.add(housing);
        
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 12), matDark);
        drum.rotation.z = Math.PI/2; drum.position.set(0.9, 1.0, 0); head.add(drum);
        
        // --- LEVEL UPGRADES ---
        if (level >= 2) { // Add Reinforced Top Plate
            const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.8), matDetail);
            plate.position.set(0, 1.7, 0); head.add(plate);
        }
        if (level >= 3) { // Add Targeting Sensor
            const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), matEnergy);
            sensor.position.set(-0.5, 1.8, -0.5); head.add(sensor);
        }

        const makeGun = (offX) => {
            const g = new THREE.Group();
            g.position.set(offX, 1.0, 1.0);
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.2), matDark);
            b.rotation.x = Math.PI/2; b.position.z = 1.1;
            const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4), matDetail);
            brake.rotation.x = Math.PI/2; brake.position.z = 2.2;
            g.add(b, brake);
            return g;
        };

        if (level >= 4) {
            head.add(makeGun(0.4)); head.add(makeGun(-0.4));
        } else {
            head.add(makeGun(0));
        }

        if (level === 5 && branch === 'A') { // Doomsday
            const pod = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.2), matMain);
            pod.position.set(-1.0, 1.2, 0); head.add(pod);
            for(let i=0; i<4; i++) {
                const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3), new THREE.MeshBasicMaterial({color:0xff0000}));
                m.rotation.x = -Math.PI/2; m.position.set(-1.0 + (i%2)*0.4, 1.2 + (i<2?0.2:-0.2), 0.6);
                head.add(m);
            }
        } else if (level === 5 && branch === 'B') { // Shredder
            const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.1, 0.2, 16), matDetail);
            dish.position.set(0, 1.8, -0.5); head.add(dish);
        }
    }

    } // end gunner

    else if (type === 'sniper') {
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'sniper_crystal') {
            _buildSniperCrystal(head, level, branch);
        } else {
        // --- 1. BASE MODEL (Level 1) ---
        // Pivot/Stand
        const pivot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), matDark);
        pivot.position.y = 0.3; head.add(pivot);

        // Main Receiver (The body)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.5), matMain);
        body.position.set(0, 0.8, 0.5); head.add(body);

        // Stock (Back part)
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.2), matDark);
        stock.position.set(0, 0.7, -0.8); head.add(stock);

        // Thin Barrel (Level 1 Style)
        if (level < 4) {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.5), matDetail);
            barrel.rotation.x = Math.PI/2; 
            barrel.position.set(0, 0.8, 2.5); 
            head.add(barrel);
        }

        // --- 2. LEVEL UPGRADES (Visual Progression) ---
        
        // LEVEL 2: "Tactical Kit" (Muzzle Brake + Laser)
        if (level >= 2) {
            // Giant Muzzle Brake (T-Shape at end of barrel)
            // Position depends on if we have the L4 shroud or not
            const tipPos = (level >= 4) ? 4.8 : 4.2;
            const brake = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.5), matDark);
            brake.position.set(0, 0.8, tipPos); 
            head.add(brake);

            // Laser Sight (Side Box)
            const laserBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), matDark);
            laserBox.position.set(0.4, 0.9, 1.5); 
            head.add(laserBox);
            
            // The Laser Beam Emitter (Red dot)
            const lens = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({color:0xff0000}));
            lens.position.set(0.4, 0.9, 1.85);
            head.add(lens);
        }

        // LEVEL 3: "Heavy Mag Kit" (Ammo Box + Cheek Pad)
        if (level >= 3) {
            // Big Ammo Box (Sticking out the left side)
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.6), matDetail);
            mag.position.set(-0.6, 0.7, 0.5); 
            head.add(mag);

            // Cheek Rest (On stock)
            const rest = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8, 1, false, 0, Math.PI), matMain);
            rest.rotation.z = Math.PI/2;
            rest.rotation.y = Math.PI/2;
            rest.position.set(0, 0.95, -0.8);
            head.add(rest);
        }

        // LEVEL 4: "Elite Barrel" (Thermal Shroud + Digital Scope)
        if (level >= 4) {
            // REPLACE the thin barrel with a massive Thermal Shroud (Square Barrel)
            const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 3.5), matMain);
            shroud.position.set(0, 0.8, 2.8);
            head.add(shroud);
            
            // Cooling Vents (Visual detail on shroud)
            for(let i=0; i<5; i++) {
                const vent = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.4, 0.1), matDark);
                vent.position.set(0, 0.8, 1.5 + i*0.6);
                head.add(vent);
            }

            // Digital Scope (Replaces iron sights)
            const scopeBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.2), matDark);
            scopeBase.position.set(0, 1.35, 0.2);
            head.add(scopeBase);
            
            const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), new THREE.MeshBasicMaterial({color:0x00ff00}));
            lens.rotation.x = Math.PI/2;
            lens.position.set(0, 1.35, -0.4); // Facing player
            head.add(lens);
        }

        // --- 3. BRANCH PATHS (Level 5) ---
        if (branch === 'A') { // CRIPPLE (Purple Tech)
            const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.8), matEnergy);
            sensor.position.set(0.3, 1.2, 1.0); head.add(sensor);
            // Glow tip
            const glow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.2), matEnergy);
            glow.position.set(0, 0.8, 5.1); head.add(glow);
        } 
        else if (branch === 'B') { // ELITE (Golden/Yellow Accents)
            const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), matDark);
            drum.rotation.z = Math.PI/2; 
            drum.position.set(0, 0.3, 0.5); head.add(drum); // Under-barrel drum
            
            // Gold Barrel Stripes
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.5), matGold);
            stripe.position.set(0, 0.8, 3.5); head.add(stripe);
        }
    }
    }

    else if (type === 'minigun') {
        // ── LEGENDARY SKIN: Liquid Chrome — full remodel ─────────────────────
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'minigun_liquidchrome') {
            _buildMinigunLiquidChrome(head, level, branch);
        } else {
        // --- GATLING REDESIGN (Heavy Turret Style) ---
        
        // 1. Swivel Base (Low profile, heavy)
        const swivel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 16), matDetail);
        swivel.position.y = 0.2;
        head.add(swivel);

        // 2. Main Turret Block (Asymmetrical)
        const turret = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.5), matMain);
        turret.position.y = 0.8;
        head.add(turret);

        // 3. Massive Ammo Drum (Side Mounted)
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.8, 16), matDark);
        drum.rotation.z = Math.PI/2;
        drum.position.set(0.8, 0.8, -0.2); // Stick out the right side
        head.add(drum);

        // Ammo Belt Feed
        const belt = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.15, 4, 8, 1.5), matDetail);
        belt.rotation.y = 1.5; 
        belt.position.set(0.5, 0.8, 0.2);
        head.add(belt);

        // 4. The Rotary Gun
        const gunGroup = new THREE.Group();
        gunGroup.position.set(-0.2, 0.8, 0.8); // Offset to left slightly to balance drum
        head.add(gunGroup);

        // Gun Motor Housing
        const motor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.0), matGunMetal);
        gunGroup.add(motor);

        // Barrel Cluster
        const cluster = new THREE.Group();
        cluster.position.z = 0.5;
        gunGroup.add(cluster);

        const barrelCount = (level >= 4) ? 8 : 6;
        for(let i=0; i<barrelCount; i++) {
            const angle = (i/barrelCount) * Math.PI * 2;
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8), matDark);
            b.rotation.x = Math.PI/2;
            b.position.set(Math.cos(angle)*0.25, Math.sin(angle)*0.25, 1.4);
            cluster.add(b);
        }

        // Barrel Clamps (Visual Detail)
        const clamp1 = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 4, 8), matDetail);
        clamp1.position.z = 1.5; cluster.add(clamp1);
        const clamp2 = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 4, 8), matDetail);
        clamp2.position.z = 2.5; cluster.add(clamp2);

        // --- LEVEL VISUALS ---
        
        // Level 2: Heat Shield (Half-cylinder at base of barrels)
        if (level >= 2) {
            const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 16, 1, true, 0, Math.PI), matMain);
            shield.rotation.x = Math.PI/2;
            shield.rotation.z = Math.PI/2; // Open top
            shield.position.z = 1.0;
            gunGroup.add(shield);
        }

        // Level 3: Radar / Targeter on top of Turret
        if (level >= 3) {
            const sensorBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), matDetail);
            sensorBase.position.set(0, 1.4, 0); head.add(sensorBase);
            
            const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.5), matEnergy);
            lens.rotation.x = Math.PI/2;
            lens.position.set(0, 1.4, 0.3); head.add(lens);
        }

        // Level 5 Branch B: Rocket Pod Swap
        if (level === 5 && branch === 'B') {
            head.remove(gunGroup); // Remove the minigun
            head.remove(drum);     // Remove the ammo
            head.remove(belt);
            
            // Add Missile Rack
            const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.5), matMain);
            rack.position.set(0, 1.0, 0);
            head.add(rack);
            
            for(let x=-1; x<=1; x+=2) for(let y=-1; y<=1; y+=2) {
                const rkt = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8), matDark);
                rkt.rotation.x = -Math.PI/2; 
                rkt.position.set(x*0.5, 1.0 + y*0.3, 0.8);
                head.add(rkt);
            }
        }
    } // end minigun default else

    } // end minigun

    else if (type === 'cannon') {
        // ── LEGENDARY SKIN: Gilded Siege — full remodel ──────────────────────
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'cannon_gilded') {
            _buildCannonGilded(head, level, branch);
        // ── EPIC SKIN: Hellfire Siege — full remodel with custom lava platform ─
        } else if (_activeSkinId === 'cannon_hellfire') {
            _buildCannonHellfire(head, baseGroup, level, branch);
        } else {
        // ── EPIC SKIN: Battle Rust — override matMain with procedural rust texture
        if (_activeSkin && _activeSkin.skinType === 'rust') {
            const rustMat = _makeRustMaterial();
            matMain.map = rustMat.map;
            matMain.roughnessMap = rustMat.roughnessMap;
            matMain.color.set(rustMat.color);
            matMain.roughness = rustMat.roughness;
            matMain.metalness = rustMat.metalness;
            matMain.needsUpdate = true;
        }
        // --- EPIC BTD6 STYLE CANNON - BIGGER & BETTER ---
        
        // Wooden carriage base (BIGGER)
        const carriageL = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 2.5, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 })
        );
        carriageL.position.set(-1.0, 0.8, -0.6);
        carriageL.rotation.z = 0.3;
        head.add(carriageL);
        
        const carriageR = carriageL.clone();
        carriageR.position.set(1.0, 0.8, -0.6);
        carriageR.rotation.z = -0.3;
        head.add(carriageR);
        
        // Wooden platform (BIGGER)
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.4, 2.0),
            new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
        );
        platform.position.y = 0.2;
        head.add(platform);
        
        // Wooden planks detail
        for(let i = 0; i < 4; i++) {
            const plank = new THREE.Mesh(
                new THREE.BoxGeometry(2.6, 0.05, 0.4),
                new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.95 })
            );
            plank.position.set(0, 0.42, -0.8 + i * 0.5);
            head.add(plank);
        }
        
        // BIG Wheels (LARGER)
        const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 12);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
        
        const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
        wheelL.rotation.z = Math.PI / 2;
        wheelL.position.set(-1.4, 0.7, -0.5);
        head.add(wheelL);
        
        const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
        wheelR.rotation.z = Math.PI / 2;
        wheelR.position.set(1.4, 0.7, -0.5);
        head.add(wheelR);
        
        // Wheel spokes (more detail)
        for(let wheel of [wheelL, wheelR]) {
            for(let i = 0; i < 8; i++) {
                const spoke = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.6, 0.06),
                    new THREE.MeshStandardMaterial({ color: 0x2d1f14 })
                );
                const angle = (i / 8) * Math.PI * 2;
                spoke.position.x = Math.sin(angle) * 0.3;
                spoke.position.y = Math.cos(angle) * 0.3;
                spoke.rotation.z = angle;
                wheel.add(spoke);
            }
            // Wheel hub
            const hub = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 0.35, 8),
                new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9 })
            );
            hub.rotation.z = Math.PI / 2;
            wheel.add(hub);
        }
        
        // THE BARREL - BIGGER AND FATTER — uses matMain so skins work
        const barrelLength = (branch === 'A') ? 2.8 : 4;
        const barrelRadius = (branch === 'A') ? 0.65 : 0.55;
        
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(barrelRadius, barrelRadius * 1.15, barrelLength, 20),
            matMain  // ← was hardcoded black, now uses skin color
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 1.2, 1.5);
        head.add(barrel);
        
        // Muzzle (uses matMain so skins fully recolor it, including the tip)
        const muzzle = new THREE.Mesh(
            new THREE.CylinderGeometry(barrelRadius + 0.1, barrelRadius, 0.4, 20),
            matMain
        );
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 1.2, 1.5 + barrelLength/2);
        head.add(muzzle);
        
        // Barrel rings — only for branch A and no-branch (not B which hides this barrel)
        const barrelRings = [];
        const ringStart = 1.5 - barrelLength/2 + 0.15;
        const ringStep = (barrelLength - 0.3) / 3;
        for(let i = 0; i < 4; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(barrelRadius + 0.07, 0.08, 12, 20),
                matMain
            );
            ring.rotation.y = Math.PI / 2;
            ring.position.set(0, 1.2, ringStart + i * ringStep);
            head.add(ring);
            barrelRings.push(ring);
        }
        
        // Fuse hole on top (bigger)
        const fuseBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        fuseBase.position.set(0, 1.55, -0.3);
        head.add(fuseBase);
        
        const fuse = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8),
            new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x664400, emissiveIntensity: 0.3 })
        );
        fuse.position.set(0, 1.7, -0.3);
        head.add(fuse);
        
        // Cannon supports — use matMain so they pick up rust/skin color
        const supportL = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.8, 0.3),
            matMain
        );
        supportL.position.set(-0.7, 0.9, 0);
        head.add(supportL);
        
        const supportR = supportL.clone();
        supportR.position.set(0.7, 0.9, 0);
        head.add(supportR);
        
        // Level upgrades
        if(level >= 2) {
            // Stack of cannonballs (BIGGER pile)
            const ballPositions = [
                [0.9, 0.5, 0.7], [1.1, 0.5, 0.5], [1.0, 0.8, 0.6],  // Right Pyramid
                [-0.9, 0.5, 0.7], [-1.1, 0.5, 0.5]                  // Left Pile
            ];
            ballPositions.forEach(pos => {
                const ball = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25, 12, 12),
                    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 })
                );
                ball.position.set(...pos);
                head.add(ball);
            });
        }
        
        if(level >= 3) {
            // Reinforced barrel collar with rivets — only visible when barrel is visible (not branch B)
            const reinforcement = new THREE.Mesh(
                new THREE.CylinderGeometry(barrelRadius + 0.15, barrelRadius + 0.15, 0.5, 20),
                matMain
            );
            reinforcement.rotation.x = Math.PI / 2;
            reinforcement.position.set(0, 1.2, 1.2);
            if (branch === 'B') reinforcement.visible = false;
            head.add(reinforcement);
            
            // Rivets sit ON the reinforcement ring face — fixed coordinates
            for(let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const rivet = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05, 6, 6),
                    matDetail
                );
                // Place rivet around the circumference of the reinforcement, at its z-center
                rivet.position.set(
                    Math.cos(angle) * (barrelRadius + 0.15),
                    1.2 + Math.sin(angle) * (barrelRadius + 0.15),
                    1.2
                );
                if (branch === 'B') rivet.visible = false;
                head.add(rivet);
            }
        }
        
        if(level >= 4 && !branch) {
            // GOLD barrel bands (SHINY!)
            for(let i = 0; i < 3; i++) {
                const goldRing = new THREE.Mesh(
                    new THREE.TorusGeometry(barrelRadius + 0.1, 0.1, 12, 20),
                    matGold
                );
                goldRing.rotation.y = Math.PI / 2;
                goldRing.position.set(0, 1.2, 0.2 + i * 0.8);
                head.add(goldRing);
            }
            
            // Crown on barrel (royal!)
            const crown = new THREE.Mesh(
                new THREE.ConeGeometry(0.2, 0.3, 5),
                matGold
            );
            crown.position.set(0, 1.6, 1.0);
            head.add(crown);
        }
        
        // Branch A: HOWITZER - MASSIVE barrel
        if(branch === 'A') {
            // Blast shield
            const shield = new THREE.Mesh(
                new THREE.BoxGeometry(3.2, 1.5, 0.25),
                matMain
            );
            shield.position.set(0, 1.2, -1.0);
            head.add(shield);
            
            // Danger stripes on shield
            for(let i = 0; i < 6; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(0.4, 1.4, 0.26),
                    new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xffff00 : 0x000000 })
                );
                stripe.position.set(-1.5 + i * 0.6, 1.2, -1.0);
                head.add(stripe);
            }
        }
        
        if(branch === 'B') {
            barrel.visible = false;
            muzzle.visible = false;
            barrelRings.forEach(r => r.visible = false); // hide main barrel rings
            
            for(let i = -1; i <= 1; i++) {
                const smallBarrel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.35, 0.40, 2.0, 16),
                    matMain  // ← skin-colored barrels
                );
                smallBarrel.rotation.x = Math.PI / 2;
                smallBarrel.position.set(i * 0.78, 1.2, 0.5);
                head.add(smallBarrel);
                
                // Reinforcing rings on each small barrel — clearly visible
                for(let r = 0; r < 2; r++) {
                    const bRing = new THREE.Mesh(
                        new THREE.TorusGeometry(0.42, 0.07, 8, 16),
                        matDark
                    );
                    bRing.rotation.y = Math.PI / 2;
                    bRing.position.set(i * 0.78, 1.2, -0.1 + r * 0.7);
                    head.add(bRing);
                }
                
                // Flared muzzle bell — uses matMain so skin colors it
                const miniMuzzle = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.46, 0.35, 0.28, 16),
                    matMain
                );
                miniMuzzle.rotation.x = Math.PI / 2;
                miniMuzzle.position.set(i * 0.78, 1.2, 1.42);
                head.add(miniMuzzle);
            }
            
            // Cross-brace connecting the three barrels
            const crossBrace = new THREE.Mesh(
                new THREE.BoxGeometry(2.0, 0.18, 0.18),
                matDark
            );
            crossBrace.position.set(0, 1.2, 0.1);
            head.add(crossBrace);
        }
    } // end cannon default else

    } // end cannon
    
    else if (type === 'flamethrower') {
        // ── LEGENDARY SKIN: White Phosphorus — full remodel ──────────────────
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'flamethrower_whitephosphorus') {
            _buildFlamethrowerWhitePhosphorus(head, level, branch);
        // ── EPIC SKIN: Dragon Scale — full remodel with dragon platform ───────
        } else if (_activeSkinId === 'flamethrower_dragonscale') {
            _buildFlamethrowerDragonScale(head, baseGroup, level, branch);
        } else {
        // --- FLAMETHROWER: INFERNO TOWER ---
        
        // Base - Fuel tank
        const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.9, 1.8, 16),
            matMain  // matMain so skins recolor the tank body
        );
        tank.position.y = 0.9;
        head.add(tank);
        
        // Warning stripes on tank
        for(let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(
                new THREE.TorusGeometry(0.82, 0.08, 8, 16),
                new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xff6600 : 0xffff00 })
            );
            stripe.rotation.x = Math.PI / 2;
            stripe.position.y = 0.3 + i * 0.6;
            head.add(stripe);
        }
        
        // Pressure gauge
        const gauge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 })
        );
        gauge.rotation.z = Math.PI / 2;
        gauge.position.set(0.9, 1.2, 0);
        head.add(gauge);
        
        const gaugeGlass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16),
            matGlass
        );
        gaugeGlass.rotation.z = Math.PI / 2;
        gaugeGlass.position.set(0.95, 1.2, 0);
        head.add(gaugeGlass);
        
        // Nozzle assembly
        const nozzleBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.4, 0.8, 12),
            matMain
        );
        nozzleBase.rotation.x = Math.PI / 2;
        nozzleBase.position.set(0, 1.5, 1.0);
        head.add(nozzleBase);
        
        const nozzle = new THREE.Mesh(
            new THREE.ConeGeometry(0.35, 1.2, 12),
            matMain  // Use matMain so skins recolor the nozzle tip too
        );
        nozzle.rotation.x = -Math.PI / 2;
        nozzle.position.set(0, 1.5, 1.8);
        head.add(nozzle);
        
        // Igniter (pilot light)
        const igniter = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        igniter.position.set(0, 1.5, 2.3);
        head.add(igniter);
        
        // Support arm
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1.2, 0.2),
            matDetail
        );
        arm.position.set(0, 1.0, 0.8);
        arm.rotation.x = -0.3;
        head.add(arm);
        
        // Level 2: Reinforced tank
        if(level >= 2) {
            // Thick metal bands
            for(let i = 0; i < 4; i++) {
                const band = new THREE.Mesh(
                    new THREE.TorusGeometry(0.92, 0.06, 8, 16),
                    matDetail
                );
                band.rotation.x = Math.PI / 2;
                band.position.y = 0.2 + i * 0.5;
                head.add(band);
            }
        }
        
        // Level 3: Dual fuel lines
        if(level >= 3) {
            for(let side = -1; side <= 1; side += 2) {
                const pipe = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8),
                    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
                );
                pipe.position.set(side * 0.6, 1.0, 0.3);
                pipe.rotation.x = -0.5;
                head.add(pipe);
            }
        }
        
        // Level 4: Gold trim
        if(level >= 4) {
            const topRim = new THREE.Mesh(
                new THREE.TorusGeometry(0.85, 0.1, 8, 16),
                matGold
            );
            topRim.rotation.x = Math.PI / 2;
            topRim.position.y = 1.8;
            head.add(topRim);
            
            // Ornate valve
            const valve = new THREE.Mesh(
                new THREE.TorusGeometry(0.15, 0.05, 8, 12),
                matGold
            );
            valve.rotation.z = Math.PI / 2;
            valve.position.set(-0.9, 0.6, 0);
            head.add(valve);
        }
        
        // Branch A: DRAGON'S BREATH - Extended range, long burns
        if(branch === 'A') {
            // Longer, ribbed nozzle
            nozzle.scale.z = 1.5;
            nozzle.position.z = 2.2;
            
            // Dragon head ornament
            const dragonHead = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.5, 0.8),
                new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4 })
            );
            dragonHead.position.set(0, 1.8, 2.5);
            head.add(dragonHead);
            
            // Dragon horns
            for(let side = -1; side <= 1; side += 2) {
                const horn = new THREE.Mesh(
                    new THREE.ConeGeometry(0.1, 0.4, 6),
                    matGold
                );
                horn.position.set(side * 0.25, 2.1, 2.5);
                horn.rotation.z = side * 0.5;
                head.add(horn);
            }
            
            // Flame decals
            for(let i = 0; i < 3; i++) {
                const flame = new THREE.Mesh(
                    new THREE.ConeGeometry(0.15, 0.5, 4),
                    new THREE.MeshBasicMaterial({ color: 0xffaa00 })
                );
                flame.rotation.x = Math.PI;
                flame.position.set(0, 1.2 - i * 0.5, 0);
                tank.add(flame);
            }
        }
        
        // Branch B: RING OF FIRE - 360 degree area damage
        if(branch === 'B') {
            // Hide main nozzle
            nozzle.visible = false;
            nozzleBase.visible = false;
            arm.visible = false;
            igniter.visible = false;
            
            // Ring of 8 nozzles
            for(let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                
                const ringNozzle = new THREE.Mesh(
                    new THREE.ConeGeometry(0.2, 0.6, 8),
                    new THREE.MeshStandardMaterial({ 
                        color: 0xff6600, 
                        emissive: 0x330000, 
                        emissiveIntensity: 0.5,
                        metalness: 0.8
                    })
                );
                ringNozzle.rotation.x = Math.PI / 2;
                ringNozzle.rotation.z = angle;
                ringNozzle.position.set(
                    Math.cos(angle) * 1.0,
                    1.8,
                    Math.sin(angle) * 1.0
                );
                head.add(ringNozzle);
                
                // Pilot lights
                const flame = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 6, 6),
                    new THREE.MeshBasicMaterial({ color: 0xffaa00 })
                );
                flame.position.set(
                    Math.cos(angle) * 1.3,
                    1.8,
                    Math.sin(angle) * 1.3
                );
                head.add(flame);
            }
            
            // Central ring platform
            const platform = new THREE.Mesh(
                new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16),
                matMain
            );
            platform.position.y = 1.7;
            head.add(platform);
        }
    } // end flamethrower default else

    } // end flamethrower
    
    else if (type === 'mortar') {
        // ── LEGENDARY SKIN: Orbital Drop — full remodel ──────────────────────
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'mortar_orbital') {
            _buildMortarOrbital(head, level, branch);
        // ── EPIC SKIN: Ironclad — full remodel with battleship platform ───────
        } else if (_activeSkinId === 'mortar_ironclad') {
            _buildMortarIronclad(head, baseGroup, level, branch);
        } else {
        // ── DEFAULT MORTAR ────────────────────────────────────────────────────
        // Heavy rotating baseplate
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.25, 20), matDetail);
        plate.position.y = 0.05;
        head.add(plate);
        // Baseplate detail ring
        const plateRing = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.08, 6, 20), matMain);
        plateRing.rotation.x = Math.PI/2; plateRing.position.y = 0.16; head.add(plateRing);
        
        // Side mount arms — thick and clearly visible
        const mountL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 1.6), matDark);
        mountL.position.set(1.1, 0.9, 0); head.add(mountL);
        const mountR = mountL.clone(); mountR.position.set(-1.1, 0.9, 0); head.add(mountR);
        // Hinge bolts on each arm
        [mountL, mountR].forEach(m => {
            const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 8), matDetail);
            bolt.rotation.z = Math.PI/2; bolt.position.set(0, 0.4, 0.3); m.add(bolt);
        });

        const tubeGroup = new THREE.Group();
        tubeGroup.rotation.x = Math.PI/4; 
        tubeGroup.position.set(0, 0.8, 0);
        head.add(tubeGroup);

        // ── LEVEL UPGRADES ────────────────────────────────────────────────────
        if (level >= 2) {
            // Hydraulic piston pair — clearly visible thick pistons
            const pisMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, metalness: 0.95, roughness: 0.1 });
            const pisL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2), pisMat);
            pisL.position.set(0.9, 0.5, -0.5); pisL.rotation.x = -0.5; head.add(pisL);
            const pisR = pisL.clone(); pisR.position.set(-0.9, 0.5, -0.5); head.add(pisR);
            // Piston end caps
            [pisL, pisR].forEach(p => {
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), matDetail);
                cap.position.y = 0.62; p.add(cap);
            });
        }
        if (level >= 3) {
            // Auto-loader ammo box — big visible box on the side
            const loader = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), matMain);
            loader.position.set(1.8, 0.5, -0.5); head.add(loader);
            // Ammo rounds visible on top of loader
            for (let i = 0; i < 3; i++) {
                const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), matDetail);
                shell.position.set(-0.3 + i*0.28, 0.55, 0); loader.add(shell);
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), matGold);
                tip.position.y = 0.4; shell.add(tip);
            }
        }
        if (level >= 4 && !branch) {
            // Reinforced hinge collar — big and chunky
            const collar = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.15, 8, 18), matMain);
            collar.rotation.x = Math.PI/2; collar.position.set(0, 0.8, 0); head.add(collar);
            // Extra gold accent ring
            const accent = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 18), matGold);
            accent.rotation.x = Math.PI/2; accent.position.set(0, 0.82, 0); head.add(accent);
        }

        if (branch === 'B') {
            // Triple tubes — clearly spaced and much thicker
            for(let i=-1; i<=1; i++) {
                const t = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 3.8, 16), matMain);
                t.position.set(i * 1.2, 1.1, 0); tubeGroup.add(t);
                // Muzzle flare on each tube
                const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.52, 0.4, 16), matDark);
                flare.position.set(i * 1.2, 2.1, 0); tubeGroup.add(flare);
                // Ring on each tube
                const tRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 8, 16), matDetail);
                tRing.rotation.x = Math.PI/2; tRing.position.set(i * 1.2, 0.4, 0); tubeGroup.add(tRing);
            }
            // Cross-brace between the tubes
            const brace = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 0.2), matDark);
            brace.position.set(0, 0, 0); tubeGroup.add(brace);
        } else {
            // Single tube — much thicker and taller
            const r = (branch === 'A') ? 1.3 : 0.9;
            const tubeH = (branch === 'A') ? 4.0 : 3.5;
            const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r+0.12, tubeH, 18), matMain);
            t.position.y = 1.2; tubeGroup.add(t);
            
            // Reinforcing rings on tube — 3 evenly spaced, very visible
            for (let ri = 0; ri < 3; ri++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(r+0.18, 0.12, 8, 18), matDetail);
                ring.rotation.x = Math.PI/2; ring.position.y = 0.2 + ri * 0.9; tubeGroup.add(ring);
            }
            
            // Muzzle bell — sits flush at the top opening of the tube
            const tubeTop = 1.2 + tubeH / 2; // top face of tube in tubeGroup space
            const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(r+0.35, r+0.05, 0.45, 18), matDark);
            muzzle.position.y = tubeTop + 0.225; tubeGroup.add(muzzle);
            
            if(branch === 'A') {
                // Nuke tube: glowing energy core inside the full tube length
                const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, tubeH), matEnergy);
                core.position.y = 1.2; tubeGroup.add(core);
                // Warning stripes along the tube body
                for (let s = 0; s < 4; s++) {
                    const stripe = new THREE.Mesh(new THREE.TorusGeometry(r+0.2, 0.07, 4, 12), 
                        new THREE.MeshStandardMaterial({ color: s % 2 === 0 ? 0xFFFF00 : 0xFF0000, emissive: s%2===0 ? 0xAAAA00 : 0x880000, emissiveIntensity: 0.6 }));
                    stripe.rotation.x = Math.PI/2; stripe.position.y = 0.2 + s * 0.75; tubeGroup.add(stripe);
                }
                // Massive nuke muzzle crown — sits above the muzzle bell
                const nukeRing = new THREE.Mesh(new THREE.TorusGeometry(r+0.5, 0.16, 10, 22), matEnergy);
                nukeRing.rotation.x = Math.PI/2; nukeRing.position.y = tubeTop + 0.5; tubeGroup.add(nukeRing);
            }
        }
    } // end mortar default else

    } // end mortar

    else if (type === 'tesla') {
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'tesla_overvolt') {
            _buildTeslaOvervolt(head, level, branch);
        // ── EPIC SKIN: Storm Core — full remodel with storm platform ──────────
        } else if (_activeSkinId === 'tesla_stormcore') {
            _buildTeslaStormCore(head, baseGroup, level, branch);
        } else {
        // --- DEFAULT LOOK ---
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 3.0, 8), matDetail);
        shaft.position.y = 1.5; head.add(shaft);
        
        // --- LEVEL UPGRADES ---
        if (level >= 2) { // Capacitor Base
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.5), matMain);
            cap.position.y = 0.5; head.add(cap);
        }
        
        // Coils
        const coilCount = level >= 3 ? 6 : 4;
        for(let i=0; i<coilCount; i++) {
            const coil = new THREE.Mesh(new THREE.TorusGeometry(1.0 - (i*0.1), 0.15, 8, 16), new THREE.MeshStandardMaterial({color:0xb85c00}));
            coil.rotation.x = Math.PI/2; coil.position.y = 0.5 + i*0.5;
            head.add(coil);
        }
        
        if (level >= 4 && !branch) { // Static Spikes
            for(let i=0; i<3; i++) {
                const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5), matEnergy);
                s.position.set(Math.cos(i*2), 3.0, Math.sin(i*2));
                head.add(s);
            }
        }

        if (branch === 'A') {
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), matEnergy);
            sphere.position.y = 3.5; head.add(sphere);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.1, 4, 32), matDetail);
            ring.rotation.x = Math.PI/2; ring.position.y = 3.5; head.add(ring);
        } else if (branch === 'B') {
            const dish = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.0, 16, 1, true), matDark);
            dish.position.y = 3.5; head.add(dish);
            const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 2.0), matEnergy);
            spike.position.y = 3.5; head.add(spike);
        } else {
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8), matDetail);
            sphere.position.y = 3.2; head.add(sphere);
            for(let i=0; i<4; i++) {
                const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8), matMain);
                s.position.set(Math.cos(i*1.57), 3.5, Math.sin(i*1.57));
                s.lookAt(0, 3.2, 0); head.add(s);
            }
        }
    }

    } // end sniper

    else if (type === 'ice') {
        // ── LEGENDARY SKIN: Permafrost Protocol — full remodel ───────────────
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'ice_permafrost') {
            _buildIcePermafrost(head, level, branch);
        // ── EPIC SKIN: Abyssal Freeze — full remodel with void-crater platform ─
        } else if (_activeSkinId === 'ice_abyssal') {
            _buildIceAbyssal(head, baseGroup, level, branch);
        } else {
        // --- SYMMETRICAL CRYO-SPIRE (AoE Style) ---
        
        // ── SKIN-AWARE GLASS: black ice = obsidian, abyssal = dark void glass ─
        const isBlackIceSkin = _activeSkinId === 'ice_blackice';
        const isAbyssalSkin = _activeSkinId === 'ice_abyssal';
        const matSkinGlass = (isBlackIceSkin || isAbyssalSkin) ? new THREE.MeshStandardMaterial({
            color: isBlackIceSkin ? 0x000000 : 0x000507,
            transparent: true, opacity: isBlackIceSkin ? 0.95 : 0.82,
            metalness: 1.0, roughness: 0.0,
            emissive: isAbyssalSkin ? 0x003322 : 0x000000,
            emissiveIntensity: isAbyssalSkin ? 1.0 : 0.0,
            side: THREE.DoubleSide
        }) : matGlass;
        // Since this tower spins 360 degrees in the animation loop, 
        // we build it to look good from all angles.

        // 1. Central Cooling Column (The Core)
        // A glass cylinder encasing pure energy
        const coreGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.5, 6);
        const core = new THREE.Mesh(coreGeo, matSkinGlass);
        core.position.y = 1.2;
        head.add(core);
        
        // Inner Energy Rod (The glow inside) — black for black ice, normal for others
        const matRod = isBlackIceSkin ? new THREE.MeshStandardMaterial({
            color: 0x000000, metalness:1.0, roughness:0.0,
            emissive: 0x001133, emissiveIntensity:0.3
        }) : matEnergy;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.5), matRod);
        rod.position.y = 1.2;
        head.add(rod);

        // 2. Symmetrical Containment Arms (3-way symmetry)
        // These hold the core in place, similar to the Plasma tower
        for(let i=0; i<3; i++) {
            const armGroup = new THREE.Group();
            const angle = (i/3) * Math.PI * 2;
            
            armGroup.rotation.y = angle;
            
            // The Pillar/Arm
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), matMain);
            pillar.position.set(0, 1.1, 1.2); // Offset from center
            armGroup.add(pillar);
            
            // Connector beam to core
            const conn = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.8), matDark);
            conn.position.set(0, 1.1, 0.6);
            armGroup.add(conn);
            
            head.add(armGroup);
        }

        // --- LEVEL UPGRADES (Adding complexity to the symmetry) ---
        
        // L2: Base Diffuser Ring (Widening the footprint)
        if (level >= 2) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.1, 4, 32), matDetail);
            ring.rotation.x = Math.PI/2;
            ring.position.y = 0.4;
            head.add(ring);
        }

        // L3: Top Stabilizer Ring (Closing the cage)
        if (level >= 3) {
            const topRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.1, 4, 32), matDetail);
            topRing.rotation.x = Math.PI/2;
            topRing.position.y = 2.2;
            head.add(topRing);
        }

        // L4: Floating Emitters (Symmetrical Crystals)
        if (level >= 4) {
            for(let i=0; i<3; i++) {
                const em = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6), matEnergy);
                // Place these BETWEEN the main arms
                const angle = (i/3) * Math.PI * 2 + (Math.PI/3); 
                em.position.set(Math.cos(angle)*1.0, 2.6, Math.sin(angle)*1.0);
                head.add(em);
            }
        }

        // --- BRANCH PATHS ---
        
        if (branch === 'A') { // ABSOLUTE ZERO (The Frozen Sun)
            // Remove the mechanical core to make room for the Sphere
            head.remove(core);
            head.remove(rod);
            
            // Outer Glass Shell
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), matSkinGlass);
            sphere.position.y = 1.5;
            head.add(sphere);
            
            // Inner Pulsing Core
            const inner = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), matEnergy);
            inner.position.y = 1.5;
            head.add(inner);
        }
        else if (branch === 'B') { // ICICLES (The Shredder)
            // Add 6 jagged spikes sticking outward
            for(let i=0; i<6; i++) {
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.8), matDetail);
                const angle = (i/6) * Math.PI * 2;
                
                // Position them in a circle
                spike.position.set(Math.cos(angle)*1.4, 1.5, Math.sin(angle)*1.4);
                
                // Rotate to point OUTWARD
                spike.rotation.y = -angle;
                spike.rotation.z = Math.PI/2; 
                
                head.add(spike);
            }
        }
    } // end ice default else

    } // end ice


    else if (type === 'laser') {
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'laser_voidcutter') {
            _buildLaserVoid(head, baseGroup, level, branch);
        } else {
        // --- REDESIGNED LASER TOWER: Sleek Targeting Emitter ---
        // Rotating tripod base
        const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.3, 16), matDark);
        baseRing.position.y = 0.15; head.add(baseRing);
        
        // 3 support struts from base up to emitter housing
        for (let i = 0; i < 3; i++) {
            const ang = (i/3)*Math.PI*2;
            const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 6), matDark);
            strut.position.set(Math.cos(ang)*0.65, 0.85, Math.sin(ang)*0.65);
            strut.rotation.z = Math.cos(ang) * 0.18;
            strut.rotation.x = Math.sin(ang) * 0.18;
            head.add(strut);
        }

        // Central pivot housing \u2014 hexagonal column
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.9, 6), matMain);
        housing.position.y = 1.1; head.add(housing);

        // Emitter arm \u2014 horizontal beam pointing forward
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 2.2), matMain);
        arm.position.set(0, 1.1, 1.2); head.add(arm);

        // Lens assembly at front of arm
        const lensOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.18, 12), matDark);
        lensOuter.rotation.x = Math.PI/2; lensOuter.position.set(0, 1.1, 2.35); head.add(lensOuter);
        
        const lensCore = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12),
            new THREE.MeshStandardMaterial({ color: mainColor, emissive: new THREE.Color(mainColor), emissiveIntensity: 3.0, transparent: true, opacity: 0.9 }));
        lensCore.rotation.x = Math.PI/2; lensCore.position.set(0, 1.1, 2.42); head.add(lensCore);

        // Cooling vanes on sides of housing
        [-0.5, 0.5].forEach(xOff => {
            const vane = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.08), matDark);
            vane.position.set(xOff, 1.1, 0.9); head.add(vane);
        });

        // Energy conduit along arm
        const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6),
            new THREE.MeshStandardMaterial({ color: mainColor, emissive: new THREE.Color(mainColor), emissiveIntensity: 1.5 }));
        conduit.rotation.x = Math.PI/2; conduit.position.set(0, 1.24, 1.2); head.add(conduit);

        // --- LEVEL UPGRADES ---
        if (level >= 2) {
            // Dual side-mounted power cells
            [-0.6, 0.6].forEach(xOff => {
                const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 8), matMain);
                cell.rotation.z = Math.PI/2; cell.position.set(xOff, 1.1, 0.2); head.add(cell);
                // Cell glow cap
                const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.08, 8),
                    new THREE.MeshStandardMaterial({ color: mainColor, emissive: new THREE.Color(mainColor), emissiveIntensity: 2.0 }));
                cap.rotation.z = Math.PI/2; cap.position.set(xOff > 0 ? xOff + 0.35 : xOff - 0.35, 1.1, 0.2); head.add(cap);
            });
        }
        if (level >= 3) {
            // Targeting scope array on top
            const scopeMount = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.7), matDark);
            scopeMount.position.set(0, 1.6, 0.6); head.add(scopeMount);
            const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), matMain);
            scope.rotation.x = Math.PI/2; scope.position.set(0, 1.65, 0.6); head.add(scope);
            // Scope lens glow
            const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8),
                new THREE.MeshStandardMaterial({ color: mainColor, emissive: new THREE.Color(mainColor), emissiveIntensity: 2.5 }));
            scopeLens.rotation.x = Math.PI/2; scopeLens.position.set(0, 1.65, 0.94); head.add(scopeLens);
        }
        if (level >= 4) {
            // Secondary focus ring around lens
            const focusRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 8, 20), matMain);
            focusRing.rotation.y = Math.PI/2; focusRing.position.set(0, 1.1, 2.4); head.add(focusRing);
            // Second conduit rail (below main arm)
            const conduit2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6),
                new THREE.MeshStandardMaterial({ color: mainColor, emissive: new THREE.Color(mainColor), emissiveIntensity: 1.5 }));
            conduit2.rotation.x = Math.PI/2; conduit2.position.set(0, 0.96, 1.2); head.add(conduit2);
        }

        // Branch A: Death Ray \u2014 massive lens + extended beam horn
        if (branch === 'A') {
            const bigLens = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.28, 12), matMain);
            bigLens.rotation.x = Math.PI/2; bigLens.position.set(0, 1.1, 2.5); head.add(bigLens);
            const bigCore = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 12),
                new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: new THREE.Color(0xff0000), emissiveIntensity: 4.0, transparent: true, opacity: 0.95 }));
            bigCore.rotation.x = Math.PI/2; bigCore.position.set(0, 1.1, 2.66); head.add(bigCore);
        }

        // Branch B: Splitter \u2014 3-way prism attached at front of arm
        if (branch === 'B') {
            const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0),
                new THREE.MeshStandardMaterial({ color: mainColor, emissive: new THREE.Color(mainColor), emissiveIntensity: 2.5, transparent: true, opacity: 0.85 }));
            prism.position.set(0, 1.1, 2.55); head.add(prism);
            // Two splitter arms angled outward
            [[-0.35, 0.2, 2.45],[0.35, 0.2, 2.45]].forEach(([x,y,z]) => {
                const splitter = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6),
                    new THREE.MeshStandardMaterial({ color: mainColor, emissive: new THREE.Color(mainColor), emissiveIntensity: 2.0 }));
                splitter.rotation.x = Math.PI/2; splitter.rotation.z = x > 0 ? -0.5 : 0.5;
                splitter.position.set(x, y, z); head.add(splitter);
            });
        }
    }

    } // end laser


    else if (type === 'plasma') {
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'plasma_starcore') {
            _buildPlasmaStarcore(head, level, branch);
        // ── EPIC SKIN: Solar Burst — full remodel with solar forge platform ──
        } else if (_activeSkinId === 'plasma_solarburst') {
            _buildPlasmaSolarBurst(head, baseGroup, level, branch);
        } else {
        // --- DEFAULT LOOK ---
        for(let i=0; i<3; i++) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), matMain);
            const a = (i/3)*Math.PI*2;
            arm.position.set(Math.cos(a)*1.5, 2.0, Math.sin(a)*1.5);
            arm.rotation.z = -0.2; arm.lookAt(0, 2.0, 0); head.add(arm);
        }
        
        const coreGeo = (branch === 'B') ? new THREE.SphereGeometry(1.2) : new THREE.IcosahedronGeometry(1.0, 1);
        const coreMat = (branch === 'B') ? new THREE.MeshBasicMaterial({color:0x000000}) : new THREE.MeshBasicMaterial({color:mainColor, wireframe:true});
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 2.0; head.add(core);
        
        const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 4, 32), matDark);
        r1.position.y = 2.0; r1.rotation.x = Math.PI/2; head.add(r1);
        
        // --- LEVEL UPGRADES ---
        if (level >= 2) { // Second Ring
            const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 4, 32), matDetail);
            r2.position.y = 2.0; r2.rotation.y = 0.5; head.add(r2);
        }
        if (level >= 3) { // Base Emitters
            for(let i=0; i<3; i++) {
                const em = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5), matEnergy);
                const a = (i/3)*Math.PI*2;
                em.position.set(Math.cos(a)*1.0, 0.5, Math.sin(a)*1.0);
                head.add(em);
            }
        }
        if (level >= 4) { // Top Spike
            const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), matDetail);
            spike.position.y = 3.2; head.add(spike);
        }

        if (branch === 'B') {
             const disk = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.5, 32), new THREE.MeshBasicMaterial({color:0x8e44ad, side:THREE.DoubleSide, transparent:true, opacity:0.6}));
             disk.position.y = 2.0; disk.rotation.x = Math.PI/2; head.add(disk);
        }
    }

    }
    else if (type === 'farm') {
        // ── LEGENDARY SKIN: Bioluminescent — full remodel ──────────────────────
        if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'farm_bioluminescent') {
            _buildFarmBioluminescent(head, level, branch);
        // ── LEGENDARY SKIN: Gold Rusher — gold mine remodel ────────────────────
        } else if (_activeSkin && _activeSkin.skinType === 'remodel' && _activeSkinId === 'farm_goldrusher') {
            _buildFarmGoldRusher(head, level, branch);
        // ── EPIC SKIN: Neon Vault — full remodel with tech platform ───────────
        } else if (_activeSkinId === 'farm_neonvault') {
            _buildFarmNeonVault(head, baseGroup, level, branch);
        } else {

        // ── EPIC SKIN: use accent color on trim details ───────────────────────
        const isEpicSkin = _activeSkin && _activeSkin.skinType === 'epic_recolor';
        const epicAccent = isEpicSkin ? (_activeSkin.accentColor || _activeSkin.mainColor) : null;
        const matEpicAccent = isEpicSkin ? new THREE.MeshStandardMaterial({
            color: epicAccent, roughness: 0.1, metalness: 0.9,
            emissive: epicAccent, emissiveIntensity: 0.8,
        }) : null;
        // ── NEON SKIN: glowing edge strips ───────────────────────────────────
        const isNeonSkin = _activeSkin && _activeSkin.skinType === 'neon';
        const _neonColor = isNeonSkin ? (_activeSkin.accentColor || _activeSkin.mainColor || 0x00ffff) : null;
        const matNeonStrip = isNeonSkin ? new THREE.MeshStandardMaterial({
            color: _neonColor, roughness: 0.05, metalness: 0.3,
            emissive: _neonColor, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.9,
        }) : null;
        // ═══════════════════════════════════════════════════════════════
        //  REAL FARM — centered at origin, well-proportioned barn+silo
        //  matMain = barn walls + silo body (shows skin color)
        //  matRoof = dark red roof (contrast)
        //  matWood = door/trim details
        // ═══════════════════════════════════════════════════════════════
        // Scale wrapper: keeps the whole farm within the 4-unit grid cell
        const farmG = new THREE.Group();
        farmG.scale.set(0.77, 0.77, 0.77);
        farmG.position.z = -0.5; // Shift the whole farm back so silo clears the front edge
        head.add(farmG);

        // Fixed accent materials — these stay constant so barn reads as "farm"
        const matRoof  = new THREE.MeshStandardMaterial({ color: 0x6B0F0F, roughness: 0.88, metalness: 0.0 });
        const matWood  = new THREE.MeshStandardMaterial({ color: 0x7A4E2D, roughness: 0.95, metalness: 0.0 });
        const matHay   = new THREE.MeshStandardMaterial({ color: 0xD4A843, roughness: 0.97, metalness: 0.0 });
        const matCrop  = new THREE.MeshStandardMaterial({ color: 0x3A8C3A, roughness: 0.90, metalness: 0.0 });
        const matFence = new THREE.MeshStandardMaterial({ color: 0xB89060, roughness: 0.98, metalness: 0.0 });

        // ── BARN — centered on x=0, z=0 ─────────────────────────────
        // Walls:  2.4 wide, 1.8 tall, 1.8 deep  → y from 0 to 1.8
        const barnW = 2.4, barnH = 1.8, barnD = 1.8;
        const barnWalls = new THREE.Mesh(new THREE.BoxGeometry(barnW, barnH, barnD), matMain);
        barnWalls.position.y = barnH / 2;   // bottom at y=0, top at y=1.8
        farmG.add(barnWalls);

        // Gable triangles — 4-sided pyramid on top of each wall face
        // Use a tetrahedron-like shape: BoxGeom scaled to wedge, or CylinderGeom(0,r,h,4)
        const gableH = 1.0;
        const gableHalfW = barnW / 2;  // pyramid base half-width matches barn width
        // Front gable (positive Z)
        const gblF = new THREE.Mesh(
            new THREE.CylinderGeometry(0, gableHalfW * Math.SQRT2 * 0.5, gableH, 4, 1, false, Math.PI/4),
            matMain
        );
        gblF.position.set(0, barnH + gableH/2, 0);
        gblF.rotation.y = Math.PI/4;  // align flat face toward +Z
        farmG.add(gblF);

        // Roof: two rectangular panels hinged at the ridge (barnH + gableH)
        // Each panel: barnW wide, slopes from ridge down to barn eave
        // Half-depth = barnD/2 = 0.9 units, so panel length = sqrt(0.9² + 0.6²) ≈ 1.08
        const slopeDepth = barnD / 2;   // 0.9
        const slopeRise  = gableH * 0.9; // 0.9
        const panelLen   = Math.sqrt(slopeDepth*slopeDepth + slopeRise*slopeRise); // ~1.27
        const roofAngle  = Math.atan2(slopeRise, slopeDepth); // ~45°
        const ridgeY     = barnH + gableH * 0.88;  // ~2.68
        const eaveZ      = barnD / 2;               // front/back edge

        // Front slope (tilts toward +Z)
        const roofFront = new THREE.Mesh(new THREE.BoxGeometry(barnW + 0.1, 0.1, panelLen + 0.05), matRoof);
        roofFront.position.set(0, ridgeY - slopeRise/2, eaveZ/2);
        roofFront.rotation.x = roofAngle;
        farmG.add(roofFront);

        // Back slope (tilts toward -Z)
        const roofBack = new THREE.Mesh(new THREE.BoxGeometry(barnW + 0.1, 0.1, panelLen + 0.05), matRoof);
        roofBack.position.set(0, ridgeY - slopeRise/2, -eaveZ/2);
        roofBack.rotation.x = -roofAngle;
        farmG.add(roofBack);

        // Ridge beam along the top
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(barnW + 0.2, 0.12, 0.12), matWood);
        ridge.position.set(0, ridgeY + 0.02, 0);
        farmG.add(ridge);

        // Barn door — centered on front face (z = +barnD/2 = +0.9)
        const doorH = 1.2, doorW = 0.85;
        const frontZ = barnD / 2 + 0.01;
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.07), matWood);
        doorFrame.position.set(0, doorH/2, frontZ);
        farmG.add(doorFrame);
        // X-brace on door
        const brace1 = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.9, 0.07, 0.08), matDark);
        brace1.position.set(0, doorH/2, frontZ + 0.04); brace1.rotation.z = 0.55; farmG.add(brace1);
        const brace2 = brace1.clone(); brace2.rotation.z = -0.55; farmG.add(brace2);

        // Two front windows above the door
        [-0.8, 0.8].forEach(xOff => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.08), matDark);
            win.position.set(xOff, 1.35, frontZ);
            farmG.add(win);
        });

        // ── SILO — right side of barn, shifted backward so it sits fully on grid ──
        // matMain so skin tints the silo body color too
        const siloX = barnW / 2 + 0.35;  // close to barn but edge stays within the 3.5u base platform
        const siloZ = -0.7;               // pushed back so it doesn't overhang the front
        const siloR = 0.55, siloH = 2.8;
        const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(siloR, siloR + 0.05, siloH, 14), matMain);
        siloBody.position.set(siloX, siloH / 2, siloZ);
        farmG.add(siloBody);

        // Silo dome roof
        const siloDome = new THREE.Mesh(
            new THREE.SphereGeometry(siloR + 0.02, 12, 8, 0, Math.PI*2, 0, Math.PI*0.5),
            matRoof
        );
        siloDome.position.set(siloX, siloH - 0.05, siloZ);
        farmG.add(siloDome);

        // Silo horizontal bands — use matMain so they pick up skin color
        for (let i = 0; i < 6; i++) {
            const band = new THREE.Mesh(new THREE.TorusGeometry(siloR + 0.05, 0.04, 6, 16), matMain);
            band.rotation.x = Math.PI/2;
            band.position.set(siloX, 0.25 + i * 0.46, siloZ);
            farmG.add(band);
        }
        // Silo accent rings (contrast detail) — dark separators between bands
        for (let i = 0; i < 3; i++) {
            const sep = new THREE.Mesh(new THREE.TorusGeometry(siloR + 0.06, 0.025, 6, 16), matDark);
            sep.rotation.x = Math.PI/2;
            sep.position.set(siloX, 0.55 + i * 0.88, siloZ);
            farmG.add(sep);
        }

        // ── HAY BALES — left side ────────────────────────────────────
        // Round bales lying on their side
        const makeBale = (x, z) => {
            const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 10), matHay);
            bale.rotation.z = Math.PI/2;  // on its side
            bale.position.set(x, 0.28, z);
            farmG.add(bale);
            // wrap string ring
            const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.02, 4, 12), matWood);
            wrap.position.set(x, 0.28, z);
            farmG.add(wrap);
        };
        makeBale(-barnW/2 - 0.65, 0.4);
        makeBale(-barnW/2 - 0.65, -0.15);
        // Square bale stacked on top
        const sqBale = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 0.32), matHay);
        sqBale.position.set(-barnW/2 - 0.65, 0.72, 0.4);
        farmG.add(sqBale);

        // ── FENCE — 3-sided enclosure in front of barn ───────────────
        // Fence posts use matMain so skin color shows visibly
        const postPositions = [
            [-1.7, -0.9], [-1.7, 0.05], [-1.7, 1.0],
            [-0.85, -0.9], [0.1, -0.9], [1.0, -0.9]
        ];
        postPositions.forEach(([x, z]) => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), matMain);
            post.position.set(x, 0.35, z);
            farmG.add(post);
        });
        // Left fence rails (matMain for skin color)
        const fL1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.0), matMain);
        fL1.position.set(-1.7, 0.48, 0.05); farmG.add(fL1);
        const fL2 = fL1.clone(); fL2.position.set(-1.7, 0.28, 0.05); farmG.add(fL2);
        // Back fence rails (matMain)
        const fB1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.06), matMain);
        fB1.position.set(-0.05, 0.48, -0.9); farmG.add(fB1);
        const fB2 = fB1.clone(); fB2.position.set(-0.05, 0.28, -0.9); farmG.add(fB2);

        // ── CROPS — small rows in the fenced area ────────────────────
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const plant = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 4), matCrop);
                plant.position.set(-1.3 + col*0.28, 0.13, -0.65 + row*0.28);
                farmG.add(plant);
            }
        }

        // ── FRONT YARD — visible details in front of barn (z > barnD/2) ─────
        // Pumpkins clustered front-left (always visible from camera)
        const matPumpkin = new THREE.MeshStandardMaterial({ color: 0xE07020, roughness: 0.88 });
        [[[-1.4, 0, 1.35], 0.22], [[-1.65, 0, 1.6], 0.18], [[-1.15, 0, 1.58], 0.16]].forEach(([pos, r]) => {
            const pk = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), matPumpkin);
            pk.position.set(...pos); pk.position.y = r * 0.7; farmG.add(pk);
            // Stem
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 4), matWood);
            stem.position.set(pos[0], r * 1.45, pos[2]); farmG.add(stem);
        });

        // ── LEVEL UPGRADES ───────────────────────────────────────────
        if (level >= 2) {
            // Weather vane on barn ridge peak
            const vPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6), matDetail);
            vPost.position.set(0, ridgeY + 0.36, 0); farmG.add(vPost);
            const vArrow = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.06), matGold);
            vArrow.position.set(0, ridgeY + 0.72, 0); farmG.add(vArrow);
            const vTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.17, 4), matGold);
            vTip.rotation.z = -Math.PI/2; vTip.position.set(0.27, ridgeY + 0.72, 0); farmG.add(vTip);
            // Water trough at lvl 2 (moved to front so it's visible)
            const trough = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.28), matWood);
            trough.position.set(0.6, 0.1, 1.25); farmG.add(trough);
            const water = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.15), matEnergy);
            water.position.set(0.6, 0.22, 1.25); farmG.add(water);
        }
        if (level >= 3) {
            // Scarecrow front-center — made of matMain so it shows skin color
            const scBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.14), matMain);
            scBody.position.set(0.2, 0.72, 1.5); farmG.add(scBody);
            const scHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), matHay);
            scHead.position.set(0.2, 1.12, 1.5); farmG.add(scHead);
            const scArm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.1), matMain);
            scArm.position.set(0.2, 0.88, 1.5); farmG.add(scArm);
            const scPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 4), matWood);
            scPole.position.set(0.2, 0.6, 1.5); farmG.add(scPole);
        }
        if (level >= 4) {
            // Solar panels on front barn roof slope
            for (let i = 0; i < 3; i++) {
                const panel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.42), matMain);
                panel.position.set(-0.8 + i*0.6, ridgeY - 0.38, eaveZ/2 + 0.1);
                panel.rotation.x = roofAngle;
                farmG.add(panel);
            }
        }

        if (branch === 'A') { // Bank — gold vault door on silo
            const vault = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 16), matGold);
            vault.rotation.x = Math.PI/2;
            vault.position.set(siloX, siloH*0.5, siloZ + siloR + 0.1);
            farmG.add(vault);
            for (let i = 0; i < 6; i++) {
                const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), matDark);
                spoke.rotation.z = (i/6)*Math.PI;
                spoke.position.set(siloX, siloH*0.5, siloZ + siloR + 0.18);
                farmG.add(spoke);
            }
                } else if (branch === 'B') { // Factory \u2014 smokestack pair emerging from roof
            // Smokestacks start below ridgeY so they look like they come THROUGH the roof
            const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 10), matMain);
            s1.position.set(-0.5, ridgeY - 0.6, 0.2); farmG.add(s1);
            const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 1.8, 10), matDark);
            s2.position.set(0.5, ridgeY - 0.55, -0.2); farmG.add(s2);
            // Top rings / caps on each stack
            [s1, s2].forEach((st, i) => {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23 - i*0.04, 0.07, 6, 12), matDark);
                ring.rotation.x = Math.PI/2;
                ring.position.copy(st.position); ring.position.y += (i===0 ? 1.12 : 0.92);
                farmG.add(ring);
                // Smoke puff cap (dark disc)
                const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28 - i*0.04, 0.22 - i*0.04, 0.08, 10), matDark);
                cap.position.copy(st.position); cap.position.y += (i===0 ? 1.18 : 0.98);
                farmG.add(cap);
            });
        }

        // ── NEON SKIN: add glowing edge strips along barn eaves & silo ───────
        if (isNeonSkin && matNeonStrip) {
            // Barn eave glow strips (all 4 eave edges)
            const eaveOff = barnH + 0.05;
            [[barnW/2+0.06, eaveOff, 0, 0, 0, barnD+0.1],
             [-barnW/2-0.06, eaveOff, 0, 0, 0, barnD+0.1]].forEach(([x,y,z,rx,ry,len]) => {
                const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len), matNeonStrip);
                strip.position.set(x*farmG.scale.x, y*farmG.scale.y, z*farmG.scale.z-0.5);
                head.add(strip);
            });
            // Horizontal mid-band glow on barn body
            const midBand = new THREE.Mesh(new THREE.BoxGeometry(barnW*farmG.scale.x+0.12, 0.05, 0.05), matNeonStrip);
            midBand.position.set(0, barnH*0.5*farmG.scale.y, (barnD/2+0.05)*farmG.scale.z-0.5);
            head.add(midBand);
            // Silo top ring glow
            const siloRingGlow = new THREE.Mesh(new THREE.TorusGeometry((0.55+0.06)*farmG.scale.x, 0.04, 6, 16), matNeonStrip);
            siloRingGlow.rotation.x = Math.PI/2;
            siloRingGlow.position.set((barnW/2+0.35)*farmG.scale.x, 2.8*farmG.scale.y, (-0.7)*farmG.scale.z-0.5);
            head.add(siloRingGlow);
        }



    } // end else (default farm)
    } // end farm type


    // ── POST-BUILD: Apply camo pattern if epic camo skin ─────────────────────
    if (_camoMode && _camoPalette) {
        _applyCamo(root, _camoPalette);
    }


    // ── POST-BUILD: Apply epic skin accent to matDetail parts ─────────────────
    // For epic_recolor skins: the main matMain already carries the skin color.
    // We additionally tint any grey/silver detail meshes with the accent color
    // so the whole tower looks consistently themed.
    if (_activeSkin && _activeSkin.skinType === 'epic_recolor' && _activeSkin.accentColor) {
        const accentHex = _activeSkin.accentColor;
        const epicDetailMat = new THREE.MeshStandardMaterial({
            color: accentHex, roughness: 0.15, metalness: 0.9,
            emissive: accentHex, emissiveIntensity: 0.5,
        });
        // Apply to detail-grey colored meshes (approximate: color brightness ~0x95a5a6)
        root.traverse(c => {
            if (c.isMesh && c.material && !c.material.map) {
                const col = c.material.color;
                if (col) {
                    const r = col.r, g = col.g, b = col.b;
                    // Target near-grey detail meshes (R≈G≈B, not pitch black, not skinned)
                    const isGrey = Math.abs(r-g) < 0.08 && Math.abs(g-b) < 0.08 && r > 0.35 && r < 0.9;
                    if (isGrey) c.material = epicDetailMat;
                }
            }
        });
    }


    // --- 5. FINALIZE ---
    root.traverse(c => { 
        if(c.isMesh) { 
            c.castShadow = shadowsEnabled; 
            c.receiveShadow = shadowsEnabled; 
        } 
    });
    return root;
}
	function createEnemyModel(type, color, size) {
            size *= 2.5; 
            
            const group = new THREE.Group();
            const visuals = new THREE.Group();
            visuals.rotation.y = Math.PI; // Face Forward
            
            // --- 1. CLASSIFICATION SYSTEM ---
            const isMoab    = ['siege walker','dreadnought','the obliterator','void stalker','entropy monolith'].includes(type);
            const isSpecial = ['healer','disruptor','summoner'].includes(type);
            const isTuff    = ['tank','omnicrawler','shadow interceptor'].includes(type);
            const isFast    = ['pink','yellow','white','purple','zebra','rainbow'].includes(type);
            const isStarter = ['red','blue','green'].includes(type);

            // --- 2. ALTITUDE LOGIC ---
            let lift = size * 0.5;
            let hpY = size * 1.0;
            
            if (isMoab) { 
                lift = size * 1.5; 
                hpY = size * 1.2; 
            }
            else if (type === 'omnicrawler') {
                lift = size * 0.6; // FIX: Raised so wheels touch ground (Radius is 0.55)
                hpY = size * 1.4;
            }
            else if (['tank','summoner'].includes(type)) { 
                lift = size * 0.2; 
                hpY = size * 1.4; 
            } 
            else if (isFast || type === 'shadow interceptor') { 
                lift = size * 0.8; 
            }

            visuals.position.y = lift; 
            group.add(visuals);
            group.userData.hpOffset = lift + hpY + 0.5;
            
            // FIX: Siege Walker (MOAB) walked backwards because the model faces Z+ 
            // but the container was rotated 180. We reset rotation for him.
            if (type === 'moab') {
                visuals.rotation.y = 0; 
            }

            // --- 3. MATERIALS LIBRARY ---
            const matBody   = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.5 });
            const matDark   = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });
            const matBlack  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.2 });
            const matChrome = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.9 });
            const matGlow   = new THREE.MeshBasicMaterial({ color: color }); 
            const matCyan   = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Engines
            const matRed    = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Sensors

            // =========================================================
            // GROUP 1: STARTER (The Sentry Drones)
            // =========================================================
            if (isStarter) {
                // Core Sphere (Detailed)
                const core = new THREE.Mesh(new THREE.IcosahedronGeometry(size*0.4, 1), matBody);
                visuals.add(core);

                // Equatorial Ring (Mechanical)
                const ring = new THREE.Mesh(new THREE.TorusGeometry(size*0.5, 0.05, 6, 16), matDark);
                if(type === 'blue') ring.rotation.x = 0.5; // Blue tilt
                visuals.add(ring);

                // Sensor Eye (Cyclops)
                const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2), matBlack);
                eye.rotation.x = Math.PI/2; eye.position.z = -size*0.35;
                visuals.add(eye);
                const lens = new THREE.Mesh(new THREE.SphereGeometry(0.08), matCyan);
                lens.position.set(0, 0, -size*0.45);
                visuals.add(lens);

                // Stabilizer Fins (3 Fins)
                for(let i=0; i<3; i++) {
                    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, size*0.4, size*0.4), matDark);
                    const angle = (i / 3) * Math.PI * 2;
                    fin.position.set(Math.cos(angle)*size*0.4, Math.sin(angle)*size*0.4, size*0.2);
                    fin.rotation.z = angle;
                    visuals.add(fin);
                }
            }

            // =========================================================
            // GROUP 2: FAST (The Interceptor Jets)
            // =========================================================
            else if (isFast) {
                // --- SPECIAL: ZEBRA (Physical Racing Stripes) ---
                if (type === 'zebra') {
                    // Body: 5 Interlocking Segments
                    for(let i=0; i<5; i++) {
                        const isWhite = i%2===0;
                        const rad = size * (0.35 - i*0.05);
                        const seg = new THREE.Mesh(
                            new THREE.CylinderGeometry(rad, rad*0.8, size*0.4, 16),
                            isWhite ? new THREE.MeshStandardMaterial({color:0xffffff}) : matBlack
                        );
                        seg.rotation.x = -Math.PI/2;
                        seg.position.z = size * (0.4 - i*0.4);
                        visuals.add(seg);
                    }
                    // Wings
                    const w = new THREE.Mesh(new THREE.BoxGeometry(size*1.6, 0.05, size*0.4), new THREE.MeshStandardMaterial({color:0xffffff}));
                    visuals.add(w);
                }
                
                // --- SPECIAL: RAINBOW (Celestial Gyro) ---
                else if (type === 'rainbow') {
                    const core = new THREE.Mesh(new THREE.SphereGeometry(size*0.3, 16, 16), matChrome);
                    visuals.add(core);
                    const colors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3];
                    colors.forEach((c, i) => {
                        const r = new THREE.Mesh(new THREE.TorusGeometry(size*(0.4+i*0.1), 0.02, 4, 24), new THREE.MeshBasicMaterial({color:c}));
                        r.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
                        visuals.add(r);
                    });
                }

                // --- STANDARD JETS (Pink, Yellow, White, Purple) ---
                else {
                    // Needle Fuselage
                    const hull = new THREE.Mesh(new THREE.ConeGeometry(size*0.3, size*1.8, 8), matBody);
                    hull.rotation.x = -Math.PI/2; visuals.add(hull);
                    
                    // Cockpit Canopy
                    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), matBlack);
                    canopy.position.set(0, size*0.2, -size*0.2);
                    visuals.add(canopy);
                    
                    // Swept Wings
                    const wingShape = new THREE.Shape();
                    wingShape.moveTo(0,0); wingShape.lineTo(1.0, 0.6); wingShape.lineTo(1.0, 0.3); wingShape.lineTo(0.2, -0.2);
                    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {depth:0.05, bevelEnabled:false});
                    const wL = new THREE.Mesh(wingGeo, matBody); wL.rotation.x = -Math.PI/2; wL.position.set(0.1, 0, 0);
                    const wR = wL.clone(); wR.scale.x = -1; wR.position.set(-0.1, 0, 0);
                    visuals.add(wL, wR);
                    
                    // Afterburner
                    const burn = new THREE.Mesh(new THREE.ConeGeometry(size*0.2, size*0.5, 8, 1, true), matCyan);
                    burn.rotation.x = Math.PI/2; burn.position.z = size*1.0;
                    visuals.add(burn);
                }
            }

            // =========================================================
            // GROUP 3: TUFF (Heavy Panzers)
            // =========================================================
            else if (isTuff) {
                // --- BLACK: SHADOW INTERCEPTOR (Redesigned) ---
                if (type === 'shadow interceptor') {
                    // 1. Central Fuselage (Long & Sleek)
                    const body = new THREE.Mesh(new THREE.BoxGeometry(size*0.3, size*0.15, size*1.4), matBlack);
                    visuals.add(body);

                    // 2. Cockpit / Sensor Dome
                    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(size*0.2, size*0.1, size*0.5), matDark);
                    cockpit.position.set(0, size*0.1, -size*0.3);
                    visuals.add(cockpit);

                    // 3. Swept-Back Delta Wings
                    for(let i=-1; i<=1; i+=2) {
                        // Main Wing Slab
                        const wing = new THREE.Mesh(new THREE.BoxGeometry(size*0.9, 0.05, size*0.7), matBlack);
                        // Position: Out to the side
                        wing.position.set(i * size*0.45, 0, size*0.1);
                        // Rotation: Sweep back 35 degrees
                        wing.rotation.y = -i * 0.6; 
                        visuals.add(wing);

                        // Vertical Stabilizers (Fins)
                        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, size*0.5, size*0.4), matBlack);
                        fin.position.set(i * size*0.3, size*0.25, size*0.4);
                        fin.rotation.z = i * 0.3; // Slight outward tilt
                        // Shear the fin to look fast (rotation x)
                        fin.rotation.x = -0.4;
                        visuals.add(fin);
                        
                        // Engine Glow (Rear Vents)
                        const engine = new THREE.Mesh(new THREE.BoxGeometry(size*0.15, size*0.05, 0.1), matRed);
                        engine.position.set(i * size*0.3, 0, size*0.6);
                        visuals.add(engine);
                    }
                    
                    // 4. Front Red "Eye" (Scanner)
                    const eye = new THREE.Mesh(new THREE.BoxGeometry(size*0.15, 0.05, 0.2), matRed);
                    eye.position.set(0, 0, -size*0.7);
                    visuals.add(eye);
                }
                
                // --- LEAD: ARMORED TANK (Unchanged, kept for safety) ---
                else if (type === 'tank') {
                    const hull = new THREE.Mesh(new THREE.BoxGeometry(size*1.2, size*0.6, size*1.5), new THREE.MeshStandardMaterial({color:0x555555, metalness:1.0}));
                    visuals.add(hull);
                    const turret = new THREE.Mesh(new THREE.CylinderGeometry(size*0.4, size*0.5, size*0.4, 8), matDark);
                    turret.position.y = size*0.5; visuals.add(turret);
                    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, size*1.0), matBlack);
                    barrel.rotation.x = -Math.PI/2; barrel.position.set(0, size*0.5, -size*0.6);
                    visuals.add(barrel);
                    const tGeo = new THREE.BoxGeometry(size*0.3, size*0.4, size*1.4);
                    const tL = new THREE.Mesh(tGeo, matBlack); tL.position.set(size*0.7, -size*0.1, 0);
                    const tR = tL.clone(); tR.position.set(-size*0.7, -size*0.1, 0);
                    visuals.add(tL, tR);
                }

                // --- CERAMIC: OMNI-CRAWLER (Rolling Fortress) ---
                else if (type === 'omnicrawler') {
                    const matTerra = new THREE.MeshStandardMaterial({color:0xd35400, roughness:0.5, metalness:0.2}); 
                    
                    // Central Armored Core
                    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(size*0.5), matTerra);
                    visuals.add(core);

                    // Massive Side Wheels (The "Steamroller" look)
                    const wheelGeo = new THREE.CylinderGeometry(size*0.55, size*0.55, size*0.3, 16);
                    wheelGeo.rotateZ(Math.PI/2); // Flip sideways
                    
                    const wL = new THREE.Mesh(wheelGeo, matDark);
                    wL.position.x = size*0.5;
                    visuals.add(wL);
                    
                    const wR = new THREE.Mesh(wheelGeo, matDark);
                    wR.position.x = -size*0.5;
                    visuals.add(wR);

                    // Reinforced Wheel Hubcaps
                    const hubL = new THREE.Mesh(new THREE.CylinderGeometry(size*0.2, size*0.3, 0.1, 6), matTerra);
                    hubL.rotation.z = -Math.PI/2; hubL.position.x = size*0.66;
                    visuals.add(hubL);
                    
                    const hubR = hubL.clone();
                    hubR.rotation.z = Math.PI/2; hubR.position.x = -size*0.66;
                    visuals.add(hubR);

                    // Front Sensor Array (The "Head")
                    const head = new THREE.Mesh(new THREE.BoxGeometry(size*0.5, size*0.4, size*0.5), matTerra);
                    head.position.set(0, size*0.3, -size*0.4);
                    visuals.add(head);
                    
                    const eye = new THREE.Mesh(new THREE.BoxGeometry(size*0.3, 0.1, 0.1), new THREE.MeshBasicMaterial({color:0x00ff00}));
                    eye.position.set(0, size*0.3, -size*0.66);
                    visuals.add(eye);
                }
            }

            // =========================================================
            // GROUP 4: MOAB (The 5 Apocalyptic Riders)
            // =========================================================
            else if (isMoab) {
                
                // 1. MOAB: SIEGE WALKER (Heavy Mech)
                if (type === 'siege walker') {
                    // Main Torso (Hunched)
                    const torso = new THREE.Mesh(new THREE.BoxGeometry(size*0.8, size*0.6, size*0.7), matDark);
                    torso.position.y = size*0.4; visuals.add(torso);
                    
                    // Cockpit (Glowing Slit)
                    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(size*0.4, size*0.15, size*0.1), matRed);
                    cockpit.position.set(0, size*0.5, size*0.36); visuals.add(cockpit);
                    
                    // Heavy Legs
                    const legGeo = new THREE.BoxGeometry(size*0.3, size*0.9, size*0.4);
                    const legL = new THREE.Mesh(legGeo, matBody); legL.position.set(size*0.35, -size*0.1, 0); visuals.add(legL);
                    const legR = legL.clone(); legR.position.set(-size*0.35, -size*0.1, 0); visuals.add(legR);
                    
                    // Shoulder Cannons
                    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(size*0.1, size*0.1, size*0.8), matBlack);
                    cannon.rotation.x = Math.PI/2; cannon.position.set(size*0.5, size*0.7, 0); visuals.add(cannon);
                    const cannon2 = cannon.clone(); cannon2.position.set(-size*0.5, size*0.7, 0); visuals.add(cannon2);
                }
                
                // 2. BFB: DREADNOUGHT (Floating Fortress)
                else if (type === 'dreadnought') {
                    // Main Hull (Elongated Hexagon)
                    const hull = new THREE.Mesh(new THREE.CylinderGeometry(size*0.8, size*1.0, size*0.3, 6), matBlack);
                    visuals.add(hull);
                    // Bridge
                    const bridge = new THREE.Mesh(new THREE.BoxGeometry(size*0.4, size*0.3, size*0.6), matDark);
                    bridge.position.y = size*0.25; visuals.add(bridge);
                    // Engine Pods
                    const podGeo = new THREE.CylinderGeometry(size*0.3, size*0.2, size*1.2, 8); podGeo.rotateX(Math.PI/2);
                    const podL = new THREE.Mesh(podGeo, matBody); podL.position.x = size*0.9; visuals.add(podL);
                    const podR = podL.clone(); podR.position.x = -size*0.9; visuals.add(podR);
                    // Exhausts
                    const thrust = new THREE.Mesh(new THREE.SphereGeometry(size*0.15), matRed);
                    thrust.position.set(size*0.9, 0, size*0.6); visuals.add(thrust);
                    const thrust2 = thrust.clone(); thrust2.position.set(-size*0.9, 0, size*0.6); visuals.add(thrust2);
                }
                
                // 3. ZOMG: THE OBLITERATOR (Geometric God)
                else if (type === 'the obliterator') {
                    // The Core (Burning Sun)
                    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(size*0.6, 1), new THREE.MeshBasicMaterial({color:0x00ff00}));
                    visuals.add(core);
                    // Inner Ring
                    const r1 = new THREE.Mesh(new THREE.TorusGeometry(size*0.9, size*0.1, 4, 6), matBlack);
                    r1.rotation.x = Math.PI/4; visuals.add(r1);
                    // Outer Spikes
                    for(let i=0; i<8; i++) {
                        const spike = new THREE.Mesh(new THREE.ConeGeometry(size*0.1, size*1.5, 4), matDark);
                        const angle = (i/8) * Math.PI * 2;
                        spike.position.set(Math.cos(angle)*size, 0, Math.sin(angle)*size);
                        spike.lookAt(0,0,0); spike.rotateX(-Math.PI/2);
                        visuals.add(spike);
                    }
                    // Vertical Ring
                    const r2 = new THREE.Mesh(new THREE.TorusGeometry(size*1.2, size*0.05, 4, 32), matRed);
                    r2.rotation.y = Math.PI/2; visuals.add(r2);
                }

                // 4. DDT: VOID STALKER (Stealth Shark) - NEW!
                else if (type === 'void stalker') {
                    // Sleek Main Body
                    const body = new THREE.Mesh(new THREE.ConeGeometry(size*0.4, size*2.0, 4), matBlack);
                    body.rotation.x = -Math.PI/2; 
                    body.scale.set(1, 0.5, 1); // Flattened profile
                    visuals.add(body);

                    // Forward Swept Blades (Wings)
                    const wingGeo = new THREE.BoxGeometry(size*0.8, 0.05, size*0.6);
                    const wL = new THREE.Mesh(wingGeo, matDark);
                    wL.position.set(size*0.6, 0, size*0.2); wL.rotation.y = -0.5; visuals.add(wL);
                    const wR = wL.clone();
                    wR.position.set(-size*0.6, 0, size*0.2); wR.rotation.y = 0.5; visuals.add(wR);

                    // Rear Thrusters (Blue Ion Glow for speed)
                    const engine = new THREE.Mesh(new THREE.BoxGeometry(size*0.6, 0.1, 0.2), matCyan);
                    engine.position.set(0, 0, size*1.0);
                    visuals.add(engine);
                }

                // 5. BAD: ENTROPY MONOLITH (Final Boss) - NEW!
                else if (type === 'entropy monolith') {
                    // The Monolith (Giant Floating Obelisk)
                    const tower = new THREE.Mesh(new THREE.CylinderGeometry(size*0.6, size*0.9, size*2.5, 4), matBody);
                    visuals.add(tower);

                    // Floating Shield Generators (4 Cubes orbiting)
                    for(let i=0; i<4; i++) {
                        const shield = new THREE.Mesh(new THREE.BoxGeometry(size*0.5, size*0.5, size*0.5), matDark);
                        const angle = (i/4) * Math.PI * 2;
                        shield.position.set(Math.cos(angle)*size*1.5, 0, Math.sin(angle)*size*1.5);
                        // Add glow core to shields
                        const core = new THREE.Mesh(new THREE.BoxGeometry(size*0.2, size*0.2, size*0.2), new THREE.MeshBasicMaterial({color:0x8e44ad}));
                        shield.add(core);
                        visuals.add(shield);
                    }

                    // The Eye of Doom (Top)
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(size*0.4), new THREE.MeshBasicMaterial({color:0xff00ff})); // Magenta Eye
                    eye.position.y = size*1.0;
                    visuals.add(eye);
                    
                    // Dark Halo
                    const halo = new THREE.Mesh(new THREE.TorusGeometry(size*1.2, 0.1, 4, 32), matBlack);
                    halo.rotation.x = Math.PI/2; halo.position.y = size*1.0;
                    visuals.add(halo);
                }
            }

            // =========================================================
            // GROUP 5: SPECIAL (Redesigned: High-Tech Cyber Units)
            // =========================================================
            else if (isSpecial) {
                
                // --- HEALER: SERAPHIM DRONE (Floating Medic) ---
                if (type === 'healer') {
                    // Main Body (Clean White Capsule)
                    const body = new THREE.Mesh(new THREE.CylinderGeometry(size*0.4, size*0.4, size*1.2, 16, 1), matChrome);
                    body.rotation.x = Math.PI/2;
                    visuals.add(body);
                    
                    // Medical Cross (Glowing Green on top)
                    const vBar = new THREE.Mesh(new THREE.BoxGeometry(size*0.3, size*0.8, size*0.1), new THREE.MeshBasicMaterial({color:0x00ff00}));
                    vBar.position.y = size*0.35;
                    visuals.add(vBar);
                    const hBar = new THREE.Mesh(new THREE.BoxGeometry(size*0.8, size*0.3, size*0.1), new THREE.MeshBasicMaterial({color:0x00ff00}));
                    hBar.position.y = size*0.35;
                    visuals.add(hBar);

                    // Holographic Halo (Floating Ring)
                    const halo = new THREE.Mesh(new THREE.TorusGeometry(size*0.8, 0.05, 4, 32), new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:0.6}));
                    halo.rotation.x = Math.PI/2;
                    visuals.add(halo); // You can rotate this in animate() if you want extra flair
                    
                    // Engine Thrusters (4 small vents)
                    for(let i=0; i<4; i++) {
                        const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 8), matDark);
                        thruster.rotation.x = -Math.PI/2;
                        const a = (i/4)*Math.PI*2 + Math.PI/4;
                        thruster.position.set(Math.cos(a)*size*0.5, 0, Math.sin(a)*size*0.5);
                        visuals.add(thruster);
                    }
                }
                
                // --- DISRUPTOR: TESLA STAR (Chaotic Jammer) ---
                else if (type === 'disruptor') {
                    // Core: Unstable Icosahedron
                    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(size*0.4, 0), matGlow);
                    visuals.add(core);
                    
                    // Spikes: Long jagged antennas
                    for(let i=0; i<6; i++) {
                        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, size*1.8, 4), matDark);
                        // Random rotations for chaotic look
                        spike.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
                        visuals.add(spike);
                    }
                    
                    // Gyro Rings (The "Atom" look)
                    const r1 = new THREE.Mesh(new THREE.TorusGeometry(size*0.9, 0.03, 4, 32), matCyan);
                    r1.rotation.x = 1.0;
                    visuals.add(r1);
                    
                    const r2 = new THREE.Mesh(new THREE.TorusGeometry(size*0.7, 0.03, 4, 32), matCyan);
                    r2.rotation.y = 1.0;
                    visuals.add(r2);
                }
                
                // --- SUMMONER: RIFT CARRIER (Mothership) ---
                else if (type === 'summoner') {
                    // Main Engine Block (Rear)
                    const engine = new THREE.Mesh(new THREE.BoxGeometry(size*1.0, size*0.6, size*0.8), matDark);
                    engine.position.z = size*0.8;
                    visuals.add(engine);
                    
                    // V-Shape Hull (Twin Prongs)
                    const lProng = new THREE.Mesh(new THREE.BoxGeometry(size*0.4, size*0.2, size*2.2), matBody);
                    lProng.position.set(-size*0.7, 0, -size*0.2);
                    lProng.rotation.y = 0.15; // Angled inward
                    visuals.add(lProng);
                    
                    const rProng = lProng.clone();
                    rProng.position.set(size*0.7, 0, -size*0.2);
                    rProng.rotation.y = -0.15;
                    visuals.add(rProng);
                    
                    // The Void Portal (Held between prongs)
                    const orb = new THREE.Mesh(new THREE.DodecahedronGeometry(size*0.45), new THREE.MeshBasicMaterial({color:0x8e44ad, wireframe:true}));
                    visuals.add(orb);
                    
                    const innerVoid = new THREE.Mesh(new THREE.SphereGeometry(size*0.25), new THREE.MeshBasicMaterial({color:0x000000}));
                    visuals.add(innerVoid);
                    
                    // Landing Lights
                    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1), matRed);
                    light.position.set(size*0.8, size*0.2, -size*1.2);
                    visuals.add(light);
                    const light2 = light.clone();
                    light2.position.set(-size*0.8, size*0.2, -size*1.2);
                    visuals.add(light2);
                }
            }

            group.traverse(o => { if(o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            return group;
        }

        // --- WAVE LOGIC ---
	function startWave() {
            // If in MP, ask server to start
            if(socket && myRoomId) {
                if(myRole === 'host') {
                    socket.emit('requestWave', myRoomId);
                }
                return;
            }
            
            // Single Player Logic (Keep existing logic)
            runWaveLogic();
        }

        // The actual logic (moved to a new function)

// --- Tower grid, select, upgrade, sell ---
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
            if (!window.gameRunning || window.isPaused) return;
            
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
            if(selectedType === k) {
                deselectAll();
                return;
            }
            selectedType = k; selectedTower = null;
            rangeRing.visible=true; rangeRing.scale.set(TOWERS[k].range, TOWERS[k].range, 1);
            
            // Show dead zone for mortar
            if(TOWERS[k].minRange) {
                deadZoneRing.visible = true;
                deadZoneRing.scale.set(TOWERS[k].minRange, TOWERS[k].minRange, 1);
            } else {
                deadZoneRing.visible = false;
            }
            
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            el.classList.add('selected');
            document.getElementById('inspect-panel').style.display='none';
        }

        function deselectAll() { 
            selectedType=null; 
            selectedTower=null; 
            rangeRing.visible=false;
            deadZoneRing.visible=false; // Hide dead zone too
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            document.getElementById('inspect-panel').style.display='none'; 
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
