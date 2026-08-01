import * as THREE from 'three';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { Game } from './game.js';

const style = document.createElement('style');
style.textContent = `
html,body,#app{margin:0;width:100%;height:100%;overflow:hidden;background:#05060f;touch-action:none;font-family:Inter,system-ui,Segoe UI,sans-serif;color:#eaffff;user-select:none}
canvas{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}
.hud{position:fixed;inset:0;pointer-events:none;text-shadow:0 0 10px currentColor}
.top{position:absolute;top:max(12px,env(safe-area-inset-top));font-weight:800;letter-spacing:0}
.left{left:14px}.center{left:50%;transform:translateX(-50%);text-align:center}.right{right:14px;text-align:right}
.label,.wave{font-size:11px;color:#9defff}.level{font-size:14px;color:#fff}.score{font-size:24px;color:#fff}.combo{font-size:16px;color:#7dfcff;transition:transform .12s}.combo.hot{transform:scale(1.22);color:#ffe56a}
.hp{width:132px;height:14px;border:1px solid #46f7ff;background:rgba(4,10,18,.7);box-shadow:0 0 12px #20d8ff;border-radius:4px;overflow:hidden}.hp i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff335f,#ffe66a,#55ff9a);transition:width .15s}
.bossbar{display:none;margin-top:6px;width:min(420px,70vw);height:12px;border:1px solid #ff4a4a;background:#1b0710;border-radius:3px;box-shadow:0 0 14px #ff3030;overflow:hidden}.bossbar i{display:block;height:100%;background:#ff3030;width:100%}
.crosshair{position:absolute;left:50%;top:50%;width:22px;height:22px;transform:translate(-50%,-50%);filter:drop-shadow(0 0 8px #7dfcff)}.crosshair:before,.crosshair:after{content:"";position:absolute;background:#dfffff}.crosshair:before{left:10px;top:0;width:2px;height:22px}.crosshair:after{left:0;top:10px;width:22px;height:2px}
.hud-button{pointer-events:auto;border:1px solid currentColor;background:rgba(5,10,20,.62);color:#eaffff;box-shadow:0 0 14px currentColor,inset 0 0 12px rgba(255,255,255,.08);font-weight:900;touch-action:none}
.fire{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));width:96px;height:96px;border-radius:50%;color:#ff4b6e;font-size:18px}.fire:active,.jump:active,.weapon:active{transform:scale(.95)}
.jump{position:absolute;right:max(34px,env(safe-area-inset-right));bottom:132px;width:62px;height:62px;border-radius:50%;color:#7dfcff;font-size:12px}
.weapons{position:absolute;right:128px;bottom:max(32px,env(safe-area-inset-bottom));display:flex;gap:8px;pointer-events:auto}.weapon{width:42px;height:42px;border-radius:7px;color:#777}.weapon.owned{color:#eaffff}.weapon.active{color:#ffe66a;background:rgba(255,230,106,.18)}
.mute{position:absolute;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);padding:8px 10px;border-radius:7px;color:#a6f7ff;font-size:11px}
.joy{position:absolute;width:128px;height:128px;opacity:0;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(125,252,255,.5);background:rgba(125,252,255,.08);box-shadow:0 0 20px rgba(125,252,255,.35)}.joy div{position:absolute;left:50%;top:50%;width:54px;height:54px;border-radius:50%;background:rgba(125,252,255,.28);border:1px solid #bfffff}
.vignette{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle,transparent 48%,rgba(255,0,48,.72));opacity:0;transition:opacity .08s}.big-banner{position:fixed;left:50%;top:34%;transform:translate(-50%,-50%) scale(.85);opacity:0;text-align:center;color:#fff;pointer-events:none;text-shadow:0 0 18px #7dfcff,0 0 32px #ff40d6}.big-banner b{display:block;font-size:clamp(34px,8vw,82px)}.big-banner span{font-size:clamp(13px,3vw,22px);color:#bfffff}.big-banner.show{animation:banner 1.5s ease-out}.score-pop{position:fixed;left:0;top:0;font-weight:900;font-size:20px;pointer-events:none;text-shadow:0 0 12px currentColor}.screen{position:fixed;inset:0;display:grid;place-items:center;text-align:center;background:radial-gradient(circle at 50% 35%,rgba(50,240,255,.16),rgba(5,6,15,.94) 58%);pointer-events:auto}.screen h1{font-size:clamp(42px,11vw,96px);margin:0;color:#fff;text-shadow:0 0 18px #35e9ff,0 0 34px #ff40d6}.screen p{max-width:560px;margin:14px auto;color:#bfefff}.screen button{margin-top:14px;padding:14px 22px;border-radius:7px;border:1px solid #7dfcff;background:rgba(125,252,255,.12);color:#fff;font-weight:900;box-shadow:0 0 18px #35e9ff}
@keyframes banner{0%{opacity:0;transform:translate(-50%,-50%) scale(.72)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-70%) scale(1)}}
@media (max-width:620px){.weapons{right:118px}.fire{width:88px;height:88px}.jump{bottom:124px}.hp{width:108px}.score{font-size:20px}}
`;
document.head.appendChild(style);

const root = document.getElementById('app');
const hud = new HUD(root);
const renderer = new THREE.WebGLRenderer({ canvas: hud.canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 260);
const input = new Input(root, hud);
const game = new Game(scene, camera, renderer, hud, input);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
