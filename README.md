# escuelita-coches

Single-page Vue 3 + TypeScript app for planning the school run (Mon–Fri).

- Morning drop-off row with couple selector (C&F / L&P) and time (08:30–08:50).
- Empty "School" row.
- School pick-up row with couple selector only.
- Persists one week via Netlify Blobs (`netlify/functions/week.ts`).
- Reset button clears the week. Week number, month and dates are computed from the current week.

## Dev

```bash
npm install
npm run dev          # Vite only (persistence falls back to localStorage)
netlify dev          # Vite + Netlify function (Blobs in sandbox mode)
```

## Build / deploy

```bash
npm run build
netlify deploy --build --prod
```