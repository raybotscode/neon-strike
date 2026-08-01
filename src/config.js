export const CFG = {
  player: { radius: 0.42, height: 1.7, speed: 7.2, jump: 7.3, gravity: 18, maxHp: 100 },
  camera: { fov: 75, lookSpeedTouch: 0.0042, lookSpeedMouse: 0.0032, pitchLimit: 1.32 },
  combo: { window: 3 },
  particles: { count: 760 },
  boundsPad: 1.2,
  weapons: {
    blaster: { label: 'Blaster', owned: true, fireRate: 0.22, damage: 28, speed: 35, life: 1.25, radius: 0.08, color: 0x35e9ff, shake: 0.06, infinite: true },
    smg: { label: 'SMG', owned: false, fireRate: 0.075, damage: 11, speed: 42, life: 1.0, radius: 0.055, color: 0xffe05b, shake: 0.035, ammo: 180 },
    plasma: { label: 'Plasma', owned: false, fireRate: 0.7, damage: 72, speed: 24, life: 1.6, radius: 0.16, color: 0xb45cff, shake: 0.12, ammo: 26, aoe: 2.4 }
  },
  levels: [
    { name: 'Training Grid', key: 'training', color: 0x36e9ff, accent: 0x8cf7ff, size: 28, maxEnemies: 9, waves: [{ grunt: 5 }, { grunt: 7 }, { grunt: 9 }], crates: 6, blocks: 5, gems: 9 },
    { name: 'The Reactor', key: 'reactor', color: 0xff8b24, accent: 0xffd166, size: 34, maxEnemies: 11, waves: [{ grunt: 7, shooter: 2 }, { grunt: 8, shooter: 4 }, { grunt: 9, shooter: 5 }], crates: 7, blocks: 7, hazards: 3, gems: 11 },
    { name: 'The Vault', key: 'vault', color: 0x55ff8a, accent: 0xc7ffd5, size: 40, maxEnemies: 13, waves: [{ grunt: 8, rusher: 4 }, { grunt: 8, shooter: 4, rusher: 5 }, { grunt: 10, shooter: 5, rusher: 6 }], crates: 9, blocks: 9, hazards: 2, fences: 2, gems: 13 },
    { name: 'The Hive', key: 'hive', color: 0xff40d6, accent: 0xffa7ee, size: 46, maxEnemies: 15, waves: [{ grunt: 8, shooter: 4, rusher: 5, sniper: 2 }, { grunt: 10, shooter: 5, rusher: 7, sniper: 3 }, { grunt: 12, shooter: 6, rusher: 8, sniper: 4 }], crates: 10, blocks: 12, hazards: 4, fences: 3, gems: 15 },
    { name: 'The Overlord', key: 'overlord', color: 0xff3030, accent: 0xffa0a0, size: 52, maxEnemies: 16, waves: [{ grunt: 8, shooter: 4, rusher: 5 }, { boss: 1 }], crates: 10, blocks: 10, hazards: 4, fences: 4, gems: 18 }
  ]
};
