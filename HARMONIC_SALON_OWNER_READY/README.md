# HARMONIC SALON — Full App

Next.js 14 + MongoDB + next-auth + Tailwind  
Booking · Staff complete → auto commission · Finance · Multi-branch · Public premium home

## Quick start

```bash
cp .env.example .env.local
# edit MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL
npm install
npm run seed
npm run dev
```

Open http://localhost:3000  
Admin: see `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env.local`

## Docs

- **INTEGRATION_MAP.md** — Cloudinary / nodemailer / Twilio / bcrypt / tokens **MARKED**
- **SETUP_STEP_BY_STEP.md** — deploy notes
- **READY_TO_RUN.md** — checklist

## Stack notes

- Password: **bcryptjs**
- Auth: **next-auth** JWT (session maxAge = token expire)
- Toast: **react-hot-toast** (not react-toastify)
- Media now: URL paste · later: **Cloudinary** (`src/lib/cloudinary.ts`)
- Email later: **nodemailer** (`src/lib/mail.ts`)
- WhatsApp: **Twilio** stub (`src/lib/whatsapp.ts`)
