import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';

interface DownloadProgress {
  lessonId: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error';
  localPath?: string;
  error?: string;
}

class DownloadManager {
  private downloads: Map<string, DownloadProgress> = new Map();
  private downloadCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();

  /**
   * Download a lesson video for offline access
   */
  async downloadLesson(
    lessonId: string,
    videoUrl: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    // Set up progress tracking
    const progressData: DownloadProgress = {
      lessonId,
      totalBytes: 0,
      downloadedBytes: 0,
      progress: 0,
      status: 'pending',
    };

    this.downloads.set(lessonId, progressData);
    if (onProgress) {
      this.downloadCallbacks.set(lessonId, onProgress);
    }

    try {
      // Create directory for downloads if it doesn't exist
      const downloadDir = `${FileSystem.documentDirectory}downloads/lessons/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      // Generate local file path
      const fileName = `lesson_${lessonId}.mp4`;
      const localPath = `${downloadDir}${fileName}`;

      // Check if already downloaded
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        progressData.status = 'completed';
        progressData.progress = 100;
        progressData.localPath = localPath;
        this.updateProgress(lessonId, progressData);
        return localPath;
      }

      // Start download
      progressData.status = 'downloading';
      this.updateProgress(lessonId, progressData);

      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          progressData.totalBytes = downloadProgress.totalBytesExpectedToWrite;
          progressData.downloadedBytes = downloadProgress.totalBytesWritten;
          progressData.progress = progress * 100;
          this.updateProgress(lessonId, progressData);
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result) {
        progressData.status = 'completed';
        progressData.progress = 100;
        progressData.localPath = result.uri;
        this.updateProgress(lessonId, progressData);

        // Save to database
        await this.saveDownloadRecord(lessonId, result.uri, progressData.totalBytes);

        return result.uri;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      progressData.status = 'error';
      progressData.error = error instanceof Error ? error.message : 'Download failed';
      this.updateProgress(lessonId, progressData);
      throw error;
    }
  }

  /**
   * Pause a download
   */
  async pauseDownload(lessonId: string): Promise<void> {
    const progress = this.downloads.get(lessonId);
    if (progress && progress.status === 'downloading') {
      progress.status = 'paused';
      this.updateProgress(lessonId, progress);
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(lessonId: string): Promise<void> {
    const progress = this.downloads.get(lessonId);
    if (progress && progress.status === 'paused') {
      progress.status = 'downloading';
      this.updateProgress(lessonId, progress);
    }
  }

  /**
   * Delete a downloaded lesson
   */
  async deleteDownload(lessonId: string): Promise<void> {
    try {
      const downloadDir = `${FileSystem.documentDirectory}downloads/lessons/`;
      const fileName = `lesson_${lessonId}.mp4`;
      const localPath = `${downloadDir}${fileName}`;

      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);
      }

      // Remove from database
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase
          .from('downloaded_content')
          .delete()
          .eq('user_id', session.session.user.id)
          .eq('lesson_id', lessonId);
      }

      this.downloads.delete(lessonId);
      this.downloadCallbacks.delete(lessonId);
    } catch (error) {
      console.error('Error deleting download:', error);
      throw error;
    }
  }

  /**
   * Get all downloaded lessons
   */
  async getDownloadedLessons(): Promise<string[]> {
    try {
      const downloadDir = `${FileSystem.documentDirectory}downloads/lessons/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);

      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(downloadDir);
      return files
        .filter(file => file.endsWith('.mp4'))
        .map(file => file.replace('lesson_', '').replace('.mp4', ''));
    } catch (error) {
      console.error('Error getting downloaded lessons:', error);
      return [];
    }
  }

  /**
   * Check if a lesson is downloaded
   */
  async isLessonDownloaded(lessonId: string): Promise<boolean> {
    try {
      const downloadDir = `${FileSystem.documentDirectory}downloads/lessons/`;
      const fileName = `lesson_${lessonId}.mp4`;
      const localPath = `${downloadDir}${fileName}`;

      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get local path for a downloaded lesson
   */
  async getLocalPath(lessonId: string): Promise<string | null> {
    const isDownloaded = await this.isLessonDownloaded(lessonId);
    if (!isDownloaded) {
      return null;
    }

    const downloadDir = `${FileSystem.documentDirectory}downloads/lessons/`;
    const fileName = `lesson_${lessonId}.mp4`;
    return `${downloadDir}${fileName}`;
  }

  /**
   * Get total storage used by downloads
   */
  async getStorageUsed(): Promise<number> {
    try {
      const downloadDir = `${FileSystem.documentDirectory}downloads/lessons/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);

      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(downloadDir);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${downloadDir}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating storage:', error);
      return 0;
    }
  }

  /**
   * Update progress and notify callbacks
   */
  private updateProgress(lessonId: string, progress: DownloadProgress): void {
    this.downloads.set(lessonId, progress);
    const callback = this.downloadCallbacks.get(lessonId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Save download record to database
   */
  private async saveDownloadRecord(lessonId: string, localPath: string, fileSizeMb: number): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        // Store locally if not authenticated
        const downloads = await this.getLocalDownloads();
        downloads.push({ lessonId, localPath, fileSizeMb });
        await AsyncStorage.setItem('local_downloads', JSON.stringify(downloads));
        return;
      }

      await supabase.from('downloaded_content').upsert({
        user_id: session.session.user.id,
        lesson_id: lessonId,
        local_path: localPath,
        file_size_mb: fileSizeMb / (1024 * 1024), // Convert to MB
        download_completed: true,
      });
    } catch (error) {
      console.error('Error saving download record:', error);
    }
  }

  /**
   * Get locally stored downloads (for offline/anonymous users)
   */
  private async getLocalDownloads(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('local_downloads');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }
}

export const downloadManager = new DownloadManager();
