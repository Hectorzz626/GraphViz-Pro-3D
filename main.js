import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// DATOS (Abreviados para el ejemplo, usa los completos si los necesitas)
const HALEY_DATA = `100 158\n0 33\n0 35\n0 74\n0 1\n0 2\n0 10\n0 11\n0 14\n0 19\n1 32\n1 3\n1 5\n2 81\n2 6\n3 24\n3 4\n3 8\n4 20\n4 29\n5 7\n5 18\n6 71\n6 82\n7 9\n7 83\n8 41\n8 34\n9 24\n9 83\n10 27\n10 13\n10 23\n11 12\n11 36\n11 43\n11 69\n12 84\n12 38\n13 85\n13 17\n14 31\n14 15\n15 16\n15 22\n16 99\n16 66\n17 76\n17 28\n18 47\n18 30\n19 67\n19 72\n19 37\n20 58\n20 21\n21 65\n21 75\n21 51\n22 86\n22 25\n23 26\n23 55\n24 41\n25 66\n25 87\n26 56\n26 88\n27 98\n27 63\n28 89\n28 39\n29 45\n29 73\n29 44\n30 40\n30 46\n31 86\n31 78\n32 47\n32 71\n33 72\n33 35\n34 60\n34 90\n35 74\n36 48\n36 57\n37 78\n37 91\n38 52\n38 50\n38 54\n39 53\n39 64\n39 42\n40 83\n40 59\n41 90\n42 92\n43 61\n43 93\n44 68\n44 94\n45 94\n45 73\n46 59\n46 79\n47 79\n48 84\n48 57\n49 81\n49 92\n50 63\n50 95\n51 77\n51 96\n52 95\n52 80\n53 92\n53 64\n54 80\n54 97\n55 62\n55 98\n56 85\n56 88\n57 61\n58 75\n58 68\n59 79\n60 73\n60 90\n61 93\n62 88\n62 98\n63 95\n64 89\n65 96\n65 75\n66 87\n67 91\n67 72\n68 94\n69 70\n69 99\n70 93\n70 99\n71 82\n74 77\n76 89\n76 85\n77 96\n78 91\n80 97\n81 82\n84 97\n86 87\n0 501\n0 502\n0 503`;
const PETERSEN_DATA = `0 1\n1 2\n2 3\n3 4\n4 0\n0 5\n1 6\n2 7\n3 8\n4 9\n5 7\n7 9\n9 6\n6 8\n8 5`;
const GRID_DATA = `0 1\n1 2\n2 3\n4 5\n5 6\n6 7\n8 9\n9 10\n10 11\n12 13\n13 14\n14 15\n0 4\n4 8\n8 12\n1 5\n5 9\n9 13\n2 6\n6 10\n10 14\n3 7\n7 11\n11 15`;
const DATA_SETS = { 'haley': HALEY_DATA, 'petersen': PETERSEN_DATA, 'grid': GRID_DATA };

// Variables Globales
let scene, camera, renderer, controls, composer;
let graphGroup, labelGroup;
let interactiveObjects = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let animationTimeline = [];
let animationIndex = 0;
let animationInterval = null;

// Referencias DOM
const container = document.getElementById('canvas-container');
const tooltip = document.getElementById('tooltip');

// --- INICIALIZACIÓN ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 40);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.2; bloomPass.radius = 0.5;
    
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    graphGroup = new THREE.Group();
    labelGroup = new THREE.Group();
    scene.add(graphGroup);
    scene.add(labelGroup);

    setupEventListeners();
    onGenerarHalin(); // Inicio
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);

    document.querySelectorAll('input[name="modo"]').forEach(r => r.addEventListener('change', onModoChange));
    
    document.getElementById('generarHalinBtn').addEventListener('click', onGenerarHalin);
    document.getElementById('analizarPresetBtn').addEventListener('click', () => procesarYDibujar(DATA_SETS[document.getElementById('presetSelect').value]));
    document.getElementById('analizarCustomBtn').addEventListener('click', onAnalizarCustom);

    document.getElementById('collapseBtn').addEventListener('click', togglePanel);
    document.getElementById('showPanelBtn').addEventListener('click', togglePanel);
    document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);
    document.getElementById('infoBtn').addEventListener('click', () => document.getElementById('infoModal').style.display = 'block');
    document.querySelector('.close-modal').addEventListener('click', () => document.getElementById('infoModal').style.display = 'none');

    document.getElementById('exportBtn').addEventListener('click', exportarGrafo);
    document.getElementById('fileInput').addEventListener('change', importarGrafo);

    document.getElementById('bloomCheck').addEventListener('change', (e) => composer.passes[1].enabled = e.target.checked);
    document.getElementById('labelsCheck').addEventListener('change', (e) => labelGroup.visible = e.target.checked);
    document.getElementById('rotateCheck').addEventListener('change', (e) => controls.autoRotate = e.target.checked);
    document.getElementById('colorMIS').addEventListener('input', updateColors);
    document.getElementById('colorLeaf').addEventListener('input', updateColors);

    ['alturaRange', 'radioRange'].forEach(id => document.getElementById(id).addEventListener('input', () => {
        if(document.querySelector('input[name="modo"]:checked').value === 'halin') onGenerarHalin();
    }));

    document.getElementById('playBtn').addEventListener('click', playAnimation);
    document.getElementById('resetBtn').addEventListener('click', resetAnimation);
}

// --- LÓGICA DE MODOS (Aquí está el arreglo) ---
function onModoChange(event) {
    const modo = event.target.value;
    
    // Ocultar TODO primero
    document.getElementById('halin-controls').style.display = 'none';
    document.getElementById('preset-controls').style.display = 'none';
    document.getElementById('custom-controls').style.display = 'none';
    document.getElementById('analysis-section').style.display = 'none'; // <-- Ocultar siempre al cambiar
    
    limpiarGrafo();

    if (modo === 'halin') {
        // MODO HALIN: Solo mostrar controles de Halin
        document.getElementById('halin-controls').style.display = 'block';
        
        controls.autoRotate = true; 
        document.getElementById('rotateCheck').checked = true;
        onGenerarHalin();
    } else {
        // MODOS DE ANÁLISIS: Mostrar Preset/Custom + Análisis MIS
        if (modo === 'preset') document.getElementById('preset-controls').style.display = 'block';
        else if (modo === 'custom') document.getElementById('custom-controls').style.display = 'block';
        
        // MOSTRAR la sección de análisis solo aquí
        document.getElementById('analysis-section').style.display = 'block';
        
        controls.autoRotate = false; 
        document.getElementById('rotateCheck').checked = false;
    }
}

function limpiarGrafo() {
    graphGroup.clear();
    labelGroup.clear();
    interactiveObjects = [];
    resetAnimation();
    document.getElementById('m-nodes').innerText = 0;
    document.getElementById('m-mis').innerText = 0;
}

// --- GENERADOR HALIN (MULTINIVEL COMPLETO) ---
function onGenerarHalin() {
    const numNodos = parseInt(document.getElementById('nodosInput').value);
    if (numNodos < 6) return alert("Para multinivel, usa al menos 6 nodos.");
    
    limpiarGrafo();
    
    const altura = parseInt(document.getElementById('alturaRange').value);
    const radioMax = parseInt(document.getElementById('radioRange').value);
    const radioMedio = radioMax * 0.5;
    const geoNodo = new THREE.SphereGeometry(0.6, 32, 32);

    // 1. Nodo Raíz
    crearNodo(0, 0, altura, 0, getMaterial(0xff4136), "Raíz", geoNodo);

    const restantes = numNodos - 1;
    let numIntermedios = Math.floor(restantes * 0.25);
    if (numIntermedios < 3) numIntermedios = 3; 
    const numHojas = restantes - numIntermedios;

    const intermediosPos = [];
    const hojasPos = [];

    // 2. Ramas (Nivel Medio)
    for (let i = 0; i < numIntermedios; i++) {
        const angulo = (i / numIntermedios) * Math.PI * 2;
        const x = radioMedio * Math.cos(angulo);
        const z = radioMedio * Math.sin(angulo);
        const y = altura / 2;
        const id = i + 1;
        
        crearNodo(id, x, y, z, getMaterial(0xFF8C00), "Rama", geoNodo);
        intermediosPos.push({x, y, z, id});
        crearArista(new THREE.Vector3(0, altura, 0), new THREE.Vector3(x, y, z));
    }

    // 3. Hojas (Anillo Exterior)
    let hojaCounter = 1 + numIntermedios;
    const hojasPorRama = Math.floor(numHojas / numIntermedios);
    let hojasExtra = numHojas % numIntermedios;

    for (let i = 0; i < numIntermedios; i++) {
        let misHojas = hojasPorRama + (hojasExtra > 0 ? 1 : 0);
        hojasExtra--;

        const anguloInicio = (i / numIntermedios) * Math.PI * 2;
        const anguloFin = ((i + 1) / numIntermedios) * Math.PI * 2;
        const pasoAngular = (anguloFin - anguloInicio) / misHojas;
        const padrePos = intermediosPos[i];

        for (let j = 0; j < misHojas; j++) {
            const angulo = anguloInicio + (pasoAngular * j) + (pasoAngular/2); 
            const x = radioMax * Math.cos(angulo);
            const z = radioMax * Math.sin(angulo);
            const id = hojaCounter++;
            
            crearNodo(id, x, 0, z, getMaterial(0x0074D9), "Hoja", geoNodo);
            hojasPos.push(new THREE.Vector3(x, 0, z));
            crearArista(new THREE.Vector3(padrePos.x, padrePos.y, padrePos.z), new THREE.Vector3(x, 0, z));
        }
    }

    // 4. Ciclo
    for (let i = 0; i < hojasPos.length; i++) {
        crearArista(hojasPos[i], hojasPos[(i + 1) % hojasPos.length], 
            new THREE.LineBasicMaterial({ color: 0x00aaff, opacity: 0.8, transparent: true, linewidth: 2 })
        );
    }
    
    document.getElementById('m-nodes').innerText = numNodos;
    document.getElementById('m-mis').innerText = "N/A";
}

function actualizarGeometriaHalin() {
    if (document.querySelector('input[name="modo"]:checked').value === 'halin') {
        onGenerarHalin();
    }
}

// --- PROCESAMIENTO MIS ---
function onAnalizarPreset() {
    const key = document.getElementById('presetSelect').value;
    procesarYDibujar(DATA_SETS[key]);
}

function onAnalizarCustom() {
    const rawData = document.getElementById('customInput').value.trim();
    if (!rawData) return alert("Escribe datos primero.");
    procesarYDibujar("HEADER\n" + rawData);
}

function procesarYDibujar(textData) {
    const data = parseEdgelist(textData);
    if (data.nodos.length === 0) return alert("Datos vacíos");

    const useLeaves = document.querySelector('input[name="heuristica"][value="leaves"]').checked;
    const result = useLeaves ? mis_from_leaves(data) : mis_greedy_random(data);
    
    animationTimeline = result.timeline;
    
    updateMetrics(data, result.mis.size);
    dibujarGrafo(data, result.mis, result.hojas);
    resetAnimation();
}

function updateMetrics(data, misSize) {
    const numN = data.nodos.length;
    const numE = data.aristas.length;
    let maxDegree = 0;
    data.adj.forEach(neighbors => maxDegree = Math.max(maxDegree, neighbors.length));
    const density = (2 * numE) / (numN * (numN - 1));

    document.getElementById('m-nodes').innerText = numN;
    document.getElementById('m-edges').innerText = numE;
    document.getElementById('m-degree').innerText = maxDegree;
    document.getElementById('m-density').innerText = isNaN(density) ? 0 : density.toFixed(3);
    document.getElementById('m-mis').innerText = misSize;
}

// --- ALGORITMOS ---
function mis_greedy_random(data) {
    const mis = new Set();
    const timeline = [];
    const shuffled = [...data.nodos].sort(() => Math.random() - 0.5);
    const descartados = new Set();

    for (const u of shuffled) {
        if (descartados.has(u)) continue;
        let libre = true;
        if (data.adj.has(u)) {
            for (const v of data.adj.get(u)) {
                if (mis.has(v)) { libre = false; break; }
            }
        }
        if (libre) {
            mis.add(u);
            timeline.push({ node: u, action: 'select' });
            if (data.adj.has(u)) {
                data.adj.get(u).forEach(v => {
                    if (!descartados.has(v)) {
                        descartados.add(v);
                        timeline.push({ node: v, action: 'discard' });
                    }
                });
            }
        }
    }
    return { mis, leaves: new Set(), timeline };
}

function mis_from_leaves(data) {
    const mis = new Set();
    const leaves = new Set();
    const timeline = [];
    const adjCopy = new Map(data.adj);
    const descartados = new Set();

    const hojasArr = [];
    data.nodos.forEach(u => {
        if (adjCopy.has(u) && adjCopy.get(u).length === 1) {
            hojasArr.push(u);
            leaves.add(u);
            mis.add(u);
            descartados.add(u);
            timeline.push({ node: u, action: 'leaf' });
        }
    });

    hojasArr.forEach(u => {
        const vecinos = data.adj.get(u) || [];
        vecinos.forEach(v => {
            if (!descartados.has(v)) {
                descartados.add(v);
                timeline.push({ node: v, action: 'discard' });
            }
        });
    });

    const resto = data.nodos.filter(n => !descartados.has(n)).sort(() => Math.random() - 0.5);
    for (const u of resto) {
        let libre = true;
        if (data.adj.has(u)) {
            for (const v of data.adj.get(u)) {
                if (mis.has(v)) { libre = false; break; }
            }
        }
        if (libre) {
            mis.add(u);
            timeline.push({ node: u, action: 'select' });
            data.adj.get(u).forEach(v => {
                if (!descartados.has(v)) {
                    descartados.add(v);
                    timeline.push({ node: v, action: 'discard' });
                }
            });
        }
    }
    return { mis, leaves, timeline };
}

function parseEdgelist(text) {
    const nodos = new Set();
    const aristas = [];
    const adj = new Map();
    const lineas = text.split('\n');
    let start = lineas[0].includes(" ") ? 1 : 0;

    for (let i = start; i < lineas.length; i++) {
        const parts = lineas[i].trim().split(/\s+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0])) {
            const u = parts[0], v = parts[1];
            nodos.add(u); nodos.add(v);
            aristas.push({ source: u, target: v });
            if (!adj.has(u)) adj.set(u, []);
            if (!adj.has(v)) adj.set(v, []);
            adj.get(u).push(v);
            adj.get(v).push(u);
        }
    }
    return { nodos: Array.from(nodos), aristas, adj };
}

// --- RENDERIZADO Y UTILS ---
function dibujarGrafo(data, misSet, leafSet) {
    graphGroup.clear();
    labelGroup.clear();
    interactiveObjects = [];

    const nodos3D = new Map();
    const geo = new THREE.SphereGeometry(0.5, 16, 16);
    const radio = 30;

    const colMIS = document.getElementById('colorMIS').value;
    const colLeaf = document.getElementById('colorLeaf').value;

    data.nodos.forEach(u => {
        const r = radio * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        let color = '#555555';
        let tipo = 'Normal';
        
        if (misSet && misSet.has(u)) {
            color = leafSet && leafSet.has(u) ? colLeaf : colMIS;
            tipo = leafSet && leafSet.has(u) ? 'Hoja' : 'MIS';
        }

        const mesh = new THREE.Mesh(geo, getMaterial(color));
        mesh.position.set(x, y, z);
        mesh.userData = { id: u, tipo: tipo };
        graphGroup.add(mesh);
        interactiveObjects.push(mesh);
        nodos3D.set(u, new THREE.Vector3(x, y, z));

        createLabel(u, x, y, z);
    });

    const matLine = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.2 });
    data.aristas.forEach(e => {
        const p1 = nodos3D.get(e.source);
        const p2 = nodos3D.get(e.target);
        if(p1 && p2) {
            const geoLine = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            graphGroup.add(new THREE.Line(geoLine, matLine));
        }
    });
}

function getMaterial(color, opacity = 1) {
    return new THREE.MeshStandardMaterial({ 
        color: color, transparent: opacity < 1, opacity: opacity,
        emissive: color, emissiveIntensity: opacity < 1 ? 0 : 0.5 
    });
}

function createLabel(text, x, y, z) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64; canvas.height = 32;
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(text, 0, 24);
    
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.position.set(x, y + 0.8, z);
    sprite.scale.set(4, 2, 1);
    labelGroup.add(sprite);
}

function crearNodo(id, x, y, z, mat, tipo, geo) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.userData = { id: id, tipo: tipo };
    graphGroup.add(mesh);
    interactiveObjects.push(mesh);
}

function crearArista(p1, p2, matOverride) {
    const mat = matOverride || new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.4, transparent: true });
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    graphGroup.add(new THREE.Line(geo, mat));
}

function playAnimation() {
    if (animationInterval) return;
    const speed = 1010 - document.getElementById('speedRange').value;
    
    animationInterval = setInterval(() => {
        if (animationIndex >= animationTimeline.length) {
            clearInterval(animationInterval);
            animationInterval = null;
            document.getElementById('step-status').innerText = "Fin";
            return;
        }
        const step = animationTimeline[animationIndex];
        const obj = interactiveObjects.find(o => o.userData.id === step.node);
        if (obj) {
            if (step.action === 'select') {
                obj.material = getMaterial(document.getElementById('colorMIS').value);
                obj.scale.set(1.5, 1.5, 1.5);
                document.getElementById('step-status').innerText = `Seleccionado: ${step.node}`;
            } else if (step.action === 'discard') {
                obj.material = getMaterial('#ff4444', 0.3);
                document.getElementById('step-status').innerText = `Descartado: ${step.node}`;
            } else if (step.action === 'leaf') {
                obj.material = getMaterial(document.getElementById('colorLeaf').value);
                document.getElementById('step-status').innerText = `Hoja: ${step.node}`;
            }
        }
        animationIndex++;
    }, speed);
}

function resetAnimation() {
    clearInterval(animationInterval);
    animationInterval = null;
    animationIndex = 0;
    document.getElementById('step-status').innerText = "Listo";
    interactiveObjects.forEach(obj => {
        obj.material = getMaterial('#555', 0.5);
        obj.scale.set(1, 1, 1);
    });
}

function takeScreenshot() {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = 'grafo.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
}

function exportarGrafo() {
    const data = document.getElementById('customInput').value;
    const url = URL.createObjectURL(new Blob([data], {type: 'text/plain'}));
    const a = document.createElement('a');
    a.href = url; a.download = 'grafo.txt';
    a.click();
}

function importarGrafo() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('customInput').value = e.target.result;
        onAnalizarCustom();
    };
    reader.readAsText(file);
}

function togglePanel() {
    document.getElementById('controls').classList.toggle('collapsed');
    document.getElementById('showPanelBtn').style.display = document.getElementById('controls').classList.contains('collapsed') ? 'block' : 'none';
}

function updateColors() {
    if (!animationInterval && interactiveObjects.length > 0) {
        const colMIS = document.getElementById('colorMIS').value;
        const colLeaf = document.getElementById('colorLeaf').value;
        interactiveObjects.forEach(obj => {
            if (obj.userData.tipo === 'Hoja') obj.material.color.set(colLeaf);
            else if (obj.userData.tipo === 'MIS') obj.material.color.set(colMIS);
        });
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);
    if (intersects.length > 0) {
        const d = intersects[0].object.userData;
        tooltip.style.display = 'block';
        tooltip.style.left = event.clientX+15+'px'; tooltip.style.top = event.clientY+15+'px';
        tooltip.innerHTML = `ID: ${d.id}<br>${d.tipo}`;
    } else tooltip.style.display = 'none';
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
}

init();
animate();