# SMS Notifications Setup (Twilio)

## Automatic SMS events

| Event | Who receives SMS |
|-------|------------------|
| Customer books | **Customer** (CONFIRMED) + **Staff** (NEW BOOKING) |
| Staff completes | **Customer** (COMPLETED) |
| Booking cancelled | **Customer** (CANCELLED) + **Staff** (CANCELLED) |

## 1. Create Twilio account
1. https://www.twilio.com/try-twilio — Sign up  
2. Console → copy **Account SID** + **Auth Token**  
3. Phone Numbers → Get a number (Trial number is fine)  
4. Copy the number → use as `TWILIO_SMS_FROM` (example: `+1234567890`)

## 2. .env.local (or Vercel Environment Variables)
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_SMS_FROM=+1234567890
```

## 3. Qatar phone numbers
App auto-formats:
- `77064447` → `+97477064447`
- `97477064447` → `+97477064447`

**Important:** Staff phone must be saved in Admin → Staff form (phone field).

## 4. Trial account limit
Twilio trial only sends SMS to **verified** numbers.
- Console → Phone Numbers → Verified Caller IDs → Add +974...
- Verify every customer/staff number you want to test with.

## 5. Test
```bash
npm run dev
```
1. Staff-এর phone number Admin panel-এ save করুন
2. Booking করুন → Customer + Staff দুজনেই SMS পাবে
3. Complete করলে Customer-কে COMPLETED SMS যাবে

## 6. WhatsApp vs SMS
| | SMS | WhatsApp |
|--|-----|----------|
| Env | `SMS_PROVIDER=twilio` | `WHATSAPP_PROVIDER=twilio` |
| From number | `TWILIO_SMS_FROM` | `TWILIO_WHATSAPP_FROM` |
| Both together | Yes — enable both | |

`SMS_PROVIDER=off` দিলে শুধু SMS বন্ধ হয় (WhatsApp আলাদা)।
