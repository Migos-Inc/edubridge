import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '@/i18n';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="courses/index" options={{ title: 'Courses' }} />
        <Stack.Screen name="courses/[id]" options={{ title: 'Course Details' }} />
        <Stack.Screen name="lessons/[id]" options={{ title: 'Lesson' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
