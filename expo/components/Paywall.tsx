import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Video,
  Sparkles,
  Zap,
  Crown,
  Check,
  Star,
  Lock,
} from 'lucide-react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { colors } from '@/constants/colors';


const PRO_FEATURES = [
  'Unlimited AI video generations',
  'Up to 1080p resolution',
  '8-second max duration',
  'Text-to-video & Image-to-video',
  'Download & share videos',
  'Priority processing',
];

const PREMIUM_FEATURES = [
  'Everything in Pro',
  'Extended 15s video duration',
  'Batch generation',
  'No watermark',
  'Early access to new models',
  'Priority support',
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { subscribe, isSubscribing, restore, isRestoring } = useSubscription();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [fadeAnim, slideAnim, scaleAnim, glowAnim]);

  const handleSubscribe = (plan: 'pro' | 'premium') => {
    subscribe(plan);
  };

  const handleRestore = () => {
    restore();
    Alert.alert('Restore', 'Checking for previous purchases...');
  };

  return (
    <View style={[styles.container]}>
      <LinearGradient
        colors={['#0A0A0A', '#111111', '#1A1A1A']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={[styles.iconGlow, { opacity: glowAnim }]} />
          <View style={styles.heroIcon}>
            <Video size={36} color={colors.accent} />
          </View>
          <View style={styles.lockBadge}>
            <Lock size={12} color="#fff" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.titleSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>Unlock AI Video</Text>
          <Text style={styles.subtitle}>
            Create stunning AI-generated videos with cutting-edge LTX-2 Pro technology
          </Text>
        </Animated.View>

        <Animated.View style={[styles.plansSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Pressable
            style={({ pressed }) => [styles.planCard, styles.proPlan, pressed && styles.planPressed]}
            onPress={() => handleSubscribe('pro')}
            disabled={isSubscribing}
          >
            <View style={styles.planHeader}>
              <View style={styles.planBadge}>
                <Zap size={16} color={colors.bg} />
              </View>
              <View style={styles.planTitleWrap}>
                <Text style={styles.planName}>Pro</Text>
                <Text style={styles.planPrice}>$9.99<Text style={styles.planPeriod}>/month</Text></Text>
              </View>
              {isSubscribing ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>Subscribe</Text>
                </View>
              )}
            </View>
            <View style={styles.featuresList}>
              {PRO_FEATURES.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Check size={14} color={colors.accent} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.planCard, styles.premiumPlan, pressed && styles.planPressed]}
            onPress={() => handleSubscribe('premium')}
            disabled={isSubscribing}
          >
            <View style={styles.popularBadge}>
              <Star size={10} color={colors.bg} />
              <Text style={styles.popularText}>BEST VALUE</Text>
            </View>
            <View style={styles.planHeader}>
              <View style={[styles.planBadge, styles.premiumBadge]}>
                <Crown size={16} color={colors.bg} />
              </View>
              <View style={styles.planTitleWrap}>
                <Text style={styles.planName}>Premium</Text>
                <Text style={styles.planPrice}>$19.99<Text style={styles.planPeriod}>/month</Text></Text>
              </View>
              {isSubscribing ? (
                <ActivityIndicator color={colors.coral} size="small" />
              ) : (
                <View style={[styles.selectBtn, styles.premiumSelectBtn]}>
                  <Text style={[styles.selectBtnText, styles.premiumSelectBtnText]}>Subscribe</Text>
                </View>
              )}
            </View>
            <View style={styles.featuresList}>
              {PREMIUM_FEATURES.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Sparkles size={14} color={colors.coral} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Animated.View>

        <View style={styles.footer}>
          <Pressable onPress={handleRestore} disabled={isRestoring} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>
              {isRestoring ? 'Restoring...' : 'Restore Purchase'}
            </Text>
          </Pressable>
          <Text style={styles.legalText}>
            Subscription auto-renews monthly. Cancel anytime in Settings.
          </Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent,
    opacity: 0.15,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: 'rgba(229, 25, 42, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 25, 42, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: '38%' as any,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    maxWidth: 300,
  },
  plansSection: {
    gap: 16,
    marginBottom: 28,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  proPlan: {
    borderColor: 'rgba(229, 25, 42, 0.25)',
  },
  premiumPlan: {
    borderColor: 'rgba(255, 77, 77, 0.3)',
    backgroundColor: '#161616',
  },
  planPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.coral,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 18,
  },
  popularText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: colors.bg,
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  planBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    backgroundColor: colors.coral,
  },
  planTitleWrap: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.text,
    marginTop: 2,
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  selectBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  premiumSelectBtn: {
    backgroundColor: colors.coral,
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.bg,
  },
  premiumSelectBtnText: {
    color: '#fff',
  },
  featuresList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  restoreBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  restoreText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600' as const,
  },
  legalText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 16,
  },
});
