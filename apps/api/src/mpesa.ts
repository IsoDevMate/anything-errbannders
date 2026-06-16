import axios from 'axios';

const {
  MPESA_API_URL = 'https://sandbox.safaricom.co.ke',
  MPESA_CONSUMER_KEY = '',
  MPESA_CONSUMER_SECRET = '',
  MPESA_PASSKEY = '',
  MPESA_SHORTCODE = '',
  MPESA_CALLBACK_URL = '',
} = process.env;

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const { data } = await axios.get(`${MPESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  return data.access_token as string;
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);
}

function password(ts: string): string {
  return Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${ts}`).toString('base64');
}

export async function stkPush(phone: string, amount: number, accountRef: string): Promise<string> {
  const token = await getAccessToken();
  const ts = timestamp();

  // Normalize phone: 07xx → 2547xx
  const normalized = phone.replace(/^0/, '254');

  const { data } = await axios.post(
    `${MPESA_API_URL}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password(ts),
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount), // M-Pesa requires integer
      PartyA: normalized,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: normalized,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: accountRef,
      TransactionDesc: 'ErrandEconomy Wallet Top-Up',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (data.ResponseCode !== '0') {
    throw new Error(data.ResponseDescription ?? 'STK push failed');
  }

  return data.CheckoutRequestID as string;
}
