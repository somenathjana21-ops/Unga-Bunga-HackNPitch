import Phaser from 'phaser';
import { loadPreferences } from '../../services/preferences';
import type { CombatBullet, CombatEnemy } from './types';
import { isEnemyExposed } from './enemy';
import { ACTIVE_RELOAD_MAX, ACTIVE_RELOAD_MIN, MAGAZINE_SIZE, type Player } from './player';

/**
 * Shared combat visual feedback layer for CombatScene and RescueScene:
 * muzzle flashes, tracer trails, impact sparks, floating damage/status callouts,
 * dodge ghosts, counter shockwaves, enemy HP bars, and a diegetic aiming reticle.
 */
export class ArenaFx {
  private readonly scene: Phaser.Scene;
  private readonly reducedMotion: boolean;
  private readonly trailGraphics: Phaser.GameObjects.Graphics;
  private readonly enemyBarGraphics: Phaser.GameObjects.Graphics;
  private readonly reticleGraphics: Phaser.GameObjects.Graphics;
  private readonly reloadBarGraphics: Phaser.GameObjects.Graphics;
  private reticleSpread = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const prefs = loadPreferences();
    this.reducedMotion = prefs.status === 'ok' && prefs.preferences.reducedMotion === 'reduce';
    this.trailGraphics = scene.add.graphics().setDepth(46);
    this.enemyBarGraphics = scene.add.graphics().setDepth(54);
    this.reloadBarGraphics = scene.add.graphics().setDepth(54);
    this.reticleGraphics = scene.add.graphics().setDepth(95);
  }

  shake(durationMs: number, intensity: number): void {
    if (this.reducedMotion) return;
    this.scene.cameras.main.shake(durationMs, intensity, true);
  }

  muzzleFlash(x: number, y: number, dirX: number, dirY: number, isCounter: boolean): void {
    this.reticleSpread = Math.min(12, this.reticleSpread + (isCounter ? 10 : 5));
    const idx = Math.floor(Math.random() * 4) + 1;
    const key = `muzzle-flash-0${idx}`;
    const mx = x + dirX * 18;
    const my = y + dirY * 18;
    if (this.scene.textures.exists(key)) {
      const flash = this.scene.add.image(mx, my, key)
        .setDepth(53)
        .setRotation(Math.atan2(dirY, dirX))
        .setDisplaySize(isCounter ? 44 : 28, isCounter ? 44 : 28)
        .setTint(isCounter ? 0xfde047 : 0xfff3c4);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: flash.scaleX * 1.35,
        scaleY: flash.scaleY * 1.35,
        duration: isCounter ? 120 : 70,
        onComplete: () => flash.destroy(),
      });
    }
    if (isCounter) {
      const ring = this.scene.add.circle(x, y, 14, 0xfde047, 0.16)
        .setStrokeStyle(3, 0xfde047, 0.95)
        .setDepth(53);
      this.scene.tweens.add({
        targets: ring,
        scale: 3.6,
        alpha: 0,
        duration: 240,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  sparks(x: number, y: number, color: number, count = 6, spread = 28): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = spread * (0.4 + Math.random() * 0.6);
      const p = this.scene.add.rectangle(x, y, 3, 3, color, 0.95).setDepth(56);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 180 + Math.random() * 120,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  callout(x: number, y: number, text: string, color = '#f8fafc', large = false): void {
    const label = this.scene.add.text(x, y, text, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: large ? '14px' : '11px',
      fontStyle: 'bold',
      color,
      stroke: '#090d14',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(90);

    this.scene.tweens.add({
      targets: label,
      y: y - (large ? 28 : 20),
      alpha: 0,
      duration: large ? 650 : 460,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  dodgeGhost(x: number, y: number, textureKey: string, frame: string | number, size: number, reflex: boolean): void {
    const ghost = this.scene.add.sprite(x, y, textureKey, frame)
      .setDisplaySize(size, size)
      .setOrigin(0.5, 0.62)
      .setDepth(45)
      .setAlpha(0.52)
      .setTint(reflex ? 0xfde047 : 0x38bdf8);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 190,
      onComplete: () => ghost.destroy(),
    });
  }

  reflexFlash(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y, 16, 0xfde047, 0.14)
      .setStrokeStyle(3, 0xfef08a, 1)
      .setDepth(55);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.callout(x, y - 34, 'REFLEX DODGE!', '#fde047', true);
  }

  /** Renders bullet trails, enemy HP/exposed bars, player ammo/reload bar, and aiming reticle. */
  renderFrame(
    player: Player,
    enemies: readonly CombatEnemy[],
    bullets: readonly CombatBullet[],
    pointerX: number,
    pointerY: number,
    effNow: number,
    dtSec: number,
  ): void {
    this.reticleSpread = Math.max(0, this.reticleSpread - dtSec * 38);

    // 1. Bullet tracer trails
    this.trailGraphics.clear();
    for (const b of bullets) {
      if (b.isCounter) {
        this.trailGraphics.lineStyle(4, 0xfde047, 0.95);
        this.trailGraphics.lineBetween(b.prevX - b.vx * 18, b.prevY - b.vy * 18, b.x, b.y);
        this.trailGraphics.lineStyle(2, 0xffffff, 0.9);
        this.trailGraphics.lineBetween(b.prevX - b.vx * 10, b.prevY - b.vy * 10, b.x, b.y);
      } else if (b.isOvercharged) {
        this.trailGraphics.lineStyle(3, 0xf59e0b, 0.9);
        this.trailGraphics.lineBetween(b.prevX - b.vx * 10, b.prevY - b.vy * 10, b.x, b.y);
      } else if (b.owner === 'player') {
        this.trailGraphics.lineStyle(2, 0x86efac, 0.72);
        this.trailGraphics.lineBetween(b.prevX - b.vx * 6, b.prevY - b.vy * 6, b.x, b.y);
      } else {
        this.trailGraphics.lineStyle(2.5, 0xf87171, 0.85);
        this.trailGraphics.lineBetween(b.prevX - b.vx * 8, b.prevY - b.vy * 8, b.x, b.y);
      }
    }

    // 2. Enemy health bars & exposed/stagger indicators
    this.enemyBarGraphics.clear();
    for (const e of enemies) {
      if (e.phase === 'dead') continue;
      const bw = 34;
      const bh = 4;
      const bx = e.x - bw / 2;
      const by = e.y - 31;
      const ratio = Math.max(0, Math.min(1, e.health / Math.max(1, e.maxHealth)));
      this.enemyBarGraphics.fillStyle(0x090d14, 0.85);
      this.enemyBarGraphics.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      const barColor = isEnemyExposed(e) ? 0xfde047 : e.kind === 'rusher' ? 0xf97316 : 0xef4444;
      this.enemyBarGraphics.fillStyle(barColor, 0.95);
      this.enemyBarGraphics.fillRect(bx, by, bw * ratio, bh);
    }

    // 3. Diegetic ammo pips / Active Snap-Reload bar below K
    this.reloadBarGraphics.clear();
    if (player.reloading) {
      const bw = 42;
      const bh = 5;
      const bx = player.x - bw / 2;
      const by = player.y + 24;
      const p = player.reloadProgress(effNow);
      this.reloadBarGraphics.fillStyle(0x0b1018, 0.9);
      this.reloadBarGraphics.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      // Golden active-reload sweet spot zone
      this.reloadBarGraphics.fillStyle(0xfde047, 0.55);
      this.reloadBarGraphics.fillRect(bx + bw * ACTIVE_RELOAD_MIN, by, bw * (ACTIVE_RELOAD_MAX - ACTIVE_RELOAD_MIN), bh);
      // Moving pip
      this.reloadBarGraphics.fillStyle(0xffffff, 1);
      this.reloadBarGraphics.fillRect(bx + bw * p - 1.5, by - 1.5, 3, bh + 3);
    } else {
      const pipW = 4;
      const gap = 2;
      const totalW = MAGAZINE_SIZE * pipW + (MAGAZINE_SIZE - 1) * gap;
      const startX = player.x - totalW / 2;
      const py = player.y + 24;
      for (let i = 0; i < MAGAZINE_SIZE; i++) {
        const filled = i < player.ammo;
        const isGold = filled && i < player.overchargedRounds;
        this.reloadBarGraphics.fillStyle(
          isGold ? 0xfde047 : filled ? 0x93c5fd : 0x334155,
          filled ? 0.95 : 0.6,
        );
        this.reloadBarGraphics.fillRect(startX + i * (pipW + gap), py, pipW, 3);
      }
    }

    // 4. Crisp tactical reticle & faint sightline
    this.reticleGraphics.clear();
    const isCounter = player.canCounter(effNow);
    const col = isCounter ? 0xfde047 : player.overchargedRounds > 0 ? 0xf59e0b : 0xe2e8f0;
    // Faint dashed sightline from K toward reticle
    this.reticleGraphics.lineStyle(1, col, isCounter ? 0.45 : 0.16);
    this.reticleGraphics.lineBetween(player.x + player.aimX * 20, player.y + player.aimY * 20, pointerX, pointerY);

    const gap = 5 + this.reticleSpread;
    const arm = isCounter ? 8 : 5;
    this.reticleGraphics.lineStyle(isCounter ? 2.5 : 1.5, col, 0.92);
    this.reticleGraphics.lineBetween(pointerX - gap - arm, pointerY, pointerX - gap, pointerY);
    this.reticleGraphics.lineBetween(pointerX + gap, pointerY, pointerX + gap + arm, pointerY);
    this.reticleGraphics.lineBetween(pointerX, pointerY - gap - arm, pointerX, pointerY - gap);
    this.reticleGraphics.lineBetween(pointerX, pointerY + gap, pointerX, pointerY + gap + arm);
    this.reticleGraphics.fillStyle(col, 0.95);
    this.reticleGraphics.fillCircle(pointerX, pointerY, isCounter ? 2.5 : 1.5);
  }
}
