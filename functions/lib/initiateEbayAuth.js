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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateEbayAuth = void 0;
// Use v2 imports for core functionality
const https_1 = require("firebase-functions/v2/https");
// DO NOT import from "firebase-functions/v2/params";
const logger = __importStar(require("firebase-functions/logger"));
const crypto = __importStar(require("crypto"));
// --- Constants ---
// Configuration will be accessed inside the handler via process.env
const REDIRECT_URI = "https://us-central1-consign-demo-mjn.cloudfunctions.net/handleEbayCallback";
const SCOPES = "https://api.ebay.com/oauth/api_scope"; // Basic scope for flow test
const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
// --- Firebase Function Definition (v2 Callable Syntax) ---
exports.initiateEbayAuth = (0, https_1.onCall)({ region: "us-central1" }, // Specify region for v2
async (request) => {
    // TODO: Add authentication check
    logger.info("Initiating eBay OAuth flow (BASIC SCOPE - v2 Syntax)...");
    // Access config inside handler using process.env
    const ebayClientId = process.env.EBAY_CLIENT_ID;
    // Check if the Client ID was loaded from the environment AT RUNTIME
    if (!ebayClientId) {
        logger.error("eBay Client ID environment variable (EBAY_CLIENT_ID) was not loaded at runtime.");
        throw new https_1.HttpsError("internal", "Application configuration error: Missing eBay Client ID.");
    }
    // 1. Generate state
    const state = crypto.randomBytes(16).toString("hex");
    logger.info(`Generated state parameter: ${state}`);
    // 2. State storage deferred (TODO)
    // 3. Construct URL
    const params = new URLSearchParams({
        client_id: ebayClientId,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        state: state,
    });
    const authorizationUrl = `${EBAY_AUTH_URL}?${params.toString()}`;
    logger.info(`Constructed eBay auth URL (start): ${authorizationUrl.substring(0, 150)}...`);
    // 4. Return URL
    return { authorizationUrl: authorizationUrl };
});
//# sourceMappingURL=initiateEbayAuth.js.map