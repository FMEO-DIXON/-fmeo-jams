import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Music, TrendingUp, Disc3, Headphones } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useMusicPlayer } from '@/providers/MusicPlayerProvider';
import {
  getNewReleases,
  getFeaturedPlaylists,
  getRecommendations,
  SpotifyTrack,
  SpotifyAlbum,
  SpotifyPlaylist,
} from '@/services/spotify';
import { getTopArtists, getLargestImage, LastFmArtist } from '@/services/lastfm';
import MiniPlayer from '@/components/MiniPlayer';

const GREETING = (() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
})();

function TrackRow({ track, index, onPress }: { track: SpotifyTrack; index: number; onPress: () => void }) {
  const hasPreview = !!track.preview_url;
  return (
    <Pressable
      style={({ pressed }) => [styles.trackRow, pressed && styles.trackRowPressed, !hasPreview && styles.trackRowDisabled]}
      onPress={hasPreview ? onPress : undefined}
      testID={`track-row-${index}`}
    >
      <Image
        source={{ uri: track.album.images?.[0]?.url }}
        style={styles.trackThumb}
      />
      <View style={styles.trackMeta}>
        <Text style={styles.trackTitle} numberOfLines={1}>{track.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artists.map((a) => a.name).join(', ')}
        </Text>
      </View>
      {!hasPreview && (
        <View style={styles.noPreviewBadge}>
          <Text style={styles.noPreviewText}>No preview</Text>
        </View>
      )}
    </Pressable>
  );
}

function AlbumCard({ album }: { album: SpotifyAlbum }) {
  return (
    <View style={styles.albumCard} testID={`album-card-${album.id}`}>
      <Image source={{ uri: album.images?.[0]?.url }} style={styles.albumArt} />
      <Text style={styles.albumName} numberOfLines={1}>{album.name}</Text>
      <Text style={styles.albumArtist} numberOfLines={1}>
        {album.artists.map((a) => a.name).join(', ')}
      </Text>
    </View>
  );
}

function PlaylistCard({ playlist }: { playlist: SpotifyPlaylist }) {
  return (
    <View style={styles.playlistCard} testID={`playlist-card-${playlist.id}`}>
      <Image source={{ uri: playlist.images?.[0]?.url }} style={styles.playlistArt} />
      <Text style={styles.playlistName} numberOfLines={2}>{playlist.name}</Text>
      <Text style={styles.playlistOwner} numberOfLines={1}>{playlist.owner.display_name}</Text>
    </View>
  );
}

function ArtistBubble({ artist }: { artist: LastFmArtist }) {
  const imgUrl = getLargestImage(artist.image);
  return (
    <View style={styles.artistBubble} testID={`artist-bubble-${artist.name}`}>
      {imgUrl ? (
        <Image source={{ uri: imgUrl }} style={styles.artistImg} />
      ) : (
        <View style={[styles.artistImg, styles.artistImgPlaceholder]}>
          <Headphones size={20} color={colors.textMuted} />
        </View>
      )}
      <Text style={styles.artistName2} numberOfLines={1}>{artist.name}</Text>
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { playSpotifyTrack, currentTrack } = useMusicPlayer();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const newReleasesQuery = useQuery({
    queryKey: ['newReleases'],
    queryFn: () => getNewReleases(15),
    staleTime: 1000 * 60 * 10,
  });

  const playlistsQuery = useQuery({
    queryKey: ['featuredPlaylists'],
    queryFn: () => getFeaturedPlaylists(15),
    staleTime: 1000 * 60 * 10,
  });

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => getRecommendations(['pop', 'hip-hop', 'r-n-b'], 25),
    staleTime: 1000 * 60 * 10,
  });

  const topArtistsQuery = useQuery({
    queryKey: ['topArtists'],
    queryFn: () => getTopArtists(20),
    staleTime: 1000 * 60 * 15,
  });

  const isLoading =
    newReleasesQuery.isLoading &&
    playlistsQuery.isLoading &&
    recommendationsQuery.isLoading;

  const isRefreshing =
    newReleasesQuery.isRefetching ||
    playlistsQuery.isRefetching ||
    recommendationsQuery.isRefetching;

  const handleRefresh = useCallback(() => {
    void newReleasesQuery.refetch();
    void playlistsQuery.refetch();
    void recommendationsQuery.refetch();
    void topArtistsQuery.refetch();
  }, [newReleasesQuery, playlistsQuery, recommendationsQuery, topArtistsQuery]);

  const handleTrackPress = useCallback((track: SpotifyTrack, trackList: SpotifyTrack[]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSpotifyTrack(track, trackList);
  }, [playSpotifyTrack]);

  const recommendations = recommendationsQuery.data ?? [];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient colors={['#0F0F1A', '#0A0A0F']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading your music...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#151528', '#0D0D18', '#0A0A0F']} style={StyleSheet.absoluteFillObject} />

      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View>
            <Text style={styles.greeting}>{GREETING}</Text>
            <Text style={styles.brandTitle}>FMEO JAMs</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: currentTrack ? 100 : insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="For You" icon={<TrendingUp size={18} color={colors.accent} />} />
              <View style={styles.forYouGrid}>
                {recommendations.slice(0, 6).map((track) => {
                  const hasPreview = !!track.preview_url;
                  return (
                    <Pressable
                      key={track.id}
                      style={({ pressed }) => [
                        styles.forYouItem,
                        pressed && hasPreview && styles.forYouItemPressed,
                      ]}
                      onPress={hasPreview ? () => handleTrackPress(track, recommendations) : undefined}
                    >
                      <Image
                        source={{ uri: track.album.images?.[0]?.url }}
                        style={styles.forYouImg}
                      />
                      <View style={styles.forYouMeta}>
                        <Text style={styles.forYouTitle} numberOfLines={1}>{track.name}</Text>
                        <Text style={styles.forYouArtist} numberOfLines={1}>
                          {track.artists[0]?.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {(topArtistsQuery.data ?? []).length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Trending Artists" icon={<Headphones size={18} color={colors.teal} />} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {(topArtistsQuery.data ?? []).map((artist) => (
                  <ArtistBubble key={artist.name} artist={artist} />
                ))}
              </ScrollView>
            </View>
          )}

          {(newReleasesQuery.data ?? []).length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="New Releases" icon={<Disc3 size={18} color={colors.coral} />} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {(newReleasesQuery.data ?? []).map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </ScrollView>
            </View>
          )}

          {(playlistsQuery.data ?? []).length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Featured Playlists" icon={<Music size={18} color={colors.blue} />} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {(playlistsQuery.data ?? []).map((pl) => (
                  <PlaylistCard key={pl.id} playlist={pl} />
                ))}
              </ScrollView>
            </View>
          )}

          {recommendations.length > 6 && (
            <View style={styles.section}>
              <SectionHeader title="Recommended Tracks" icon={<TrendingUp size={18} color={colors.accent} />} />
              {recommendations.slice(6, 20).map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  onPress={() => handleTrackPress(track, recommendations)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <MiniPlayer />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.accent,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  horizontalList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  forYouGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  forYouItem: {
    width: '48%' as any,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    overflow: 'hidden',
    height: 56,
  },
  forYouItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  forYouImg: {
    width: 56,
    height: 56,
  },
  forYouMeta: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 2,
  },
  forYouTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
  },
  forYouArtist: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  albumCard: {
    width: 150,
    gap: 6,
  },
  albumArt: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },
  albumName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  albumArtist: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  playlistCard: {
    width: 150,
    gap: 6,
  },
  playlistArt: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },
  playlistName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: 17,
  },
  playlistOwner: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  artistBubble: {
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  artistImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceLight,
  },
  artistImgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistName2: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  trackRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  trackRowDisabled: {
    opacity: 0.5,
  },
  trackThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
  },
  trackMeta: {
    flex: 1,
    gap: 3,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  trackArtist: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noPreviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  noPreviewText: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
