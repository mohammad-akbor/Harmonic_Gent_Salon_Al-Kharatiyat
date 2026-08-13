# START HERE — HARMONIC SALON

## Admin login (updated)

```
Email:    memohammadakborali@gmail.com
Password: Harmonic@4$
```

## First run (empty system)

```bash
npm install
npm run clear-demo
npm run seed
npm run dev
```

After this:
- Staff = empty
- Services = empty  
- Products = empty
- Only Admin exists

You add everything from Admin panel yourself.

---

## Public home page media

Admin → Media → choose type:

| Type | Where it shows |
|------|----------------|
| **Background Video** | Full website background (autoplay) |
| **Gallery Image** | Home → Gallery & Stories |
| **Story / Shot** | Home → Gallery & Stories |
| **Hero Image** | Home → Gallery & Stories |
| **Promo Video** | Home → Gallery & Stories |

Customers see these without login.

---

## Public pages

- `/` Home — video background + gallery + services + team + store
- `/store` — full product store (public)
- `/booking` — book appointment

---

## SMS

Twilio enabled. Trial = only verified numbers get SMS.  
See `TRIAL_SMS_NOTE.md`

## Free deploy

See `LIVE_FREE_DEPLOY.md`
