/**
 * Realpay E2E Tests with Screenshots
 * 
 * Tests the Realpay UI components and captures screenshots for documentation.
 * Run with: npx playwright test tests/e2e/realpay-e2e.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'tests/screenshots/realpay';

test.describe('Realpay Integration E2E Tests', () => {

    test.beforeAll(async () => {
        // Ensure screenshot directory exists
        const fs = await import('fs');
        const path = await import('path');
        const dir = path.join(process.cwd(), SCREENSHOT_DIR);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    test('1. Homepage loads correctly', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Take screenshot
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/01_homepage.png`,
            fullPage: true
        });

        await expect(page).toHaveTitle(/Omari|Finance/i);
    });

    test('2. Admin login and dashboard', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/02_login_page.png`
        });

        // Fill login form with test admin credentials
        await page.fill('input[type="email"]', 'admin@omarifinance.com');
        await page.fill('input[type="password"]', 'AdminPass123!');

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/03_login_filled.png`
        });

        // Click login button
        await page.click('button[type="submit"]');

        // Wait for redirect or dashboard
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/04_after_login.png`,
            fullPage: true
        });
    });

    test('3. Admin dashboard - Realpay panel', async ({ page }) => {
        // Navigate to admin dashboard
        await page.goto(`${BASE_URL}/admin`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/05_admin_dashboard.png`,
            fullPage: true
        });

        // Look for Realpay section if visible
        const realpayPanel = page.locator('text=Realpay');
        if (await realpayPanel.isVisible()) {
            await page.screenshot({
                path: `${SCREENSHOT_DIR}/06_realpay_panel.png`,
                fullPage: true
            });
        }
    });

    test('4. Apply page - Bank selection component', async ({ page }) => {
        await page.goto(`${BASE_URL}/apply`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/07_apply_start.png`,
            fullPage: true
        });

        // Navigate through steps to reach banking details
        // Step 1: Personal Info
        const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();

        // Fill first step if visible
        const firstNameInput = page.locator('input[name="firstName"], input[id="firstName"]');
        if (await firstNameInput.isVisible()) {
            await firstNameInput.fill('Test');
            await page.locator('input[name="lastName"], input[id="lastName"]').fill('User');
            await page.locator('input[type="email"]').first().fill('test@example.com');
            await page.locator('input[type="tel"]').first().fill('0811234567');

            await page.screenshot({
                path: `${SCREENSHOT_DIR}/08_apply_step1_filled.png`,
                fullPage: true
            });
        }
    });

    test('5. Dashboard - Payment calendar view', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/09_user_dashboard.png`,
            fullPage: true
        });

        // Look for payment calendar
        const paymentSchedule = page.locator('text=Payment Schedule, text=Payment Calendar').first();
        if (await paymentSchedule.isVisible()) {
            await page.screenshot({
                path: `${SCREENSHOT_DIR}/10_payment_calendar.png`,
                fullPage: true
            });
        }
    });

    test('6. API Health Check - Mock server endpoints', async ({ request }) => {
        // Test AVS endpoint
        const avsResponse = await request.post('http://localhost:4100/api/v1/avs/verify', {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            data: {
                bankCode: '282672',
                accountNumber: '62123456789',
                idNumber: '1234567890123',
                accountHolderName: 'Test User',
            },
        });

        expect(avsResponse.ok()).toBe(true);
        const avsData = await avsResponse.json();
        expect(avsData.status).toBe('verified');

        // Test mandate creation
        const mandateResponse = await request.post('http://localhost:4100/api/v1/mandates', {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            data: {
                loanId: 'e2e-test-loan',
                amount: 2000,
                collectionDay: 15,
                accountDetails: {
                    bankCode: '282672',
                    accountNumber: '62123456789',
                    idNumber: '1234567890123',
                },
            },
        });

        expect(mandateResponse.ok()).toBe(true);
        const mandateData = await mandateResponse.json();
        expect(mandateData.mandateReference).toMatch(/^MND_/);

        // Test payout
        const payoutResponse = await request.post('http://localhost:4100/api/v1/payouts', {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            data: {
                loanId: 'e2e-test-loan',
                amount: 5000,
                accountDetails: {
                    bankCode: '282672',
                    accountNumber: '62123456789',
                },
                reference: 'E2E-TEST',
            },
        });

        expect(payoutResponse.ok()).toBe(true);
        const payoutData = await payoutResponse.json();
        expect(payoutData.transactionRef).toMatch(/^TXN_/);
    });
});

test.describe('Realpay Component Visual Tests', () => {

    test('7. Component showcase page', async ({ page }) => {
        // Create a simple test page to render components
        await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Realpay Component Test</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 2rem;
              background: #f5f5f5;
            }
            .card {
              background: white;
              border-radius: 12px;
              padding: 1.5rem;
              margin-bottom: 1.5rem;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(to right, #9333ea, #7c3aed);
              color: white;
              padding: 1rem 1.5rem;
              border-radius: 12px 12px 0 0;
              margin: -1.5rem -1.5rem 1.5rem -1.5rem;
            }
            .stat-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1rem;
            }
            .stat {
              background: #f3e8ff;
              border: 1px solid #d8b4fe;
              border-radius: 8px;
              padding: 1rem;
              text-align: center;
            }
            .stat-value { font-size: 1.5rem; font-weight: bold; color: #7c3aed; }
            .stat-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
            .btn {
              background: #9333ea;
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 8px;
              border: none;
              font-weight: 500;
              cursor: pointer;
            }
            .success { background: #dcfce7; border-color: #86efac; }
            .success .stat-value { color: #16a34a; }
            .event-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.75rem;
              background: #f9fafb;
              border-radius: 8px;
              margin-top: 0.5rem;
            }
            .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 0.75rem; }
            .calendar-item {
              display: flex;
              align-items: center;
              padding: 0.75rem;
              border-radius: 8px;
              margin-bottom: 0.5rem;
            }
            .calendar-upcoming { background: #f9fafb; border: 1px solid #e5e7eb; }
            .calendar-paid { background: #dcfce7; border: 1px solid #86efac; }
          </style>
        </head>
        <body>
          <h1>Realpay Integration Components</h1>
          
          <div class="card">
            <div class="header">
              <h2 style="margin:0">Realpay Dashboard</h2>
              <p style="margin:0.25rem 0 0 0;opacity:0.8;font-size:0.875rem">Payment processing analytics</p>
            </div>
            
            <h3 style="color:#6b7280;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em">DebiCheck Mandates</h3>
            <div class="stat-grid">
              <div class="stat"><div class="stat-value">45</div><div class="stat-label">Total Mandates</div></div>
              <div class="stat success"><div class="stat-value">38</div><div class="stat-label">Approved (84%)</div></div>
              <div class="stat" style="background:#fee2e2;border-color:#fecaca"><div class="stat-value" style="color:#dc2626">5</div><div class="stat-label">Rejected</div></div>
              <div class="stat" style="background:#fef9c3;border-color:#fde047"><div class="stat-value" style="color:#ca8a04">2</div><div class="stat-label">Pending</div></div>
            </div>
            
            <h3 style="color:#6b7280;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;margin-top:1.5rem">Recent Events</h3>
            <div class="event-row"><span style="display:flex;align-items:center"><span class="dot"></span><code>mandate.approved</code></span><span style="color:#9ca3af;font-size:0.75rem">2 min ago</span></div>
            <div class="event-row"><span style="display:flex;align-items:center"><span class="dot"></span><code>collection.success</code></span><span style="color:#9ca3af;font-size:0.75rem">15 min ago</span></div>
            <div class="event-row"><span style="display:flex;align-items:center"><span class="dot" style="background:#f59e0b"></span><code>payout.processing</code></span><span style="color:#9ca3af;font-size:0.75rem">1 hour ago</span></div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
            <div class="card">
              <div class="header" style="background:linear-gradient(to right,#16a34a,#15803d)">
                <h2 style="margin:0;font-size:1.125rem">Payment Schedule</h2>
                <p style="margin:0.25rem 0 0 0;opacity:0.8;font-size:0.75rem">Next payment: 15 Feb 2026 (8 days)</p>
              </div>
              <div class="calendar-item calendar-paid">
                <span style="color:#16a34a;margin-right:0.75rem">✓</span>
                <div style="flex:1"><strong>Debit Order</strong><br><span style="font-size:0.75rem;color:#6b7280">15 Jan 2026</span></div>
                <div style="text-align:right"><strong>N$1,500</strong><br><span style="font-size:0.75rem;color:#16a34a">Paid</span></div>
              </div>
              <div class="calendar-item calendar-upcoming">
                <span style="color:#9ca3af;margin-right:0.75rem">📅</span>
                <div style="flex:1"><strong>Debit Order</strong><br><span style="font-size:0.75rem;color:#6b7280">15 Feb 2026</span></div>
                <div style="text-align:right"><strong>N$1,500</strong><br><span style="font-size:0.75rem;color:#6b7280">Upcoming</span></div>
              </div>
              <div class="calendar-item calendar-upcoming">
                <span style="color:#9ca3af;margin-right:0.75rem">📅</span>
                <div style="flex:1"><strong>Debit Order</strong><br><span style="font-size:0.75rem;color:#6b7280">15 Mar 2026</span></div>
                <div style="text-align:right"><strong>N$1,500</strong><br><span style="font-size:0.75rem;color:#6b7280">Upcoming</span></div>
              </div>
            </div>
            
            <div class="card">
              <div class="header" style="background:linear-gradient(to right,#16a34a,#15803d)">
                <h2 style="margin:0;font-size:1.125rem">Early Repayment</h2>
                <p style="margin:0.25rem 0 0 0;opacity:0.8;font-size:0.75rem">Pay off your loan early</p>
              </div>
              <div style="background:#f9fafb;border-radius:8px;padding:1rem;margin-bottom:1rem">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="color:#6b7280">Remaining Balance</span>
                  <span style="font-size:1.5rem;font-weight:bold">N$4,500</span>
                </div>
              </div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:1rem;margin-bottom:1rem">
                <label style="display:flex;gap:0.75rem;cursor:pointer">
                  <input type="checkbox" checked style="accent-color:#3b82f6">
                  <div>
                    <strong style="color:#1e40af">Cancel Debit Order</strong>
                    <p style="margin:0.25rem 0 0 0;font-size:0.875rem;color:#3b82f6">Automatically cancel after full payment</p>
                  </div>
                </label>
              </div>
              <button class="btn" style="width:100%">Confirm Payment Made</button>
            </div>
          </div>
          
          <div class="card" style="background:linear-gradient(to right,#ef4444,#dc2626);color:white;display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:0.75rem">
              <span style="font-size:1.5rem">⚠️</span>
              <div>
                <strong>Payment of N$1,500 failed</strong>
                <p style="margin:0.25rem 0 0 0;opacity:0.9;font-size:0.875rem">Insufficient funds • Next retry: 20 Feb</p>
              </div>
            </div>
            <button style="background:white;color:#dc2626;padding:0.5rem 1rem;border-radius:8px;border:none;font-weight:500">View Details</button>
          </div>
          
          <div class="card">
            <h3 style="margin-top:0">Bank Account Verification</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem">
              <div>
                <label style="font-size:0.875rem;color:#6b7280;display:block;margin-bottom:0.25rem">Bank</label>
                <select style="width:100%;padding:0.75rem;border:1px solid #d1d5db;border-radius:8px">
                  <option>FNB Namibia</option>
                </select>
              </div>
              <div>
                <label style="font-size:0.875rem;color:#6b7280;display:block;margin-bottom:0.25rem">Account Number</label>
                <input type="text" value="62123456789" style="width:100%;padding:0.75rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box">
              </div>
              <div>
                <label style="font-size:0.875rem;color:#6b7280;display:block;margin-bottom:0.25rem">ID Number</label>
                <input type="text" value="1234567890123" style="width:100%;padding:0.75rem;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box">
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;background:#dcfce7;border:1px solid #86efac;padding:0.75rem;border-radius:8px">
              <span style="color:#16a34a">✓</span>
              <span style="color:#166534">Account verified successfully</span>
            </div>
          </div>
        </body>
      </html>
    `);

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/11_component_showcase.png`,
            fullPage: true
        });
    });
});
