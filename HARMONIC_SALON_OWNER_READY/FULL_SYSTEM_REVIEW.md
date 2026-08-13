# HARMONIC SALON — Full System Review (A → Z)

## Roles visibility

| Feature | Public | Customer | Staff | Admin |
|---------|--------|----------|-------|-------|
| Home / Services / Team / Store | SHOW | SHOW | SHOW | SHOW |
| Book appointment | SHOW | SHOW | SHOW | SHOW |
| Commission % / Fixed salary amount | HIDE | HIDE | HIDE | SHOW |
| Finance / Salary / Admin panel | HIDE | HIDE | HIDE | SHOW |
| Dashboard Complete | HIDE | HIDE | SHOW | SHOW |
| My Bookings | HIDE | SHOW | HIDE | HIDE |

## Staff types

| salaryType | On customer booking page | Pay |
|------------|--------------------------|-----|
| Commission + Active | SHOW | % of service + product + tips |
| Fixed + Active | HIDE (not bookable) | monthly fixedSalary |
| Inactive | HIDE | — |

## Money

Staff Net = Fixed + (Service×%) + (Product×%) + Tips − Penalty − Visa − Advance − Other  

Salon Profit = Revenue − Commissions − Tips − Fixed − Expenses − Purchases + Deductions kept  

## Flows

Customer register → book (commission staff only) → staff Complete → earning auto  
Admin: service, staff (Fixed/Commission), product, media, finance, salary pay  
Product sale → stock down → sold out at 0 → product % to staff  
