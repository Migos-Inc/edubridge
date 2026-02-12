import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';
import * as SQLite from 'expo-sqlite';

interface LessonProgress {
  lessonId: string;
  courseId: string;
  completed: boolean;
  progressPercentage: number;
  timeSpentMinutes: number;
  lastPositionSeconds?: number;
  lastUpdated: string;
}

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  totalTimeSpent: number;
}

class ProgressService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize local SQLite database for offline progress tracking
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('edubridge.db');

      // Create progress table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS lesson_progress (
          lesson_id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          progress_percentage INTEGER DEFAULT 0,
          time_spent_minutes INTEGER DEFAULT 0,
          last_position_seconds INTEGER,
          last_updated TEXT NOT NULL,
          synced INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_course_id ON lesson_progress(course_id);
        CREATE INDEX IF NOT EXISTS idx_synced ON lesson_progress(synced);
      `);
    } catch (error) {
      console.error('Error initializing progress database:', error);
    }
  }

  /**
   * Update lesson progress (local-first, syncs when online)
   */
  async updateLessonProgress(
    lessonId: string,
    courseId: string,
    data: {
      completed?: boolean;
      progressPercentage?: number;
      timeSpentMinutes?: number;
      lastPositionSeconds?: number;
    }
  ): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      // Get existing progress
      const existing = await this.getLessonProgress(lessonId);

      const progress: LessonProgress = {
        lessonId,
        courseId,
        completed: data.completed ?? existing?.completed ?? false,
        progressPercentage: data.progressPercentage ?? existing?.progressPercentage ?? 0,
        timeSpentMinutes: data.timeSpentMinutes ?? existing?.timeSpentMinutes ?? 0,
        lastPositionSeconds: data.lastPositionSeconds ?? existing?.lastPositionSeconds,
        lastUpdated: new Date().toISOString(),
      };

      // Save to local database
      await this.db!.runAsync(
        `INSERT OR REPLACE INTO lesson_progress
         (lesson_id, course_id, completed, progress_percentage, time_spent_minutes, last_position_seconds, last_updated, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          progress.lessonId,
          progress.courseId,
          progress.completed ? 1 : 0,
          progress.progressPercentage,
          progress.timeSpentMinutes,
          progress.lastPositionSeconds || null,
          progress.lastUpdated,
        ]
      );

      // Try to sync to cloud if online
      await this.syncToCloud(progress);
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      throw error;
    }
  }

  /**
   * Get progress for a specific lesson
   */
  async getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const result = await this.db!.getFirstAsync<any>(
        'SELECT * FROM lesson_progress WHERE lesson_id = ?',
        [lessonId]
      );

      if (!result) {
        return null;
      }

      return {
        lessonId: result.lesson_id,
        courseId: result.course_id,
        completed: result.completed === 1,
        progressPercentage: result.progress_percentage,
        timeSpentMinutes: result.time_spent_minutes,
        lastPositionSeconds: result.last_position_seconds,
        lastUpdated: result.last_updated,
      };
    } catch (error) {
      console.error('Error getting lesson progress:', error);
      return null;
    }
  }

  /**
   * Get progress for all lessons in a course
   */
  async getCourseProgress(courseId: string): Promise<CourseProgress | null> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const result = await this.db!.getFirstAsync<any>(
        `SELECT
           COUNT(*) as total_lessons,
           SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_lessons,
           AVG(progress_percentage) as avg_progress,
           SUM(time_spent_minutes) as total_time
         FROM lesson_progress
         WHERE course_id = ?`,
        [courseId]
      );

      if (!result || result.total_lessons === 0) {
        return null;
      }

      return {
        courseId,
        totalLessons: result.total_lessons,
        completedLessons: result.completed_lessons || 0,
        progressPercentage: Math.round(result.avg_progress || 0),
        totalTimeSpent: result.total_time || 0,
      };
    } catch (error) {
      console.error('Error getting course progress:', error);
      return null;
    }
  }

  /**
   * Get all in-progress courses
   */
  async getInProgressCourses(): Promise<CourseProgress[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const results = await this.db!.getAllAsync<any>(
        `SELECT
           course_id,
           COUNT(*) as total_lessons,
           SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_lessons,
           AVG(progress_percentage) as avg_progress,
           SUM(time_spent_minutes) as total_time
         FROM lesson_progress
         GROUP BY course_id
         HAVING completed_lessons < total_lessons AND total_lessons > 0`
      );

      return results.map(result => ({
        courseId: result.course_id,
        totalLessons: result.total_lessons,
        completedLessons: result.completed_lessons || 0,
        progressPercentage: Math.round(result.avg_progress || 0),
        totalTimeSpent: result.total_time || 0,
      }));
    } catch (error) {
      console.error('Error getting in-progress courses:', error);
      return [];
    }
  }

  /**
   * Get overall user statistics
   */
  async getUserStats(): Promise<{
    totalCoursesStarted: number;
    totalCoursesCompleted: number;
    totalHoursLearned: number;
    totalLessonsCompleted: number;
  }> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const result = await this.db!.getFirstAsync<any>(
        `SELECT
           COUNT(DISTINCT course_id) as courses_started,
           SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as lessons_completed,
           SUM(time_spent_minutes) as total_minutes
         FROM lesson_progress`
      );

      // Count completed courses (all lessons completed)
      const completedCoursesResult = await this.db!.getAllAsync<any>(
        `SELECT course_id,
                COUNT(*) as total,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
         FROM lesson_progress
         GROUP BY course_id
         HAVING total = completed`
      );

      return {
        totalCoursesStarted: result?.courses_started || 0,
        totalCoursesCompleted: completedCoursesResult.length,
        totalHoursLearned: Math.round((result?.total_minutes || 0) / 60),
        totalLessonsCompleted: result?.lessons_completed || 0,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalCoursesStarted: 0,
        totalCoursesCompleted: 0,
        totalHoursLearned: 0,
        totalLessonsCompleted: 0,
      };
    }
  }

  /**
   * Sync local progress to cloud
   */
  private async syncToCloud(progress: LessonProgress): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        // Not authenticated, keep local only
        return;
      }

      await supabase.from('user_progress').upsert({
        user_id: session.session.user.id,
        lesson_id: progress.lessonId,
        completed: progress.completed,
        progress_percentage: progress.progressPercentage,
        time_spent_minutes: progress.timeSpentMinutes,
        last_position_seconds: progress.lastPositionSeconds,
      });

      // Mark as synced in local database
      if (this.db) {
        await this.db.runAsync(
          'UPDATE lesson_progress SET synced = 1 WHERE lesson_id = ?',
          [progress.lessonId]
        );
      }
    } catch (error) {
      console.error('Error syncing progress to cloud:', error);
      // Keep local copy, will retry later
    }
  }

  /**
   * Sync all unsynced progress to cloud
   */
  async syncAllToCloud(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        return;
      }

      // Get all unsynced progress
      const unsynced = await this.db!.getAllAsync<any>(
        'SELECT * FROM lesson_progress WHERE synced = 0'
      );

      for (const record of unsynced) {
        const progress: LessonProgress = {
          lessonId: record.lesson_id,
          courseId: record.course_id,
          completed: record.completed === 1,
          progressPercentage: record.progress_percentage,
          timeSpentMinutes: record.time_spent_minutes,
          lastPositionSeconds: record.last_position_seconds,
          lastUpdated: record.last_updated,
        };

        await this.syncToCloud(progress);
      }
    } catch (error) {
      console.error('Error syncing all progress:', error);
    }
  }

  /**
   * Pull progress from cloud and merge with local
   */
  async pullFromCloud(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        return;
      }

      const { data: cloudProgress, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', session.session.user.id);

      if (error || !cloudProgress) {
        return;
      }

      // Merge with local data (cloud wins if conflict)
      for (const record of cloudProgress) {
        await this.db!.runAsync(
          `INSERT OR REPLACE INTO lesson_progress
           (lesson_id, course_id, completed, progress_percentage, time_spent_minutes, last_position_seconds, last_updated, synced)
           SELECT ?, ?, ?, ?, ?, ?, ?, 1
           WHERE NOT EXISTS (
             SELECT 1 FROM lesson_progress
             WHERE lesson_id = ? AND last_updated > ?
           )`,
          [
            record.lesson_id,
            '', // We don't have course_id in cloud, would need to fetch
            record.completed ? 1 : 0,
            record.progress_percentage,
            record.time_spent_minutes,
            record.last_position_seconds,
            record.updated_at,
            record.lesson_id,
            record.updated_at,
          ]
        );
      }
    } catch (error) {
      console.error('Error pulling progress from cloud:', error);
    }
  }
}

export const progressService = new ProgressService();
