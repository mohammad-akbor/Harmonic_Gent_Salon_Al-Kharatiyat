# HARMONIC SALON — Step by Step Setup (Frontend + Backend)

## কী কী আছে
- Customer online booking + **slot lock** (এক স্লটে দুইজন বুক করতে পারবে না)
- WhatsApp booking message
- Staff / Admin dashboard
- MongoDB backend (Next.js API routes)

---

## STEP 1 — কম্পিউটারে প্রজেক্ট খুলুন

```bash
# ZIP আনজিপ করুন, তারপর:
cd harmonic-salon-app
npm install
```

---

## STEP 2 — MongoDB লিংক বসান

1. https://www.mongodb.com/cloud/atlas → Free cluster বানান
2. Database → Connect → Drivers → connection string কপি
3. প্রজেক্টে:

```bash
cp .env.example .env.local
```

4. `.env.local` খুলে এই লাইনে বসান:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/harmonic_salon
```

**মার্ক:** `.env.example` ফাইলে `🔗 PUT YOUR MONGODB...` লেখা আছে — সেখানেই বসাবেন।

---

## STEP 3 — NextAuth secret

Terminal:

```bash
openssl rand -base64 32
```

`.env.local` এ:

```
NEXTAUTH_SECRET=যে_কোড_পেলেন
NEXTAUTH_URL=http://localhost:3000
```

---

## STEP 4 — WhatsApp Booking SMS

### Option A — Meta WhatsApp Cloud API (recommended)

1. https://developers.facebook.com → App → WhatsApp
2. Phone Number ID + Access Token নিন
3. `.env.local`:

```
WHATSAPP_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=এখানে_ID
WHATSAPP_ACCESS_TOKEN=এখানে_TOKEN
WHATSAPP_BUSINESS_NUMBER=+974XXXXXXXX
```

### Option B — Twilio

```
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**মার্ক:** সব `🔗` চিহ্নিত জায়গা `.env.example` এ আছে।

---

## STEP 5 — Admin ইউজার

`.env.local`:

```
ADMIN_EMAIL=admin@harmonicsalon.com
ADMIN_PASSWORD=ChangeThisPassword123
ADMIN_NAME=Salon Admin
```

Seed চালান:

```bash
npm run seed
```

---

## STEP 6 — লোকালে চালান

```bash
npm run dev
```

ব্রাউজার: http://localhost:3000

| URL | কে |
|-----|-----|
| `/booking` | Customer online booking |
| `/login` | Staff / Admin login |
| `/dashboard` | Admin dashboard |
| `/staff` | Staff own bookings |

---

## STEP 7 — Vercel এ Deploy

1. GitHub এ repo পুশ করুন
2. https://vercel.com → Import project
3. Environment Variables এ `.env.local` এর সব কি বসান
4. `NEXTAUTH_URL` = `https://your-app.vercel.app`
5. Deploy

---

## Slot Lock কীভাবে কাজ করে

- Customer বুক করলে: `staffId + date + startTime` DB তে save
- Unique index → একই স্লটে second booking **reject**
- Status: `confirmed` | `completed` | `cancelled` | `no_show`
- শুধু `completed` / `cancelled` / `no_show` হলে স্লট আবার খুলবে

---

## WhatsApp মেসেজ কখন যায়

1. Booking confirm → Customer কে WhatsApp
2. (Optional) Staff কে নোটিফিকেশন
3. Cancel / Complete → আপডেট মেসেজ

---

## ফাইল কোথায় কী

```
src/app/booking/          → Customer booking page
src/app/dashboard/        → Admin
src/app/api/bookings/     → Booking API + slot lock
src/lib/whatsapp.ts       → WhatsApp send (LINK এখানে ব্যবহার)
src/lib/mongodb.ts        → MongoDB connect (MONGODB_URI)
src/models/               → Booking, Staff, Service, User
.env.example              → সব লিংক মার্ক করা
```

---

## সমস্যা হলে

- MongoDB connect fail → password এ special char encode করুন
- WhatsApp না যায় → Token / Phone Number ID চেক
- Slot always busy → completed/cancel করতে ভুলবেন না
