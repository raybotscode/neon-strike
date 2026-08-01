import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as cloneSkeletons } from 'three/addons/utils/SkeletonUtils.js';

const MODEL_PATHS = {
  weapon_blaster: '/models/weapon_blaster.glb',
  weapon_smg: '/models/weapon_smg.glb',
  weapon_plasma: '/models/weapon_plasma.glb',
  enemy_grunt: '/models/enemy_grunt.glb',
  enemy_shooter: '/models/enemy_shooter.glb',
  enemy_rusher: '/models/enemy_rusher.glb',
  enemy_sniper: '/models/enemy_sniper.glb',
  enemy_boss: '/models/enemy_boss.glb',
  prop_crate: '/models/prop_crate.glb',
  prop_barrier: '/models/prop_barrier.glb'
};

const loaded = new Map();
let loadingPromise = null;

export async function loadModels() {
  if (loadingPromise) return loadingPromise;

  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loadingPromise = Promise.all(Object.entries(MODEL_PATHS).map(async ([key, path]) => {
    try {
      const gltf = await loader.loadAsync(path);
      const scene = gltf.scene;
      scene.name = key;
      scene.traverse(obj => {
        if (!obj.isMesh) return;
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            mat.envMapIntensity = mat.envMapIntensity ?? 1;
            mat.needsUpdate = true;
          }
        }
      });
      loaded.set(key, scene);
    } catch (err) {
      console.warn(`Model failed to load: ${key}`, err);
    }
  })).then(() => loaded);

  return loadingPromise;
}

export function makeModel(key) {
  const source = loaded.get(key);
  if (!source) return null;
  const clone = cloneSkeletons(source);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  return clone;
}

export function fitModel(group, { height = 1, width = null, depth = null, groundY = 0, centerXZ = true } = {}) {
  if (!group) return group;
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const scaleY = size.y > 0 ? height / size.y : 1;
  const scaleX = width && size.x > 0 ? width / size.x : scaleY;
  const scaleZ = depth && size.z > 0 ? depth / size.z : scaleY;
  const scale = Math.min(scaleX, scaleY, scaleZ);
  group.scale.multiplyScalar(scale);
  group.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(group);
  const center = scaledBox.getCenter(new THREE.Vector3());
  const min = scaledBox.min;
  if (centerXZ) {
    group.position.x -= center.x;
    group.position.z -= center.z;
  }
  group.position.y += groundY - min.y;
  return group;
}
