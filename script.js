//IMPORT UTILITIES
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// LENIS Scroll + ScrollTrigger
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// THREE.js Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.5;
document.querySelector(".model").appendChild(renderer.domElement);

renderer.xr.enabled = true;

let arButton = ARButton.createButton(renderer);
document.body.appendChild(arButton);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 7.5);
mainLight.position.set(0.5, 7.5, 2.5);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 2.5);
fillLight.position.set(-15, 0, -5);
scene.add(fillLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5);
scene.add(hemiLight);

// Initial Render Loop (stopped after model loads)
let basicAnimateId;
function basicAnimate() {
  renderer.render(scene, camera);
  basicAnimateId = requestAnimationFrame(basicAnimate);
}
basicAnimate();

// Load GLTF Model
let model;
const loader = new GLTFLoader();
loader.load("/assets/black_chair.glb", function (gltf) {
  model = gltf.scene;
  model.traverse((node) => {
    if (node.isMesh && node.material) {
      node.material.color.set("#FFFFF0");
      node.material.metalness = 0.4;
      node.material.roughness = 1;
      node.material.envMapIntensity = 2;
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

   // ✅ FIX: Scale down model to make it visible
   model.scale.set(0.3, 0.3, 0.3);      // Adjusted scale
   model.position.set(0, -0.5, -0.5);         // Move slightly in front of camera
 
  scene.add(model);

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(0, 1, maxDim * 1.75);
  camera.lookAt(0, 0, 0);

  model.scale.set(0, 0, 0);
  model.rotation.set(0, 0.5, 0);
  playInitialAnimation();

  cancelAnimationFrame(basicAnimateId);
  animate();

  // ✅ Enable AR placement
  setupARPlacement();
});

// Initial Scale Animation
function playInitialAnimation() {
  if (model) {
    gsap.to(model.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1,
      ease: "power2.out",
    });
  }
}

// Scroll Tracking
let currentScroll = 0;
const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
const floatAmplitude = 0.2;
const floatSpeed = 1.5;
let lastScroll = 0;
let autoRotate = true;

lenis.on("scroll", (e) => {
  currentScroll = e.scroll;
  if (Math.abs(e.scroll - lastScroll) > 5) {
    autoRotate = false;
    setTimeout(() => (autoRotate = true), 2000);
  }
  lastScroll = e.scroll;
});

// Mouse Drag Controls
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let rotationY = 0;
let rotationX = 0;

document.addEventListener("mousedown", (event) => {
  isDragging = true;
  previousMouseX = event.clientX;
  previousMouseY = event.clientY;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("mousemove", (event) => {
  if (!isDragging || !model) return;

  let deltaX = (event.clientX - previousMouseX) * 0.005;
  let deltaY = (event.clientY - previousMouseY) * 0.005;

  rotationY += deltaX;
  rotationX += deltaY;

  model.rotation.y = rotationY;
  model.rotation.x = rotationX;

  previousMouseX = event.clientX;
  previousMouseY = event.clientY;
});

// Main Animate Loop
function animate() {
  if (model) {
    const floatOffset = Math.sin(Date.now() * 0.001 * floatSpeed) * floatAmplitude;
    model.position.y = floatOffset;

    const scrollProgress = Math.min(currentScroll / totalScrollHeight, 1);

    if (!isDragging) {
      model.rotation.x = scrollProgress * Math.PI * 4 + 0.5;
      if (autoRotate) {
        model.rotation.y += 0.003;
      }
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Outro Text Animation
const splitText = new SplitType(".outro-copy h2", {
  types: "lines",
  lineClass: "line",
});

splitText.lines.forEach((line) => {
  const text = line.innerHTML;
  line.innerHTML = `<span style="display: block; transform: translateY(70px);">${text}</span>`;
});

ScrollTrigger.create({
  trigger: ".outro",
  start: "top center",
  onEnter: () => {
    gsap.to(".outro-copy h2 .line span", {
      translateY: 0,
      duration: 1,
      stagger: 0.1,
      ease: "power3.out",
      force3D: true,
    });
  },
  onLeaveBack: () => {
    gsap.to(".outro-copy h2 .line span", {
      translateY: 70,
      duration: 1,
      stagger: 0.1,
      ease: "power3.out",
      force3D: true,
    });
  },
  toggleActions: "play reverse play reverse",
});

// Color Theme Switching
document.querySelectorAll('.color-btn').forEach((btn) => {
  btn.style.backgroundColor = btn.getAttribute('data-bg');

  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const bgColor = btn.getAttribute('data-bg');
    const textColor = btn.getAttribute('data-color');

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = textColor;

    document.querySelectorAll('h1, h2, p, a').forEach(el => {
      el.style.color = textColor;
    });

    // 🆕 Update model color on theme change
    updateModelColor(textColor);
  });
});

// 🆕 Function to update model color
function updateModelColor(color) {
  if (!model) return;
  model.traverse((node) => {
    if (node.isMesh && node.material) {
      node.material.color.setStyle(color);
    }
  });
}

// 🆕 Responsive resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ✅ 🆕 AR MODEL PLACEMENT SETUP
let controller, reticle, hitTestSource = null, hitTestSourceRequested = false;

function setupARPlacement() {
  const ringGeo = new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle = new THREE.Mesh(ringGeo, ringMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (reticle.visible && model) {
      const newModel = model.clone();
      newModel.position.setFromMatrixPosition(reticle.matrix);
      newModel.quaternion.setFromRotationMatrix(reticle.matrix);
      newModel.scale.set(1, 1, 1);
      scene.add(newModel);
    }
  });
  scene.add(controller);
}

renderer.setAnimationLoop((timestamp, frame) => {
  if (renderer.xr.isPresenting) {
    if (model && frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (!hitTestSourceRequested) {
        session.requestReferenceSpace('viewer').then((refSpace) => {
          session.requestHitTestSource({ space: refSpace }).then((source) => {
            hitTestSource = source;
          });
        });
        hitTestSourceRequested = true;
      }

      if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else {
          reticle.visible = false;
        }
      }
    }
  }

  renderer.render(scene, camera);
});
