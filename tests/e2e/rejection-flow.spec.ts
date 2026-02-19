import { test, expect } from '@playwright/test';

const generateUser = () => {
    const timestamp = Date.now();
    return {
        email: `rejection.user.${timestamp}@example.com`,
        password: 'password123',
        fullName: `Rejection Tester ${timestamp}`
    };
};

test('Rejection Workflow: Block 30 Days & UI Check', async ({ page, browser }) => {
    // 1. Register User
    const user = generateUser();
    await page.goto('http://localhost:3000/signup');
    await page.fill('#fullName', user.fullName);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.fill('#confirmPassword', user.password);
    await page.click('button[type="submit"]');

    // 2. Apply for Loan (Fast Track)
    await page.waitForTimeout(2000); // Wait for dashboard
    await page.goto('http://localhost:3000/apply');

    // Fill Form
    await page.fill('input[name="firstName"]', user.fullName.split(' ')[0]);
    await page.fill('input[name="lastName"]', "Test");
    await page.fill('input[name="nationalId"]', "90010100123");
    await page.fill('input[name="dob"]', "1990-01-01");
    await page.selectOption('select[name="gender"]', 'Male');
    await page.fill('input[name="nationality"]', 'Namibian');
    await page.selectOption('select[name="maritalStatus"]', 'Single');
    await page.fill('input[name="phone"]', "0811234567");
    await page.fill('input[name="altPhone"]', "0812345678");
    await page.fill('input[name="address"]', "Windhoek");
    await page.click('text=Next');

    await page.fill('input[name="employerName"]', "Test Corp");
    await page.fill('input[name="jobTitle"]', "Tester");
    await page.fill('input[name="employerPhone"]', "061123456");
    await page.fill('input[name="employmentStartDate"]', "2020-01-01");
    // Employment Type default
    await page.fill('input[name="monthlyIncome"]', "15000");
    await page.fill('input[name="hrName"]', "HR");
    await page.fill('input[name="hrEmail"]', "hr@example.com");
    await page.fill('input[name="hrPhone"]', "061000000");
    await page.click('text=Next');

    await page.fill('input[name="bankName"]', "FNB");
    await page.fill('input[name="accountHolder"]', "Me");
    await page.fill('input[name="accountNumber"]', "123456789");
    await page.fill('input[name="branchCode"]', "123456");
    await page.click('text=Next');

    // Loan Details
    await page.click('text=Next'); // Default values

    // References
    await page.fill('input[name="nextOfKinName"]', "Mom");
    await page.fill('input[name="nextOfKinRelationship"]', "Mother");
    await page.fill('input[name="nextOfKinContact"]', "0810000000");
    await page.fill('input[name="nextOfKinAddress"]', "Home");
    await page.click('text=Next');

    // Docs (Bypass)
    // Wait for inputs to be attached if they are dynamic
    // Usually they are there.
    await page.fill('#idDocument-bypass', "https://example.com/item.png");
    await page.fill('#selfie-bypass', "https://example.com/selfie.png");
    await page.fill('#payslip-bypass', "https://example.com/payslip.pdf");
    await page.click('text=Next');

    // Declaration
    await page.click('input[name="termsAccepted"]');
    await page.click('input[name="confirmTruth"]');
    await page.fill('input[name="declarationDate"]', new Date().toISOString().split('T')[0]);
    await page.fill('input[name="signatureName"]', user.fullName);
    await page.click('button:has-text("Submit Application")');

    await expect(page.locator('text=Application Received')).toBeVisible({ timeout: 20000 });

    // 3. Admin Rejection
    // Logout
    await page.goto('http://localhost:3000');
    // We assume we can switch to Admin via new context to avoid messing up User session state if cookies persist?
    // Actually new context is better.

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.goto('http://localhost:3000/login');
    await adminPage.fill('input[name="email"]', 'admin@omarifinance.com');
    await adminPage.fill('input[name="password"]', 'admin123');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForTimeout(2000);

    await adminPage.goto('http://localhost:3000/admin/verification');
    // Find the loan. Wait for loading.
    await adminPage.waitForSelector('text=View Details');
    await adminPage.click('text=View Details'); // First one
    await adminPage.click('text=Action');
    await adminPage.click('text=Reject Application');
    await adminPage.fill('textarea[placeholder="Reason for rejection..."]', "Policy Violation Test");
    await adminPage.click('button:has-text("Confirm Rejection")');
    await adminPage.waitForTimeout(1000); // Allow DB update

    // 4. Verify User Dashboard
    await page.goto('http://localhost:3000/dashboard');
    await page.reload();

    // Expect "Application Declined" Card (Red text)
    await expect(page.locator('text=Application Declined')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Policy Violation Test')).toBeVisible();
    // Expect "Application Locked" button
    await expect(page.locator('button:has-text("Application Locked")')).toBeVisible();

    // 5. Verify Apply Block
    await page.goto('http://localhost:3000/apply');
    await expect(page.locator('text=Active Loan in Progress')).toBeVisible();
});
