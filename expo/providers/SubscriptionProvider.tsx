import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const SUBSCRIPTION_KEY = 'fmeo_subscription';

interface SubscriptionData {
  isSubscribed: boolean;
  plan: 'free' | 'pro' | 'premium';
  subscribedAt: string | null;
  expiresAt: string | null;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  isSubscribed: false,
  plan: 'free',
  subscribedAt: null,
  expiresAt: null,
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [subscription, setSubscription] = useState<SubscriptionData>(DEFAULT_SUBSCRIPTION);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: async (): Promise<SubscriptionData> => {
      try {
        const stored = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SubscriptionData;
          if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
            console.log('Subscription expired');
            return DEFAULT_SUBSCRIPTION;
          }
          return parsed;
        }
      } catch (err) {
        console.error('Failed to load subscription:', err);
      }
      return DEFAULT_SUBSCRIPTION;
    },
  });

  useEffect(() => {
    if (subscriptionQuery.data) {
      setSubscription(subscriptionQuery.data);
    }
  }, [subscriptionQuery.data]);

  const subscribeMutation = useMutation({
    mutationFn: async (plan: 'pro' | 'premium'): Promise<SubscriptionData> => {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const newSub: SubscriptionData = {
        isSubscribed: true,
        plan,
        subscribedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(newSub));
      console.log('Subscription activated:', plan);
      return newSub;
    },
    onSuccess: (data) => {
      setSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (): Promise<SubscriptionData> => {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SubscriptionData;
        if (parsed.isSubscribed) {
          return parsed;
        }
      }
      throw new Error('No active subscription found');
    },
    onSuccess: (data) => {
      setSubscription(data);
    },
  });

  const subscribe = useCallback((plan: 'pro' | 'premium') => {
    subscribeMutation.mutate(plan);
  }, [subscribeMutation]);

  const restore = useCallback(() => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  return useMemo(() => ({
    subscription,
    isSubscribed: subscription.isSubscribed,
    plan: subscription.plan,
    subscribe,
    restore,
    isLoading: subscriptionQuery.isLoading,
    isSubscribing: subscribeMutation.isPending,
    isRestoring: restoreMutation.isPending,
  }), [subscription, subscribe, restore, subscriptionQuery.isLoading, subscribeMutation.isPending, restoreMutation.isPending]);
});
