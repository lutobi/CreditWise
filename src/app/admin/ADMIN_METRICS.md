
# Admin System Metrics Reference 📊

This document explains the real-time metrics displayed on the Admin Dashboard (`/admin`) and Reports Page.

## 1. API Status (Latency)
*   **What it measures:** The response time of your Database Connection.
*   **How it works:** The system fetches a single 'ping' row from the database and measures the round-trip time in milliseconds (ms).
*   **Interpretation:**
    *   **< 200ms:** 🟢 Excellent. System is snappy.
    *   **200ms - 500ms:** 🟡 Moderate. Usable but getting busy.
    *   **> 1000ms:** 🔴 High Latency. Database might be under heavy load or connection is poor.

## 2. Pipeline Load
*   **What it measures:** Operational Capacity Utilization.
*   **How it works:** Compares the number of **Pending Applications** against a nominal capacity of **50 items**.
*   **Calculation:** `(Total Pending / 50) * 100`
*   **Interpretation:**
    *   **0 - 50%:** 🟢 Comfortable. Team can handle the flow.
    *   **50 - 80%:** 🟡 Busy. Backlog is building up.
    *   **100%:** 🔴 Saturated. You have 50+ items waiting. Consider adding more staff or overtime.

## 3. Queue Depth
*   **What it measures:** The raw count of actionable tasks.
*   **How it works:** Sums up:
    *   `Submitted` loans (Waiting for **Verifier**).
    *   `Verified` loans (Waiting for **Approver**).
*   **Interpretation:** This is your team's immediate "To-Do List" length.

## 4. Approval Rate (Security Score)
*   **What it measures:** The percentage of processed applications that were **Approved** (deemed safe/worthy).
*   **Calculation:** `100% - Rejection Rate`
*   **Interpretation:**
    *   **80% - 95%:** 🟢 Healthy. Most users are genuine.
    *   **50% - 80%:** 🟡 Caution. You are rejecting a significant portion. Check marketing sources.
    *   **< 50%:** 🔴 High Risk. Majority of apps are being rejected. Potential fraud attack or severe targeting issue.

---
*Last Updated: 2026-01-19*
