import React, { useEffect, useRef, useState } from 'react';
import { Note, GameResult, Difficulty } from '../types';
import { Play, Sparkles } from 'lucide-react';

const TARGET_Y = 120; // 判定線的 Y 座標 (稍為往下留空)
const NOTE_SPEED = 480; // 像素/秒
const HIT_WINDOW = 0.15; // 判定時間差 (秒)

const COLUMNS = 4;
const COLUMN_WIDTH = 72;  // 稍微加寬
const COLUMN_SPACING = 16;

const KEY_MAP = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];

// 2K Madness 配色：粉紅、藍、黃、綠
const TRACK_COLORS = ['#FF2E55', '#00F0FF', '#FFFF00', '#39FF14'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 1.0 down to 0.0
}

interface GameProps {
  audioUrl: string;
  beatmap: Note[];
  onComplete: (result: GameResult) => void;
  songTitle: string;
  songArtist: string;
  difficulty: Difficulty;
}

export function Game({ audioUrl, beatmap, onComplete, songTitle, songArtist, difficulty }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [madnessPercent, setMadnessPercent] = useState(0);
  const [isMadnessActive, setIsMadnessActive] = useState(false);
  
  const gameState = useRef({
    notes: JSON.parse(JSON.stringify(beatmap)) as Note[],
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    greats: 0,
    goods: 0,
    misses: 0,
    multiplier: 1,
    keysPressed: [false, false, false, false],
    lastHitText: '',
    lastHitTime: 0,
    lastHitColor: '#FFF',
    
    // 狂熱模式 (Madness Mode) 引擎
    madnessGauge: 0, // 0 to 100
    madnessTimer: 0, // 剩餘狂熱秒數 (秒)
    
    // 粒子系統
    particles: [] as Particle[],
  });

  // 繪製 Y2K 十字星
  const drawY2kStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    // 四角星：上 -> 右 -> 下 -> 左，中繼點內縮
    ctx.lineTo(cx + r * 0.25, cy - r * 0.25);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx + r * 0.25, cy + r * 0.25);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.25, cy + r * 0.25);
    ctx.lineTo(cx - r, cy);
    ctx.lineTo(cx - r * 0.25, cy - r * 0.25);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  // 生成擊中粒子
  const spawnHitParticles = (x: number, y: number, color: string) => {
    const num = 12;
    for (let i = 0; i < num; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      gameState.current.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // 偏向上噴灑
        size: 6 + Math.random() * 8,
        color: color,
        life: 1.0
      });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // 準備期 2 秒後播放
    const timer = setTimeout(() => {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }, 2000);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        if (!gameState.current.keysPressed[col]) {
          gameState.current.keysPressed[col] = true;
          if (!audio.paused) {
            handleHit(col, audio.currentTime);
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        gameState.current.keysPressed[col] = false;
      }
    };
    
    const activeTouches = new Map<number, { startX: number, startY: number, triggered: boolean }>();

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.set(touch.identifier, {
          startX: touch.clientX,
          startY: touch.clientY,
          triggered: false
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!audio || audio.paused) return;
      const SWIPE_THRESHOLD = 30;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchData = activeTouches.get(touch.identifier);
        
        if (touchData && !touchData.triggered) {
          const deltaX = touch.clientX - touchData.startX;
          const deltaY = touch.clientY - touchData.startY;
          
          if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD) {
            touchData.triggered = true;
            let col = -1;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX < 0) col = 0; // Left
              else col = 3; // Right
            } else {
              if (deltaY > 0) col = 1; // Down
              else col = 2; // Up
            }
            
            if (col !== -1) {
              gameState.current.keysPressed[col] = true;
              setTimeout(() => {
                gameState.current.keysPressed[col] = false;
              }, 150);
              
              handleHit(col, audio.currentTime);
            }
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.delete(touch.identifier);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    
    let lastFrameTime = performance.now();
    let animationFrameId: number;
    
    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      const now = performance.now();
      const dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      
      const currentTime = audio.currentTime;
      const START_X = (canvas.width - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
      
      // 更新狂熱模式計時器
      const state = gameState.current;
      if (state.madnessTimer > 0) {
        state.madnessTimer = Math.max(state.madnessTimer - dt, 0);
        state.madnessGauge = (state.madnessTimer / 8) * 100;
        if (state.madnessTimer === 0) {
          setIsMadnessActive(false);
        }
      }
      setMadnessPercent(Math.round(state.madnessGauge));

      // 1. 清空畫布
      ctx.fillStyle = '#FFFFFF'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Madness Mode 專屬背景閃爍特效
      const isMadness = state.madnessTimer > 0;
      if (isMadness) {
        // 每秒閃爍偏光感
        const pulse = Math.sin(now / 150) * 0.05 + 0.05;
        ctx.fillStyle = `rgba(255, 46, 85, ${pulse})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 畫霓虹射線背景
        ctx.strokeStyle = 'rgba(0, 176, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 80) {
          ctx.moveTo(x + Math.sin(now / 500) * 20, 0);
          ctx.lineTo(x - Math.sin(now / 500) * 20, canvas.height);
        }
        ctx.stroke();
      } else {
        // 普通網格背景
        ctx.strokeStyle = 'rgba(255, 46, 85, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }
      
      // 2. 繪製 4 條軌道背景
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        
        // 軌道背景漸層 (亮灰色系)
        const grad = ctx.createLinearGradient(x, 0, x + COLUMN_WIDTH, 0);
        grad.addColorStop(0, isMadness ? 'rgba(255, 46, 85, 0.08)' : '#F3F4F6');
        grad.addColorStop(0.5, isMadness ? 'rgba(255, 46, 85, 0.04)' : '#F9FAFB');
        grad.addColorStop(1, isMadness ? 'rgba(255, 46, 85, 0.08)' : '#F3F4F6');
        
        ctx.fillStyle = grad; 
        ctx.fillRect(x, 0, COLUMN_WIDTH, canvas.height);
        
        // 邊框線
        ctx.strokeStyle = isMadness ? TRACK_COLORS[i] : '#E5E7EB';
        ctx.lineWidth = isMadness ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.moveTo(x + COLUMN_WIDTH, 0);
        ctx.lineTo(x + COLUMN_WIDTH, canvas.height);
        ctx.stroke();
      }
      
      // 3. 繪製判定線與目標判定點 (Targets)
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        const isPressed = state.keysPressed[i];
        
        // 外框發光
        if (isPressed || isMadness) {
          ctx.shadowColor = TRACK_COLORS[i];
          ctx.shadowBlur = isPressed ? 18 : 6;
        }
        
        ctx.fillStyle = isPressed ? TRACK_COLORS[i] : '#FFFFFF';
        ctx.strokeStyle = isPressed ? '#000000' : (isMadness ? TRACK_COLORS[i] : '#000000');
        ctx.lineWidth = isPressed ? 4 : 2;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH, 14);
        } else {
          ctx.rect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH);
        }
        ctx.fill();
        ctx.stroke();
        
        // 關閉 shadow
        ctx.shadowBlur = 0;
        
        // 目標提示字 (方向鍵)
        ctx.fillStyle = isPressed ? '#000000' : '#888888';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hint = ['←', '↓', '↑', '→'][i];
        ctx.fillText(hint, x + COLUMN_WIDTH / 2, TARGET_Y + COLUMN_WIDTH / 2 + 1);
      }
      
      // 4. 繪製音符 (Notes) - 發光的 Y2K 紅色十字星 (白底音符框)
      for (const note of state.notes) {
        if (note.hit || note.missed) continue;
        
        const y = TARGET_Y + (note.time - currentTime) * NOTE_SPEED;
        
        // 超過判定視窗判定為失誤
        if (currentTime - note.time > HIT_WINDOW) {
          note.missed = true;
          state.combo = 0;
          state.multiplier = 1;
          state.misses++;
          state.lastHitText = 'RUINED...';
          state.lastHitColor = '#7F8C8D';
          state.lastHitTime = performance.now();
          
          // 狂熱條扣減
          state.madnessGauge = Math.max(state.madnessGauge - 15, 0);
          continue;
        }
        
        // 僅繪製在螢幕可視區內的 Note
        if (y > -COLUMN_WIDTH && y < canvas.height) {
          const x = START_X + note.column * (COLUMN_WIDTH + COLUMN_SPACING);
          const cx = x + COLUMN_WIDTH / 2;
          const cy = y + COLUMN_WIDTH / 2;
          
          ctx.save();
          // 音符外發光
          ctx.shadowColor = '#FF2E55';
          ctx.shadowBlur = 10;
          
          // 音符圓角背景框
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#FF2E55';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, COLUMN_WIDTH, COLUMN_WIDTH, 14);
          } else {
            ctx.rect(x, y, COLUMN_WIDTH, COLUMN_WIDTH);
          }
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // 音符中央繪製紅色 Y2K 十字星
          drawY2kStar(ctx, cx, cy, 20, '#FF2E55');
          
          // 畫星星內圈亮白，提升立體感
          drawY2kStar(ctx, cx, cy, 8, '#FFF');
          ctx.restore();
        }
      }
      
      // 5. 更新並繪製擊中粒子系統 (Particles)
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // 重力
        p.life -= dt * 2.2; // 粒子生命衰減速率
        
        if (p.life <= 0) {
          state.particles.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = p.life;
        // 粒子為迷你四角星
        drawY2kStar(ctx, p.x, p.y, p.size * p.life, p.color);
        ctx.restore();
      }
      
      // 6. 繪製 Hit 判定文字評級 (大膽 Y2K 塗鴉風格)
      if (performance.now() - state.lastHitTime < 500) {
        const elapsed = performance.now() - state.lastHitTime;
        const scale = 1.2 - (elapsed / 500) * 0.2; // 縮小淡出
        const alpha = 1.0 - (elapsed / 500);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = state.lastHitColor;
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = state.lastHitColor;
        ctx.font = 'black 54px Arial Black, Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.translate(canvas.width / 2, TARGET_Y + 220);
        ctx.scale(scale, scale);
        // 稍微歪斜提升瘋狂街頭感
        ctx.transform(1, 0, -0.1, 1, 0, 0); 
        
        ctx.fillText(state.lastHitText, 0, 0);
        
        // 加上黑邊框
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(state.lastHitText, 0, 0);
        
        ctx.restore();
      }
      
      // 7. 繪製準備開始 Countdown
      if (!isPlaying) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 大星星旋轉
        ctx.save();
        ctx.globalAlpha = 0.3;
        drawY2kStar(ctx, canvas.width / 2, canvas.height / 2 - 40, 160, '#FF2E55');
        ctx.restore();
        
        ctx.fillStyle = '#FF2E55';
        ctx.font = 'black 48px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GET READY!', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('跟隨音樂節拍點擊方向鍵', canvas.width / 2, canvas.height / 2 + 30);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  const handleHit = (col: number, currentTime: number) => {
    const state = gameState.current;
    
    let closestNote: Note | null = null;
    let minDiff = HIT_WINDOW;
    
    for (const note of state.notes) {
      if (note.column === col && !note.hit && !note.missed) {
        const diff = Math.abs(note.time - currentTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = note;
        }
      }
    }
    
    if (closestNote) {
      closestNote.hit = true;
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      
      // 計算倍率
      if (state.combo >= 50) state.multiplier = 4;
      else if (state.combo >= 20) state.multiplier = 3;
      else if (state.combo >= 10) state.multiplier = 2;
      else state.multiplier = 1;
      
      // 判定評級
      let points = 0;
      let hitRating = 'COOL!';
      let hitColor = '#00F0FF';
      let addGauge = 2;
      
      if (minDiff < 0.05) {
        points = 300;
        state.perfects++;
        hitRating = 'MADNESS!';
        hitColor = '#FFFF00'; // 黃色發光
        addGauge = 10; // 狂熱值大增
      } else if (minDiff < 0.10) {
        points = 150;
        state.greats++;
        hitRating = 'SICK!';
        hitColor = '#39FF14'; // 綠色
        addGauge = 6;
      } else {
        points = 50;
        state.goods++;
        hitRating = 'COOL!';
        hitColor = '#00F0FF'; // 藍色
        addGauge = 3;
      }
      
      // 狂熱條增長 (如果沒滿且不在狂熱狀態中)
      if (state.madnessTimer === 0) {
        state.madnessGauge = Math.min(state.madnessGauge + addGauge, 100);
        
        // 蓄滿 100，爆發狂熱模式！
        if (state.madnessGauge >= 100) {
          state.madnessTimer = 8.0; // 持續 8 秒
          setIsMadnessActive(true);
          // 生成大量金色粒子慶祝
          const START_X = (800 - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
          const hitX = START_X + col * (COLUMN_WIDTH + COLUMN_SPACING) + COLUMN_WIDTH / 2;
          spawnHitParticles(hitX, TARGET_Y + COLUMN_WIDTH / 2, '#FFFF00');
        }
      }
      
      // 狂熱雙倍得分
      const actualMultiplier = state.madnessTimer > 0 ? state.multiplier * 2 : state.multiplier;
      state.score += points * actualMultiplier;
      
      state.lastHitText = hitRating;
      state.lastHitColor = hitColor;
      state.lastHitTime = performance.now();
      
      // 生成撞擊碎片粒子
      const START_X = (800 - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
      const hitX = START_X + col * (COLUMN_WIDTH + COLUMN_SPACING) + COLUMN_WIDTH / 2;
      spawnHitParticles(hitX, TARGET_Y + COLUMN_WIDTH / 2, hitColor);
    }
  };

  const handleAudioEnded = () => {
    const state = gameState.current;
    onComplete({
      score: state.score,
      combo: state.combo,
      maxCombo: state.maxCombo,
      perfects: state.perfects,
      greats: state.greats,
      goods: state.goods,
      misses: state.misses,
    });
  };

  const currentMultiplier = isMadnessActive 
    ? gameState.current.multiplier * 2 
    : gameState.current.multiplier;

  return (
    <div className="flex flex-col md:flex-row items-stretch justify-center bg-white min-h-[640px] text-black w-full select-none overflow-hidden relative">
      <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} />
      
      {/* 遊戲 Canvas 控制區 */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={680} // 稍加高度
          className="border-4 border-black rounded-2xl shadow-2xl bg-white max-w-full h-auto max-h-[80vh] glow-border-red" 
        />
      </div>
      
      {/* 右側 Y2K 街頭儀表板面板 */}
      <div className="w-full md:w-64 bg-white border-t-4 md:border-t-0 md:border-l-4 border-black p-6 flex flex-col justify-between relative z-10 text-black">
        
        {/* 紅色背景裝飾星 */}
        <div className="absolute top-4 right-4 animate-star-pulse">
          <svg viewBox="0 0 24 24" fill="#FF2E55" className="w-8 h-8">
            <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/>
          </svg>
        </div>

        <div className="space-y-6 text-left">
          {/* 當前歌曲卡片 */}
          <div className="bg-white p-4 rounded-xl border-2 border-black y2k-shadow-black">
            <div className="text-[9px] font-mono text-[#FF2E55] uppercase tracking-widest mb-1">正在播放音軌</div>
            <h4 className="font-black text-sm uppercase text-black truncate">{songTitle}</h4>
            <p className="text-gray-600 text-xs truncate">{songArtist}</p>
            <div className="mt-2 text-[10px] font-mono font-bold text-gray-500 uppercase flex justify-between">
              <span>難度: {difficulty}</span>
              <span className="text-[#00C853]">LOCAL</span>
            </div>
          </div>

          {/* 分數 / Combo 儀表 */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">SCORE 分數</span>
              <div className="text-3xl font-black text-black tracking-tighter glow-text-blue">
                {gameState.current.score.toLocaleString()}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">COMBO 連擊</span>
                <div className="text-2xl font-black text-[#FF2E55] tracking-tight glow-text-red">
                  {gameState.current.combo}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">MULTIPLIER</span>
                <div className="text-2xl font-black text-[#FFAB00] flex items-center gap-1">
                  x{currentMultiplier}
                  {isMadnessActive && <Sparkles size={16} className="text-[#FF2E55] animate-pulse" />}
                </div>
              </div>
            </div>
          </div>

          {/* MADNESS 狂熱計量器 */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-mono font-black tracking-widest text-[#FF2E55] uppercase flex items-center gap-1">
                MADNESS ENERGY
              </span>
              <span className={`text-[10px] font-mono font-bold ${isMadnessActive ? 'text-[#FF2E55] animate-pulse' : 'text-gray-500'}`}>
                {isMadnessActive ? 'MADNESS ACTIVE' : `${madnessPercent}%`}
              </span>
            </div>
            
            <div className="h-6 bg-white border-2 border-black rounded-lg overflow-hidden p-0.5 relative">
              <div 
                className={`h-full rounded-md transition-all duration-100 ${
                  isMadnessActive 
                    ? 'bg-gradient-to-r from-[#FF2E55] via-[#FFAB00] to-[#00C853] animate-pulse' 
                    : 'bg-[#FF2E55]'
                }`}
                style={{ width: `${madnessPercent}%` }}
              ></div>
              {/* 斑馬格線背景 overlay */}
              <div className="absolute inset-0 bg-black/10 y2k-noise pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* 底部操作指南 */}
        <div className="mt-8 text-xs text-gray-600 font-mono border-t border-black pt-4 text-left">
          <p className="font-bold text-[#00C853] uppercase mb-1">提示：</p>
          <p className="hidden md:block leading-relaxed">請使用鍵盤 <span className="text-black font-bold">← ↓ ↑ →</span> 方向鍵精準點擊。</p>
          <p className="md:hidden leading-relaxed">請在畫面中左右上下滑動觸控遊玩。</p>
          
          {isMadnessActive && (
            <div className="mt-3 px-3 py-2 bg-gradient-to-br from-[#FF2E55]/10 to-transparent border border-[#FF2E55] rounded-lg text-[#FF2E55] font-bold text-center animate-pulse">
              🔥 狂熱加倍：所有擊中分數 2X 加成！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
