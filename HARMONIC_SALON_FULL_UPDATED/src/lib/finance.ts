import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Sale } from "@/models/Sale";
import { Tip } from "@/models/Tip";
import { Staff } from "@/models/Staff";
import { Expense } from "@/models/Expense";
import { Purchase } from "@/models/Purchase";
import { Deduction } from "@/models/Deduction";
import { DailyEntry } from "@/models/DailyEntry";

export type DateRange = { from: string; to: string; branchId?: string };

export function calcRowEarnings(
  serviceSales: number,
  productSales: number,
  tips: number,
  servicePercent: number,
  productPercent: number
) {
  return serviceSales * servicePercent + productSales * productPercent + tips;
}

function dateQ(from: string, to: string) {
  return { $gte: from, $lte: to };
}

/**
 * ONE INPUT MODEL
 * ----------------
 * Staff does work → marks booking Complete (one click)
 *   → service amount × staff service%  AUTO adds to staff earnings
 *
 * Product sale linked to staff
 *   → amount × product%  AUTO adds
 *
 * Tips / Penalties / Visa still +/- as before
 *
 * Formula same as Excel:
 *   Gross = Fixed + ServiceComm + ProductComm + Tips
 *   Net   = Gross − Cuts
 *   Salon Profit = Revenue − Comm − Tips − Fixed − Exp − Purch + Deductions retained
 */

export async function calcStaffEarnings(staffId: string, from: string, to: string) {
  await connectDB();
  const staff = await Staff.findById(staffId).lean();
  if (!staff) return null;

  const sp = staff.servicePercent ?? 0.4;
  const pp = staff.productPercent ?? 0.05;

  // --- AUTO from completed bookings (main input) ---
  const bookings = await Booking.find({
    staffId,
    status: "completed",
    date: dateQ(from, to),
  }).lean();

  let bookingServiceSales = 0;
  for (const b of bookings) {
    bookingServiceSales += b.totalAmount || b.price || 0;
  }
  const bookingServiceComm = bookingServiceSales * sp;

  // --- AUTO from product sales ---
  const sales = await Sale.find({ staffId, date: dateQ(from, to) }).lean();
  let saleProductSales = 0;
  let saleProductComm = 0;
  for (const s of sales) {
    saleProductSales += s.totalAmount || 0;
    saleProductComm += s.staffCommission ?? (s.totalAmount || 0) * pp;
  }

  // --- Tips ---
  const tipDocs = await Tip.find({ staffId, date: dateQ(from, to) }).lean();
  let tipsAmount = tipDocs.reduce((a, t) => a + (t.amountToStaff || 0), 0);

  // --- Optional manual DailyEntry (extra only) ---
  const entries = await DailyEntry.find({ staffId, date: dateQ(from, to) }).lean();
  let entryServiceSales = 0;
  let entryProductSales = 0;
  let entryServiceComm = 0;
  let entryProductComm = 0;
  let cash = 0;
  let card = 0;
  let online = 0;
  let extraClients = 0;
  for (const e of entries) {
    entryServiceSales += e.serviceSales || 0;
    entryProductSales += e.productSales || 0;
    entryServiceComm += (e.serviceSales || 0) * (e.servicePercent ?? sp);
    entryProductComm += (e.productSales || 0) * (e.productPercent ?? pp);
    tipsAmount += e.tips || 0;
    cash += e.cash || 0;
    card += e.card || 0;
    online += e.online || 0;
    extraClients += e.totalClients || 0;
  }

  const serviceSales = bookingServiceSales + entryServiceSales;
  const productSales = saleProductSales + entryProductSales;
  const serviceCommission = bookingServiceComm + entryServiceComm;
  const productCommission = saleProductComm + entryProductComm;

  // --- Deductions ---
  const deductions = await Deduction.find({ staffId, date: dateQ(from, to) }).lean();
  let penaltyAmount = 0;
  let visaAmount = 0;
  let advanceAmount = 0;
  let otherCutAmount = 0;
  for (const d of deductions) {
    if (d.type === "Penalty") penaltyAmount += d.amount;
    else if (d.type === "Visa") visaAmount += d.amount;
    else if (d.type === "Advance") advanceAmount += d.amount;
    else otherCutAmount += d.amount;
  }
  if (staff.monthlyRecovery && staff.monthlyRecovery > 0) {
    visaAmount += staff.monthlyRecovery;
  }

  const fixedAmount = staff.salaryType === "Fixed" ? staff.fixedSalary || 0 : 0;
  const totalCuts = penaltyAmount + visaAmount + advanceAmount + otherCutAmount;
  const gross = fixedAmount + serviceCommission + productCommission + tipsAmount;
  const net = gross - totalCuts;

  return {
    staffId: staff._id.toString(),
    staffName: staff.name,
    department: staff.department,
    salaryType: staff.salaryType,
    servicePercent: sp,
    productPercent: pp,
    status: staff.status,
    totalClients: bookings.length + extraClients,
    serviceSales,
    productSales,
    serviceCommission,
    productCommission,
    tipsAmount,
    fixedAmount,
    cash,
    card,
    online,
    penaltyAmount,
    visaAmount,
    advanceAmount,
    otherCutAmount,
    totalCuts,
    grossEarnings: gross,
    netEarnings: net,
    completedBookings: bookings.length,
    salesCount: sales.length,
  };
}

export async function calcProfitLoss(range: DateRange) {
  await connectDB();
  const { from, to, branchId } = range;
  const branchFilter = branchId ? { branchId } : {};

  const bookings = await Booking.find({
    status: "completed",
    date: dateQ(from, to),
    ...branchFilter,
  }).lean();

  const staffDocs = await Staff.find({}).lean();
  const staffMap = Object.fromEntries(staffDocs.map((s) => [s._id.toString(), s]));

  let serviceRevenue = 0;
  let serviceCommission = 0;
  let cashFromBookings = 0;
  let cardFromBookings = 0;
  let onlineFromBookings = 0;
  const clientsByDate: Record<string, number> = {};

  for (const b of bookings) {
    const amt = b.totalAmount || b.price || 0;
    serviceRevenue += amt;
    const st = b.staffId ? staffMap[b.staffId.toString()] : null;
    serviceCommission += amt * (st?.servicePercent ?? 0.4);
    clientsByDate[b.date] = (clientsByDate[b.date] || 0) + 1;
    cashFromBookings += b.cashAmount || 0;
    cardFromBookings += b.cardAmount || 0;
    onlineFromBookings += b.onlineAmount || 0;
  }

  const sales = await Sale.find({ date: dateQ(from, to), ...branchFilter }).lean();
  let productRevenue = 0;
  let productCommission = 0;
  for (const s of sales) {
    productRevenue += s.totalAmount || 0;
    productCommission += s.staffCommission || 0;
  }

  const tips = await Tip.find({ date: dateQ(from, to), ...branchFilter }).lean();
  const tipsToStaff = tips.reduce((a, t) => a + (t.amountToStaff || 0), 0);
  const tipsToSalon = tips.reduce((a, t) => a + (t.amountToSalon || 0), 0);

  // Optional daily entries
  const entries = await DailyEntry.find({ date: dateQ(from, to), ...branchFilter }).lean();
  let entryService = 0,
    entryProduct = 0,
    entryTips = 0,
    entryCash = 0,
    entryCard = 0,
    entryOnline = 0,
    entryServiceComm = 0,
    entryProductComm = 0;
  for (const e of entries) {
    entryService += e.serviceSales || 0;
    entryProduct += e.productSales || 0;
    entryTips += e.tips || 0;
    entryCash += e.cash || 0;
    entryCard += e.card || 0;
    entryOnline += e.online || 0;
    entryServiceComm += (e.serviceSales || 0) * (e.servicePercent ?? 0.4);
    entryProductComm += (e.productSales || 0) * (e.productPercent ?? 0.05);
    clientsByDate[e.date] = (clientsByDate[e.date] || 0) + (e.totalClients || 0);
  }

  const totalServiceRevenue = serviceRevenue + entryService;
  const totalProductRevenue = productRevenue + entryProduct;
  const totalRevenue = totalServiceRevenue + totalProductRevenue;
  const totalCommission =
    serviceCommission + productCommission + entryServiceComm + entryProductComm;
  const totalTipsToStaff = tipsToStaff + entryTips;

  const fixedStaff = await Staff.find({
    status: "Active",
    salaryType: "Fixed",
    ...branchFilter,
  }).lean();
  const fixedSalariesTotal = fixedStaff.reduce((a, s) => a + (s.fixedSalary || 0), 0);

  const expenses = await Expense.find({ date: dateQ(from, to), ...branchFilter }).lean();
  const expenseTotal = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const purchases = await Purchase.find({ date: dateQ(from, to), ...branchFilter }).lean();
  const purchaseTotal = purchases.reduce((a, p) => a + (p.totalCost || 0), 0);

  const deductions = await Deduction.find({ date: dateQ(from, to), ...branchFilter }).lean();
  let penaltyIncome = 0,
    visaIncome = 0,
    advanceIncome = 0,
    otherIncome = 0;
  for (const d of deductions) {
    if (d.type === "Penalty") penaltyIncome += d.amount;
    else if (d.type === "Visa") visaIncome += d.amount;
    else if (d.type === "Advance") advanceIncome += d.amount;
    else otherIncome += d.amount;
  }
  const allActiveStaff = await Staff.find({ status: "Active", ...branchFilter }).lean();
  for (const s of allActiveStaff) {
    if (s.monthlyRecovery) visaIncome += s.monthlyRecovery;
  }
  const deductionsRetained = penaltyIncome + visaIncome + advanceIncome + otherIncome;

  const netProfit =
    totalRevenue -
    totalCommission -
    totalTipsToStaff -
    fixedSalariesTotal -
    expenseTotal -
    purchaseTotal +
    deductionsRetained;

  const totalClients = Object.values(clientsByDate).reduce((a, c) => a + c, 0);
  const daysWithCustomers = Object.values(clientsByDate).filter((c) => c > 0).length;
  const dailyCustomers = Object.entries(clientsByDate)
    .map(([date, clients]) => ({ date, clients }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const staffEarningsList = [];
  for (const s of allActiveStaff) {
    const e = await calcStaffEarnings(s._id.toString(), from, to);
    if (e) staffEarningsList.push(e);
  }

  return {
    from,
    to,
    branchId: branchId || null,
    income: {
      serviceRevenue: totalServiceRevenue,
      productRevenue: totalProductRevenue,
      totalRevenue,
      tipsCollected: totalTipsToStaff,
      tipsToSalon,
      deductionsRetained,
      penaltyIncome,
      visaIncome,
      advanceIncome,
      otherIncome,
    },
    costs: {
      serviceCommission: serviceCommission + entryServiceComm,
      productCommission: productCommission + entryProductComm,
      totalCommission,
      tipsPaidToStaff: totalTipsToStaff,
      fixedSalaries: fixedSalariesTotal,
      expenses: expenseTotal,
      purchases: purchaseTotal,
    },
    payments: {
      cash: cashFromBookings + entryCash,
      card: cardFromBookings + entryCard,
      online: onlineFromBookings + entryOnline,
      payTotal: cashFromBookings + cardFromBookings + onlineFromBookings + entryCash + entryCard + entryOnline,
      fromBookings: { cash: cashFromBookings, card: cardFromBookings, online: onlineFromBookings },
    },
    clients: {
      totalClients,
      daysWithCustomers,
      dailyCustomers,
      fromBookings: bookings.length,
    },
    profit: {
      net: netProfit,
      isProfit: netProfit >= 0,
      formula:
        "Revenue − Commission − Tips − Fixed − Expenses − Purchases + Deductions retained",
    },
    staff: {
      grossPayable: staffEarningsList.reduce((a, e) => a + e.grossEarnings, 0),
      netPayable: staffEarningsList.reduce((a, e) => a + e.netEarnings, 0),
      list: staffEarningsList.sort((a, b) => b.netEarnings - a.netEarnings),
    },
    fixedStaffBreakdown: fixedStaff.map((s) => ({
      name: s.name,
      fixedSalary: s.fixedSalary,
      status: s.status,
    })),
  };
}

export async function getDashboardSummary(branchId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const yearStart = today.slice(0, 4) + "-01-01";
  const [todayPL, monthPL, yearPL] = await Promise.all([
    calcProfitLoss({ from: today, to: today, branchId }),
    calcProfitLoss({ from: monthStart, to: today, branchId }),
    calcProfitLoss({ from: yearStart, to: today, branchId }),
  ]);
  return { today: todayPL, month: monthPL, year: yearPL };
}
