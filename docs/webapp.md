# Pedigree Editor Web App (API + Auth)

This repo now includes a minimal web API to run the pedigree editor against a server-side SQLite database.

## Quick start (local)

1. Install deps:
   - `npm install`
2. Set env vars (PowerShell examples):
   - `$env:JWT_SECRET="change-me"`
   - `$env:DB_PATH="C:\path\to\pedigree.db"`
   - `$env:PDF_DIR="C:\path\to\pdfs"`
3. Start the API:
   - `npm run server`

## Auth endpoints

- `POST /api/auth/register` `{ "email": "...", "password": "..." }`
- `POST /api/auth/login` `{ "email": "...", "password": "..." }`
- `POST /api/auth/issue` `{ "userId": 123, "secret": "EDITOR_ISSUE_SECRET" }`
- `GET /api/auth/me` (Authorization: Bearer <token>)

Both return `{ token, user }`. The token is a Bearer JWT.

## Editor integration

The editor reads:
- `window.__PEDIGREE_API_BASE__` (API base URL)
- `localStorage.pedigree_token` (JWT token)

Example before loading the editor:
```html
<script>
  window.__PEDIGREE_API_BASE__ = "https://your-api-domain.com";
  localStorage.setItem("pedigree_token", "YOUR_JWT_TOKEN");
</script>
```

## API surface used by the editor

- `GET /api/pedigrees` (list)
- `POST /api/pedigrees/claim-legacy` (assign legacy NULL `user_id` rows to current user)
- `GET /api/pedigrees/by-name/:name` (load)
- `POST /api/pedigrees` (save)
- `DELETE /api/pedigrees/by-name/:name` (delete)
- `POST /api/pedigrees/:id/pdfs` (store PDF)
- `GET /api/pedigrees/:id/pdfs` (list PDFs)
- `GET /api/pedigrees/pdfs/:pdfId` (download PDF)
- `POST /api/pedigrees/:id/variations` (save molecular variation)
- `GET /api/pedigrees/:id/variations?personId=...` (load variations)
- `GET /api/pedigrees/:id/variations-all` (load all variations)
- `DELETE /api/pedigrees/variations/:variationId`
- `GET /api/pedigrees/webform/:familyId` (webform data)

## Notes

- SQLite is still used; multi-user is enforced by `pedigrees.user_id`.
- Existing rows with null `user_id` are allowed; new saves always set `user_id`.
- Server-side PDF files are saved to `PDF_DIR` (default `data/pdfs`).
