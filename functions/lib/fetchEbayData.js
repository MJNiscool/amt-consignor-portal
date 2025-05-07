"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEbayData = void 0;
const axios_1 = __importDefault(require("axios"));
const functions = __importStar(require("firebase-functions"));
const EBAY_CLIENT_ID = 'MichaelJ-AMTConsi-PRD-20e888974-36b8dc49';
const EBAY_CLIENT_SECRET = 'PRD-0e888974992a-809b-49f7-9038-966c';
const EBAY_REFRESH_TOKEN = 'v^1.1#i^1#p^3#r^1#I^3#f^0#t^Ul4xMF80OkM1MTk1QjkyRUU4MkRGNTE0Mjg1MzBDMUE5MjAwQ0RFXzFfMSNFXjI2MA==';
const EBAY_SCOPE = 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory.readonly';
exports.fetchEbayData = functions.https.onRequest(async (req, res) => {
    var _a, _b;
    const consignerId = req.query.consignerId;
    console.log(`[fetchEbayData] Invoked with consignerId=${consignerId}`);
    if (!consignerId) {
        res.status(400).json({ error: 'Missing consignerId' });
        return;
    }
    try {
        const tokenResponse = await axios_1.default.post('https://api.ebay.com/identity/v1/oauth2/token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: EBAY_REFRESH_TOKEN,
            scope: EBAY_SCOPE
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')
            }
        });
        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            throw new Error('Failed to obtain access token from eBay response.');
        }
        const listingsResponse = await axios_1.default.get('https://api.ebay.com/sell/inventory/v1/inventory_item', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });
        const items = listingsResponse.data.inventoryItems || [];
        const filtered = items.filter((item) => { var _a, _b; return (_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.description) === null || _b === void 0 ? void 0 : _b.includes(`#${consignerId}`); });
        const result = filtered.map((item) => {
            var _a, _b, _c, _d, _e, _f, _g;
            return ({
                itemId: item.sku || 'unknown',
                title: ((_a = item.product) === null || _a === void 0 ? void 0 : _a.title) || 'No title',
                price: ((_e = (_d = (_c = (_b = item.offers) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.pricingSummary) === null || _d === void 0 ? void 0 : _d.price) === null || _e === void 0 ? void 0 : _e.value) || 0,
                bids: 0,
                status: ((_g = (_f = item.availability) === null || _f === void 0 ? void 0 : _f.shipToLocationAvailability) === null || _g === void 0 ? void 0 : _g.quantity) > 0 ? 'Active' : 'Out of stock',
                consignerId
            });
        });
        res.json({ items: result });
    }
    catch (err) {
        const status = ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.status) || 500;
        const errorMessage = ((_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) || (err === null || err === void 0 ? void 0 : err.message) || 'Unknown error';
        console.error('eBay fetch failed:', errorMessage);
        res.status(status).json({
            error: 'eBay API error',
            detail: errorMessage
        });
    }
});
//# sourceMappingURL=fetchEbayData.js.map