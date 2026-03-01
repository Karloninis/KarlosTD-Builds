// ============================================================================
// Projectiles.js - Visual effects: explosions, particles, impacts, floating text
// ============================================================================

        function createFloatingText(text, pos, color) {
            const canvas = document.createElement('canvas'); 
            const ctx = canvas.getContext('2d');
            canvas.width=128; canvas.height=64; 
            ctx.font="Bold 40px Arial"; 
            ctx.fillStyle=color; 
            ctx.textAlign="center"; 
            ctx.strokeStyle="black"; 
            ctx.lineWidth=4;
            ctx.strokeText(text,64,48); 
            ctx.fillText(text,64,48);
            
            const tex = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({map:tex, transparent:true});
            const sprite = new THREE.Sprite(mat);
            sprite.position.copy(pos); 
            sprite.scale.set(6,3,1);
            
            scene.add(sprite);
            particles.push({ mesh: sprite, life: 1.5, type: 'floating_text', vel: new THREE.Vector3(0,0,0) });
        }

        function createParticles(pos, count, color) {
            const mat = new THREE.MeshBasicMaterial({color});
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            for(let i=0; i<count; i++) {
                const m = new THREE.Mesh(geo, mat);
                m.position.copy(pos); m.position.x += (Math.random()-0.5)*2; m.position.z += (Math.random()-0.5)*2;
                scene.add(m);
                particles.push({ mesh: m, vel: new THREE.Vector3((Math.random()-0.5), Math.random()*0.5, (Math.random()-0.5)), life: 0.5 });
            }
        }

        // --- NEW VFX SYSTEMS ---
        
        // 1. Muzzle Flash (Bright expand/fade at barrel)
        function createMuzzleFlash(pos, color) {
            if(graphicsMode === 0) return; // Skip on Low settings
            
            const geo = new THREE.PlaneGeometry(1.5, 1.5);
            const mat = new THREE.MeshBasicMaterial({
                color: color, 
                transparent: true, 
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.lookAt(camera.position); // Billboard
            mesh.rotation.z = Math.random() * Math.PI; // Random rotation
            
            scene.add(mesh);
            
            // Flash is very short-lived
            particles.push({ 
                mesh: mesh, 
                life: 0.08, 
                type: 'flash',
                onUpdate: (p, dt) => {
                    p.mesh.scale.multiplyScalar(1.2); // Expand
                    p.mesh.material.opacity -= dt * 10; // Fade fast
                }
            });
        }

        // 2. Impact Sparks (Directional spray)
        function createImpact(pos, color, count=5) {
            if(graphicsMode === 0) return;
            
            const geo = new THREE.BoxGeometry(0.15, 0.15, 0.4);
            const mat = new THREE.MeshBasicMaterial({ color: color });
            
            for(let i=0; i<count; i++) {
                const m = new THREE.Mesh(geo, mat);
                m.position.copy(pos);
                m.lookAt(pos.clone().add(new THREE.Vector3(Math.random()-0.5, Math.random(), Math.random()-0.5)));
                scene.add(m);
                
                particles.push({
                    mesh: m,
                    life: 0.3 + Math.random() * 0.2,
                    vel: new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5),
                    isPhysics: true // Use gravity logic
                });
            }
        }

        // 3. Upgraded Explosion (Ring + Debris)
        function createExplosion(pos, color, radius) {
            addTrauma(0.4);
            AudioSys.noise(0.5, 0.4, 600); 

            // A. The Core Sphere (Flash) - Brighter and bigger
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 1.2, 16, 16), 
                new THREE.MeshBasicMaterial({ 
                    color: color, 
                    transparent: true, 
                    opacity: 1.0 
                })
            );
            sphere.position.copy(pos);
            scene.add(sphere);
            particles.push({ mesh: sphere, life: 0.3, type: 'expand_fade' });

            // B. The Shockwave Ring
            if(graphicsMode > 0) {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(0.1, 0.5, 32),
                    new THREE.MeshBasicMaterial({ 
                        color: color, 
                        transparent: true, 
                        opacity: 0.8, 
                        side: THREE.DoubleSide 
                    })
                );
                ring.position.copy(pos);
                ring.rotation.x = -Math.PI/2;
                scene.add(ring);
                
                particles.push({ 
                    mesh: ring, 
                    life: 0.4, 
                    type: 'shockwave',
                    maxSize: radius * 3.0 
                });
                
                // C. NEW: Fire particles shooting outward
                if(graphicsMode === 2) {
                    for(let i=0; i<12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const spark = new THREE.Mesh(
                            new THREE.BoxGeometry(0.3, 0.3, 0.8),
                            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
                        );
                        spark.position.copy(pos);
                        spark.lookAt(
                            pos.x + Math.cos(angle),
                            pos.y,
                            pos.z + Math.sin(angle)
                        );
                        scene.add(spark);
                        
                        particles.push({
                            mesh: spark,
                            life: 0.4,
                            vel: new THREE.Vector3(
                                Math.cos(angle) * 0.5,
                                Math.random() * 0.3,
                                Math.sin(angle) * 0.5
                            )
                        });
                    }
                }
            }
        }
	
	function createShatter(pos, color, count) {
            for(let i=0; i<count; i++) {
                const size = 0.3 + Math.random() * 0.4;
                const geo = new THREE.BoxGeometry(size, size, size);
                const mat = new THREE.MeshBasicMaterial({ color: color });
                const mesh = new THREE.Mesh(geo, mat);
                
                mesh.position.copy(pos);
                // Random offset
                mesh.position.x += (Math.random() - 0.5);
                mesh.position.y += (Math.random() - 0.5);
                mesh.position.z += (Math.random() - 0.5);
                
                // Random rotation
                mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                
                scene.add(mesh);
                
                // Add to particles array with physics
                particles.push({
                    mesh: mesh,
                    life: 1.0 + Math.random() * 0.5,
                    vel: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.8,
                        Math.random() * 0.8 + 0.2, // Pop up
                        (Math.random() - 0.5) * 0.8
                    ),
                    rotVel: new THREE.Vector3(
                        (Math.random()-0.5) * 0.2,
                        (Math.random()-0.5) * 0.2,
                        (Math.random()-0.5) * 0.2
                    ),
                    isPhysics: true // Use gravity
                });
            }
            
            // Sync Shatter to Clients
            if(socket && myRoomId && myRole === 'host') {
                socket.emit('gameAction', { 
                    type: 'visual_effect', effect: 'shatter', roomId: myRoomId, 
                    x: pos.x, z: pos.z, color: color, count: count 
                });
            }
        }
	
	// Added 'color' parameter with default red
        function showLocalError(msg, color = '#e74c3c') {
            AudioSys.tone(150, 'sawtooth', 0.2, 0.2);

            const err = document.createElement('div');
            err.innerText = msg;
            err.style.position = 'absolute';
            err.style.color = color; // Use the custom color
            // ... (keep the rest of the styling logic below)
            err.style.fontFamily = 'Orbitron, sans-serif';
            err.style.fontWeight = 'bold';
            err.style.fontSize = '24px';
            err.style.top = '40%';
            err.style.left = '50%';
            err.style.transform = 'translate(-50%, -50%)';
            err.style.textShadow = '0 0 10px black';
            err.style.pointerEvents = 'none';
            err.style.zIndex = '2000';
            err.style.transition = 'all 1s ease';
            document.body.appendChild(err);

            setTimeout(() => {
                err.style.opacity = '0';
                err.style.transform = 'translate(-50%, -100%)';
            }, 50);

            setTimeout(() => err.remove(), 1000);
        }

	function balanceMapGrid() {
            // 1. Get the map list container
            const container = document.querySelector('#level-select .map-container');
            if(!container) return;
            
            // 2. Count the maps
            const cards = container.querySelectorAll('.map-card');
            const count = cards.length;
            if(count === 0) return;

            // 3. Calculate "Symmetrical" Columns
            // Limit cols to reasonable range (3-8) to prevent layout issues
            const rawCols = Math.ceil(count / 2);
            const cols = Math.max(3, Math.min(8, rawCols));
            
            // 4. Force the Width
            // Width = (cols * 240px card) + ((cols - 1) * 25px gap)
            // We add 20px padding just to be safe
            const targetWidth = (cols * 240) + ((cols - 1) * 25) + 20;
            
            container.style.maxWidth = targetWidth + 'px';
        }