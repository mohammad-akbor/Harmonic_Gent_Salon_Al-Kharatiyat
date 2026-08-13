# HARMONIC SALON — Final Complete

## Admin login

```
Email:    memohammadakborali@gmail.com
Password: Harmonic@4$
```

## Empty system (you add everything)

```bash
npm install
npm run clear-demo   # empties Staff + Services + Products
npm run seed         # creates/updates Admin only
npm run dev
```

Then from Admin panel add:
- Staff (with phone for SMS)
- Services
- Products
- Media (video / gallery / story)

---

## Public website media

| Upload type (Admin → Media) | Shows on |
|-----------------------------|----------|
| Background Video | Full site background (autoplay loop) |
| Gallery Image | Home → Gallery & Stories |
| Story / Shot | Home → Gallery & Stories |
| Hero Image | Home → Gallery & Stories |
| Promo Video | Home → Gallery & Stories |

Public customers see all of this without login.

---

## Other features ready

- Booking + slot lock
- Auto SMS customer + staff (Twilio)
- Commission on complete
- Cash/Card tracking
- Store `/store` public
- Finance / Salary / Inventory / Attendance
- Free Vercel deploy → LIVE_FREE_DEPLOY.md
