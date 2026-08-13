# Data safety — app crash ≠ data loss

## Where data lives (independent of Next.js process)

| Data | Storage | Survives app crash? |
|------|---------|---------------------|
| Users, bookings, staff, finance | **MongoDB Atlas** (cloud) | ✅ YES |
| Videos / images | **Cloudinary** (cloud) | ✅ YES |
| Sessions | JWT cookie (client) | Login again if needed |
| Local `/public/uploads` | Server disk only | ⚠️ Vercel ephemeral — use Cloudinary |

If Vercel / Node **crashes or redeploys**:
- MongoDB data stays
- Cloudinary media stays
- Just open the site again — no reinstall of business data

## Backup (optional weekly)

```bash
npm run backup
```
Creates `backups/YYYY-MM-DD/*.json` from Atlas.

Also: MongoDB Atlas → Clusters → … → **Backup** (Atlas free tier has limited snapshot options; M0 is fine for start; export with this script).

## Production checklist

1. MongoDB Atlas Network Access `0.0.0.0/0`
2. Cloudinary keys in Vercel env
3. Never store only on local disk
4. `NEXTAUTH_SECRET` strong and stable (don't change often)
