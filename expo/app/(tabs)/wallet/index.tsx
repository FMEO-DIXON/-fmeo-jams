import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { canOpenURL, openURL } from 'expo-linking';
import {
  Wallet,
  LogOut,
  Copy,
  Check,
  Coins,
  Image as ImageIcon,
  Shield,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useXaman } from '@/hooks/useXaman';
import {
  createNFTMintPayload,
  createTokenPayload,
  getXamanDeepLink,
  getXummSignUrl,
  isXummConfigured,
} from '@/services/xumm';

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function XRPLAmount(drops: string): string {
  const xrp = parseInt(drops, 10) / 1_000_000;
  return xrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading: isLoading, error, login, logout, clearError } = useXaman();
  const [copied, setCopied] = useState(false);
  const [mintUri, setMintUri] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const handleLogin = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void login();
  }, [login]);

  const handleLogout = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logout();
  }, [logout]);

  const handleCopyAddress = useCallback(() => {
    if (!user?.address) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Clipboard not imported to keep it simple — show visual feedback
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [user]);

  const handleMintNFT = useCallback(async () => {
    if (!user?.address || !mintUri.trim()) return;
    try {
      setIsMinting(true);
      setTxStatus(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const payload = await createNFTMintPayload(user.address, mintUri.trim());
      const deepLink = getXamanDeepLink(payload.uuid);

      const canOpen = await canOpenURL(deepLink);
      if (canOpen) {
        await openURL(deepLink);
      } else {
        await openURL(getXummSignUrl(payload.uuid));
      }

      setTxStatus('NFT mint request sent. Open Xaman to sign.');
      setMintUri('');
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    } finally {
      setIsMinting(false);
    }
  }, [user, mintUri]);

  const handleCreateToken = useCallback(async () => {
    if (!user?.address || !tokenSymbol.trim() || !tokenAmount.trim()) return;
    try {
      setIsCreatingToken(true);
      setTxStatus(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const payload = await createTokenPayload(user.address, tokenSymbol.trim(), tokenAmount.trim());
      const deepLink = getXamanDeepLink(payload.uuid);

      const canOpen = await canOpenURL(deepLink);
      if (canOpen) {
        await openURL(deepLink);
      } else {
        await openURL(getXummSignUrl(payload.uuid));
      }

      setTxStatus('Token creation request sent. Open Xaman to sign.');
      setTokenSymbol('');
      setTokenAmount('');
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    } finally {
      setIsCreatingToken(false);
    }
  }, [user, tokenSymbol, tokenAmount]);

  const configured = isXummConfigured();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#151515', '#0E0E0E', '#0A0A0A']} style={StyleSheet.absoluteFillObject} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.greeting}>Wallet</Text>
        <Text style={styles.brandTitle}>XRPL</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Not connected state */}
        {!user && (
          <View style={styles.connectSection}>
            <View style={styles.iconCircle}>
              <Shield size={40} color={colors.accent} />
            </View>
            <Text style={styles.connectTitle}>Connect Your Wallet</Text>
            <Text style={styles.connectSubtitle}>
              Sign in with Xaman to access your XRPL wallet, mint NFTs, and create tokens on the XRP Ledger.
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={clearError} style={styles.errorDismiss}>
                  <Text style={styles.errorDismissText}>Dismiss</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.connectBtn,
                pressed && styles.connectBtnPressed,
                (!configured || isLoading) && styles.connectBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={!configured || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Wallet size={20} color={colors.text} />
                  <Text style={styles.connectBtnText}>Connect with Xaman</Text>
                </>
              )}
            </Pressable>

            {!configured && (
              <Text style={styles.configNote}>
                Xumm API key not configured. Add EXPO_PUBLIC_XUMM_API_KEY to your environment.
              </Text>
            )}
          </View>
        )}

        {/* Connected state */}
        {user && (
          <View style={styles.connectedSection}>
            {/* Account card */}
            <View style={styles.accountCard}>
              <LinearGradient
                colors={['#E5192A', '#8B0000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.accountCardBg}
              />
              <View style={styles.accountCardContent}>
                <View style={styles.accountHeader}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountAvatarText}>
                      {user.address.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{user.name}</Text>
                    <Pressable onPress={handleCopyAddress} style={styles.addressRow}>
                      <Text style={styles.accountAddress}>{shortenAddress(user.address)}</Text>
                      {copied ? (
                        <Check size={14} color={colors.text} />
                      ) : (
                        <Copy size={14} color="rgba(255,255,255,0.7)" />
                      )}
                    </Pressable>
                  </View>
                </View>

                {user.accountInfo && (
                  <View style={styles.balanceRow}>
                    <View style={styles.balanceItem}>
                      <Text style={styles.balanceLabel}>XRP Balance</Text>
                      <Text style={styles.balanceValue}>
                        {XRPLAmount(user.accountInfo.balance)}
                      </Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                      <Text style={styles.balanceLabel}>Sequence</Text>
                      <Text style={styles.balanceValue}>{user.accountInfo.sequence}</Text>
                    </View>
                  </View>
                )}

                <Pressable onPress={handleLogout} style={styles.logoutBtn}>
                  <LogOut size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.logoutText}>Disconnect</Text>
                </Pressable>
              </View>
            </View>

            {/* Transaction status */}
            {txStatus && (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{txStatus}</Text>
              </View>
            )}

            {/* Mint NFT */}
            <View style={styles.actionSection}>
              <View style={styles.actionHeader}>
                <ImageIcon size={18} color={colors.accent} />
                <Text style={styles.actionTitle}>Mint NFT</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="IPFS URI or metadata URL"
                placeholderTextColor={colors.textMuted}
                value={mintUri}
                onChangeText={setMintUri}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                  (!mintUri.trim() || isMinting) && styles.actionBtnDisabled,
                ]}
                onPress={handleMintNFT}
                disabled={!mintUri.trim() || isMinting}
              >
                {isMinting ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.actionBtnText}>Mint NFT on XRPL</Text>
                )}
              </Pressable>
            </View>

            {/* Create Token */}
            <View style={styles.actionSection}>
              <View style={styles.actionHeader}>
                <Coins size={18} color={colors.accent} />
                <Text style={styles.actionTitle}>Create Token</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Symbol"
                  placeholderTextColor={colors.textMuted}
                  value={tokenSymbol}
                  onChangeText={(t) => setTokenSymbol(t.toUpperCase().slice(0, 3))}
                  autoCapitalize="characters"
                  maxLength={3}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Amount"
                  placeholderTextColor={colors.textMuted}
                  value={tokenAmount}
                  onChangeText={setTokenAmount}
                  keyboardType="numeric"
                />
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                  (!tokenSymbol.trim() || !tokenAmount.trim() || isCreatingToken) && styles.actionBtnDisabled,
                ]}
                onPress={handleCreateToken}
                disabled={!tokenSymbol.trim() || !tokenAmount.trim() || isCreatingToken}
              >
                {isCreatingToken ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.actionBtnText}>Create Token on XRPL</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Network info */}
        <View style={styles.networkNote}>
          <Text style={styles.networkText}>
            Connected to XRPL Testnet — no real funds are used.
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.accent,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  connectSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(229, 25, 42, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 25, 42, 0.2)',
  },
  connectTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  connectSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    lineHeight: 18,
  },
  errorDismiss: {
    alignSelf: 'flex-end' as const,
  },
  errorDismissText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600' as const,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    marginTop: 4,
  },
  connectBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  connectBtnDisabled: {
    opacity: 0.5,
  },
  connectBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  configNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 17,
  },
  connectedSection: {
    paddingHorizontal: 20,
    gap: 20,
  },
  accountCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  accountCardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  accountCardContent: {
    padding: 20,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: colors.text,
  },
  accountInfo: {
    flex: 1,
    gap: 4,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  balanceItem: {
    flex: 1,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  balanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end' as const,
  },
  logoutText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600' as const,
  },
  statusBox: {
    backgroundColor: 'rgba(229, 25, 42, 0.08)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(229, 25, 42, 0.2)',
  },
  statusText: {
    fontSize: 13,
    color: colors.accentLight,
    lineHeight: 18,
  },
  actionSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  actionBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center' as const,
    justifyContent: 'center',
    minHeight: 44,
  },
  actionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  networkNote: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center' as const,
  },
  networkText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 16,
  },
});
