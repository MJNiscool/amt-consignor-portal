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
exports.handleEbayCallback = void 0;
// Use v2 imports explicitly for onRequest
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios")); // Use standard default import
const logger = __importStar(require("firebase-functions/logger"));
// DO NOT import from "firebase-functions/v2/params";
// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = (0, firestore_1.getFirestore)();
// --- Constants ---
// Configuration will be accessed inside the handler via process.env
const REDIRECT_URI = "https://us-central1-consign-demo-mjn.cloudfunctions.net/handleEbayCallback";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_CREDENTIALS_DOC_PATH = "settings/ebay_credentials";
// --- Firebase Function Definition (v2 HTTP Syntax) ---
exports.handleEbayCallback = (0, https_1.onRequest)({
    region: "us-central1", // Specify region for v2
    // secrets: [...] // No secrets declared here if using process.env
}, async (req, res) => {
    var _a, _b;
    logger.info("Received eBay OAuth callback request (v2 Syntax, process.env)", { query: req.query });
    // Access config inside handler using process.env
    const ebayClientId = process.env.EBAY_CLIENT_ID;
    const ebayClientSecret = process.env.EBAY_CLIENT_SECRET;
    // 1. Extract parameters
    const code = req.query.code;
    const state = req.query.state;
    const errorParam = req.query.error;
    const errorDescription = req.query.error_description;
    // 2. Handle errors from eBay consent
    if (errorParam) {
        logger.error("Error received directly from eBay OAuth callback", { error: errorParam, errorDescription });
        res.status(400).send(`<html><body><h1>Authorization Failed</h1><p>eBay Error: ${errorParam} (${errorDescription || 'No description'})</p></body></html>`);
        return;
    }
    // 3. Check for code
    if (!code) {
        logger.error("Missing code in eBay OAuth callback query", { codeExists: !!code, stateExists: !!state });
        res.status(400).send(`<html><body><h1>Authorization Failed</h1><p>Missing code from eBay.</p></body></html>`);
        return;
    }
    // 4. Verify state (DEFERRED)
    if (state) {
        logger.warn(`State verification skipped for state: ${state} (Deferred)`);
    }
    else {
        logger.warn("State parameter missing, verification skipped (Deferred)");
    }
    try {
        // 5. Exchange code for tokens
        logger.info("Attempting to exchange authorization code for eBay tokens...");
        // Check if env vars were loaded AT RUNTIME
        if (!ebayClientId || !ebayClientSecret) {
            logger.error("Missing eBay Client ID or Client Secret environment variables at runtime.");
            throw new Error("Internal configuration error: Missing eBay API credentials.");
        }
        const basicAuth = Buffer.from(`${ebayClientId}:${ebayClientSecret}`).toString("base64");
        const tokenPayload = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: REDIRECT_URI,
        });
        // Use axios default export directly
        const tokenResponse = await axios_1.default.post(EBAY_TOKEN_URL, tokenPayload.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${basicAuth}`,
            },
            timeout: 10000, // 10 seconds
        });
        if (tokenResponse.status !== 200 || !tokenResponse.data) {
            logger.error("Received non-200 status or empty data from eBay token endpoint", { status: tokenResponse.status, data: tokenResponse.data });
            throw new Error(`eBay token exchange failed with status: ${tokenResponse.status}`);
        }
        const tokenData = tokenResponse.data;
        if (!tokenData.access_token || !tokenData.refresh_token || typeof tokenData.expires_in !== 'number') {
            logger.error("Missing required fields in eBay token response", { data: tokenData });
            throw new Error("Invalid token response received from eBay.");
        }
        logger.info("Successfully exchanged code for tokens.", { expiresIn: tokenData.expires_in });
        const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        // 6. Store tokens in Firestore
        logger.info("Storing received tokens in Firestore...");
        const credentialsDocRef = db.doc(EBAY_CREDENTIALS_DOC_PATH);
        await credentialsDocRef.set({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            accessTokenExpiresAt: firestore_1.Timestamp.fromDate(accessTokenExpiresAt),
            accountOwner: "amt_memorabilia",
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        logger.info("Tokens stored successfully in Firestore.");
        // 7. Send success response
        res.status(200).send(`
            <html><head><title>Authorization Successful</title></head>
            <body><h1>Authorization Successful!</h1><p>Basic eBay data access authorized.</p><p>You can close this window.</p></body>
            </html>`);
    }
    catch (error) { // Explicitly type error as unknown
        // Log the raw error first
        logger.error("Error caught during token exchange or storage", { rawError: error });
        // Simplified error handling - check for common properties
        let errorMessage = "An unknown error occurred during token exchange.";
        let errorStatus = 500;
        let ebayErrorDetails = null;
        // Check if it looks like an Axios error by checking for 'response' property
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const axiosLikeError = error; // Use 'any' carefully here for property access
            errorMessage = axiosLikeError.message || "Axios error occurred";
            errorStatus = ((_a = axiosLikeError.response) === null || _a === void 0 ? void 0 : _a.status) || 500;
            ebayErrorDetails = (_b = axiosLikeError.response) === null || _b === void 0 ? void 0 : _b.data;
            logger.error("Potential Axios error details", { message: errorMessage, status: errorStatus, data: ebayErrorDetails });
        }
        else if (error instanceof Error) {
            // Standard JavaScript Error object
            errorMessage = error.message;
            logger.error("Standard error details", { stack: error.stack });
        }
        else {
            // Handle other types of thrown values
            try {
                errorMessage = JSON.stringify(error);
            }
            catch (_c) {
                errorMessage = String(error);
            }
        }
        // Send response using the extracted/checked error message
        res.status(errorStatus).send(`
            <html>
              <head><title>Authorization Failed</title></head>
              <body>
                <h1>Authorization Failed</h1>
                <p>Error during token exchange: ${errorMessage}</p>
                ${ebayErrorDetails ? `<p>eBay Error Details: <pre>${JSON.stringify(ebayErrorDetails, null, 2)}</pre></p>` : ''}
                <p>Please try initiating authorization again later or contact support.</p>
              </body>
            </html>
        `);
    }
});
//# sourceMappingURL=handleEbayCallback.js.map