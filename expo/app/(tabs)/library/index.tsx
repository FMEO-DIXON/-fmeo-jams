import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FolderOpen, Video, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <FolderOpen size={24} color={colors.accent} />
        <Text style={styles.headerTitle}>Library</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.emptyState,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.emptyIconWrap}>
            <Video size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No videos yet</Text>
          <Text style={styles.emptyDesc}>
            Videos you generate will appear here. Start by creating your first AI video.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
            onPress={() => router.push('/video')}
          >
            <Sparkles size={18} color={colors.bg} />
            <Text style={styles.createBtnText}>Create Your First Video</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.comingSoonSection}>
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <View style={styles.featureList}>
            {[
              { title: 'Auto-save generated videos', desc: 'All your creations saved automatically' },
              { title: 'Organize with folders', desc: 'Keep your videos organized by project' },
              { title: 'Export & share', desc: 'Share directly to social media platforms' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureDot} />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 14,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
  },
  emptyDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    maxWidth: 280,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    borderRadius: 14,
  },
  createBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.bg,
  },
  comingSoonSection: {
    marginTop: 16,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 14,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
