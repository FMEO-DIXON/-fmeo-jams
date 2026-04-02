import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from 'expo-av';
import createContextHook from '@nkzw/create-context-hook';
import { SpotifyTrack } from '@/services/spotify';

export interface PlayerTrack {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  previewUrl: string;
  durationMs: number;
}

function spotifyTrackToPlayerTrack(track: SpotifyTrack): PlayerTrack | null {
  if (!track.preview_url) return null;
  return {
    id: track.id,
    name: track.name,
    artistName: track.artists.map((a) => a.name).join(', '),
    albumName: track.album.name,
    albumArt: track.album.images?.[0]?.url ?? '',
    previewUrl: track.preview_url,
    durationMs: 30000,
  };
}

export const [MusicPlayerProvider, useMusicPlayer] = createContextHook(() => {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch((err) => console.error('Audio mode error:', err));
    }
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    setDuration(status.durationMillis ?? 30000);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  }, []);

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.error('Unload error:', err);
      }
      soundRef.current = null;
    }
  }, []);

  const playTrack = useCallback(async (track: PlayerTrack) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      await unloadSound();
      setCurrentTrack(track);
      setPosition(0);
      setIsPlaying(false);

      console.log('Loading track:', track.name);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
      console.log('Playing:', track.name);
    } catch (err) {
      console.error('Play error:', err);
      setIsPlaying(false);
    } finally {
      isLoadingRef.current = false;
    }
  }, [unloadSound, onPlaybackStatusUpdate]);

  const playSpotifyTrack = useCallback((track: SpotifyTrack, trackList?: SpotifyTrack[]) => {
    const playerTrack = spotifyTrackToPlayerTrack(track);
    if (!playerTrack) {
      console.log('No preview URL for track:', track.name);
      return;
    }

    if (trackList) {
      const playerTracks = trackList
        .map(spotifyTrackToPlayerTrack)
        .filter((t): t is PlayerTrack => t !== null);
      setQueue(playerTracks);
      const idx = playerTracks.findIndex((t) => t.id === playerTrack.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    }

    void playTrack(playerTrack);
  }, [playTrack]);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  }, []);

  const skipNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    void playTrack(queue[nextIndex]);
  }, [queue, queueIndex, playTrack]);

  const skipPrevious = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = queueIndex <= 0 ? queue.length - 1 : queueIndex - 1;
    setQueueIndex(prevIndex);
    void playTrack(queue[prevIndex]);
  }, [queue, queueIndex, playTrack]);

  const seekTo = useCallback(async (positionMs: number) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(positionMs);
    } catch (err) {
      console.error('Seek error:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  return useMemo(() => ({
    currentTrack,
    isPlaying,
    position,
    duration,
    queue,
    queueIndex,
    playSpotifyTrack,
    playTrack,
    togglePlayPause,
    skipNext,
    skipPrevious,
    seekTo,
  }), [currentTrack, isPlaying, position, duration, queue, queueIndex, playSpotifyTrack, playTrack, togglePlayPause, skipNext, skipPrevious, seekTo]);
});
