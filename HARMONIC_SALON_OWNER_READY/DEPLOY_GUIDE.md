# HARMONIC SALON — Deploy Guide (Vercel + Docker)

---

## A) Vercel (recommended — free, easiest for Next.js)

### 1. Prepare GitHub
```bash
cd harmonic-salon-app
git init
git add .
git commit -m "HARMONIC SALON production"
# create repo on github.com then:
git remote add origin https://github.com/YOUR_USER/harmonic-salon.git
git branch -M main
git push -u origin main
```
**Do NOT commit `.env.local`** (already in `.gitignore`).

### 2. Deploy on Vercel
1. Go to https://vercel.com → Login with GitHub  
2. **Add New Project** → import `harmonic-salon`  
3. Framework: **Next.js** (auto)  
4. **Environment Variables** — add all from your `.env.local`:

| Name | Example |
|------|---------|
| `MONGODB_URI` | `mongodb+srv://...` |
| `NEXTAUTH_SECRET` | long random string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (set AFTER first deploy) |
| `ADMIN_EMAIL` | `admin@harmonicsalon.com` |
| `ADMIN_PASSWORD` | your password |
| `CLOUDINARY_CLOUD_NAME` | `fgwnzyf4` |
| `CLOUDINARY_API_KEY` | your key |
| `CLOUDINARY_API_SECRET` | your secret |
| `CLOUDINARY_FOLDER` | `harmonic-salon` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `memohammadakborali@gmail.com` |
| `SMTP_PASS` | app password no spaces |
| `MAIL_FROM` | `HARMONIC SALON <memohammadakborali@gmail.com>` |

5. Click **Deploy**

### 3. After first deploy
- Copy URL: `https://harmonic-salon-xxx.vercel.app`  
- Vercel → Settings → Env → set `NEXTAUTH_URL` to that URL  
- **Redeploy**

### 4. MongoDB Atlas
Network Access → **Allow 0.0.0.0/0** (Vercel IPs change)

### 5. Seed admin (once)
On your PC with same `MONGODB_URI`:
```bash
npm run seed
```

### 6. Custom domain (later)
Vercel → Project → Domains → add `harmonicsalon.com`

---

## B) Docker Compose (VPS / local production)

### Requirements
- Docker + Docker Compose installed  
- `.env.local` filled (MongoDB Atlas, secrets, etc.)

### Run
```bash
cd harmonic-salon-app
docker compose up -d --build
```
Open: http://localhost:3000

### Useful commands
```bash
docker compose logs -f web
docker compose restart
docker compose down
```

### Seed with Docker
```bash
docker compose run --rm web node scripts/seed.js
# OR seed from host against same MONGODB_URI:
npm run seed
```

### Note
- App uses **MongoDB Atlas** (cloud), not a local Mongo container.  
- Local file uploads saved in Docker volume `salon_uploads`.  
- Prefer **Cloudinary** for media on production.

---

## C) Node.js on VPS (without Docker)

```bash
# Ubuntu example
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
git clone YOUR_REPO && cd harmonic-salon-app
cp .env.example .env.local   # edit values
npm install
npm run build
npm run seed
# keep alive with PM2:
npm install -g pm2
pm2 start npm --name harmonic -- start
pm2 save && pm2 startup
```
Nginx reverse proxy → port 3000 + SSL (Certbot).

---

## Checklist before go-live

- [ ] `NEXTAUTH_URL` = real https URL  
- [ ] `NEXTAUTH_SECRET` strong random  
- [ ] Atlas Network Access open  
- [ ] `npm run seed` done  
- [ ] Cloudinary + Gmail tested  
- [ ] Admin login works  
- [ ] Change default admin password via `/settings`  
