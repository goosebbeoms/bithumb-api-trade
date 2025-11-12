import axios from 'axios';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';

// 객체를 URL 쿼리스트링으로 변환
function encodeQuery(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
}

async function createQueryHash(body: Record<string, unknown>): Promise<string> {
  // 쿼리스트링 형태로 변환
  const query = encodeQuery(body);

  // SHA-512로 해시 (SHA-256이 아님)
  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface OrderPayload {
  market: string;
  side: 'bid' | 'ask';
  volume: string;
  price: string;
  ord_type: 'limit' | 'market' | 'price';
}

export async function placeOrder(
  apiKey: string,
  secretKey: string,
  payload: OrderPayload
) {
  const endpoint = '/v1/orders';
  const host = 'https://api.bithumb.com';
  const url = host + endpoint;

  // Create a mutable copy to send in the request
  const apiPayload: Partial<OrderPayload> = { ...payload };

  // For market sell orders, the 'price' field must be omitted.
  if (apiPayload.ord_type === 'market') {
    delete apiPayload.price;
  }

  // For price orders (market buy by total amount), the 'volume' field must be omitted.
  if (apiPayload.ord_type === 'price') {
    delete apiPayload.volume;
  }

  try {
    const queryHash = await createQueryHash(apiPayload);

    const jwtPayload = {
      access_key: apiKey,
      nonce: uuidv4(),
      timestamp: Date.now(),
      query_hash: queryHash,
      query_hash_alg: 'SHA512',
    };

    const secret = new TextEncoder().encode(secretKey);
    const token = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    const response = await axios.post(url, apiPayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data;
    }
    throw error;
  }
}
