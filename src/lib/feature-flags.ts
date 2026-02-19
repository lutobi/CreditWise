/**
 * Feature Flags for Realpay Integration
 * 
 * All Realpay features are behind environment-controlled flags.
 * - Production (current): All flags = false → App works exactly as before
 * - Development/Staging: Flags = true → New Realpay features active
 * - Gradual Rollout: Enable one flag at a time in production
 */

export const FEATURES = {
  /**
   * Master switch for Realpay integration.
   * When false, all Realpay features are disabled and the app uses the legacy flow.
   */
  REALPAY_ENABLED: process.env.NEXT_PUBLIC_REALPAY_ENABLED === 'true',

  /**
   * Enable real-time account verification (AVS-R).
   * Shows "Verify Account" button in the application form.
   */
  REALPAY_AVS: process.env.NEXT_PUBLIC_REALPAY_AVS === 'true',

  /**
   * Enable automatic payout after loan approval.
   * When false, admin must manually trigger disbursement.
   */
  REALPAY_PAYOUT: process.env.REALPAY_PAYOUT_ENABLED === 'true',

  /**
   * Enable DebiCheck mandate creation during contract signing.
   * When false, uses legacy manual payment tracking.
   */
  REALPAY_DEBICHECK: process.env.NEXT_PUBLIC_REALPAY_DEBICHECK === 'true',

  /**
   * Enable user payment calendar in dashboard.
   * Shows upcoming debit dates and payment history.
   */
  REALPAY_PAYMENT_CALENDAR: process.env.NEXT_PUBLIC_REALPAY_PAYMENT_CALENDAR === 'true',
};

/**
 * Realpay API Configuration
 */
export const REALPAY_CONFIG = {
  /**
   * Base URL for Realpay API.
   * Use mock server for development: http://localhost:4100
   */
  API_URL: process.env.REALPAY_API_URL || 'https://api.realpay.co.za',

  /**
   * API Key for authentication (server-side only).
   */
  API_KEY: process.env.REALPAY_API_KEY || '',

  /**
   * Webhook secret for verifying incoming webhooks.
   */
  WEBHOOK_SECRET: process.env.REALPAY_WEBHOOK_SECRET || '',

  /**
   * Merchant ID assigned by Realpay.
   */
  MERCHANT_ID: process.env.REALPAY_MERCHANT_ID || '',
};

/**
 * Check if Realpay is properly configured.
 * Returns false if running in mock mode or missing credentials.
 */
export function isRealpayConfigured(): boolean {
  return (
    FEATURES.REALPAY_ENABLED &&
    REALPAY_CONFIG.API_KEY.length > 0 &&
    REALPAY_CONFIG.MERCHANT_ID.length > 0
  );
}

/**
 * Check if using mock API (for development/testing).
 */
export function isUsingMockApi(): boolean {
  return REALPAY_CONFIG.API_URL.includes('localhost');
}
