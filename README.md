# trust-foundation-management-system

## Deploy To Vercel (Production)

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. In Vercel Project Settings > Environment Variables, add:
	- `MONGODB_URI` (required)
	- `APP_ADMIN_USERNAME` (optional but recommended for first admin seed)
	- `APP_ADMIN_PASSWORD` (optional but recommended for first admin seed)
4. Deploy with default Next.js build command (`next build`).

### Important Notes

- This app uses MongoDB and will fail startup if `MONGODB_URI` is missing.
- Admin auto-seed only happens if admin credentials env vars are present and no admin exists.
- Next.js `middleware` has been migrated to `proxy` for Next 16 compatibility.

### Local Production Check

Use this before deploying:

```bash
npm run build
npm run start
```
