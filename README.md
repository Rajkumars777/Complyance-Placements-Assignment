# ROI Simulator — Invoicing Automation

Lightweight ROI calculator with a Next.js frontend and an Express backend (MongoDB persistence optional).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local dev (frontend + backend)

1. Copy `.env.example` to `.env` and set `MONGO_URI` (optional) and `MONGO_DB` if you want saved scenarios to persist.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Start both servers in development (frontend runs on port 3000, backend on 4000):

   ```powershell
   npm run dev:all
   ```

## Notes on integration

- The frontend calls `/api/*` endpoints. During development `next.config.ts` rewrites `/api/*` to `http://localhost:4000/api/*` so the frontend can talk to the Express server without CORS issues.
- In production, set `NEXT_PUBLIC_API_BASE` to the full API URL (e.g., `https://my-api.example.com/api`) if the API is hosted separately.
- If `MONGO_URI` is not set, simulation still works, but saving/loading scenarios will return an error (DB not configured).

## API endpoints

- POST /api/simulate — run simulation (body: the inputs JSON)
- POST /api/scenarios — save scenario
- GET /api/scenarios — list all
- GET /api/scenarios/:id — retrieve scenario
- DELETE /api/scenarios/:id — delete scenario
- POST /api/report/generate — generate HTML report (requires { email, input })

## Deployment

- The Express API needs to be hosted on a reachable URL (Render, Railway, Heroku, etc.).
- Host the Next.js frontend on Netlify (or Vercel). If the API is hosted separately, set `NEXT_PUBLIC_API_BASE` in your frontend environment variables to the API base (e.g., `https://api.example.com/api`).

## Security and privacy

- The backend report generation simply returns HTML in this prototype. If you collect emails or send reports, do so with a proper privacy policy and secure storage.

If you want, I can:

- Add server-side PDF export and return a downloadable file instead of HTML.
- Prepare a Render or Railway deployment for the Express API and wire the frontend on Netlify with the correct env var.

Happy to continue with deployment or adding PDF export — tell me which next step you prefer.
