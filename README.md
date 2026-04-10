# Dragon Boat Sitting Layout

Mobile-friendly web app for managing dragon boat crew seating layouts. Built for the Serbian national team competing at Munich 2026.

## Features

- **Interactive boat layout** — visual grid showing all seats (drummer, paddlers, helm, reserves)
- **Drag-and-drop** — rearrange athletes between seats on desktop
- **Tap-to-assign** — tap empty seat to pick from athlete pool (mobile-friendly), with Women/Men tabs
- **Fits on screen** — entire boat layout visible without scrolling on any device
- **Race management** — add, remove, duplicate, rename races with boat type, distance, gender and age category
- **Athlete management** — add, edit, remove (soft delete), restore athletes
- **Weight balance** — real-time left/right and front/rear weight calculation with bench factors
- **Policy engine** — gender restrictions (Women/Open/Mixed), age category rules, configurable mixed ratio
- **Excel import/export** — import athlete data or full layouts from .xlsx, export current state
- **Settings** — configurable competition year, mixed boat ratio, age category rules
- **Persistent** — all changes saved to localStorage

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- @dnd-kit (drag-and-drop)
- SheetJS (Excel import/export)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` on your phone or desktop.

## Data

Initial athlete and race data is loaded from `src/data/data.json`, converted from the original Excel spreadsheet using `convert_excel.py`.

## Policies

### Gender
- **Women** boat: only female athletes allowed
- **Open** boat: no restriction
- **Mixed** boat: min/max of either gender among paddlers (drummer and helm exempt per IDBF CR2.1.3)

### Age Categories
| Category | Rule |
|----------|------|
| 18U | age <= 18 |
| 24U | age <= 24 |
| Premier | no restriction |
| Senior A | age >= 40 |
| Senior B | age >= 50 |
| Senior C | age >= 60 |
| Senior D | age >= 70 |
| BCP | no restriction |

Age is calculated as: competition year - year of birth.
