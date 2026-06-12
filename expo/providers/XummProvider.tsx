import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as Haptics from 'expo-haptics';
import {
  createSignInPayload,
  getPayloadStatus,
  getAccountInfo,
  getXamanDeepLink,
  getXummSignUrl,
  isXummConfigured,
  XummAccountInfo,
} from '@/services/xumm';

export interface XummUser {
  address: string;
  name: string;
  accountInfo: XummAccountInfo | null;
}

export const [XummProvider, useXumm] = createContextHook(() => {
  const [user, setUser] = useState<XummUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const fetchAccountInfo = useCallback(async (address: string): Promise<XummAccountInfo | null> => {
    try {
      const info = await getAccountInfo(address);
      return info;
    } catch (err) {
      console.warn('Failed to fetch XRPL account info:', err);
      return null;
    }
  }, []);

  const login = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      if (!isXummConfigured()) {
        setError('Xumm API key is missing. Please set EXPO_PUBLIC_XUMM_API_KEY.');
        setIsLoading(false);
        return;
      }

      console.log('Creating Xumm sign-in payload...');
      const payload = await createSignInPayload();
      console.log('Payload created:', payload.uuid);

      const deepLink = getXamanDeepLink(payload.uuid);
      const universalUrl = getXummSignUrl(payload.uuid);

      // Try opening Xaman via deep link first, fall back to universal link
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
      } else {
        await Linking.openURL(universalUrl);
      }

      // Start polling for the payload result
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getPayloadStatus(payload.uuid);

          if (status.meta.resolved) {
            stopPolling();

            if (status.meta.signed && status.response.account) {
              const address = status.response.account;
              const accountInfo = await fetchAccountInfo(address);

              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              setUser({
                address,
                name: `XRPL User`,
                accountInfo,
              });
              setError(null);
            } else if (status.meta.cancelled) {
              setError('Sign-in was cancelled.');
            } else if (status.meta.expired) {
              setError('Sign-in request expired. Please try again.');
            } else {
              setError('Sign-in was not completed.');
            }
            setIsLoading(false);
          }
        } catch (err: any) {
          stopPolling();
          setIsLoading(false);
          setError(err.message || 'Failed to check sign-in status.');
          console.error('Polling error:', err);
        }
      }, 2000);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to connect to Xaman.');
      console.error('Login error:', err);
    }
  }, [stopPolling, fetchAccountInfo]);

  const logout = useCallback(() => {
    stopPolling();
    setUser(null);
    setError(null);
    setIsLoading(false);
  }, [stopPolling]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    error,
    login,
    logout,
    clearError,
  }), [user, isLoading, error, login, logout, clearError]);
});
