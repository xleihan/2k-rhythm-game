import React, { useState, useMemo, useRef } from 'react';
import { Search, Star, Play, Music, ArrowUpDown, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { LibrarySong } from '../game/songs';
import { Difficulty } from '../types';

interface MenuProps {
  songs: LibrarySong[];
  onSelectLibrarySong: (song: LibrarySong, difficulty: Difficulty) => void;
  onSelectCustomSong: (file: File, difficulty: Difficulty) => void;
  errorMsg?: string | null;
}

// 潮流 Y2K 紅色十字星
const Y2kRedStar = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="#FF2E55" className={`${className} filter drop-shadow-[0_0_8px_rgba(255,46,85,0.6)]`}>
    <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/>
  </svg>
);

export function Menu({ songs, onSelectLibrarySong, onSelectCustomSong, errorMsg }: MenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'index' | 'title' | 'artist'>('index');
  const [currentPage, setCurrentPage] = useState(1);
  const [globalDifficulty, setGlobalDifficulty] = useState<Difficulty>('normal');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const isAudio = file.type.startsWith('audio/') || 
                    /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name);
    if (!isAudio) {
      setUploadError("請上傳有效的音訊檔案 (MP3, WAV, M4A, OGG 等)！");
      return;
    }
    onSelectCustomSong(file, globalDifficulty);
  };

  const ITEMS_PER_PAGE = 9;

  // 1. 搜尋與篩選
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const term = searchTerm.toLowerCase();
      return (
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term) ||
        song.index.includes(term)
      );
    });
  }, [songs, searchTerm]);

  // 2. 排序
  const sortedSongs = useMemo(() => {
    const list = [...filteredSongs];
    if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'));
    } else if (sortBy === 'artist') {
      list.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-Hant'));
    } else {
      list.sort((a, b) => parseInt(a.index, 10) - parseInt(b.index, 10));
    }
    return list;
  }, [filteredSongs, sortBy]);

  // 3. 分頁
  const totalPages = Math.ceil(sortedSongs.length / ITEMS_PER_PAGE) || 1;
  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedSongs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedSongs, currentPage]);

  // 重設分頁
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const handleDifficultyChange = (diff: Difficulty) => {
    setGlobalDifficulty(diff);
  };

  return (
    <div className="p-6 md:p-10 select-none">
      {/* 頂部 Header & Logo 區 */}
      <div className="flex flex-col items-center justify-center mb-10 text-center relative">
        <div className="flex items-center justify-center gap-6 mb-4 relative">
          <div className="absolute -left-12 top-0 animate-star-pulse">
            <Y2kRedStar className="w-8 h-8 animate-star-rotate" />
          </div>
          
          {/* Logo 圖片與大標題 */}
          <div className="flex flex-col items-center gap-3">
            <div className="border-4 border-black rounded-2xl overflow-hidden y2k-shadow-black glow-border-red bg-white p-2 max-w-[150px]">
              <img src="/logo.jpg" alt="Logo" className="w-full h-auto rounded-lg" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-black uppercase italic skew-x-[-4deg] glow-text-red">
              2K 節奏高手 <span className="text-[#FF2E55]">MADNESS</span>
            </h1>
          </div>

          <div className="absolute -right-12 top-0 animate-star-pulse">
            <Y2kRedStar className="w-8 h-8 animate-star-rotate-fast" />
          </div>
        </div>
        
        <p className="text-xs text-gray-600 font-mono tracking-widest uppercase mt-2 max-w-xl mx-auto font-bold">
          挑戰極限節奏感！本地 78 首街頭音軌，Web Audio API 即時分析生成關卡。
        </p>
      </div>

      {/* 搜尋、排序、難度控制面板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 bg-white border-2 border-black p-5 rounded-2xl y2k-shadow-black relative">
        {/* 紅色小裝飾星 */}
        <div className="absolute -top-3 -right-3">
          <Y2kRedStar className="w-6 h-6" />
        </div>

        {/* 搜尋框 */}
        <div className="relative">
          <label className="block text-[10px] font-mono font-bold text-gray-700 uppercase tracking-widest mb-1.5">尋找音軌</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="輸入歌名或歌手..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-[#FF2E55] transition-colors text-sm font-bold shadow-inner"
            />
            <Search className="absolute left-3.5 top-3 text-gray-500 w-4.5 h-4.5" />
          </div>
        </div>

        {/* 排序選擇 */}
        <div>
          <label className="block text-[10px] font-mono font-bold text-gray-700 uppercase tracking-widest mb-1.5">排列順序</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortBy('index')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer ${
                sortBy === 'index' ? 'bg-[#FF2E55] text-white y2k-shadow-black translate-x-[-2px] translate-y-[-2px]' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <ArrowUpDown size={14} />
              預設
            </button>
            <button 
              onClick={() => setSortBy('title')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer ${
                sortBy === 'title' ? 'bg-[#FF2E55] text-white y2k-shadow-black translate-x-[-2px] translate-y-[-2px]' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              歌名
            </button>
            <button 
              onClick={() => setSortBy('artist')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer ${
                sortBy === 'artist' ? 'bg-[#FF2E55] text-white y2k-shadow-black translate-x-[-2px] translate-y-[-2px]' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              歌手
            </button>
          </div>
        </div>

        {/* 全域難度設定 */}
        <div>
          <label className="block text-[10px] font-mono font-bold text-gray-700 uppercase tracking-widest mb-1.5">難度調整</label>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border-2 border-black">
            <button 
              onClick={() => handleDifficultyChange('easy')}
              className={`py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                globalDifficulty === 'easy' ? 'bg-[#00C853] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              EASY
            </button>
            <button 
              onClick={() => handleDifficultyChange('normal')}
              className={`py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                globalDifficulty === 'normal' ? 'bg-[#00B0FF] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              NORMAL
            </button>
            <button 
              onClick={() => handleDifficultyChange('hard')}
              className={`py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                globalDifficulty === 'hard' ? 'bg-[#FF2E55] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              HARD
            </button>
          </div>
        </div>
      </div>

      {/* 自訂歌曲上傳區塊 */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-10 p-8 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative select-none ${
          isDragging 
            ? 'border-[#FF2E55] bg-red-50/40 scale-[1.01] shadow-[0_0_15px_rgba(255,46,85,0.2)]' 
            : 'border-black bg-white hover:border-[#FF2E55] hover:scale-[1.005] hover:shadow-[0_0_10px_rgba(255,46,85,0.1)]'
        } y2k-shadow-black`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="audio/*" 
          className="hidden" 
        />
        
        {/* 紅色小裝飾星 */}
        <div className="absolute top-3 right-3 animate-star-pulse">
          <Y2kRedStar className="w-5 h-5" />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`p-4 rounded-full border-2 border-black bg-white shadow-md transition-transform ${isDragging ? 'rotate-12 scale-110' : ''}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-[#FF2E55]' : 'text-black'}`} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-black uppercase skew-x-[-2deg] flex items-center justify-center gap-2">
              <span className="text-[#FF2E55]">★</span> CUSTOM BEAT MODE / 自訂歌曲模式 <span className="text-[#FF2E55]">★</span>
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1 uppercase font-bold tracking-wider">
              DRAG & DROP YOUR MP3/WAV HERE OR CLICK TO BROWSE
            </p>
            <p className="text-[11px] text-gray-400 mt-2 font-medium">
              支援 MP3, WAV, M4A, OGG 等格式。音軌將在瀏覽器內地即時分析產生專屬節奏點！
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 px-4 py-2 bg-red-50 border-2 border-red-500 rounded-xl text-red-700 text-xs font-mono font-bold">
            {uploadError}
          </div>
        )}
      </div>

      {/* 錯誤資訊 */}
      {errorMsg && (
        <div className="mb-8 p-4 bg-red-50 border-2 border-red-500 rounded-2xl text-red-700 text-sm max-w-2xl mx-auto text-left shadow-lg glow-border-red">
          <strong className="font-bold block mb-1">發生錯誤:</strong>
          <span className="break-words font-mono text-xs">{errorMsg}</span>
        </div>
      )}

      {/* 歌曲卡片網格 */}
      {paginatedSongs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {paginatedSongs.map((song) => (
            <div 
              key={song.id}
              onClick={() => onSelectLibrarySong(song, globalDifficulty)}
              className="bg-white border-2 border-black rounded-2xl overflow-hidden hover:border-[#FF2E55] hover:scale-[1.02] hover:-rotate-1 transition-all group cursor-pointer y2k-shadow-black flex flex-col h-full"
            >
              {/* 卡片唱片視覺特效 */}
              <div className="aspect-video bg-gradient-to-br from-white to-[#F3F4F6] relative overflow-hidden flex items-center justify-center border-b-2 border-black">
                {/* 潮牌黑膠 CD 特效 */}
                <div className="w-24 h-24 rounded-full bg-black border-2 border-black flex items-center justify-center shadow-lg relative group-hover:rotate-180 transition-all duration-1000">
                  <div className="w-18 h-18 rounded-full border border-gray-800 bg-[#1A1A1F] flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-600 via-yellow-500 to-blue-500 animate-spin opacity-40"></div>
                  </div>
                  {/* CD 中心孔 */}
                  <div className="absolute w-3 h-3 rounded-full bg-black"></div>
                </div>

                {/* 漂浮的小四角星 */}
                <div className="absolute top-3 left-3 opacity-30 group-hover:opacity-80 group-hover:scale-110 transition-all">
                  <Y2kRedStar className="w-4 h-4" />
                </div>
                
                {/* 序號標記 */}
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-black border border-gray-800 rounded font-mono text-[10px] text-[#00C853] font-bold">
                  #{song.index}
                </div>

                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-[#FF2E55] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#FF2E55]/50 pl-1 transform scale-75 group-hover:scale-100 transition-transform">
                    <Play size={24} className="fill-current" />
                  </div>
                </div>
              </div>

              {/* 歌曲資訊 */}
              <div className="p-4 text-left flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-base text-black mb-1 truncate group-hover:text-[#FF2E55] transition-colors uppercase tracking-tight">
                    {song.title}
                  </h3>
                  <p className="text-gray-600 text-xs truncate font-medium">
                    {song.artist}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-4 text-[10px] font-mono">
                  <span className="px-2 py-0.5 bg-[#F3F4F6] border border-black rounded text-gray-700 font-bold flex items-center gap-1">
                    <Music size={10} />
                    LOCAL MP3
                  </span>
                  <span className={`px-2.5 py-0.5 rounded font-black uppercase text-white ${
                    globalDifficulty === 'easy' ? 'bg-[#00C853]' :
                    globalDifficulty === 'normal' ? 'bg-[#00B0FF]' : 'bg-[#FF2E55]'
                  }`}>
                    {globalDifficulty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-black rounded-2xl bg-white mb-8">
          <p className="text-gray-500 font-mono text-sm uppercase">沒有找到任何匹配的音軌...</p>
        </div>
      )}

      {/* 分頁控制列 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="p-2 bg-white border-2 border-black rounded-xl text-black hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-md"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="font-mono text-xs font-black tracking-widest">
            {currentPage} / {totalPages}
          </span>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="p-2 bg-white border-2 border-black rounded-xl text-black hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-md"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* 底部按鍵指南 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 text-left bg-white p-6 rounded-2xl border-2 border-black relative y2k-shadow-black">
        {/* 左側說明 */}
        <div>
          <h3 className="font-black text-[#FF2E55] mb-2 text-sm uppercase tracking-wider flex items-center gap-1.5">
            <Y2kRedStar className="w-4 h-4" />
            遊戲玩法說明
          </h3>
          <p className="text-xs text-gray-700 leading-relaxed font-medium">
            音軌開始播放後，節奏音符會由上往下落下。當音符落到最底部的判定區時，按下對應的方向鍵。時機點越精準，獲得的分數加倍越多！
          </p>
        </div>
        {/* 右側操作 */}
        <div>
          <h3 className="font-black text-black mb-2 text-sm uppercase tracking-wider">控制按鍵</h3>
          <div className="flex items-center space-x-3 mt-3">
            {['←', '↓', '↑', '→'].map((key) => (
              <kbd key={key} className="px-3.5 py-2 bg-[#F3F4F6] text-black rounded-lg border-2 border-black font-mono text-base font-black shadow-md">
                {key}
              </kbd>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
