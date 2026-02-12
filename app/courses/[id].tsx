import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { courseService } from '@/services/courseService';
import { Database } from '@/types/database';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    const courseData = await courseService.getCourse(id);
    if (courseData) {
      setCourse(courseData);
      setLessons(courseData.lessons || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{course?.title}</Text>
      <Text style={styles.description}>{course?.description}</Text>
      
      <View style={styles.lessonsSection}>
        <Text style={styles.sectionTitle}>{t('courses.lessons')}</Text>
        {lessons.map((lesson, index) => (
          <TouchableOpacity
            key={lesson.id}
            style={styles.lessonCard}
            onPress={() => router.push(`/lessons/${lesson.id}`)}
          >
            <Text style={styles.lessonNumber}>{index + 1}</Text>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              {lesson.duration_minutes && (
                <Text style={styles.lessonDuration}>{lesson.duration_minutes} min</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 16, color: '#666', marginBottom: 24 },
  lessonsSection: { marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  lessonCard: { flexDirection: 'row', padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 12 },
  lessonNumber: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginRight: 16, width: 30 },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  lessonDuration: { fontSize: 14, color: '#999' },
});
