import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '@/constants/api';

let cachedToken: string | null = null;
let tokenExpiry = 0;

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtistSimple {
  id: string;
  name: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  popularity: number;
  followers?: { total: number };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: SpotifyArtistSimple[];
  release_date: string;
  total_tracks: number;
  album_type: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistSimple[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
  };
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
  track_number: number;
  explicit: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  owner: { display_name: string };
  tracks: { total: number };
}

export interface SpotifyCategory {
  id: string;
  name: string;
  icons: SpotifyImage[];
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  console.log('Fetching new Spotify access token...');
  const credentials = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Spotify token error:', errorText);
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  console.log('Spotify token acquired');
  return cachedToken!;
}

async function spotifyFetch<T>(endpoint: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Spotify API error [${endpoint}]:`, response.status, errorText);
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

export async function getNewReleases(limit = 20): Promise<SpotifyAlbum[]> {
  const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>(
    `/browse/new-releases?limit=${limit}&country=US`
  );
  return data.albums.items;
}

export async function getFeaturedPlaylists(limit = 20): Promise<SpotifyPlaylist[]> {
  const data = await spotifyFetch<{ playlists: { items: SpotifyPlaylist[] } }>(
    `/browse/featured-playlists?limit=${limit}&country=US`
  );
  return data.playlists.items;
}

export async function getCategories(limit = 20): Promise<SpotifyCategory[]> {
  const data = await spotifyFetch<{ categories: { items: SpotifyCategory[] } }>(
    `/browse/categories?limit=${limit}&country=US&locale=en_US`
  );
  return data.categories.items;
}

export async function getPlaylistTracks(playlistId: string, limit = 30): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: Array<{ track: SpotifyTrack }> }>(
    `/playlists/${playlistId}/tracks?limit=${limit}&market=US`
  );
  return data.items.map((item) => item.track).filter(Boolean);
}

export async function getAlbumTracks(albumId: string): Promise<{ album: SpotifyAlbum; tracks: SpotifyTrack[] }> {
  const data = await spotifyFetch<SpotifyAlbum & { tracks: { items: SpotifyTrack[] } }>(
    `/albums/${albumId}?market=US`
  );
  const tracks = data.tracks.items.map((t) => ({
    ...t,
    album: { id: data.id, name: data.name, images: data.images },
  }));
  return { album: data, tracks };
}

export async function getArtist(artistId: string): Promise<SpotifyArtist> {
  return spotifyFetch<SpotifyArtist>(`/artists/${artistId}`);
}

export async function getArtistTopTracks(artistId: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
    `/artists/${artistId}/top-tracks?market=US`
  );
  return data.tracks;
}

export async function search(
  query: string,
  types: string[] = ['track', 'artist', 'album', 'playlist'],
  limit = 10
): Promise<{
  tracks: SpotifyTrack[];
  artists: SpotifyArtist[];
  albums: SpotifyAlbum[];
  playlists: SpotifyPlaylist[];
}> {
  const typeStr = types.join(',');
  const data = await spotifyFetch<{
    tracks?: { items: SpotifyTrack[] };
    artists?: { items: SpotifyArtist[] };
    albums?: { items: SpotifyAlbum[] };
    playlists?: { items: SpotifyPlaylist[] };
  }>(`/search?q=${encodeURIComponent(query)}&type=${typeStr}&limit=${limit}&market=US`);

  return {
    tracks: data.tracks?.items ?? [],
    artists: data.artists?.items ?? [],
    albums: data.albums?.items ?? [],
    playlists: data.playlists?.items ?? [],
  };
}

export async function getTopTracksPlaylist(): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ playlists: { items: SpotifyPlaylist[] } }>(
    `/browse/featured-playlists?limit=1&country=US`
  );
  if (data.playlists.items.length > 0) {
    return getPlaylistTracks(data.playlists.items[0].id, 20);
  }
  return [];
}

export async function getRecommendations(seedGenres: string[] = ['pop', 'hip-hop', 'r-n-b'], limit = 20): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
    `/recommendations?seed_genres=${seedGenres.join(',')}&limit=${limit}&market=US`
  );
  return data.tracks;
}
