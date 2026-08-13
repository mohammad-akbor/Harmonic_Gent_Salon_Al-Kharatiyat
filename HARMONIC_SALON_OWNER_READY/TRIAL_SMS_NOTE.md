# Twilio Trial — Important Note

## What works free (Trial)

- You can send SMS **only** to numbers that are verified in Twilio.
- How to verify:
  1. https://console.twilio.com → Phone Numbers → Verified Caller IDs
  2. Add number (e.g. +97477064447)
  3. Enter the code Twilio sends

## Recommendation for free use

1. Verify **your own number**
2. Verify **2–3 staff numbers** you use daily
3. For testing customers, use your own number as customer phone

## When you want full automatic SMS

Upgrade Twilio account (add payment method).  
After upgrade → any customer/staff number will receive SMS automatically.  
No need to verify one by one.

Cost is very low (~0.26 USD per SMS to Qatar).

## Current .env.local is already configured

SMS_PROVIDER=twilio  
Account SID + Auth Token + From number are set.
