const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', '歌曲');
const destDir = path.join(__dirname, '..', 'public', 'songs');
const jsonOutputPath = path.join(__dirname, '..', 'public', 'songs.json');

// 確保目錄存在
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function parseFilename(filename) {
  // 移除副檔名 .mp3
  let cleanName = filename.replace(/\.mp3$/i, '').trim();
  
  // 匹配開頭的序號，如 "01 - " 或 "01 " 或 "01. "
  const numMatch = cleanName.match(/^(\d+)\s*[-.]?\s*(.*)$/);
  let index = "";
  let remaining = cleanName;
  if (numMatch) {
    index = numMatch[1];
    remaining = numMatch[2].trim();
  }
  
  // 移除常見的尾碼/後綴（不分大小寫）
  const suffixes = [
    /\[official video\]/i,
    /\(official music video\)/i,
    /\[official music video\]/i,
    /\[\s*official music video\s*\]/i,
    /\[official audio\]/i,
    /\(official audio\)/i,
    /official music video/i,
    /official video/i,
    /official audio/i,
    /\[official mv\]/i,
    /\[official lyric video\]/i,
    /\[official visualizer\]/i,
    /\(official visualizer\)/i,
    /\(music video\)/i,
    /\(mv\)/i,
    /m\s*[\/⧸]\s*v/i, // 匹配 m/v 或 m⧸v
    /mv/i,
    /［中文歌詞 - lyrics video］/i,
    /【Official Video】/i,
    /【Official Music Video】/i,
    /【\s*official\s*完整版mv\s*】/i,
    /【官方完整版mv】/i,
    /【\s*official\s*高畫質hd官方完整版mv\s*】/i,
    /｜.*高雄專場.*/i
  ];
  
  for (const regex of suffixes) {
    remaining = remaining.replace(regex, '').trim();
  }
  
  // 清除因為刪除後綴留下的空括號
  remaining = remaining.replace(/\(\s*\)|\[\s*\]/g, '').trim();
  
  // 用 "-" 分割歌手與歌名
  const parts = remaining.split(/\s*-\s*/);
  let artist = "未知歌手";
  let title = remaining;
  
  if (parts.length >= 2) {
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }
  
  // 去除《》書名號
  if (title.startsWith('《') && title.endsWith('》')) {
    title = title.substring(1, title.length - 1).trim();
  }
  
  return {
    index,
    artist,
    title
  };
}

console.log("開始複製與掃描內建歌曲...");

try {
  if (!fs.existsSync(srcDir)) {
    console.error(`錯誤：來源目錄 '${srcDir}' 不存在。`);
    process.exit(1);
  }

  const files = fs.readdirSync(srcDir);
  const mp3Files = files.filter(f => f.toLowerCase().endsWith('.mp3'));

  console.log(`在來源目錄中找到 ${mp3Files.length} 首 MP3 歌曲。`);

  const songsList = [];

  mp3Files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);

    // 複製檔案
    fs.copyFileSync(srcPath, destPath);

    // 解析檔名
    const { index, artist, title } = parseFilename(file);
    
    // 計算難度 (隨機分配或依據檔名長度、序號等產生，也可以讓玩家自由選難度)
    // 預設難度為 normal，但歌曲列表中我們保留它
    const difficulties = ['easy', 'normal', 'hard'];
    const difficulty = difficulties[parseInt(index || '0', 10) % 3];

    songsList.push({
      id: `song_${index || Math.random().toString(36).substr(2, 5)}`,
      index: index,
      title: title,
      artist: artist,
      audioUrl: `/songs/${encodeURIComponent(file)}`, // 處理特殊字符的 URL
      fileName: file,
      defaultDifficulty: difficulty
    });
  });

  // 按序號排序
  songsList.sort((a, b) => {
    return parseInt(a.index || '999', 10) - parseInt(b.index || '999', 10);
  });

  // 寫入 JSON 檔
  fs.writeFileSync(jsonOutputPath, JSON.stringify(songsList, null, 2), 'utf-8');
  console.log(`成功將 ${songsList.length} 首歌曲拷貝並產生 ${jsonOutputPath}`);

} catch (err) {
  console.error("執行過程中出錯：", err);
  process.exit(1);
}
