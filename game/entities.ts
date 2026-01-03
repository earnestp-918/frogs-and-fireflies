
import { 
  FROG_RADIUS, GRAVITY, FRICTION, MOVE_SPEED, AIR_ACCEL, MAX_SPEED, 
  TONGUE_SPEED, TONGUE_RANGE, LILY_PAD_WIDTH, LILY_PAD_HEIGHT,
  JUMP_FORCE 
} from './constants';
import { FlyType } from '../types';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 1) * 6;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 4 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2;
    this.life -= 0.03;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class LilyPad {
  x: number;
  width: number = LILY_PAD_WIDTH;
  height: number = LILY_PAD_HEIGHT;
  id: number;

  constructor(x: number, id: number) {
    this.x = x;
    this.id = id;
  }

  getY(gameHeight: number) {
    return gameHeight - 130;
  }

  draw(ctx: CanvasRenderingContext2D, gameHeight: number) {
    const y = this.getY(gameHeight);
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.ellipse(this.x + this.width / 2, y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, y);
    ctx.lineTo(this.x + this.width / 2 + 20, y - 10);
    ctx.moveTo(this.x + this.width / 2, y);
    ctx.lineTo(this.x + this.width / 2 - 20, y + 5);
    ctx.stroke();
  }
}

export class Fly {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  radius: number = 6;
  type: FlyType = 'fly';
  alpha: number = 1.0;
  wiggleOffset: number = 0;

  constructor(gameWidth: number, gameHeight: number, gameTime: number) {
    this.reset(gameWidth, gameHeight, gameTime);
  }

  reset(gameWidth: number, gameHeight: number, gameTime: number) {
    this.x = Math.random() > 0.5 ? -20 : gameWidth + 20;
    // ADJUSTMENT: Lower the spawn floor. 
    // Previous: Math.random() * (gameHeight - 500) + 50
    // "1/3 lower" roughly means reducing that 500 offset to around 330.
    this.y = Math.random() * (gameHeight - 330) + 50; 
    this.vx = (Math.random() * 2 + 1) * (this.x < 0 ? 1 : -1);
    this.vy = Math.sin(Math.random() * Math.PI * 2);
    this.radius = 6;
    this.wiggleOffset = Math.random() * 100;
    this.alpha = 1.0;

    const isNight = gameTime > 60;
    const rand = Math.random();

    if (rand < 0.1) {
      this.type = 'dragonfly';
      this.vx *= 1.8;
      this.radius = 7;
    } else if (isNight) {
      this.type = 'firefly';
      this.vx *= 0.6;
    } else {
      this.type = 'fly';
    }
  }

  update(frameCount: number, gameWidth: number) {
    this.x += this.vx;
    const bobAmount = this.type === 'dragonfly' ? 0.2 : 0.5;
    this.y += Math.sin((frameCount + this.wiggleOffset) * 0.1) * bobAmount;

    if (this.type === 'firefly') {
      this.alpha = 0.5 + 0.5 * Math.sin(frameCount * 0.05 + this.wiggleOffset);
    } else {
      this.alpha = 1.0;
    }

    return (this.vx > 0 && this.x > gameWidth + 50) || (this.vx < 0 && this.x < -50);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.type === 'firefly') {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FFFF00';
      ctx.fillStyle = '#FFFF00';
    } else if (this.type === 'dragonfly') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00FFFF';
      ctx.fillStyle = '#00FFFF';
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#444444';
    }

    ctx.beginPath();
    if (this.type === 'dragonfly') {
      ctx.ellipse(this.x, this.y, this.radius, this.radius / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';

    if (this.type === 'dragonfly') {
      ctx.beginPath();
      ctx.ellipse(this.x - 5, this.y - 5, 8, 3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.x + 5, this.y - 5, 8, 3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(this.x - 4, this.y - 4, 5, 2.5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.x + 4, this.y - 4, 5, 2.5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class Frog {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  radius: number = FROG_RADIUS;
  color: string;
  startPadIndex: number;
  score: number = 0;
  grounded: boolean = false;
  isSplashed: boolean = false;
  splashTimer: number = 0;
  tongueState: 'idle' | 'extending' | 'retracting' = 'idle';
  tongueLength: number = 0;
  tongueAngle: number = 0;
  caughtTarget: Fly | null = null;
  facingRight: boolean = true;

  constructor(color: string, startPadIndex: number) {
    this.color = color;
    this.startPadIndex = startPadIndex;
    this.facingRight = startPadIndex === 0;
  }

  respawn(lilyPads: LilyPad[], gameHeight: number) {
    const homePad = lilyPads[this.startPadIndex];
    if (homePad) {
      this.x = homePad.x + homePad.width / 2;
      this.y = homePad.getY(gameHeight) - this.radius;
    }
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.isSplashed = false;
    this.splashTimer = 0;
    this.tongueState = 'idle';
    this.tongueLength = 0;
    this.caughtTarget = null;
    this.facingRight = this.startPadIndex === 0;
  }

  update(leftKey: boolean, rightKey: boolean, gameWidth: number, gameHeight: number, lilyPads: LilyPad[], flies: Fly[], onCatch: (points: number, x: number, y: number, color: string) => void, onSplash: (x: number, y: number) => void) {
    if (this.isSplashed) {
      this.splashTimer -= 16;
      if (this.splashTimer <= 0) this.respawn(lilyPads, gameHeight);
      return;
    }

    if (leftKey) {
      this.vx -= this.grounded ? MOVE_SPEED : AIR_ACCEL;
      this.facingRight = false;
    }
    if (rightKey) {
      this.vx += this.grounded ? MOVE_SPEED : AIR_ACCEL;
      this.facingRight = true;
    }

    this.vx *= FRICTION;
    if (this.vx > MAX_SPEED) this.vx = MAX_SPEED;
    if (this.vx < -MAX_SPEED) this.vx = -MAX_SPEED;

    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;

    this.grounded = false;
    lilyPads.forEach(pad => {
      const padY = pad.getY(gameHeight);
      if (this.x > pad.x && this.x < pad.x + pad.width &&
          this.y + this.radius >= padY - 10 &&
          this.y + this.radius <= padY + 25 &&
          this.vy >= 0) {
        this.y = padY - this.radius;
        this.vy = 0;
        this.grounded = true;
      }
    });

    const waterY = gameHeight - 100;
    if (this.y + this.radius > waterY + 15 && !this.grounded) {
      this.splash(onSplash);
    }

    if (this.x < this.radius) { this.x = this.radius; this.vx = 0; }
    if (this.x > gameWidth - this.radius) { this.x = gameWidth - this.radius; this.vx = 0; }

    this.updateTongue(flies, onCatch);
  }

  updateTongue(flies: Fly[], onCatch: (points: number, x: number, y: number, color: string) => void) {
    if (this.tongueState === 'extending') {
      this.tongueLength += TONGUE_SPEED;
      const tipX = this.x + Math.cos(this.tongueAngle) * this.tongueLength;
      const tipY = this.y + Math.sin(this.tongueAngle) * this.tongueLength;

      let hitIndex = -1;
      for (let i = 0; i < flies.length; i++) {
        const f = flies[i];
        if (f.type === 'firefly' && f.alpha < 0.3) continue;
        const dx = tipX - f.x;
        const dy = tipY - f.y;
        if (Math.sqrt(dx * dx + dy * dy) < f.radius + 15) {
          hitIndex = i;
          break;
        }
      }

      if (hitIndex !== -1) {
        const caughtFly = flies[hitIndex];
        let points = 1;
        let color = '#888888';
        if (caughtFly.type === 'firefly') { points = 2; color = '#FFFF00'; }
        else if (caughtFly.type === 'dragonfly') { points = 3; color = '#00FFFF'; }

        flies.splice(hitIndex, 1);
        this.caughtTarget = caughtFly;
        this.caughtTarget.alpha = 1.0;
        this.score += points;
        onCatch(points, tipX, tipY, color);
        this.tongueState = 'retracting';
      }

      if (this.tongueLength >= TONGUE_RANGE) this.tongueState = 'retracting';
    } else if (this.tongueState === 'retracting') {
      this.tongueLength -= TONGUE_SPEED * 1.5;
      if (this.caughtTarget) {
        this.caughtTarget.x = this.x + Math.cos(this.tongueAngle) * this.tongueLength;
        this.caughtTarget.y = this.y + Math.sin(this.tongueAngle) * this.tongueLength;
      }
      if (this.tongueLength <= 0) {
        this.tongueLength = 0;
        this.tongueState = 'idle';
        this.caughtTarget = null;
      }
    }
  }

  startJump() {
    if (this.isSplashed) return;
    if (this.grounded) {
      this.vy = JUMP_FORCE;
      this.grounded = false;
    }
  }

  endJump() {
    if (this.vy < -3) this.vy *= 0.5;
  }

  shootTongue(flies: Fly[]) {
    if (this.isSplashed || this.tongueState !== 'idle') return;

    // RULE: Strictly horizontal tongue. Eliminate upward/downward snapping.
    // The frog always shoots straight left or straight right.
    this.tongueAngle = this.facingRight ? 0 : Math.PI;
    this.tongueState = 'extending';
  }

  splash(onSplash: (x: number, y: number) => void) {
    this.isSplashed = true;
    this.splashTimer = 2000;
    onSplash(this.x, this.y + this.radius);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isSplashed) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (this.tongueState !== 'idle') {
      ctx.strokeStyle = '#FF69B4';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(this.tongueAngle) * this.tongueLength,
        this.y + Math.sin(this.tongueAngle) * this.tongueLength
      );
      ctx.stroke();
    }

    if (this.caughtTarget) this.caughtTarget.draw(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);
    const stretchY = 1 + (Math.abs(this.vy) / 20);
    let stretchX = 1 + (Math.abs(this.vx) / 20);
    if (!this.grounded) stretchX = 0.8;
    ctx.scale(this.facingRight ? stretchX : -stretchX, stretchY);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-8, -10, 8, 0, Math.PI * 2);
    ctx.arc(8, -10, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    const pupX = Math.abs(this.vx) * 0.5;
    const pupY = this.vy * 0.1;
    ctx.arc(-8 + pupX, -10 + pupY, 3, 0, Math.PI * 2);
    ctx.arc(8 + pupX, -10 + pupY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
