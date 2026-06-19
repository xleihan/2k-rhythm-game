export interface LibrarySong {
  id: string;
  index: string;
  title: string;
  artist: string;
  audioUrl: string;
  fileName: string;
  defaultDifficulty: string;
}

/**
 * 載入本地音樂庫歌曲清單
 */
export async function loadLibrarySongs(): Promise<LibrarySong[]> {
  try {
    const response = await fetch('songs.json');
    if (!response.ok) {
      throw new Error(`無法載入音樂清單: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("載入本機歌曲庫失敗:", error);
    return [];
  }
}

