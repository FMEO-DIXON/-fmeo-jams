import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Music,
  Video,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { WEBSITE_URL } from '@/constants/api';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showWebView, setShowWebView] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const setupAudio = async () => {
      if (Platform.OS !== 'web') {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });
          console.log('Audio mode configured');
        } catch (err) {
          console.error('Failed to configure audio:', err);
        }
      }
    };
    void setupAudio();
  }, []);

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) webViewRef.current.goBack();
  };

  const handleGoForward = () => {
    if (webViewRef.current && canGoForward) webViewRef.current.goForward();
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      setError(false);
      webViewRef.current.reload();
    }
  };

  const openInBrowser = async () => {
    try {
      await Linking.openURL(WEBSITE_URL);
    } catch (err) {
      console.error('Failed to open URL:', err);
    }
  };

  if (showWebView) {
    return (
      <View style={styles.container}>
        <View style={[styles.webHeader, { paddingTop: insets.top }]}>
          <View style={styles.webHeaderContent}>
            <Pressable onPress={() => setShowWebView(false)} style={styles.backButton}>
              <ArrowLeft size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.webHeaderTitle}>Synthesis</Text>
            <View style={styles.webControls}>
              {Platform.OS !== 'web' && (
                <>
                  <Pressable
                    onPress={handleGoBack}
                    disabled={!canGoBack}
                    style={[styles.controlBtn, !canGoBack && styles.controlBtnDisabled]}
                  >
                    <ArrowLeft size={18} color={canGoBack ? colors.accent : colors.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={handleGoForward}
                    disabled={!canGoForward}
                    style={[styles.controlBtn, !canGoForward && styles.controlBtnDisabled]}
                  >
                    <ArrowRight size={18} color={canGoForward ? colors.accent : colors.textMuted} />
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={Platform.OS === 'web' ? openInBrowser : handleRefresh}
                style={styles.controlBtn}
              >
                {Platform.OS === 'web' ? (
                  <ExternalLink size={18} color={colors.accent} />
                ) : (
                  <RefreshCw size={18} color={colors.accent} />
                )}
              </Pressable>
            </View>
          </View>
          {Platform.OS !== 'web' && loading && progress > 0 && progress < 1 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` as any }]} />
            </View>
          )}
        </View>

        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <ExternalLink size={40} color={colors.accent} />
            <Text style={styles.webFallbackTitle}>Open in Browser</Text>
            <Text style={styles.webFallbackMsg}>
              WebView isn't supported in web browsers. Tap below to open the site.
            </Text>
            <Pressable onPress={openInBrowser} style={styles.openBtn}>
              <Text style={styles.openBtnText}>Open Synthesis</Text>
            </Pressable>
          </View>
        ) : error ? (
          <View style={styles.webFallback}>
            <AlertCircle size={40} color={colors.error} />
            <Text style={styles.webFallbackTitle}>Unable to Load</Text>
            <Text style={styles.webFallbackMsg}>Check your connection and try again.</Text>
            <Pressable onPress={handleRefresh} style={styles.openBtn}>
              <Text style={styles.openBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: WEBSITE_URL }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            cacheEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            setSupportMultipleWindows={false}
            contentMode="mobile"
            injectedJavaScript={`
              const meta = document.createElement('meta');
              meta.setAttribute('name', 'viewport');
              meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
              document.getElementsByTagName('head')[0].appendChild(meta);
              true;
            `}
            onLoadStart={() => { setLoading(true); setError(false); }}
            onLoadEnd={() => setLoading(false)}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onError={() => { setError(true); setLoading(false); }}
            onHttpError={() => { setError(true); setLoading(false); }}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              setCanGoForward(navState.canGoForward);
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            )}
            allowsBackForwardNavigationGestures
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Music size={24} color={colors.bg} />
            </View>
            <View>
              <Text style={styles.brandName}>FMEO JAMS</Text>
              <Text style={styles.brandTagline}>Create. Generate. Share.</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.cardsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Pressable
            style={({ pressed }) => [styles.featureCard, styles.cardSynthesis, pressed && styles.cardPressed]}
            onPress={() => setShowWebView(true)}
          >
            <View style={styles.cardIconWrap}>
              <Music size={28} color={colors.accent} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Synthesis Platform</Text>
              <Text style={styles.cardDesc}>Access the full Synthesis experience — music, beats, and more.</Text>
            </View>
            <View style={styles.cardArrow}>
              <ArrowRight size={20} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.featureCard, styles.cardVideo, pressed && styles.cardPressed]}
            onPress={() => router.push('/video')}
          >
            <View style={[styles.cardIconWrap, styles.cardIconVideo]}>
              <Video size={28} color={colors.teal} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>AI Video Generator</Text>
              <Text style={styles.cardDesc}>Turn text or images into stunning AI-generated videos.</Text>
            </View>
            <View style={styles.cardArrow}>
              <ArrowRight size={20} color={colors.textMuted} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Zap size={20} color={colors.accent} />
              <Text style={styles.statValue}>LTX-2 Pro</Text>
              <Text style={styles.statLabel}>AI Model</Text>
            </View>
            <View style={styles.statCard}>
              <Video size={20} color={colors.teal} />
              <Text style={styles.statValue}>1080p</Text>
              <Text style={styles.statLabel}>Max Resolution</Text>
            </View>
            <View style={styles.statCard}>
              <Music size={20} color={colors.coral} />
              <Text style={styles.statValue}>8s</Text>
              <Text style={styles.statLabel}>Max Duration</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardsSection: {
    gap: 14,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  cardSynthesis: {},
  cardVideo: {},
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconVideo: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardArrow: {
    padding: 4,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  webHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
  },
  webControls: {
    flexDirection: 'row',
    gap: 6,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  progressContainer: {
    height: 2,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  webFallbackTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
  },
  webFallbackMsg: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  openBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    borderRadius: 14,
  },
  openBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.bg,
  },
});
