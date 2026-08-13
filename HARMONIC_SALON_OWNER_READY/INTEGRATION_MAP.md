# HARMONIC SALON — Full Integration Map & Check

## Stack (MERN-style on Next.js)

| Layer | Tech | Status |
|-------|------|--------|
| **M**ongoDB | Mongoose + Atlas | ✅ Ready (`MONGODB_URI`) |
| **E**xpress-like API | Next.js App Router `/api/*` | ✅ Ready |
| **R**eact | Next.js 14 + TypeScript + Tailwind | ✅ Ready |
| **N**ode | Next.js server | ✅ Ready |
| Auth | **next-auth** + **bcryptjs** | ✅ Ready |
| Toast | **react-hot-toast** (not react-toastify) | ✅ Ready |
| Session / JWT | next-auth JWT strategy | ✅ Ready |

> Note: Project uses **react-hot-toast**, not `react-toastify`. Same job (success/error messages). Do not install both.

---

## ✅ Already working (no extra package needed)

| Feature | Where |
|---------|--------|
| bcrypt password hash | `src/lib/auth.ts`, `api/auth/register`, `api/users` |
| NEXTAUTH_SECRET | `.env` + `auth.ts` → JWT sign |
| Session / role (admin/staff/customer) | JWT callbacks in `auth.ts` |
| Token expire | `session.maxAge` in `auth.ts` (default 30 days) |
| Login errors | `/login` + next-auth credentials |
| Toast messages | `Providers.tsx` Toaster + all pages |
| Booking + slot lock | `api/bookings`, `api/slots` |
| Complete → auto earning | `lib/finance.ts` |
| Finance / salary / commission | Admin only UI |
| Media by URL | Admin → Media tab |
| WhatsApp stub | `src/lib/whatsapp.ts` (needs Twilio keys) |

---

## 🟡 [MARK] Add later — Cloudinary

**When:** many videos, images, stories (not just 1–2 URLs)

| Item | Location |
|------|----------|
| Helper stub | `src/lib/cloudinary.ts` |
| API mark | `src/app/api/media/route.ts` POST |
| Admin UI | `src/app/admin/page.tsx` → Media tab (now URL only) |
| Env keys | `.env.example` → `CLOUDINARY_*` |

**Steps later:**
```bash
npm install cloudinary
# fill CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET
# change Media tab to file input → uploadToCloudinary()
```

**Until then:** paste public `.mp4` / image URL in Admin → Media.

---

## 🟡 [MARK] Add later — Nodemailer (email)

**When:** booking confirmation email, password reset, PDF salary mail

| Item | Location |
|------|----------|
| Helper stub | `src/lib/mail.ts` |
| Wire after booking | `src/app/api/bookings/route.ts` (call `sendBookingEmail`) |
| Env | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

---

## 🟡 [MARK] SMS / WhatsApp (not email)

| Item | Location |
|------|----------|
| Already coded | `src/lib/whatsapp.ts` |
| Env | `TWILIO_*` or `META_WA_*` in `.env.example` |

SMS OTP login **not** implemented — login is email + password only.  
Add OTP later if needed (Twilio Verify).

---

## 🔐 Secrets checklist (production)

| Key | Purpose | Generate / get |
|-----|---------|----------------|
| `NEXTAUTH_SECRET` | JWT sign key | `openssl rand -base64 32` |
| `MONGODB_URI` | Database | Atlas dashboard |
| `NEXTAUTH_URL` | Site URL | `https://yourdomain.com` |
| `CLOUDINARY_*` | Media upload | cloudinary.com |
| `SMTP_*` | Email | Gmail App Password / SendGrid |
| `TWILIO_*` | WhatsApp/SMS | twilio.com |

**Access token / expire token:**  
next-auth stores JWT in httpOnly cookie. Lifetime = `session.maxAge` in `src/lib/auth.ts`.  
No separate OAuth access_token unless you add Google provider later.

---

## Role visibility

| Page / data | Public | Customer | Staff | Admin |
|-------------|--------|----------|-------|-------|
| Home, services, team, store | ✅ | ✅ | ✅ | ✅ |
| Book | ✅ | ✅ | ✅ | ✅ |
| My bookings | — | ✅ | — | — |
| Dashboard complete job | — | — | ✅ | ✅ |
| Commission % | — | — | ❌ hide | ✅ |
| Finance / Salary | — | — | ❌ | ✅ |
| Media upload | — | — | ❌ | ✅ |

---

## Run

```bash
cp .env.example .env.local   # edit values
npm install
npm run seed
npm run dev
```

Login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`

---

## next-auth common errors

| Error | Fix |
|-------|-----|
| `[next-auth][error][NO_SECRET]` | Set `NEXTAUTH_SECRET` |
| `CLIENT_FETCH_ERROR` | `NEXTAUTH_URL` must match browser URL |
| Login always fails | Seed admin; check email lowercase; password ≥ 6 |
| Session role undefined | Check JWT/session callbacks in `auth.ts` |

Toast library name: **react-hot-toast** (already in `package.json`).
