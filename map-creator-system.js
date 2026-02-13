// ============================================================================
// MAP CREATOR SYSTEM - Full Implementation
// ============================================================================
// This system allows players to create, test, save, and share custom maps
// Features: Smart path building, decorations, environment settings, undo/redo

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MAP_EDITOR_CONFIG = {
    GRID_SIZE: 4, // Match main game grid (64x64 world = 4 unit tiles)
    WORLD_SIZE: 200, // Total world size (-100 to 100)
    MIN_PATH_LENGTH: 10, // Minimum tiles for valid map
    MAX_UNDO_STEPS: 20, // Undo/redo history size
    SNAP_TO_GRID: true,
    
    // Color presets for quick selection
    COLOR_PRESETS: {
        backgrounds: ['#0a0a1a', '#1a0f0f', '#1a2a1a', '#2c3e50', '#1e272e'],
        tracks: ['#808080', '#8b4513', '#4169e1', '#32cd32', '#ff6347'],
        particles: ['#ffffff', '#ffff00', '#00ffff', '#ff00ff', '#00ff00']
    }
};

// ============================================================================
// MAP EDITOR STATE MANAGER
// ============================================================================

class MapEditorState {
    constructor() {
        this.isActive = false;
        this.currentTool = 'path'; // 'path', 'decoration', 'delete'
        this.selectedDecoration = null;
        this.symmetryMode = false;
        
        // Map data
        this.mapData = {
            name: "Custom Map",
            path: [], // [{x, y, z}]
            decorations: [], // [{type, x, y, z, rotation}]
            settings: {
                bgColor: '#0a0a1a',
                floorColor: '#1e272e',
                trackColor: '#808080',
                particleColor: '#ffffff',
                particleDensity: 0.5,
                particleSpeed: 0.3,
                fogColor: '#000000',
                fogDensity: 0.3
            }
        };
        
        // Editor state
        this.pathHead = null; // Current end of path for snake logic
        this.startMarker = null; // Enemy spawn point
        this.endMarker = null; // Player base
        
        // Undo/Redo system
        this.undoStack = [];
        this.redoStack = [];
        
        // Three.js references
        this.editorScene = null;
        this.gridHelper = null;
        this.pathMeshes = [];
        this.decorationMeshes = [];
        this.previewMesh = null;
    }
    
    saveState() {
        // Save current state for undo
        const state = JSON.parse(JSON.stringify({
            path: this.mapData.path,
            decorations: this.mapData.decorations
        }));
        
        this.undoStack.push(state);
        if (this.undoStack.length > MAP_EDITOR_CONFIG.MAX_UNDO_STEPS) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo on new action
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        // Save current to redo
        this.redoStack.push(JSON.parse(JSON.stringify({
            path: this.mapData.path,
            decorations: this.mapData.decorations
        })));
        
        // Restore previous state
        const prevState = this.undoStack.pop();
        this.mapData.path = prevState.path;
        this.mapData.decorations = prevState.decorations;
        
        this.rebuildVisuals();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        // Save current to undo
        this.undoStack.push(JSON.parse(JSON.stringify({
            path: this.mapData.path,
            decorations: this.mapData.decorations
        })));
        
        // Restore redo state
        const nextState = this.redoStack.pop();
        this.mapData.path = nextState.path;
        this.mapData.decorations = nextState.decorations;
        
        this.rebuildVisuals();
    }
    
    rebuildVisuals() {
        // Clear existing meshes
        this.pathMeshes.forEach(m => this.editorScene.remove(m));
        this.decorationMeshes.forEach(m => this.editorScene.remove(m));
        this.pathMeshes = [];
        this.decorationMeshes = [];
        
        // Rebuild path
        this.mapData.path.forEach((point, i) => {
            const mesh = this.createPathTileMesh(point, i);
            this.pathMeshes.push(mesh);
            this.editorScene.add(mesh);
        });
        
        // Rebuild decorations
        this.mapData.decorations.forEach(deco => {
            const mesh = this.createDecorationMesh(deco);
            this.decorationMeshes.push(mesh);
            this.editorScene.add(mesh);
        });
        
        // Update markers
        this.updateMarkers();
    }
    
    updateMarkers() {
        if (this.startMarker) this.editorScene.remove(this.startMarker);
        if (this.endMarker) this.editorScene.remove(this.endMarker);
        
        if (this.mapData.path.length > 0) {
            // Start marker at first tile
            const start = this.mapData.path[0];
            this.startMarker = this.createMarker(start, 0x00ff00, '🏁');
            this.editorScene.add(this.startMarker);
            
            // End marker at last tile
            const end = this.mapData.path[this.mapData.path.length - 1];
            this.endMarker = this.createMarker(end, 0xff0000, '🏰');
            this.editorScene.add(this.endMarker);
        }
    }
    
    createMarker(position, color, emoji) {
        const group = new THREE.Group();
        
        // Base platform
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.5, 16),
            new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.3 })
        );
        base.position.set(position.x, 0.25, position.z);
        group.add(base);
        
        // Floating icon (using sprite for emoji-like effect)
        const iconGeo = new THREE.SphereGeometry(2, 16, 16);
        const iconMat = new THREE.MeshStandardMaterial({ 
            color: color, 
            emissive: color, 
            emissiveIntensity: 0.5 
        });
        const icon = new THREE.Mesh(iconGeo, iconMat);
        icon.position.set(position.x, 4, position.z);
        group.add(icon);
        
        return group;
    }
    
    createPathTileMesh(point, index) {
        // Determine tile orientation based on neighbors
        const prev = index > 0 ? this.mapData.path[index - 1] : null;
        const next = index < this.mapData.path.length - 1 ? this.mapData.path[index + 1] : null;
        
        const geometry = new THREE.BoxGeometry(MAP_EDITOR_CONFIG.GRID_SIZE, 0.5, MAP_EDITOR_CONFIG.GRID_SIZE);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.mapData.settings.trackColor,
            metalness: 0.3,
            roughness: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(point.x, 0, point.z);
        mesh.userData.editorType = 'path';
        mesh.userData.index = index;
        
        return mesh;
    }
    
    createDecorationMesh(deco) {
        // Create decoration based on type
        let geometry, material;
        
        switch(deco.type) {
            case 'tree':
                // Simple tree shape
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
                tree.userData.editorType = 'decoration';
                return tree;
                
            case 'rock':
                geometry = new THREE.DodecahedronGeometry(1.5, 0);
                material = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
                break;
                
            case 'crystal':
                geometry = new THREE.OctahedronGeometry(1.5, 0);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x00ffff, 
                    emissive: 0x00ffff, 
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.7
                });
                break;
                
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
                material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(deco.x, 1, deco.z);
        mesh.rotation.y = deco.rotation || 0;
        mesh.userData.editorType = 'decoration';
        
        return mesh;
    }
}

// ============================================================================
// MAP EDITOR INPUT HANDLER
// ============================================================================

class MapEditorInput {
    constructor(editorState, camera, renderer) {
        this.state = editorState;
        this.camera = camera;
        this.renderer = renderer;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.gridPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mouse click - place tile
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        
        // Right click - delete tile
        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });
        
        // Mouse move - preview placement
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
    
    updateMouse(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    getGridPosition(event) {
        this.updateMouse(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.gridPlane, intersectPoint);
        
        if (MAP_EDITOR_CONFIG.SNAP_TO_GRID) {
            intersectPoint.x = Math.round(intersectPoint.x / MAP_EDITOR_CONFIG.GRID_SIZE) * MAP_EDITOR_CONFIG.GRID_SIZE;
            intersectPoint.z = Math.round(intersectPoint.z / MAP_EDITOR_CONFIG.GRID_SIZE) * MAP_EDITOR_CONFIG.GRID_SIZE;
            intersectPoint.y = 0;
        }
        
        return intersectPoint;
    }
    
    onMouseClick(event) {
        const pos = this.getGridPosition(event);
        
        if (this.state.currentTool === 'path') {
            this.placePath(pos);
        } else if (this.state.currentTool === 'decoration') {
            this.placeDecoration(pos);
        }
    }
    
    placePath(pos) {
        // Rule 1: First tile can be placed anywhere
        if (this.state.mapData.path.length === 0) {
            this.state.saveState();
            this.state.mapData.path.push({ x: pos.x, y: 0, z: pos.z });
            this.state.pathHead = { x: pos.x, y: 0, z: pos.z };
            this.state.rebuildVisuals();
            return;
        }
        
        // Rule 2: Subsequent tiles must connect to path head
        const head = this.state.pathHead;
        const dx = Math.abs(pos.x - head.x);
        const dz = Math.abs(pos.z - head.z);
        
        // Check if adjacent (4-directional)
        const isAdjacent = (dx === MAP_EDITOR_CONFIG.GRID_SIZE && dz === 0) || 
                          (dx === 0 && dz === MAP_EDITOR_CONFIG.GRID_SIZE);
        
        if (!isAdjacent) {
            console.log('❌ Path must connect to the end! (Snake rule)');
            return;
        }
        
        // Check if tile already occupied
        const occupied = this.state.mapData.path.some(p => p.x === pos.x && p.z === pos.z);
        if (occupied) {
            console.log('❌ Tile already has path!');
            return;
        }
        
        // Place tile
        this.state.saveState();
        this.state.mapData.path.push({ x: pos.x, y: 0, z: pos.z });
        this.state.pathHead = { x: pos.x, y: 0, z: pos.z };
        this.state.rebuildVisuals();
    }
    
    placeDecoration(pos) {
        if (!this.state.selectedDecoration) return;
        
        // Check if tile occupied by path
        const onPath = this.state.mapData.path.some(p => p.x === pos.x && p.z === pos.z);
        if (onPath) {
            console.log('❌ Cannot place decoration on path!');
            return;
        }
        
        this.state.saveState();
        
        const deco = {
            type: this.state.selectedDecoration,
            x: pos.x,
            y: 0,
            z: pos.z,
            rotation: Math.random() * Math.PI * 2
        };
        
        this.state.mapData.decorations.push(deco);
        
        // Symmetry mode
        if (this.state.symmetryMode) {
            this.state.mapData.decorations.push({
                ...deco,
                x: -pos.x, // Mirror X axis
                rotation: Math.PI - deco.rotation
            });
        }
        
        this.state.rebuildVisuals();
    }
    
    onRightClick(event) {
        this.updateMouse(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check what we're clicking
        const allMeshes = [...this.state.pathMeshes, ...this.state.decorationMeshes];
        const intersects = this.raycaster.intersectObjects(allMeshes, true);
        
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            
            if (obj.userData.editorType === 'path') {
                this.deletePath(obj.userData.index);
            } else if (obj.userData.editorType === 'decoration' || obj.parent.userData.editorType === 'decoration') {
                this.deleteDecoration(intersects[0].point);
            }
        }
    }
    
    deletePath(index) {
        // Can only delete from the end (snake rule)
        if (index !== this.state.mapData.path.length - 1) {
            console.log('❌ Can only delete from the end! (Snake rule)');
            return;
        }
        
        this.state.saveState();
        this.state.mapData.path.pop();
        
        if (this.state.mapData.path.length > 0) {
            const last = this.state.mapData.path[this.state.mapData.path.length - 1];
            this.state.pathHead = last;
        } else {
            this.state.pathHead = null;
        }
        
        this.state.rebuildVisuals();
    }
    
    deleteDecoration(point) {
        const gridX = Math.round(point.x / MAP_EDITOR_CONFIG.GRID_SIZE) * MAP_EDITOR_CONFIG.GRID_SIZE;
        const gridZ = Math.round(point.z / MAP_EDITOR_CONFIG.GRID_SIZE) * MAP_EDITOR_CONFIG.GRID_SIZE;
        
        const idx = this.state.mapData.decorations.findIndex(d => 
            Math.abs(d.x - gridX) < 0.1 && Math.abs(d.z - gridZ) < 0.1
        );
        
        if (idx !== -1) {
            this.state.saveState();
            this.state.mapData.decorations.splice(idx, 1);
            this.state.rebuildVisuals();
        }
    }
    
    onMouseMove(event) {
        // Update preview mesh position
        const pos = this.getGridPosition(event);
        
        if (this.state.previewMesh) {
            this.state.previewMesh.position.set(pos.x, 0.5, pos.z);
            
            // Color based on validity
            if (this.state.currentTool === 'path') {
                const canPlace = this.canPlacePath(pos);
                this.state.previewMesh.material.color.setHex(canPlace ? 0x00ff00 : 0xff0000);
                this.state.previewMesh.material.opacity = canPlace ? 0.5 : 0.3;
            }
        }
    }
    
    canPlacePath(pos) {
        if (this.state.mapData.path.length === 0) return true;
        
        const head = this.state.pathHead;
        const dx = Math.abs(pos.x - head.x);
        const dz = Math.abs(pos.z - head.z);
        const isAdjacent = (dx === MAP_EDITOR_CONFIG.GRID_SIZE && dz === 0) || 
                          (dx === 0 && dz === MAP_EDITOR_CONFIG.GRID_SIZE);
        const occupied = this.state.mapData.path.some(p => p.x === pos.x && p.z === pos.z);
        
        return isAdjacent && !occupied;
    }
    
    onKeyDown(event) {
        // Ctrl+Z = Undo
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            this.state.undo();
        }
        
        // Ctrl+Y = Redo
        if (event.ctrlKey && event.key === 'y') {
            event.preventDefault();
            this.state.redo();
        }
        
        // S = Toggle Symmetry
        if (event.key === 's' && !event.ctrlKey) {
            this.state.symmetryMode = !this.state.symmetryMode;
            console.log('🔄 Symmetry Mode:', this.state.symmetryMode ? 'ON' : 'OFF');
        }
        
        // Delete = Delete selected
        if (event.key === 'Delete') {
            if (this.state.mapData.path.length > 0) {
                this.deletePath(this.state.mapData.path.length - 1);
            }
        }
    }
}

// ============================================================================
// MAP VALIDATION & EXPORT
// ============================================================================

class MapValidator {
    static validate(mapData) {
        const errors = [];
        
        // Check path length
        if (mapData.path.length < MAP_EDITOR_CONFIG.MIN_PATH_LENGTH) {
            errors.push(`Path must be at least ${MAP_EDITOR_CONFIG.MIN_PATH_LENGTH} tiles long (currently ${mapData.path.length})`);
        }
        
        // Check path connectivity
        for (let i = 1; i < mapData.path.length; i++) {
            const prev = mapData.path[i - 1];
            const curr = mapData.path[i];
            const dx = Math.abs(curr.x - prev.x);
            const dz = Math.abs(curr.z - prev.z);
            
            if ((dx !== MAP_EDITOR_CONFIG.GRID_SIZE || dz !== 0) && (dx !== 0 || dz !== MAP_EDITOR_CONFIG.GRID_SIZE)) {
                errors.push(`Path broken at tile ${i} - tiles must be adjacent`);
            }
        }
        
        // Check bounds
        mapData.path.forEach((point, i) => {
            if (Math.abs(point.x) > MAP_EDITOR_CONFIG.WORLD_SIZE / 2 || 
                Math.abs(point.z) > MAP_EDITOR_CONFIG.WORLD_SIZE / 2) {
                errors.push(`Tile ${i} is out of bounds`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    static exportToGameFormat(mapData) {
        // Convert editor format to game MAPS format
        return {
            name: mapData.name,
            track: 'custom',
            floorColor: parseInt(mapData.settings.floorColor.replace('#', '0x')),
            path: mapData.path.map(p => new THREE.Vector3(p.x, p.y, p.z)),
            customSettings: {
                bgColor: mapData.settings.bgColor,
                trackColor: mapData.settings.trackColor,
                decorations: mapData.decorations,
                particles: {
                    color: mapData.settings.particleColor,
                    density: mapData.settings.particleDensity,
                    speed: mapData.settings.particleSpeed
                },
                fog: {
                    color: mapData.settings.fogColor,
                    density: mapData.settings.fogDensity
                }
            }
        };
    }
    
    static generateShareCode(mapData) {
        // Compress and encode map data as Base64
        const jsonString = JSON.stringify(mapData);
        const compressed = LZString.compressToBase64(jsonString);
        return compressed;
    }
    
    static loadFromShareCode(code) {
        try {
            const decompressed = LZString.decompressFromBase64(code);
            return JSON.parse(decompressed);
        } catch (e) {
            console.error('Invalid share code:', e);
            return null;
        }
    }
}

// ============================================================================
// MAP STORAGE MANAGER
// ============================================================================

class MapStorage {
    static STORAGE_KEY = 'karlo_td_custom_maps';
    
    static saveMap(mapData, slot = 'autosave') {
        try {
            const allMaps = this.loadAllMaps();
            allMaps[slot] = {
                ...mapData,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allMaps));
            console.log('✅ Map saved to slot:', slot);
            return true;
        } catch (e) {
            console.error('❌ Save failed:', e);
            return false;
        }
    }
    
    static loadMap(slot = 'autosave') {
        const allMaps = this.loadAllMaps();
        return allMaps[slot] || null;
    }
    
    static loadAllMaps() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('❌ Load failed:', e);
            return {};
        }
    }
    
    static deleteMap(slot) {
        const allMaps = this.loadAllMaps();
        delete allMaps[slot];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allMaps));
        console.log('🗑️ Deleted map from slot:', slot);
    }
    
    static exportMap(mapData) {
        // Create downloadable JSON file
        const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapData.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    static importMap(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const mapData = JSON.parse(e.target.result);
                callback(mapData);
            } catch (err) {
                console.error('❌ Import failed:', err);
            }
        };
        reader.readAsText(file);
    }
}

// ============================================================================
// EXPORT FOR USE IN MAIN GAME
// ============================================================================

// Global instances
let mapEditorState = null;
let mapEditorInput = null;

function initMapEditor(scene, camera, renderer) {
    mapEditorState = new MapEditorState();
    mapEditorState.editorScene = scene;
    mapEditorState.isActive = true;
    
    // Setup grid
    const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x222222);
    scene.add(gridHelper);
    mapEditorState.gridHelper = gridHelper;
    
    // Setup input
    mapEditorInput = new MapEditorInput(mapEditorState, camera, renderer);
    
    // Create preview mesh
    const previewGeo = new THREE.BoxGeometry(MAP_EDITOR_CONFIG.GRID_SIZE, 0.5, MAP_EDITOR_CONFIG.GRID_SIZE);
    const previewMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.5 
    });
    mapEditorState.previewMesh = new THREE.Mesh(previewGeo, previewMat);
    scene.add(mapEditorState.previewMesh);
    
    console.log('✅ Map Editor Initialized');
    return mapEditorState;
}

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
    
    // TODO: Switch to game scene with this custom map
    // This would integrate with your existing startGame() function
    return gameMap;
}

// Export everything
if (typeof window !== 'undefined') {
    window.MapEditorState = MapEditorState;
    window.MapEditorInput = MapEditorInput;
    window.MapValidator = MapValidator;
    window.MapStorage = MapStorage;
    window.initMapEditor = initMapEditor;
    window.testCustomMap = testCustomMap;
    window.MAP_EDITOR_CONFIG = MAP_EDITOR_CONFIG;
}
