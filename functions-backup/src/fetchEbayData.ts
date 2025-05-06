// Import Firebase modules first
import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

// Use require for node-fetch v2 and querystring (CommonJS compatible)
const fetch = require('node-fetch');
const querystring = require('querystring');

// Define Response type for fetch
interface FetchResponse {
    ok: boolean;
    status: number;
    json: () => Promise<any>;
    text: () => Promise<string>;
}

// Initialize Firebase Admin SDK
try {
    initializeApp();
    logger.info("Firebase Admin SDK initialized successfully.");
} catch (e: any) {
    if (e.code !== 'app/duplicate-app') {
        logger.error("Error initializing Firebase Admin SDK:", e);
    } else {
        logger.info("Firebase Admin SDK already initialized.");
    }
}

interface EbayTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    token_type: string;
}

export const fetchEbayData = onCall(async (request) => {
    if (!request.auth) {
        logger.error("User is not authenticated.");
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const userId = request.auth.uid;
    logger.info(`Function called by authenticated user: ${userId}. Using process.env.`);

    let newAccessToken: string | null = null;
    let expiresIn: number | null = null;
    let tokenRefreshStatus: string = "Token refresh failed";

    try {
        const clientId = process.env.EBAY_CLIENT_ID;
        const clientSecret = process.env.EBAY_CLIENT_SECRET;
        const refreshToken = process.env.EBAY_PROD_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            logger.error("Missing required eBay environment variables.");
            throw new HttpsError("internal", "Server configuration error: Missing eBay credentials.");
        }

        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const tokenEndpoint = "https://api.ebay.com/identity/v1/oauth2/token";

        const requestBody = querystring.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        });

        logger.info("Sending token refresh request...", { body: requestBody });

        const response: FetchResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuth}`,
            },
            body: requestBody,
        });

        logger.info(`Token endpoint response status: ${response.status}`);

        if (!response.ok) {
            let errorData: any = null;
            try {
                errorData = await response.json();
                logger.error("eBay token refresh failed (JSON response).", { status: response.status, data: errorData });
            } catch (jsonError) {
                try {
                    const errorText = await response.text();
                    logger.error("eBay token refresh failed (Non-JSON response).", { status: response.status, text: errorText });
                    errorData = { error: "non_json_response", error_description: errorText };
                } catch (textError) {
                    logger.error("eBay token refresh failed (Could not read response body).", { status: response.status });
                    errorData = { error: "unknown_error_format", error_description: "Failed to read error response body." };
                }
            }

            throw new HttpsError(
                "internal",
                `eBay token API error: ${response.status}`,
                { ebayError: errorData, status: response.status }
            );
        }

        const tokenData = await response.json() as EbayTokenResponse;

        newAccessToken = tokenData.access_token;
        expiresIn = tokenData.expires_in;
        tokenRefreshStatus = "Success (using node-fetch, no scope)";

        if (!newAccessToken) {
            logger.error("node-fetch succeeded but access token missing from eBay response.", { responseData: tokenData });
            throw new HttpsError("internal", "Failed to obtain new access token from eBay (fetch).");
        }

        logger.info(`Successfully obtained new access token via node-fetch (expires in ${expiresIn}s).`);

        const tradingApiEndpoint = "https://api.ebay.com/ws/api.dll";
        const compatibilityLevel = "1193";
        const siteId = "0";
        const getUserRequestBody = `<?xml version="1.0" encoding="utf-8"?><GetUserRequest xmlns="urn:ebay:apis:eBLBaseComponents"><RequesterCredentials><eBayAuthToken>${newAccessToken}</eBayAuthToken></RequesterCredentials></GetUserRequest>`;
        let getUserResult: any = { status: "GetUser call skipped or failed" };

        try {
            const apiResponse: FetchResponse = await fetch(tradingApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml',
                    'X-EBAY-API-CALL-NAME': 'GetUser',
                    'X-EBAY-API-COMPATIBILITY-LEVEL': compatibilityLevel,
                    'X-EBAY-API-SITEID': siteId,
                },
                body: getUserRequestBody,
            });

            logger.info("GetUser API call completed.", { statusCode: apiResponse.status });
            const responseDataString = await apiResponse.text();

            if (!apiResponse.ok) {
                logger.error("!!! GetUser API call failed.", { status: apiResponse.status, response: responseDataString.substring(0, 500) });
                getUserResult = { status: "GetUser call failed!", error: `HTTP Status ${apiResponse.status}`, responseStatus: apiResponse.status };
            } else {
                const successMarker = "<Ack>Success</Ack>";
                const userMarker = "<UserID>";
                if (responseDataString.includes(successMarker) && responseDataString.includes(userMarker)) {
                    getUserResult = { status: "GetUser call succeeded!", responseStatus: apiResponse.status, responseDataSample: responseDataString.substring(0, 150) + "..." };
                    logger.info("GetUser call successful (markers found).");
                } else {
                    logger.warn("GetUser response did not contain expected success markers.", { data: responseDataString.substring(0, 300) + "..." });
                    getUserResult = { status: "GetUser call response format unexpected.", responseStatus: apiResponse.status, responseDataSample: responseDataString.substring(0, 150) + "..." };
                }
            }

        } catch (apiError: any) {
            logger.error("!!! GetUser API call failed (fetch catch block):", { message: apiError.message });
            getUserResult = { status: "GetUser call failed! (Network/Fetch Error)", error: apiError.message };
        }

        return {
            status: getUserResult.status.startsWith("GetUser call succeeded") ? "success" : "error",
            message: `Token refresh status: ${tokenRefreshStatus}. GetUser attempt status: ${getUserResult.status}`,
            tokenRefreshStatus: tokenRefreshStatus,
            getUserResult: getUserResult,
            accessTokenInfo: expiresIn ? `Obtained token, expires in ${expiresIn}s` : "Token expiry info not available",
        };

    } catch (error: any) {
        logger.error("Error during fetchEbayData execution (main catch block):", {
            errorMessage: error.message,
            details: error instanceof HttpsError ? error.details : undefined,
            code: error instanceof HttpsError ? error.code : undefined,
            stack: error.stack
        });

        if (error instanceof HttpsError) {
            throw error;
        } else {
            throw new HttpsError("internal", `An unexpected error occurred: ${error.message}`);
        }
    }
});
