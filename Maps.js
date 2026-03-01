// ============================================================================
// Maps.js - Level data and map definitions
// ============================================================================

        const MAPS = [
            {
                name: "Canyon Crossing",
                track: 'canyon',
                floorColor: 0x1e272e,
                path: [
                    new THREE.Vector3(-60, 0, -32), new THREE.Vector3(-20, 0, -32),
                    new THREE.Vector3(-20, 0, 12), new THREE.Vector3(20, 0, 12),
                    new THREE.Vector3(20, 0, -12), new THREE.Vector3(60, 0, -12),
                    new THREE.Vector3(60, 0, 32), new THREE.Vector3(-60, 0, 32)
                ]
            },
            {
                name: "Frozen Route",
                track: 'frozen',
                floorColor: 0x2c3e50,
                path: [
                    new THREE.Vector3(-60, 0, 40), new THREE.Vector3(-60, 0, -20),
                    new THREE.Vector3(-20, 0, -20), new THREE.Vector3(-20, 0, 20),
                    new THREE.Vector3(20, 0, 20), new THREE.Vector3(20, 0, -20),
                    new THREE.Vector3(60, 0, -20), new THREE.Vector3(60, 0, 40)
                ]
            },
{
                name: "Volcanic Core",
                track: 'volcano',
                floorColor: 0x1a0f0f, // Very dark red/black
                path: [
                    new THREE.Vector3(-70, 0, -40), 
                    new THREE.Vector3(0, 0, -20),   // Zig
                    new THREE.Vector3(-50, 0, 0),   // Zag
                    new THREE.Vector3(50, 0, 0),    // Zig
                    new THREE.Vector3(0, 0, 20),    // Zag
                    new THREE.Vector3(70, 0, 40)
                ]
            },
		{
                name: "Kitty Kingdom",
                track: 'kitty',
                floorColor: 0xffe6ea, 
                path: [
                    // Fixed coordinates to be multiples of 4 (Grid Size)
                    new THREE.Vector3(-72, 0, 40), 
                    new THREE.Vector3(-28, 0, 40),
                    new THREE.Vector3(-28, 0, -20), 
                    new THREE.Vector3(28, 0, -20),  
                    new THREE.Vector3(28, 0, 20),   
                    new THREE.Vector3(-8, 0, 20),  
                    new THREE.Vector3(-8, 0, -40), 
                    new THREE.Vector3(72, 0, -40)
                ]
            },
		{
                name: "The Void",
                track: 'void',
                floorColor: 0x0a0a0a, // Almost pitch black
                path: [
                    // A perfect straight line from Left to Right
                    new THREE.Vector3(-100, 0, 0), 
                    new THREE.Vector3(100, 0, 0)
                ]
            },
            {
                name: "Crystal Caves",
                track: 'cave',
                floorColor: 0x1a0b2e, // Deep Purple
                path: [
                    // Start (Left) - Uses -90 (Center of tile)
                    new THREE.Vector3(-92, 0, -52),
                    
                    // First Loop (Up)
                    new THREE.Vector3(-52, 0, -52), 
                    new THREE.Vector3(-52, 0, 52),   

                    // Second Loop (Down)
                    new THREE.Vector3(-12, 0, 52),
                    new THREE.Vector3(-12, 0, -52),

                    // Third Loop (Up)
                    new THREE.Vector3(32, 0, -52),
                    new THREE.Vector3(32, 0, 52),

                    // Fourth Loop (Down)
                    new THREE.Vector3(72, 0, 52),
                    new THREE.Vector3(72, 0, -52),

                    // End (Right) - Uses 90 (Center of tile)
                    new THREE.Vector3(92, 0, -52)
                ]
            },
            {
                name: "Neon City",
                track: 'city',
                floorColor: 0x0f0f2e, // Dark cyber blue
                path: [
                    new THREE.Vector3(-80, 0, 40),
                    new THREE.Vector3(-40, 0, 40),
                    new THREE.Vector3(-40, 0, -10),
                    new THREE.Vector3(0, 0, -10),
                    new THREE.Vector3(0, 0, 20),
                    new THREE.Vector3(40, 0, 20),
                    new THREE.Vector3(40, 0, -40),
                    new THREE.Vector3(80, 0, -40)
                ]
            },
            {
                name: "Toxic Swamp",
                track: 'swamp',
                floorColor: 0x1a2a1a, // Dark green
                path: [
                    new THREE.Vector3(-90, 0, 20),
                    new THREE.Vector3(-50, 0, -20),
                    new THREE.Vector3(-10, 0, 20),
                    new THREE.Vector3(30, 0, -20),
                    new THREE.Vector3(70, 0, 20),
                    new THREE.Vector3(90, 0, 40)
                ]
            },
            {
                name: "Space Station",
                track: 'space',
                floorColor: 0x0a0a1a, // Deep space black
                path: [
                    new THREE.Vector3(-60, 0, -40),
                    new THREE.Vector3(0, 0, -40),
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(-40, 0, 0),
                    new THREE.Vector3(-40, 0, 30),
                    new THREE.Vector3(40, 0, 30),
                    new THREE.Vector3(40, 0, -10),
                    new THREE.Vector3(60, 0, -10),
                    new THREE.Vector3(60, 0, 40)
                ]
            }
        ,
            {
                name: "Harvest Valley",
                track: 'farm',
                floorColor: 0x8b7355, // Brown/tan dirt color
                path: [
                    // Winding farm path through fields (ALL MULTIPLES OF 4)
                    new THREE.Vector3(-80, 0, 40),
                    new THREE.Vector3(-40, 0, 40),
                    new THREE.Vector3(-40, 0, 0),
                    new THREE.Vector3(-60, 0, 0),
                    new THREE.Vector3(-60, 0, -32),
                    new THREE.Vector3(0, 0, -32),
                    new THREE.Vector3(0, 0, 12),
                    new THREE.Vector3(40, 0, 12),
                    new THREE.Vector3(40, 0, -40),
                    new THREE.Vector3(80, 0, -40)
                ]
            },
            {
                name: "Jungle Temple",
                track: 'jungle',
                floorColor: 0x2d4a2b, // Dark jungle green
                path: [
                    // Winding river through dense jungle (ALL MULTIPLES OF 4)
                    new THREE.Vector3(-80, 0, -40),
                    new THREE.Vector3(-52, 0, -20),
                    new THREE.Vector3(-52, 0, 20),
                    new THREE.Vector3(-20, 0, 20),
                    new THREE.Vector3(-20, 0, -12),
                    new THREE.Vector3(12, 0, -12),
                    new THREE.Vector3(12, 0, 28),
                    new THREE.Vector3(40, 0, 28),
                    new THREE.Vector3(40, 0, -20),
                    new THREE.Vector3(68, 0, -20),
                    new THREE.Vector3(68, 0, 40),
                    new THREE.Vector3(92, 0, 40)
                ]
            },
            {
                name: "Mushroom Forest",
                track: 'mushroom',
                floorColor: 0x3d2817, // Dark forest floor brown
                path: [
                    // Medium difficulty: Moderate length with curves (not too many corners)
                    // Winding forest path through giant mushrooms
                    new THREE.Vector3(-84, 0, -32),
                    new THREE.Vector3(-48, 0, -32),
                    new THREE.Vector3(-48, 0, 16),
                    new THREE.Vector3(-16, 0, 16),
                    new THREE.Vector3(-16, 0, -24),
                    new THREE.Vector3(24, 0, -24),
                    new THREE.Vector3(24, 0, 20),
                    new THREE.Vector3(56, 0, 20),
                    new THREE.Vector3(56, 0, -36),
                    new THREE.Vector3(88, 0, -36)
                ]
            }];

	function loadCustomIcons() {
            // 1. Link Towers
            Object.keys(TOWERS).forEach(key => {
                // This tells the game: "The icon for 'gunner' is at 'assets/towers/gunner.png'"
                TOWER_ICONS[key] = `assets/towers/${key}.png`;
            });

            // 2. Link Enemies
            Object.keys(ENEMIES).forEach(key => {
                // Special check for spaces (e.g. 'shadow interceptor' -> 'shadow%20interceptor.png')
                // But usually browsers handle spaces fine locally.
                ENEMY_ICONS[key] = `assets/enemies/${key}.png`;
            });
            
            // Note: Icon preloading removed since almanac feature was deleted
            // Icons are only loaded when actually needed by the UI
        }