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
  ChevronDown,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMutation } from '@tanstack/react-query';
import { File, Directory, Paths } from 'expo-file-system';

const LTX_API_KEY = process.env.EXPO_PUBLIC_LTX_API_KEY || '';

type GenerationMode = 'text-to-video' | 'image-to-video';
type Resolution = '1280x720' | '1920x1080';
type Duration = 5 | 8;

interface GenerationResult {
  videoUri: string;
}

async function generateTextToVideo(
  prompt: string,
  duration: Duration,
  resolution: Resolution
): Promise<GenerationResult> {
  console.log('Starting text-to-video generation:', { prompt, duration, resolution });
  
  if (!LTX_API_KEY) {
    throw new Error('LTX API key is not configured');
  }

  const response = await fetch('https://api.ltx.video/v1/text-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LTX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model: 'ltx-2-pro',
      duration,
      resolution,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API error:', response.status, errorText);
    throw new Error(`Generation failed: ${response.status}`);
  }

  const videoBlob = await response.blob();
  const videoDir = new Directory(Paths.cache, 'generated-videos');
  
  try {
    videoDir.create({ intermediates: true });
  } catch {
    console.log('Directory might already exist');
  }

  const fileName = `video_${Date.now()}.mp4`;
  const videoFile = new File(videoDir, fileName);
  
  const arrayBuffer = await videoBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  videoFile.write(uint8Array);

  console.log('Video saved to:', videoFile.uri);
  return { videoUri: videoFile.uri };
}

async function generateImageToVideo(
  imageUri: string,
  prompt: string,
  duration: Duration,
  resolution: Resolution
): Promise<GenerationResult> {
  console.log('Starting image-to-video generation:', { imageUri, prompt, duration, resolution });
  
  if (!LTX_API_KEY) {
    throw new Error('LTX API key is not configured');
  }

  const response = await fetch('https://api.ltx.video/v1/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LTX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_uri: imageUri,
      prompt,
      model: 'ltx-2-pro',
      duration,
      resolution,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API error:', response.status, errorText);
    throw new Error(`Generation failed: ${response.status}`);
  }

  const videoBlob = await response.blob();
  const videoDir = new Directory(Paths.cache, 'generated-videos');
  
  try {
    videoDir.create({ intermediates: true });
  } catch {
    console.log('Directory might already exist');
  }

  const fileName = `video_${Date.now()}.mp4`;
  const videoFile = new File(videoDir, fileName);
  
  const arrayBuffer = await videoBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  videoFile.write(uint8Array);

  console.log('Video saved to:', videoFile.uri);
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
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showResolutionPicker, setShowResolutionPicker] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(generatedVideoUri || '', (p) => {
    if (generatedVideoUri) {
      p.loop = true;
      p.play();
    }
  });

  const textToVideoMutation = useMutation({
    mutationFn: () => generateTextToVideo(prompt, duration, resolution),
    onSuccess: (result) => {
      console.log('Text-to-video generation successful:', result.videoUri);
      setGeneratedVideoUri(result.videoUri);
    },
    onError: (error) => {
      console.error('Text-to-video generation failed:', error);
      Alert.alert('Generation Failed', error instanceof Error ? error.message : 'Unknown error');
    },
  });

  const imageToVideoMutation = useMutation({
    mutationFn: () => generateImageToVideo(selectedImage!, prompt, duration, resolution),
    onSuccess: (result) => {
      console.log('Image-to-video generation successful:', result.videoUri);
      setGeneratedVideoUri(result.videoUri);
    },
    onError: (error) => {
      console.error('Image-to-video generation failed:', error);
      Alert.alert('Generation Failed', error instanceof Error ? error.message : 'Unknown error');
    },
  });

  const isGenerating = textToVideoMutation.isPending || imageToVideoMutation.isPending;

  React.useEffect(() => {
    if (isGenerating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
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
      console.log('Image selected:', result.assets[0].uri);
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

    if (mode === 'text-to-video') {
      textToVideoMutation.mutate();
    } else {
      imageToVideoMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (!generatedVideoUri) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(generatedVideoUri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Share your AI video',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
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
        <Sparkles size={28} color="#6366f1" />
        <Text style={styles.headerTitle}>AI Video Generator</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modeSelector}>
          <Pressable
            style={[styles.modeButton, mode === 'text-to-video' && styles.modeButtonActive]}
            onPress={() => setMode('text-to-video')}
          >
            <Type size={20} color={mode === 'text-to-video' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.modeButtonText, mode === 'text-to-video' && styles.modeButtonTextActive]}>
              Text to Video
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === 'image-to-video' && styles.modeButtonActive]}
            onPress={() => setMode('image-to-video')}
          >
            <ImageIcon size={20} color={mode === 'image-to-video' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.modeButtonText, mode === 'image-to-video' && styles.modeButtonTextActive]}>
              Image to Video
            </Text>
          </Pressable>
        </View>

        {mode === 'image-to-video' && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>Source Image</Text>
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <Pressable style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
                  <X size={16} color="#ffffff" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.imagePickerButton} onPress={pickImage}>
                <ImageIcon size={32} color="#9ca3af" />
                <Text style={styles.imagePickerText}>Tap to select an image</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.promptSection}>
          <Text style={styles.sectionLabel}>
            {mode === 'text-to-video' ? 'Describe your video' : 'Describe the motion'}
          </Text>
          <TextInput
            style={styles.promptInput}
            placeholder={
              mode === 'text-to-video'
                ? "A majestic eagle soaring through clouds at sunset..."
                : "Clouds drifting slowly, gentle breeze moving leaves..."
            }
            placeholderTextColor="#9ca3af"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Duration</Text>
            <Pressable 
              style={styles.settingButton}
              onPress={() => setShowDurationPicker(!showDurationPicker)}
            >
              <Clock size={16} color="#6366f1" />
              <Text style={styles.settingValue}>{duration}s</Text>
              <ChevronDown size={16} color="#6b7280" />
            </Pressable>
            {showDurationPicker && (
              <View style={styles.pickerDropdown}>
                {([5, 8] as Duration[]).map((d) => (
                  <Pressable
                    key={d}
                    style={[styles.pickerOption, duration === d && styles.pickerOptionActive]}
                    onPress={() => {
                      setDuration(d);
                      setShowDurationPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, duration === d && styles.pickerOptionTextActive]}>
                      {d} seconds
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Resolution</Text>
            <Pressable 
              style={styles.settingButton}
              onPress={() => setShowResolutionPicker(!showResolutionPicker)}
            >
              <Maximize size={16} color="#6366f1" />
              <Text style={styles.settingValue}>{resolution === '1280x720' ? '720p' : '1080p'}</Text>
              <ChevronDown size={16} color="#6b7280" />
            </Pressable>
            {showResolutionPicker && (
              <View style={styles.pickerDropdown}>
                {(['1280x720', '1920x1080'] as Resolution[]).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.pickerOption, resolution === r && styles.pickerOptionActive]}
                    onPress={() => {
                      setResolution(r);
                      setShowResolutionPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, resolution === r && styles.pickerOptionTextActive]}>
                      {r === '1280x720' ? '720p HD' : '1080p Full HD'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Animated.View style={[styles.generateButtonContent, { opacity: pulseAnim }]}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.generateButtonText}>Generating...</Text>
            </Animated.View>
          ) : (
            <View style={styles.generateButtonContent}>
              <Sparkles size={20} color="#ffffff" />
              <Text style={styles.generateButtonText}>Generate Video</Text>
            </View>
          )}
        </Pressable>

        {generatedVideoUri && Platform.OS !== 'web' && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Your Generated Video</Text>
              <Pressable onPress={clearVideo} style={styles.clearButton}>
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <View style={styles.videoContainer}>
              <VideoView
                player={player}
                style={styles.video}
                allowsFullscreen
                allowsPictureInPicture
              />
              <Pressable style={styles.playOverlay} onPress={() => player.playing ? player.pause() : player.play()}>
                {!player.playing && <Play size={48} color="#ffffff" />}
              </Pressable>
            </View>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Download size={20} color="#ffffff" />
              <Text style={styles.shareButtonText}>Save & Share</Text>
            </Pressable>
          </View>
        )}

        {generatedVideoUri && Platform.OS === 'web' && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Your Generated Video</Text>
              <Pressable onPress={clearVideo} style={styles.clearButton}>
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <View style={styles.webVideoNote}>
              <Text style={styles.webVideoNoteText}>
                Video generated successfully! Download available on mobile devices.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  modeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },
  imageSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  imagePickerButton: {
    height: 160,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  selectedImageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptSection: {
    marginBottom: 20,
  },
  promptInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  settingItem: {
    flex: 1,
    position: 'relative',
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6b7280',
    marginBottom: 6,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  settingValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  pickerDropdown: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionActive: {
    backgroundColor: '#f0f1ff',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  pickerOptionTextActive: {
    color: '#6366f1',
    fontWeight: '600' as const,
  },
  generateButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  resultSection: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#1f2937',
  },
  clearButton: {
    padding: 4,
  },
  videoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 14,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  webVideoNote: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
  },
  webVideoNoteText: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
  },
});
