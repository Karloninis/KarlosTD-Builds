// ============================================================================
// MAP EDITOR INTEGRATION GUIDE
// ============================================================================
// This file explains how to integrate the Map Creator System into your game

// ============================================================================
// STEP 1: ADD DEPENDENCIES TO index.html
// ============================================================================

/*
1. Add LZ-String library for compression (for share codes):

<script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js"></script>

2. Add the map creator system script:

<script src="map-creator-system.js"></script>

3. Insert the map-editor-ui.html content into your index.html body
*/

// ============================================================================
// STEP 2: ADD "MAP CREATOR" BUTTON TO MAIN MENU
// ============================================================================

/*
Add this button to your main menu in index.html:

<button class="btn" style="width: 200px;" onclick="openMapEditor()">
    🗺️ MAP CREATOR
</button>
*/

// ============================================================================
// STEP 3: CREATE EDITOR INITIALIZATION FUNCTION
// ============================================================================

function openMapEditor() {
    console.log('🗺️ Opening Map Creator...');
    
    // Hide main menu
    hideAllScreens();
    
    // Show editor UI
    document.getElementById('map-editor-ui').classList.add('active');
    
    // Initialize editor if not already initialized
    if (!mapEditorState) {
        mapEditorState = initMapEditor(scene, camera, renderer);
        
        // Set camera for editor view
        camera.position.set(0, 150, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        
        // Setup floor/grid
        createEditorFloor();
    }
    
    mapEditorState.isActive = true;
}

function createEditorFloor() {
    // Create a dark floor for the editor
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
}

// ============================================================================
// STEP 4: INTEGRATE WITH startGame()
// ============================================================================

// Modify your existing startGame() function to accept custom maps:

function startGameWithCustomMap(customMap) {
    console.log('🎮 Starting game with custom map:', customMap.name);
    
    // Add custom map to MAPS array temporarily
    const tempMapIndex = MAPS.length;
    MAPS.push(customMap);
    
    // Start game with this map
    selectedMapIndex = tempMapIndex;
    
    // Continue with normal game initialization
    hideAllScreens();
    setGameUIVisible(true);
    
    // Set difficulty (default to normal for custom maps)
    const difficulty = 'normal';
    
    // Initialize game (your existing code)
    resetGame();
    loadMap(tempMapIndex);
    
    // Apply custom settings if present
    if (customMap.customSettings) {
        applyCustomMapSettings(customMap.customSettings);
    }
    
    gameRunning = true;
    isPaused = false;
    
    console.log('✅ Custom map loaded successfully!');
}

function applyCustomMapSettings(settings) {
    // Background color
    if (settings.bgColor) {
        scene.background = new THREE.Color(settings.bgColor);
    }
    
    // Particles
    if (settings.particles) {
        // Modify your particle system color/density/speed
        console.log('Setting particles:', settings.particles);
    }
    
    // Fog
    if (settings.fog) {
        scene.fog = new THREE.Fog(
            settings.fog.color,
            50,
            300 * settings.fog.density
        );
    }
    
    // Decorations
    if (settings.decorations) {
        settings.decorations.forEach(deco => {
            const decoMesh = createDecorationForGame(deco);
            scene.add(decoMesh);
        });
    }
}

function createDecorationForGame(deco) {
    // Same as editor, but optimized for gameplay
    switch(deco.type) {
        case 'tree':
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.5, 2, 8),
                new THREE.MeshStandardMaterial({ color: 0x8b4513 })
            );
            const leaves = new THREE.Mesh(
                new THREE.ConeGeometry(1.5, 3, 8),
                new THREE.MeshStandardMaterial({ color: 0x228b22 })
            );
            leaves.position.y = 2.5;
            const tree = new THREE.Group();
            tree.add(trunk);
            tree.add(leaves);
            tree.position.set(deco.x, 0, deco.z);
            tree.rotation.y = deco.rotation || 0;
            tree.castShadow = true;
            tree.receiveShadow = true;
            return tree;
            
        case 'rock':
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(1.5, 0),
                new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 })
            );
            rock.position.set(deco.x, 1, deco.z);
            rock.rotation.y = deco.rotation || 0;
            rock.castShadow = true;
            return rock;
            
        case 'crystal':
            const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(1.5, 0),
                new THREE.MeshStandardMaterial({ 
                    color: 0x00ffff, 
                    emissive: 0x00ffff, 
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.7
                })
            );
            crystal.position.set(deco.x, 1, deco.z);
            crystal.rotation.y = deco.rotation || 0;
            return crystal;
            
        default:
            return new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
    }
}

// ============================================================================
// STEP 5: MODIFY testCustomMap() TO ACTUALLY START GAME
// ============================================================================

// Replace the TODO in map-creator-system.js with:
function testCustomMap() {
    if (!mapEditorState) return;
    
    const validation = MapValidator.validate(mapEditorState.mapData);
    
    if (!validation.valid) {
        alert('❌ Map Validation Failed:\n\n' + validation.errors.join('\n'));
        return;
    }
    
    // Save before testing
    MapStorage.saveMap(mapEditorState.mapData, 'test_map');
    
    // Convert to game format
    const gameMap = MapValidator.exportToGameFormat(mapEditorState.mapData);
    
    console.log('✅ Map Valid! Starting test...', gameMap);
    
    // START GAME WITH CUSTOM MAP
    startGameWithCustomMap(gameMap);
    
    return gameMap;
}

// ============================================================================
// STEP 6: ADD CUSTOM MAP BROWSER/MANAGER (BONUS)
// ============================================================================

function showCustomMapBrowser() {
    const allMaps = MapStorage.loadAllMaps();
    const mapNames = Object.keys(allMaps);
    
    if (mapNames.length === 0) {
        alert('No saved maps found!\n\nCreate a map in the Map Creator first.');
        return;
    }
    
    let message = '📂 YOUR CUSTOM MAPS:\n\n';
    mapNames.forEach((name, i) => {
        const map = allMaps[name];
        message += `${i + 1}. ${map.name} (${map.path.length} tiles)\n`;
        message += `   Saved: ${new Date(map.savedAt).toLocaleString()}\n\n`;
    });
    
    message += 'Enter map number to load, or Cancel:';
    
    const choice = prompt(message);
    if (!choice) return;
    
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < mapNames.length) {
        const mapData = allMaps[mapNames[index]];
        const gameMap = MapValidator.exportToGameFormat(mapData);
        startGameWithCustomMap(gameMap);
    }
}

// Add this button to your main menu:
/*
<button class="btn" style="width: 200px;" onclick="showCustomMapBrowser()">
    📂 MY MAPS
</button>
*/

// ============================================================================
// STEP 7: ADD IMPORT/EXPORT FILE FUNCTIONALITY
// ============================================================================

function exportMapToFile() {
    if (!mapEditorState) return;
    MapStorage.exportMap(mapEditorState.mapData);
}

function importMapFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        MapStorage.importMap(file, (mapData) => {
            if (mapEditorState) {
                mapEditorState.mapData = mapData;
                mapEditorState.rebuildVisuals();
                alert('✅ Map imported successfully!');
            }
        });
    };
    
    input.click();
}

// Add these buttons to the editor UI:
/*
<button onclick="exportMapToFile()">📥 EXPORT FILE</button>
<button onclick="importMapFromFile()">📤 IMPORT FILE</button>
*/

// ============================================================================
// STEP 8: OPTIONAL ENHANCEMENTS
// ============================================================================

// 1. Auto-save every 30 seconds
setInterval(() => {
    if (mapEditorState && mapEditorState.isActive) {
        MapStorage.saveMap(mapEditorState.mapData, 'autosave');
        console.log('💾 Auto-saved');
    }
}, 30000);

// 2. Track creator statistics
function trackMapCreatorStats() {
    const stats = {
        totalMapsCreated: 0,
        totalTilesPlaced: 0,
        totalDecorationsPlaced: 0,
        favoriteDecoration: null
    };
    
    const allMaps = MapStorage.loadAllMaps();
    Object.values(allMaps).forEach(map => {
        stats.totalMapsCreated++;
        stats.totalTilesPlaced += map.path.length;
        stats.totalDecorationsPlaced += map.decorations.length;
    });
    
    return stats;
}

// 3. Map rating/difficulty calculator
function calculateMapDifficulty(mapData) {
    const pathLength = mapData.path.length;
    const decorations = mapData.decorations.length;
    const turns = countPathTurns(mapData.path);
    
    let difficulty = 0;
    
    // Shorter paths = harder (less time to build)
    if (pathLength < 15) difficulty += 3;
    else if (pathLength < 25) difficulty += 2;
    else difficulty += 1;
    
    // More turns = harder (harder to aim)
    if (turns > 8) difficulty += 2;
    else if (turns > 5) difficulty += 1;
    
    // Decorations can block tower placement
    if (decorations > 20) difficulty += 1;
    
    const levels = ['Easy', 'Medium', 'Hard', 'Extreme'];
    return levels[Math.min(difficulty, 3)];
}

function countPathTurns(path) {
    let turns = 0;
    for (let i = 2; i < path.length; i++) {
        const prev = path[i - 2];
        const curr = path[i - 1];
        const next = path[i];
        
        const dir1 = { x: curr.x - prev.x, z: curr.z - prev.z };
        const dir2 = { x: next.x - curr.x, z: next.z - curr.z };
        
        // If direction changes, it's a turn
        if (dir1.x !== dir2.x || dir1.z !== dir2.z) {
            turns++;
        }
    }
    return turns;
}

// ============================================================================
// STEP 9: COMMUNITY FEATURES (ADVANCED)
// ============================================================================

// Share codes can be stored on a server for community sharing
// Here's a basic structure for that:

class CommunityMapManager {
    static API_URL = 'https://your-server.com/api/maps';
    
    static async uploadMap(mapData) {
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: mapData.name,
                    code: MapValidator.generateShareCode(mapData),
                    creator: 'Anonymous', // Add user system later
                    difficulty: calculateMapDifficulty(mapData)
                })
            });
            
            const result = await response.json();
            return result.mapId;
        } catch (e) {
            console.error('Upload failed:', e);
            return null;
        }
    }
    
    static async browseTopMaps() {
        try {
            const response = await fetch(this.API_URL + '/top');
            const maps = await response.json();
            return maps;
        } catch (e) {
            console.error('Browse failed:', e);
            return [];
        }
    }
    
    static async downloadMap(mapId) {
        try {
            const response = await fetch(this.API_URL + '/' + mapId);
            const data = await response.json();
            return MapValidator.loadFromShareCode(data.code);
        } catch (e) {
            console.error('Download failed:', e);
            return null;
        }
    }
}

// ============================================================================
// DEBUGGING & TESTING HELPERS
// ============================================================================

function debugMapData() {
    if (!mapEditorState) {
        console.log('Map editor not initialized');
        return;
    }
    
    console.log('=== MAP DATA DEBUG ===');
    console.log('Name:', mapEditorState.mapData.name);
    console.log('Path length:', mapEditorState.mapData.path.length);
    console.log('Decorations:', mapEditorState.mapData.decorations.length);
    console.log('Settings:', mapEditorState.mapData.settings);
    console.log('Validation:', MapValidator.validate(mapEditorState.mapData));
    console.log('Share code length:', MapValidator.generateShareCode(mapEditorState.mapData).length);
    console.log('======================');
}

function generateRandomMap() {
    if (!mapEditorState) return;
    
    const pathLength = 15 + Math.floor(Math.random() * 20);
    let currentPos = { x: -80, y: 0, z: 0 };
    
    mapEditorState.mapData.path = [{ ...currentPos }];
    
    const directions = [
        { x: MAP_EDITOR_CONFIG.GRID_SIZE, z: 0 },
        { x: -MAP_EDITOR_CONFIG.GRID_SIZE, z: 0 },
        { x: 0, z: MAP_EDITOR_CONFIG.GRID_SIZE },
        { x: 0, z: -MAP_EDITOR_CONFIG.GRID_SIZE }
    ];
    
    for (let i = 0; i < pathLength - 1; i++) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        currentPos.x += dir.x;
        currentPos.z += dir.z;
        
        // Keep within bounds
        currentPos.x = Math.max(-90, Math.min(90, currentPos.x));
        currentPos.z = Math.max(-90, Math.min(90, currentPos.z));
        
        mapEditorState.mapData.path.push({ ...currentPos });
    }
    
    mapEditorState.pathHead = currentPos;
    mapEditorState.rebuildVisuals();
    console.log('🎲 Random map generated!');
}

// Window exports for console debugging
if (typeof window !== 'undefined') {
    window.openMapEditor = openMapEditor;
    window.showCustomMapBrowser = showCustomMapBrowser;
    window.debugMapData = debugMapData;
    window.generateRandomMap = generateRandomMap;
    window.calculateMapDifficulty = calculateMapDifficulty;
}

console.log('✅ Map Creator Integration Ready!');
