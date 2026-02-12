import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function CoursesScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('courses.search')}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.placeholder}>
          Course catalog will be populated here.{'\n\n'}
          Connect to Supabase and add courses to see them listed.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  placeholder: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
});
