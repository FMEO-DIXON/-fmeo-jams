import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X, Music2, User, Disc, ListMusic } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useMusicPlayer } from '@/providers/MusicPlayerProvider';
import {
  search as spotifySearch,
  getCategories,
  SpotifyTrack,
  SpotifyCategory,
} from '@/services/spotify';
import MiniPlayer from '@/components/MiniPlayer';

const GENRE_COLORS: string[] = [
  '#E13300', '#1DB954', '#8400E7', '#E8115B',
  '#1E3264', '#E91429', '#148A08', '#E1118B',
  '#537AA1', '#F59B23', '#DC148C', '#056952',
  '#509BF5', '#BA5D07', '#777777', '#AF2896',
];

function CategoryCard({ category, index }: { category: SpotifyCategory; index: number }) {
  const bgColor = GENRE_COLORS[index % GENRE_COLORS.length];
  return (
    <Pressable style={[styles.categoryCard, { backgroundColor: bgColor }]}>
      <Text style={styles.categoryName}>{category.name}</Text>
      {category.icons[0]?.url && (
        <Image source={{ uri: category.icons[0].url }} style={styles.categoryImg} />
      )}
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { playSpotifyTrack, currentTrack } = useMusicPlayer();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    Keyboard.dismiss();
  }, []);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(20),
    staleTime: 1000 * 60 * 30,
  });

  const searchQuery = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => spotifySearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const handleTrackPress = useCallback((track: SpotifyTrack) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSpotifyTrack(track, searchQuery.data?.tracks ?? []);
  }, [playSpotifyTrack, searchQuery.data]);

  const hasResults = debouncedQuery.length >= 2 && searchQuery.data;
  const results = searchQuery.data;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#121220', '#0A0A0F']} style={StyleSheet.absoluteFillObject} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Artists, songs, or albums"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCorrect={false}
            testID="search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: currentTrack ? 100 : insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.isLoading && debouncedQuery.length >= 2 && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {hasResults && (
          <>
            {(results?.tracks ?? []).length > 0 && (
              <View style={styles.resultSection}>
                <View style={styles.resultHeader}>
                  <Music2 size={16} color={colors.accent} />
                  <Text style={styles.resultSectionTitle}>Songs</Text>
                </View>
                {(results?.tracks ?? []).map((track) => (
                  <Pressable
                    key={track.id}
                    style={({ pressed }) => [styles.trackRow, pressed && !!track.preview_url && styles.trackRowPressed]}
                    onPress={track.preview_url ? () => handleTrackPress(track) : undefined}
                  >
                    <Image source={{ uri: track.album.images?.[0]?.url }} style={styles.trackThumb} />
                    <View style={styles.trackMeta}>
                      <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
                      <Text style={styles.trackArtistName} numberOfLines={1}>
                        {track.artists.map((a) => a.name).join(', ')}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {(results?.artists ?? []).length > 0 && (
              <View style={styles.resultSection}>
                <View style={styles.resultHeader}>
                  <User size={16} color={colors.teal} />
                  <Text style={styles.resultSectionTitle}>Artists</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {(results?.artists ?? []).map((artist) => (
                    <View key={artist.id} style={styles.artistCard}>
                      {artist.images?.[0]?.url ? (
                        <Image source={{ uri: artist.images[0].url }} style={styles.artistCircle} />
                      ) : (
                        <View style={[styles.artistCircle, styles.artistPlaceholder]}>
                          <User size={24} color={colors.textMuted} />
                        </View>
                      )}
                      <Text style={styles.artistCardName} numberOfLines={1}>{artist.name}</Text>
                      <Text style={styles.artistCardGenre} numberOfLines={1}>
                        {artist.genres?.[0] ?? 'Artist'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {(results?.albums ?? []).length > 0 && (
              <View style={styles.resultSection}>
                <View style={styles.resultHeader}>
                  <Disc size={16} color={colors.coral} />
                  <Text style={styles.resultSectionTitle}>Albums</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {(results?.albums ?? []).map((album) => (
                    <View key={album.id} style={styles.albumResultCard}>
                      <Image source={{ uri: album.images?.[0]?.url }} style={styles.albumResultArt} />
                      <Text style={styles.albumResultName} numberOfLines={1}>{album.name}</Text>
                      <Text style={styles.albumResultArtist} numberOfLines={1}>
                        {album.artists.map((a) => a.name).join(', ')}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {(results?.playlists ?? []).length > 0 && (
              <View style={styles.resultSection}>
                <View style={styles.resultHeader}>
                  <ListMusic size={16} color={colors.blue} />
                  <Text style={styles.resultSectionTitle}>Playlists</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {(results?.playlists ?? []).map((pl) => (
                    <View key={pl.id} style={styles.albumResultCard}>
                      <Image source={{ uri: pl.images?.[0]?.url }} style={styles.albumResultArt} />
                      <Text style={styles.albumResultName} numberOfLines={2}>{pl.name}</Text>
                      <Text style={styles.albumResultArtist} numberOfLines={1}>
                        {pl.owner.display_name}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {!hasResults && !searchQuery.isLoading && (
          <View style={styles.browseSection}>
            <Text style={styles.browseTitle}>Browse All</Text>
            <View style={styles.categoriesGrid}>
              {(categoriesQuery.data ?? []).map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} index={i} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: 42,
  },
  scroll: {
    flex: 1,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  resultSection: {
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 7,
    gap: 12,
  },
  trackRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
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
  trackName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  trackArtistName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  horizontalList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  artistCard: {
    alignItems: 'center',
    width: 100,
    gap: 6,
  },
  artistCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
  },
  artistPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistCardName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  artistCardGenre: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
  albumResultCard: {
    width: 140,
    gap: 6,
  },
  albumResultArt: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  albumResultName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  albumResultArtist: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  browseSection: {
    paddingHorizontal: 20,
  },
  browseTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 14,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '47%' as any,
    height: 100,
    borderRadius: 10,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    zIndex: 1,
  },
  categoryImg: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 70,
    height: 70,
    borderRadius: 6,
    transform: [{ rotate: '25deg' }],
    opacity: 0.7,
  },
});
