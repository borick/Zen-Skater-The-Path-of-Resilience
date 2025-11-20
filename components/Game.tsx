import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Character, GameState, LevelData, Platform, Coin, Spike } from '../types';
import { GRAVITY, FRICTION, GAME_WIDTH, GAME_HEIGHT, LEVEL_THEMES } from '../constants';
import { generateSkaterWisdom } from '../services/geminiService';
import { audioService } from '../services/audioService';
import { ArrowRight, RefreshCw, Home, Play, Award, Volume2, VolumeX } from 'lucide-react';

interface GameProps {
  level: number;
  character: Character;
  onExit: () => void;
  onLevelComplete: (level: number) => void;
  onRetry: () => void;
}

const Game: React.FC<GameProps> = ({ level, character, onExit, onLevelComplete, onRetry }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState<'none' | 'victory' | 'defeat'>('none');
  const [wisdom, setWisdom] = useState<string>("");
  const [loadingWisdom, setLoadingWisdom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Game State Refs (for high-performance loop)
  const playerRef = useRef({
    x: 50,
    y: 200,
    vx: 0,
    vy: 0,
    width: 30,
    height: 50,
    onGround: false,
    onRail: false,
    isDead: false,
    angle: 0, // Radians
    angularVelocity: 0,
    particles: [] as {x: number, y: number, vx: number, vy: number, life: number, color: string, size: number}[]
  });

  const levelDataRef = useRef<LevelData>({
    id: level,
    platforms: [],
    spikes: [],
    coins: [],
    finishLineX: 0,
    theme: LEVEL_THEMES[level - 1] || "The Unknown"
  });

  const cameraRef = useRef({ x: 0, zoom: 1 });
  const requestRef = useRef<number>(0);
  const speedLinesRef = useRef<number[]>([]);

  // Generate Level Logic - EASIER VERSION
  const generateLevel = useCallback((lvl: number) => {
    const platforms: Platform[] = [];
    const coins: Coin[] = [];
    const spikes: Spike[] = [];
    
    // Start platform
    platforms.push({ x: 0, y: 500, width: 400, height: 100, type: 'ground' });

    let currentX = 400;
    // Gentler scaling
    const difficultyMultiplier = lvl * 0.6; 
    const length = 15 + (lvl * 3); 

    for (let i = 0; i < length; i++) {
      const isRail = Math.random() > 0.85 && lvl > 3; // Rails are rarer early on
      
      // Gaps are smaller
      let gap = 100 + Math.random() * (40 + (difficultyMultiplier * 15));
      if (isRail) gap += 50; 

      // Platforms are wider
      const width = isRail ? 400 + Math.random() * 300 : 300 + Math.random() * 400;
      
      // Height variation is reduced
      const heightChange = (Math.random() - 0.5) * (100 + (difficultyMultiplier * 20));
      let y = 500 + heightChange;
      if (y > 550) y = 550;
      if (y < 200) y = 200;

      platforms.push({ 
        x: currentX + gap, 
        y, 
        width, 
        height: isRail ? 20 : 600 - y, 
        type: isRail ? 'rail' : 'ground' 
      });
      
      // Spikes (Much rarer now)
      if (!isRail && Math.random() > 0.8 && lvl > 3) {
        const spikeWidth = 40;
        spikes.push({
          x: currentX + gap + (width/2) - (spikeWidth/2),
          y: y - 20,
          width: spikeWidth
        });
      }

      // Coins
      if (Math.random() > 0.3) {
        const coinY = isRail ? y - 80 : y - 80 - (Math.random() * 80);
        coins.push({
          x: currentX + gap + width / 2,
          y: coinY,
          collected: false,
          id: Math.random()
        });
      }

      currentX += gap + width;
    }

    // Finish platform
    platforms.push({ x: currentX + 150, y: 450, width: 800, height: 150, type: 'ground' });
    
    levelDataRef.current = {
      id: lvl,
      platforms,
      spikes,
      coins,
      finishLineX: currentX + 300,
      theme: LEVEL_THEMES[lvl - 1] || "The Void"
    };
  }, []);

  // Initialize Level
  useEffect(() => {
    generateLevel(level);
    playerRef.current = {
      x: 50,
      y: 300,
      vx: 0,
      vy: 0,
      width: 30,
      height: 50,
      onGround: false,
      onRail: false,
      isDead: false,
      angle: 0,
      angularVelocity: 0,
      particles: []
    };
    cameraRef.current.x = 0;
    setScore(0);
    setShowModal('none');
    setIsPaused(false);
    setWisdom('');
    
    audioService.startMusic();

    return () => {
      audioService.stopMusic();
    };
  }, [level, generateLevel]);

  const fetchWisdom = async (success: boolean) => {
    setLoadingWisdom(true);
    const text = await generateSkaterWisdom(levelDataRef.current.theme, level, success);
    setWisdom(text);
    setLoadingWisdom(false);
  };

  const handleGameOver = () => {
    if (playerRef.current.isDead) return; 
    playerRef.current.isDead = true;
    audioService.playCrash();
    setShowModal('defeat');
    fetchWisdom(false);
  };

  const handleVictory = () => {
    if (showModal !== 'none') return;
    audioService.playCoin(); 
    setShowModal('victory');
    setIsPaused(true);
    fetchWisdom(true);
    onLevelComplete(level);
  };

  const toggleMute = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  };

  // Game Loop
  const update = useCallback(() => {
    if (isPaused || showModal !== 'none') return;

    const player = playerRef.current;
    const levelData = levelDataRef.current;
    const camera = cameraRef.current;

    // --- PHYSICS ENGINE ---

    // Gravity
    player.vy += GRAVITY;
    
    // Friction
    if (player.onGround) {
      player.vx *= FRICTION;
      // Snap upright on ground
      player.angle = player.angle * 0.6;
    } else if (player.onRail) {
      player.vx *= 0.99; 
      player.angle = 0; 
    } else {
      player.vx *= 0.99; 
    }

    player.x += player.vx;
    player.y += player.vy;
    player.angle += player.angularVelocity;
    
    // Dampen rotation
    player.angularVelocity *= 0.9;

    // Auto-rotate: If in air, visual flair. If close to landing (moving down), straighten up!
    if (!player.onGround && !player.onRail) {
        let targetAngle = 0;
        // If falling fast, lean forward slightly
        if (player.vy > 5) {
           targetAngle = 0.1;
           // Auto-correct significantly to help landing
           player.angle += (targetAngle - player.angle) * 0.15; 
        } else {
           // Jumping up - visual tilt
           targetAngle = (player.vx * 0.02);
           player.angle += (targetAngle - player.angle) * 0.05;
        }
    }

    // Floor collision (Death into void)
    if (player.y > GAME_HEIGHT + 300) {
      handleGameOver();
    }

    // Reset flags
    player.onGround = false;
    player.onRail = false;

    // Platform Collisions
    for (const plat of levelData.platforms) {
      // Horizontal Bounds
      if (player.x + player.width > plat.x && player.x < plat.x + plat.width) {
        // Vertical Bounds (Landing)
        const platY = plat.y;
        
        // Check if feet are close to surface and falling
        if (player.y + player.height >= platY && 
            player.y + player.height <= platY + player.vy + 20 && 
            player.vy >= 0) {
          
          // EASIER: No rotation crash check here. You land it no matter the angle.

          player.y = platY - player.height;
          player.vy = 0;
          player.angularVelocity = 0;
          player.angle = 0; // Snap flat immediately
          
          if (plat.type === 'rail') {
            player.onRail = true;
            audioService.playRail();
            if (Math.abs(player.vx) < 15) player.vx *= 1.05;
            player.particles.push({
                x: player.x + player.width/2,
                y: player.y + player.height,
                vx: -player.vx + (Math.random()-0.5)*5,
                vy: (Math.random() * -5),
                life: 10,
                color: '#facc15',
                size: 3
            });
          } else {
            player.onGround = true;
            audioService.playLand();
          }

          // Landing dust
          if (Math.abs(player.vy) > 2 && !player.onRail) {
             for(let i=0; i<5; i++) {
               player.particles.push({
                 x: player.x + player.width/2,
                 y: player.y + player.height,
                 vx: (Math.random() - 0.5) * 5,
                 vy: (Math.random() * -2),
                 life: 20,
                 color: '#94a3b8',
                 size: Math.random() * 5
               });
             }
          }
        }
      }
    }

    // Spike Collisions
    for (const spike of levelData.spikes) {
      // Hitbox a bit forgiving
      if (
        player.x + player.width - 12 > spike.x && 
        player.x + 12 < spike.x + spike.width &&
        player.y + player.height > spike.y + 15 &&
        player.y < spike.y + 40
      ) {
        handleGameOver();
      }
    }

    // Coin Collection
    levelData.coins.forEach(coin => {
      if (!coin.collected) {
        const dx = (player.x + player.width/2) - coin.x;
        const dy = (player.y + player.height/2) - coin.y;
        if (Math.sqrt(dx*dx + dy*dy) < 50) { // Bigger collection radius
          coin.collected = true;
          setScore(s => s + 50);
          audioService.playCoin();
          for(let i=0; i<12; i++) {
             player.particles.push({
               x: coin.x,
               y: coin.y,
               vx: (Math.random() - 0.5) * 15,
               vy: (Math.random() - 0.5) * 15,
               life: 40,
               color: '#fbbf24',
               size: 4
             });
           }
        }
      }
    });

    // Victory Check
    if (player.x >= levelData.finishLineX) {
      handleVictory();
    }

    // --- CAMERA LOGIC ---
    const targetCamX = player.x - GAME_WIDTH / 4 + (player.vx * 20);
    camera.x += (targetCamX - camera.x) * 0.08; 
    if (camera.x < 0) camera.x = 0;

    const targetZoom = 1 - (Math.min(Math.abs(player.vx), 20) / 150); 
    camera.zoom += (targetZoom - camera.zoom) * 0.1;

    // Speed Lines
    if (Math.abs(player.vx) > 12 && Math.random() > 0.7) {
        speedLinesRef.current.push(GAME_WIDTH + Math.random() * 200);
    }

    // Update Particles
    for (let i = player.particles.length - 1; i >= 0; i--) {
      const p = player.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) player.particles.splice(i, 1);
    }

  }, [isPaused, showModal, onLevelComplete, level]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = playerRef.current;
    const camera = cameraRef.current;

    // Clear
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // --- BACKGROUND ---
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#0f172a'); 
    gradient.addColorStop(1, '#1e293b'); 
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Parallax
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for(let i=0; i<50; i++) {
      const x = (i * 113) - (camera.x * 0.05) % GAME_WIDTH;
      const y = (i * 29) % 400;
      let drawX = x;
      if (drawX < 0) drawX += GAME_WIDTH;
      ctx.fillRect(drawX, y, 2, 2);
    }
    
    ctx.fillStyle = '#1e1b4b'; 
    for(let i=0; i<15; i++) {
      const x = (i * 150) - (camera.x * 0.2) % 2400;
      let drawX = x; 
      if (drawX < -200) drawX += 2400; 
      const h = 200 + (i%5)*60;
      ctx.fillRect(drawX, GAME_HEIGHT - h - 50, 160, h + 100);
    }
    ctx.restore();

    // --- WORLD TRANSFORM ---
    ctx.save();
    let shakeY = 0;
    if (player.onGround && Math.abs(player.vx) > 12) {
        shakeY = (Math.random() - 0.5) * 2;
    }
    ctx.translate(-camera.x, shakeY);

    // Spikes
    levelDataRef.current.spikes.forEach(spike => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(spike.x, spike.y + 40);
      ctx.lineTo(spike.x + spike.width/2, spike.y);
      ctx.lineTo(spike.x + spike.width, spike.y + 40);
      ctx.fill();
    });

    // Platforms
    levelDataRef.current.platforms.forEach(plat => {
      if (plat.type === 'rail') {
        ctx.fillStyle = '#f59e0b'; 
        ctx.fillRect(plat.x, plat.y, plat.width, 10);
        ctx.fillStyle = '#475569';
        for(let i=20; i<plat.width; i+=100) {
             ctx.fillRect(plat.x + i, plat.y + 10, 10, 300);
        }
      } else {
        ctx.fillStyle = '#334155'; 
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#94a3b8'; 
        ctx.fillRect(plat.x, plat.y, plat.width, 15);
        
        if (plat.width > 300 && plat.id !== 999) { 
           ctx.fillStyle = 'rgba(255,255,255,0.1)';
           ctx.font = '30px "Permanent Marker"';
           ctx.save();
           ctx.translate(plat.x + 100, plat.y + 80);
           ctx.rotate(-0.1);
           ctx.fillText("SKATE", 0, 0);
           ctx.restore();
        }
      }
    });

    // Coins
    const coinOffset = Math.sin(Date.now() / 200) * 5;
    levelDataRef.current.coins.forEach(coin => {
      if (!coin.collected) {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y + coinOffset, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', coin.x, coin.y + coinOffset + 1);
      }
    });

    // Finish
    const finishX = levelDataRef.current.finishLineX;
    ctx.save();
    ctx.translate(finishX, 300);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(0, 0, 10, 300);
    ctx.fillRect(200, 0, 10, 300);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.fillRect(10, 20, 190, 60);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px "Permanent Marker"';
    ctx.fillText("FINISH", 50, 60);
    ctx.restore();

    // --- DRAW PLAYER ---
    ctx.save();
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    ctx.translate(px, py);
    ctx.rotate(player.angle);

    // Ghost Trail
    if (Math.abs(player.vx) > 12) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(-20, 0, 15, 0, Math.PI*2); 
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // Board
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(-25, 20, 50, 8, 4);
    ctx.fill();
    
    // Wheels
    const wheelOffset = (player.x / 5) % (Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-18, 28, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.beginPath(); 
    ctx.moveTo(-18, 28); ctx.lineTo(-18 + Math.cos(wheelOffset)*6, 28 + Math.sin(wheelOffset)*6); ctx.stroke();
    ctx.beginPath(); ctx.arc(18, 28, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, 28); ctx.lineTo(18 + Math.cos(wheelOffset)*6, 28 + Math.sin(wheelOffset)*6); ctx.stroke();

    // Legs
    ctx.fillStyle = '#1e293b'; 
    ctx.beginPath();
    if (player.onGround || player.onRail) {
        ctx.moveTo(-10, 20); ctx.lineTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(10, 20);
    } else {
        ctx.moveTo(-10, 20); ctx.lineTo(-8, 5); ctx.lineTo(12, -5); ctx.lineTo(15, 15);
    }
    ctx.fill();

    // Body
    ctx.fillStyle = character.color; 
    ctx.beginPath();
    ctx.arc(0, -10, 14, 0, Math.PI*2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fbbf24'; 
    ctx.beginPath(); ctx.arc(2, -28, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(2, -30, 9, Math.PI, 0); ctx.lineTo(-8, -28); ctx.fill();

    ctx.restore();

    // Particles
    player.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.restore(); 

    // Speed Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    speedLinesRef.current.forEach((x, i) => {
        speedLinesRef.current[i] -= (player.vx * 2 + 20); 
        ctx.beginPath();
        ctx.moveTo(speedLinesRef.current[i], Math.random() * GAME_HEIGHT);
        ctx.lineTo(speedLinesRef.current[i] + 100, Math.random() * GAME_HEIGHT); 
        ctx.stroke();
    });
    speedLinesRef.current = speedLinesRef.current.filter(x => x > -200);

  }, [character.color]);

  // Animation Loop
  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  // Input Handling
  useEffect(() => {
    const keys: Record<string, boolean> = {};
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      const player = playerRef.current;
      
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (player.onGround || player.onRail) {
          player.vy = -character.jumpForce;
          player.onGround = false;
          player.onRail = false;
          audioService.playJump();
          player.angularVelocity = -0.15;
          for(let i=0; i<8; i++) {
             player.particles.push({
               x: player.x + player.width/2,
               y: player.y + player.height,
               vx: (Math.random() - 0.5) * 6,
               vy: (Math.random() * 3),
               life: 20,
               color: '#cbd5e1',
               size: 4
             });
          }
        }
      }

      if (e.code === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const moveInterval = setInterval(() => {
      if (isPaused || showModal !== 'none') return;
      const player = playerRef.current;
      const accel = player.onGround ? 1.2 : 0.6; // Slower accel for easier control

      if (keys['ArrowRight'] || keys['KeyD']) {
        player.vx += accel;
        if (!player.onGround && !player.onRail) player.angularVelocity += 0.02;
      }
      if (keys['ArrowLeft'] || keys['KeyA']) {
        player.vx -= accel;
        if (!player.onGround && !player.onRail) player.angularVelocity -= 0.02;
      }
      
      const maxSpeed = player.onRail ? character.speed * 1.5 : character.speed;
      if (player.vx > maxSpeed) player.vx = maxSpeed;
      if (player.vx < -maxSpeed) player.vx = -maxSpeed;

    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(moveInterval);
    };
  }, [character.jumpForce, character.speed, isPaused, showModal]);


  return (
    <div className="relative w-full h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900 to-black z-0 pointer-events-none"></div>

      <div className="relative z-10 border-4 border-gray-800 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-100">
        <canvas 
          ref={canvasRef} 
          width={GAME_WIDTH} 
          height={GAME_HEIGHT} 
          className="bg-slate-900"
        />
        
        <div className="absolute top-4 left-4 right-4 flex justify-between text-white font-bold text-xl drop-shadow-md pointer-events-none">
          <div className="flex gap-4">
            <div className="bg-black/60 px-4 py-2 rounded-lg border-l-4 border-blue-500 backdrop-blur-sm">
              LEVEL {level}
            </div>
            <div className="bg-black/60 px-4 py-2 rounded-lg border-l-4 border-yellow-500 backdrop-blur-sm text-yellow-400">
              SCORE: {score}
            </div>
          </div>
          
          <button 
            onClick={toggleMute} 
            className="pointer-events-auto bg-black/60 p-2 rounded-full hover:bg-black/80 transition"
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>

        {/* Physics Hint - Updated */}
        {level === 1 && score === 0 && (
           <div className="absolute top-24 left-0 w-full text-center pointer-events-none animate-pulse">
             <span className="bg-black/50 text-white px-4 py-1 rounded text-sm">Use Arrows to Move & Space to Jump</span>
           </div>
        )}

        {isPaused && showModal === 'none' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
            <h2 className="text-6xl marker-font mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">PAUSED</h2>
            <div className="flex flex-col gap-4 w-48">
              <button onClick={() => setIsPaused(false)} className="bg-white text-black font-bold py-2 rounded hover:scale-105 transition">RESUME</button>
              <button onClick={onExit} className="border border-white/30 text-white py-2 rounded hover:bg-white/10 transition">EXIT</button>
            </div>
          </div>
        )}

        {showModal === 'defeat' && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in z-50">
            <h2 className="text-6xl marker-font mb-2 text-red-500 transform -rotate-2">WIPEOUT</h2>
            <div className="h-px w-32 bg-red-500/50 my-4"></div>
            <p className="text-2xl mb-8 italic text-gray-300 font-light max-w-lg leading-relaxed">
              {loadingWisdom ? "Consulting the Skate Gods..." : `"${wisdom}"`}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={onRetry}
                className="flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-500 hover:scale-105 transition shadow-lg shadow-red-900/50"
              >
                <RefreshCw size={20} /> TRY AGAIN
              </button>
              <button 
                onClick={onExit}
                className="flex items-center gap-2 bg-black/40 text-white px-6 py-3 rounded-full font-bold hover:bg-black/60 transition"
              >
                <Home size={20} /> MENU
              </button>
            </div>
          </div>
        )}

        {showModal === 'victory' && (
          <div className="absolute inset-0 bg-indigo-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in z-50">
            <div className="relative">
              <div className="absolute -inset-4 bg-yellow-500 blur-xl opacity-20 animate-pulse"></div>
              <Award size={80} className="text-yellow-400 mb-6 relative z-10" />
            </div>
            
            <h2 className="text-5xl marker-font mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600">
              LEVEL CLEARED
            </h2>
            
            <div className="bg-black/30 p-8 rounded-2xl border border-indigo-500/30 max-w-xl my-4 backdrop-blur-sm">
              <h3 className="text-xs uppercase tracking-[0.2em] text-indigo-300 mb-4">ZEN MASTER SAYS</h3>
              <p className="text-2xl font-serif italic leading-relaxed text-indigo-100">
                {loadingWisdom ? "Meditating on your success..." : `"${wisdom}"`}
              </p>
            </div>

            <div className="flex gap-4 mt-4">
              {level < 10 ? (
                <button 
                  onClick={() => onLevelComplete(level)}
                  className="flex items-center gap-2 bg-yellow-500 text-black px-10 py-4 rounded-full font-black tracking-wider hover:bg-yellow-400 hover:scale-105 transition shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                >
                  <Play size={24} fill="black" /> NEXT LEVEL
                </button>
              ) : (
                <div className="text-yellow-200 font-bold text-2xl animate-pulse">YOU ARE THE ONE.</div>
              )}
              <button 
                onClick={onExit}
                className="flex items-center gap-2 bg-white/10 text-white px-6 py-4 rounded-full font-bold hover:bg-white/20 transition"
              >
                <Home size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;