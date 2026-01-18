import * as THREE from 'three';

// ============================================
// TROPICANA - Realistisk Tropisk Eventyr
// ============================================

// ============================================
// MOBILE DETECTION & PERFORMANCE SETTINGS
// ============================================
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

// Balanserte innstillinger - god kvalitet + batterivennlig
const PERFORMANCE = {
    pixelRatio: isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2),
    shadows: true,  // Behold shadows for visuell kvalitet
    antialias: !isMobile,  // Antialias kun på desktop
    reducedEffects: false  // Behold alle effekter
};

// Scene setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: PERFORMANCE.antialias,
    powerPreference: 'default'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(PERFORMANCE.pixelRatio);
renderer.shadowMap.enabled = PERFORMANCE.shadows;
renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('game-container').appendChild(renderer.domElement);

// Visibility API - pause when tab is hidden (sparer batteri når fanen er skjult)
let isTabVisible = true;
document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
});

console.log(`🎮 Device: ${isMobile ? 'MOBILE' : 'DESKTOP'}`);
console.log(`   - Pixel Ratio: ${PERFORMANCE.pixelRatio}`);

// ============================================
// BAKKENIVÅ - Alle objekter plasseres relativt til dette
// ============================================
const GROUND_LEVEL = 1.5;

// ============================================
// HIMMEL - Dramatisk solnedgang (som bildet)
// ============================================
const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
        topColor: { value: new THREE.Color(0x1a0a2e) },      // Mørk lilla/blå topp
        midColor: { value: new THREE.Color(0xff6b35) },      // Oransje
        bottomColor: { value: new THREE.Color(0xffd93d) },   // Gul ved horisont
        sunColor: { value: new THREE.Color(0xffff88) },
        sunPosition: { value: new THREE.Vector3(0, 40, -150) },
        offset: { value: 20 },
        exponent: { value: 0.4 }
    },
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunPosition;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            
            // Tre-farget gradient for solnedgang
            vec3 skyColor;
            if (h > 0.3) {
                // Øvre del: mørk til oransje
                float t = (h - 0.3) / 0.7;
                skyColor = mix(midColor, topColor, pow(t, 0.8));
            } else {
                // Nedre del: gul til oransje
                float t = h / 0.3;
                skyColor = mix(bottomColor, midColor, pow(t, 0.6));
            }
            
            // Stjerner i øvre del
            if (h > 0.5) {
                float starNoise = fract(sin(dot(vWorldPosition.xz, vec2(12.9898, 78.233))) * 43758.5453);
                if (starNoise > 0.998) {
                    skyColor += vec3(1.0) * (h - 0.5) * 2.0;
                }
            }
            
            // Sol-glød
            vec3 sunDir = normalize(sunPosition);
            vec3 viewDir = normalize(vWorldPosition);
            float sunDot = max(dot(viewDir, sunDir), 0.0);
            float sunGlow = pow(sunDot, 8.0) * 0.6 + pow(sunDot, 64.0) * 1.5;
            skyColor += sunColor * sunGlow;
            
            gl_FragColor = vec4(skyColor, 1.0);
        }
    `,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// ============================================
// FJELL RUNDT ØYA
// ============================================
function createMountain(x, z, height, width) {
    const mountainGroup = new THREE.Group();
    
    // Fjell-geometri med variasjon
    const segments = 12;
    const coneGeometry = new THREE.ConeGeometry(width, height, segments, 4);
    
    // Deformer fjellet for mer naturlig utseende
    const positions = coneGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        const py = positions.getY(i);
        const pz = positions.getZ(i);
        
        // Legg til støy for naturlig form
        const noise = Math.sin(px * 0.5) * Math.cos(pz * 0.5) * 3;
        const noise2 = Math.sin(py * 0.3) * 2;
        
        positions.setX(i, px + noise * 0.3);
        positions.setZ(i, pz + noise2 * 0.3);
        
        // Gjør toppen mer spiss
        if (py > height * 0.3) {
            const factor = (py - height * 0.3) / (height * 0.7);
            positions.setX(i, px * (1 - factor * 0.3));
            positions.setZ(i, pz * (1 - factor * 0.3));
        }
    }
    coneGeometry.computeVertexNormals();
    
    // Fjell-farge gradient (grønn til grå/lilla)
    const mountainMaterial = new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: new THREE.Color(0x2d5a27) },    // Mørk grønn
            midColor: { value: new THREE.Color(0x4a7c3f) },     // Lysere grønn
            topColor: { value: new THREE.Color(0x5a5a6a) },     // Grå/lilla topp
            mistColor: { value: new THREE.Color(0xccccdd) },    // Tåke-farge
            height: { value: height }
        },
        vertexShader: `
            varying float vHeight;
            varying vec3 vNormal;
            void main() {
                vHeight = position.y;
                vNormal = normalMatrix * normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 midColor;
            uniform vec3 topColor;
            uniform vec3 mistColor;
            uniform float height;
            varying float vHeight;
            varying vec3 vNormal;
            
            void main() {
                float h = (vHeight + height * 0.5) / height;
                
                vec3 color;
                if (h < 0.4) {
                    color = mix(baseColor, midColor, h / 0.4);
                } else if (h < 0.75) {
                    color = mix(midColor, topColor, (h - 0.4) / 0.35);
                } else {
                    color = mix(topColor, mistColor, (h - 0.75) / 0.25);
                }
                
                // Enkel belysning
                float light = max(dot(vNormal, normalize(vec3(0.5, 1.0, 0.3))), 0.3);
                color *= light;
                
                // Tåke-effekt på avstand
                float fogFactor = smoothstep(0.0, 0.3, h) * 0.3;
                color = mix(color, mistColor, fogFactor * 0.5);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide
    });
    
    const mountain = new THREE.Mesh(coneGeometry, mountainMaterial);
    mountain.position.y = -height * 0.15;
    mountain.castShadow = true;
    mountainGroup.add(mountain);
    
    // Legg til mindre topper for variasjon
    for (let i = 0; i < 3; i++) {
        const smallHeight = height * (0.3 + Math.random() * 0.4);
        const smallWidth = width * (0.3 + Math.random() * 0.3);
        const smallCone = new THREE.ConeGeometry(smallWidth, smallHeight, 8, 2);
        const smallMountain = new THREE.Mesh(smallCone, mountainMaterial);
        smallMountain.position.set(
            (Math.random() - 0.5) * width * 0.8,
            -smallHeight * 0.3,
            (Math.random() - 0.5) * width * 0.8
        );
        smallMountain.castShadow = true;
        mountainGroup.add(smallMountain);
    }
    
    mountainGroup.position.set(x, 0, z);
    scene.add(mountainGroup);
    return mountainGroup;
}

// Fjellkjede rundt øya (REDUSERT for ytelse)
const mountains = [];
const mountainCount = 8;
for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2;
    const distance = 120 + Math.random() * 40;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 40 + Math.random() * 50;
    const width = 25 + Math.random() * 20;
    mountains.push(createMountain(x, z, height, width));
}

// ============================================
// TÅKE/DIS EFFEKT
// ============================================
scene.fog = new THREE.FogExp2(0xccccdd, 0.004);

// Skyer
function createCloud(x, y, z, scale = 1) {
    const cloudGroup = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
    });
    
    const numPuffs = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numPuffs; i++) {
        const puffSize = (0.8 + Math.random() * 0.6) * scale;
        const puffGeometry = new THREE.SphereGeometry(puffSize * 3, 8, 8);
        const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
        puff.position.set(
            (Math.random() - 0.5) * 8 * scale,
            (Math.random() - 0.5) * 2 * scale,
            (Math.random() - 0.5) * 4 * scale
        );
        puff.scale.y = 0.6;
        cloudGroup.add(puff);
    }
    
    cloudGroup.position.set(x, y, z);
    cloudGroup.userData.speed = 0.02 + Math.random() * 0.03;
    scene.add(cloudGroup);
    return cloudGroup;
}

const clouds = [];

// Skyer (REDUSERT)
for (let i = 0; i < 5; i++) {
    const cloud = createCloud(
        (Math.random() - 0.5) * 350,
        70 + Math.random() * 40,
        (Math.random() - 0.5) * 350,
        1.0 + Math.random() * 0.8
    );
    clouds.push(cloud);
}

// ============================================
// LYSSETTING - Solnedgang stemning
// ============================================
const ambientLight = new THREE.AmbientLight(0xffaa77, 0.5);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xff8844, 0x2d5a27, 0.7);
scene.add(hemisphereLight);

// Hovedlys fra solnedgang
const sunLight = new THREE.DirectionalLight(0xffcc77, 1.8);
sunLight.position.set(0, 60, -150);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
sunLight.shadow.bias = -0.0001;
sunLight.shadow.normalBias = 0.02;
scene.add(sunLight);

// Ekstra varmt bakgrunnsbelysning
const backLight = new THREE.DirectionalLight(0xff6622, 0.5);
backLight.position.set(0, 20, -100);
scene.add(backLight);

// Sol-disk (stor og varm)
const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffdd44,
    transparent: true,
    opacity: 0.9
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 45, -180);
scene.add(sun);

// Sol-glød ring
const sunGlowGeometry = new THREE.RingGeometry(15, 40, 32);
const sunGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
});
const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
sunGlow.position.copy(sun.position);
sunGlow.lookAt(0, 0, 0);
scene.add(sunGlow);

// ============================================
// HAV MED REALISTISKE BØLGER
// ============================================
const oceanGeometry = new THREE.PlaneGeometry(800, 800, 128, 128);
const oceanMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        deepColor: { value: new THREE.Color(0x1a5c4c) },      // Mørk tropisk grønn
        shallowColor: { value: new THREE.Color(0x3da88c) },   // Lysere turkis-grønn
        foamColor: { value: new THREE.Color(0xddffee) },
        sunDirection: { value: new THREE.Vector3(0.0, 0.5, -1.0).normalize() },
        sunsetColor: { value: new THREE.Color(0xff8844) }
    },
    vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            vUv = uv;
            vec3 pos = position;
            
            // Multiple wave layers for realism
            float wave1 = sin(pos.x * 0.05 + time * 0.8) * cos(pos.y * 0.03 + time * 0.5) * 1.5;
            float wave2 = sin(pos.x * 0.1 + pos.y * 0.08 + time * 1.2) * 0.5;
            float wave3 = sin(pos.x * 0.2 + time * 2.0) * cos(pos.y * 0.15 + time * 1.5) * 0.3;
            
            pos.z = wave1 + wave2 + wave3;
            vElevation = pos.z;
            
            // Calculate normal for lighting
            float eps = 0.1;
            float h1 = sin((pos.x + eps) * 0.05 + time * 0.8) * cos(pos.y * 0.03 + time * 0.5) * 1.5;
            float h2 = sin(pos.x * 0.05 + time * 0.8) * cos((pos.y + eps) * 0.03 + time * 0.5) * 1.5;
            vec3 tangent = normalize(vec3(eps, 0.0, h1 - wave1));
            vec3 bitangent = normalize(vec3(0.0, eps, h2 - wave1));
            vNormal = normalize(cross(tangent, bitangent));
            
            vPosition = pos;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        uniform vec3 foamColor;
        uniform vec3 sunDirection;
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            // Water color based on depth simulation
            float depthFactor = smoothstep(-1.0, 2.0, vElevation);
            vec3 waterColor = mix(deepColor, shallowColor, depthFactor);
            
            // Sun reflection (specular)
            vec3 viewDir = normalize(cameraPosition - vPosition);
            vec3 reflectDir = reflect(-sunDirection, vNormal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);
            
            // Foam on wave peaks
            float foam = smoothstep(1.2, 1.8, vElevation) * 0.5;
            foam += pow(sin(vUv.x * 100.0 + time) * sin(vUv.y * 100.0 + time * 0.7), 8.0) * 0.1;
            
            vec3 finalColor = waterColor + vec3(spec * 0.8) + foamColor * foam;
            
            // Fresnel effect
            float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
            finalColor = mix(finalColor, vec3(0.6, 0.8, 0.9), fresnel * 0.3);
            
            // Solnedgang-refleksjon
            float sunsetReflect = pow(max(-viewDir.z, 0.0), 4.0) * 0.3;
            finalColor += vec3(1.0, 0.5, 0.2) * sunsetReflect;
            
            gl_FragColor = vec4(finalColor, 0.88);
        }
    `,
    transparent: true,
    side: THREE.DoubleSide
});
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -1;
scene.add(ocean);

// ============================================
// ØY MED REALISTISK TERRENG
// ============================================

// Hovedøy med høydevariasjon
const islandRadius = 45;
const islandGeometry = new THREE.CylinderGeometry(islandRadius, islandRadius + 8, 4, 64, 8);

// Deformer øya for mer naturlig form
const islandPositions = islandGeometry.attributes.position;
for (let i = 0; i < islandPositions.count; i++) {
    const x = islandPositions.getX(i);
    const y = islandPositions.getY(i);
    const z = islandPositions.getZ(i);
    
    const dist = Math.sqrt(x * x + z * z);
    const angle = Math.atan2(z, x);
    
    // Legg til variasjon i kanten
    const edgeNoise = Math.sin(angle * 5) * 2 + Math.sin(angle * 8) * 1;
    
    if (dist > islandRadius * 0.8) {
        islandPositions.setX(i, x + Math.cos(angle) * edgeNoise * 0.3);
        islandPositions.setZ(i, z + Math.sin(angle) * edgeNoise * 0.3);
    }
    
    // Høydevariasjon
    if (y > 0) {
        const centerDist = dist / islandRadius;
        const heightVar = Math.sin(angle * 3) * 0.5 + Math.cos(angle * 7) * 0.3;
        islandPositions.setY(i, y + (1 - centerDist) * heightVar);
    }
}
islandGeometry.computeVertexNormals();

// Sand tekstur proseduralt
const sandCanvas = document.createElement('canvas');
sandCanvas.width = 512;
sandCanvas.height = 512;
const sandCtx = sandCanvas.getContext('2d');
sandCtx.fillStyle = '#f4d03f';
sandCtx.fillRect(0, 0, 512, 512);
for (let i = 0; i < 500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const brightness = 180 + Math.random() * 75;
    sandCtx.fillStyle = `rgb(${brightness + 50}, ${brightness + 20}, ${brightness - 80})`;
    sandCtx.fillRect(x, y, 2, 2);
}
const sandTexture = new THREE.CanvasTexture(sandCanvas);
sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(4, 4);

const sandMaterial = new THREE.MeshLambertMaterial({ 
    map: sandTexture,
    color: 0xf5deb3
});
const island = new THREE.Mesh(islandGeometry, sandMaterial);
island.position.y = -0.5;
island.receiveShadow = true;
island.castShadow = true;
scene.add(island);

// Grønt område med gress-tekstur
const grassCanvas = document.createElement('canvas');
grassCanvas.width = 512;
grassCanvas.height = 512;
const grassCtx = grassCanvas.getContext('2d');
grassCtx.fillStyle = '#228B22';
grassCtx.fillRect(0, 0, 512, 512);
for (let i = 0; i < 500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const green = 80 + Math.random() * 100;
    grassCtx.fillStyle = `rgb(${20 + Math.random() * 40}, ${green}, ${20 + Math.random() * 30})`;
    grassCtx.fillRect(x, y, 1, 3);
}
const grassTexture = new THREE.CanvasTexture(grassCanvas);
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(6, 6);

const grassGeometry = new THREE.CylinderGeometry(28, 32, 3, 48);
const grassMaterial = new THREE.MeshLambertMaterial({ 
    map: grassTexture,
    color: 0x4a7c3f
});
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.position.y = 0.1;
grass.receiveShadow = true;
scene.add(grass);

// ============================================
// REALISTISKE PALMETRÆR
// ============================================
function createRealisticPalmTree(x, z, height = 8) {
    const palmGroup = new THREE.Group();
    
    // Kurvet stamme med segmenter
    const trunkSegments = 12;
    const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.3, height * 0.3, 0.2),
        new THREE.Vector3(0.1, height * 0.6, -0.1),
        new THREE.Vector3(-0.2, height * 0.85, 0.15),
        new THREE.Vector3(0, height, 0)
    ]);
    
    // Bark tekstur
    const barkCanvas = document.createElement('canvas');
    barkCanvas.width = 128;
    barkCanvas.height = 256;
    const barkCtx = barkCanvas.getContext('2d');
    barkCtx.fillStyle = '#5d4e37';
    barkCtx.fillRect(0, 0, 128, 256);
    for (let y = 0; y < 256; y += 8) {
        barkCtx.fillStyle = `rgb(${60 + Math.random() * 40}, ${50 + Math.random() * 30}, ${30 + Math.random() * 20})`;
        barkCtx.fillRect(0, y, 128, 4 + Math.random() * 6);
        barkCtx.fillStyle = '#3d3525';
        barkCtx.fillRect(0, y + 6, 128, 2);
    }
    const barkTexture = new THREE.CanvasTexture(barkCanvas);
    barkTexture.wrapS = barkTexture.wrapT = THREE.RepeatWrapping;
    
    const trunkGeometry = new THREE.TubeGeometry(trunkCurve, trunkSegments, 0.35, 8, false);
    const trunkMaterial = new THREE.MeshLambertMaterial({ 
        map: barkTexture,
        color: 0x8B7355
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    palmGroup.add(trunk);
    
    // Toppen av stammen (tykkere)
    const topGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const topMesh = new THREE.Mesh(topGeometry, trunkMaterial);
    topMesh.position.copy(trunkCurve.getPoint(1));
    topMesh.scale.y = 0.6;
    palmGroup.add(topMesh);
    
    // Palmebladene - mer realistiske
    const leafCount = 9;
    const leafMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x228B22,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < leafCount; i++) {
        const leafGroup = new THREE.Group();
        const angle = (i / leafCount) * Math.PI * 2;
        const leafLength = 4 + Math.random() * 1.5;
        const droopAngle = 0.3 + Math.random() * 0.4;
        
        // Hvert blad består av flere segmenter
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.quadraticCurveTo(leafLength * 0.5, 0.4, leafLength, 0);
        leafShape.quadraticCurveTo(leafLength * 0.5, -0.4, 0, 0);
        
        const leafGeometry = new THREE.ShapeGeometry(leafShape);
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.rotation.y = Math.PI / 2;
        leaf.castShadow = true;
        
        leafGroup.add(leaf);
        leafGroup.position.copy(trunkCurve.getPoint(1));
        leafGroup.position.y += 0.3;
        leafGroup.rotation.y = angle;
        leafGroup.rotation.z = droopAngle;
        
        // Legg til bladstriper (mindre blader langs hovedbladet)
        for (let j = 0; j < 12; j++) {
            const stripLength = 0.6 + Math.random() * 0.4;
            const stripGeometry = new THREE.PlaneGeometry(stripLength, 0.08);
            const strip = new THREE.Mesh(stripGeometry, leafMaterial);
            strip.position.set(0.5 + j * 0.3, 0, 0);
            strip.rotation.z = (Math.random() - 0.5) * 0.5;
            strip.rotation.y = 0.3 + Math.random() * 0.3;
            leafGroup.add(strip);
            
            const strip2 = strip.clone();
            strip2.rotation.y = -(0.3 + Math.random() * 0.3);
            leafGroup.add(strip2);
        }
        
        palmGroup.add(leafGroup);
    }
    
    // Kokosnøtter
    const coconutGeometry = new THREE.SphereGeometry(0.22, 12, 12);
    const coconutMaterial = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    for (let i = 0; i < 4; i++) {
        const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
        const topPos = trunkCurve.getPoint(1);
        coconut.position.set(
            topPos.x + Math.cos(i * 1.5) * 0.35,
            topPos.y - 0.3,
            topPos.z + Math.sin(i * 1.5) * 0.35
        );
        coconut.castShadow = true;
        palmGroup.add(coconut);
    }
    
    palmGroup.position.set(x, GROUND_LEVEL, z);
    palmGroup.rotation.y = Math.random() * Math.PI * 2;
    scene.add(palmGroup);
    return palmGroup;
}

// Plasser palmetrær (REDUSERT for ytelse)
const palmTrees = [];

// Ring av palmer
for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const dist = 15 + Math.random() * 10;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const h = 7 + Math.random() * 4;
    palmTrees.push(createRealisticPalmTree(x, z, h));
}

// Kant-palmer
for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.2;
    const dist = 30 + Math.random() * 8;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const h = 8 + Math.random() * 5;
    palmTrees.push(createRealisticPalmTree(x, z, h));
}

// ============================================
// JUNGEL-TRÆR (Tettere vegetasjon)
// ============================================
function createJungleTree(x, z, height = 6) {
    const treeGroup = new THREE.Group();
    
    // Stamme
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, height, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Løvverk (flere lag for tett krone)
    const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
    const foliageColors = [0x2d5a27, 0x3d7a37, 0x228B22, 0x1e6b1e];
    
    for (let i = 0; i < 5; i++) {
        const size = 1.5 + Math.random() * 1.5;
        const foliageGeometry = new THREE.SphereGeometry(size, 8, 8);
        const mat = new THREE.MeshLambertMaterial({ 
            color: foliageColors[Math.floor(Math.random() * foliageColors.length)]
        });
        const foliage = new THREE.Mesh(foliageGeometry, mat);
        foliage.position.set(
            (Math.random() - 0.5) * 1.5,
            height + (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 1.5
        );
        foliage.scale.y = 0.7;
        foliage.castShadow = true;
        treeGroup.add(foliage);
    }
    
    treeGroup.position.set(x, GROUND_LEVEL, z);
    scene.add(treeGroup);
    return treeGroup;
}

// Legg til jungel-trær (REDUSERT)
for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 20;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const h = 4 + Math.random() * 4;
    createJungleTree(x, z, h);
}

// ============================================
// VEGETASJON - Busker og blomster
// ============================================
function createBush(x, z, scale = 1) {
    const bushGroup = new THREE.Group();
    
    const colors = [0x2d5a27, 0x3d7a37, 0x4a8b3f, 0x2e6b2e];
    
    for (let i = 0; i < 8; i++) {
        const size = (0.4 + Math.random() * 0.4) * scale;
        const sphereGeometry = new THREE.IcosahedronGeometry(size, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)]
        });
        const sphere = new THREE.Mesh(sphereGeometry, material);
        sphere.position.set(
            (Math.random() - 0.5) * scale * 1.2,
            size * 0.8,
            (Math.random() - 0.5) * scale * 1.2
        );
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        bushGroup.add(sphere);
    }
    
    bushGroup.position.set(x, GROUND_LEVEL, z);
    scene.add(bushGroup);
    return bushGroup;
}

// Busker (REDUSERT)
for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 25;
    createBush(Math.cos(angle) * dist, Math.sin(angle) * dist, 0.6 + Math.random() * 1.0);
}

// Bregner og undervegetasjon
function createFern(x, z) {
    const fernGroup = new THREE.Group();
    const fernMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x228B22, 
        side: THREE.DoubleSide 
    });
    
    for (let i = 0; i < 8; i++) {
        const frondGeometry = new THREE.PlaneGeometry(0.15, 0.8);
        const frond = new THREE.Mesh(frondGeometry, fernMaterial);
        frond.rotation.y = (i / 8) * Math.PI * 2;
        frond.rotation.x = -0.4;
        frond.position.y = 0.3;
        fernGroup.add(frond);
    }
    
    fernGroup.position.set(x, GROUND_LEVEL, z);
    scene.add(fernGroup);
    return fernGroup;
}

// Spredte bregner (REDUSERT)
for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 50;
    const z = (Math.random() - 0.5) * 50;
    createFern(x, z);
}

// Tropiske blomster
function createFlower(x, z) {
    const flowerGroup = new THREE.Group();
    
    const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6);
    const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.2;
    flowerGroup.add(stem);
    
    const petalColors = [0xff6b6b, 0xffd93d, 0xff8fab, 0xffa07a, 0xff69b4, 0xee82ee];
    const petalColor = petalColors[Math.floor(Math.random() * petalColors.length)];
    
    const petalCount = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < petalCount; i++) {
        const petalGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        petalGeometry.scale(1, 0.3, 2);
        const petalMaterial = new THREE.MeshLambertMaterial({ color: petalColor });
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.y = 0.4;
        petal.rotation.y = (i / petalCount) * Math.PI * 2;
        petal.position.x = Math.cos(petal.rotation.y) * 0.1;
        petal.position.z = Math.sin(petal.rotation.y) * 0.1;
        flowerGroup.add(petal);
    }
    
    // Midten
    const centerGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.4;
    flowerGroup.add(center);
    
    flowerGroup.position.set(x, GROUND_LEVEL, z);
    scene.add(flowerGroup);
    return flowerGroup;
}

// Spredte blomster (REDUSERT)
for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 20;
    createFlower(Math.cos(angle) * dist, Math.sin(angle) * dist);
}

// ============================================
// STEINER MED DETALJER
// ============================================
function createRock(x, z, scale = 1) {
    const rockGroup = new THREE.Group();
    
    const mainGeometry = new THREE.DodecahedronGeometry(scale, 1);
    const positions = mainGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        positions.setX(i, positions.getX(i) * (0.8 + Math.random() * 0.4));
        positions.setY(i, positions.getY(i) * (0.6 + Math.random() * 0.3));
        positions.setZ(i, positions.getZ(i) * (0.8 + Math.random() * 0.4));
    }
    mainGeometry.computeVertexNormals();
    
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
    const rock = new THREE.Mesh(mainGeometry, rockMaterial);
    rock.position.y = scale * 0.4;
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    rockGroup.add(rock);
    
    // Mindre steiner rundt
    for (let i = 0; i < 3; i++) {
        const smallGeometry = new THREE.DodecahedronGeometry(scale * 0.3, 0);
        const smallRock = new THREE.Mesh(smallGeometry, rockMaterial);
        smallRock.position.set(
            (Math.random() - 0.5) * scale * 2,
            scale * 0.15,
            (Math.random() - 0.5) * scale * 2
        );
        smallRock.rotation.set(Math.random(), Math.random(), Math.random());
        smallRock.castShadow = true;
        rockGroup.add(smallRock);
    }
    
    rockGroup.position.set(x, GROUND_LEVEL, z);
    scene.add(rockGroup);
    return rockGroup;
}

createRock(-30, 5, 2);
createRock(32, -10, 2.5);
createRock(-35, 18, 1.5);
createRock(30, 25, 2);
createRock(-25, -25, 1.8);

// ============================================
// HVIT MUSIKKBOKS - Midt på øya
// ============================================
const musicBox = new THREE.Group();

// ============================================
// HVIT BOKS/BOD STRUKTUR
// ============================================
const boxWidth = 3;
const boxHeight = 2.5;
const boxDepth = 2.5;

// Gulv
const floorGeometry = new THREE.BoxGeometry(boxWidth + 0.2, 0.15, boxDepth + 0.2);
const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const floor = new THREE.Mesh(floorGeometry, whiteMaterial);
floor.position.y = 0;
floor.castShadow = true;
floor.receiveShadow = true;
musicBox.add(floor);

// Vegger
const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xfafafa });

// Bakvegg
const backWallGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, 0.1);
const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
backWall.position.set(0, boxHeight / 2, -boxDepth / 2);
backWall.castShadow = true;
backWall.receiveShadow = true;
musicBox.add(backWall);

// Venstre vegg
const sideWallGeometry = new THREE.BoxGeometry(0.1, boxHeight, boxDepth);
const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
leftWall.position.set(-boxWidth / 2, boxHeight / 2, 0);
leftWall.castShadow = true;
musicBox.add(leftWall);

// Høyre vegg
const rightWall = leftWall.clone();
rightWall.position.x = boxWidth / 2;
musicBox.add(rightWall);

// Tak
const roofGeometry = new THREE.BoxGeometry(boxWidth + 0.3, 0.15, boxDepth + 0.3);
const roof = new THREE.Mesh(roofGeometry, whiteMaterial);
roof.position.y = boxHeight;
roof.castShadow = true;
musicBox.add(roof);

// Tak-kant (liten lip)
const roofEdgeGeometry = new THREE.BoxGeometry(boxWidth + 0.4, 0.1, 0.1);
const roofEdgeFront = new THREE.Mesh(roofEdgeGeometry, whiteMaterial);
roofEdgeFront.position.set(0, boxHeight + 0.1, boxDepth / 2 + 0.1);
musicBox.add(roofEdgeFront);

// ============================================
// CD/RADIO SPILLER INNE I BOKSEN
// ============================================
const cdPlayer = new THREE.Group();

// Bord/hylle for CD-spilleren
const shelfGeometry = new THREE.BoxGeometry(2, 0.1, 1.2);
const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
shelf.position.set(0, 1, -0.5);
shelf.castShadow = true;
cdPlayer.add(shelf);

// CD-spiller hovedenhet
const playerBodyGeometry = new THREE.BoxGeometry(1.6, 0.4, 0.9);
const playerBodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    metalness: 0.3,
    roughness: 0.7
});
const playerBody = new THREE.Mesh(playerBodyGeometry, playerBodyMaterial);
playerBody.position.set(0, 1.3, -0.5);
playerBody.castShadow = true;
cdPlayer.add(playerBody);

// CD-lokk (glass)
const cdLidGeometry = new THREE.BoxGeometry(0.6, 0.05, 0.6);
const cdLidMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x88ccff,
    transparent: true,
    opacity: 0.4,
    metalness: 0.5,
    roughness: 0.1
});
const cdLid = new THREE.Mesh(cdLidGeometry, cdLidMaterial);
cdLid.position.set(-0.3, 1.53, -0.5);
cdPlayer.add(cdLid);

// CD-plate (roterer når musikk spiller)
const cdDiscGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 32);
const cdDiscMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.1
});
const cdDisc = new THREE.Mesh(cdDiscGeometry, cdDiscMaterial);
cdDisc.position.set(-0.3, 1.51, -0.5);
cdPlayer.add(cdDisc);

// CD-etikett
const cdLabelGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.025, 32);
const cdLabelMaterial = new THREE.MeshLambertMaterial({ color: 0xf4d03f }); // Gul - Tropicana farge
const cdLabel = new THREE.Mesh(cdLabelGeometry, cdLabelMaterial);
cdLabel.position.set(-0.3, 1.52, -0.5);
cdPlayer.add(cdLabel);

// CD-hull
const cdHoleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16);
const cdHoleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const cdHole = new THREE.Mesh(cdHoleGeometry, cdHoleMaterial);
cdHole.position.set(-0.3, 1.525, -0.5);
cdPlayer.add(cdHole);

// Display (LCD)
const displayGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.02);
const displayMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
const display = new THREE.Mesh(displayGeometry, displayMaterial);
display.position.set(0.4, 1.4, -0.04);
cdPlayer.add(display);

// Display ramme
const displayFrameGeometry = new THREE.BoxGeometry(0.55, 0.2, 0.01);
const displayFrameMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const displayFrame = new THREE.Mesh(displayFrameGeometry, displayFrameMaterial);
displayFrame.position.set(0.4, 1.4, -0.05);
cdPlayer.add(displayFrame);

// Høyttalere
const speakerGeometry = new THREE.BoxGeometry(0.4, 0.7, 0.35);
const speakerMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });

const leftSpeaker = new THREE.Mesh(speakerGeometry, speakerMaterial);
leftSpeaker.position.set(-0.9, 1.45, -0.5);
leftSpeaker.castShadow = true;
cdPlayer.add(leftSpeaker);

const rightSpeaker = leftSpeaker.clone();
rightSpeaker.position.x = 0.9;
cdPlayer.add(rightSpeaker);

// Høyttaler-griller
const grillMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
const grillGeometry = new THREE.PlaneGeometry(0.3, 0.5);

const leftGrill = new THREE.Mesh(grillGeometry, grillMaterial);
leftGrill.position.set(-0.9, 1.45, -0.32);
cdPlayer.add(leftGrill);

const rightGrill = leftGrill.clone();
rightGrill.position.x = 0.9;
cdPlayer.add(rightGrill);

// Kontrollknapper
const buttonColors = [0x27ae60, 0xe74c3c, 0x3498db, 0xf39c12];
const buttonLabels = ['PLAY', 'STOP', 'PREV', 'NEXT'];
for (let i = 0; i < 4; i++) {
    const btnGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16);
    const btnMaterial = new THREE.MeshStandardMaterial({ 
        color: buttonColors[i],
        metalness: 0.4,
        roughness: 0.5
    });
    const btn = new THREE.Mesh(btnGeometry, btnMaterial);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0.15 + i * 0.13, 1.2, -0.04);
    cdPlayer.add(btn);
}

// Volumknapp
const volumeKnobGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
const volumeKnobMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x888888,
    metalness: 0.7,
    roughness: 0.3
});
const volumeKnob = new THREE.Mesh(volumeKnobGeometry, volumeKnobMaterial);
volumeKnob.rotation.x = Math.PI / 2;
volumeKnob.position.set(-0.5, 1.2, -0.04);
cdPlayer.add(volumeKnob);

musicBox.add(cdPlayer);

// ============================================
// DEKORASJON - Neonlys effekt på toppen
// ============================================
const neonGeometry = new THREE.BoxGeometry(2.5, 0.08, 0.08);
const neonMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
const neonLight = new THREE.Mesh(neonGeometry, neonMaterial);
neonLight.position.set(0, boxHeight - 0.2, boxDepth / 2 - 0.1);
musicBox.add(neonLight);

// Punkt-lys inne i boksen
const boxLight = new THREE.PointLight(0xffffff, 0.5, 5);
boxLight.position.set(0, boxHeight - 0.5, 0);
musicBox.add(boxLight);

// Plasser boksen midt på øya
musicBox.position.set(0, GROUND_LEVEL, 0);
scene.add(musicBox);

// ============================================
// CD PÅ BAKKEN (Må hentes først!) - STOR OG SYNLIG
// ============================================
const pickupCD = new THREE.Group();

// CD-plate (STØRRE)
const pickupCDGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.03, 32);
const pickupCDMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xeeeeee,
    metalness: 1,
    roughness: 0.05,
    emissive: 0x444444,
    emissiveIntensity: 0.3
});
const pickupCDDisc = new THREE.Mesh(pickupCDGeometry, pickupCDMaterial);
pickupCD.add(pickupCDDisc);

// CD-etikett (gul - Tropicana) - STØRRE
const pickupCDLabelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.035, 32);
const pickupCDLabelMaterial = new THREE.MeshBasicMaterial({ color: 0xf4d03f }); // Basic for glow
const pickupCDLabel = new THREE.Mesh(pickupCDLabelGeometry, pickupCDLabelMaterial);
pickupCDLabel.position.y = 0.02;
pickupCD.add(pickupCDLabel);

// CD-hull
const pickupCDHoleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
const pickupCDHoleMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
const pickupCDHole = new THREE.Mesh(pickupCDHoleGeometry, pickupCDHoleMaterial);
pickupCDHole.position.y = 0.025;
pickupCD.add(pickupCDHole);

// STOR glødende ring rundt CD-en
const cdGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.08, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0xf4d03f, transparent: true, opacity: 0.9 })
);
cdGlowRing.rotation.x = Math.PI / 2;
cdGlowRing.position.y = 0.1;
pickupCD.add(cdGlowRing);

// Ekstra ytre glød-ring
const cdGlowRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.05, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 })
);
cdGlowRing2.rotation.x = Math.PI / 2;
cdGlowRing2.position.y = 0.1;
pickupCD.add(cdGlowRing2);

// Vertikal lys-søyle over CD-en (veldig synlig!)
const cdBeamGeometry = new THREE.CylinderGeometry(0.3, 0.5, 8, 16, 1, true);
const cdBeamMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xf4d03f, 
    transparent: true, 
    opacity: 0.3,
    side: THREE.DoubleSide
});
const cdBeam = new THREE.Mesh(cdBeamGeometry, cdBeamMaterial);
cdBeam.position.y = 4;
pickupCD.add(cdBeam);

// Partikler rundt CD-en
const cdParticlesGeometry = new THREE.BufferGeometry();
const cdParticleCount = 30;
const cdParticlePositions = new Float32Array(cdParticleCount * 3);
for (let i = 0; i < cdParticleCount; i++) {
    const angle = (i / cdParticleCount) * Math.PI * 2;
    const radius = 0.7 + Math.random() * 0.3;
    cdParticlePositions[i * 3] = Math.cos(angle) * radius;
    cdParticlePositions[i * 3 + 1] = Math.random() * 3;
    cdParticlePositions[i * 3 + 2] = Math.sin(angle) * radius;
}
cdParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(cdParticlePositions, 3));
const cdParticlesMaterial = new THREE.PointsMaterial({
    color: 0xf4d03f,
    size: 0.15,
    transparent: true,
    opacity: 0.8
});
const cdParticles = new THREE.Points(cdParticlesGeometry, cdParticlesMaterial);
pickupCD.add(cdParticles);

// TILFELDIG POSISJON (8-15 enheter fra boksen, ikke for langt)
const cdAngle = Math.random() * Math.PI * 2;
const cdDistance = 8 + Math.random() * 7; // 8-15 enheter unna
const cdX = Math.cos(cdAngle) * cdDistance;
const cdZ = Math.sin(cdAngle) * cdDistance;

pickupCD.position.set(cdX, GROUND_LEVEL + 0.2, cdZ);
scene.add(pickupCD);

console.log('💿 CD plassert på:', cdX.toFixed(1), cdZ.toFixed(1));

// CD-state
let hasCDPickedUp = false;
let cdInserted = false;

// STERK Spotlight på CD-en
const cdSpotlight = new THREE.SpotLight(0xf4d03f, 5, 20, Math.PI / 4, 0.5);
cdSpotlight.position.set(cdX, GROUND_LEVEL + 10, cdZ);
cdSpotlight.target = pickupCD;
scene.add(cdSpotlight);
scene.add(cdSpotlight.target);

// Ekstra punktlys for synlighet
const cdPointLight = new THREE.PointLight(0xf4d03f, 3, 8);
cdPointLight.position.set(cdX, GROUND_LEVEL + 2, cdZ);
scene.add(cdPointLight);

// ============================================
// DJ PÅ SCENEN MED MIKSER (Synlig når musikk spiller)
// ============================================
const dj = new THREE.Group();

// ========== DJ-BORD MED UTSTYR ==========
const djBoothGroup = new THREE.Group();

// DJ-bord
const djTableGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
const djTableMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const djTable = new THREE.Mesh(djTableGeometry, djTableMaterial);
djTable.position.set(0, 0.9, 0.3);
djBoothGroup.add(djTable);

// Bord-front (skrå)
const djFrontGeometry = new THREE.BoxGeometry(2, 0.8, 0.1);
const djFront = new THREE.Mesh(djFrontGeometry, djTableMaterial);
djFront.position.set(0, 0.55, 0.65);
djBoothGroup.add(djFront);

// LED-stripe på fronten
const ledStripeGeometry = new THREE.BoxGeometry(1.8, 0.05, 0.02);
const ledStripeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const ledStripe = new THREE.Mesh(ledStripeGeometry, ledStripeMaterial);
ledStripe.position.set(0, 0.7, 0.66);
djBoothGroup.add(ledStripe);

// LED-panel på fronten av DJ-booth (i stedet for navn)
const ledPanelGeometry = new THREE.BoxGeometry(1.8, 0.3, 0.02);
const ledPanelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const ledPanel = new THREE.Mesh(ledPanelGeometry, ledPanelMaterial);
ledPanel.position.set(0, 0.4, 0.66);
djBoothGroup.add(ledPanel);

// ========== VENSTRE PLATESPILLER ==========
const leftDeckGroup = new THREE.Group();

// Platespiller-base
const deckBaseGeometry = new THREE.BoxGeometry(0.6, 0.08, 0.5);
const deckBaseMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
const leftDeckBase = new THREE.Mesh(deckBaseGeometry, deckBaseMaterial);
leftDeckBase.position.y = 0.04;
leftDeckGroup.add(leftDeckBase);

// Plate/vinyl
const vinylGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32);
const vinylMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
const leftVinyl = new THREE.Mesh(vinylGeometry, vinylMaterial);
leftVinyl.position.y = 0.09;
leftDeckGroup.add(leftVinyl);

// Plate-etikett
const labelGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.025, 32);
const labelMaterial = new THREE.MeshLambertMaterial({ color: 0xf4d03f }); // Gul - Tropicana
const leftLabel = new THREE.Mesh(labelGeometry, labelMaterial);
leftLabel.position.y = 0.1;
leftDeckGroup.add(leftLabel);

// Tonearm
const tonearmBaseGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8);
const tonearmMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
const leftTonearmBase = new THREE.Mesh(tonearmBaseGeometry, tonearmMaterial);
leftTonearmBase.position.set(0.22, 0.12, 0.15);
leftDeckGroup.add(leftTonearmBase);

const tonearmGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.2);
const leftTonearm = new THREE.Mesh(tonearmGeometry, tonearmMaterial);
leftTonearm.position.set(0.15, 0.14, 0.05);
leftTonearm.rotation.y = -0.3;
leftDeckGroup.add(leftTonearm);

leftDeckGroup.position.set(-0.55, 0.95, 0.2);
djBoothGroup.add(leftDeckGroup);

// ========== HØYRE PLATESPILLER ==========
const rightDeckGroup = leftDeckGroup.clone();
rightDeckGroup.position.x = 0.55;
djBoothGroup.add(rightDeckGroup);

// Referanser for animasjon
const rightVinyl = rightDeckGroup.children[1];
const rightLabel = rightDeckGroup.children[2];

// ========== MIKSER I MIDTEN ==========
const mixerGroup = new THREE.Group();

// Mikser-kropp
const mixerBodyGeometry = new THREE.BoxGeometry(0.5, 0.06, 0.4);
const mixerBodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const mixerBody = new THREE.Mesh(mixerBodyGeometry, mixerBodyMaterial);
mixerBody.position.y = 0.03;
mixerGroup.add(mixerBody);

// Faders (skyveknapper)
for (let i = 0; i < 4; i++) {
    const faderTrackGeometry = new THREE.BoxGeometry(0.02, 0.01, 0.15);
    const faderTrackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const faderTrack = new THREE.Mesh(faderTrackGeometry, faderTrackMaterial);
    faderTrack.position.set(-0.15 + i * 0.1, 0.07, 0);
    mixerGroup.add(faderTrack);
    
    const faderKnobGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.03);
    const faderKnobMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3 });
    const faderKnob = new THREE.Mesh(faderKnobGeometry, faderKnobMaterial);
    faderKnob.position.set(-0.15 + i * 0.1, 0.08, (Math.random() - 0.5) * 0.1);
    mixerGroup.add(faderKnob);
}

// Crossfader
const crossfaderTrackGeometry = new THREE.BoxGeometry(0.2, 0.01, 0.02);
const crossfaderTrack = new THREE.Mesh(crossfaderTrackGeometry, new THREE.MeshLambertMaterial({ color: 0x333333 }));
crossfaderTrack.position.set(0, 0.07, 0.12);
mixerGroup.add(crossfaderTrack);

const crossfaderKnobGeometry = new THREE.BoxGeometry(0.04, 0.025, 0.04);
const crossfaderKnob = new THREE.Mesh(crossfaderKnobGeometry, new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.3 }));
crossfaderKnob.position.set(0, 0.085, 0.12);
mixerGroup.add(crossfaderKnob);

// EQ-knotter
for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
        const knobGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12);
        const knobMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
        const knob = new THREE.Mesh(knobGeometry, knobMaterial);
        knob.position.set(-0.12 + col * 0.12, 0.08, -0.1 - row * 0.06);
        mixerGroup.add(knob);
    }
}

mixerGroup.position.set(0, 0.95, 0.3);
djBoothGroup.add(mixerGroup);

// ========== LAPTOP ==========
const laptopGroup = new THREE.Group();

// Laptop base
const laptopBaseGeometry = new THREE.BoxGeometry(0.35, 0.02, 0.25);
const laptopMaterial = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
const laptopBase = new THREE.Mesh(laptopBaseGeometry, laptopMaterial);
laptopGroup.add(laptopBase);

// Laptop skjerm
const laptopScreenGeometry = new THREE.BoxGeometry(0.33, 0.22, 0.01);
const laptopScreen = new THREE.Mesh(laptopScreenGeometry, laptopMaterial);
laptopScreen.position.set(0, 0.12, -0.12);
laptopScreen.rotation.x = -0.3;
laptopGroup.add(laptopScreen);

// Skjerm-display
const laptopDisplayGeometry = new THREE.BoxGeometry(0.30, 0.18, 0.005);
const laptopDisplayMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff });
const laptopDisplay = new THREE.Mesh(laptopDisplayGeometry, laptopDisplayMaterial);
laptopDisplay.position.set(0, 0.12, -0.115);
laptopDisplay.rotation.x = -0.3;
laptopGroup.add(laptopDisplay);

laptopGroup.position.set(0, 1.0, -0.15);
djBoothGroup.add(laptopGroup);

// ========== HODETELEFONER PÅ BORDET ==========
const headphonesOnTable = new THREE.Group();
const hpBandGeometry = new THREE.TorusGeometry(0.08, 0.01, 8, 16, Math.PI);
const hpMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const hpBand = new THREE.Mesh(hpBandGeometry, hpMaterial);
hpBand.rotation.x = Math.PI / 2;
headphonesOnTable.add(hpBand);

const hpCupGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12);
const hpLeftCup = new THREE.Mesh(hpCupGeometry, hpMaterial);
hpLeftCup.position.set(-0.08, 0, 0);
hpLeftCup.rotation.z = Math.PI / 2;
headphonesOnTable.add(hpLeftCup);
const hpRightCup = hpLeftCup.clone();
hpRightCup.position.x = 0.08;
headphonesOnTable.add(hpRightCup);

headphonesOnTable.position.set(0.7, 1.0, 0.1);
headphonesOnTable.rotation.y = 0.5;
djBoothGroup.add(headphonesOnTable);

dj.add(djBoothGroup);

// ========== DJ-PERSONEN (MER REALISTISK) ==========
const djPerson = new THREE.Group();

// Hode (mer detaljert)
const djHeadGeometry = new THREE.SphereGeometry(0.24, 32, 32);
const djSkinMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xc68642, 
    roughness: 0.8,
    metalness: 0.1
});
const djHead = new THREE.Mesh(djHeadGeometry, djSkinMaterial);
djHead.position.y = 1.65;
djHead.scale.set(1, 1.1, 0.95);
djPerson.add(djHead);

// Hår (kort fade-stil)
const djHairMaterial = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
const djHairGeometry = new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
const djHair = new THREE.Mesh(djHairGeometry, djHairMaterial);
djHair.position.y = 1.72;
djHair.scale.set(1, 0.5, 0.95);
djPerson.add(djHair);

// Hår-detaljer (fade på sidene)
const fadeGeometry = new THREE.BoxGeometry(0.02, 0.15, 0.2);
const fadeMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const leftFade = new THREE.Mesh(fadeGeometry, fadeMaterial);
leftFade.position.set(-0.23, 1.62, 0);
djPerson.add(leftFade);
const rightFade = leftFade.clone();
rightFade.position.x = 0.23;
djPerson.add(rightFade);

// Øyenbryn (DJ)
const djEyebrowGeom = new THREE.BoxGeometry(0.08, 0.015, 0.02);
const djEyebrowMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
const djLeftEyebrow = new THREE.Mesh(djEyebrowGeom, djEyebrowMat);
djLeftEyebrow.position.set(-0.07, 1.72, 0.2);
djLeftEyebrow.rotation.z = -0.1;
djPerson.add(djLeftEyebrow);
const djRightEyebrow = djLeftEyebrow.clone();
djRightEyebrow.position.x = 0.07;
djRightEyebrow.rotation.z = 0.1;
djPerson.add(djRightEyebrow);

// Øyne (mer detaljerte)
const djEyeWhiteGeom = new THREE.SphereGeometry(0.035, 12, 12);
const djEyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const djLeftEyeWhite = new THREE.Mesh(djEyeWhiteGeom, djEyeWhiteMat);
djLeftEyeWhite.position.set(-0.07, 1.67, 0.2);
djLeftEyeWhite.scale.z = 0.5;
djPerson.add(djLeftEyeWhite);
const djRightEyeWhite = djLeftEyeWhite.clone();
djRightEyeWhite.position.x = 0.07;
djPerson.add(djRightEyeWhite);

const djPupilGeom = new THREE.SphereGeometry(0.018, 8, 8);
const djPupilMat = new THREE.MeshBasicMaterial({ color: 0x2a1a0a });
const djLeftPupil = new THREE.Mesh(djPupilGeom, djPupilMat);
djLeftPupil.position.set(-0.07, 1.67, 0.22);
djPerson.add(djLeftPupil);
const djRightPupil = djLeftPupil.clone();
djRightPupil.position.x = 0.07;
djPerson.add(djRightPupil);

// Nese
const djNoseGeom = new THREE.ConeGeometry(0.025, 0.05, 8);
const djNose = new THREE.Mesh(djNoseGeom, djSkinMaterial);
djNose.position.set(0, 1.62, 0.22);
djNose.rotation.x = Math.PI;
djPerson.add(djNose);

// Munn
const djMouthGeom = new THREE.BoxGeometry(0.06, 0.015, 0.01);
const djMouthMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
const djMouth = new THREE.Mesh(djMouthGeom, djMouthMat);
djMouth.position.set(0, 1.55, 0.2);
djPerson.add(djMouth);

// Skjegg-stubber (5 o'clock shadow)
const stubbleGeom = new THREE.BoxGeometry(0.15, 0.08, 0.02);
const stubbleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.3 });
const stubble = new THREE.Mesh(stubbleGeom, stubbleMat);
stubble.position.set(0, 1.52, 0.18);
djPerson.add(stubble);

// Ører
const djEarGeom = new THREE.SphereGeometry(0.04, 8, 8);
const djLeftEar = new THREE.Mesh(djEarGeom, djSkinMaterial);
djLeftEar.position.set(-0.23, 1.65, 0.02);
djLeftEar.scale.set(0.5, 1, 0.7);
djPerson.add(djLeftEar);
const djRightEar = djLeftEar.clone();
djRightEar.position.x = 0.23;
djPerson.add(djRightEar);

// Hodetelefoner (PROFESJONELLE - som Pioneer HDJ)
const djHpMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.7 });
const djHpBandGeometry = new THREE.TorusGeometry(0.22, 0.02, 12, 24, Math.PI);
const djHpBand = new THREE.Mesh(djHpBandGeometry, djHpMaterial);
djHpBand.position.set(0, 1.78, 0);
djHpBand.rotation.z = Math.PI / 2;
djPerson.add(djHpBand);

// Polstring på toppen
const hpPaddingGeom = new THREE.BoxGeometry(0.08, 0.03, 0.06);
const hpPaddingMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
const hpPadding = new THREE.Mesh(hpPaddingGeom, hpPaddingMat);
hpPadding.position.set(0, 1.8, 0);
djPerson.add(hpPadding);

// Høyttaler-cups (store, profesjonelle)
const djHpCupGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16);
const djHpLeftCup = new THREE.Mesh(djHpCupGeometry, djHpMaterial);
djHpLeftCup.position.set(-0.26, 1.65, 0);
djHpLeftCup.rotation.z = Math.PI / 2;
djPerson.add(djHpLeftCup);
const djHpRightCup = djHpLeftCup.clone();
djHpRightCup.position.x = 0.26;
djPerson.add(djHpRightCup);

// Øreputer
const earPadGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
const earPadMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
const leftEarPad = new THREE.Mesh(earPadGeom, earPadMat);
leftEarPad.position.set(-0.24, 1.65, 0);
leftEarPad.rotation.z = Math.PI / 2;
djPerson.add(leftEarPad);
const rightEarPad = leftEarPad.clone();
rightEarPad.position.x = 0.24;
djPerson.add(rightEarPad);

// Nakke
const djNeckGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.1, 12);
const djNeck = new THREE.Mesh(djNeckGeom, djSkinMaterial);
djNeck.position.y = 1.45;
djPerson.add(djNeck);

// Kropp - Svart hoodie
const djTorsoGeometry = new THREE.CylinderGeometry(0.22, 0.26, 0.55, 16);
const djHoodieMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const djTorso = new THREE.Mesh(djTorsoGeometry, djHoodieMaterial);
djTorso.position.y = 1.12;
djPerson.add(djTorso);

// Hoodie-hette (bak)
const hoodGeom = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
const hood = new THREE.Mesh(hoodGeom, djHoodieMaterial);
hood.position.set(0, 1.35, -0.1);
hood.rotation.x = 0.5;
djPerson.add(hood);

// Hoodie-lomme foran
const pocketGeom = new THREE.BoxGeometry(0.3, 0.12, 0.02);
const pocket = new THREE.Mesh(pocketGeom, new THREE.MeshLambertMaterial({ color: 0x151515 }));
pocket.position.set(0, 0.95, 0.24);
djPerson.add(pocket);

// Overarmer
const djUpperArmGeom = new THREE.CapsuleGeometry(0.055, 0.2, 4, 8);
const djLeftUpperArm = new THREE.Mesh(djUpperArmGeom, djHoodieMaterial);
djLeftUpperArm.position.set(-0.28, 1.2, 0.05);
djLeftUpperArm.rotation.x = -0.6;
djLeftUpperArm.rotation.z = 0.3;
djPerson.add(djLeftUpperArm);

const djRightUpperArm = new THREE.Mesh(djUpperArmGeom, djHoodieMaterial);
djRightUpperArm.position.set(0.28, 1.2, 0.05);
djRightUpperArm.rotation.x = -0.6;
djRightUpperArm.rotation.z = -0.3;
djPerson.add(djRightUpperArm);

// Underarmer (hudfarget)
const djForearmGeom = new THREE.CapsuleGeometry(0.04, 0.15, 4, 8);
const djLeftForearm = new THREE.Mesh(djForearmGeom, djSkinMaterial);
djLeftForearm.position.set(-0.35, 1.0, 0.25);
djLeftForearm.rotation.x = -1.2;
djPerson.add(djLeftForearm);

const djRightForearm = new THREE.Mesh(djForearmGeom, djSkinMaterial);
djRightForearm.position.set(0.35, 1.0, 0.25);
djRightForearm.rotation.x = -1.2;
djPerson.add(djRightForearm);

// Hender (på mikseren)
const djHandGeometry = new THREE.SphereGeometry(0.04, 12, 12);
const djLeftHand = new THREE.Mesh(djHandGeometry, djSkinMaterial);
djLeftHand.position.set(-0.38, 0.92, 0.35);
djPerson.add(djLeftHand);
const djRightHand = new THREE.Mesh(djHandGeometry, djSkinMaterial);
djRightHand.position.set(0.38, 0.92, 0.35);
djPerson.add(djRightHand);

// Fingre (enkle)
for (let h = 0; h < 2; h++) {
    const handX = h === 0 ? -0.38 : 0.38;
    for (let f = 0; f < 4; f++) {
        const fingerGeom = new THREE.CapsuleGeometry(0.008, 0.03, 4, 4);
        const finger = new THREE.Mesh(fingerGeom, djSkinMaterial);
        finger.position.set(handX - 0.02 + f * 0.015, 0.9, 0.38);
        finger.rotation.x = -0.5;
        djPerson.add(finger);
    }
}

// Svarte jeans
const djPantsGeometry = new THREE.CylinderGeometry(0.2, 0.18, 0.3, 16);
const djPantsMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
const djPants = new THREE.Mesh(djPantsGeometry, djPantsMaterial);
djPants.position.y = 0.7;
djPerson.add(djPants);

// Ben
const djLegGeometry = new THREE.CapsuleGeometry(0.06, 0.4, 4, 8);
const djLeftLeg = new THREE.Mesh(djLegGeometry, djPantsMaterial);
djLeftLeg.position.set(-0.1, 0.35, 0);
djPerson.add(djLeftLeg);
const djRightLegMesh = new THREE.Mesh(djLegGeometry, djPantsMaterial);
djRightLegMesh.position.set(0.1, 0.35, 0);
djPerson.add(djRightLegMesh);

// Sko (Nike/Jordan stil)
const djShoeGeometry = new THREE.BoxGeometry(0.1, 0.06, 0.18);
const djShoeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const djLeftShoe = new THREE.Mesh(djShoeGeometry, djShoeMaterial);
djLeftShoe.position.set(-0.1, 0.1, 0.02);
djPerson.add(djLeftShoe);
const djRightShoe = djLeftShoe.clone();
djRightShoe.position.x = 0.1;
djPerson.add(djRightShoe);

// Sko-såle (svart)
const soleGeom = new THREE.BoxGeometry(0.1, 0.02, 0.18);
const soleMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
const leftSole = new THREE.Mesh(soleGeom, soleMat);
leftSole.position.set(-0.1, 0.06, 0.02);
djPerson.add(leftSole);
const rightSole = leftSole.clone();
rightSole.position.x = 0.1;
djPerson.add(rightSole);

// Sko-detaljer (rød swoosh)
const swooshGeom = new THREE.BoxGeometry(0.06, 0.015, 0.01);
const swooshMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const leftSwoosh = new THREE.Mesh(swooshGeom, swooshMat);
leftSwoosh.position.set(-0.1, 0.1, 0.1);
djPerson.add(leftSwoosh);
const rightSwoosh = leftSwoosh.clone();
rightSwoosh.position.x = 0.1;
djPerson.add(rightSwoosh);

djPerson.position.set(0, 0, -0.3);
dj.add(djPerson);

// Referanser for animasjon
const djLeftArm = djLeftUpperArm;
const djRightArm = djRightUpperArm;

// Spotlight på DJ-en
const djSpotlight = new THREE.SpotLight(0xffffff, 0, 20, Math.PI / 4, 0.5);
djSpotlight.position.set(0, GROUND_LEVEL + boxHeight + 8, 3);
djSpotlight.target = dj;
scene.add(djSpotlight);

// Plasser DJ på toppen av boksen
dj.position.set(0, GROUND_LEVEL + boxHeight, 0);
dj.visible = false;
scene.add(dj);

// Referanser for animasjon
const artist = dj; // Kompatibilitet
const artistSpotlight = djSpotlight;
let djBouncePhase = 0;

// Referanse for kassettspiller-kompatibilitet
const cassettePlayer = musicBox;
const leftWheel = cdDisc;
const rightWheel = cdLabel;
scene.add(cassettePlayer);

// Musikknoter og partikler
const musicNotes = [];

// ============================================
// AVATAR - Francisco (Slank, kort hår, solbriller, Brasil-drakt)
// ============================================
const avatar = new THREE.Group();

// Hode
const headGeometry2 = new THREE.SphereGeometry(0.30, 24, 24);
const skinMaterial2 = new THREE.MeshLambertMaterial({ color: 0xd4a574 }); // Lys-medium hudtone
const head2 = new THREE.Mesh(headGeometry2, skinMaterial2);
head2.position.y = 1.55;
head2.scale.set(0.95, 1.1, 0.9);
head2.castShadow = true;
avatar.add(head2);

// Kort, stylet hår (swept up style)
const hairGroup = new THREE.Group();
const hairMaterial2 = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

// Kort base-hår
const baseHairGeometry = new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.4);
const baseHair = new THREE.Mesh(baseHairGeometry, hairMaterial2);
baseHair.position.y = 1.62;
baseHair.scale.set(0.95, 0.6, 0.9);
hairGroup.add(baseHair);

// Stylet topp (swept up)
const topHairGeometry = new THREE.BoxGeometry(0.4, 0.15, 0.3);
const topHair = new THREE.Mesh(topHairGeometry, hairMaterial2);
topHair.position.set(0, 1.82, -0.02);
topHair.rotation.x = -0.2;
hairGroup.add(topHair);

// Hår-tekstur detaljer på toppen
for (let i = 0; i < 8; i++) {
    const strandGeometry = new THREE.BoxGeometry(0.05, 0.12, 0.08);
    const strand = new THREE.Mesh(strandGeometry, hairMaterial2);
    strand.position.set(
        -0.15 + i * 0.04,
        1.85,
        0.05 - Math.random() * 0.05
    );
    strand.rotation.z = (Math.random() - 0.5) * 0.3;
    strand.rotation.x = -0.3;
    hairGroup.add(strand);
}

// Sider av håret (kort fade)
const sideHairGeometry = new THREE.BoxGeometry(0.05, 0.2, 0.25);
const leftSideHair = new THREE.Mesh(sideHairGeometry, hairMaterial2);
leftSideHair.position.set(-0.28, 1.6, 0);
hairGroup.add(leftSideHair);

const rightSideHair = leftSideHair.clone();
rightSideHair.position.x = 0.28;
hairGroup.add(rightSideHair);

avatar.add(hairGroup);

// ============================================
// SOLBRILLER (Sporty stil)
// ============================================
const sunglassesGroup = new THREE.Group();
const glassMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x111111, 
    metalness: 0.9,
    roughness: 0.1
});
const frameMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    metalness: 0.5,
    roughness: 0.3
});

// Venstre glass (wrap-around style)
const leftLensShape = new THREE.Shape();
leftLensShape.moveTo(0, 0);
leftLensShape.lineTo(0.12, 0.02);
leftLensShape.lineTo(0.14, 0.06);
leftLensShape.lineTo(0.12, 0.08);
leftLensShape.lineTo(0, 0.07);
leftLensShape.lineTo(-0.02, 0.04);
leftLensShape.closePath();

const lensExtrudeSettings = { depth: 0.04, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005 };
const leftLensGeometry = new THREE.ExtrudeGeometry(leftLensShape, lensExtrudeSettings);
const leftLens = new THREE.Mesh(leftLensGeometry, glassMaterial);
leftLens.position.set(-0.06, 1.54, 0.26);
leftLens.rotation.y = 0.2;
sunglassesGroup.add(leftLens);

// Høyre glass
const rightLens = leftLens.clone();
rightLens.position.x = 0.06;
rightLens.rotation.y = -0.2;
rightLens.scale.x = -1;
sunglassesGroup.add(rightLens);

// Bro mellom glassene
const bridgeGeometry = new THREE.BoxGeometry(0.06, 0.015, 0.02);
const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
bridge.position.set(0, 1.57, 0.3);
sunglassesGroup.add(bridge);

// Stenger (arms)
const templeGeometry = new THREE.BoxGeometry(0.22, 0.015, 0.01);
const leftTemple = new THREE.Mesh(templeGeometry, frameMaterial);
leftTemple.position.set(-0.2, 1.57, 0.15);
leftTemple.rotation.y = Math.PI / 2 - 0.3;
sunglassesGroup.add(leftTemple);

const rightTemple = leftTemple.clone();
rightTemple.position.x = 0.2;
rightTemple.rotation.y = -(Math.PI / 2 - 0.3);
sunglassesGroup.add(rightTemple);

avatar.add(sunglassesGroup);

// Øyenbryn (synlige over solbrillene)
const eyebrowGeometry = new THREE.BoxGeometry(0.1, 0.025, 0.02);
const eyebrowMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
leftEyebrow.position.set(-0.1, 1.66, 0.27);
leftEyebrow.rotation.z = 0.1;
avatar.add(leftEyebrow);

const rightEyebrow = leftEyebrow.clone();
rightEyebrow.position.x = 0.1;
rightEyebrow.rotation.z = -0.1;
avatar.add(rightEyebrow);

// Nese
const noseGeometry = new THREE.ConeGeometry(0.035, 0.07, 8);
const nose = new THREE.Mesh(noseGeometry, skinMaterial2);
nose.position.set(0, 1.48, 0.28);
nose.rotation.x = Math.PI;
avatar.add(nose);

// Munn (lett smil)
const mouthGeometry = new THREE.TorusGeometry(0.04, 0.008, 8, 16, Math.PI);
const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0xcc8866 });
const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
mouth.position.set(0, 1.40, 0.26);
mouth.rotation.x = Math.PI;
avatar.add(mouth);

// Ører
const earGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const leftEar = new THREE.Mesh(earGeometry, skinMaterial2);
leftEar.position.set(-0.28, 1.55, 0.05);
leftEar.scale.set(0.5, 1, 0.7);
avatar.add(leftEar);

const rightEar = leftEar.clone();
rightEar.position.x = 0.28;
avatar.add(rightEar);

// ============================================
// KROPP - Slank bygning med Brasil-drakt
// ============================================

// Nakke
const neckGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12);
const neck = new THREE.Mesh(neckGeometry, skinMaterial2);
neck.position.y = 1.32;
avatar.add(neck);

// Overkropp - Brasil-drakt (slank)
const torsoGeometry = new THREE.CylinderGeometry(0.22, 0.25, 0.55, 16);
const jerseyMaterial2 = new THREE.MeshLambertMaterial({ color: 0xf4d03f }); // Brasil gul
const torso2 = new THREE.Mesh(torsoGeometry, jerseyMaterial2);
torso2.position.y = 0.98;
torso2.castShadow = true;
avatar.add(torso2);

// Brasil CBF-logo
const logoShape = new THREE.Shape();
logoShape.moveTo(0, 0.10);
logoShape.lineTo(0.08, 0);
logoShape.lineTo(0, -0.10);
logoShape.lineTo(-0.08, 0);
logoShape.closePath();
const logoGeometry = new THREE.ShapeGeometry(logoShape);
const logoMaterial = new THREE.MeshLambertMaterial({ color: 0x009c3b, side: THREE.DoubleSide });
const logo = new THREE.Mesh(logoGeometry, logoMaterial);
logo.position.set(0, 1.02, 0.23);
avatar.add(logo);

// Blå sirkel i logoen
const logoCircleGeometry = new THREE.CircleGeometry(0.04, 16);
const logoCircleMaterial = new THREE.MeshLambertMaterial({ color: 0x002776, side: THREE.DoubleSide });
const logoCircle = new THREE.Mesh(logoCircleGeometry, logoCircleMaterial);
logoCircle.position.set(0, 1.02, 0.235);
avatar.add(logoCircle);

// Grønn krage
const collarGeometry = new THREE.TorusGeometry(0.15, 0.025, 8, 16);
const collarMaterial = new THREE.MeshLambertMaterial({ color: 0x009c3b });
const collar = new THREE.Mesh(collarGeometry, collarMaterial);
collar.position.y = 1.26;
collar.rotation.x = Math.PI / 2;
avatar.add(collar);

// ============================================
// BRASIL-FLAGG OVER SKULDRENE
// ============================================
const flagGroup = new THREE.Group();

// Flagg-stoff (drapert over skuldrene)
const flagMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x009c3b, // Grønn
    side: THREE.DoubleSide 
});
const flagYellowMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xf4d03f, // Gul
    side: THREE.DoubleSide 
});

// Venstre side av flagget
const leftFlagGeometry = new THREE.PlaneGeometry(0.35, 0.6);
const leftFlag = new THREE.Mesh(leftFlagGeometry, flagMaterial);
leftFlag.position.set(-0.32, 0.95, 0.05);
leftFlag.rotation.y = 0.4;
leftFlag.rotation.z = 0.1;
flagGroup.add(leftFlag);

// Gul diamant på venstre
const leftDiamondGeometry = new THREE.PlaneGeometry(0.15, 0.25);
const leftDiamond = new THREE.Mesh(leftDiamondGeometry, flagYellowMaterial);
leftDiamond.position.set(-0.32, 0.95, 0.06);
leftDiamond.rotation.y = 0.4;
leftDiamond.rotation.z = 0.1 + Math.PI/4;
flagGroup.add(leftDiamond);

// Høyre side av flagget
const rightFlag = leftFlag.clone();
rightFlag.position.x = 0.32;
rightFlag.rotation.y = -0.4;
rightFlag.rotation.z = -0.1;
flagGroup.add(rightFlag);

// Gul diamant på høyre
const rightDiamond = leftDiamond.clone();
rightDiamond.position.x = 0.32;
rightDiamond.rotation.y = -0.4;
rightDiamond.rotation.z = -0.1 + Math.PI/4;
flagGroup.add(rightDiamond);

avatar.add(flagGroup);

// ============================================
// ARMER (Slanke)
// ============================================
const armGeometry2 = new THREE.CapsuleGeometry(0.055, 0.32, 4, 8);

const leftArm2 = new THREE.Mesh(armGeometry2, jerseyMaterial2);
leftArm2.position.set(-0.30, 1.0, 0);
leftArm2.rotation.z = 0.25;
leftArm2.castShadow = true;
avatar.add(leftArm2);

const rightArm2 = leftArm2.clone();
rightArm2.position.x = 0.30;
rightArm2.rotation.z = -0.25;
avatar.add(rightArm2);

// Underarmer (hud)
const forearmGeometry = new THREE.CapsuleGeometry(0.045, 0.2, 4, 8);
const leftForearm = new THREE.Mesh(forearmGeometry, skinMaterial2);
leftForearm.position.set(-0.38, 0.72, 0);
leftForearm.rotation.z = 0.15;
avatar.add(leftForearm);

const rightForearm = leftForearm.clone();
rightForearm.position.x = 0.38;
rightForearm.rotation.z = -0.15;
avatar.add(rightForearm);

// Hender
const handGeometry2 = new THREE.SphereGeometry(0.055, 12, 12);
const leftHand2 = new THREE.Mesh(handGeometry2, skinMaterial2);
leftHand2.position.set(-0.42, 0.55, 0);
leftHand2.castShadow = true;
avatar.add(leftHand2);

const rightHand2 = leftHand2.clone();
rightHand2.position.x = 0.42;
avatar.add(rightHand2);

// ============================================
// SVARTE BUKSER (ikke jeans)
// ============================================
const pantsGeometry = new THREE.CylinderGeometry(0.23, 0.2, 0.3, 16);
const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // Svart
const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
pants.position.y = 0.55;
pants.castShadow = true;
avatar.add(pants);

// Ben (slanke)
const legGeometry2 = new THREE.CapsuleGeometry(0.07, 0.42, 4, 8);
const leftLeg2 = new THREE.Mesh(legGeometry2, pantsMaterial);
leftLeg2.position.set(-0.1, 0.22, 0);
leftLeg2.castShadow = true;
avatar.add(leftLeg2);

const rightLeg2 = leftLeg2.clone();
rightLeg2.position.x = 0.1;
avatar.add(rightLeg2);

// Sko (mørke sneakers)
const shoeGeometry2 = new THREE.BoxGeometry(0.1, 0.07, 0.2);
const shoeMaterial2 = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
const leftShoe2 = new THREE.Mesh(shoeGeometry2, shoeMaterial2);
leftShoe2.position.set(-0.1, 0.01, 0.03);
leftShoe2.castShadow = true;
avatar.add(leftShoe2);

const rightShoe2 = leftShoe2.clone();
rightShoe2.position.x = 0.1;
avatar.add(rightShoe2);

// Hvit såle-stripe
const soleStripeGeometry = new THREE.BoxGeometry(0.1, 0.015, 0.2);
const soleStripeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const leftSoleStripe = new THREE.Mesh(soleStripeGeometry, soleStripeMaterial);
leftSoleStripe.position.set(-0.1, -0.02, 0.03);
avatar.add(leftSoleStripe);

const rightSoleStripe = leftSoleStripe.clone();
rightSoleStripe.position.x = 0.1;
avatar.add(rightSoleStripe);

avatar.position.set(5, GROUND_LEVEL, 10);
avatar.rotation.y = -0.5; // Ser mot boksen
scene.add(avatar);

// ============================================
// FEST-EFFEKTER (Aktiveres når musikk spiller)
// ============================================

// Disco-lys (REDUSERT for ytelse - én farge som flasher)
const discoLights = [];
const DISCO_COLOR = 0x00ffff; // Turkis/cyan farge

for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const dist = 15;
    const light = new THREE.SpotLight(DISCO_COLOR, 0, 30, Math.PI / 6, 0.5);
    light.position.set(
        Math.cos(angle) * dist,
        GROUND_LEVEL + 12,
        Math.sin(angle) * dist
    );
    light.target.position.set(0, GROUND_LEVEL, 0);
    scene.add(light);
    scene.add(light.target);
    discoLights.push(light);
}

// Disco-ball i midten
const discoBallGeometry = new THREE.SphereGeometry(1.5, 16, 16);
const discoBallMaterial = new THREE.MeshStandardMaterial({
    color: DISCO_COLOR,
    metalness: 1,
    roughness: 0.1,
    emissive: DISCO_COLOR,
    emissiveIntensity: 0.3
});
const discoBall = new THREE.Mesh(discoBallGeometry, discoBallMaterial);
discoBall.position.set(0, GROUND_LEVEL + 15, 0);
discoBall.visible = false;
scene.add(discoBall);

// Disco-ball oppheng
const ropeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 5, 8);
const ropeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
rope.position.set(0, GROUND_LEVEL + 17.5, 0);
rope.visible = false;
scene.add(rope);

// Bobler (REDUSERT)
const bubbles = [];
const maxBubbles = 10;

function createBubble() {
    const size = 0.1 + Math.random() * 0.3;
    const bubbleGeometry = new THREE.SphereGeometry(size, 12, 12);
    const bubbleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        metalness: 0.1,
        roughness: 0.1
    });
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    
    // Random posisjon rundt øya
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 30;
    bubble.position.set(
        Math.cos(angle) * dist,
        GROUND_LEVEL + Math.random() * 2,
        Math.sin(angle) * dist
    );
    
    bubble.userData = {
        velocity: 0.02 + Math.random() * 0.05,
        wobbleSpeed: 2 + Math.random() * 3,
        wobbleAmount: 0.02 + Math.random() * 0.03,
        startX: bubble.position.x,
        startZ: bubble.position.z,
        life: 0
    };
    
    scene.add(bubble);
    bubbles.push(bubble);
}

// Konfetti-partikler (REDUSERT)
const confettiCount = 50;
const confettiGeometry = new THREE.BufferGeometry();
const confettiPositions = new Float32Array(confettiCount * 3);
const confettiColors = new Float32Array(confettiCount * 3);
const confettiVelocities = [];

for (let i = 0; i < confettiCount; i++) {
    confettiPositions[i * 3] = (Math.random() - 0.5) * 60;
    confettiPositions[i * 3 + 1] = GROUND_LEVEL + 10 + Math.random() * 10;
    confettiPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    
    // Random festfarger
    const color = new THREE.Color().setHSL(Math.random(), 1, 0.5);
    confettiColors[i * 3] = color.r;
    confettiColors[i * 3 + 1] = color.g;
    confettiColors[i * 3 + 2] = color.b;
    
    confettiVelocities.push({
        x: (Math.random() - 0.5) * 0.05,
        y: -0.02 - Math.random() * 0.03,
        z: (Math.random() - 0.5) * 0.05,
        spin: Math.random() * 0.1
    });
}

confettiGeometry.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3));
confettiGeometry.setAttribute('color', new THREE.BufferAttribute(confettiColors, 3));

const confettiMaterial = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0
});

const confetti = new THREE.Points(confettiGeometry, confettiMaterial);
scene.add(confetti);

// Laserstråler (REDUSERT for ytelse)
const laserBeams = [];
const laserMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0
});

for (let i = 0; i < 4; i++) {
    const laserGeometry = new THREE.CylinderGeometry(0.03, 0.03, 60, 6);
    const laser = new THREE.Mesh(laserGeometry, laserMaterial.clone());
    laser.position.set(0, GROUND_LEVEL + 10, 0);
    scene.add(laser);
    laserBeams.push(laser);
}

// ============================================
// PYRO / FLAMME-EFFEKTER (DEAKTIVERT FOR YTELSE)
// ============================================
const pyroFlames = [];
const co2Jets = [];
const strobeLights = [];
const movingHeads = [];

// FYRVERKERI / SPARK EFFEKTER (DEAKTIVERT FOR YTELSE)
const sparks = [];
const flameJets = [];

// Ekstra fest-lys på bakken (REDUSERT for ytelse)
const groundLights = [];
for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 10;
    const light = new THREE.PointLight(0x00ffff, 0, 12);
    light.position.set(
        Math.cos(angle) * dist,
        GROUND_LEVEL + 0.5,
        Math.sin(angle) * dist
    );
    scene.add(light);
    groundLights.push(light);
}

// FLOODLIGHTS (REDUSERT for ytelse)
const floodlights = [];
for (let i = 0; i < 2; i++) {
    const angle = (i / 2) * Math.PI + Math.PI / 4;
    const floodlight = new THREE.SpotLight(0x00ffff, 0, 40, Math.PI / 4, 0.3);
    floodlight.position.set(
        Math.cos(angle) * 18,
        GROUND_LEVEL + 10,
        Math.sin(angle) * 18
    );
    floodlight.target.position.set(0, GROUND_LEVEL, 0);
    scene.add(floodlight);
    scene.add(floodlight.target);
    floodlights.push(floodlight);
}

// ============================================
// ATMOSFÆRISKE PARTIKLER (REDUSERT)
// ============================================
const particleCount = 50;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleSizes = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 80;
    particlePositions[i * 3 + 1] = GROUND_LEVEL + 1 + Math.random() * 15;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    particleSizes[i] = 0.05 + Math.random() * 0.1;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

const particleMaterial = new THREE.PointsMaterial({
    color: 0xffeecc,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ============================================
// ILDFLUER (REDUSERT)
// ============================================
const fireflyCount = 10;
const fireflyGeometry = new THREE.BufferGeometry();
const fireflyPositions = new Float32Array(fireflyCount * 3);

for (let i = 0; i < fireflyCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 30;
    fireflyPositions[i * 3] = Math.cos(angle) * dist;
    fireflyPositions[i * 3 + 1] = GROUND_LEVEL + 0.5 + Math.random() * 3;
    fireflyPositions[i * 3 + 2] = Math.sin(angle) * dist;
}

fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));

const fireflyMaterial = new THREE.PointsMaterial({
    color: 0xffff88,
    size: 0.2,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
});

const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
scene.add(fireflies);

// ============================================
// SOMMERFUGLER
// ============================================
const butterflies = [];

function createButterfly() {
    const butterflyGroup = new THREE.Group();
    
    const wingColors = [0xff6b6b, 0xffd93d, 0x74b9ff, 0xa29bfe, 0xfd79a8];
    const wingColor = wingColors[Math.floor(Math.random() * wingColors.length)];
    
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.15, 0.1, 0.2, 0);
    wingShape.quadraticCurveTo(0.15, -0.1, 0, 0);
    
    const wingGeometry = new THREE.ShapeGeometry(wingShape);
    const wingMaterial = new THREE.MeshLambertMaterial({ 
        color: wingColor, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.x = 0.02;
    butterflyGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.rotation.y = Math.PI;
    rightWing.position.x = -0.02;
    butterflyGroup.add(rightWing);
    
    const bodyGeometry = new THREE.CapsuleGeometry(0.01, 0.08, 4, 4);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    butterflyGroup.add(body);
    
    butterflyGroup.position.set(
        (Math.random() - 0.5) * 40,
        GROUND_LEVEL + 1 + Math.random() * 3,
        (Math.random() - 0.5) * 40
    );
    
    butterflyGroup.userData = {
        baseY: butterflyGroup.position.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        radius: 2 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2,
        leftWing,
        rightWing
    };
    
    scene.add(butterflyGroup);
    return butterflyGroup;
}

for (let i = 0; i < 8; i++) {
    butterflies.push(createButterfly());
}

// ============================================
// KONTROLLER
// ============================================
const keys = { w: false, a: false, s: false, d: false, e: false };
const moveSpeed = 0.12;
let playerRotation = 0;

// Keyboard kontroller
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

// ============================================
// VIRTUAL JOYSTICK FOR MOBIL
// ============================================
const joystick = {
    active: false,
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0,
    maxDistance: 40
};

const joystickZone = document.getElementById('joystick-zone');
const joystickBase = document.getElementById('joystick-base');
const joystickThumb = document.getElementById('joystick-thumb');
const interactButton = document.getElementById('interact-button');

// Sjekk om det er touch-enhet
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

if (joystickZone) {
    // Joystick Touch Start
    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystickBase.getBoundingClientRect();
        
        joystick.active = true;
        joystick.startX = rect.left + rect.width / 2;
        joystick.startY = rect.top + rect.height / 2;
        
        joystickThumb.classList.add('active');
        updateJoystickPosition(touch.clientX, touch.clientY);
    }, { passive: false });

    // Joystick Touch Move
    joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystick.active) return;
        
        const touch = e.touches[0];
        updateJoystickPosition(touch.clientX, touch.clientY);
    }, { passive: false });

    // Joystick Touch End
    joystickZone.addEventListener('touchend', (e) => {
        e.preventDefault();
        resetJoystick();
    }, { passive: false });

    joystickZone.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        resetJoystick();
    }, { passive: false });
}

function updateJoystickPosition(touchX, touchY) {
    let deltaX = touchX - joystick.startX;
    let deltaY = touchY - joystick.startY;
    
    // Begrens til maksimal avstand
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > joystick.maxDistance) {
        deltaX = (deltaX / distance) * joystick.maxDistance;
        deltaY = (deltaY / distance) * joystick.maxDistance;
    }
    
    // Oppdater thumb posisjon
    joystickThumb.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    // Normaliser verdier (-1 til 1)
    joystick.moveX = deltaX / joystick.maxDistance;
    joystick.moveY = deltaY / joystick.maxDistance;
}

function resetJoystick() {
    joystick.active = false;
    joystick.moveX = 0;
    joystick.moveY = 0;
    joystickThumb.style.transform = 'translate(-50%, -50%)';
    joystickThumb.classList.remove('active');
}

// Interaksjonsknapp
if (interactButton) {
    interactButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.e = true;
        interactButton.classList.add('pressed');
    }, { passive: false });

    interactButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.e = false;
        interactButton.classList.remove('pressed');
    }, { passive: false });

    interactButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        keys.e = false;
        interactButton.classList.remove('pressed');
    }, { passive: false });
}

// Forhindre zoom og scroll på touch
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// Forhindre dobbeltklikk zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

// ============================================
// LYDSYSTEM
// ============================================
let audioContext = null;
let audioBuffer = null;
let audioSource = null;
let isPlaying = false;
let canInteract = false;
let eKeyPressed = false;

const interactionPrompt = document.getElementById('interaction-prompt');
const musicText = document.getElementById('music-text');

async function loadAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context if suspended (iOS requirement)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        const response = await fetch('./public/audio/Tequila demo v2.mp3');
        if (!response.ok) {
            console.log('Lydfilinnlasting feilet - sjekk at public/audio/Tequila demo v2.mp3 eksisterer');
            return;
        }
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('🎵 TROPICANA - Tequila lastet inn!');
    } catch (error) {
        console.log('Kunne ikke laste lyd:', error.message);
    }
}

// Aktiver audio context ved første touch/klikk (iOS krever brukerinteraksjon)
async function initAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        // Pre-last lyden
        if (!audioBuffer) {
            const response = await fetch('./public/audio/Tequila demo v2.mp3');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log('🎵 Lyd forhåndslastet!');
            }
        }
    } catch (e) {
        console.log('Audio init feil:', e);
    }
}

document.addEventListener('touchstart', initAudio, { once: true });
document.addEventListener('click', initAudio, { once: true });

async function toggleMusic() {
    // Opprett audio context hvis den ikke finnes
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume audio context if suspended (iOS krever dette)
    if (audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
        } catch (e) {
            console.log('Kunne ikke resume audio context:', e);
        }
    }
    
    // Last inn lyd hvis ikke lastet ennå
    if (!audioBuffer) {
        musicText.textContent = 'Laster lyd...';
        try {
            const response = await fetch('./public/audio/Tequila demo v2.mp3');
            if (!response.ok) {
                musicText.textContent = 'Lydfil ikke funnet';
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            console.log('🎵 TROPICANA - Tequila lastet inn!');
        } catch (error) {
            console.log('Kunne ikke laste lyd:', error.message);
            musicText.textContent = 'Lydfeil';
            return;
        }
    }
    
    if (isPlaying) {
        if (audioSource) {
            audioSource.stop();
            audioSource = null;
        }
        isPlaying = false;
        musicText.textContent = 'Musikk pauset ⏸️';
    } else {
        if (audioBuffer) {
            try {
                audioSource = audioContext.createBufferSource();
                audioSource.buffer = audioBuffer;
                audioSource.loop = true;
                audioSource.connect(audioContext.destination);
                audioSource.start();
                isPlaying = true;
                musicText.textContent = 'Tequila 🎵';
            } catch (e) {
                console.log('Kunne ikke starte musikk:', e);
                musicText.textContent = 'Avspillingsfeil';
            }
        } else {
            musicText.textContent = 'Ingen lydfil';
        }
    }
}

loadAudio();

// ============================================
// MUSIKKNOTER PARTIKLER
// ============================================
function createMusicNote() {
    const noteShapes = ['♪', '♫', '♬'];
    const colors = [0xff6b6b, 0xffd93d, 0x74b9ff, 0xa29bfe, 0x55efc4];
    
    const noteGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const noteMaterial = new THREE.MeshBasicMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true
    });
    const note = new THREE.Mesh(noteGeometry, noteMaterial);
    
    note.position.copy(cassettePlayer.position);
    note.position.y += 1.5;
    note.position.x += (Math.random() - 0.5) * 0.5;
    note.position.z += (Math.random() - 0.5) * 0.5;
    
    note.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            0.03 + Math.random() * 0.03,
            (Math.random() - 0.5) * 0.05
        ),
        life: 0,
        rotSpeed: (Math.random() - 0.5) * 0.2
    };
    
    scene.add(note);
    musicNotes.push(note);
}

// ============================================
// SPILLSLØYFE
// ============================================
const clock = new THREE.Clock();
const cameraOffset = new THREE.Vector3(0, 4, 8);
let walkCycle = 0;

function animate() {
    requestAnimationFrame(animate);
    
    // Skip rendering if tab is hidden (saves battery!)
    if (!isTabVisible) return;
    
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();
    
    // Oppdater hav
    oceanMaterial.uniforms.time.value = time;
    
    // Animer partikler (støv i sollys)
    const particlePos = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        particlePos[i * 3 + 1] += Math.sin(time + i) * 0.002;
        particlePos[i * 3] += Math.cos(time * 0.5 + i) * 0.001;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    
    // Animer ildfluer (blinkende og bevegelige)
    const fireflyPos = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < fireflyCount; i++) {
        fireflyPos[i * 3] += Math.sin(time * 2 + i * 0.5) * 0.02;
        fireflyPos[i * 3 + 1] += Math.cos(time * 1.5 + i * 0.3) * 0.01;
        fireflyPos[i * 3 + 2] += Math.sin(time * 1.8 + i * 0.7) * 0.02;
    }
    fireflies.geometry.attributes.position.needsUpdate = true;
    fireflyMaterial.opacity = 0.5 + Math.sin(time * 3) * 0.3;
    
    // Animer skyer
    clouds.forEach(cloud => {
        cloud.position.x += cloud.userData.speed;
        if (cloud.position.x > 200) cloud.position.x = -200;
    });
    
    // Animer sommerfugler
    butterflies.forEach(butterfly => {
        const data = butterfly.userData;
        data.angle += 0.02 * data.speed;
        data.phase += 0.1;
        
        butterfly.position.x += Math.cos(data.angle) * 0.05;
        butterfly.position.z += Math.sin(data.angle) * 0.05;
        butterfly.position.y = data.baseY + Math.sin(data.phase) * 0.3;
        
        // Vinge-animasjon
        data.leftWing.rotation.y = Math.sin(time * 15) * 0.5;
        data.rightWing.rotation.y = -Math.sin(time * 15) * 0.5;
        
        butterfly.rotation.y = data.angle + Math.PI / 2;
        
        // Hold innenfor øya
        const dist = Math.sqrt(butterfly.position.x ** 2 + butterfly.position.z ** 2);
        if (dist > 35) {
            data.angle += Math.PI;
        }
    });
    
    // Animer CD når musikk spiller
    if (isPlaying) {
        // Roter CD-platen
        leftWheel.rotation.y += 0.05;
        rightWheel.rotation.y += 0.05;
        
        // Neon-lys pulsering
        neonLight.material.color.setHSL((time * 0.2) % 1, 1, 0.5);
        
        // Display blinker
        display.material.color.setHSL(0.4, 1, 0.4 + Math.sin(time * 5) * 0.1);
        
        if (Math.random() < 0.05) {
            createMusicNote();
        }
        
        // ========== FEST-MODUS! ==========
        
        // Disco-ball synlig og roterer
        discoBall.visible = true;
        rope.visible = true;
        discoBall.rotation.y += 0.02;
        discoBall.position.y = GROUND_LEVEL + 15 + Math.sin(time * 2) * 0.3;
        
        // Disco-lys - FLASH effekt (én farge)
        const flashIntensity = Math.sin(time * 10) > 0 ? 5 : 0.5; // Rask flash
        discoLights.forEach((light, i) => {
            // Alternerende flash mellom lysene
            const offset = (i % 2 === 0) ? 0 : Math.PI;
            light.intensity = Math.sin(time * 8 + offset) > 0 ? 4 : 0;
            light.color.set(DISCO_COLOR);
            
            // Roterer fortsatt
            const angle = time * 0.5 + (i / 4) * Math.PI * 2;
            const dist = 15;
            light.position.x = Math.cos(angle) * dist;
            light.position.z = Math.sin(angle) * dist;
            light.target.position.set(
                Math.cos(angle + Math.PI) * 5,
                GROUND_LEVEL,
                Math.sin(angle + Math.PI) * 5
            );
        });
        
        // Bakkelys - også flash i samme farge
        groundLights.forEach((light, i) => {
            const offset = i * 0.3;
            light.intensity = Math.sin(time * 12 + offset) > 0.3 ? 4 : 0;
            light.color.set(DISCO_COLOR);
        });
        
        // Floodlights - kraftig pulsering
        floodlights.forEach((light, i) => {
            const pulse = Math.sin(time * 6 + i * Math.PI / 2) > 0 ? 8 : 2;
            light.intensity = pulse;
            light.color.set(DISCO_COLOR);
        });
        
        // Spawn bobler (redusert for ytelse)
        if (bubbles.length < maxBubbles && Math.random() < 0.05) {
            createBubble();
        }
        
        // Animer bobler
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const bubble = bubbles[i];
            bubble.position.y += bubble.userData.velocity;
            bubble.position.x = bubble.userData.startX + Math.sin(time * bubble.userData.wobbleSpeed) * bubble.userData.wobbleAmount * 10;
            bubble.position.z = bubble.userData.startZ + Math.cos(time * bubble.userData.wobbleSpeed) * bubble.userData.wobbleAmount * 10;
            bubble.userData.life += delta;
            
            // Fjern bobler som er for høye eller gamle
            if (bubble.position.y > GROUND_LEVEL + 20 || bubble.userData.life > 8) {
                scene.remove(bubble);
                bubbles.splice(i, 1);
            }
        }
        
        // Konfetti aktiv
        confettiMaterial.opacity = 0.9;
        const confPos = confetti.geometry.attributes.position.array;
        for (let i = 0; i < confettiCount; i++) {
            confPos[i * 3] += confettiVelocities[i].x;
            confPos[i * 3 + 1] += confettiVelocities[i].y;
            confPos[i * 3 + 2] += confettiVelocities[i].z;
            
            // Reset konfetti som faller under bakken
            if (confPos[i * 3 + 1] < GROUND_LEVEL) {
                confPos[i * 3] = (Math.random() - 0.5) * 60;
                confPos[i * 3 + 1] = GROUND_LEVEL + 15 + Math.random() * 5;
                confPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
        }
        confetti.geometry.attributes.position.needsUpdate = true;
        
        // Laserstråler - INTENSE
        laserBeams.forEach((laser, i) => {
            laser.material.opacity = Math.sin(time * 8 + i) > 0 ? 0.8 : 0.2;
            laser.material.color.set(DISCO_COLOR);
            laser.rotation.x = Math.sin(time * 3 + i) * 0.6;
            laser.rotation.z = Math.cos(time * 2 + i * 0.5) * 0.6;
            laser.rotation.y = time * 0.5 + (i / 4) * Math.PI * 2;
        });
        
        // PYRO FLAMES! 🔥
        pyroFlames.forEach((flameGroup, fi) => {
            const flameActive = Math.sin(time * 4 + fi * 0.5) > 0.7;
            flameGroup.children.forEach((flame, i) => {
                if (flameActive) {
                    flame.material.opacity = 0.8 - i * 0.1;
                    flame.scale.y = 1 + Math.sin(time * 20 + i) * 0.3;
                    flame.scale.x = 1 + Math.sin(time * 15 + i) * 0.2;
                    flame.position.y = i * 0.3 + Math.sin(time * 25) * 0.1;
                } else {
                    flame.material.opacity = Math.max(0, flame.material.opacity - 0.1);
                }
            });
        });
        
        // CO2 Jets
        co2Jets.forEach((jet, i) => {
            const jetActive = Math.sin(time * 3 + i * Math.PI / 2) > 0.8;
            if (jetActive) {
                jet.smoke.material.opacity = 0.7;
                jet.smoke.scale.y = 1 + Math.sin(time * 10) * 0.3;
                jet.smoke.scale.x = 0.8 + Math.sin(time * 8) * 0.2;
            } else {
                jet.smoke.material.opacity = Math.max(0, jet.smoke.material.opacity - 0.05);
            }
        });
        
        // Strobe lights - FLASH HARD
        const strobeOn = Math.sin(time * 20) > 0.9;
        strobeLights.forEach((strobe, i) => {
            strobe.intensity = strobeOn ? 10 : 0;
        });
        
        // Moving heads
        movingHeads.forEach((head, i) => {
            head.intensity = 5;
            head.color.set(DISCO_COLOR);
            const targetAngle = time * 2 + (i / 4) * Math.PI * 2;
            head.target.position.set(
                Math.cos(targetAngle) * 5,
                GROUND_LEVEL,
                Math.sin(targetAngle) * 5
            );
        });
        
        // VERTICAL FLAME JETS - synkronisert med beaten
        flameJets.forEach((jet, ji) => {
            const flameActive = Math.sin(time * 5 + ji * Math.PI) > 0.6;
            jet.flames.forEach((flame, fi) => {
                if (flameActive) {
                    flame.material.opacity = 0.9 - fi * 0.15;
                    flame.scale.y = 1 + Math.sin(time * 30 + fi) * 0.3;
                    flame.scale.x = 0.8 + Math.sin(time * 25 + fi) * 0.2;
                } else {
                    flame.material.opacity = Math.max(0, flame.material.opacity - 0.15);
                }
            });
            
            // Spawn sparks fra flamme-jets
            if (flameActive && sparks.length < maxSparks && Math.random() < 0.2) {
                createSpark(
                    jet.group.position.x + (Math.random() - 0.5) * 0.5,
                    GROUND_LEVEL + 4 + Math.random() * 2,
                    jet.group.position.z + (Math.random() - 0.5) * 0.5
                );
            }
        });
        
        // Animer gnister
        for (let i = sparks.length - 1; i >= 0; i--) {
            const spark = sparks[i];
            spark.position.add(spark.userData.velocity);
            spark.userData.velocity.y -= 0.015; // Gravity
            spark.userData.life += delta;
            
            const lifeRatio = spark.userData.life / spark.userData.maxLife;
            spark.material.opacity = 1 - lifeRatio;
            spark.scale.setScalar(1 - lifeRatio * 0.5);
            
            if (spark.userData.life > spark.userData.maxLife) {
                scene.remove(spark);
                sparks.splice(i, 1);
            }
        }
        
        // Endre himmel til fest-farger (mørk med cyan tint)
        const skyFlash = Math.sin(time * 8) > 0.5 ? 0.15 : 0.05;
        skyMaterial.uniforms.topColor.value.setRGB(0, skyFlash, skyFlash * 1.2);
        
        // Pulserende ambient lys (cyan flash)
        const ambientFlash = Math.sin(time * 8) > 0 ? 0.8 : 0.3;
        ambientLight.intensity = ambientFlash;
        ambientLight.color.set(DISCO_COLOR);
        
        // ========== DJ ANIMASJON ==========
        dj.visible = true;
        djSpotlight.intensity = 3;
        djBouncePhase += 0.12;
        
        // DJ hopper lett til beaten
        const djBounce = Math.abs(Math.sin(djBouncePhase * 2)) * 0.05;
        djPerson.position.y = djBounce;
        
        // Hode nikker til musikken
        djHead.rotation.x = Math.sin(djBouncePhase * 4) * 0.15;
        djHead.rotation.z = Math.sin(djBouncePhase * 2) * 0.08;
        djHair.rotation.x = djHead.rotation.x;
        djHair.rotation.z = djHead.rotation.z;
        
        // Hodetelefoner følger hodet
        djHpBand.rotation.x = djHead.rotation.z;
        djHpLeftCup.rotation.x = djHead.rotation.z;
        djHpRightCup.rotation.x = djHead.rotation.z;
        
        // Armer beveger seg som om han justerer mikseren
        djLeftArm.rotation.x = -0.8 + Math.sin(djBouncePhase * 3) * 0.2;
        djLeftArm.rotation.z = 0.2 + Math.sin(djBouncePhase * 1.5) * 0.1;
        djRightArm.rotation.x = -0.8 + Math.sin(djBouncePhase * 3 + 1) * 0.2;
        djRightArm.rotation.z = -0.2 - Math.sin(djBouncePhase * 1.5 + 1) * 0.1;
        
        // Hender beveger seg over mikseren
        djLeftHand.position.x = -0.35 + Math.sin(djBouncePhase * 2) * 0.15;
        djLeftHand.position.z = 0.3 + Math.cos(djBouncePhase * 1.5) * 0.05;
        djRightHand.position.x = 0.35 + Math.sin(djBouncePhase * 2 + 2) * 0.15;
        djRightHand.position.z = 0.3 + Math.cos(djBouncePhase * 1.5 + 1) * 0.05;
        
        // Kropp beveger seg
        djTorso.rotation.z = Math.sin(djBouncePhase) * 0.08;
        djPants.rotation.z = djTorso.rotation.z * 0.5;
        
        // Platene roterer!
        leftVinyl.rotation.y += 0.08;
        leftLabel.rotation.y += 0.08;
        rightVinyl.rotation.y += 0.08;
        rightLabel.rotation.y += 0.08;
        
        // LED-stripe på DJ-bordet blinker
        ledStripe.material.color.set(Math.sin(time * 10) > 0 ? DISCO_COLOR : 0x004444);
        
        // Laptop-skjerm pulserer
        laptopDisplay.material.color.setHSL(0.5, 1, 0.4 + Math.sin(time * 5) * 0.2);
        
        // Crossfader beveger seg
        crossfaderKnob.position.x = Math.sin(djBouncePhase * 0.5) * 0.08;
        
    } else {
        // ========== NORMAL MODUS ==========
        
        // Skjul fest-effekter
        discoBall.visible = false;
        rope.visible = false;
        
        // Slå av disco-lys
        discoLights.forEach(light => {
            light.intensity = 0;
        });
        
        // Slå av bakkelys
        groundLights.forEach(light => {
            light.intensity = 0;
        });
        
        // Slå av floodlights
        floodlights.forEach(light => {
            light.intensity = 0;
        });
        
        // Fade ut konfetti
        confettiMaterial.opacity = Math.max(0, confettiMaterial.opacity - 0.02);
        
        // Fade ut lasere
        laserBeams.forEach(laser => {
            laser.material.opacity = Math.max(0, laser.material.opacity - 0.02);
        });
        
        // Slå av pyro
        pyroFlames.forEach(flameGroup => {
            flameGroup.children.forEach(flame => {
                flame.material.opacity = Math.max(0, flame.material.opacity - 0.05);
            });
        });
        
        // Slå av CO2 jets
        co2Jets.forEach(jet => {
            jet.smoke.material.opacity = Math.max(0, jet.smoke.material.opacity - 0.03);
        });
        
        // Slå av strobe-lys
        strobeLights.forEach(strobe => {
            strobe.intensity = 0;
        });
        
        // Slå av moving heads
        movingHeads.forEach(head => {
            head.intensity = 0;
        });
        
        // Slå av flame jets
        flameJets.forEach(jet => {
            jet.flames.forEach(flame => {
                flame.material.opacity = Math.max(0, flame.material.opacity - 0.1);
            });
        });
        
        // Fjern gnister
        for (let i = sparks.length - 1; i >= 0; i--) {
            const spark = sparks[i];
            spark.material.opacity -= 0.1;
            if (spark.material.opacity <= 0) {
                scene.remove(spark);
                sparks.splice(i, 1);
            }
        }
        
        // Fjern bobler gradvis
        if (bubbles.length > 0 && Math.random() < 0.1) {
            const bubble = bubbles.pop();
            if (bubble) scene.remove(bubble);
        }
        
        // Reset himmel til solnedgang
        skyMaterial.uniforms.topColor.value.lerp(new THREE.Color(0x1a0a2e), 0.05);
        
        // Reset ambient lys
        ambientLight.intensity = 0.5;
        ambientLight.color.set(0xffaa77);
        
        // Skjul DJ-en
        dj.visible = false;
        djSpotlight.intensity = 0;
    }
    
    // Oppdater musikknoter
    for (let i = musicNotes.length - 1; i >= 0; i--) {
        const note = musicNotes[i];
        note.position.add(note.userData.velocity);
        note.rotation.y += note.userData.rotSpeed;
        note.userData.life += delta;
        note.material.opacity = 1 - note.userData.life / 2;
        note.scale.setScalar(1 + note.userData.life * 0.5);
        
        if (note.userData.life > 2) {
            scene.remove(note);
            musicNotes.splice(i, 1);
        }
    }
    
    // Spillerbevegelse (keyboard + joystick)
    let moveX = 0;
    let moveZ = 0;
    
    // Keyboard input
    if (keys.w) moveZ -= moveSpeed;
    if (keys.s) moveZ += moveSpeed;
    if (keys.a) moveX -= moveSpeed;
    if (keys.d) moveX += moveSpeed;
    
    // Virtual joystick input
    if (joystick.active) {
        moveX += joystick.moveX * moveSpeed;
        moveZ += joystick.moveY * moveSpeed;
    }
    
    if (moveX !== 0 || moveZ !== 0) {
        avatar.position.x += moveX;
        avatar.position.z += moveZ;
        
        playerRotation = Math.atan2(moveX, moveZ);
        avatar.rotation.y = playerRotation;
        
        // Gåanimasjon
        walkCycle += 0.3;
        avatar.position.y = GROUND_LEVEL + Math.abs(Math.sin(walkCycle)) * 0.08;
        
        // Arm-sving
        leftArm2.rotation.x = Math.sin(walkCycle) * 0.3;
        rightArm2.rotation.x = -Math.sin(walkCycle) * 0.3;
        leftHand2.position.y = 0.55 + Math.sin(walkCycle) * 0.05;
        rightHand2.position.y = 0.55 - Math.sin(walkCycle) * 0.05;
    } else {
        avatar.position.y = GROUND_LEVEL;
        leftArm2.rotation.x = 0;
        rightArm2.rotation.x = 0;
    }
    
    // Grense
    const maxDistance = 38;
    const distFromCenter = Math.sqrt(avatar.position.x ** 2 + avatar.position.z ** 2);
    if (distFromCenter > maxDistance) {
        const angle = Math.atan2(avatar.position.z, avatar.position.x);
        avatar.position.x = Math.cos(angle) * maxDistance;
        avatar.position.z = Math.sin(angle) * maxDistance;
    }
    
    // ============================================
    // INTERAKSJON MED CD OG SPILLER
    // ============================================
    
    const distToCD = avatar.position.distanceTo(pickupCD.position);
    const distToCassette = avatar.position.distanceTo(cassettePlayer.position);
    
    // Animer CD-en på bakken (hover, glow og partikler)
    if (!hasCDPickedUp) {
        pickupCD.rotation.y += 0.03;
        pickupCD.position.y = GROUND_LEVEL + 0.2 + Math.sin(time * 2) * 0.2;
        
        // Pulserende glød-ringer
        cdGlowRing.material.opacity = 0.6 + Math.sin(time * 4) * 0.4;
        cdGlowRing.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
        cdGlowRing2.material.opacity = 0.3 + Math.sin(time * 3 + 1) * 0.2;
        cdGlowRing2.scale.setScalar(1 + Math.sin(time * 2) * 0.15);
        
        // Lys-søyle pulserer
        cdBeam.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
        cdBeam.rotation.y = time * 0.5;
        
        // Spotlight pulserer
        cdSpotlight.intensity = 4 + Math.sin(time * 3) * 2;
        cdPointLight.intensity = 2 + Math.sin(time * 4) * 1.5;
        
        // Partikler roterer og beveger seg
        cdParticles.rotation.y = time;
        const particlePos = cdParticles.geometry.attributes.position.array;
        for (let i = 0; i < cdParticleCount; i++) {
            particlePos[i * 3 + 1] = (particlePos[i * 3 + 1] + 0.02) % 3;
        }
        cdParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Hjelpefunksjon for mobilvennlig tekst
    const getInteractionText = (action) => {
        const isMobile = isTouchDevice && window.innerWidth <= 768;
        const prefix = isMobile ? 'Trykk BRUK' : 'Trykk E';
        return `${prefix} ${action}`;
    };

    // Sjekk om spilleren er nær CD-en (og ikke har plukket den opp)
    if (!hasCDPickedUp && distToCD < 2) {
        interactionPrompt.textContent = getInteractionText('for å plukke opp CD 💿');
        interactionPrompt.classList.add('visible');
        
        if (keys.e && !eKeyPressed) {
            eKeyPressed = true;
            hasCDPickedUp = true;
            
            // Skjul alle glow-effekter
            cdBeam.visible = false;
            cdGlowRing.visible = false;
            cdGlowRing2.visible = false;
            cdParticles.visible = false;
            cdSpotlight.intensity = 0;
            cdPointLight.intensity = 0;
            
            musicText.textContent = 'CD plukket opp! 💿';
        }
    }
    // Sjekk om spilleren er nær spilleren med CD (men ikke satt inn)
    else if (hasCDPickedUp && !cdInserted && distToCassette < 4) {
        interactionPrompt.textContent = getInteractionText('for å sette inn CD 💿');
        interactionPrompt.classList.add('visible');
        
        if (keys.e && !eKeyPressed) {
            eKeyPressed = true;
            cdInserted = true;
            const isMobile = isTouchDevice && window.innerWidth <= 768;
            musicText.textContent = isMobile ? 'CD satt inn! Trykk BRUK 🎵' : 'CD satt inn! Trykk E for å spille 🎵';
            
            // Vis CD-en i spilleren
            cdDisc.material.color.set(0xcccccc);
            cdLabel.material.color.set(0xf4d03f);
        }
    }
    // Sjekk om spilleren kan spille musikk (CD satt inn)
    else if (cdInserted && distToCassette < 4) {
        if (isPlaying) {
            interactionPrompt.textContent = getInteractionText('for å stoppe 🎵');
        } else {
            interactionPrompt.textContent = getInteractionText('for å starte festen! 🎉');
        }
        interactionPrompt.classList.add('visible');
        
        if (keys.e && !eKeyPressed) {
            eKeyPressed = true;
            toggleMusic();
        }
    }
    // Nær spilleren men ingen CD
    else if (!hasCDPickedUp && !cdInserted && distToCassette < 4) {
        interactionPrompt.textContent = 'Du trenger en CD! Finn den 💿';
        interactionPrompt.classList.add('visible');
    }
    else {
        interactionPrompt.classList.remove('visible');
    }
    
    if (!keys.e) eKeyPressed = false;
    
    // Vis CD i hånden til spilleren når den er plukket opp men ikke satt inn
    if (hasCDPickedUp && !cdInserted) {
        // CD følger spilleren (vises ved siden av)
        pickupCD.visible = true;
        pickupCD.position.set(
            avatar.position.x + 0.5,
            avatar.position.y + 1.2,
            avatar.position.z
        );
        pickupCD.rotation.x = Math.PI / 4;
        pickupCD.rotation.y = time * 2;
    } else if (cdInserted) {
        pickupCD.visible = false;
    }
    
    // Kamera
    const targetCameraPos = new THREE.Vector3(
        avatar.position.x + cameraOffset.x,
        avatar.position.y + cameraOffset.y,
        avatar.position.z + cameraOffset.z
    );
    camera.position.lerp(targetCameraPos, 0.05);
    camera.lookAt(avatar.position.x, avatar.position.y + 1.2, avatar.position.z);
    
    renderer.render(scene, camera);
}

// ============================================
// OPPSTART
// ============================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

setTimeout(() => {
    const loadingScreen = document.getElementById('loading');
    loadingScreen.style.opacity = '0';
    setTimeout(() => loadingScreen.style.display = 'none', 500);
}, 2000);

animate();

console.log('🌴 TROPICANA - Realistisk versjon lastet! 🌴');
