# Great Northwest Gutters — Operations

A responsive, dark-themed, interactive operations dashboard for office staff. This first version uses fictional sample data and saves changes in the current browser.

The interface uses deep black surfaces with vivid cyan and violet accents. Crew colors stay consistent across cards, comparison charts, and detail views, including previously saved demo records.

## Run

Requires Node.js 22.13 or newer (Node.js 24 recommended).

```text
npm install
npm start
```

Open http://localhost:3000. The server binds to `0.0.0.0` so hosting platforms can reach it. To restrict access to this computer, set `HOST=127.0.0.1`. To choose another port, set the `PORT` environment variable.

```text
npm test
```

## Deploy to Railway

- Connect this GitHub repository to a Railway service.
- Use Node.js 22.13 or newer (Node.js 24 recommended).
- Install dependencies with `npm ci --omit=dev` and start with `npm start`. No build step is required.
- Leave `HOST` unset (defaults to `0.0.0.0`) or explicitly set it to `0.0.0.0`. The app uses Railway's `PORT` environment variable.
- In the service's **Settings > Networking > Public Networking**, select **Generate Domain**. If a target port is requested, use the port the app reports in its startup log.
- Open the generated HTTPS domain, not the `localhost` address. A successful GitHub push publishes source code; Railway must also finish deploying it.

`npm warn config production Use --omit=dev instead` is an npm configuration warning, not by itself a deployment failure. If you configured `NPM_CONFIG_PRODUCTION`, remove that deprecated setting and use `--omit=dev` in your install command instead. If deployment still fails, check the subsequent build/runtime logs.

Public hosting does not add staff accounts or shared storage. This remains a browser-local demo; do not enter sensitive customer information.

## Included

- Crew overview and drill-down by truck number, lead, helper, and optional third member.
- Job board, work-order details, assignment, completion, and actual material reporting.
- First-time completion scoring, repair visits, complaints, and customer reviews.
- Warehouse receipts, truck loads, returns, documented waste, physical counts, and reorder alerts.
- Estimator pipeline, accepted and declined decisions, linked scheduled jobs, win rates, and booked value.
- Reporting filters, page search, CSV exports, browser persistence, and a confirmed demo reset.
- Private local OCR intake for PNG, JPEG, WebP, and PDFs, with mandatory office review and retained source documents.

Job fields reflect the supplied job-sheet examples: gutter style/color, gutter and downspout footage, cuts, roof pitch, tear-off, fittings, price, and installation instructions. The examples themselves and their personal information are not included in the app.

## Calculation definitions

- **Completed job value:** sum of completed job prices, not cash collected or net profit.
- **Crew first-time completion:** completed jobs with no repair callback / all completed jobs. Multiple repair visits to one job count as one affected job. Resolving a callback preserves its effect on the score.
- **Estimator win rate:** won / (won + lost). Pending estimates are excluded. Date filters select the issue-date cohort.
- **Booked value:** total value of accepted estimates; not completed revenue or payments.
- **Warehouse balance:** opening stock + supplier receipts + truck returns − truck loads.
- **Truck expected balance:** loads − actual completed-job use − documented waste − returns.
- **Reconciliation difference:** expected balance − physical count. Positive means less material counted than expected. Alerts use per-material tolerances and do not imply theft.

Reporting is anchored to the fictional demo date **October 2, 2026**. Crew quality follows the job's completion-date cohort; feedback lists follow the logged date. Inventory always uses all recorded history. Footage and individual piece counts are never combined into an inventory total.

## Demo boundaries

This is **not a production company database**. There are no staff accounts, shared synchronization, backups, audit-grade inventory controls, cloud handwriting recognition, purchase orders, or financial integrations. Do not enter real sensitive customer information.

## Scan intake

Use **Scan estimate** or the **Scan intake** page to select or drop one image/PDF at a time. Files are limited to 20 MB and PDFs to five pages. Tesseract.js, its WebAssembly engine, the English language model, and PDF.js are all served from local installed packages. Document content is processed in the browser, not uploaded to an external OCR service.

OCR is best for printed text and is **not dependable handwriting recognition**. For the supplied handwritten sheets, expect missing or incorrect suggestions. Material choices printed in a sheet's legend do not automatically select its gutter style. The app does not infer diagrams, circled selections, signatures, or ambiguous tear-off choices. All fields remain editable, missing quantities stay blank, and an office confirmation is required before any data affects operations.

Reviewed scans create either a pending estimate or an accepted estimate plus a linked scheduled job. Pending estimates retain the reviewed material requirements, address, and original source when later accepted. Images and original files are saved in IndexedDB; metadata and operating records are saved in localStorage. Resetting the demo clears both. The review screen preserves manual edits when extracting additional suggestions from corrected OCR text.

Inventory covers white 5"/6" K-style coil, 2×3/3×4 downspouts, hangers, and elbows. Other colors, fascia stock, and additional fittings need separate production SKUs. Hangers are initially estimated at one every two feet.

Movements update balances immediately. Backdated movements do not reconstruct historical snapshots. New movements invalidate older counts; completing a job requires a new count for the consumed items. Physical counts must be current relative to recorded movements and completed jobs.

CSV exports contain operational summaries, not a full data backup. Browser data can be lost when site storage is cleared. Production next steps include a shared database, authentication and role permissions, immutable movement records, counted-balance approvals, signed work orders, source sheet storage, labor/cost tracking, and backups.
