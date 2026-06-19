import React from 'react';
import { GameResult, Difficulty } from '../types';
import { RotateCcw, Home, Star, ShieldAlert, Sparkles } from 'lucide-react';

interface ResultProps {
  result: GameResult;
  onReplay: () => void;
  onMenu: () => void;
  songTitle: string;
  songArtist: string;
  difficulty: Difficulty;
}

// 潮流 Y2K 紅色十字星
const Y2kRedStar = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="#FF2E55" className={`${className} filter drop-shadow-[0_0_8px_rgba(255,46,85,0.6)]`}>
    <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/>
  </svg>
);

export function Result({ result, onReplay, onMenu, songTitle, songArtist, difficulty }: ResultProps) {
  const totalNotes = result.perfects + result.greats + result.goods + result.misses;
  const accuracyNum = totalNotes > 0 
    ? ((result.perfects + result.greats * 0.8 + result.goods * 0.5) / totalNotes * 100)
    : 0;
  const accuracy = accuracyNum.toFixed(2);

  // 根據準確率計算評級 (S, A, B, C, F)
  let grade = 'F';
  let gradeColor = 'text-[#FF2E55] glow-text-red';
  let comment = '再接再厲！';
  
  if (accuracyNum >= 95) {
    grade = 'S';
    gradeColor = 'text-[#FFAB00] glow-text-red'; // 金黃色
    comment = '簡直神乎其技！真正的節奏高手！';
  } else if (accuracyNum >= 88) {
    grade = 'A';
    gradeColor = 'text-[#00C853] glow-text-green'; // 螢光綠
    comment = '太棒了！無懈可擊的狂熱節奏！';
  } else if (accuracyNum >= 75) {
    grade = 'B';
    gradeColor = 'text-[#00B0FF] glow-text-blue'; // 電光藍
    comment = '不錯的演出！繼續保持律動！';
  } else if (accuracyNum >= 60) {
    grade = 'C';
    gradeColor = 'text-gray-600';
    comment = '演出完成！抓穩拍子可以更好！';
  } else {
    grade = 'F';
    gradeColor = 'text-[#FF2E55] glow-text-red';
    comment = '曲目崩潰... 再多練習看看吧！';
  }

  // 比例條計算
  const getPercent = (val: number) => {
    return totalNotes > 0 ? (val / totalNotes) * 100 : 0;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[640px] p-6 select-none bg-white relative overflow-hidden">
      
      {/* 背景大星星 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <Y2kRedStar className="w-[500px] h-[500px] animate-star-rotate" />
      </div>

      <div className="max-w-xl w-full bg-white p-8 md:p-10 rounded-3xl border-4 border-black text-center y2k-shadow-black relative overflow-hidden glow-border-red">
        
        {/* 四角裝飾星星 */}
        <div className="absolute top-4 left-4 animate-star-pulse">
          <Y2kRedStar className="w-8 h-8" />
        </div>
        <div className="absolute bottom-4 right-4 animate-star-pulse">
          <Y2kRedStar className="w-8 h-8 animate-star-rotate-fast" />
        </div>

        {/* 結算報告標題 */}
        <div className="mb-6">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF2E55] uppercase bg-white px-3 py-1 rounded border border-black y2k-shadow-black">
            SESSION COMPLETE
          </span>
          <h2 className="text-4xl font-black mt-3 text-black uppercase italic skew-x-[-4deg] tracking-tight">
            MADNESS REPORT
          </h2>
        </div>

        {/* 本關卡歌曲卡片 */}
        <div className="bg-white p-4 rounded-xl border-2 border-black y2k-shadow-black mb-8 text-left">
          <div className="text-[9px] font-mono text-gray-500 uppercase">挑戰曲目</div>
          <h3 className="font-black text-lg text-black truncate uppercase">{songTitle}</h3>
          <p className="text-gray-600 text-xs truncate">{songArtist}</p>
          <div className="mt-2 text-[10px] font-mono text-[#00C853] font-bold flex justify-between">
            <span>難度: {difficulty}</span>
            <span>TOTAL NOTES: {totalNotes}</span>
          </div>
        </div>

        {/* 等級評價 & 分數 */}
        <div className="grid grid-cols-2 gap-4 items-center justify-center mb-8 border-b-2 border-black pb-8">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase block">RATING GRADE</span>
            <div className={`text-8xl font-black font-mono leading-none tracking-tighter select-none ${gradeColor}`}>
              {grade}
            </div>
          </div>
          <div className="text-left border-l-2 border-black pl-6">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">TOTAL SCORE</span>
            <div className="text-3xl font-black text-black tracking-tight glow-text-blue">
              {result.score.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 font-mono mt-1">
              ACCURACY: <span className="text-black font-bold">{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* 詳細數據統計 */}
        <div className="space-y-4 mb-8 text-left">
          <div className="flex justify-between items-center text-xs font-mono font-bold">
            <span className="text-gray-700">MAX COMBO 連擊</span>
            <span className="text-[#FF2E55] glow-text-red font-black text-base">{result.maxCombo}</span>
          </div>

          {/* 各項判定數據比例條 */}
          <div className="bg-white p-4 rounded-2xl border-2 border-black space-y-3 shadow-inner">
            {/* Perfect */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-[#FFAB00]">
                <span>MADNESS (PERFECT)</span>
                <span>{result.perfects} ({Math.round(getPercent(result.perfects))}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFAB00] rounded-full" style={{ width: `${getPercent(result.perfects)}%` }}></div>
              </div>
            </div>

            {/* Great */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-[#00C853]">
                <span>SICK (GREAT)</span>
                <span>{result.greats} ({Math.round(getPercent(result.greats))}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#00C853] rounded-full" style={{ width: `${getPercent(result.greats)}%` }}></div>
              </div>
            </div>

            {/* Good */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-[#00B0FF]">
                <span>COOL (GOOD)</span>
                <span>{result.goods} ({Math.round(getPercent(result.goods))}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#00B0FF] rounded-full" style={{ width: `${getPercent(result.goods)}%` }}></div>
              </div>
            </div>

            {/* Miss */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-gray-500">
                <span>RUINED (MISS)</span>
                <span>{result.misses} ({Math.round(getPercent(result.misses))}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400 rounded-full" style={{ width: `${getPercent(result.misses)}%` }}></div>
              </div>
            </div>
          </div>

          {/* 高級短評 */}
          <div className="p-3 bg-[#F3F4F6] rounded-xl border-2 border-black text-center font-bold text-xs text-[#00C853] italic">
            &quot;{comment}&quot;
          </div>
        </div>

        {/* 按鈕控制列 */}
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <button 
            onClick={onReplay}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FF2E55] text-white font-black rounded-xl text-sm uppercase border-2 border-black y2k-shadow-black hover:bg-red-600 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex-1"
          >
            <RotateCcw size={16} />
            重新挑戰
          </button>
          
          <button 
            onClick={onMenu}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black font-black rounded-xl text-sm uppercase border-2 border-black y2k-shadow-black hover:bg-gray-100 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex-1"
          >
            <Home size={16} />
            返回大廳
          </button>
        </div>
      </div>
    </div>
  );
}
