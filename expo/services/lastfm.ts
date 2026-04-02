import { LASTFM_API_KEY } from '@/constants/api';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export interface LastFmArtist {
  name: string;
  playcount: string;
  listeners: string;
  mbid: string;
  url: string;
  image: Array<{ '#text': string; size: string }>;
}

export interface LastFmTrack {
  name: string;
  playcount: string;
  listeners: string;
  artist: { name: string; mbid: string };
  image: Array<{ '#text': string; size: string }>;
  url: string;
}

async function lastfmFetch<T>(method: string, params: Record<string, string> = {}): Promise<T> {
  const searchParams = new URLSearchParams({
    method,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...params,
  });

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    console.error(`Last.fm API error [${method}]:`, response.status);
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  return response.json();
}

export async function getTopArtists(limit = 15): Promise<LastFmArtist[]> {
  const data = await lastfmFetch<{ artists: { artist: LastFmArtist[] } }>(
    'chart.gettopartists',
    { limit: String(limit) }
  );
  return data.artists.artist;
}

export async function getTopTracks(limit = 15): Promise<LastFmTrack[]> {
  const data = await lastfmFetch<{ tracks: { track: LastFmTrack[] } }>(
    'chart.gettoptracks',
    { limit: String(limit) }
  );
  return data.tracks.track;
}

export async function getArtistTopTracks(artist: string, limit = 10): Promise<LastFmTrack[]> {
  const data = await lastfmFetch<{ toptracks: { track: LastFmTrack[] } }>(
    'artist.gettoptracks',
    { artist, limit: String(limit) }
  );
  return data.toptracks.track;
}

export function getLargestImage(images: Array<{ '#text': string; size: string }>): string {
  const sizes = ['extralarge', 'large', 'medium', 'small'];
  for (const size of sizes) {
    const img = images.find((i) => i.size === size);
    if (img && img['#text']) return img['#text'];
  }
  return '';
}
