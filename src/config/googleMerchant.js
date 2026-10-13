const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const MERCHANT_CENTER_ID = process.env.GOOGLE_MERCHANT_CENTER_ID || '5317000737';
const DATA_SOURCE_ID = process.env.GOOGLE_DATA_SOURCE_ID || '10769000507';
const DATA_SOURCE_RESOURCE = `accounts/${MERCHANT_CENTER_ID}/dataSources/${DATA_SOURCE_ID}`;
const SCOPES = ['https://www.googleapis.com/auth/content'];

/**
 * Centralized Hard Kill Switch:
 * Only exact 'true' enables live product writes to Google Merchant Center.
 * Defaults to false (disabled) if missing or any other value.
 */
function isSyncEnabled() {
  return process.env.MERCHANT_SYNC_ENABLED === 'true';
}

/**
 * Returns an authenticated Google auth client for Google Merchant API.
 * Supports:
 *  1. OAuth 2.0 (Client ID + Client Secret + Refresh Token) - Recommended when GCP Service Account Key creation is blocked.
 *  2. Service Account JSON Key via environment variable (GOOGLE_SERVICE_ACCOUNT_KEY) or file (GOOGLE_SERVICE_ACCOUNT_PATH).
 *  3. Individual Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).
 */
function getAuthClient() {
  // Option 1: OAuth 2.0 (Recommended for Render & when GCP service account keys are blocked)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
  }

  // Option 2: Service Account JSON inline in env (raw JSON string or base64)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim();
    if (!raw.startsWith('{')) {
      try {
        raw = Buffer.from(raw, 'base64').toString('utf-8');
      } catch (e) {
        // keep raw
      }
    }
    const credentials = JSON.parse(raw);
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    });
  }

  // Option 3: Service Account JSON file path
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    const fullPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(fullPath)) {
      const credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      return new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES,
      });
    }
  }

  // Option 4: Discrete Service Account Email & Private Key in env
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: SCOPES,
    });
  }

  return null;
}

/**
 * Check if Google Merchant credentials are configured.
 */
function isConfigured() {
  return getAuthClient() !== null;
}

/**
 * Google Merchant API - Stable v1 sub-clients:
 * 1. accounts_v1: Developer registration, shipping settings, account details
 * 2. datasources_v1: Listing and managing primary / supplemental product data sources
 * 3. products_v1: Inserting, patching, and deleting productInputs
 */
function getAccountsClient() {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google Merchant Center auth not configured.');
  return google.merchantapi({ version: 'accounts_v1', auth });
}

function getDataSourcesClient() {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google Merchant Center auth not configured.');
  return google.merchantapi({ version: 'datasources_v1', auth });
}

function getProductsClient() {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google Merchant Center auth not configured.');
  return google.merchantapi({ version: 'products_v1', auth });
}

module.exports = {
  MERCHANT_CENTER_ID,
  DATA_SOURCE_ID,
  DATA_SOURCE_RESOURCE,
  isSyncEnabled,
  getAuthClient,
  isConfigured,
  getAccountsClient,
  getDataSourcesClient,
  getProductsClient,
};
