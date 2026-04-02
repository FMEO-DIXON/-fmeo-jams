import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Image,
} from 'react-native';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react-native';
import { useMusicPlayer } from '@/providers/MusicPlayerProvider';
import { colors } from '@/constants/colors';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    togglePlayPause,
    skipNext,
    skipPrevious,
  } = useMusicPlayer();

  const slideAnim = useRef(new Animated.Value(80)).current;
  const progressWidth = duration > 0 ? (position / duration) * 100 : 0;

  useEffect(() => {
    if (currentTrack) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(80);
    }
  }, [currentTrack, slideAnim]);

  if (!currentTrack) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.progressBar, { width: `${progressWidth}%` as any }]} />
      <View style={styles.content}>
        <View style={styles.trackInfo}>
          {currentTrack.albumArt ? (
            <Image source={{ uri: currentTrack.albumArt }} style={styles.albumArt} />
          ) : (
            <View style={[styles.albumArt, styles.albumArtPlaceholder]} />
          )}
          <View style={styles.textWrap}>
            <Text style={styles.trackName} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {currentTrack.artistName}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={skipPrevious} hitSlop={8} style={styles.controlBtn}>
            <SkipBack size={18} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable onPress={togglePlayPause} style={styles.playBtn}>
            {isPlaying ? (
              <Pause size={18} color={colors.bg} fill={colors.bg} />
            ) : (
              <Play size={18} color={colors.bg} fill={colors.bg} />
            )}
          </Pressable>
          <Pressable onPress={skipNext} hitSlop={8} style={styles.controlBtn}>
            <SkipForward size={18} color={colors.text} fill={colors.text} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    backgroundColor: '#1C1C30',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.accent,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 10,
  },
  albumArt: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  albumArtPlaceholder: {
    backgroundColor: colors.surfaceAccent,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  artistName: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
