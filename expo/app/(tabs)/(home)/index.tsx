import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { WEBSITE_URL } from '@/constants/api';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioReady, setAudioReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    const setupAudio = async () => {
      if (Platform.OS !== 'web') {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            interruptionModeIOS: InterruptionModeIOS.DuckOthers,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
          console.log('Audio mode configured for background playback');
        } catch (err) {
          console.error('Failed to configure audio:', err);
        } finally {
          setAudioReady(true);
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

  return (
    <View style={styles.container}>
      <View style={[styles.webHeader, { paddingTop: insets.top }]}>
        <View style={styles.webHeaderContent}>
          <Text style={styles.webHeaderTitle}>FMEO JAMs</Text>
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
            <Text style={styles.openBtnText}>Open FMEO JAMs</Text>
          </Pressable>
        </View>
      ) : !audioReady ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
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
          // @ts-ignore - allowsBackgroundMediaPlayback is supported but not typed
          allowsBackgroundMediaPlayback={true}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  webHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.accent,
    letterSpacing: -0.5,
  },
  webControls: {
    flexDirection: 'row',
    gap: 6,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
