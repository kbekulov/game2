export const GAME_CONFIG = {
  movement: {
    walkSpeed: 3.2,
    jogSpeed: 4.8,
    sprintSpeed: 7.0,
    acceleration: 24,
    deceleration: 18,
    airAcceleration: 7,
    airControl: 0.34,
    jumpVelocity: 5.2,
    gravity: -17.5,
    playerRadius: 0.34,
    playerHeight: 1.74,
    eyeHeight: 1.56,
    stepSnap: 0.48
  },
  camera: {
    sensitivity: 0.0022,
    minPitch: -1.36,
    maxPitch: 1.24,
    walkBobAmount: 0.028,
    jogBobAmount: 0.044,
    sprintBobAmount: 0.072,
    walkBobFrequency: 7.2,
    jogBobFrequency: 9.1,
    sprintBobFrequency: 12.7,
    landingImpact: 0.075,
    recoilReturn: 14,
    recoilSnappiness: 32
  },
  weapon: {
    magazineSize: 17,
    reserveAmmo: 51,
    fireInterval: 0.145,
    damage: 42,
    recoilPitch: 0.046,
    recoilYaw: 0.012,
    reloadPartialTime: 1.36,
    reloadEmptyTime: 1.72,
    pressCheckTime: 0.82,
    dryFireTime: 0.22,
    muzzleFlashTime: 0.045,
    casingLife: 1.15,
    maxRange: 85
  },
  enemy: {
    health: 100,
    sightRange: 25,
    attackRange: 20,
    fieldOfView: 0.46,
    moveSpeed: 1.85,
    chaseSpeed: 2.55,
    fireInterval: 1.15,
    damage: 13,
    hitStunTime: 0.18
  },
  game: {
    playerHealth: 100,
    targetEnemyCount: 6,
    respawnPosition: { x: 0, y: 0, z: 27 },
    respawnYaw: 0
  }
} as const;
