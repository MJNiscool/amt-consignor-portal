import axios from 'axios';
import * as functions from 'firebase-functions';

const EBAY_CLIENT_ID = 'MichaelJ-AMTConsi-PRD-20e888974-36b8dc49';
const EBAY_CLIENT_SECRET = 'PRD-0e888974992a-809b-49f7-9038-966c';
const EBAY_REFRESH_TOKEN = 'v^1.1#i^1#p^3#r^1#I^3#f^0#t^Ul4xMF80OkM1MTk1QjkyRUU4MkRGNTE0Mjg1MzBDMUE5MjAwQ0RFXzFfMSNFXjI2MA==';
const EBAY_SCOPE = 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory.readonly';

interface EbayItem {
  itemId: string;
  title: string;
  price: number;
  bids: number;
  status: string;
  consignerId: string;
}

export const fetchEbayData = functions.https.onRequest(async (req, res): Promise<void> => {
  const consignerId = req.query.consignerId as string;

  console.log(`[fetchEbayData] Invoked with consignerId=${consignerId}`);

  if (!consignerId) {
    res.status(400).json({ error: 'Missing consignerId' });
    return;
  }

  try {
    const tokenResponse = await axios.post(
      'https://api.ebay.com/identity/v1/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: EBAY_REFRESH_TOKEN,
        scope: EBAY_SCOPE
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' + Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')
        }
      }
    );

    const accessToken = (tokenResponse.data as any).access_token;

    if (!accessToken) {
      throw new Error('Failed to obtain access token from eBay response.');
    }

    const listingsResponse = await axios.get(
      'https://api.ebay.com/sell/inventory/v1/inventory_item',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const items = (listingsResponse.data as any).inventoryItems || [];

    const filtered = items.filter((item: any) =>
      item.product?.description?.includes(`#${consignerId}`)
    );

    const result: EbayItem[] = filtered.map((item: any) => ({
      itemId: item.sku || 'unknown',
      title: item.product?.title || 'No title',
      price: item.offers?.[0]?.pricingSummary?.price?.value || 0,
      bids: 0,
      status: item.availability?.shipToLocationAvailability?.quantity > 0 ? 'Active' : 'Out of stock',
      consignerId
    }));

    res.json({ items: result });

  } catch (err: any) {
    const status = err?.response?.status || 500;
    const errorMessage = err?.response?.data || err?.message || 'Unknown error';

    console.error('eBay fetch failed:', errorMessage);

    res.status(status).json({
      error: 'eBay API error',
      detail: errorMessage
    });
  }
});
