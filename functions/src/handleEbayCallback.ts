// Use v2 imports explicitly for onRequest
import { onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express"; // Import Response type from express
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import axios from "axios"; // Use standard default import
import * as logger from "firebase-functions/logger";
// DO NOT import from "firebase-functions/v2/params";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = getFirestore();

// --- Constants ---
// Configuration will be accessed inside the handler via process.env
const REDIRECT_URI = "https://us-central1-consign-demo-mjn.cloudfunctions.net/handleEbayCallback";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_CREDENTIALS_DOC_PATH = "settings/ebay_credentials";

// --- Firebase Function Definition (v2 HTTP Syntax) ---
export const handleEbayCallback = onRequest(
    {
        region: "us-central1", // Specify region for v2
        // secrets: [...] // No secrets declared here if using process.env
    },
    async (req: Request, res: Response) => { // Use v2 Request and Express Response types

    logger.info("Received eBay OAuth callback request (v2 Syntax, process.env)", { query: req.query });

    // Access config inside handler using process.env
    const ebayClientId = process.env.EBAY_CLIENT_ID;
    const ebayClientSecret = process.env.EBAY_CLIENT_SECRET;

    // 1. Extract parameters
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const errorParam = req.query.error as string | undefined;
    const errorDescription = req.query.error_description as string | undefined;

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
    if (state) { logger.warn(`State verification skipped for state: ${state} (Deferred)`); }
    else { logger.warn("State parameter missing, verification skipped (Deferred)"); }

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
        const tokenResponse = await axios.post(
            EBAY_TOKEN_URL,
            tokenPayload.toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${basicAuth}`,
                },
                timeout: 10000, // 10 seconds
            }
        );

        if (tokenResponse.status !== 200 || !tokenResponse.data) {
            logger.error("Received non-200 status or empty data from eBay token endpoint", { status: tokenResponse.status, data: tokenResponse.data });
            throw new Error(`eBay token exchange failed with status: ${tokenResponse.status}`);
        }

        interface EbayTokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; }
        const tokenData = tokenResponse.data as EbayTokenResponse;

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
            accessTokenExpiresAt: Timestamp.fromDate(accessTokenExpiresAt),
            accountOwner: "amt_memorabilia",
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        logger.info("Tokens stored successfully in Firestore.");

        // 7. Send success response
        res.status(200).send(`
            <html><head><title>Authorization Successful</title></head>
            <body><h1>Authorization Successful!</h1><p>Basic eBay data access authorized.</p><p>You can close this window.</p></body>
            </html>`);

    } catch (error: unknown) { // Explicitly type error as unknown
        // Log the raw error first
        logger.error("Error caught during token exchange or storage", { rawError: error });

        // Simplified error handling - check for common properties
        let errorMessage = "An unknown error occurred during token exchange.";
        let errorStatus = 500;
        let ebayErrorDetails = null;

        // Check if it looks like an Axios error by checking for 'response' property
        if (typeof error === 'object' && error !== null && 'response' in error) {
             const axiosLikeError = error as any; // Use 'any' carefully here for property access
             errorMessage = axiosLikeError.message || "Axios error occurred";
             errorStatus = axiosLikeError.response?.status || 500;
             ebayErrorDetails = axiosLikeError.response?.data;
             logger.error("Potential Axios error details", { message: errorMessage, status: errorStatus, data: ebayErrorDetails });
        } else if (error instanceof Error) {
            // Standard JavaScript Error object
            errorMessage = error.message;
            logger.error("Standard error details", { stack: error.stack });
        } else {
            // Handle other types of thrown values
            try { errorMessage = JSON.stringify(error); } catch { errorMessage = String(error); }
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
