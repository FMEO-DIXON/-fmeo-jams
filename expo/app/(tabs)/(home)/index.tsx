import { 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle,
  ExternalLink 
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const WEBSITE_URL = 'https://synthesis.serapiscode.com/?usrtv=MzEz';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const setupAudio = async () => {
      if (Platform.OS !== 'web') {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });
          console.log('Audio mode configured for background playback');
        } catch (err) {
          console.error('Failed to configure audio mode:', err);
        }
      }
    };

    setupAudio();
  }, []);

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
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
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>FMEO JAMS</Text>
          <View style={styles.controls}>
            {Platform.OS !== 'web' && (
              <>
                <Pressable
                  onPress={handleGoBack}
                  disabled={!canGoBack}
                  style={[styles.controlButton, !canGoBack && styles.controlButtonDisabled]}
                >
                  <ArrowLeft 
                    size={20} 
                    color={canGoBack ? '#6366f1' : '#9ca3af'} 
                  />
                </Pressable>
                <Pressable
                  onPress={handleGoForward}
                  disabled={!canGoForward}
                  style={[styles.controlButton, !canGoForward && styles.controlButtonDisabled]}
                >
                  <ArrowRight 
                    size={20} 
                    color={canGoForward ? '#6366f1' : '#9ca3af'} 
                  />
                </Pressable>
              </>
            )}
            <Pressable
              onPress={Platform.OS === 'web' ? openInBrowser : handleRefresh}
              style={styles.controlButton}
            >
              {Platform.OS === 'web' ? (
                <ExternalLink size={20} color="#6366f1" />
              ) : (
                <RefreshCw size={20} color="#6366f1" />
              )}
            </Pressable>
          </View>
        </View>
        {Platform.OS !== 'web' && loading && progress > 0 && progress < 1 && (
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${Math.round(progress * 100)}%` as any }
              ]} 
            />
          </View>
        )}
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webFallbackContainer}>
          <Text style={styles.webFallbackTitle}>Web Preview</Text>
          <Text style={styles.webFallbackMessage}>
            This app uses WebView which is not supported in web browsers. 
            Click the external link button to open the website in your browser.
          </Text>
          <Pressable onPress={openInBrowser} style={styles.openBrowserButton}>
            <ExternalLink size={20} color="#ffffff" />
            <Text style={styles.openBrowserButtonText}>Open in Browser</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorMessage}>
            Please check your internet connection and try again.
          </Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: WEBSITE_URL }}
          style={styles.webview}
          originWhitelist={['*']}
          scalesPageToFit={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          cacheEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          mixedContentMode="compatibility"
          setSupportMultipleWindows={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={true}
          bounces={true}
          scrollEnabled={true}
          contentMode="mobile"
          injectedJavaScript={`
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            document.getElementsByTagName('head')[0].appendChild(meta);
            true;
          `}
          onLoadStart={() => {
            console.log('WebView onLoadStart');
            setLoading(true);
            setError(false);
          }}
          onLoadEnd={() => {
            console.log('WebView onLoadEnd');
            setLoading(false);
          }}
          onLoadProgress={({ nativeEvent }) => {
            console.log('WebView progress:', nativeEvent.progress);
            setProgress(nativeEvent.progress);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView onError:', nativeEvent);
            setError(true);
            setLoading(false);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView onHttpError:', nativeEvent.statusCode);
            setError(true);
            setLoading(false);
          }}
          onNavigationStateChange={(navState) => {
            console.log('WebView navigation state:', navState);
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading Synthesis...</Text>
            </View>
          )}
          allowsBackForwardNavigationGestures={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: '#e5e7eb',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  webFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  webFallbackMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  openBrowserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  openBrowserButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
});
