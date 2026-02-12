import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';
import { Database } from '@/types/database';
import * as SQLite from 'expo-sqlite';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];

interface CourseWithLessons extends Course {
  lessons: Lesson[];
}

class CourseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private cacheKey = 'courses_cache';
  private cacheExpiry = 1000 * 60 * 60 * 24; // 24 hours

  /**
   * Initialize local SQLite database for offline course data
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('edubridge.db');

      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS courses_cache (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          cached_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lessons_cache (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          data TEXT NOT NULL,
          cached_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons_cache(course_id);
      `);
    } catch (error) {
      console.error('Error initializing course database:', error);
    }
  }

  /**
   * Fetch all published courses (with offline caching)
   */
  async getCourses(forceRefresh: boolean = false): Promise<Course[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      // Try to fetch from Supabase if online
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (!error && courses) {
        // Cache courses locally
        await this.cacheCourses(courses);
        return courses;
      }

      // Fallback to cache if offline or error
      return await this.getCachedCourses();
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Return cached courses
      return await this.getCachedCourses();
    }
  }

  /**
   * Fetch a single course with its lessons
   */
  async getCourse(courseId: string): Promise<CourseWithLessons | null> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      // Try to fetch from Supabase
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (!courseError && !lessonsError && course && lessons) {
        const courseWithLessons = { ...course, lessons };

        // Cache locally
        await this.cacheCourse(course);
        await this.cacheLessons(courseId, lessons);

        return courseWithLessons;
      }

      // Fallback to cache
      return await this.getCachedCourse(courseId);
    } catch (error) {
      console.error('Error fetching course:', error);
      return await this.getCachedCourse(courseId);
    }
  }

  /**
   * Get lessons for a course
   */
  async getCourseLessons(courseId: string): Promise<Lesson[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (!error && lessons) {
        await this.cacheLessons(courseId, lessons);
        return lessons;
      }

      return await this.getCachedLessons(courseId);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      return await this.getCachedLessons(courseId);
    }
  }

  /**
   * Get a single lesson
   */
  async getLesson(lessonId: string): Promise<Lesson | null> {
    try {
      const { data: lesson, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (!error && lesson) {
        return lesson;
      }

      // Try cache
      return await this.getCachedLesson(lessonId);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      return await this.getCachedLesson(lessonId);
    }
  }

  /**
   * Search courses by title or category
   */
  async searchCourses(query: string, category?: string): Promise<Course[]> {
    try {
      let queryBuilder = supabase
        .from('courses')
        .select('*')
        .eq('is_published', true);

      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }

      const { data: courses, error } = await queryBuilder.order('created_at', { ascending: false });

      if (!error && courses) {
        return courses;
      }

      // Fallback to filtering cached courses
      const cached = await this.getCachedCourses();
      return cached.filter(course => {
        const matchesQuery = !query ||
          course.title.toLowerCase().includes(query.toLowerCase()) ||
          course.description?.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = !category || course.category === category;
        return matchesQuery && matchesCategory;
      });
    } catch (error) {
      console.error('Error searching courses:', error);
      return [];
    }
  }

  /**
   * Get courses by difficulty level
   */
  async getCoursesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Promise<Course[]> {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .eq('difficulty_level', difficulty)
        .order('created_at', { ascending: false });

      if (!error && courses) {
        return courses;
      }

      const cached = await this.getCachedCourses();
      return cached.filter(course => course.difficulty_level === difficulty);
    } catch (error) {
      console.error('Error fetching courses by difficulty:', error);
      return [];
    }
  }

  // ===== CACHING METHODS =====

  private async cacheCourses(courses: Course[]): Promise<void> {
    if (!this.db) return;

    try {
      for (const course of courses) {
        await this.db.runAsync(
          'INSERT OR REPLACE INTO courses_cache (id, data, cached_at) VALUES (?, ?, ?)',
          [course.id, JSON.stringify(course), new Date().toISOString()]
        );
      }
    } catch (error) {
      console.error('Error caching courses:', error);
    }
  }

  private async cacheCourse(course: Course): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO courses_cache (id, data, cached_at) VALUES (?, ?, ?)',
        [course.id, JSON.stringify(course), new Date().toISOString()]
      );
    } catch (error) {
      console.error('Error caching course:', error);
    }
  }

  private async cacheLessons(courseId: string, lessons: Lesson[]): Promise<void> {
    if (!this.db) return;

    try {
      for (const lesson of lessons) {
        await this.db.runAsync(
          'INSERT OR REPLACE INTO lessons_cache (id, course_id, data, cached_at) VALUES (?, ?, ?, ?)',
          [lesson.id, courseId, JSON.stringify(lesson), new Date().toISOString()]
        );
      }
    } catch (error) {
      console.error('Error caching lessons:', error);
    }
  }

  private async getCachedCourses(): Promise<Course[]> {
    if (!this.db) return [];

    try {
      const results = await this.db.getAllAsync<any>('SELECT data FROM courses_cache');
      return results.map(row => JSON.parse(row.data));
    } catch (error) {
      console.error('Error getting cached courses:', error);
      return [];
    }
  }

  private async getCachedCourse(courseId: string): Promise<CourseWithLessons | null> {
    if (!this.db) return null;

    try {
      const courseResult = await this.db.getFirstAsync<any>(
        'SELECT data FROM courses_cache WHERE id = ?',
        [courseId]
      );

      if (!courseResult) return null;

      const course = JSON.parse(courseResult.data);
      const lessons = await this.getCachedLessons(courseId);

      return { ...course, lessons };
    } catch (error) {
      console.error('Error getting cached course:', error);
      return null;
    }
  }

  private async getCachedLessons(courseId: string): Promise<Lesson[]> {
    if (!this.db) return [];

    try {
      const results = await this.db.getAllAsync<any>(
        'SELECT data FROM lessons_cache WHERE course_id = ? ORDER BY json_extract(data, "$.order_index")',
        [courseId]
      );

      return results.map(row => JSON.parse(row.data));
    } catch (error) {
      console.error('Error getting cached lessons:', error);
      return [];
    }
  }

  private async getCachedLesson(lessonId: string): Promise<Lesson | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.getFirstAsync<any>(
        'SELECT data FROM lessons_cache WHERE id = ?',
        [lessonId]
      );

      if (!result) return null;

      return JSON.parse(result.data);
    } catch (error) {
      console.error('Error getting cached lesson:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.execAsync(`
        DELETE FROM courses_cache;
        DELETE FROM lessons_cache;
      `);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export const courseService = new CourseService();
