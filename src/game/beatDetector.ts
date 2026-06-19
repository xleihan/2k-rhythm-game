import { Note, Difficulty } from '../types';

/**
 * 前端即時節奏檢測器 (Web Audio Beat Detector)
 * 
 * 採用時域能量信封檢測 (RMS Energy Envelope Detection) 演算法。
 * 能夠完全於瀏覽器本地解密音軌並自動生成遊戲譜面。
 */
export function generateBeatmap(audioBuffer: AudioBuffer, difficulty: Difficulty): Note[] {
  const channelData = audioBuffer.getChannelData(0); // 取得單聲道 PCM 資料
  const sampleRate = audioBuffer.sampleRate;
  
  // 設定分析窗口大小 (2048 採樣點約 46ms @ 44.1kHz)
  const windowSize = 2048;
  const stepSize = 1024; // 50% 重疊以提升時間精準度
  const totalSamples = channelData.length;
  
  const energies: number[] = [];
  const times: number[] = [];
  
  // 1. 計算每個窗口的 RMS 能量
  for (let offset = 0; offset + windowSize < totalSamples; offset += stepSize) {
    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      const val = channelData[offset + i];
      sum += val * val;
    }
    const rms = Math.sqrt(sum / windowSize);
    energies.push(rms);
    times.push((offset + windowSize / 2) / sampleRate);
  }
  
  // 2. 設定難度參數
  let thresholdMultiplier = 1.25; // 局部平均能量的倍數閾值
  let minSpacing = 0.20;          // 兩個音符之間的最短時間 (秒)
  
  if (difficulty === 'easy') {
    thresholdMultiplier = 1.35; // 降低門檻，音符稍微密集些
    minSpacing = 0.25;
  } else if (difficulty === 'normal') {
    thresholdMultiplier = 1.15; // 顯著降低，增加拍點
    minSpacing = 0.15;
  } else if (difficulty === 'hard') {
    thresholdMultiplier = 1.05; // 大幅降低，產生極其密集的拍子
    minSpacing = 0.08;
  }
  
  // 滑動窗口寬度，前後各 15 個點 (約前後合計 0.7 秒)
  const localWindowHalf = 15;
  const notes: Note[] = [];
  let lastNoteTime = 0;
  let lastColumn = -1;
  let lastDoubleTime = 0;
  
  // 3. 滑動分析 Peak Onsets
  for (let i = localWindowHalf; i < energies.length - localWindowHalf; i++) {
    const currentEnergy = energies[i];
    const currentTime = times[i];
    
    // 前 2.5 秒為緩衝期，不產生音符，留給玩家準備
    if (currentTime < 2.5) continue;
    
    // 計算局部窗口的平均能量
    let localSum = 0;
    let count = 0;
    for (let j = -localWindowHalf; j <= localWindowHalf; j++) {
      localSum += energies[i + j];
      count++;
    }
    const localAverage = localSum / count;
    
    // 判定條件：
    // a. 當前能量大於局部平均能量的 thresholdMultiplier 倍
    // b. 當前能量為該局部窗口的局部極大值 (Peak)
    // c. 距離上一個產生的音符時間超過最短間隔限制 (minSpacing)
    if (
      currentEnergy > localAverage * thresholdMultiplier &&
      currentEnergy > energies[i - 1] &&
      currentEnergy > energies[i + 1] &&
      (currentTime - lastNoteTime) > minSpacing
    ) {
      // 4. 智慧型音軌軌道分配
      // 避免連續在同一軌道，並且根據時間規律產生動態的排布
      let column = Math.floor(Math.random() * 4);
      if (column === lastColumn) {
        column = (column + 1) % 4; // 強制換軌道
      }
      
      notes.push({
        time: Number(currentTime.toFixed(3)),
        column: column,
        hit: false,
        missed: false
      });
      
      // 智慧雙鍵 (Double Note) 機制：在強拍 (能量高於 1.25 倍的閾值) 且難度為 normal 以上產生
      const isStrongBeat = currentEnergy > localAverage * thresholdMultiplier * 1.25;
      const canSpawnDouble = (difficulty === 'normal' && (currentTime - lastDoubleTime) > 0.6) ||
                             (difficulty === 'hard' && (currentTime - lastDoubleTime) > 0.3);
      
      if (isStrongBeat && canSpawnDouble) {
        // 隨機在其他三個軌道中選一個
        let column2 = (column + 1 + Math.floor(Math.random() * 3)) % 4;
        notes.push({
          time: Number(currentTime.toFixed(3)),
          column: column2,
          hit: false,
          missed: false
        });
        lastDoubleTime = currentTime;
      }
      
      lastNoteTime = currentTime;
      lastColumn = column;
    }
  }
  
  console.info(`[Beatmap Generator] 已產生譜面。難度: ${difficulty}, 音符數: ${notes.length}`);
  return notes;
}
