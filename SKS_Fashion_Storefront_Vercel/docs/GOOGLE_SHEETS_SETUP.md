# Google Sheets Setup

1. Create a new Google Sheet and open **Extensions → Apps Script**.
2. Replace the editor contents with `google-sheets/Code.gs`.
3. Run `setupSksWorkbook` once. Approve access to this workbook.
4. In Apps Script Project Settings, add a script property named `SKS_WEBHOOK_SECRET` with a long random value.
5. Deploy the script as a Web App. Execute as the owner and allow access only as narrowly as the account supports.
6. Copy the Web App URL into the Vercel environment variable `GOOGLE_SHEETS_WEBHOOK_URL`.
7. Put the same random value in `GOOGLE_SHEETS_WEBHOOK_SECRET`.
8. Paste the Google Sheet share URL into Admin → Site settings → Google Sheets.
9. Redeploy, open Sales monitoring and select **Sync now**.

The workbook contains Products, Sales Summary and Daily Sales Log. Product identity and click totals are managed by the website. Confirmed sales are written as append-only log entries. Share the workbook only with authorised people. Protect columns A-C and F in Sales Summary if customers are permitted to edit the sheet directly.

If the Apps Script URL or ownership changes, update both Vercel environment variables and redeploy. The admin dashboard shows the most recent successful sync or error.
