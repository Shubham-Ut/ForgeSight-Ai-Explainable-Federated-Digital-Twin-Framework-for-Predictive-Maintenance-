import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface DigitalTwin3DProps {
  temperature: number;
  vibration: number;
  speed: number;
  wear: number;
  healthScore: number;
  selectedComponent: string;
  onSelectComponent?: (id: string) => void;
  componentIds?: string[];
}

// Map the store component IDs to internal Three.js group IDs
const mapExternalToInternalId = (externalId: string): string[] => {
  if (!externalId) return [];
  const normalized = externalId.toLowerCase();
  if (normalized.includes('spindle') || normalized === 'comp-1' || normalized === 'spindle-motor') {
    return ['spindle', 'chuck', 'cutting-tool'];
  }
  if (normalized.includes('bearing') || normalized === 'comp-2' || normalized === 'axis-bearing') {
    return ['axis-x', 'axis-y', 'axis-z'];
  }
  if (normalized.includes('coolant') || normalized === 'comp-4' || normalized === 'coolant-nozzle') {
    return ['coolant-system'];
  }
  if (normalized.includes('servo') || normalized === 'comp-3') {
    return ['servo-motors'];
  }
  if (normalized.includes('tool') || normalized === 'comp-5') {
    return ['cutting-tool'];
  }
  if (normalized.includes('control') || normalized === 'comp-6') {
    return ['control-panel', 'electrical-cabinet'];
  }
  if (normalized.includes('hydraulic') || normalized === 'comp-7') {
    return ['hydraulic-unit'];
  }
  if (normalized.includes('guide') || normalized.includes('axis') || normalized === 'comp-8') {
    return ['axis-x', 'axis-y', 'axis-z'];
  }
  return [externalId];
};

// Map clicked Three.js parts back to store component IDs
const mapInternalToExternalId = (internalId: string, componentIds?: string[]): string => {
  const hasCompIds = componentIds && componentIds.some(id => id.startsWith('comp-'));

  if (hasCompIds && componentIds) {
    if (internalId === 'axis-x' || internalId === 'axis-y' || internalId === 'axis-z') {
      return componentIds.includes('comp-8') ? 'comp-8' : 'comp-2';
    }
    if (internalId === 'spindle' || internalId === 'chuck') {
      return 'comp-1';
    }
    if (internalId === 'servo-motors') return 'comp-3';
    if (internalId === 'coolant-system') return 'comp-4';
    if (internalId === 'cutting-tool') return 'comp-5';
    if (internalId === 'control-panel' || internalId === 'electrical-cabinet') return 'comp-6';
    if (internalId === 'hydraulic-unit') return 'comp-7';
  }

  switch (internalId) {
    case 'spindle':
    case 'chuck':
    case 'cutting-tool':
      return 'spindle-motor';
    case 'axis-x':
    case 'axis-y':
    case 'axis-z':
      return 'axis-bearing';
    case 'coolant-system':
      return 'coolant-nozzle';
    default:
      return internalId;
  }
};

export default function DigitalTwin3D({
  temperature,
  vibration,
  speed,
  wear,
  healthScore,
  selectedComponent,
  onSelectComponent,
  componentIds = []
}: DigitalTwin3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stable callback ref to prevent Three.js scene from rebuilding on every render
  const onSelectComponentRef = useRef(onSelectComponent);
  useEffect(() => {
    onSelectComponentRef.current = onSelectComponent;
  }, [onSelectComponent]);

  // Sync props to refs for the animation loop
  const propsRef = useRef({ temperature, vibration, speed, wear, healthScore, selectedComponent, componentIds });
  // Use stable serialized form of componentIds in deps to avoid variable-length array violations
  const componentIdsKey = componentIds.join(',');
  useEffect(() => {
    propsRef.current = { temperature, vibration, speed, wear, healthScore, selectedComponent, componentIds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temperature, vibration, speed, wear, healthScore, selectedComponent, componentIdsKey]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 500;
    const height = containerRef.current.clientHeight || 360;

    // Create Scene, Camera, and WebGLRenderer
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const camDir = new THREE.Vector3(5, 4, 8).normalize();
    let cameraDistance = 10.5;
    camera.position.copy(camDir).multiplyScalar(cameraDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ambient and directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.6); // Tech blue secondary light
    dirLight2.position.set(-6, -4, -6);
    scene.add(dirLight2);

    // Warm Orange light for thermal overheat warnings
    const thermalLight = new THREE.PointLight(0xff5500, 0, 15);
    thermalLight.position.set(0, 1, 0);
    scene.add(thermalLight);

    // Main CNC machine assembly group
    const cncGroup = new THREE.Group();
    scene.add(cncGroup);

    // Tech grid floor
    const gridHelper = new THREE.GridHelper(14, 28, 0x475569, 0x1e293b);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Materials definitions - Using Phong or low metalness Standard so it doesn't render completely black
    const materials: Record<string, THREE.MeshStandardMaterial> = {
      defaultMetal: new THREE.MeshStandardMaterial({ color: 0x8e9cae, roughness: 0.4, metalness: 0.2 }),
      brightMetal: new THREE.MeshStandardMaterial({ color: 0xd0d4dc, roughness: 0.2, metalness: 0.3 }),
      darkChassis: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.1 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x88bbff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.25 }),
      screen: new THREE.MeshStandardMaterial({ color: 0x07111e, emissive: 0x0f2a4a, roughness: 0.2 }),
      coolantBlue: new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, transparent: true, opacity: 0.85 }),
      hydraulics: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.1 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4, metalness: 0.2 }),
      activeHighlight: new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, roughness: 0.2, metalness: 0.1 }),
      warningHighlight: new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, roughness: 0.2, metalness: 0.1 }),
      criticalHighlight: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, roughness: 0.2, metalness: 0.1 })
    };

    // Tracks all meshes belonging to each component for raycasting and visual highlights
    const componentMeshes: Record<string, THREE.Mesh[]> = {
      'machine-body': [],
      'control-panel': [],
      'spindle': [],
      'chuck': [],
      'cutting-tool': [],
      'workpiece': [],
      'coolant-system': [],
      'servo-motors': [],
      'hydraulic-unit': [],
      'electrical-cabinet': [],
      'safety-doors': [],
      'axis-x': [],
      'axis-y': [],
      'axis-z': []
    };

    // Array of objects that can be raycast
    const interactiveObjects: THREE.Object3D[] = [];

    // Helper to register meshes to their respective components
    const interactiveComponentIds = [
      'spindle', 'chuck', 'cutting-tool', 'axis-x', 'axis-y', 'axis-z', 
      'coolant-system', 'servo-motors', 'hydraulic-unit', 'control-panel', 
      'electrical-cabinet', 'machine-body', 'workpiece'
    ];
    const registerMesh = (mesh: THREE.Mesh, componentId: string) => {
      mesh.userData = { componentId };
      if (!componentMeshes[componentId]) {
        componentMeshes[componentId] = [];
      }
      componentMeshes[componentId].push(mesh);
      if (interactiveComponentIds.includes(componentId)) {
        interactiveObjects.push(mesh);
      }
    };

    // ==========================================
    // 1. MACHINE BODY ENCLOSURE
    // ==========================================
    const machineBodyGroup = new THREE.Group();
    
    // Bottom casting block
    const baseGeo = new THREE.BoxGeometry(4.8, 0.8, 3.8);
    const baseMesh = new THREE.Mesh(baseGeo, materials.darkChassis);
    baseMesh.position.y = -1.6;
    machineBodyGroup.add(baseMesh);
    registerMesh(baseMesh, 'machine-body');

    // Main vertical support column
    const columnGeo = new THREE.BoxGeometry(1.6, 3.2, 3.4);
    const columnMesh = new THREE.Mesh(columnGeo, materials.darkChassis);
    columnMesh.position.set(-1.4, 0.4, 0);
    machineBodyGroup.add(columnMesh);
    registerMesh(columnMesh, 'machine-body');

    // Upper structural ceiling block
    const ceilingGeo = new THREE.BoxGeometry(3.6, 0.6, 3.8);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, materials.darkChassis);
    ceilingMesh.position.set(0.6, 1.8, 0);
    machineBodyGroup.add(ceilingMesh);
    registerMesh(ceilingMesh, 'machine-body');

    cncGroup.add(machineBodyGroup);

    // ==========================================
    // 2. CONTROL PANEL
    // ==========================================
    const controlPanelGroup = new THREE.Group();
    controlPanelGroup.position.set(1.8, 0.4, 1.8);
    controlPanelGroup.rotation.y = -Math.PI / 6;

    // Panel housing box
    const panelBoxGeo = new THREE.BoxGeometry(0.8, 1.2, 0.15);
    const panelBoxMesh = new THREE.Mesh(panelBoxGeo, materials.darkChassis);
    controlPanelGroup.add(panelBoxMesh);
    registerMesh(panelBoxMesh, 'control-panel');

    // Glowing Touchscreen
    const screenGeo = new THREE.PlaneGeometry(0.65, 0.6);
    const screenMesh = new THREE.Mesh(screenGeo, materials.screen);
    screenMesh.position.set(0, 0.22, 0.08);
    controlPanelGroup.add(screenMesh);
    registerMesh(screenMesh, 'control-panel');

    // Buttons array indicators
    const buttonBlockGeo = new THREE.BoxGeometry(0.65, 0.35, 0.04);
    const buttonBlockMesh = new THREE.Mesh(buttonBlockGeo, materials.defaultMetal);
    buttonBlockMesh.position.set(0, -0.3, 0.08);
    controlPanelGroup.add(buttonBlockMesh);
    registerMesh(buttonBlockMesh, 'control-panel');

    cncGroup.add(controlPanelGroup);

    // ==========================================
    // 3. ELECTRICAL CABINET
    // ==========================================
    const electricalGroup = new THREE.Group();
    electricalGroup.position.set(-1.4, 0.4, -1.8);
    
    // Main metal box
    const cabGeo = new THREE.BoxGeometry(1.2, 2.6, 0.4);
    const cabMesh = new THREE.Mesh(cabGeo, materials.darkChassis);
    electricalGroup.add(cabMesh);
    registerMesh(cabMesh, 'electrical-cabinet');

    // Cooling vent details
    const ventGeo = new THREE.BoxGeometry(0.8, 0.4, 0.05);
    const ventMesh = new THREE.Mesh(ventGeo, materials.defaultMetal);
    ventMesh.position.set(0, 0.8, 0.2);
    electricalGroup.add(ventMesh);
    registerMesh(ventMesh, 'electrical-cabinet');

    cncGroup.add(electricalGroup);

    // ==========================================
    // 4. SAFETY DOORS
    // ==========================================
    const safetyDoorsGroup = new THREE.Group();
    safetyDoorsGroup.position.set(0.6, 0.2, 1.7);

    // Door outer metallic frame Left
    const doorFrameGeo = new THREE.BoxGeometry(1.1, 2.4, 0.06);
    const doorLMesh = new THREE.Mesh(doorFrameGeo, materials.darkChassis);
    doorLMesh.position.set(-0.6, 0, 0);
    safetyDoorsGroup.add(doorLMesh);
    registerMesh(doorLMesh, 'safety-doors');

    // Door glass window Left
    const glassGeo = new THREE.BoxGeometry(0.9, 1.8, 0.04);
    const glassLMesh = new THREE.Mesh(glassGeo, materials.glass);
    glassLMesh.name = 'glass';
    glassLMesh.position.set(-0.6, 0.1, 0.01);
    safetyDoorsGroup.add(glassLMesh);
    registerMesh(glassLMesh, 'safety-doors');

    // Door Right frame
    const doorRMesh = new THREE.Mesh(doorFrameGeo, materials.darkChassis);
    doorRMesh.position.set(0.6, 0, 0);
    safetyDoorsGroup.add(doorRMesh);
    registerMesh(doorRMesh, 'safety-doors');

    // Door glass window Right
    const glassRMesh = new THREE.Mesh(glassGeo, materials.glass);
    glassRMesh.name = 'glass';
    glassRMesh.position.set(0.6, 0.1, 0.01);
    safetyDoorsGroup.add(glassRMesh);
    registerMesh(glassRMesh, 'safety-doors');

    cncGroup.add(safetyDoorsGroup);

    // ==========================================
    // 5. HYDRAULIC UNIT
    // ==========================================
    const hydraulicGroup = new THREE.Group();
    hydraulicGroup.position.set(1.8, -1.5, -1.4);

    // Fluid storage tank
    const tankGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const tankMesh = new THREE.Mesh(tankGeo, materials.darkChassis);
    hydraulicGroup.add(tankMesh);
    registerMesh(tankMesh, 'hydraulic-unit');

    // Hydraulic cylinders
    const pumpCylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16);
    const pumpMesh = new THREE.Mesh(pumpCylGeo, materials.hydraulics);
    pumpMesh.position.set(0.15, 0.5, 0.15);
    hydraulicGroup.add(pumpMesh);
    registerMesh(pumpMesh, 'hydraulic-unit');

    // Hydraulic accumulator
    const accumGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const accumMesh = new THREE.Mesh(accumGeo, materials.brightMetal);
    accumMesh.position.set(-0.15, 0.5, -0.15);
    hydraulicGroup.add(accumMesh);
    registerMesh(accumMesh, 'hydraulic-unit');

    cncGroup.add(hydraulicGroup);

    // ==========================================
    // 6. AXIS RAILS (X, Y, Z Guides)
    // ==========================================
    
    // Axis X: Horizontals on Table bed
    const axisXGroup = new THREE.Group();
    axisXGroup.position.set(0.6, -1.0, 0);
    const railXGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.4, 16);
    
    const railX1 = new THREE.Mesh(railXGeo, materials.brightMetal);
    railX1.rotation.z = Math.PI / 2;
    railX1.position.z = -0.8;
    axisXGroup.add(railX1);
    registerMesh(railX1, 'axis-x');

    const railX2 = railX1.clone();
    railX2.position.z = 0.8;
    axisXGroup.add(railX2);
    registerMesh(railX2, 'axis-x');

    cncGroup.add(axisXGroup);

    // Axis Y: Vertical guides on Column support
    const axisYGroup = new THREE.Group();
    axisYGroup.position.set(-0.5, 0.4, 0);
    const railYGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 16);
    
    const railY1 = new THREE.Mesh(railYGeo, materials.brightMetal);
    railY1.position.set(0, 0, -1.1);
    axisYGroup.add(railY1);
    registerMesh(railY1, 'axis-y');

    const railY2 = railY1.clone();
    railY2.position.z = 1.1;
    axisYGroup.add(railY2);
    registerMesh(railY2, 'axis-y');

    cncGroup.add(axisYGroup);

    // Axis Z: Depth guides on head support
    const axisZGroup = new THREE.Group();
    axisZGroup.position.set(0.5, 1.0, 0);
    const railZGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 16);
    
    const railZ1 = new THREE.Mesh(railZGeo, materials.brightMetal);
    railZ1.rotation.x = Math.PI / 2;
    railZ1.position.set(0, 0.2, -0.6);
    axisZGroup.add(railZ1);
    registerMesh(railZ1, 'axis-z');

    const railZ2 = railZ1.clone();
    railZ2.position.z = 0.6;
    axisZGroup.add(railZ2);
    registerMesh(railZ2, 'axis-z');

    cncGroup.add(axisZGroup);

    // ==========================================
    // 7. WORKPIECE & CLAMP TABLE
    // ==========================================
    const workpieceTableGroup = new THREE.Group();
    workpieceTableGroup.position.set(0.6, -0.9, 0); // moves horizontal-X

    // Metal carrier table
    const tableGeo = new THREE.BoxGeometry(2.4, 0.18, 2.0);
    const tableMesh = new THREE.Mesh(tableGeo, materials.defaultMetal);
    workpieceTableGroup.add(tableMesh);
    registerMesh(tableMesh, 'workpiece');

    // Workpiece Block being milled
    const blockGeo = new THREE.BoxGeometry(1.1, 0.5, 1.1);
    const blockMesh = new THREE.Mesh(blockGeo, materials.brightMetal);
    blockMesh.position.y = 0.32;
    workpieceTableGroup.add(blockMesh);
    registerMesh(blockMesh, 'workpiece');

    // Clamps
    const viceGeo = new THREE.BoxGeometry(1.4, 0.3, 0.2);
    const viceMeshL = new THREE.Mesh(viceGeo, materials.darkChassis);
    viceMeshL.position.set(0, 0.2, -0.65);
    workpieceTableGroup.add(viceMeshL);
    registerMesh(viceMeshL, 'workpiece');

    const viceMeshR = viceMeshL.clone();
    viceMeshR.position.z = 0.65;
    workpieceTableGroup.add(viceMeshR);
    registerMesh(viceMeshR, 'workpiece');

    cncGroup.add(workpieceTableGroup);

    // ==========================================
    // 8. SERVO MOTORS
    // ==========================================
    const servoMotorsGroup = new THREE.Group();

    // Motor X
    const motorXGeo = new THREE.BoxGeometry(0.35, 0.35, 0.5);
    const motorX = new THREE.Mesh(motorXGeo, materials.darkChassis);
    motorX.position.set(2.4, -1.0, -0.8);
    servoMotorsGroup.add(motorX);
    registerMesh(motorX, 'servo-motors');

    // Motor Y
    const motorYGeo = new THREE.BoxGeometry(0.35, 0.5, 0.35);
    const motorY = new THREE.Mesh(motorYGeo, materials.darkChassis);
    motorY.position.set(-0.5, 1.8, -1.1);
    servoMotorsGroup.add(motorY);
    registerMesh(motorY, 'servo-motors');

    // Motor Z
    const motorZGeo = new THREE.BoxGeometry(0.5, 0.35, 0.35);
    const motorZ = new THREE.Mesh(motorZGeo, materials.darkChassis);
    motorZ.position.set(-0.2, 1.0, -1.3);
    servoMotorsGroup.add(motorZ);
    registerMesh(motorZ, 'servo-motors');

    cncGroup.add(servoMotorsGroup);

    // ==========================================
    // 9. SPINDLE & CHUCK & TOOL
    // ==========================================
    const spindleAssemblyGroup = new THREE.Group();
    spindleAssemblyGroup.position.set(0.6, 0.6, 0);

    // Spindle outer cylinder head housing
    const spindleHeadGeo = new THREE.CylinderGeometry(0.5, 0.45, 1.2, 20);
    const spindleHeadMesh = new THREE.Mesh(spindleHeadGeo, materials.darkChassis);
    spindleHeadMesh.position.y = 0.4;
    spindleAssemblyGroup.add(spindleHeadMesh);
    registerMesh(spindleHeadMesh, 'spindle');

    // Inner rotating shaft group
    const rotatingSpindleGroup = new THREE.Group();

    // Steel shaft
    const spindleShaftGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.4, 16);
    const spindleShaftMesh = new THREE.Mesh(spindleShaftGeo, materials.brightMetal);
    spindleShaftMesh.position.y = 0.1;
    rotatingSpindleGroup.add(spindleShaftMesh);
    registerMesh(spindleShaftMesh, 'spindle');

    // Machining Chuck
    const chuckGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.35, 24);
    const chuckMesh = new THREE.Mesh(chuckGeo, materials.brightMetal);
    chuckMesh.position.y = -0.55;
    rotatingSpindleGroup.add(chuckMesh);
    registerMesh(chuckMesh, 'chuck');

    // Cutting Tool
    const drillGeo = new THREE.CylinderGeometry(0.08, 0.01, 0.5, 12);
    const drillMesh = new THREE.Mesh(drillGeo, materials.copper);
    drillMesh.position.y = -0.9;
    rotatingSpindleGroup.add(drillMesh);
    registerMesh(drillMesh, 'cutting-tool');

    spindleAssemblyGroup.add(rotatingSpindleGroup);
    cncGroup.add(spindleAssemblyGroup);

    // ==========================================
    // 10. COOLANT SYSTEM
    // ==========================================
    const coolantAssemblyGroup = new THREE.Group();
    coolantAssemblyGroup.position.set(0.6, 0.6, 0);

    // Delivery manifold ring
    const coolantRingGeo = new THREE.TorusGeometry(0.55, 0.06, 8, 24);
    const coolantRingMesh = new THREE.Mesh(coolantRingGeo, materials.defaultMetal);
    coolantRingMesh.rotation.x = Math.PI / 2;
    coolantRingMesh.position.y = 0.1;
    coolantAssemblyGroup.add(coolantRingMesh);
    registerMesh(coolantRingMesh, 'coolant-system');

    // Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.3, 8);
    const nozzleL = new THREE.Mesh(nozzleGeo, materials.brightMetal);
    nozzleL.position.set(-0.35, -0.05, 0.35);
    nozzleL.rotation.z = -0.4;
    nozzleL.rotation.x = 0.4;
    coolantAssemblyGroup.add(nozzleL);
    registerMesh(nozzleL, 'coolant-system');

    const nozzleR = nozzleL.clone();
    nozzleR.position.set(0.35, -0.05, 0.35);
    nozzleR.rotation.z = 0.4;
    coolantAssemblyGroup.add(nozzleR);
    registerMesh(nozzleR, 'coolant-system');

    cncGroup.add(coolantAssemblyGroup);

    // Coolant Particle System setup
    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);

    const particleCount = 20;
    const particles: Array<{ mesh: THREE.Mesh; life: number; velocity: THREE.Vector3 }> = [];
    const particleGeo = new THREE.SphereGeometry(0.025, 4, 4);

    for (let i = 0; i < particleCount; i++) {
      const pMesh = new THREE.Mesh(particleGeo, materials.coolantBlue);
      particlesGroup.add(pMesh);
      pMesh.visible = false;
      particles.push({
        mesh: pMesh,
        life: Math.random(),
        velocity: new THREE.Vector3()
      });
    }

    // Drag / Zoom rotation controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cncGroup.rotation.y += deltaX * 0.007;
      cncGroup.rotation.x += deltaY * 0.007;
      cncGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cncGroup.rotation.x));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance = Math.max(5, Math.min(18, cameraDistance + e.deltaY * 0.005));
      camera.position.copy(camDir).multiplyScalar(cameraDistance);
      camera.lookAt(0, 0, 0);
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      const mouseVec = new THREE.Vector2(mouseX, mouseY);
      raycaster.setFromCamera(mouseVec, camera);

      const intersects = raycaster.intersectObjects(interactiveObjects, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData.componentId) {
          obj = obj.parent;
        }
        if (obj && obj.userData.componentId && onSelectComponentRef.current) {
          const externalId = mapInternalToExternalId(obj.userData.componentId, propsRef.current.componentIds);
          const validIds = propsRef.current.componentIds.length > 0
            ? propsRef.current.componentIds
            : ['spindle-motor', 'axis-bearing', 'coolant-nozzle'];
          if (validIds.includes(externalId)) {
            onSelectComponentRef.current(externalId);
          }
        }
      }
    };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener('mousedown', handleMouseDown);
    canvasElement.addEventListener('click', handleCanvasClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].contentRect;
      const w = rect.width || width;
      const h = rect.height || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(containerRef.current);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const current = propsRef.current;

      // 1. Shaft Rotation
      const rotSpeedRad = (current.speed / 60) * Math.PI * 2;
      rotatingSpindleGroup.rotation.y += rotSpeedRad * delta;

      // 2. Structural oscillations (Subtle movement for realism)
      const amplitudeX = 0.08;
      const frequencyX = 0.5;
      const currentOffsetX = Math.sin(time * frequencyX) * amplitudeX;
      workpieceTableGroup.position.x = 0.6 + currentOffsetX;
 
      const amplitudeY = 0.03;
      const frequencyY = 0.7;
      const currentOffsetY = Math.cos(time * frequencyY) * amplitudeY;
      spindleAssemblyGroup.position.y = 0.6 + currentOffsetY;
      coolantAssemblyGroup.position.y = 0.6 + currentOffsetY;
 
      const currentOffsetZ = Math.sin(time * 0.4) * 0.04;
      spindleAssemblyGroup.position.z = currentOffsetZ;
      coolantAssemblyGroup.position.z = currentOffsetZ;
 
      motorX.rotation.z += (currentOffsetX * 2) * delta;
      motorY.rotation.z += (currentOffsetY * 2) * delta;

      // 3. Coolant flow simulation
      const isCoolantFlowActive = current.speed > 500 && current.healthScore > 20;
      particles.forEach((p, idx) => {
        if (!isCoolantFlowActive) {
          p.mesh.visible = false;
          return;
        }

        p.life += delta * 1.5;
        if (p.life > 1.0) {
          p.life = 0;
          const leftNozzle = idx % 2 === 0;
          p.mesh.position.set(
            0.6 + (leftNozzle ? -0.35 : 0.35) + currentOffsetX,
            0.65 + currentOffsetY,
            0.35 + currentOffsetZ
          );
          p.velocity.set(
            (Math.random() - 0.5) * 0.2,
            -1.8 - Math.random() * 0.5,
            -0.3 - Math.random() * 0.3
          );
        }

        p.mesh.visible = true;
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.scale.setScalar(1.0 - p.life * 0.8);
      });

      // 4. Overheat warning lights
      const normTemp = Math.max(0, Math.min(1, (current.temperature - 25) / 20));
      thermalLight.intensity = normTemp * 1.5;

      // 5. Tool wear visual coloring
      const normWear = Math.max(0, Math.min(1, current.wear / 200));
      const targetWearColor = new THREE.Color(0xb45309);
      if (normWear > 0.8) {
        materials.copper.color.setHex(0x1e1e1e);
      } else {
        materials.copper.color.lerpColors(new THREE.Color(0x8e929d), targetWearColor, normWear);
      }

      // 6. Shake/Tremor vibrations - disabled whole-chassis shaking to keep the model perfectly stable
      cncGroup.position.set(0, 0, 0);

      // 7. Dynamic component highlights
      const selectedInternalIds = mapExternalToInternalId(current.selectedComponent);
      Object.keys(componentMeshes).forEach(cid => {
        const componentList = componentMeshes[cid];
        const isSel = selectedInternalIds.includes(cid);
        
        let mat = materials.defaultMetal;
        if (cid === 'machine-body' || cid === 'electrical-cabinet' || cid === 'safety-doors') {
          mat = materials.darkChassis;
        } else if (cid === 'glass') {
          mat = materials.glass;
        } else if (cid === 'cutting-tool') {
          mat = materials.copper;
        } else if (cid === 'workpiece') {
          mat = materials.brightMetal;
        } else if (cid === 'hydraulic-unit') {
          mat = materials.hydraulics;
        }

        componentList.forEach(m => {
          if (isSel) {
            if (current.healthScore < 40) {
              const flash = Math.floor(time * 8) % 2 === 0;
              m.material = flash ? materials.criticalHighlight : mat;
            } else if (current.healthScore < 75) {
              m.material = materials.warningHighlight;
            } else {
              m.material = materials.activeHighlight;
            }
          } else {
            m.material = m.name === 'glass' ? materials.glass : mat;
          }
        });
      });

      // Auto-rotation disabled to keep the model steady. Dragging still works.

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      canvasElement.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasElement.removeEventListener('wheel', handleWheel);

      Object.values(materials).forEach(m => m.dispose());
      baseGeo.dispose();
      columnGeo.dispose();
      ceilingGeo.dispose();
      panelBoxGeo.dispose();
      screenGeo.dispose();
      buttonBlockGeo.dispose();
      cabGeo.dispose();
      ventGeo.dispose();
      doorFrameGeo.dispose();
      glassGeo.dispose();
      tankGeo.dispose();
      pumpCylGeo.dispose();
      accumGeo.dispose();
      railXGeo.dispose();
      railYGeo.dispose();
      railZGeo.dispose();
      tableGeo.dispose();
      blockGeo.dispose();
      viceGeo.dispose();
      motorXGeo.dispose();
      motorYGeo.dispose();
      motorZGeo.dispose();
      spindleHeadGeo.dispose();
      spindleShaftGeo.dispose();
      chuckGeo.dispose();
      drillGeo.dispose();
      coolantRingGeo.dispose();
      nozzleGeo.dispose();
      particleGeo.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative min-h-[300px] flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none" />
      <div className="absolute bottom-3 right-3 bg-black/75 border border-white/5 rounded-lg px-2.5 py-1 text-[8px] font-mono text-slate-400 pointer-events-none select-none flex items-center gap-1.5 uppercase tracking-wider">
        <span>🖱️ Click to Select Part</span>
        <span>•</span>
        <span>Drag to Rotate</span>
        <span>•</span>
        <span>Scroll to Zoom</span>
      </div>
    </div>
  );
}
