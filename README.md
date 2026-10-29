# CDN v2 — Connector prototype

Campaign Dashboard Architecture prototype: brand → campaign cards → multi-campaign project sheets and Data Ads spreadsheets, with group dashboards, automation matching and scraping monitoring. Clickable UI with seeded mock data — no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Production check: `npm run build && npm start`.

## Flow

| Area | Route | Notes |
| --- | --- | --- |
| Brand chooser | `/` | Entry point |
| Dashboard | `/dashboard` | Root of the performance tree; aggregates the selected campaigns (or an opened group). Sub-views: **KOL**, **Connector**, **Attend**, **KOL Ads** performance |
| KOL / Connector performance | `/dashboard/kol`, `/dashboard/connector` | KPI strip, organic vs paid, new views per day chart, top content, leaderboard and paginated content table |
| KOL Ads performance | `/dashboard/ads` | KPI strip, delivery-per-day chart, view-through funnel and ad materials grouped by ad set |
| Attend performance | `/dashboard/attend` | Attendance KPI strip and participant table with search, status filter and pagination |
| Campaign list | `/campaigns` | Card or table view (toggle next to search, view is remembered). Grouped campaigns appear as **Group Campaign** rows/cards. Click to multi-select, open the project list, or group the selection. Edit/delete per row |
| Project list | `/projects/all` | Sheets for the selected campaigns; type filter inside the page |
| Project sheet | `/projects/ts/[id]` | Excel-style tracker sheet (10 columns), Save + last-saved indicator, undo, row delete, column layout |
| Data Ads | `/data-ads`, `/data-ads/[id]` | Table of spreadsheets; each spreadsheet holds many sheets and every sheet is a tracker-list grid with its own column layout |
| Automation link | `/automation` | Brand-level automation export as an editable spreadsheet |
| Scraping monitoring | `/scraping` | Link-level success / failed / pending log |
| Agency workspace | `/agency` | Role-switched view (header: Spectrum ↔ Agency ↔ Vendor ADS) |
| Boosting workspace | `/vendor` | Vendor ADS only: Data Ads progress per spreadsheet, open a sheet to update each row's boosting status |

## Sheet formats

Every project type has its own default template. Required columns are green and marked with `*`.

**KOL**

`Name*` · `Link to Account*` · `Followers*` · `Publish Link*` · `Niche` · `SOW Item` · `Actual Publish Date` · `Link to Proof of Content` · `Link to Insights` · `6s Views`

**Connector**

`Name*` · `Link to Account*` · `Followers*` · `Publish Link*` · `Niche` · `SOW Item` · `Actual Publish Date` · `Link to Proof of Content` · `Link to Insights` · `Notes`

**Troops**

`Name*` · `Link to Account*` · `Publish Link*` · `Posting Date*`

**KOL Ads**

`Link Publish*` · `Ad name*` · `By Day` (date) · `Impressions` · `Reach` · `Clicks (destination)` · `Video views` · `2-second video views` · `6-second focused video views` · `Video views at 25%` · `50%` · `75%` · `100%`

**Data Ads sheet**

`Start Date*` · `End Date*` · `Creative Name*` · `KOL Category` · `Vendor` · `Link Post*` · `Boost Code` · `IG` · `NEW BRIEF` · `Picture` · `Remarks` · `Naming - Uplink`

**Automation link** — the 13 columns of the automation export: `Campaign*`, `Ads*`, `Date`, Impressions, Reach, Clicks, Video Views, 2 Second Views, 6 Second Focused Video, and 25/50/75/100% views.

## Rules baked into the prototype

- **Multi-campaign scope.** The topbar scope chip opens a multi-select dropdown (`All campaigns` + per-campaign checkboxes). The selection drives the dashboard, Project list and Data Ads. The topbar shows the selection count or the opened group.
- **Per-type templates.** Each project type has its own default column template; `Columns` in a sheet toolbar lets you **add, rename, delete and reorder** columns and toggle required/optional per sheet, and `Reset to template` restores the type default. The layout drives headers, completeness validation and the import mapping.
- **Sidebar tree.** Dashboard is the root of a collapsible tree containing the four performance views; there is no separate "Performance" section label.
- **New project needs one campaign.** Creating a project sheet requires exactly one selected campaign; the brand and campaign are shown as fixed badges.
- **Grouping.** `Campaign group` in the sidebar opens the grouping dialog directly (no separate page) and is prefilled with the current selection. You can also use `Group selected` on the campaign page. A campaign can belong to **one group only**; grouped campaigns disappear from the campaign grid and are represented by their **Group Campaign** card (open dashboard / open project list / edit / delete). Deleting or editing a group down to fewer than two campaigns **dissolves** it and returns the members to the campaign list.
- **No campaign type or status in the UI.** Type is an internal effort profile used for seeded metrics; campaigns are simply listed.
- **Per-sheet column layout.** `Columns` in a sheet toolbar opens a layout editor: reorder columns and toggle required/optional per column. The layout is saved per sheet (project sheet or Data Ads sheet), drives the green/blue headers, completeness validation and the import mapping. `Reset to template` restores the standard layout for that project type.
- **Vendor ADS role.** The third role (header: Spectrum | Agency | Vendor ADS) only sees the **Boosting workspace** and Data Ads. Every Data Ads row carries a boosting status — **Backlog / In Progress / Done** — that only Vendor ADS can change (from the sheet's sticky status column on the right). Spectrum and Agency see it read-only. All other cells are read-only for the vendor. Clicking a row number in any sheet selects the whole row.
- **Agency filter.** The agency workspace filters project sheets and Data Ads by the selected agency (default: the first agency of the brand); there is no "all agencies" option.
- **No workflow status on sheets.** Every edit auto-saves; the header shows `Saved just now / 2 min ago`, and `Save` forces a save.
- **Delete campaign** removes its project sheets and Data Ads containers, removes it from groups, and unlinks its automation rows — the confirmation lists the impact first.
- **Excel behaviour.**
  - Enter commits and moves down; the sheet always keeps one empty row at the bottom so a new row appears as you type.
  - Pasting a block (Ctrl+V) inserts exactly as many rows as the block needs.
  - Duplicates are flagged in red, never dropped silently; `Remove duplicate` cleans them.
  - Ctrl+C copies the selection as TSV, Del clears it.
  - **Ctrl+Z / Undo** reverts the last change (cell edit, paste, clear, add or delete row) — 40 steps per sheet session.
  - The first column carries a trash action to delete a single row (undoable).
- **Derived columns are never typed.** Shortcode and clean link are computed from the publish link; the selected row's values appear in the read-only inspector under the grid.
- **Scrape status is out of the sheets.** It only appears in Scraping monitoring.
- **Shortcode matching.** Publish links in project sheets and Data Ads are cleaned and reduced to a shortcode, looked up across the brand's project sheets. The automation sheet is a raw export and no longer carries link or match columns.
- **Import.** CSV/TSV plus paste, with an explicit column-mapping step so each agency can keep its own column order.

## Prototype data

All data is generated deterministically in `lib/seed.ts` and persisted to `localStorage` under `cdn-v2.state.v1` (schema version in `STATE_VERSION`). Bumping the version reseeds on next load. To reset manually:

```js
localStorage.removeItem("cdn-v2.state.v1")
```
