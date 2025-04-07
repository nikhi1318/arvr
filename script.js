import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/ARButton.js";
import Lenis from "https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.38/+esm";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.min.js";
import SplitType from "https://cdn.jsdelivr.net/npm/split-type@0.3.4/+esm";

gsap.registerPlugin(ScrollTrigger);

// LENIS Scroll + ScrollTrigger
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// THREE.js Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.5;
renderer.xr.enabled = true;

document.querySelector(".model").appendChild(renderer.domElement);

// AR Button
const arButton = ARButton.createButton(renderer, {
  requiredFeatures: ["hit-test"],
});
document.getElementById("ar-button-container").appendChild(arButton);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const mainLight = new THREE.DirectionalLight(0xffffff, 7.5);
mainLight.position.set(0.5, 7.5, 2.5);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 2.5);
fillLight.position.set(-15, 0, -5);
scene.add(fillLight);

scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5));

// Preload Loop
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
});

// Initial Animation
function playInitialAnimation() {
  if (model) {
    gsap.to(model.scale, { x: 1, y: 1, z: 1, duration: 1, ease: "power2.out" });
  }
}

// Scroll Handling
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

// Mouse Drag Rotation
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

document.addEventListener("mouseup", () => (isDragging = false));

document.addEventListener("mousemove", (event) => {
  if (!isDragging || !model) return;

  const deltaX = (event.clientX - previousMouseX) * 0.005;
  const deltaY = (event.clientY - previousMouseY) * 0.005;

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
      if (autoRotate) model.rotation.y += 0.003;
    }
  }

  renderer.render(scene, camera);
  renderer.setAnimationLoop(animate);
}

// Outro Text Scroll Animation
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

// Theme Switching
document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.style.backgroundColor = btn.getAttribute("data-bg");

  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const bgColor = btn.getAttribute("data-bg");
    const textColor = btn.getAttribute("data-color");

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = textColor;

    document.querySelectorAll("h1, h2, p, a").forEach((el) => {
      el.style.color = textColor;
    });

    updateModelColor(textColor);
  });
});

// Update model material color
function updateModelColor(color) {
  if (!model) return;
  model.traverse((node) => {
    if (node.isMesh && node.material) {
      node.material.color.setStyle(color);
    }
  });
}

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
