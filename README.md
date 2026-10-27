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
| Dashboard | `/dashboard` | Aggregates the selected campaigns (or an opened group); effort sub-views at `/dashboard/kol`, `/dashboard/connector`, `/dashboard/attend`, `/dashboard/ads` |
| Campaign list | `/campaigns` | Card grid; click cards to multi-select, open the project list, or group the selection. Edit/delete per campaign |
| Project list | `/projects/all` | Sheets for the selected campaigns; type filter inside the page |
| Project sheet | `/projects/ts/[id]` | Excel-style tracker sheet (10 columns), Save + last-saved indicator, undo, row delete |
| Data Ads | `/data-ads`, `/data-ads/[id]` | Each spreadsheet holds many sheets; every sheet is a tracker-list grid |
| Automation link | `/automation` | Brand-level automation export as an editable spreadsheet |
| Scraping monitoring | `/scraping` | Link-level success / failed / pending log |
| Agency workspace | `/agency` | Role-switched view (header: Spektrum ↔ Agency) |

## Sheet formats

**Project tracker sheet** (KOL · Connector · KOL Ads · Troops) — green = required, blue = optional:

`Name*` · `Link to Account*` · `Followers*` · `Publish Link*` · `Niche` · `SOW Item` · `Actual Publish Date` · `Link to Proof of Content` · `Link to Insights` · `6s Views`

**Data Ads sheet** — same colour rules:

`Start Date*` · `End Date*` · `OA_Content` · `Creative Name*` · `KOL Category` · `Vendor` · `Link Post*` · `Boost Code` · `IG` · `NEW BRIEF` · `Picture` · `Remarks` · `Naming - Uplink`

**Automation link** — 13 columns from the automation export (`Campaign*`, `Ads*`, `Date`, Impressions, Reach, Clicks, Video Views, 2 Second Views, 6 Second Focused Video, 25/50/75/100% views) plus an optional `Link Post` for campaign resolution.

## Rules baked into the prototype

- **Multi-campaign scope.** Campaign cards toggle a selection (one or many). The selection drives the dashboard, Project list and Data Ads. The topbar shows the selection or the opened group.
- **New project needs one campaign.** Creating a project sheet requires exactly one selected campaign; the brand and campaign are shown as fixed badges.
- **Grouping.** Select two or more campaigns and use `Group selected` (popup). Opening a group sets the scope to its members and opens the dashboard. Groups are also created/edited from the grouping section.
- **No campaign type or status in the UI.** Type is an internal effort profile used for seeded metrics; campaigns are simply listed.
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
- **Shortcode matching.** Publish links are cleaned and reduced to a shortcode, looked up across the brand's project sheets. Automation rows link to a campaign only through a shortcode hit, never by campaign name.
- **Import.** CSV/TSV plus paste, with an explicit column-mapping step so each agency can keep its own column order.

## Prototype data

All data is generated deterministically in `lib/seed.ts` and persisted to `localStorage` under `cdn-v2.state.v1` (schema version in `STATE_VERSION`). Bumping the version reseeds on next load. To reset manually:

```js
localStorage.removeItem("cdn-v2.state.v1")
```
