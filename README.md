# Ankit Kumar — Portfolio

A responsive personal portfolio focused on mobile application and backend engineering.

## Featured work

- **PhoneGuard** — Flutter and native Android device recovery app with Firebase support and SMS-based recovery commands.
- **BhuMitra mobile app** — Flutter land measurement app with GPS boundary capture, area calculations, unit conversions, and survey reports.
- **BhuMitra backend** — NestJS API using PostgreSQL, Redis, and Socket.IO to support application data and live collaborative surveys.

The BhuMitra project cards use screenshots from the app. PhoneGuard's project card uses its app logo; replace it with a real in-app screenshot if one becomes available.

## Run locally

Open `index.html` in a browser. The site uses plain HTML, CSS, and JavaScript; DM Sans is loaded from Google Fonts when an internet connection is available, with system-font fallbacks.

## Enable project inquiry submissions

The inquiry form saves submissions to a Google Sheet and emails `er.ankit.kumar@zohomail.in`. To connect it:

1. Create a Google Apps Script project at [script.google.com](https://script.google.com/).
2. Copy the contents of `google-apps-script.gs` into its editor and save.
3. Select `setupInquirySheet` in the function picker and click **Run**. Review Google's authorization prompt. The first run creates a **Portfolio project inquiries** spreadsheet in your Google Drive; its URL is available in the Apps Script execution log.
4. In Apps Script, select **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**, then deploy and complete any authorization prompts.
5. Copy the deployed Web app URL (ending in `/exec`) into `PROJECT_INQUIRY_ENDPOINT` in `script.js`.
6. Publish the updated portfolio and submit a test inquiry. Confirm it appears in the spreadsheet and that the notification email arrives.

Deploying as **Anyone** makes the form endpoint publicly reachable. The handler validates fields, ignores its hidden honeypot field, and deduplicates repeat submissions with the same request ID. Only collect information you need to respond, and review the inquiry sheet's sharing permissions. When changing the Apps Script later, use **Deploy → Manage deployments → Edit** to publish a new version.
