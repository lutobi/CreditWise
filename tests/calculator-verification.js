// Calculator Verification Script
// Run this to manually verify loan calculations

// Term Loan Calculation Logic
function calculateTermLoan(amount, months) {
    const annualRate = 0.18
    const initiationFee = amount * 0.15
    const monthlyServiceFee = 50
    const monthlyInterest = (amount * annualRate) / 12

    const totalInterest = monthlyInterest * months
    const totalServiceFees = monthlyServiceFee * months
    const totalRepayment = amount + totalInterest + initiationFee + totalServiceFees
    const monthlyPayment = totalRepayment / months
    const effectiveAPR = ((totalRepayment - amount) / amount) * (12 / months) * 100

    return {
        amount,
        months,
        monthlyInterest: monthlyInterest.toFixed(2),
        totalInterest: totalInterest.toFixed(2),
        initiationFee: initiationFee.toFixed(2),
        totalServiceFees: totalServiceFees.toFixed(2),
        totalRepayment: Math.ceil(totalRepayment).toLocaleString(),
        monthlyPayment: Math.ceil(monthlyPayment).toLocaleString(),
        effectiveAPR: effectiveAPR.toFixed(1) + '%'
    }
}

// Payday Loan Calculation Logic
function calculatePaydayLoan(amount, months) {
    const fee = amount * 0.30
    const totalRepayment = amount + fee
    const monthlyPayment = totalRepayment / months
    const effectiveAPR = 30

    return {
        amount,
        months,
        fee: fee.toFixed(2),
        totalRepayment: Math.ceil(totalRepayment).toLocaleString(),
        monthlyPayment: Math.ceil(monthlyPayment).toLocaleString(),
        effectiveAPR: effectiveAPR.toFixed(1) + '%'
    }
}

// Test Scenarios
console.log("=== TERM LOAN TESTS ===\n")

console.log("Scenario A: N$ 10,000 for 12 months")
console.log(calculateTermLoan(10000, 12))
console.log("\nExpected:")
console.log("- Monthly Payment: N$ 1,159")
console.log("- Total Repayment: N$ 13,900")
console.log("- Effective APR: 39.0%")

console.log("\n\nScenario B: N$ 50,000 for 36 months (max)")
console.log(calculateTermLoan(50000, 36))
console.log("\nExpected:")
console.log("- Monthly Payment: N$ 2,069")
console.log("- Total Repayment: N$ 74,500")
console.log("- Effective APR: 49.0%")

console.log("\n\n=== PAYDAY LOAN TESTS ===\n")

console.log("Scenario C: N$ 5,000 for 3 months")
console.log(calculatePaydayLoan(5000, 3))
console.log("\nExpected:")
console.log("- Monthly Payment: N$ 2,167")
console.log("- Total Repayment: N$ 6,500")
console.log("- Effective APR: 30.0%")

console.log("\n\nScenario D: N$ 1,000 for 1 month (min)")
console.log(calculatePaydayLoan(1000, 1))
console.log("\nExpected:")
console.log("- Monthly Payment: N$ 1,300")
console.log("- Total Repayment: N$ 1,300")
console.log("- Effective APR: 30.0%")

// Run this in browser console or Node.js to verify calculations
