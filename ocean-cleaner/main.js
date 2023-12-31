import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
let container, stats;
let camera, scene, renderer;
let controls, water, sun;
let score = 0;
let hillModel = null;
const loader = new GLTFLoader();
function random(min, max) {
  return Math.random() * (max - min) + min;
}
//-------------------Boat class--------------------------------------
class Boat {
  constructor() {
    loader.load("images/boat/scene.gltf", (gltf) => {
      scene.add(gltf.scene)
      gltf.scene.scale.set(3, 3, 3)
      gltf.scene.position.set(5, 13, 50)
      gltf.scene.rotation.y = 1.5

      this.boat = gltf.scene
      this.speed = {
        vel: 0,
        rot: 0
      }
    })
    this.cameraDistance = 50;
  }
  stop() {
    this.speed.vel = 0
    this.speed.rot = 0
  }
  update() {
    if (this.boat) {
      this.boat.rotation.y += this.speed.rot
      this.boat.translateX(this.speed.vel)
      // Update camera position and target based on boat's position and rotation
      const cameraOffset = new THREE.Vector3(0, 10, -this.cameraDistance);
      const boatPosition = this.boat.position.clone();
      cameraOffset.applyMatrix4(this.boat.matrix);
      const cameraPosition = boatPosition.clone().add(cameraOffset);

      camera.position.copy(cameraPosition);
      camera.lookAt(boatPosition);
    }
  }
}
const boat = new Boat()

//---------------------------------- trash class---------------------------
class Trash {
  constructor(_scene) {
    scene.add(_scene)
    _scene.scale.set(1.5, 1.5, 1.5)
    if (Math.random() > .6) {
      _scene.position.set(random(-100, 100), -.5, random(-100, 100))
    } else {
      _scene.position.set(random(-500, 500), -.5, random(-1000, 1000))
    }

    this.trash = _scene
  }
}
// -------------Hill-Trash------------------------------
// class HillTrash {
//   constructor(_scene) {
//     scene.add(_scene);
//     _scene.scale.set(1.5, 1.5, 1.5);
//     if (Math.random() > 0.6) {
//       _scene.position.set(random(-100, 100), -0.5, random(-100, 100));
//     } else {
//       _scene.position.set(random(-500, 500), -0.5, random(-1000, 1000));
//     }

//     // Adjust the y position to be negative for underwater placement
//     _scene.position.y = -random(5, 15);

//     this.trash = _scene;
//   }
// }
//----------------------------------------------------------------
async function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene)
    })
  })
}
let boatModel = null


//-------------------trash_funcation------------------------------
async function createTrash() {
  if (!boatModel) {
    boatModel = await loadModel("images/trash-bag/scene.gltf")
  }
  return new Trash(boatModel.clone())
}


// let hillTrashCount = 0;  trash instances

// async function createTrash() {
//   if (!boatModel) {
//     boatModel = await loadModel("images/trash-bag/scene.gltf");
//   }

//   // Randomly decide whether to create a trash bag or a hill trash
//   if (Math.random() > 0.5) {
//     return new Trash(boatModel.clone());
//   } else {
//     if (hillTrashCount < 10) { // Limit the number of hill trash instances to 10
//       hillTrashCount++;
//       return new HillTrash(hillModel.clone());
//     } else {
//       return new Trash(boatModel.clone()); // Create a trash bag if the limit is reached
//     }
//   }
// }
//--------------------------------------------------------------
let trashes = []
const TRASH_COUNT = 500
init();
animate();
async function init() {
  // hillModel = await loadModel("images/hill/scene.gltf"); 
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  document.body.appendChild(renderer.domElement);
  //
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(30, 30, 100);
  //
  sun = new THREE.Vector3();
  // Water
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  water = new Water(
    waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('/images/waternormals.jpg', function (texture) {

      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined
  }
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // Skybox
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);
  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;
  const parameters = {
    elevation: 2,
    azimuth: 180
  };
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  let renderTarget;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    if (renderTarget !== undefined) renderTarget.dispose();
    renderTarget = pmremGenerator.fromScene(sky);
    scene.environment = renderTarget.texture;
  }

  updateSun();
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();


  const waterUniforms = water.material.uniforms;
  for (let i = 0; i < TRASH_COUNT; i++) {
    const trash = await createTrash()
    trashes.push(trash)
  }
  //
  window.addEventListener('resize', onWindowResize);

  //---------------------------Update key-------------------------------
  window.addEventListener('keydown', function (e) {
    if (e.key == "ArrowUp") {
      boat.speed.vel = 1.5
    }
    if (e.key == "ArrowDown") {
      boat.speed.vel = -1.5
    }
    if (e.key == "ArrowRight") {
      boat.speed.rot = -0.2
    }
    if (e.key == "ArrowLeft") {
      boat.speed.rot = 0.3
    }
  })
  window.addEventListener('keyup', function (e) {
    boat.stop()
  })
}
function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}
//-----------------------iscollision----------------------------
function isColliding(boat, trash) {
  const distance = boat.position.distanceTo(trash.position);
  console.log("Distance between boat and trash:", distance);
  return distance < 30;
}
function checkCollisions() {
  if (boat.boat) {
    const collidedIndices = [];
    trashes.forEach((trash, index) => {
      if (trash.trash) {
        if (isColliding(boat.boat, trash.trash)) {
          console.log("Collision detected with trash:", index);
          scene.remove(trash.trash);
          score++;
          document.getElementById('score-container').textContent = 'Score: ' + score;
          collidedIndices.push(index);
        }
      }
    });

    // Remove collided trashes 
    for (let i = collidedIndices.length - 1; i >= 0; i--) {
      trashes.splice(collidedIndices[i], 1);
    }
  }
}
function animate() {
  requestAnimationFrame(animate);
  render();
  boat.update()
  checkCollisions()
}

function render() {
  water.material.uniforms['time'].value += 1.0 / 60.0;
  renderer.render(scene, camera);

}