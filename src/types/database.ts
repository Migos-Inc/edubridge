export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          preferred_language: string
          is_educator: boolean
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferred_language?: string
          is_educator?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferred_language?: string
          is_educator?: boolean
        }
      }
      courses: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          thumbnail_url: string | null
          category: string
          difficulty_level: 'beginner' | 'intermediate' | 'advanced'
          estimated_hours: number | null
          creator_id: string
          is_published: boolean
          languages: string[]
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          category: string
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
          estimated_hours?: number | null
          creator_id: string
          is_published?: boolean
          languages?: string[]
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          category?: string
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
          estimated_hours?: number | null
          creator_id?: string
          is_published?: boolean
          languages?: string[]
        }
      }
      lessons: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          course_id: string
          title: string
          description: string | null
          content: Json
          video_url: string | null
          video_size_mb: number | null
          compressed_video_url: string | null
          order_index: number
          duration_minutes: number | null
          is_free: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          course_id: string
          title: string
          description?: string | null
          content?: Json
          video_url?: string | null
          video_size_mb?: number | null
          compressed_video_url?: string | null
          order_index: number
          duration_minutes?: number | null
          is_free?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          course_id?: string
          title?: string
          description?: string | null
          content?: Json
          video_url?: string | null
          video_size_mb?: number | null
          compressed_video_url?: string | null
          order_index?: number
          duration_minutes?: number | null
          is_free?: boolean
        }
      }
      translations: {
        Row: {
          id: string
          created_at: string
          entity_type: 'course' | 'lesson'
          entity_id: string
          language_code: string
          field_name: string
          translated_text: string
        }
        Insert: {
          id?: string
          created_at?: string
          entity_type: 'course' | 'lesson'
          entity_id: string
          language_code: string
          field_name: string
          translated_text: string
        }
        Update: {
          id?: string
          created_at?: string
          entity_type?: 'course' | 'lesson'
          entity_id?: string
          language_code?: string
          field_name?: string
          translated_text?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          lesson_id: string
          completed: boolean
          progress_percentage: number
          time_spent_minutes: number
          last_position_seconds: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          lesson_id: string
          completed?: boolean
          progress_percentage?: number
          time_spent_minutes?: number
          last_position_seconds?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          lesson_id?: string
          completed?: boolean
          progress_percentage?: number
          time_spent_minutes?: number
          last_position_seconds?: number | null
        }
      }
      downloaded_content: {
        Row: {
          id: string
          created_at: string
          user_id: string
          lesson_id: string
          local_path: string
          file_size_mb: number
          download_completed: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          lesson_id: string
          local_path: string
          file_size_mb: number
          download_completed?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          lesson_id?: string
          local_path?: string
          file_size_mb?: number
          download_completed?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
