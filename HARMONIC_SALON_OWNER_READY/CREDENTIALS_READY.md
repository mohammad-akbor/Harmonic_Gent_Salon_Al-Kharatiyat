# Credentials configured in `.env.local`

## Cloudinary ✅
- Cloud name: `fgwnzyf4`
- Used by: Admin → Media → Direct Upload
- Helper: `src/lib/cloudinary.ts`

## Gmail SMTP ✅
- User: `memohammadakborali@gmail.com`
- App password set (spaces removed in SMTP_PASS)
- Used by: Login → OTP Email
- Helper: `src/lib/mail.ts` (needs `npm install nodemailer`)

## Run
```bash
npm install
npm run seed
npm run dev
```

## Security
You shared API secrets in chat. After app works, rotate:
1. Cloudinary → Settings → API Keys → Regenerate Secret
2. Google → App Passwords → Revoke & create new
3. Update `.env.local` / Vercel env

Never commit `.env.local` to GitHub.
