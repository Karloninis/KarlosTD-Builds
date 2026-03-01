// ============================================================================
// Enemies.js - Enemy definitions, wave logic, spawning, decorations
// ============================================================================

        function getWaveData(w) {
            // Bosses at checkpoints (unchanged)
            if(w === 20) return [{ type: 'siege walker', count: 1, interval: 2000 }];
            if(w === 30) return [{ type: 'dreadnought', count: 1, interval: 2000 }];
            if(w === 40) return [{ type: 'the obliterator', count: 1, interval: 2000 }];
            if(w === 50) return [{ type: 'void stalker', count: 3, interval: 2000 }];
            if(w === 60) return [{ type: 'entropy monolith', count: 1, interval: 2000 }];
            
            const wavePlan = [];
            
            // Phase 1: Basics (1-10)
            if(w < 3) wavePlan.push({ type: 'red', count: 5+w*3, interval: 600 });
            else if(w < 6) { wavePlan.push({ type: 'red', count: 10, interval: 300 }); wavePlan.push({ type: 'blue', count: w, interval: 800 }); }
            else if(w < 11) { wavePlan.push({ type: 'blue', count: 15, interval: 400 }); wavePlan.push({ type: 'green', count: 5, interval: 1000 }); }
            
            // Phase 2: Introduction of Specials (11-20)
            else if(w < 15) { 
                wavePlan.push({ type: 'green', count: 10, interval: 500 }); 
                if(w>12) wavePlan.push({ type: 'healer', count: 2, interval: 2000 }); // NEW
            }
            else if(w < 20) { 
                wavePlan.push({ type: 'yellow', count: 20, interval: 200 }); 
                wavePlan.push({ type: 'disruptor', count: 3, interval: 1500 }); // NEW
            }
            
            // Phase 3: Combinations (21-30)
            else if(w < 25) { 
                wavePlan.push({ type: 'white', count: 20, interval: 200 }); 
                wavePlan.push({ type: 'summoner', count: 2, interval: 4000 }); // NEW
            }
            else if(w < 30) { 
                wavePlan.push({ type: 'zebra', count: 15, interval: 300 }); 
                wavePlan.push({ type: 'healer', count: 5, interval: 1000 }); 
                wavePlan.push({ type: 'disruptor', count: 5, interval: 1000 });
            }
            
            // Phase 4: Chaos (31-40)
            else if(w < 35) { wavePlan.push({ type: 'rainbow', count: 10, interval: 500 }); wavePlan.push({ type: 'omnicrawler', count: 2, interval: 2000 }); }
            else if(w < 40) { 
                wavePlan.push({ type: 'omnicrawler', count: 10, interval: 1200 }); 
                wavePlan.push({ type: 'summoner', count: 4, interval: 3000 }); // Army builders
            }
            
            // Phase 5: Hardcore (41-60)
            else if(w < 50) { 
                wavePlan.push({ type: 'bfb', count: 1, interval: 1000 }); 
                wavePlan.push({ type: 'healer', count: 10, interval: 500 }); // Medic train
            }
            else { 
                wavePlan.push({ type: 'zomg', count: 1, interval: 5000 }); 
                wavePlan.push({ type: 'disruptor', count: 10, interval: 400 }); // Tower shutdown
            }

            return wavePlan;
        }

	// --- MAP DECORATIONS ---
        function createDecorations(mapIndex) {
            const isFrozen = (mapIndex === 1); 
            const isVolcano = (mapIndex === 2);
	    const isKitty = (mapIndex === 3);
	    const isVoid = (mapIndex === 4); 
            const isCrystalCave = (mapIndex === 5);
            const isNeonCity = (mapIndex === 6);
            const isToxicSwamp = (mapIndex === 7);
            const isSpaceStation = (mapIndex === 8);
	    const isFarm = (mapIndex === 9);
            const isJungle = (mapIndex === 10);
            const isMushroom = (mapIndex === 11);
	    
            const propCount = 70;

            // === MATERIAL LIBRARY ===
            const matPine = new THREE.MeshStandardMaterial({ color: 0x1e8449, roughness: 0.8 });
            const matWood = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1.0 });
            const matSnow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const matIce = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.7, metalness: 0.5 });
            const matSand = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 1.0 });
            const matCactus = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.9 });
            const matBasalt = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.3 });
            const matMagma = new THREE.MeshBasicMaterial({ color: 0xff4500 });
	    const matPink = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.5 });
            const matPastel = new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.9 });
            const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
            const matRedBow = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.4 });
            const matGreen = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.8 });
            const matYellow = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
            // Mushroom materials
            const matMushroomRed = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.6 });
            const matMushroomBlue = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.6 });
            const matMushroomPurple = new THREE.MeshStandardMaterial({ color: 0x9966ff, roughness: 0.6 });
            const matMushroomSpots = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
            const matMushroomStem = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.8 });
            const matMushroomGlow = new THREE.MeshStandardMaterial({ 
                color: 0x88ffaa, 
                emissive: 0x44ff88, 
                emissiveIntensity: 0.5,
                roughness: 0.3 
            });
            const matMoss = new THREE.MeshStandardMaterial({ color: 0x4a7c4a, roughness: 1.0 });
	    const matHay = new THREE.MeshStandardMaterial({ color: 0xeaddca, roughness: 1.0 });
            const matOakLeaf = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
            const matPumpkin = new THREE.MeshStandardMaterial({ color: 0xff7518, roughness: 0.6 });
            const matCorn = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.9 });
            const matFence = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 1.0 });
            // Jungle materials
            const matJungleLeaf = new THREE.MeshStandardMaterial({ color: 0x1a5c1a, roughness: 0.9 });
            const matVine = new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 1.0 });
            const matStone = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.8 });
            const matOrchid = new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.3 });
            const matBamboo = new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.7 });

            for(let i = 0; i < propCount; i++) {
                const x = (seededRandom() - 0.5) * 220;
                const z = (seededRandom() - 0.5) * 160;
                const pos = new THREE.Vector3(x, 0, z);

                // Road Check
                let tooClose = false;
                for(let j=0; j<currentWaypoints.length-1; j++) {
                    const a = currentWaypoints[j];
                    const b = currentWaypoints[j+1];
                    const lineLen = a.distanceToSquared(b);
                    if (lineLen === 0) continue;
                    const t = Math.max(0, Math.min(1, ((pos.x - a.x) * (b.x - a.x) + (pos.z - a.z) * (b.z - a.z)) / lineLen));
                    const proj = new THREE.Vector3().copy(a).add(new THREE.Vector3().subVectors(b, a).multiplyScalar(t));
                    if (pos.distanceTo(proj) < 10) { tooClose = true; break; }
                }
                if(tooClose) continue; 

                const group = new THREE.Group();
                group.position.copy(pos);
                const s = 0.8 + seededRandom() * 0.6;
                group.scale.set(s, s, s);
                group.rotation.y = seededRandom() * Math.PI * 2;

                // ═══════════════════════════════════════════
                // 0. CANYON CROSSING - Desert/Rocky Theme (DEFAULT)
                // ═══════════════════════════════════════════
                if (mapIndex === 0) {
                    const rng = seededRandom();
                    
                    if (rng > 0.7) {
                        // SAGUARO CACTUS - Tall with arms
                        const main = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 8), matCactus);
                        main.position.y = 2.5;
                        
                        // Left arm
                        const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2, 8), matCactus);
                        arm1.position.set(-1, 3, 0);
                        arm1.rotation.z = Math.PI/2;
                        const arm1up = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8), matCactus);
                        arm1up.position.set(-2, 3.75, 0);
                        
                        // Right arm
                        const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8), matCactus);
                        arm2.position.set(1, 2.5, 0);
                        arm2.rotation.z = -Math.PI/2;
                        const arm2up = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2, 8), matCactus);
                        arm2up.position.set(1.75, 3.5, 0);
                        
                        // Flowers on top
                        const flower = new THREE.Mesh(
                            new THREE.ConeGeometry(0.3, 0.4, 8),
                            new THREE.MeshStandardMaterial({color: 0xff69b4, roughness: 0.5})
                        );
                        flower.position.y = 5.2;
                        
                        group.add(main, arm1, arm1up, arm2, arm2up, flower);
                    }
                    else if (rng > 0.5) {
                        // DESERT ROCK FORMATION - Layered sandstone
                        const layers = 4 + Math.floor(Math.random()*3);
                        for(let k=0; k<layers; k++) {
                            const width = 2.5 - k*0.3;
                            const layer = new THREE.Mesh(
                                new THREE.BoxGeometry(width, 0.8, width),
                                new THREE.MeshStandardMaterial({
                                    color: 0xd2691e - k*0x101010,
                                    roughness: 1.0
                                })
                            );
                            layer.position.y = k*0.8 + 0.4;
                            layer.rotation.y = k * 0.3;
                            group.add(layer);
                        }
                    }
                    else if (rng > 0.3) {
                        // TUMBLEWEED - Desert plant ball
                        const tumbleweed = new THREE.Mesh(
                            new THREE.IcosahedronGeometry(1, 1),
                            new THREE.MeshStandardMaterial({
                                color: 0x8b7355,
                                wireframe: true
                            })
                        );
                        tumbleweed.position.y = 1;
                        group.add(tumbleweed);
                    }
                    else if (rng > 0.15) {
                        // BARREL CACTUS - Round spiky plant
                        const body = new THREE.Mesh(
                            new THREE.SphereGeometry(1, 12, 8),
                            matCactus
                        );
                        body.scale.y = 0.7;
                        body.position.y = 0.7;
                        
                        // Spines (vertical ridges)
                        for(let k=0; k<12; k++) {
                            const angle = (k/12) * Math.PI * 2;
                            const spine = new THREE.Mesh(
                                new THREE.BoxGeometry(0.05, 1.4, 0.05),
                                new THREE.MeshStandardMaterial({color: 0xffffff})
                            );
                            spine.position.set(Math.cos(angle)*0.95, 0.7, Math.sin(angle)*0.95);
                            group.add(spine);
                        }
                        
                        // Flower on top
                        const flower = new THREE.Mesh(
                            new THREE.ConeGeometry(0.2, 0.3, 6),
                            matYellow
                        );
                        flower.position.y = 1.4;
                        
                        group.add(body, flower);
                    }
                    else {
                        // DESERT BONES - Skull decoration
                        const skull = new THREE.Mesh(
                            new THREE.SphereGeometry(0.6),
                            new THREE.MeshStandardMaterial({color: 0xf5f5dc, roughness: 0.9})
                        );
                        skull.scale.set(1, 0.8, 1);
                        skull.position.y = 0.5;
                        
                        // Eye sockets
                        const eye1 = new THREE.Mesh(
                            new THREE.SphereGeometry(0.15),
                            new THREE.MeshStandardMaterial({color: 0x000000})
                        );
                        eye1.position.set(-0.2, 0.5, 0.5);
                        const eye2 = eye1.clone();
                        eye2.position.set(0.2, 0.5, 0.5);
                        
                        // Horns
                        const horn1 = new THREE.Mesh(
                            new THREE.ConeGeometry(0.1, 0.5, 6),
                            new THREE.MeshStandardMaterial({color: 0xdeb887})
                        );
                        horn1.position.set(-0.5, 0.8, 0);
                        horn1.rotation.z = Math.PI/4;
                        const horn2 = horn1.clone();
                        horn2.position.set(0.5, 0.8, 0);
                        horn2.rotation.z = -Math.PI/4;
                        
                        group.add(skull, eye1, eye2, horn1, horn2);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 1. FROZEN TUNDRA - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isFrozen) {
                    const rng = seededRandom();
                    
                    if (rng > 0.75) {
                        // FROSTED PINE TREE - Multi-layered with snow
                        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 2, 8), matWood);
                        trunk.position.y = 1;
                        
                        // 4 layers of foliage
                        for(let layer = 0; layer < 4; layer++) {
                            const radius = 2.5 - (layer * 0.5);
                            const height = 2.5 - (layer * 0.3);
                            const foliage = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 8), matPine);
                            foliage.position.y = 2.2 + (layer * 1.2);
                            
                            // Snow cap on each layer
                            const snow = new THREE.Mesh(new THREE.ConeGeometry(radius + 0.1, height * 0.6, 8), matSnow);
                            snow.position.y = 2.2 + (layer * 1.2) + height * 0.2;
                            
                            group.add(foliage, snow);
                        }
                        group.add(trunk);
                    }
                    else if (rng > 0.55) {
                        // ICE SPIKE CLUSTER - Sharp crystalline formations
                        const count = 5 + Math.floor(Math.random() * 3);
                        for(let k=0; k<count; k++) {
                            const height = 2 + Math.random() * 4;
                            const spike = new THREE.Mesh(
                                new THREE.ConeGeometry(0.3 + Math.random() * 0.3, height, 6),
                                matIce
                            );
                            const angle = (k / count) * Math.PI * 2 + Math.random() * 0.5;
                            const dist = Math.random() * 1.5;
                            spike.position.set(Math.cos(angle) * dist, height/2, Math.sin(angle) * dist);
                            spike.rotation.x = (Math.random() - 0.5) * 0.3;
                            spike.rotation.z = (Math.random() - 0.5) * 0.3;
                            group.add(spike);
                        }
                    }
                    else if (rng > 0.35) {
                        // FROZEN LAKE - Reflective ice surface
                        const lake = new THREE.Mesh(
                            new THREE.CircleGeometry(2.5 + Math.random(), 32),
                            new THREE.MeshStandardMaterial({
                                color: 0xddeeff,
                                transparent: true,
                                opacity: 0.8,
                                metalness: 0.9,
                                roughness: 0.1
                            })
                        );
                        lake.rotation.x = -Math.PI/2;
                        lake.position.y = 0.05;
                        
                        // Ice chunks floating
                        for(let k=0; k<3; k++) {
                            const chunk = new THREE.Mesh(
                                new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2),
                                matIce
                            );
                            chunk.position.set(
                                (Math.random()-0.5)*2,
                                0.1,
                                (Math.random()-0.5)*2
                            );
                            group.add(chunk);
                        }
                        group.add(lake);
                    }
                    else if (rng > 0.2) {
                        // SNOW DRIFT - Natural snow accumulation
                        const drift = new THREE.Mesh(
                            new THREE.SphereGeometry(2, 16, 8),
                            matSnow
                        );
                        drift.scale.set(1.5, 0.4, 1);
                        drift.position.y = 0.4;
                        group.add(drift);
                    }
                    else {
                        // SNOWMAN - Classic winter decoration
                        const base = new THREE.Mesh(new THREE.SphereGeometry(1.3), matSnow);
                        base.position.y = 1.1;
                        const middle = new THREE.Mesh(new THREE.SphereGeometry(1.0), matSnow);
                        middle.position.y = 2.7;
                        const head = new THREE.Mesh(new THREE.SphereGeometry(0.7), matSnow);
                        head.position.y = 4.0;
                        
                        // Carrot nose
                        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 8), matSand);
                        nose.position.set(0, 4.0, 0.7);
                        nose.rotation.x = Math.PI/2;
                        
                        // Coal eyes
                        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({color: 0x000000}));
                        eye1.position.set(-0.2, 4.1, 0.6);
                        const eye2 = eye1.clone();
                        eye2.position.set(0.2, 4.1, 0.6);
                        
                        // Stick arms
                        const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), matWood);
                        arm1.position.set(-1.2, 2.7, 0);
                        arm1.rotation.z = Math.PI/3;
                        const arm2 = arm1.clone();
                        arm2.position.set(1.2, 2.7, 0);
                        arm2.rotation.z = -Math.PI/3;
                        
                        group.add(base, middle, head, nose, eye1, eye2, arm1, arm2);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 2. VOLCANIC WASTELAND - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isVolcano) {
                    const rng = seededRandom();
                    
                    if (rng > 0.7) {
                        // BASALT COLUMNS - Hexagonal volcanic rock formations
                        const count = 6 + Math.floor(Math.random() * 4);
                        for(let k=0; k<count; k++) {
                            const height = 1.5 + Math.random() * 3.5;
                            const col = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.5, 0.5, height, 6),
                                matBasalt
                            );
                            const angle = (k / count) * Math.PI * 2;
                            const dist = Math.random() * 1.2;
                            col.position.set(Math.cos(angle) * dist, height/2, Math.sin(angle) * dist);
                            col.rotation.y = Math.random() * Math.PI;
                            group.add(col);
                        }
                    }
                    else if (rng > 0.5) {
                        // MAGMA VENT - Active lava geyser
                        const crater = new THREE.Mesh(
                            new THREE.ConeGeometry(2.5, 3, 8, 1, true),
                            matBasalt
                        );
                        crater.position.y = 1.5;
                        
                        // Glowing lava pool
                        const lava = new THREE.Mesh(
                            new THREE.CircleGeometry(1.8, 16),
                            new THREE.MeshBasicMaterial({
                                color: 0xff4500,
                                emissive: 0xff4500,
                                emissiveIntensity: 1
                            })
                        );
                        lava.rotation.x = -Math.PI/2;
                        lava.position.y = 2.0;
                        
                        // Bubbling effect (multiple small spheres)
                        for(let k=0; k<3; k++) {
                            const bubble = new THREE.Mesh(
                                new THREE.SphereGeometry(0.3),
                                matMagma
                            );
                            bubble.position.set(
                                (Math.random()-0.5)*1.5,
                                2.1,
                                (Math.random()-0.5)*1.5
                            );
                            group.add(bubble);
                        }
                        
                        group.add(crater, lava);
                    }
                    else if (rng > 0.3) {
                        // OBSIDIAN SHARDS - Sharp black glass
                        const count = 4 + Math.floor(Math.random() * 3);
                        const matObsidian = new THREE.MeshStandardMaterial({
                            color: 0x0a0a0a,
                            metalness: 0.8,
                            roughness: 0.2
                        });
                        
                        for(let k=0; k<count; k++) {
                            const shard = new THREE.Mesh(
                                new THREE.ConeGeometry(0.4, 2 + Math.random() * 2, 4),
                                matObsidian
                            );
                            const angle = (k / count) * Math.PI * 2;
                            const dist = Math.random() * 1.5;
                            shard.position.set(Math.cos(angle) * dist, 1, Math.sin(angle) * dist);
                            shard.rotation.set(
                                Math.random() * 0.3,
                                Math.random() * Math.PI * 2,
                                (Math.random() - 0.5) * 0.5
                            );
                            group.add(shard);
                        }
                    }
                    else if (rng > 0.15) {
                        // LAVA POOL - Glowing molten rock
                        const pool = new THREE.Mesh(
                            new THREE.CircleGeometry(2 + Math.random(), 12),
                            new THREE.MeshBasicMaterial({
                                color: 0xff3300,
                                emissive: 0xff6600,
                                emissiveIntensity: 0.8
                            })
                        );
                        pool.rotation.x = -Math.PI/2;
                        pool.position.y = 0.05;
                        
                        // Glowing edges
                        const ring = new THREE.Mesh(
                            new THREE.RingGeometry(2, 2.3, 12),
                            new THREE.MeshBasicMaterial({color: 0x882200})
                        );
                        ring.rotation.x = -Math.PI/2;
                        ring.position.y = 0.06;
                        
                        group.add(pool, ring);
                    }
                    else {
                        // ASH PILE - Volcanic debris
                        const pile = new THREE.Mesh(
                            new THREE.ConeGeometry(1.5, 1, 8),
                            new THREE.MeshStandardMaterial({color: 0x3a3a3a, roughness: 1.0})
                        );
                        pile.position.y = 0.5;
                        group.add(pile);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 3. HELLO KITTY WORLD - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isKitty) {
                    const rng = seededRandom();
                    
                    if (rng > 0.7) {
                        // CANDY CANE - Striped pole
                        const cane = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.3, 0.3, 3, 16),
                            new THREE.MeshStandardMaterial({
                                color: 0xff0066,
                                roughness: 0.3
                            })
                        );
                        cane.position.y = 1.5;
                        cane.rotation.z = 0.3;
                        
                        // White stripes
                        for(let k=0; k<5; k++) {
                            const stripe = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.32, 0.32, 0.4, 16),
                                matWhite
                            );
                            stripe.position.y = 0.5 + k * 0.6;
                            cane.add(stripe);
                        }
                        
                        group.add(cane);
                    }
                    else if (rng > 0.5) {
                        // GIANT CUPCAKE - Multi-layer dessert
                        const bottom = new THREE.Mesh(
                            new THREE.CylinderGeometry(1.2, 1.0, 0.8, 16),
                            new THREE.MeshStandardMaterial({color: 0xffd700, roughness: 0.5})
                        );
                        bottom.position.y = 0.4;
                        
                        const frosting = new THREE.Mesh(
                            new THREE.SphereGeometry(1.3, 16, 16),
                            matPink
                        );
                        frosting.scale.y = 0.8;
                        frosting.position.y = 1.5;
                        
                        // Cherry on top
                        const cherry = new THREE.Mesh(
                            new THREE.SphereGeometry(0.3),
                            new THREE.MeshStandardMaterial({color: 0xff0000, roughness: 0.2})
                        );
                        cherry.position.y = 2.5;
                        
                        // Stem
                        const stem = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.05, 0.05, 0.3),
                            matGreen
                        );
                        stem.position.y = 2.7;
                        
                        group.add(bottom, frosting, cherry, stem);
                    }
                    else if (rng > 0.3) {
                        // MUSHROOM HOUSE - Toadstool with door
                        const stem = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.8, 0.9, 2, 16),
                            matPastel
                        );
                        stem.position.y = 1;
                        
                        const cap = new THREE.Mesh(
                            new THREE.SphereGeometry(1.8, 16, 16),
                            matRedBow
                        );
                        cap.scale.y = 0.6;
                        cap.position.y = 2.5;
                        
                        // White spots on cap
                        for(let k=0; k<5; k++) {
                            const spot = new THREE.Mesh(
                                new THREE.CircleGeometry(0.2 + Math.random() * 0.2, 8),
                                matWhite
                            );
                            spot.position.set(
                                (Math.random()-0.5)*1.5,
                                2.5 + (Math.random()-0.5)*0.3,
                                (Math.random()-0.5)*1.5
                            );
                            spot.lookAt(0, 2.5, 0);
                            group.add(spot);
                        }
                        
                        // Door
                        const door = new THREE.Mesh(
                            new THREE.BoxGeometry(0.5, 0.8, 0.1),
                            matWood
                        );
                        door.position.set(0, 0.8, 0.9);
                        
                        group.add(stem, cap, door);
                    }
                    else if (rng > 0.15) {
                        // LOLLIPOP - Spiral candy
                        const stick = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
                            matWhite
                        );
                        stick.position.y = 1;
                        
                        const candy = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32),
                            matPink
                        );
                        candy.position.y = 2.5;
                        
                        // Spiral decoration
                        for(let k=0; k<3; k++) {
                            const spiral = new THREE.Mesh(
                                new THREE.TorusGeometry(0.6 - k*0.15, 0.08, 8, 16),
                                matWhite
                            );
                            spiral.position.y = 2.5;
                            spiral.rotation.x = Math.PI/2;
                            group.add(spiral);
                        }
                        
                        group.add(stick, candy);
                    }
                    else {
                        // GIANT BOW - The signature decoration
                        const center = new THREE.Mesh(
                            new THREE.SphereGeometry(0.5),
                            matRedBow
                        );
                        center.position.y = 1.2;
                        
                        // Left loop
                        const leftLoop = new THREE.Mesh(
                            new THREE.TorusGeometry(0.8, 0.3, 16, 32),
                            matRedBow
                        );
                        leftLoop.position.set(-0.9, 1.2, 0);
                        leftLoop.rotation.y = Math.PI/2;
                        
                        // Right loop
                        const rightLoop = leftLoop.clone();
                        rightLoop.position.set(0.9, 1.2, 0);
                        
                        // Ribbons
                        const ribbon1 = new THREE.Mesh(
                            new THREE.BoxGeometry(0.4, 1.5, 0.1),
                            matRedBow
                        );
                        ribbon1.position.set(-0.3, 0.3, 0);
                        ribbon1.rotation.z = 0.3;
                        
                        const ribbon2 = ribbon1.clone();
                        ribbon2.position.set(0.3, 0.3, 0);
                        ribbon2.rotation.z = -0.3;
                        
                        group.add(center, leftLoop, rightLoop, ribbon1, ribbon2);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 4. THE VOID - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isVoid) {
                    const rng = seededRandom();
                    const matVoid = new THREE.MeshStandardMaterial({
                        color: 0x0a0a1a,
                        roughness: 0.1,
                        metalness: 0.9,
                        emissive: 0x9b59b6,
                        emissiveIntensity: 0.3
                    });
                    
                    if (rng > 0.7) {
                        // FLOATING MONOLITH - Hovering obelisk
                        const height = 3 + Math.random() * 5;
                        const mono = new THREE.Mesh(
                            new THREE.BoxGeometry(1, height, 1),
                            matVoid
                        );
                        mono.position.y = height/2 + 1.5;
                        mono.rotation.set(
                            (Math.random()-0.5)*0.4,
                            Math.random()*Math.PI*2,
                            (Math.random()-0.5)*0.4
                        );
                        
                        // Glowing edges
                        const edges = new THREE.EdgesGeometry(mono.geometry);
                        const line = new THREE.LineSegments(
                            edges,
                            new THREE.LineBasicMaterial({color: 0x00ffff, linewidth: 2})
                        );
                        line.position.copy(mono.position);
                        line.rotation.copy(mono.rotation);
                        
                        // Energy particles orbiting
                        for(let k=0; k<3; k++) {
                            const particle = new THREE.Mesh(
                                new THREE.SphereGeometry(0.1),
                                new THREE.MeshBasicMaterial({color: 0xaa00ff})
                            );
                            const angle = (k/3) * Math.PI * 2;
                            particle.position.set(
                                Math.cos(angle) * 1.5,
                                mono.position.y + (Math.random()-0.5)*height,
                                Math.sin(angle) * 1.5
                            );
                            group.add(particle);
                        }
                        
                        group.add(mono, line);
                    }
                    else if (rng > 0.5) {
                        // VOID CRYSTAL CLUSTER - Glowing purple gems
                        const mainCrystal = new THREE.Mesh(
                            new THREE.OctahedronGeometry(1.5),
                            new THREE.MeshStandardMaterial({
                                color: 0x4a0e4e,
                                emissive: 0x9b59b6,
                                emissiveIntensity: 0.7,
                                metalness: 0.9,
                                roughness: 0.1
                            })
                        );
                        mainCrystal.position.y = 2;
                        mainCrystal.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                        
                        // Surrounding smaller crystals
                        for(let k=0; k<5; k++) {
                            const small = mainCrystal.clone();
                            small.scale.setScalar(0.4 + Math.random()*0.3);
                            const angle = (k/5) * Math.PI * 2;
                            const dist = 1.5 + Math.random();
                            small.position.set(Math.cos(angle)*dist, 0.5+Math.random(), Math.sin(angle)*dist);
                            group.add(small);
                        }
                        
                        group.add(mainCrystal);
                    }
                    else if (rng > 0.3) {
                        // VOID PORTAL - Swirling energy ring
                        const portalRing = new THREE.Mesh(
                            new THREE.TorusGeometry(1.5, 0.2, 16, 32),
                            matVoid
                        );
                        portalRing.rotation.x = Math.PI/2;
                        portalRing.position.y = 2;
                        
                        // Inner vortex
                        const vortex = new THREE.Mesh(
                            new THREE.CircleGeometry(1.4, 32),
                            new THREE.MeshBasicMaterial({
                                color: 0x6600cc,
                                transparent: true,
                                opacity: 0.6
                            })
                        );
                        vortex.position.y = 2;
                        vortex.rotation.x = Math.PI/2;
                        
                        group.add(portalRing, vortex);
                    }
                    else if (rng > 0.15) {
                        // ANCIENT RUNE STONE - Mysterious marker
                        const stone = new THREE.Mesh(
                            new THREE.BoxGeometry(1.5, 3, 0.5),
                            matVoid
                        );
                        stone.position.y = 1.5;
                        stone.rotation.y = Math.random() * Math.PI;
                        
                        // Glowing runes
                        for(let k=0; k<3; k++) {
                            const rune = new THREE.Mesh(
                                new THREE.RingGeometry(0.15, 0.25, 6),
                                new THREE.MeshBasicMaterial({color: 0x00ffff})
                            );
                            rune.position.set(0, 1 + k*0.7, 0.26);
                            stone.add(rune);
                        }
                        
                        group.add(stone);
                    }
                    else {
                        // VOID SPHERE - Floating dark energy ball
                        const sphere = new THREE.Mesh(
                            new THREE.IcosahedronGeometry(1.2, 1),
                            new THREE.MeshStandardMaterial({
                                color: 0x000000,
                                emissive: 0x6600aa,
                                emissiveIntensity: 0.4,
                                wireframe: true
                            })
                        );
                        sphere.position.y = 2;
                        
                        const innerSphere = new THREE.Mesh(
                            new THREE.SphereGeometry(0.8),
                            new THREE.MeshBasicMaterial({
                                color: 0x9b59b6,
                                transparent: true,
                                opacity: 0.3
                            })
                        );
                        innerSphere.position.y = 2;
                        
                        group.add(sphere, innerSphere);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 5. CRYSTAL CAVE - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isCrystalCave) {
                    const rng = seededRandom();
                    const matCrystal = new THREE.MeshStandardMaterial({
                        color: 0xaa00ff,
                        emissive: 0xaa00ff,
                        emissiveIntensity: 0.4,
                        transparent: true,
                        opacity: 0.85,
                        metalness: 0.6,
                        roughness: 0.2
                    });
                    const matRock = new THREE.MeshStandardMaterial({color: 0x444466, roughness: 1.0});
                    
                    if (rng > 0.7) {
                        // GIANT GEODE - Hollow rock with crystals inside
                        const outer = new THREE.Mesh(
                            new THREE.DodecahedronGeometry(2.5),
                            matRock
                        );
                        outer.scale.set(1, 0.6, 1);
                        outer.position.y = 1.2;
                        
                        // Inner crystals
                        for(let k=0; k<6; k++) {
                            const crystal = new THREE.Mesh(
                                new THREE.ConeGeometry(0.3, 1.5, 6),
                                matCrystal
                            );
                            const angle = (k/6) * Math.PI * 2;
                            crystal.position.set(
                                Math.cos(angle) * 1.5,
                                1.2,
                                Math.sin(angle) * 1.5
                            );
                            crystal.lookAt(0, 1.2, 0);
                            crystal.rotateX(Math.PI/2);
                            group.add(crystal);
                        }
                        
                        group.add(outer);
                    }
                    else if (rng > 0.5) {
                        // CRYSTAL SPIRE FOREST - Multiple tall crystals
                        const count = 5 + Math.floor(Math.random() * 4);
                        for(let k=0; k<count; k++) {
                            const height = 2 + Math.random() * 3;
                            const spire = new THREE.Mesh(
                                new THREE.OctahedronGeometry(0.5),
                                matCrystal
                            );
                            spire.scale.set(0.5, height, 0.5);
                            const angle = (k/count) * Math.PI * 2;
                            const dist = Math.random() * 1.5;
                            spire.position.set(Math.cos(angle)*dist, height, Math.sin(angle)*dist);
                            spire.rotation.y = Math.random() * Math.PI;
                            group.add(spire);
                        }
                    }
                    else if (rng > 0.3) {
                        // CRYSTAL CLUSTER - Star-shaped formation
                        const center = new THREE.Mesh(
                            new THREE.OctahedronGeometry(1),
                            matCrystal
                        );
                        center.position.y = 1;
                        
                        // 8 radiating crystals
                        for(let k=0; k<8; k++) {
                            const shard = new THREE.Mesh(
                                new THREE.ConeGeometry(0.25, 1.5, 6),
                                matCrystal
                            );
                            const angle = (k/8) * Math.PI * 2;
                            shard.position.set(Math.cos(angle)*1.2, 1, Math.sin(angle)*1.2);
                            shard.lookAt(center.position);
                            shard.rotateX(-Math.PI/2);
                            group.add(shard);
                        }
                        
                        group.add(center);
                    }
                    else if (rng > 0.15) {
                        // GLOWING BOULDER - Rock with crystal veins
                        const rock = new THREE.Mesh(
                            new THREE.DodecahedronGeometry(1.8),
                            matRock
                        );
                        rock.position.y = 1;
                        
                        // Crystal shards protruding
                        for(let k=0; k<4; k++) {
                            const shard = new THREE.Mesh(
                                new THREE.ConeGeometry(0.2, 1, 6),
                                matCrystal
                            );
                            shard.position.set(
                                (Math.random()-0.5)*1.5,
                                1 + Math.random(),
                                (Math.random()-0.5)*1.5
                            );
                            shard.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                            group.add(shard);
                        }
                        
                        group.add(rock);
                    }
                    else {
                        // FLOATING CRYSTAL SHARDS - Levitating pieces
                        for(let k=0; k<4; k++) {
                            const shard = new THREE.Mesh(
                                new THREE.TetrahedronGeometry(0.6),
                                matCrystal
                            );
                            shard.position.set(
                                (Math.random()-0.5)*2,
                                1.5 + Math.random() * 2,
                                (Math.random()-0.5)*2
                            );
                            shard.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                            group.add(shard);
                        }
                    }
                }
                
                // ═══════════════════════════════════════════
                // 6. NEON CITY - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isNeonCity) {
                    const rng = seededRandom();
                    const matBuilding = new THREE.MeshStandardMaterial({color: 0x1a1a2e, roughness: 0.6, metalness: 0.3});
                    const matNeonBlue = new THREE.MeshBasicMaterial({color: 0x00d9ff, emissive: 0x00d9ff, emissiveIntensity: 1});
                    const matNeonPink = new THREE.MeshBasicMaterial({color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 1});
                    const matNeonGreen = new THREE.MeshBasicMaterial({color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 1});
                    
                    if (rng > 0.7) {
                        // SKYSCRAPER WITH NEON - Tall building with glowing elements
                        const height = 5 + Math.random() * 5;
                        const building = new THREE.Mesh(
                            new THREE.BoxGeometry(2, height, 2),
                            matBuilding
                        );
                        building.position.y = height/2;
                        
                        // Neon strip on sides
                        for(let k=0; k<4; k++) {
                            const strip = new THREE.Mesh(
                                new THREE.BoxGeometry(2.1, 0.1, 0.05),
                                k % 2 === 0 ? matNeonBlue : matNeonPink
                            );
                            strip.position.set(0, (k+1)*(height/5), 1.01);
                            building.add(strip);
                        }
                        
                        // Rooftop antenna
                        const antenna = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
                            matBuilding
                        );
                        antenna.position.y = height/2 + 1;
                        building.add(antenna);
                        
                        // Blinking light
                        const light = new THREE.Mesh(
                            new THREE.SphereGeometry(0.2),
                            matNeonGreen
                        );
                        light.position.y = height/2 + 2;
                        building.add(light);
                        
                        group.add(building);
                    }
                    else if (rng > 0.5) {
                        // NEON BILLBOARD - Standing advertisement
                        const stand = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.2, 0.2, 3, 8),
                            matBuilding
                        );
                        stand.position.y = 1.5;
                        
                        const board = new THREE.Mesh(
                            new THREE.BoxGeometry(3, 2, 0.2),
                            matBuilding
                        );
                        board.position.y = 3.5;
                        
                        // Neon frame
                        const frame = new THREE.Mesh(
                            new THREE.BoxGeometry(3.2, 2.2, 0.1),
                            matNeonPink
                        );
                        frame.position.y = 3.5;
                        
                        group.add(stand, board, frame);
                    }
                    else if (rng > 0.3) {
                        // STREET LAMP - Cyberpunk style
                        const pole = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
                            matBuilding
                        );
                        pole.position.y = 2;
                        
                        const lamp = new THREE.Mesh(
                            new THREE.BoxGeometry(0.5, 0.3, 0.5),
                            matBuilding
                        );
                        lamp.position.y = 4.2;
                        
                        // Glowing light
                        const glow = new THREE.Mesh(
                            new THREE.SphereGeometry(0.4),
                            matNeonBlue
                        );
                        glow.position.y = 4;
                        
                        group.add(pole, lamp, glow);
                    }
                    else if (rng > 0.15) {
                        // HOLOGRAM PROJECTOR - Sci-fi display
                        const base = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16),
                            matBuilding
                        );
                        base.position.y = 0.15;
                        
                        // Hologram
                        const holo = new THREE.Mesh(
                            new THREE.PlaneGeometry(2, 2),
                            new THREE.MeshBasicMaterial({
                                color: 0x00ffff,
                                transparent: true,
                                opacity: 0.4,
                                side: THREE.DoubleSide
                            })
                        );
                        holo.position.y = 2;
                        
                        // Projection beam
                        const beam = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.1, 0.5, 2, 8, 1, true),
                            new THREE.MeshBasicMaterial({
                                color: 0x00ffff,
                                transparent: true,
                                opacity: 0.2,
                                side: THREE.DoubleSide
                            })
                        );
                        beam.position.y = 1;
                        
                        group.add(base, holo, beam);
                    }
                    else {
                        // TRAFFIC BARRIER - Cyberpunk roadblock
                        const barrier = new THREE.Mesh(
                            new THREE.BoxGeometry(3, 0.5, 0.3),
                            matBuilding
                        );
                        barrier.position.y = 0.5;
                        
                        // Warning stripes
                        for(let k=0; k<5; k++) {
                            const stripe = new THREE.Mesh(
                                new THREE.BoxGeometry(0.5, 0.52, 0.32),
                                k % 2 === 0 ? matNeonPink : matYellow
                            );
                            stripe.position.set(-1.25 + k*0.625, 0.5, 0);
                            group.add(stripe);
                        }
                        
                        group.add(barrier);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 7. TOXIC SWAMP - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isToxicSwamp) {
                    const rng = seededRandom();
                    const matSlime = new THREE.MeshBasicMaterial({color: 0x7fff00, emissive: 0x7fff00, emissiveIntensity: 0.5});
                    const matDeadTree = new THREE.MeshStandardMaterial({color: 0x3a2a1a, roughness: 1.0});
                    const matToxic = new THREE.MeshBasicMaterial({color: 0x66ff00, transparent: true, opacity: 0.6});
                    
                    if (rng > 0.7) {
                        // TOXIC MUSHROOM - Glowing fungus
                        const stem = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.5, 0.6, 1.5, 16),
                            new THREE.MeshStandardMaterial({color: 0x44aa44, roughness: 0.8})
                        );
                        stem.position.y = 0.75;
                        
                        const cap = new THREE.Mesh(
                            new THREE.SphereGeometry(1.5, 16, 16),
                            matSlime
                        );
                        cap.scale.y = 0.5;
                        cap.position.y = 2;
                        
                        // Toxic spots
                        for(let k=0; k<5; k++) {
                            const spot = new THREE.Mesh(
                                new THREE.CircleGeometry(0.2 + Math.random()*0.2, 8),
                                new THREE.MeshBasicMaterial({color: 0x00ff00})
                            );
                            spot.position.set(
                                (Math.random()-0.5)*1.5,
                                2 + (Math.random()-0.5)*0.2,
                                (Math.random()-0.5)*1.5
                            );
                            spot.lookAt(0, 2, 0);
                            group.add(spot);
                        }
                        
                        // Dripping slime
                        for(let k=0; k<3; k++) {
                            const drip = new THREE.Mesh(
                                new THREE.ConeGeometry(0.1, 0.5, 8),
                                matSlime
                            );
                            drip.position.set(
                                (Math.random()-0.5)*1.2,
                                1.5,
                                (Math.random()-0.5)*1.2
                            );
                            group.add(drip);
                        }
                        
                        group.add(stem, cap);
                    }
                    else if (rng > 0.5) {
                        // DEAD SWAMP TREE - Gnarled trunk
                        const trunk = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.4, 0.6, 3.5, 8),
                            matDeadTree
                        );
                        trunk.position.y = 1.75;
                        trunk.rotation.z = (Math.random()-0.5)*0.4;
                        
                        // Twisted branches
                        for(let k=0; k<3; k++) {
                            const branch = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.15, 0.1, 1.5, 6),
                                matDeadTree
                            );
                            branch.position.set(
                                (Math.random()-0.5)*0.5,
                                2.5 + Math.random(),
                                0
                            );
                            branch.rotation.set(0, k*Math.PI/2, Math.random()*Math.PI/3);
                            trunk.add(branch);
                        }
                        
                        // Moss/vines
                        const moss = new THREE.Mesh(
                            new THREE.SphereGeometry(0.3),
                            new THREE.MeshStandardMaterial({color: 0x228b22, roughness: 1.0})
                        );
                        moss.position.set(0, 1, 0.5);
                        trunk.add(moss);
                        
                        group.add(trunk);
                    }
                    else if (rng > 0.3) {
                        // TOXIC PUDDLE - Bubbling slime pool
                        const puddle = new THREE.Mesh(
                            new THREE.CircleGeometry(2 + Math.random(), 16),
                            matToxic
                        );
                        puddle.rotation.x = -Math.PI/2;
                        puddle.position.y = 0.05;
                        
                        // Bubbles
                        for(let k=0; k<4; k++) {
                            const bubble = new THREE.Mesh(
                                new THREE.SphereGeometry(0.2 + Math.random()*0.2),
                                matSlime
                            );
                            bubble.position.set(
                                (Math.random()-0.5)*1.8,
                                0.1,
                                (Math.random()-0.5)*1.8
                            );
                            group.add(bubble);
                        }
                        
                        group.add(puddle);
                    }
                    else if (rng > 0.15) {
                        // TOXIC BARREL - Leaking container
                        const barrel = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.6, 0.6, 1.5, 16),
                            new THREE.MeshStandardMaterial({color: 0x444444, metalness: 0.7, roughness: 0.3})
                        );
                        barrel.position.y = 0.75;
                        barrel.rotation.z = (Math.random()-0.5)*0.5;
                        
                        // Warning symbol
                        const symbol = new THREE.Mesh(
                            new THREE.CircleGeometry(0.4, 3),
                            new THREE.MeshBasicMaterial({color: 0xffff00})
                        );
                        symbol.position.set(0, 0.75, 0.61);
                        barrel.add(symbol);
                        
                        // Leak
                        const leak = new THREE.Mesh(
                            new THREE.ConeGeometry(0.2, 0.6, 8),
                            matSlime
                        );
                        leak.position.y = 0.2;
                        
                        group.add(barrel, leak);
                    }
                    else {
                        // MUTANT PLANT - Carnivorous vegetation
                        const stem = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.3, 0.2, 2, 8),
                            new THREE.MeshStandardMaterial({color: 0x2d5a2d, roughness: 0.9})
                        );
                        stem.position.y = 1;
                        
                        // Mouth (open sphere)
                        const mouth = new THREE.Mesh(
                            new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI*2, 0, Math.PI/2),
                            new THREE.MeshStandardMaterial({color: 0xff0066, roughness: 0.5, side: THREE.DoubleSide})
                        );
                        mouth.position.y = 2.5;
                        
                        // Teeth
                        for(let k=0; k<8; k++) {
                            const tooth = new THREE.Mesh(
                                new THREE.ConeGeometry(0.1, 0.3, 4),
                                new THREE.MeshStandardMaterial({color: 0xffffff})
                            );
                            const angle = (k/8) * Math.PI * 2;
                            tooth.position.set(Math.cos(angle)*0.7, 2.5, Math.sin(angle)*0.7);
                            tooth.lookAt(0, 2.5, 0);
                            tooth.rotateX(-Math.PI/2);
                            group.add(tooth);
                        }
                        
                        group.add(stem, mouth);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 8. SPACE STATION - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else if (isSpaceStation) {
                    const rng = seededRandom();
                    const matMetal = new THREE.MeshStandardMaterial({color: 0x888888, metalness: 0.9, roughness: 0.2});
                    const matTech = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8, roughness: 0.3});
                    const matLight = new THREE.MeshBasicMaterial({color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 1});
                    
                    if (rng > 0.7) {
                        // CARGO CONTAINER - Stacked shipping crate
                        const container1 = new THREE.Mesh(
                            new THREE.BoxGeometry(2.5, 2, 3),
                            matMetal
                        );
                        container1.position.y = 1;
                        
                        // Corner reinforcements
                        for(let corner of [[1.3,1,1.6], [-1.3,1,1.6], [1.3,1,-1.6], [-1.3,1,-1.6]]) {
                            const reinforce = new THREE.Mesh(
                                new THREE.BoxGeometry(0.2, 2.2, 0.2),
                                matTech
                            );
                            reinforce.position.set(...corner);
                            group.add(reinforce);
                        }
                        
                        // Status light
                        const light = new THREE.Mesh(
                            new THREE.BoxGeometry(0.3, 0.3, 0.1),
                            matLight
                        );
                        light.position.set(1, 1, 1.51);
                        
                        // Maybe stacked
                        if(Math.random() > 0.5) {
                            const container2 = container1.clone();
                            container2.position.y = 3;
                            container2.rotation.y = Math.PI/2;
                            group.add(container2);
                        }
                        
                        group.add(container1, light);
                    }
                    else if (rng > 0.5) {
                        // ANTENNA ARRAY - Communications dish
                        const pole = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.2, 0.2, 4, 8),
                            matMetal
                        );
                        pole.position.y = 2;
                        
                        const dish = new THREE.Mesh(
                            new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI*2, 0, Math.PI/2),
                            matMetal
                        );
                        dish.rotation.x = Math.PI;
                        dish.position.y = 4.5;
                        
                        // Receiver
                        const receiver = new THREE.Mesh(
                            new THREE.ConeGeometry(0.2, 0.8, 8),
                            matTech
                        );
                        receiver.position.set(0, 4, 0.5);
                        receiver.rotation.x = Math.PI/4;
                        
                        group.add(pole, dish, receiver);
                    }
                    else if (rng > 0.3) {
                        // TECH CONSOLE - Control panel
                        const base = new THREE.Mesh(
                            new THREE.BoxGeometry(2, 1.5, 1),
                            matTech
                        );
                        base.position.y = 0.75;
                        base.rotation.y = Math.random() * Math.PI * 2;
                        
                        // Screen
                        const screen = new THREE.Mesh(
                            new THREE.PlaneGeometry(1.5, 1),
                            new THREE.MeshBasicMaterial({
                                color: 0x00ffaa,
                                emissive: 0x00ffaa,
                                emissiveIntensity: 0.5
                            })
                        );
                        screen.position.set(0, 1.2, 0.51);
                        base.add(screen);
                        
                        // Buttons
                        for(let k=0; k<4; k++) {
                            const button = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8),
                                matLight
                            );
                            button.rotation.x = Math.PI/2;
                            button.position.set(-0.6 + k*0.4, 0.5, 0.51);
                            base.add(button);
                        }
                        
                        group.add(base);
                    }
                    else if (rng > 0.15) {
                        // POWER GENERATOR - Energy core
                        const core = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.8, 0.8, 2, 16),
                            matMetal
                        );
                        core.position.y = 1;
                        
                        // Glowing rings
                        for(let k=0; k<3; k++) {
                            const ring = new THREE.Mesh(
                                new THREE.TorusGeometry(0.9, 0.1, 16, 32),
                                matLight
                            );
                            ring.position.y = 0.5 + k*0.6;
                            ring.rotation.x = Math.PI/2;
                            group.add(ring);
                        }
                        
                        // Exhaust pipes
                        for(let k=0; k<4; k++) {
                            const pipe = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.15, 0.15, 1, 8),
                                matTech
                            );
                            const angle = (k/4) * Math.PI * 2;
                            pipe.position.set(Math.cos(angle)*0.95, 2, Math.sin(angle)*0.95);
                            group.add(pipe);
                        }
                        
                        group.add(core);
                    }
                    else {
                        // ROBOTIC ARM - Mechanical appendage
                        const base = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16),
                            matTech
                        );
                        base.position.y = 0.4;
                        
                        const arm1 = new THREE.Mesh(
                            new THREE.BoxGeometry(0.3, 2, 0.3),
                            matMetal
                        );
                        arm1.position.y = 1.8;
                        
                        const joint = new THREE.Mesh(
                            new THREE.SphereGeometry(0.25),
                            matTech
                        );
                        joint.position.y = 2.8;
                        
                        const arm2 = new THREE.Mesh(
                            new THREE.BoxGeometry(0.25, 1.5, 0.25),
                            matMetal
                        );
                        arm2.position.set(0, 3.5, 0);
                        arm2.rotation.z = Math.PI/6;
                        
                        // Claw
                        const claw = new THREE.Mesh(
                            new THREE.BoxGeometry(0.5, 0.2, 0.2),
                            matTech
                        );
                        claw.position.set(0, 4.2, 0);
                        
                        group.add(base, arm1, joint, arm2, claw);
                    }
                }
 
		// ═══════════════════════════════════════════
                // 9. HARVEST VALLEY (FARM) - KEEP AS IS
                // ═══════════════════════════════════════════
                else if (isFarm) {
                    const rng = seededRandom();
                    
                    if (rng > 0.8) {
                        // HAY BALE
                        const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2, 16), matHay);
                        bale.rotation.z = Math.PI / 2;
                        bale.position.y = 1.0;
                        group.add(bale);
                        
                        if(Math.random() > 0.5) {
                            const bale2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2, 16), matHay);
                            bale2.rotation.z = Math.PI / 2;
                            bale2.rotation.y = 0.5;
                            bale2.position.set(0, 2.2, 0);
                            group.add(bale2);
                        }
                    } 
                    else if (rng > 0.5) {
                        // OAK TREE
                        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.5, 8), matWood);
                        trunk.position.y = 1.25;
                        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5), matOakLeaf);
                        leaves.position.y = 3.5;
                        group.add(trunk, leaves);
                    } 
                    else if (rng > 0.35) {
                        // PUMPKIN PATCH
                        for(let k=0; k<3; k++) {
                            const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), matPumpkin);
                            pumpkin.scale.y = 0.7;
                            pumpkin.position.set((Math.random()-0.5)*2, 0.5, (Math.random()-0.5)*2);
                            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5), matGreen);
                            stem.position.y = 0.7;
                            pumpkin.add(stem);
                            group.add(pumpkin);
                        }
                    } 
                    else if (rng > 0.15) {
                        // CORN STALKS
                        for(let k=0; k<5; k++) {
                            const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3 + Math.random()), matCorn);
                            stalk.position.set((Math.random()-0.5)*1.5, 1.5, (Math.random()-0.5)*1.5);
                            stalk.rotation.z = (Math.random()-0.5)*0.2;
                            group.add(stalk);
                        }
                    } 
                    else {
                        // WOODEN FENCE
                        const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.3), matFence);
                        post1.position.set(-1.5, 1, 0);
                        const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.3), matFence);
                        post2.position.set(1.5, 1, 0);
                        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 0.1), matFence);
                        rail1.position.set(0, 1.5, 0);
                        const rail2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 0.1), matFence);
                        rail2.position.set(0, 0.8, 0);
                        group.add(post1, post2, rail1, rail2);
                    }
                }
                
                // ═══════════════════════════════════════════
                // 11. JUNGLE TEMPLE - Tropical Rainforest
                // ═══════════════════════════════════════════
                else if (isJungle) {
                    const rng = seededRandom();
                    
                    if (rng > 0.75) {
                        // KAPOK TREE - Massive jungle tree with buttress roots
                        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 8, 8), matWood);
                        trunk.position.y = 4;
                        
                        // Buttress roots (flared base)
                        for(let k=0; k<4; k++) {
                            const root = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 3), matWood);
                            root.rotation.z = k * (Math.PI/2);
                            root.rotation.y = k * (Math.PI/2);
                            root.position.set(
                                Math.cos(k * Math.PI/2) * 1.2,
                                1,
                                Math.sin(k * Math.PI/2) * 1.2
                            );
                            group.add(root);
                        }
                        
                        // Canopy
                        const leaves1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5), matJungleLeaf);
                        leaves1.position.y = 8;
                        const leaves2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5), matJungleLeaf);
                        leaves2.position.y = 10;
                        
                        group.add(trunk, leaves1, leaves2);
                        
                        // ADD VINES TO THIS TREE (hanging from canopy)
                        for(let k=0; k<2; k++) {
                            const vineAngle = Math.random() * Math.PI * 2;
                            const vineRadius = 1 + Math.random() * 2; // Hang from edge of canopy
                            const vine = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.05, 0.08, 5 + Math.random() * 2, 6),
                                matVine
                            );
                            vine.position.set(
                                Math.cos(vineAngle) * vineRadius,
                                8, // Start from canopy height
                                Math.sin(vineAngle) * vineRadius
                            );
                            vine.rotation.z = (Math.random()-0.5) * 0.2;
                            group.add(vine);
                            
                            // Leaves on vine
                            for(let j=0; j<3; j++) {
                                const leaf = new THREE.Mesh(
                                    new THREE.BoxGeometry(0.3, 0.5, 0.01),
                                    matJungleLeaf
                                );
                                leaf.position.y = -1.5 - j * 1.5;
                                leaf.rotation.x = Math.random() * Math.PI/4;
                                vine.add(leaf);
                            }
                        }
                    }
                    else if (rng > 0.55) {
                        // BAMBOO GROVE
                        for(let k=0; k<5; k++) {
                            const height = 4 + Math.random() * 3;
                            const bamboo = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.15, 0.15, height, 8),
                                matBamboo
                            );
                            bamboo.position.set(
                                (Math.random()-0.5) * 2,
                                height/2,
                                (Math.random()-0.5) * 2
                            );
                            
                            // Bamboo segments (rings)
                            for(let j=0; j<Math.floor(height); j++) {
                                const ring = new THREE.Mesh(
                                    new THREE.TorusGeometry(0.18, 0.05, 4, 8),
                                    new THREE.MeshStandardMaterial({color: 0x556b2f})
                                );
                                ring.rotation.x = Math.PI/2;
                                ring.position.y = j * 1 - height/2 + 0.5;
                                bamboo.add(ring);
                            }
                            
                            group.add(bamboo);
                        }
                    }
                    else if (rng > 0.40) {
                        // ANCIENT STONE RUINS - Temple remnants
                        // Base platform
                        const base = new THREE.Mesh(
                            new THREE.BoxGeometry(3, 0.5, 3),
                            matStone
                        );
                        base.position.y = 0.25;
                        
                        // Broken pillar
                        const pillar = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.5, 0.6, 3, 8),
                            matStone
                        );
                        pillar.position.y = 1.5;
                        pillar.rotation.z = 0.2; // Tilted
                        
                        // Moss coverage
                        const moss1 = new THREE.Mesh(
                            new THREE.BoxGeometry(3.1, 0.1, 3.1),
                            matMoss
                        );
                        moss1.position.y = 0.55;
                        
                        const moss2 = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.55, 0.65, 3.1, 8),
                            matMoss
                        );
                        moss2.position.copy(pillar.position);
                        moss2.rotation.z = 0.2;
                        
                        group.add(base, pillar, moss1, moss2);
                    }
                    else if (rng > 0.25) {
                        // SMALL JUNGLE TREE (with vines)
                        const smallTrunk = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.4, 0.5, 5, 8),
                            matWood
                        );
                        smallTrunk.position.y = 2.5;
                        group.add(smallTrunk);
                        
                        const smallCanopy = new THREE.Mesh(
                            new THREE.SphereGeometry(2, 8, 6),
                            matJungleLeaf
                        );
                        smallCanopy.position.y = 5.5;
                        group.add(smallCanopy);
                        
                        // Vines hanging from THIS tree
                        for(let k=0; k<2; k++) {
                            const vineAngle = Math.random() * Math.PI * 2;
                            const vineRadius = 0.8 + Math.random();
                            const vine = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.04, 0.06, 4 + Math.random() * 2, 6),
                                matVine
                            );
                            vine.position.set(
                                Math.cos(vineAngle) * vineRadius,
                                5.5, // Canopy height
                                Math.sin(vineAngle) * vineRadius
                            );
                            vine.rotation.z = (Math.random()-0.5) * 0.3;
                            group.add(vine);
                            
                            // Leaves on vine
                            for(let j=0; j<3; j++) {
                                const leaf = new THREE.Mesh(
                                    new THREE.BoxGeometry(0.25, 0.4, 0.01),
                                    matJungleLeaf
                                );
                                leaf.position.y = -1 - j * 1.2;
                                leaf.rotation.x = Math.random() * Math.PI/4;
                                vine.add(leaf);
                            }
                        }
                    }
                    else if (rng > 0.10) {
                        // TROPICAL FERNS - Large ground cover
                        for(let k=0; k<6; k++) {
                            const stem = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.05, 0.05, 1.5),
                                matVine
                            );
                            stem.position.set(
                                (Math.random()-0.5) * 2,
                                0.75,
                                (Math.random()-0.5) * 2
                            );
                            stem.rotation.z = (Math.random()-0.5) * 0.5;
                            
                            // Fern fronds
                            const frond = new THREE.Mesh(
                                new THREE.BoxGeometry(0.1, 2, 0.01),
                                matJungleLeaf
                            );
                            frond.position.y = 0.75;
                            frond.rotation.z = k * (Math.PI/3);
                            stem.add(frond);
                            
                            group.add(stem);
                        }
                    }
                    else {
                        // ORCHID FLOWERS - Colorful jungle blooms
                        for(let k=0; k<4; k++) {
                            const stem = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.03, 0.03, 1),
                                matGreen
                            );
                            stem.position.set(
                                (Math.random()-0.5) * 1,
                                0.5,
                                (Math.random()-0.5) * 1
                            );
                            
                            // Flower petals
                            for(let j=0; j<5; j++) {
                                const petal = new THREE.Mesh(
                                    new THREE.SphereGeometry(0.15, 6, 4),
                                    matOrchid
                                );
                                petal.scale.set(1, 0.3, 0.6);
                                petal.position.set(
                                    Math.cos(j * Math.PI*2/5) * 0.2,
                                    1,
                                    Math.sin(j * Math.PI*2/5) * 0.2
                                );
                                petal.rotation.x = Math.PI/4;
                                stem.add(petal);
                            }
                            
                            group.add(stem);
                        }
                    }
                }

                // ═══════════════════════════════════════════
                // 12. MUSHROOM FOREST - Fantasy Fungi Theme
                // ═══════════════════════════════════════════
                else if (isMushroom) {
                    const rng = seededRandom();
                    
                    if (rng > 0.83) {
                        // 1. GIANT RED MUSHROOM - Classic toadstool
                        const stem = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.6, 0.8, 3, 12),
                            matMushroomStem
                        );
                        stem.position.y = 1.5;
                        
                        // Cap (hemisphere)
                        const cap = new THREE.Mesh(
                            new THREE.SphereGeometry(2.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
                            matMushroomRed
                        );
                        cap.position.y = 3.5;
                        cap.scale.y = 0.6;
                        
                        // White spots on cap
                        for(let k=0; k<8; k++) {
                            const angle = (k / 8) * Math.PI * 2;
                            const radius = 1 + Math.random() * 0.8;
                            const spot = new THREE.Mesh(
                                new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 8, 8),
                                matMushroomSpots
                            );
                            spot.position.set(
                                Math.cos(angle) * radius,
                                3.8,
                                Math.sin(angle) * radius
                            );
                            group.add(spot);
                        }
                        
                        // Gills under cap
                        const gills = new THREE.Mesh(
                            new THREE.CylinderGeometry(2.3, 0.5, 0.3, 16),
                            new THREE.MeshStandardMaterial({ color: 0xffd7a8, roughness: 0.9 })
                        );
                        gills.position.y = 3.2;
                        
                        group.add(stem, cap, gills);
                    }
                    else if (rng > 0.66) {
                        // 2. GLOWING MUSHROOM CLUSTER - Bioluminescent fungi
                        const clusterCount = 4 + Math.floor(Math.random() * 3);
                        for(let k=0; k<clusterCount; k++) {
                            const height = 1 + Math.random() * 2;
                            const stem = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.15, 0.2, height, 8),
                                matMushroomStem
                            );
                            const angle = (k / clusterCount) * Math.PI * 2;
                            const dist = Math.random() * 1.2;
                            stem.position.set(
                                Math.cos(angle) * dist,
                                height/2,
                                Math.sin(angle) * dist
                            );
                            
                            // Glowing cap
                            const cap = new THREE.Mesh(
                                new THREE.SphereGeometry(0.4, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
                                matMushroomGlow
                            );
                            cap.position.y = height;
                            cap.scale.y = 0.5;
                            stem.add(cap);
                            
                            // Add point light for glow effect
                            const light = new THREE.PointLight(0x88ffaa, 0.3, 5);
                            light.position.y = height;
                            stem.add(light);
                            
                            group.add(stem);
                        }
                    }
                    else if (rng > 0.50) {
                        // 3. BLUE CAP MUSHROOM - Magical blue fungi
                        const stem = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.4, 0.5, 2.5, 12),
                            matMushroomStem
                        );
                        stem.position.y = 1.25;
                        
                        // Wide flat cap
                        const cap = new THREE.Mesh(
                            new THREE.CylinderGeometry(2, 1.5, 0.8, 16),
                            matMushroomBlue
                        );
                        cap.position.y = 3;
                        
                        // Spiral pattern on cap
                        for(let k=0; k<12; k++) {
                            const angle = (k / 12) * Math.PI * 2;
                            const radius = 0.5 + (k / 12) * 1.2;
                            const dot = new THREE.Mesh(
                                new THREE.SphereGeometry(0.1, 6, 6),
                                matMushroomSpots
                            );
                            dot.position.set(
                                Math.cos(angle) * radius,
                                3.5,
                                Math.sin(angle) * radius
                            );
                            group.add(dot);
                        }
                        
                        group.add(stem, cap);
                    }
                    else if (rng > 0.33) {
                        // 4. PURPLE SHELF MUSHROOMS - Growing on old log
                        // Dead log
                        const log = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.6, 0.5, 3, 8),
                            matWood
                        );
                        log.rotation.z = Math.PI / 2;
                        log.position.set(0, 0.5, 0);
                        
                        // Moss on log
                        const moss = new THREE.Mesh(
                            new THREE.BoxGeometry(3, 0.2, 1.2),
                            matMoss
                        );
                        moss.position.y = 0.7;
                        
                        // Shelf mushrooms growing from side
                        for(let k=0; k<4; k++) {
                            const shelf = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.6, 0.1, 0.3, 12, 1, false, 0, Math.PI),
                                matMushroomPurple
                            );
                            shelf.rotation.x = -Math.PI / 2;
                            shelf.rotation.z = Math.PI / 2;
                            shelf.position.set(
                                -1 + k * 0.7,
                                0.5 + Math.random() * 0.3,
                                0.6
                            );
                            group.add(shelf);
                        }
                        
                        group.add(log, moss);
                    }
                    else if (rng > 0.17) {
                        // 5. FAIRY RING - Circle of small mushrooms
                        const ringRadius = 2;
                        const mushroomCount = 10;
                        
                        for(let k=0; k<mushroomCount; k++) {
                            const angle = (k / mushroomCount) * Math.PI * 2;
                            const x = Math.cos(angle) * ringRadius;
                            const z = Math.sin(angle) * ringRadius;
                            
                            const smallStem = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8),
                                matMushroomStem
                            );
                            smallStem.position.set(x, 0.25, z);
                            
                            const smallCap = new THREE.Mesh(
                                new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
                                matMushroomRed
                            );
                            smallCap.position.set(x, 0.55, z);
                            smallCap.scale.y = 0.6;
                            
                            // Random spot
                            if(Math.random() > 0.5) {
                                const spot = new THREE.Mesh(
                                    new THREE.SphereGeometry(0.08, 6, 6),
                                    matMushroomSpots
                                );
                                spot.position.set(x, 0.65, z);
                                group.add(spot);
                            }
                            
                            group.add(smallStem, smallCap);
                        }
                        
                        // Glowing center
                        const centerGlow = new THREE.Mesh(
                            new THREE.SphereGeometry(0.3, 12, 12),
                            matMushroomGlow
                        );
                        centerGlow.position.y = 0.3;
                        group.add(centerGlow);
                    }
                    else {
                        // 6. GIANT PUFFBALL - Spherical mushroom
                        const puffball = new THREE.Mesh(
                            new THREE.SphereGeometry(1.5, 16, 16),
                            new THREE.MeshStandardMaterial({ 
                                color: 0xf0e68c,
                                roughness: 0.95
                            })
                        );
                        puffball.position.y = 1.2;
                        puffball.scale.y = 0.8;
                        
                        // Texture bumps
                        for(let k=0; k<15; k++) {
                            const bump = new THREE.Mesh(
                                new THREE.SphereGeometry(0.15, 6, 6),
                                new THREE.MeshStandardMaterial({ 
                                    color: 0xdaa520,
                                    roughness: 1.0
                                })
                            );
                            const theta = Math.random() * Math.PI * 2;
                            const phi = Math.random() * Math.PI / 2;
                            bump.position.set(
                                Math.sin(phi) * Math.cos(theta) * 1.4,
                                1.2 + Math.cos(phi) * 1.2 * 0.8,
                                Math.sin(phi) * Math.sin(theta) * 1.4
                            );
                            group.add(bump);
                        }
                        
                        // Small stems at base
                        for(let k=0; k<3; k++) {
                            const baseAngle = (k / 3) * Math.PI * 2;
                            const baseStem = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8),
                                matMushroomStem
                            );
                            baseStem.position.set(
                                Math.cos(baseAngle) * 1.2,
                                0.2,
                                Math.sin(baseAngle) * 1.2
                            );
                            group.add(baseStem);
                        }
                        
                        group.add(puffball);
                    }
                }

                // ═══════════════════════════════════════════
                // 10. CANYON (DEFAULT) - COMPLETE REWORK
                // ═══════════════════════════════════════════
                else {
                    const rng = seededRandom();
                    
                    if (rng > 0.7) {
                        // SAGUARO CACTUS - Tall with arms
                        const main = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 8), matCactus);
                        main.position.y = 2.5;
                        
                        // Left arm
                        const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2, 8), matCactus);
                        arm1.position.set(-1, 3, 0);
                        arm1.rotation.z = Math.PI/2;
                        const arm1up = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8), matCactus);
                        arm1up.position.set(-2, 3.75, 0);
                        
                        // Right arm
                        const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8), matCactus);
                        arm2.position.set(1, 2.5, 0);
                        arm2.rotation.z = -Math.PI/2;
                        const arm2up = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2, 8), matCactus);
                        arm2up.position.set(1.75, 3.5, 0);
                        
                        // Flowers on top
                        const flower = new THREE.Mesh(
                            new THREE.ConeGeometry(0.3, 0.4, 8),
                            new THREE.MeshStandardMaterial({color: 0xff69b4, roughness: 0.5})
                        );
                        flower.position.y = 5.2;
                        
                        group.add(main, arm1, arm1up, arm2, arm2up, flower);
                    }
                    else if (rng > 0.5) {
                        // DESERT ROCK FORMATION - Layered sandstone
                        const layers = 4 + Math.floor(Math.random()*3);
                        for(let k=0; k<layers; k++) {
                            const width = 2.5 - k*0.3;
                            const layer = new THREE.Mesh(
                                new THREE.BoxGeometry(width, 0.8, width),
                                new THREE.MeshStandardMaterial({
                                    color: 0xd2691e - k*0x101010,
                                    roughness: 1.0
                                })
                            );
                            layer.position.y = k*0.8 + 0.4;
                            layer.rotation.y = k * 0.3;
                            group.add(layer);
                        }
                    }
                    else if (rng > 0.3) {
                        // TUMBLEWEED - Desert plant ball
                        const tumbleweed = new THREE.Mesh(
                            new THREE.IcosahedronGeometry(1, 1),
                            new THREE.MeshStandardMaterial({
                                color: 0x8b7355,
                                wireframe: true
                            })
                        );
                        tumbleweed.position.y = 1;
                        group.add(tumbleweed);
                    }
                    else if (rng > 0.15) {
                        // BARREL CACTUS - Round spiky plant
                        const body = new THREE.Mesh(
                            new THREE.SphereGeometry(1, 12, 8),
                            matCactus
                        );
                        body.scale.y = 0.7;
                        body.position.y = 0.7;
                        
                        // Spines (vertical ridges)
                        for(let k=0; k<12; k++) {
                            const angle = (k/12) * Math.PI * 2;
                            const spine = new THREE.Mesh(
                                new THREE.BoxGeometry(0.05, 1.4, 0.05),
                                new THREE.MeshStandardMaterial({color: 0xffffff})
                            );
                            spine.position.set(Math.cos(angle)*0.95, 0.7, Math.sin(angle)*0.95);
                            group.add(spine);
                        }
                        
                        // Flower on top
                        const flower = new THREE.Mesh(
                            new THREE.ConeGeometry(0.2, 0.3, 6),
                            matYellow
                        );
                        flower.position.y = 1.4;
                        
                        group.add(body, flower);
                    }
                    else {
                        // DESERT BONES - Skull decoration
                        const skull = new THREE.Mesh(
                            new THREE.SphereGeometry(0.6),
                            new THREE.MeshStandardMaterial({color: 0xf5f5dc, roughness: 0.9})
                        );
                        skull.scale.set(1, 0.8, 1);
                        skull.position.y = 0.5;
                        
                        // Eye sockets
                        const eye1 = new THREE.Mesh(
                            new THREE.SphereGeometry(0.15),
                            new THREE.MeshStandardMaterial({color: 0x000000})
                        );
                        eye1.position.set(-0.2, 0.5, 0.5);
                        const eye2 = eye1.clone();
                        eye2.position.set(0.2, 0.5, 0.5);
                        
                        // Horns
                        const horn1 = new THREE.Mesh(
                            new THREE.ConeGeometry(0.1, 0.5, 6),
                            new THREE.MeshStandardMaterial({color: 0xdeb887})
                        );
                        horn1.position.set(-0.5, 0.8, 0);
                        horn1.rotation.z = Math.PI/4;
                        const horn2 = horn1.clone();
                        horn2.position.set(0.5, 0.8, 0);
                        horn2.rotation.z = -Math.PI/4;
                        
                        group.add(skull, eye1, eye2, horn1, horn2);
                    }
                }

                scene.add(group);
                mapProps.push(group); // Add to mapProps so decorations are cleaned up when map changes
            }

            // ── BORDER LANDMARK PASS ─────────────────────────────────────────────────
            // A second scatter pass that places taller, more dramatic props exclusively
            // in the outer band (x > 90 or z > 65), giving depth to the horizon without
            // cluttering the play area. Uses the same seededRandom so it's deterministic.
            const borderCount = 30;
            for (let i = 0; i < borderCount; i++) {
                // Generate position in the outer band only
                const inX = seededRandom() > 0.5;
                const sign = seededRandom() > 0.5 ? 1 : -1;
                const x = inX
                    ? sign * (95 + seededRandom() * 25)
                    : (seededRandom() - 0.5) * 200;
                const z = inX
                    ? (seededRandom() - 0.5) * 150
                    : sign * (70 + seededRandom() * 20);

                const bg = new THREE.Group();
                bg.position.set(x, 0, z);
                bg.rotation.y = seededRandom() * Math.PI * 2;
                const bs = 1.2 + seededRandom() * 1.0;
                bg.scale.set(bs, bs, bs);

                // Pick a landmark based on map
                if (mapIndex === 0) {
                    // Canyon: tall sandstone spire
                    const layers = 5 + Math.floor(seededRandom() * 4);
                    for (let k = 0; k < layers; k++) {
                        const w = 2.5 - k * 0.3;
                        const m = new THREE.Mesh(
                            new THREE.CylinderGeometry(w*0.7, w, 4, 6),
                            new THREE.MeshStandardMaterial({color: 0xb5651d - k*0x080400, roughness:1})
                        );
                        m.position.y = k * 4 + 2;
                        bg.add(m);
                    }
                } else if (isFrozen) {
                    // Frozen: tall ice spire cluster
                    for (let k = 0; k < 4; k++) {
                        const h = 12 + seededRandom() * 20;
                        const sp = new THREE.Mesh(
                            new THREE.ConeGeometry(1 + seededRandom(), h, 6),
                            new THREE.MeshStandardMaterial({color:0xaaddff, transparent:true, opacity:0.8, metalness:0.4})
                        );
                        sp.position.set((seededRandom()-0.5)*4, h/2, (seededRandom()-0.5)*4);
                        sp.rotation.z = (seededRandom()-0.5)*0.2;
                        bg.add(sp);
                    }
                } else if (isVolcano) {
                    // Volcano: basalt column cluster
                    for (let k = 0; k < 5; k++) {
                        const h = 8 + seededRandom() * 18;
                        const col = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.8, 1.2, h, 6),
                            new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.4, metalness:0.3})
                        );
                        col.position.set((seededRandom()-0.5)*5, h/2, (seededRandom()-0.5)*5);
                        bg.add(col);
                        // Glowing base
                        const glow = new THREE.Mesh(
                            new THREE.CylinderGeometry(1.5, 1.5, 0.5, 6),
                            new THREE.MeshStandardMaterial({color:0xff4500, emissive:0xff4500, emissiveIntensity:1.5})
                        );
                        glow.position.set(col.position.x, 0.25, col.position.z);
                        bg.add(glow);
                    }
                } else if (isKitty) {
                    // Kitty: candy tree with spherical canopy
                    const trunk = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.6, 0.9, 8, 8),
                        new THREE.MeshStandardMaterial({color:0xff99bb, roughness:0.5})
                    );
                    trunk.position.y = 4;
                    const canopy = new THREE.Mesh(
                        new THREE.SphereGeometry(4 + seededRandom()*2, 10, 8),
                        new THREE.MeshStandardMaterial({color: seededRandom()>0.5?0xff66aa:0xff99cc, roughness:0.4})
                    );
                    canopy.position.y = 11;
                    bg.add(trunk, canopy);
                } else if (isVoid) {
                    // Void: floating shard
                    const shard = new THREE.Mesh(
                        new THREE.OctahedronGeometry(2 + seededRandom()*3),
                        new THREE.MeshStandardMaterial({color:0x220033, metalness:0.5, emissive:0x440066, emissiveIntensity:0.8})
                    );
                    shard.position.y = 5 + seededRandom() * 15;
                    shard.rotation.set(seededRandom()*Math.PI, seededRandom()*Math.PI, seededRandom()*Math.PI);
                    bg.add(shard);
                } else if (isCrystalCave) {
                    // Crystal: multi-spike cluster
                    for (let k = 0; k < 5; k++) {
                        const h = 8 + seededRandom() * 18;
                        const cry = new THREE.Mesh(
                            new THREE.ConeGeometry(0.8+seededRandom()*0.8, h, 6),
                            new THREE.MeshStandardMaterial({
                                color: k%2===0?0x9b59b6:0xaa44ff, transparent:true, opacity:0.85,
                                metalness:0.7, roughness:0.1, emissive:0x6600aa, emissiveIntensity:0.4
                            })
                        );
                        cry.position.set((seededRandom()-0.5)*4, h/2, (seededRandom()-0.5)*4);
                        cry.rotation.z = (seededRandom()-0.5)*0.3;
                        bg.add(cry);
                    }
                } else if (isNeonCity) {
                    // Neon: background skyscraper silhouette
                    const bh = 20 + seededRandom() * 40;
                    const bld = new THREE.Mesh(
                        new THREE.BoxGeometry(6 + seededRandom()*6, bh, 6 + seededRandom()*4),
                        new THREE.MeshStandardMaterial({color:0x080818, roughness:0.3, metalness:0.6})
                    );
                    bld.position.y = bh / 2;
                    // Neon edge glow
                    const glowColor = [0x00ffff,0xff00ff,0x00ff88,0xff0080][Math.floor(seededRandom()*4)];
                    const edge = new THREE.Mesh(
                        new THREE.BoxGeometry(0.3, bh, 0.3),
                        new THREE.MeshStandardMaterial({color:glowColor, emissive:glowColor, emissiveIntensity:2})
                    );
                    edge.position.set(3, bh/2, 3);
                    bg.add(bld, edge);
                } else if (isToxicSwamp) {
                    // Swamp: dead tree
                    const trunk = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.5, 0.9, 10 + seededRandom()*8, 6),
                        new THREE.MeshStandardMaterial({color:0x1a1000, roughness:1})
                    );
                    trunk.position.y = 6;
                    bg.add(trunk);
                    for (let k = 0; k < 4; k++) {
                        const br = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.15, 0.3, 4+seededRandom()*3, 5),
                            new THREE.MeshStandardMaterial({color:0x120a00, roughness:1})
                        );
                        br.position.set((seededRandom()-0.5)*3, 9+k*2, (seededRandom()-0.5)*3);
                        br.rotation.z = (seededRandom()-0.5)*0.8;
                        bg.add(br);
                    }
                } else if (isSpaceStation) {
                    // Space: satellite dish or antenna
                    const pole = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.3, 0.4, 10, 8),
                        new THREE.MeshStandardMaterial({color:0x95a5a6, metalness:0.9, roughness:0.2})
                    );
                    pole.position.y = 5;
                    const dish = new THREE.Mesh(
                        new THREE.SphereGeometry(3, 12, 8, 0, Math.PI*2, 0, Math.PI*0.5),
                        new THREE.MeshStandardMaterial({color:0xbdc3c7, metalness:0.8, roughness:0.3})
                    );
                    dish.position.y = 10.5;
                    dish.rotation.x = Math.PI*0.6;
                    bg.add(pole, dish);
                } else if (isFarm) {
                    // Farm: tall sunflower or windmill
                    if (seededRandom() > 0.5) {
                        // Sunflower
                        const stem = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.2, 0.3, 8, 6),
                            new THREE.MeshStandardMaterial({color:0x2ecc71, roughness:0.9})
                        );
                        stem.position.y = 4;
                        const head = new THREE.Mesh(
                            new THREE.CylinderGeometry(1.5, 1.5, 0.5, 12),
                            new THREE.MeshStandardMaterial({color:0x4a2800, roughness:0.8})
                        );
                        head.position.y = 8.5;
                        for (let p = 0; p < 12; p++) {
                            const petal = new THREE.Mesh(
                                new THREE.BoxGeometry(1, 0.2, 0.5),
                                new THREE.MeshStandardMaterial({color:0xf1c40f})
                            );
                            const pa = (p/12)*Math.PI*2;
                            petal.position.set(Math.cos(pa)*2, 8.5, Math.sin(pa)*2);
                            petal.rotation.y = pa;
                            bg.add(petal);
                        }
                        bg.add(stem, head);
                    } else {
                        // Windmill
                        const wmBase = new THREE.Mesh(
                            new THREE.CylinderGeometry(2, 3, 14, 8),
                            new THREE.MeshStandardMaterial({color:0xf5f5f5, roughness:0.9})
                        );
                        wmBase.position.y = 7;
                        bg.add(wmBase);
                        for (let b2 = 0; b2 < 4; b2++) {
                            const blade = new THREE.Mesh(
                                new THREE.BoxGeometry(0.6, 7, 0.3),
                                new THREE.MeshStandardMaterial({color:0xdddddd, roughness:0.8})
                            );
                            blade.position.set(Math.cos(b2*Math.PI/2)*4, 14+Math.sin(b2*Math.PI/2)*4, 0.5);
                            blade.rotation.z = b2*Math.PI/2;
                            bg.add(blade);
                        }
                    }
                } else if (isJungle) {
                    // Jungle: massive temple column or jungle tree
                    if (seededRandom() > 0.4) {
                        const h = 16 + seededRandom() * 10;
                        const col = new THREE.Mesh(
                            new THREE.CylinderGeometry(1.8, 2.2, h, 8),
                            new THREE.MeshStandardMaterial({color:0x7a7a7a, roughness:0.9})
                        );
                        col.position.y = h/2;
                        const cap = new THREE.Mesh(
                            new THREE.BoxGeometry(5, 1.5, 5),
                            new THREE.MeshStandardMaterial({color:0x606060, roughness:1})
                        );
                        cap.position.y = h + 0.75;
                        bg.add(col, cap);
                    } else {
                        const trunk = new THREE.Mesh(
                            new THREE.CylinderGeometry(1, 1.8, 14, 8),
                            new THREE.MeshStandardMaterial({color:0x3d1f00, roughness:1})
                        );
                        trunk.position.y = 7;
                        const canopy = new THREE.Mesh(
                            new THREE.SphereGeometry(6+seededRandom()*3, 10, 8),
                            new THREE.MeshStandardMaterial({color:seededRandom()>0.5?0x1a5c1a:0x2d7a2d, roughness:0.9})
                        );
                        canopy.scale.y = 0.7;
                        canopy.position.y = 17;
                        bg.add(trunk, canopy);
                    }
                } else if (isMushroom) {
                    // Mushroom: giant border mushroom
                    const stemH = 14 + seededRandom() * 12;
                    const capR  = 7 + seededRandom() * 5;
                    const musColors = [0xff4444,0x4488ff,0x9966ff,0xff8844];
                    const mc = musColors[Math.floor(seededRandom()*musColors.length)];
                    const stem = new THREE.Mesh(
                        new THREE.CylinderGeometry(1.2, 2, stemH, 10),
                        new THREE.MeshStandardMaterial({color:0xf5f5dc, roughness:0.8})
                    );
                    stem.position.y = stemH/2;
                    const cap = new THREE.Mesh(
                        new THREE.SphereGeometry(capR, 12, 8, 0, Math.PI*2, 0, Math.PI*0.55),
                        new THREE.MeshStandardMaterial({color:mc, roughness:0.6, emissive:mc, emissiveIntensity:0.3})
                    );
                    cap.position.y = stemH + capR*0.25;
                    bg.add(stem, cap);
                } else {
                    // Default (canyon) fallback: rock pillar
                    const h = 8 + seededRandom() * 15;
                    const rock = new THREE.Mesh(
                        new THREE.CylinderGeometry(1.5, 2.5, h, 6),
                        new THREE.MeshStandardMaterial({color:0xa0522d, roughness:1})
                    );
                    rock.position.y = h/2;
                    bg.add(rock);
                }

                scene.add(bg);
                mapProps.push(bg);
            }
        }

	function createStarfield() {
            const starGeo = new THREE.BufferGeometry();
            const starCount = graphicsMode === 2 ? 2000 : (graphicsMode === 1 ? 1000 : 500);
            const posArray = new Float32Array(starCount * 3);
            
            for(let i=0; i<starCount * 3; i++) {
                // Spread stars far away (between 400 and 800 units)
                posArray[i] = (Math.random() - 0.5) * 1600; 
            }
            
            starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            
            // White stars that ignore light/shadows
            const starMat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: graphicsMode === 2 ? 2.0 : 1.5,
                transparent: true,
                opacity: graphicsMode === 0 ? 0.5 : 0.8
            });
            
            const starMesh = new THREE.Points(starGeo, starMat);
            starMesh.position.y = 50; // Lift them up a bit
            scene.add(starMesh);
            window.starfield = starMesh; // Store for animations
        }
        
        // Atmospheric Particles (Dust, Embers, Snow, etc.)
        function createAtmosphericParticles(mapIndex) {
            if (graphicsMode === 0) return; // Skip on low settings
            
            // Remove old particles
            if (window.atmosphericParticles) {
                scene.remove(window.atmosphericParticles);
            }
            
            const particleCount = graphicsMode === 2 ? 500 : 200;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            
            // Flat Float32Array for velocities — same layout as positions for cache efficiency
            // Game.js update loop reads vel[i], vel[i+1], vel[i+2] matching pos[i], pos[i+1], pos[i+2]
            const velocities_f32 = new Float32Array(particleCount * 3);
            for(let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                positions[i3]   = (Math.random() - 0.5) * 200;
                positions[i3+1] = Math.random() * 100;
                positions[i3+2] = (Math.random() - 0.5) * 200;
                velocities_f32[i3]   = (Math.random() - 0.5) * 0.1;
                velocities_f32[i3+1] = (Math.random() - 0.5) * 0.1;
                velocities_f32[i3+2] = (Math.random() - 0.5) * 0.1;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            // Different particles per map
            let color, size;
            if (mapIndex === 1) { // Frozen - Snowflakes
                color = 0xffffff;
                size = 0.5;
            } else if (mapIndex === 2) { // Volcano - Embers
                color = 0xff6600;
                size = 0.3;
            } else if (mapIndex === 5) { // Crystal Cave - Glowing dust
                color = 0xaa00ff;
                size = 0.4;
            } else if (mapIndex === 7) { // Toxic Swamp - Green spores
                color = 0x00ff00;
                size = 0.3;
            } else if (mapIndex === 10) { // Jungle - Fireflies
                color = 0xffff00;
                size = 0.4;
            } else { // Default - Dust
                color = 0xcccccc;
                size = 0.2;
            }
            
            const material = new THREE.PointsMaterial({
                color: color,
                size: size,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            
            const particleSystem = new THREE.Points(geometry, material);
            scene.add(particleSystem);
            
            window.atmosphericParticles = particleSystem;
            window.particleVelocities = velocities_f32;
        }

// --- Spawn and damage functions ---
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

        function spawnEnemy(typeKey, remoteId = null) {
            unlockEnemy(typeKey);
            const def = ENEMIES[typeKey];
            let hpMult = (def.type === 'boss') ? 0.6 : 1.0; 
            
            // --- FIX: Scale HP every 5 waves (Stepped Difficulty) ---
            // Old Logic: (1 + wave * 0.2) -> Multiplier 5.0x at Wave 20
            // New Logic: Updates only at wave 5, 10, 15, etc.
            // Wave 1-4: 1.0x | Wave 5-9: 1.5x | Wave 20: 3.0x
            
            const difficultyStep = Math.floor(wave / 5); 
            const waveScaling = 1 + (difficultyStep * 0.5); // +50% HP every 5 waves
            
            const hp = Math.floor(def.hp * hpMult * waveScaling * GAME_CONFIG.hpMult);
            // --------------------------------------------------------
            
            // 1. Assign ID
            const id = remoteId || (Date.now() + Math.random());

            // 2. Host tells Joiner to spawn the SAME enemy
            if(socket && myRoomId && myRole === 'host' && !remoteId) {
                socket.emit('gameAction', { type: 'spawn', roomId: myRoomId, typeKey, enemyId: id });
            }

            // GEOMETRY VARIATIONS
            // --- NEW MODEL SYSTEM ---
            const mesh = createEnemyModel(typeKey, def.color, def.size);
            mesh.position.copy(currentWaypoints[0]);
            
            // Store the "Main Color" on the group so we can read it later for explosions
            mesh.userData.mainColor = def.color;
            
            scene.add(mesh);
            // ------------------------

            const hpGroup = new THREE.Group();
            const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.3), new THREE.MeshBasicMaterial({color:0x000000}));
            const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.2), new THREE.MeshBasicMaterial({color:0x00ff00}));
            fg.position.z = 0.05; fg.geometry.translate(0.9, 0, 0); fg.position.x = -0.9;
            hpGroup.add(bg, fg);
            scene.add(hpGroup);

            enemies.push({ 
                id, mesh, hpGroup, fg, hp, maxHp: hp, speed: def.speed, 
                pathIdx: 1, slowTime: 0, stunned: 0, score: def.score,
                hpHeight: mesh.userData.hpOffset || 2.5,
                abilityCooldown: 0,
                abilityType: def.ability || null
            });
        }

        function triggerFlash(e) {
            if(!e || !e.mesh) return;
            
            // Traverse the group and flash every mesh inside
            e.mesh.traverse(child => {
                if(child.isMesh && child.material && child.material.emissive) {
                    // Save old emissive if you want perfection, but hard-setting is fine for flash
                    child.currentHex = child.material.emissive.getHex();
                    child.material.emissive.setHex(0xffffff);
                }
            });

            setTimeout(()=> { 
                if(e.mesh) {
                    e.mesh.traverse(child => {
                        if(child.isMesh && child.material && child.material.emissive) {
                            child.material.emissive.setHex(0);
                        }
                    });
                }
            }, 50);
        }

        function damageEnemy(e, dmg, splash, slow, stunDuration = 0, sourceTower = null) {
            // Safety check: if enemy is already dead/removed, stop.
            if(!e || e.hp <= 0) return;

            if(splash) {
                // Splash Logic: Hit everything in range
                enemies.forEach(sub => {
                    if(sub.mesh.position.distanceTo(e.mesh.position) < splash) {
                        applyDmg(sub, dmg, slow, stunDuration, sourceTower);
                    }
                });
            } else {
                // Single Target Logic
                applyDmg(e, dmg, slow, stunDuration, sourceTower);
            }
        }

        function applyDmg(e, dmg, slow, stun, sourceTower) {
            if(!e || e.hp <= 0) return; // Stop if already dead

	    if (typeof getSkillMultipliers === 'function') {
        	const mults = getSkillMultipliers();
        	dmg *= mults.damage;
    	    }

            e.hp -= dmg;
            
            // Track damage for daily challenges, achievements, and stats
            if (typeof sessionStats !== 'undefined') {
                sessionStats.damage += dmg;
            }
            if (typeof lifetimeStats !== 'undefined') {
                lifetimeStats.totalDamage = (lifetimeStats.totalDamage || 0) + dmg;
            }
            // ✅ FIX: Actually call challenge tracker so damage challenges count
            if (typeof window.trackChallengeProgress === 'function') {
                window.trackChallengeProgress('damage', dmg);
            }
            // ✅ FIX: Check achievements periodically for damage milestones
            if (typeof window.checkAchievements === 'function' && Math.random() < 0.05) {
                window.checkAchievements();
            }
            
            // 1. Damage Text
            if(dmgTextEnabled && gameRunning && (!socket || myRole === 'host')) {
                const isCrit = dmg > 40;
                createFloatingText("-" + Math.floor(dmg), e.mesh.position, isCrit ? "#e74c3c" : "#fff");
                
                // Sync Text to Clients
                if(socket && myRoomId && myRole === 'host') {
                    socket.emit('gameAction', { 
                        type: 'visual_effect', effect: 'dmg_text', roomId: myRoomId, 
                        x: e.mesh.position.x, z: e.mesh.position.z, val: Math.floor(dmg), crit: isCrit 
                    });
                }
            }
            
            if(slow) e.slowTime = 1.0; 
            if(stun > 0) e.stunned = stun;
            
            triggerFlash(e);

            // Update Health Bar
            if(e.fg) {
                const pct = Math.max(0, e.hp / e.maxHp);
                e.fg.scale.x = pct;
                e.fg.material.color.setHSL(pct * 0.3, 1, 0.5);
            }

            // --- KILL LOGIC ---
            if(e.hp <= 0) {
                // 1. Remove from Scene & Array
                scene.remove(e.mesh); 
                if(e.hpGroup) scene.remove(e.hpGroup);
                enemies = enemies.filter(x => x !== e);
                
		// NEW: Track Destroys
                if (sourceTower) {
                    sourceTower.destroys = (sourceTower.destroys || 0) + 1;
                }
		
		// ✅ CRITICAL: Track enemy destroyed for achievements
                if (typeof window.trackEnemyDestroyed === 'function') {
                    window.trackEnemyDestroyed(e.score || 0);
                }
		
                // 2. SHATTER EFFECT (The Fix)
                createShatter(e.mesh.position, e.mesh.userData.mainColor || 0xff0000, 8);
                AudioSys.shoot('explosion');
                createFloatingText("+$" + e.score, e.mesh.position.clone().add(new THREE.Vector3(0,4,0)), "#f1c40f");

                // 2.5 UPDATE SESSION STATS
                const killStat = document.getElementById('stat-destroys');
                if (killStat) {
                    killStat.innerText = parseInt(killStat.innerText || 0) + 1;
                }

                // 3. INCOME LOGIC (The Fix)
                if(currentGamemode === 'shared') {
                    gold += e.score;
                    
                    // Achievement & XP tracking
                    trackKill();
                    trackGoldEarned(e.score);
                    if (typeof window.addXP === 'function') window.addXP(5);
                    if (typeof window.trackEnemyDestroyed === 'function') window.trackEnemyDestroyed(e.score);
                } else {
                    // Split gold among players (separate wallets mode)
                    const pCount = (allPlayers && allPlayers.length > 0) ? allPlayers.length : 1;
                    const share = Math.floor(e.score / pCount);
                    
                    if(allPlayers.length > 0) {
                        for(let i=0; i<4; i++) {
                            if(i < allPlayers.length) playerWallets[i] += share;
                        }
                    } else {
                        playerWallets[0] += e.score;
                    }
                    
                    // FORCE UPDATE LOCAL DISPLAY IMMEDIATELY
                    gold = playerWallets[myPlayerIndex];
                    
                    // XP tracking — also grant XP in separate mode (was missing before)
                    trackKill();
                    trackGoldEarned(e.score);
                    if (typeof window.addXP === 'function') window.addXP(5);
                    if (typeof window.trackEnemyDestroyed === 'function') window.trackEnemyDestroyed(e.score);
                }
                
                // FIX: Sync wallets to all players immediately after enemy destroy
                if(socket && myRoomId && myRole === 'host') {
                    socket.emit('gameAction', { 
                        type: 'wallet_update', 
                        roomId: myRoomId, 
                        wallets: playerWallets,
                        gold: gold,
                        mode: currentGamemode
                    });
                }
                
                // 4. Cleanup
                if(e.id === selectedEnemyId) { selectedEnemyId=null; document.getElementById('inspect-panel').style.display='none'; }
                unlockEnemy(e.type);
                updateUI();
            }
        }

	// --- NEW HELPER: Auto-Centers any model ---
        function centerModel(mesh) {
            // 1. Calculate the bounding box of the model
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            
            // 2. Shift the mesh opposite to its center offset
            // This forces the "Middle" of the model to sit exactly at (0,0,0)
            mesh.position.x -= center.x;
            mesh.position.y -= center.y;
            mesh.position.z -= center.z;
            
            return mesh;
        }

        // --- BUILDING ---