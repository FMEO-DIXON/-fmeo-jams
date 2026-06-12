import { useXumm } from '@/providers/XummProvider';

/**
 * useXaman — drop-in hook matching the browser SDK interface
 * ({ user, login, logout, loading, error }), but backed by the
 * mobile-correct Xaman payload + deep-link flow (the browser `xumm`
 * SDK cannot run in React Native).
 *
 * `user.address` is the connected XRPL account; `user.accountInfo`
 * carries balance/sequence pulled from the XRPL testnet.
 */
export function useXaman() {
  const { user, isLoading, error, login, logout, clearError } = useXumm();

  return {
    user,
    login,
    logout,
    loading: isLoading,
    error,
    clearError,
  };
}
