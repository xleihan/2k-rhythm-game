import React, { useState, useEffect } from 'react';
import { Menu } from './components/Menu';
import { Game } from './components/Game';
import { Result } from './components/Result';
import { Note, GameResult, Difficulty } from './types';
import { LibrarySong, loadLibrarySongs } from './game/songs';
import { generateBeatmap } from './game/beatDetector';

type AppState = 'menu' | 'loading' | 'playing' | 'result';

export default function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [selectedSong, setSelectedSong] = useState<LibrarySong | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [beatmap, setBeatmap] = useState<Note[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('初始化中...');

  // 元件載入時讀取本地歌曲清單
  useEffect(() => {
    async function initSongs() {
      try {
        const list = await loadLibrarySongs();
        setSongs(list);
      } catch (err) {
        console.error("載入本機歌曲庫失敗:", err);
        setErrorMsg("載入本機歌曲清單失敗，請確認是否已生成 songs.json。");
      }
    }
    initSongs();
  }, []);

  /**
   * 選擇內建歌曲遊玩
   */
  const handleSelectLibrarySong = async (song: LibrarySong, selectedDiff: Difficulty) => {
    console.info("handleSelectLibrarySong called", { songId: song.id, songTitle: song.title, diff: selectedDiff });
    setSelectedSong(song);
    setDifficulty(selectedDiff);
    setAppState('loading');
    setErrorMsg(null);

    try {
      setLoadingStep('正在讀取本機音軌檔案...');
      const response = await fetch(song.audioUrl);
      if (!response.ok) {
        throw new Error(`無法載入音訊檔案: ${response.statusText}`);
      }
      
      setLoadingStep('正在載入二進位數據 (PCM)...');
      const arrayBuffer = await response.arrayBuffer();
      
      setLoadingStep('正在初始化音訊解密器...');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      setLoadingStep('正在分析音軌波形能量 (Onset)...');
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      setLoadingStep('正在演算自動生成節奏譜面...');
      const generatedBeatmap = generateBeatmap(audioBuffer, selectedDiff);
      
      if (generatedBeatmap.length === 0) {
        throw new Error("本機音訊分析失敗，無法產生有效節奏點。");
      }

      setAudioUrl(song.audioUrl);
      // 過濾掉前 3 秒以內（符合原本遊戲邏輯）
      const filteredBeatmap = generatedBeatmap.filter(n => n.time >= 3);
      setBeatmap(filteredBeatmap);
      
      setLoadingStep('載入完成！準備開啟狂熱模式...');
      setTimeout(() => {
        setAppState('playing');
      }, 800);
      
    } catch (error) {
      console.error("Error loading library song:", error);
      setErrorMsg('解析音訊失敗: ' + (error as Error).message);
      setAppState('menu');
    }
  };

  /**
   * 選擇自訂上傳歌曲遊玩
   */
  const handleSelectCustomSong = async (file: File, selectedDiff: Difficulty) => {
    console.info("handleSelectCustomSong called", { fileName: file.name, diff: selectedDiff });
    
    // 如果有先前的自訂歌曲 URL，先釋放以防洩漏
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    const customSongName = file.name.replace(/\.[^/.]+$/, ""); // 去掉副檔名

    const customSong: LibrarySong = {
      id: 'custom-' + Date.now(),
      index: 'CUSTOM',
      title: customSongName,
      artist: '自訂上傳歌曲',
      audioUrl: objectUrl,
      fileName: file.name,
      defaultDifficulty: selectedDiff
    };

    setSelectedSong(customSong);
    setDifficulty(selectedDiff);
    setAppState('loading');
    setErrorMsg(null);

    try {
      setLoadingStep('正在讀取上傳音軌檔案...');
      const arrayBuffer = await file.arrayBuffer();
      
      setLoadingStep('正在初始化音訊解密器...');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      setLoadingStep('正在分析音軌波形能量 (Onset)...');
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      setLoadingStep('正在演算自動生成節奏譜面...');
      const generatedBeatmap = generateBeatmap(audioBuffer, selectedDiff);
      
      if (generatedBeatmap.length === 0) {
        throw new Error("自訂音訊分析失敗，無法產生有效節奏點。");
      }

      setAudioUrl(objectUrl);
      // 過濾掉前 3 秒以內（符合原本遊戲邏輯）
      const filteredBeatmap = generatedBeatmap.filter(n => n.time >= 3);
      setBeatmap(filteredBeatmap);
      
      setLoadingStep('分析完成！準備開啟狂熱模式...');
      setTimeout(() => {
        setAppState('playing');
      }, 800);
      
    } catch (error) {
      console.error("Error processing custom song:", error);
      setErrorMsg('解析自訂音訊失敗: ' + (error as Error).message);
      // 如果失敗，釋放剛剛建立的 URL
      URL.revokeObjectURL(objectUrl);
      setAppState('menu');
    }
  };

  /**
   * 遊戲完成時處理
   */
  const handleGameComplete = (result: GameResult) => {
    console.info("handleGameComplete called", { result });
    setGameResult({
      ...result,
      beatmap: beatmap
    });
    setAppState('result');
  };

  /**
   * 重新遊玩
   */
  const handleReplay = () => {
    console.info("handleReplay called");
    const resetBeatmap = beatmap.map(note => ({ ...note, hit: false, missed: false }));
    setBeatmap(resetBeatmap);
    setGameResult(null);
    setAppState('playing');
  };

  /**
   * 返回主選單
   */
  const handleRestart = () => {
    console.info("handleRestart called");
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAppState('menu');
    setAudioUrl(null);
    setBeatmap([]);
    setGameResult(null);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] y2k-grid-bg text-black flex items-center justify-center p-4 md:p-8 crt-scanlines">
      {/* 賽博空間 perspective 網格 */}
      <div className="y2k-perspective-grid"></div>
      
      {/* macOS 視窗外框 */}
      <div className="relative w-full max-w-6xl bg-white border-4 border-black rounded-2xl overflow-hidden y2k-shadow-red z-10 flex flex-col glow-border-red">
        {/* macOS Traffic Lights 標題欄 */}
        <div className="mac-title-bar px-4 py-3 flex items-center justify-between z-20 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-sm inline-block"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-sm inline-block"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-sm inline-block"></span>
          </div>
          <div className="text-xs font-mono font-bold tracking-widest text-[#111827] flex items-center gap-2">
            <span className="text-[#FF2E55] animate-pulse">★</span>
            2K-RHYTHM-MASTER.app
            <span className="text-[#FF2E55] animate-pulse">★</span>
          </div>
          <div className="w-16"></div> {/* 排版平衡 */}
        </div>

        {/* 主視窗容器 */}
        <div className="flex-1 bg-white overflow-y-auto no-scrollbar relative min-h-[640px] max-h-[85vh]">
          {appState === 'menu' && (
            <Menu 
              songs={songs} 
              onSelectLibrarySong={handleSelectLibrarySong} 
              onSelectCustomSong={handleSelectCustomSong}
              errorMsg={errorMsg} 
            />
          )}
          
          {appState === 'loading' && (
            <div className="flex flex-col items-center justify-center min-h-[640px] p-8 text-center bg-white relative overflow-hidden select-none">
              {/* 大十字星背景 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <svg viewBox="0 0 24 24" fill="#FF2E55" className="w-96 h-96 animate-star-rotate">
                  <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/>
                </svg>
              </div>

              <div className="relative z-10 space-y-10 max-w-sm w-full">
                {/* 提取的 Logo 圖片 */}
                <div className="relative inline-block mx-auto border-4 border-black y2k-shadow-black rounded-2xl overflow-hidden glow-border-red bg-white p-2 max-w-[220px]">
                  <img src="logo.jpg" alt="Logo" className="w-full h-auto rounded-lg" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 text-[#FF2E55] animate-star-pulse">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/>
                    </svg>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-black tracking-widest text-[#FF2E55] uppercase glow-text-red">
                    音訊解碼與分析
                  </h2>
                  <div className="font-mono text-xs text-[#FF2E55] bg-[#FAFAFA] border-2 border-black p-4 rounded-xl text-left h-20 flex items-center shadow-inner">
                    <span className="animate-pulse mr-2">&gt;&gt;</span> {loadingStep}
                  </div>
                </div>

                {/* 跳動的 Y2K 音量波形條 */}
                <div className="flex items-end justify-center gap-2 h-16">
                  <span className="w-3 bg-[#FF2E55] rounded-full animate-bar-1 glow-border-red"></span>
                  <span className="w-3 bg-black rounded-full animate-bar-2"></span>
                  <span className="w-3 bg-[#00B0FF] rounded-full animate-bar-3 glow-border-blue"></span>
                  <span className="w-3 bg-[#00C853] rounded-full animate-bar-4 glow-border-green"></span>
                  <span className="w-3 bg-[#FF2E55] rounded-full animate-bar-5 glow-border-red"></span>
                  <span className="w-3 bg-black rounded-full animate-bar-6"></span>
                </div>
                
                <p className="text-[10px] text-gray-700 font-mono uppercase tracking-widest font-bold">
                  DECIPHERING MP3 PCM WAVE DATA... 100% OFFLINE ANALYZER
                </p>
              </div>
            </div>
          )}
          
          {appState === 'playing' && audioUrl && (
            <Game 
              audioUrl={audioUrl} 
              beatmap={beatmap} 
              onComplete={handleGameComplete} 
              songTitle={selectedSong?.title || "未知歌曲"}
              songArtist={selectedSong?.artist || "未知歌手"}
              difficulty={difficulty}
            />
          )}
          
          {appState === 'result' && gameResult && (
            <Result 
              result={gameResult} 
              onReplay={handleReplay} 
              onMenu={handleRestart} 
              songTitle={selectedSong?.title || "未知歌曲"}
              songArtist={selectedSong?.artist || "未知歌手"}
              difficulty={difficulty}
            />
          )}
        </div>
      </div>
    </div>
  );
}

