# HARMONIC SALON — Business rules (final)

## NO Excel Daily Entry (main flow)
- Primary input = **Staff Complete** on Dashboard
- Optional `/daily-entry` only for emergency/manual (hidden from main nav)

## Staff commission (set at Admin → Create Staff)
- 30% / 35% / 40% / 45% = `servicePercent`
- On **Complete**: amount × service% → staff profile earnings

## Product
- Staff gets **5%** (`productPercent`) · rest salon
- Tips → staff
- Penalty → salon profit (+) · staff cut (−)
- Advance / Visa recovery → cut from staff net

## Payment on Complete
- Cash / Card / Online / Mixed amounts saved on booking
- Finance shows daily cash vs card totals

## Counts
- Per staff clients = completed bookings count
- Salon day total = SUM all completed clients that day

## Reviews
- Customer → My Bookings → completed → ★ Review staff

## Profit
```
+ Service revenue + Product revenue + Penalties retained
− Commissions − Tips to staff − Fixed salaries − Expenses − Purchases
= Salon NET PROFIT
```
