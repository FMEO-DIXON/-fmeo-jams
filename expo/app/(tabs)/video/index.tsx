import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Type,
  ImageIcon,
  Sparkles,
  Download,
  X,
  Play,
  Clock,
  Maximize,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMutation } from '@tanstack/react-query';
import { File, Directory, Paths } from 'expo-file-system';
import { colors } from '@/constants/colors';
import { LTX_API_KEY } from '@/constants/api';

type GenerationMode = 'text-to-video' | 'image-to-video';
type Resolution = '1280x720' | '1920x1080';
type Duration = 5 | 8;

interface GenerationResult {
  videoUri: string;
}

async function generateVideo(
  mode: GenerationMode,
  prompt: string,
  duration: Duration,
  resolution: Resolution,
  imageUri?: string
): Promise<GenerationResult> {
  console.log('Starting generation:', { mode, prompt, duration, resolution });

  if (!LTX_API_KEY) {
    throw new Error('LTX API key is not configured');
  }

  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt is required');
  }

  const endpoint = mode === 'text-to-video'
    ? 'https://api.ltx.video/v1/text-to-video'
    : 'https://api.ltx.video/v1/image-to-video';

  const body: Record<string, unknown> = {
    prompt: prompt.trim(),
    model: 'ltx-2-3-pro',
    duration,
    resolution,
    fps: 25,
  };

  if (mode === 'image-to-video' && imageUri) {
    body.image_url = imageUri;
  }

  const requestBody = JSON.stringify(body);
  console.log('Request body:', requestBody);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LTX_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/octet-stream',
    },
    body: requestBody,
  });

  if (!response.ok) {
    let errorMessage = `Generation failed (${response.status})`;
    try {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      const errorJson = JSON.parse(errorText);
      if (errorJson?.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      console.error('Could not parse error response');
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type') || '';
  console.log('Response content-type:', contentType);

  if (contentType.includes('application/json')) {
    const jsonResponse = await response.json();
    console.log('JSON response:', JSON.stringify(jsonResponse));

    if (jsonResponse.video_url || jsonResponse.url) {
      const videoUrl = jsonResponse.video_url || jsonResponse.url;
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();
      return await saveVideoBlob(videoBlob);
    }
    throw new Error('Unexpected API response format');
  }

  const videoBlob = await response.blob();
  return await saveVideoBlob(videoBlob);
}

async function saveVideoBlob(videoBlob: Blob): Promise<GenerationResult> {
  const videoDir = new Directory(Paths.cache, 'generated-videos');

  try {
    videoDir.create({ intermediates: true });
  } catch {
    console.log('Directory already exists');
  }

  const fileName = `video_${Date.now()}.mp4`;
  const videoFile = new File(videoDir, fileName);
  const arrayBuffer = await videoBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  videoFile.write(uint8Array);

  console.log('Video saved:', videoFile.uri);
  return { videoUri: videoFile.uri };
}

export default function VideoGenerationScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<GenerationMode>('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [duration, setDuration] = useState<Duration>(5);
  const [resolution, setResolution] = useState<Resolution>('1280x720');
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(generatedVideoUri || '', (p) => {
    if (generatedVideoUri) {
      p.loop = true;
      p.play();
    }
  });

  const mutation = useMutation({
    mutationFn: () => generateVideo(mode, prompt, duration, resolution, selectedImage ?? undefined),
    onSuccess: (result) => {
      console.log('Generation successful:', result.videoUri);
      setGeneratedVideoUri(result.videoUri);
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      Alert.alert('Generation Failed', error instanceof Error ? error.message : 'Unknown error');
    },
  });

  const isGenerating = mutation.isPending;

  React.useEffect(() => {
    if (isGenerating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isGenerating, pulseAnim]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      Alert.alert('Missing Prompt', 'Please enter a description for your video');
      return;
    }
    if (!LTX_API_KEY) {
      Alert.alert('API Key Required', 'Please configure your LTX API key');
      return;
    }
    if (mode === 'image-to-video' && !selectedImage) {
      Alert.alert('Missing Image', 'Please select an image first');
      return;
    }
    setGeneratedVideoUri(null);
    mutation.mutate();
  };

  const handleShare = async () => {
    if (!generatedVideoUri) return;
    try {
      if (Platform.OS !== 'web') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(generatedVideoUri, {
            mimeType: 'video/mp4',
            dialogTitle: 'Share your AI video',
          });
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share video');
    }
  };

  const clearVideo = () => {
    setGeneratedVideoUri(null);
    player.pause();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Sparkles size={24} color={colors.accent} />
        <Text style={styles.headerTitle}>Create Video</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modeSelector}>
          <Pressable
            style={[styles.modeBtn, mode === 'text-to-video' && styles.modeBtnActive]}
            onPress={() => setMode('text-to-video')}
          >
            <Type size={18} color={mode === 'text-to-video' ? colors.bg : colors.textSecondary} />
            <Text style={[styles.modeBtnText, mode === 'text-to-video' && styles.modeBtnTextActive]}>
              Text → Video
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'image-to-video' && styles.modeBtnActive]}
            onPress={() => setMode('image-to-video')}
          >
            <ImageIcon size={18} color={mode === 'image-to-video' ? colors.bg : colors.textSecondary} />
            <Text style={[styles.modeBtnText, mode === 'image-to-video' && styles.modeBtnTextActive]}>
              Image → Video
            </Text>
          </Pressable>
        </View>

        {mode === 'image-to-video' && (
          <View style={styles.section}>
            <Text style={styles.label}>Source Image</Text>
            {selectedImage ? (
              <View style={styles.selectedImageWrap}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <Pressable style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.imagePicker} onPress={pickImage}>
                <ImageIcon size={28} color={colors.textMuted} />
                <Text style={styles.imagePickerText}>Tap to select image</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>
            {mode === 'text-to-video' ? 'Describe your video' : 'Describe the motion'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              mode === 'text-to-video'
                ? "A majestic eagle soaring through clouds at sunset..."
                : "Clouds drifting slowly, gentle breeze..."
            }
            placeholderTextColor={colors.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingCard}>
            <Clock size={16} color={colors.accent} />
            <Text style={styles.settingLabel}>Duration</Text>
            <View style={styles.settingOptions}>
              {([5, 8] as Duration[]).map((d) => (
                <Pressable
                  key={d}
                  style={[styles.settingChip, duration === d && styles.settingChipActive]}
                  onPress={() => setDuration(d)}
                >
                  <Text style={[styles.settingChipText, duration === d && styles.settingChipTextActive]}>
                    {d}s
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingCard}>
            <Maximize size={16} color={colors.teal} />
            <Text style={styles.settingLabel}>Quality</Text>
            <View style={styles.settingOptions}>
              {(['1280x720', '1920x1080'] as Resolution[]).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.settingChip, resolution === r && styles.settingChipActive]}
                  onPress={() => setResolution(r)}
                >
                  <Text style={[styles.settingChipText, resolution === r && styles.settingChipTextActive]}>
                    {r === '1280x720' ? '720p' : '1080p'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Animated.View style={[styles.generateBtnInner, { opacity: pulseAnim }]}>
              <ActivityIndicator color={colors.bg} size="small" />
              <Text style={styles.generateBtnText}>Generating...</Text>
            </Animated.View>
          ) : (
            <View style={styles.generateBtnInner}>
              <Sparkles size={20} color={colors.bg} />
              <Text style={styles.generateBtnText}>Generate Video</Text>
            </View>
          )}
        </Pressable>

        {generatedVideoUri && Platform.OS !== 'web' && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Your Video</Text>
              <Pressable onPress={clearVideo} style={styles.clearBtn}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.videoWrap}>
              <VideoView
                player={player}
                style={styles.video}
                allowsFullscreen
                allowsPictureInPicture
              />
              <Pressable
                style={styles.playOverlay}
                onPress={() => (player.playing ? player.pause() : player.play())}
              >
                {!player.playing && <Play size={44} color="#ffffff" />}
              </Pressable>
            </View>
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <Download size={18} color="#fff" />
              <Text style={styles.shareBtnText}>Save & Share</Text>
            </Pressable>
          </View>
        )}

        {generatedVideoUri && Platform.OS === 'web' && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Your Video</Text>
              <Pressable onPress={clearVideo} style={styles.clearBtn}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.webNote}>
              <Text style={styles.webNoteText}>
                Video generated! Download available on mobile.
              </Text>
            </View>
          </View>
        )}
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
  contentContainer: {
    padding: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: colors.bg,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  imagePicker: {
    height: 140,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  selectedImageWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 110,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  settingCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  settingOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  settingChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  settingChipActive: {
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  settingChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  settingChipTextActive: {
    color: colors.accent,
  },
  generateBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: colors.accentDark,
    opacity: 0.7,
  },
  generateBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.bg,
  },
  resultCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  clearBtn: {
    padding: 4,
  },
  videoWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 14,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  webNote: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  webNoteText: {
    fontSize: 14,
    color: colors.teal,
    textAlign: 'center' as const,
  },
});
