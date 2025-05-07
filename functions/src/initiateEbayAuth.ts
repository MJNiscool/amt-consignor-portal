// Use v2 imports for core functionality
import { HttpsError, onCall } from "firebase-functions/v2/https";
// DO NOT import from "firebase-functions/v2/params";
import * as logger from "firebase-functions/logger";
import * as crypto from "crypto";

// --- Constants ---
// Configuration will be accessed inside the handler via process.env
const REDIRECT_URI = "https://us-central1-consign-demo-mjn.cloudfunctions.net/handleEbayCallback";
const SCOPES = "https://api.ebay.com/oauth/api_scope"; // Basic scope for flow test
const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";

// --- Firebase Function Definition (v2 Callable Syntax) ---
export const initiateEbayAuth = onCall(
  { region: "us-central1" }, // Specify region for v2
  async (request) => {
    // TODO: Add authentication check

    logger.info("Initiating eBay OAuth flow (BASIC SCOPE - v2 Syntax)...");

    // Access config inside handler using process.env
    const ebayClientId = process.env.EBAY_CLIENT_ID;

    // Check if the Client ID was loaded from the environment AT RUNTIME
    if (!ebayClientId) {
       logger.error("eBay Client ID environment variable (EBAY_CLIENT_ID) was not loaded at runtime.");
       throw new HttpsError("internal", "Application configuration error: Missing eBay Client ID.");
    }

    // 1. Generate state
    const state = crypto.randomBytes(16).toString("hex");
    logger.info(`Generated state parameter: ${state}`);

    // 2. State storage deferred (TODO)

    // 3. Construct URL
    const params = new URLSearchParams({
      client_id: ebayClientId, // Use value loaded from process.env
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES, // Basic scope for test
      state: state,
    });

    const authorizationUrl = `${EBAY_AUTH_URL}?${params.toString()}`;
    logger.info(`Constructed eBay auth URL (start): ${authorizationUrl.substring(0, 150)}...`);

    // 4. Return URL
    return { authorizationUrl: authorizationUrl };
  }
);
