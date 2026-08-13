# HARMONIC SALON — 100% Free Live Deploy Guide

## Free stack (no credit card needed for start)

| Service | What it gives | Cost |
|---------|---------------|------|
| **GitHub** | Code storage | Free |
| **Vercel** | Hosting + HTTPS | Free (Hobby) |
| **Domain** | `your-name.vercel.app` | Free forever |
| **MongoDB Atlas** | Database | Free M0 |
| **Cloudinary** | Photos + Video | Free tier |
| **Gmail** | Email OTP / notifications | Free |
| **Twilio** | SMS (trial) | Free trial credit |

---

## 1. Push code to GitHub

Your repo:
```
https://github.com/mohammad-akbor/Harmonic_Gent_Salon_Al-Kharatiyat.git
```

On your computer:

```bash
cd harmonic-salon-app
git init
git add .
git commit -m "HARMONIC SALON final ready"
git branch -M main
git remote add origin https://github.com/mohammad-akbor/Harmonic_Gent_Salon_Al-Kharatiyat.git
git push -u origin main
```

**Important:** `.env.local` is already in `.gitignore` — it will never be pushed.

---

## 2. Deploy on Vercel (free)

1. Go to → https://vercel.com  
2. Login with **GitHub**  
3. Click **Add New Project** → Import `Harmonic_Gent_Salon_Al-Kharatiyat`  
4. Framework: Next.js (auto detected)  
5. Click **Environment Variables** and add **all** keys from your `.env.local`:

```
MONGODB_URI
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAIL
ADMIN_PASSWORD
SALON_NAME
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_FOLDER
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MAIL_FROM
SMS_PROVIDER
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
WHATSAPP_PROVIDER
```

6. First deploy → leave `NEXTAUTH_URL` as `http://localhost:3000`  
7. After deploy finishes you get a free URL like:
   ```
   https://harmonic-gent-salon-xxx.vercel.app
   ```
8. Go back to Vercel → Project → Settings → Environment Variables  
   → Edit `NEXTAUTH_URL` = your live Vercel URL  
9. Redeploy (Deployments → … → Redeploy)

---

## 3. MongoDB Atlas (free)

1. https://cloud.mongodb.com  
2. Network Access → Add IP → `0.0.0.0/0` (Allow from anywhere)  
3. Database Access → user already created  
4. Use the same `MONGODB_URI` in Vercel

After first deploy, from your local machine (with same URI):

```bash
npm run seed
```

This creates only the Admin account (clean system).

---

## 4. Free domain options

| Option | URL example | Cost | Notes |
|--------|-------------|------|-------|
| **Vercel free** | `harmonic-salon.vercel.app` | Free | Best for start |
| frii.site | `yourname.frii.site` | Free | Can point to Vercel |
| Custom domain later | `harmonicsalon.qa` | ~$10–15/year | Buy when ready |

For now use the free `.vercel.app` URL. It is professional and HTTPS is automatic.

---

## 5. Twilio SMS (after deploy)

In Vercel Environment Variables set:

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_SMS_FROM=+17372508034
```

Then Redeploy.

**Trial limit:** Only verified numbers receive SMS.  
Verify numbers in Twilio Console → Phone Numbers → Verified Caller IDs.

---

## 6. Final checklist after go-live

- [ ] Open live URL → Login with admin  
- [ ] Change password in Settings  
- [ ] Add Staff (with phone number)  
- [ ] Add Services  
- [ ] Test booking → SMS should go to customer + staff  
- [ ] Complete booking → Customer gets COMPLETED SMS  
- [ ] MongoDB data is safe (never deleted by redeploy)

---

## Update the live site later

Just push to GitHub:

```bash
git add .
git commit -m "update"
git push
```

Vercel automatically rebuilds and deploys.

---

**Your live free URL will look like:**
```
https://harmonic-gent-salon-al-kharatiyat.vercel.app
```
(or the name Vercel gives you)
