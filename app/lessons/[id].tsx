import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Video, ResizeMode } from 'expo-video';
import { courseService } from '@/services/courseService';
import { progressService } from '@/services/progressService';
import { downloadManager } from '@/services/downloadManager';
import { Database } from '@/types/database';

type Lesson = Database['public']['Tables']['lessons']['Row'];

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    const lessonData = await courseService.getLesson(id);
    setLesson(lessonData);
    const localPath = await downloadManager.getLocalPath(id);
    setVideoSource(localPath || lessonData?.video_url || null);
    setIsDownloaded(!!localPath);
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
      {videoSource && (
        <View style={styles.videoContainer}>
          <Video source={{ uri: videoSource }} style={styles.video} useNativeControls resizeMode={ResizeMode.CONTAIN} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{lesson?.title}</Text>
        <Text style={styles.description}>{lesson?.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoContainer: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000' },
  video: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 16, color: '#666' },
});
