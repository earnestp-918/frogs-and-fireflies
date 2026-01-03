import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, GameMode } from './types';
import { Frog, Fly, Particle, LilyPad } from './game/entities';
import { 
  GAME_DURATION, PAD_LEFT_PCT, PAD_RIGHT_PCT, 
  LILY_PAD_WIDTH, COLORS, WATER_LEVEL_OFFSET 
} from './game/constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.ATTRACT);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVP);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const gameRef = useRef({
    p1: new Frog(COLORS.P1, 0),
    p2: new Frog(COLORS.P2, 1),
    flies: [] as Fly[],
    particles: [] as Particle[],
    lilyPads: [] as LilyPad[],
    gameTime: 0,
    frameCount: 0,
    keys: {} as Record<string, boolean>,
    aiTimer: 0,
    aiAction: 'idle' as 'idle' | 'move_left' | 'move_right'
  });

  const updateDimensions = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    // FIX 1: Clamp playable area width so pads remain reachable on large screens
    const MAX_GAME_WIDTH = 1200; 
    const gameWidth = Math.min(width, MAX_GAME_WIDTH);
    const offsetX = (width - gameWidth) / 2;

    gameRef.current.lilyPads = [
      new LilyPad(offsetX + gameWidth * PAD_LEFT_PCT - LILY_PAD_WIDTH / 2, 0),
      new LilyPad(offsetX + gameWidth * PAD_RIGHT_PCT - LILY_PAD_WIDTH / 2, 1)
    ];
  }, []);

  const startMusic = useCallback(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.play().catch(e => {
        console.log("Audio play deferred to next interaction");
      });
    }
  }, [isMuted]);

  const resetGame = useCallback((mode: GameMode) => {
    const g = gameRef.current;
    const height = window.innerHeight;
    
    updateDimensions();

    g.p1.score = 0;
    g.p2.score = 0;
    g.p1.respawn(g.lilyPads, height);
    g.p2.respawn(g.lilyPads, height);
    g.flies = [];
    g.particles = [];
    g.gameTime = 0;
    g.frameCount = 0;
    setScore1(0);
    setScore2(0);
    setTimeRemaining(GAME_DURATION);
    setGameMode(mode);
    setGameState(GameState.PLAYING);

    startMusic();
  }, [startMusic, updateDimensions]);

  useEffect(() => {
    const audio = new Audio('bkgd1.mp3'); 
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    const globalClickHandler = () => {
      if (audioRef.current && audioRef.current.paused && !isMuted) {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', globalClickHandler);

    return () => {
      audio.pause();
      audioRef.current = null;
      window.removeEventListener('click', globalClickHandler);
    };
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted && gameState === GameState.PLAYING) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, gameState]);

  useEffect(() => {
    const img = new Image();
    img.src = 'lake.jpg'; 
    img.onload = () => {
      bgImageRef.current = img;
      setImageLoaded(true);
    };
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys[e.code] = true;
      gameRef.current.keys[e.key.toLowerCase()] = true;
      startMusic();

      if (gameState === GameState.ATTRACT) {
        if (e.code === 'Space' || e.key === ' ') resetGame(GameMode.VS_AI);
        else if (e.code === 'Enter') resetGame(GameMode.PVP);
        else if (e.code === 'KeyS' || e.key === 's') resetGame(GameMode.SOLO);
      }
      
      if (gameState === GameState.GAMEOVER) {
        if (e.code === 'Space' || e.key === ' ') {
          setGameState(GameState.ATTRACT);
        }
      }

      const g = gameRef.current;
      if (gameState === GameState.PLAYING) {
        if (e.key.toLowerCase() === 'w') g.p1.startJump();
        if (e.code === 'Space' || e.key === ' ') g.p1.shootTongue(g.flies);

        if (gameMode === GameMode.PVP) {
          if (e.key === 'ArrowUp') g.p2.startJump();
          if (e.code === 'Enter') g.p2.shootTongue(g.flies);
        } else if (gameMode === GameMode.SOLO) {
          if (e.key === 'ArrowUp') g.p1.startJump();
          if (e.code === 'Enter') g.p1.shootTongue(g.flies);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.code] = false;
      gameRef.current.keys[e.key.toLowerCase()] = false;
      if (e.key.toLowerCase() === 'w') gameRef.current.p1.endJump();
      if (e.key === 'ArrowUp') {
        gameRef.current.p1.endJump();
        gameRef.current.p2.endJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, gameMode, resetGame, updateDimensions, isMuted, startMusic]);

  const updateAI = (frog: Frog) => {
    const g = gameRef.current;
    if (frog.isSplashed) return;
    g.aiTimer++;
    if (g.aiTimer > 20) {
      const rand = Math.random();
      if (rand < 0.4) g.aiAction = 'idle';
      else if (rand < 0.7) g.aiAction = 'move_left';
      else g.aiAction = 'move_right';
      
      if (Math.random() < 0.4 && frog.grounded) {
        frog.startJump();
        setTimeout(() => { if (Math.random() > 0.5) frog.endJump(); }, 150 + Math.random() * 400);
      }
      g.aiTimer = 0;
    }

    let l = g.aiAction === 'move_left';
    let r = g.aiAction === 'move_right';
    if (frog.x < 100) { l = false; r = true; }
    if (frog.x > window.innerWidth - 100) { l = true; r = false; }

    g.flies.forEach(fly => {
      if (fly.type === 'firefly' && fly.alpha < 0.3) return;
      const dx = frog.x - fly.x;
      const dy = frog.y - fly.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 300 && Math.abs(dy) > 100 && frog.grounded) {
        frog.startJump();
      }
      if (dist < 280 && Math.abs(dy) < 30 && Math.random() < 0.1) {
        frog.shootTongue(g.flies);
      }
    });

    frog.update(l, r, window.innerWidth, window.innerHeight, g.lilyPads, g.flies, 
      () => {
        setScore1(g.p1.score);
        setScore2(g.p2.score);
      },
      (x, y) => { for(let i=0; i<15; i++) g.particles.push(new Particle(x, y, '#1E90FF')); }
    );
  };

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const g = gameRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;
      g.frameCount++;

      ctx.clearRect(0, 0, width, height);

      // Background
      if (bgImageRef.current) {
        const img = bgImageRef.current;
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;
        let dW, dH, dX, dY;
        if (canvasAspect > imgAspect) {
          dW = width; dH = width / imgAspect; dX = 0; dY = (height - dH) / 2;
        } else {
          dW = height * imgAspect; dH = height; dX = (width - dW) / 2; dY = 0;
        }
        ctx.drawImage(img, dX, dY, dW, dH);
      }

      // FIX 2: Time-of-day Tinting logic
      // In Attract mode, we cycle time endlessly (modulo) so the sun sets and rises.
      // In Game mode, time stops at GAME_DURATION.
      let effectiveTime = g.gameTime;
      if (gameState === GameState.ATTRACT) {
          effectiveTime = g.gameTime % GAME_DURATION;
      }
      
      const progress = effectiveTime / GAME_DURATION;
      
      let tint = 'rgba(0,0,0,0)';
      if (progress < 0.2) {
        tint = 'rgba(255, 255, 255, 0)';
      } else if (progress < 0.5) {
        const sub = (progress - 0.2) / 0.3;
        tint = `rgba(255, 100, 50, ${sub * 0.4})`; 
      } else if (progress < 0.8) {
        const sub = (progress - 0.5) / 0.3;
        const r = 255 - (sub * 250);
        const g_c = 100 - (sub * 90);
        const b = 50 + (sub * 100);
        tint = `rgba(${r}, ${g_c}, ${b}, ${0.4 + (sub * 0.4)})`;
      } else {
        const sub = (progress - 0.8) / 0.2;
        tint = `rgba(5, 5, 25, ${0.8 + (sub * 0.15)})`; 
      }
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, width, height);

      // Water
      const waterY = height - WATER_LEVEL_OFFSET;
      ctx.save();
      ctx.globalAlpha = progress > 0.6 ? 0.4 : 0.6; 
      ctx.fillStyle = COLORS.WATER_LIGHT;
      ctx.fillRect(0, waterY + 20, width, height - waterY);
      ctx.beginPath();
      ctx.moveTo(0, waterY + 20);
      for (let i = 0; i <= width; i += 20) {
        ctx.lineTo(i, waterY + 20 + Math.sin(i * 0.05 + g.frameCount * 0.05) * 5);
      }
      ctx.lineTo(width, height); ctx.lineTo(0, height);
      ctx.fillStyle = COLORS.WATER_DARK;
      ctx.fill();
      ctx.restore();

      // Entities
      g.lilyPads.forEach(pad => pad.draw(ctx, height));
      g.particles.forEach((p, i) => {
        p.update(); p.draw(ctx);
        if (p.life <= 0) g.particles.splice(i, 1);
      });

      if (g.flies.length < 18 && Math.random() < 0.1) {
        g.flies.push(new Fly(width, height, g.gameTime));
      }
      g.flies.forEach((f, i) => {
        if (f.update(g.frameCount, width)) g.flies.splice(i, 1);
        f.draw(ctx);
      });

      if (gameState === GameState.ATTRACT) {
        // FIX 3: Increment time in Attract mode for the day/night cycle
        g.gameTime += 1/60; 
        updateAI(g.p1); updateAI(g.p2);
        g.p1.draw(ctx); g.p2.draw(ctx);
      } else if (gameState === GameState.PLAYING) {
        g.gameTime += 1/60;
        if (g.gameTime >= GAME_DURATION) setGameState(GameState.GAMEOVER);
        if (g.frameCount % 10 === 0) setTimeRemaining(Math.max(0, Math.floor(GAME_DURATION - g.gameTime)));

        const p1Left = g.keys['KeyA'] || g.keys['a'] || (gameMode === GameMode.SOLO && g.keys['ArrowLeft']);
        const p1Right = g.keys['KeyD'] || g.keys['d'] || (gameMode === GameMode.SOLO && g.keys['ArrowRight']);
        g.p1.update(p1Left, p1Right, width, height, g.lilyPads, g.flies,
          () => setScore1(g.p1.score),
          (x, y) => { for(let i=0; i<15; i++) g.particles.push(new Particle(x, y, '#1E90FF')); }
        );
        g.p1.draw(ctx);

        if (gameMode === GameMode.PVP) {
          g.p2.update(g.keys['ArrowLeft'], g.keys['ArrowRight'], width, height, g.lilyPads, g.flies,
            () => setScore2(g.p2.score),
            (x, y) => { for(let i=0; i<15; i++) g.particles.push(new Particle(x, y, '#1E90FF')); }
          );
          g.p2.draw(ctx);
        } else if (gameMode === GameMode.VS_AI) {
          updateAI(g.p2); g.p2.draw(ctx);
        }
      } else if (gameState === GameState.GAMEOVER) {
        g.p1.draw(ctx);
        if (gameMode !== GameMode.SOLO) g.p2.draw(ctx);
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [gameState, gameMode, imageLoaded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="relative w-full h-full text-white overflow-hidden bg-black font-['Fredoka_One',_cursive]" onClick={startMusic}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* UI Layers */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-50">
        <div className="flex flex-col items-start gap-1 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
          <div className="text-3xl font-black tracking-tight" style={{ color: COLORS.P1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            P1: <span className="text-white">{score1}</span>
          </div>
          {gameState === GameState.PLAYING && (
            <div className="text-[10px] opacity-70 uppercase tracking-[0.2em] font-sans">WASD / SPACE</div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-4xl font-bold bg-white/10 backdrop-blur-xl px-8 py-3 rounded-full border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            {formatTime(timeRemaining)}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
            className="pointer-events-auto mt-2 bg-black/40 p-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="flex flex-col items-end gap-1 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
          <div className="text-3xl font-black tracking-tight" style={{ color: COLORS.P2, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {gameMode === GameMode.VS_AI ? 'CPU' : (gameMode === GameMode.SOLO ? 'MAX' : 'P2')}: <span className="text-white">{score2}</span>
          </div>
          {gameState === GameState.PLAYING && gameMode === GameMode.PVP && (
            <div className="text-[10px] opacity-70 uppercase tracking-[0.2em] font-sans">ARROWS / ENTER</div>
          )}
        </div>
      </div>

      {/* Attract Screen (Main Menu) */}
      {gameState === GameState.ATTRACT && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-40">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-400 mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            FROGS & FIREFLIES
          </h1>
          <div className="flex flex-col gap-4 text-xl md:text-2xl font-bold tracking-wide">
            <button onClick={() => resetGame(GameMode.SOLO)} className="bg-white/10 px-8 py-4 rounded-full border border-white/20 hover:bg-white/20 transition-all flex items-center justify-between gap-8 min-w-[300px]">
              <span style={{ color: COLORS.P1 }}>SOLO PLAY</span>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">PRESS S</span>
            </button>
            <button onClick={() => resetGame(GameMode.VS_AI)} className="bg-white/10 px-8 py-4 rounded-full border border-white/20 hover:bg-white/20 transition-all flex items-center justify-between gap-8 min-w-[300px]">
              <span className="text-cyan-400">VS AI CPU</span>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">PRESS SPACE</span>
            </button>
            <button onClick={() => resetGame(GameMode.PVP)} className="bg-white/10 px-8 py-4 rounded-full border border-white/20 hover:bg-white/20 transition-all flex items-center justify-between gap-8 min-w-[300px]">
              <span style={{ color: COLORS.P2 }}>2 PLAYER VS</span>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">PRESS ENTER</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50">
          <h2 className="text-6xl font-black text-white mb-6">GAME OVER</h2>
          <div className="flex gap-12 text-center mb-12">
            <div>
              <div className="text-xl text-gray-400 mb-2">PLAYER 1</div>
              <div className="text-6xl font-bold" style={{ color: COLORS.P1 }}>{score1}</div>
            </div>
            {gameMode !== GameMode.SOLO && (
              <div>
                <div className="text-xl text-gray-400 mb-2">{gameMode === GameMode.VS_AI ? 'CPU' : 'PLAYER 2'}</div>
                <div className="text-6xl font-bold" style={{ color: COLORS.P2 }}>{score2}</div>
              </div>
            )}
          </div>
          <div className="text-xl animate-pulse text-gray-300">
            PRESS SPACE TO RETURN TO MENU
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
