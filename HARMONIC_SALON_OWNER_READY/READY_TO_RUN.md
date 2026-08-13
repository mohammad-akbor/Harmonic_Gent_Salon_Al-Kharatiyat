# HARMONIC SALON — Full System (Excel-matched)

## Core workflow (same as your Excel)
1. **Daily Entry** (`/daily-entry`) — প্রতিদিন প্রতি স্টাফ ১ লাইন
   - Clients, Service Sales, Product Sales, Tips
   - Cash / Card / Online (auto match check)
   - Staff Earnings = Service×% + Product×% + Tips (auto)

2. **Finance / Monthly Report** (`/finance`)
   - Income, Costs, Deductions retained
   - NET PROFIT = Revenue − Commission − Tips − Fixed − Expenses − Purchases + Deductions
   - Cash / Card / Online totals
   - Daily customer count (SUM all staff, never divide)
   - Staff performance + Net payable
   - Year auto total

3. **Admin** (`/admin`)
   - Services, Staff (30/35/40/45% + product %), Products, Branches, Users
   - Visa recovery fields on staff

4. **Deductions**
   - Penalty / Visa / Advance / Other
   - Staff net ↓ · Salon profit ↑

## Routes
| URL | Access |
|-----|--------|
| `/daily-entry` | Staff / Admin / Manager |
| `/finance` | Admin / Manager |
| `/admin` | Admin |
| `/booking` | Public |
| `/dashboard` | Staff bookings complete |

## Run
```bash
cd harmonic-salon-app
npm install
npm run seed
npm run dev
```
Admin: admin@harmonicsalon.com / ADMIN_PASSWORD from .env.local
