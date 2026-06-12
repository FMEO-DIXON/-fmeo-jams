import { Platform } from 'react-native';

const XUMM_API_KEY = process.env.EXPO_PUBLIC_XUMM_API_KEY || '';
const XUMM_API_SECRET = process.env.XUMM_API_SECRET || '';

const XUMM_BASE = 'https://xumm.app/api/v1/platform';

export interface XummPayloadResponse {
  uuid: string;
  next: { always: string };
  refs: {
    qr_png: string;
    qr_matrix: string;
    qr_uri_quality_opts: string[];
    websocket_status: string;
  };
  pushed: boolean;
}

export interface XummPayloadStatus {
  meta: {
    exists: boolean;
    uuid: string;
    multisign: boolean;
    submitted: boolean;
    signed: boolean;
    cancelled: boolean;
    expired: boolean;
    pushed: boolean;
    resolved: boolean;
    return_url_app: string | null;
    return_url_web: string | null;
  };
  application: {
    name: string;
    description: string;
    uuidv4: string;
    icon_url: string;
    issued_user_token: string | null;
  };
  payload: {
    tx_type: string;
    tx_destination: string;
    tx_destination_tag: number | null;
    request_json: Record<string, unknown>;
    origintype: string;
    signmethod: string;
    created_at: string;
    expires_at: string;
    expires_in_seconds: number;
  };
  response: {
    hex: string | null;
    txid: string | null;
    resolved_at: string | null;
    account: string | null;
    signer: string | null;
    environment_nodetype: string | null;
    environment_nodeuri: string | null;
  };
}

export interface XummAccountInfo {
  account: string;
  balance: string;
  flags: number;
  ledgerEntryType: string;
  ownerCount: number;
  previousTxnID: string;
  previousTxnLgrSeq: number;
  sequence: number;
  index: string;
}

function authHeaders(): Record<string, string> {
  if (!XUMM_API_KEY) {
    throw new Error('Xumm API key is not configured. Please set EXPO_PUBLIC_XUMM_API_KEY.');
  }
  return {
    'X-API-Key': XUMM_API_KEY,
    'X-API-Secret': XUMM_API_SECRET,
    'Content-Type': 'application/json',
  };
}

/**
 * Creates a SignIn payload on the Xumm platform.
 * Returns the payload UUID and QR/deep-link info so the user can sign via Xaman.
 */
export async function createSignInPayload(): Promise<XummPayloadResponse> {
  const response = await fetch(`${XUMM_BASE}/payload`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      txjson: { TransactionType: 'SignIn' },
      options: {
        submit: false,
        expire: 15,
        return_url: {
          app: 'fmeojams://',
          web: 'https://xumm.app',
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Xumm create payload error:', response.status, errorText);
    throw new Error(`Failed to create Xumm payload: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches the current status of a Xumm payload by UUID.
 */
export async function getPayloadStatus(uuid: string): Promise<XummPayloadStatus> {
  const response = await fetch(`${XUMM_BASE}/payload/${uuid}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Xumm payload status error:', response.status, errorText);
    throw new Error(`Failed to get payload status: ${response.status}`);
  }

  return response.json();
}

/**
 * Deletes a Xumm payload by UUID (e.g. if the user cancels).
 */
export async function deletePayload(uuid: string): Promise<void> {
  const response = await fetch(`${XUMM_BASE}/payload/${uuid}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    console.warn('Xumm delete payload warning:', response.status);
  }
}

/**
 * Fetches XRPL account info for a given address from the XRPL testnet.
 */
export async function getAccountInfo(address: string): Promise<XummAccountInfo | null> {
  const response = await fetch('https://s.altnet.rippletest.net:51234', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'account_info',
      params: [{ account: address, strict: true, ledger_index: 'validated' }],
    }),
  });

  if (!response.ok) {
    console.error('XRPL account info error:', response.status);
    return null;
  }

  const data = await response.json();
  if (data.result?.error) {
    console.warn('XRPL account info:', data.result.error);
    return null;
  }

  return data.result?.account_data ?? null;
}

/**
 * Creates an NFT minting payload via Xumm.
 * The user signs the transaction in Xaman and the NFT is minted on XRPL testnet.
 */
export async function createNFTMintPayload(
  address: string,
  uri: string,
): Promise<XummPayloadResponse> {
  const hexUri = stringToHex(uri);

  const response = await fetch(`${XUMM_BASE}/payload`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      txjson: {
        TransactionType: 'NFTokenMint',
        Account: address,
        URI: hexUri,
        Flags: 8,
        NFTokenTaxon: 0,
        Fee: '12',
      },
      options: {
        submit: true,
        expire: 15,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Xumm NFT mint error:', response.status, errorText);
    throw new Error(`Failed to create NFT mint payload: ${response.status}`);
  }

  return response.json();
}

/**
 * Creates a token (IOU) issuance payload via Xumm.
 */
export async function createTokenPayload(
  address: string,
  currency: string,
  amount: string,
): Promise<XummPayloadResponse> {
  const currencyHex = stringToHex(currency).toUpperCase().padEnd(40, '0').slice(0, 40);

  const response = await fetch(`${XUMM_BASE}/payload`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      txjson: {
        TransactionType: 'Payment',
        Account: address,
        Destination: address,
        Amount: {
          currency,
          value: amount,
          issuer: address,
        },
        Fee: '12',
      },
      options: {
        submit: true,
        expire: 15,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Xumm token create error:', response.status, errorText);
    throw new Error(`Failed to create token payload: ${response.status}`);
  }

  return response.json();
}

/**
 * Converts a UTF-8 string to uppercase hex for XRPL fields.
 */
function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex.toUpperCase();
}

/**
 * Returns the Xaman deep-link URL for a given payload UUID.
 * On iOS this opens the Xaman app; on Android it attempts the same.
 */
export function getXamanDeepLink(uuid: string): string {
  return `xaman://xumm/sign/${uuid}`;
}

/**
 * Returns the Xumm universal sign URL (opens in browser or Xaman).
 */
export function getXummSignUrl(uuid: string): string {
  return `https://xumm.app/sign/${uuid}`;
}

/**
 * Checks whether the Xumm API credentials are configured.
 */
export function isXummConfigured(): boolean {
  return XUMM_API_KEY.length > 5;
}
