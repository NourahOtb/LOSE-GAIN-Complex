import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";

import { requireStaff } from "@/lib/auth";
import { kuwaitToday } from "@/lib/checkin";
import { buildMoney, loadMoneyData, METHOD } from "@/lib/money";
import { monthRange } from "@/lib/reports";

const KD = "#,##0.000";

/** Money report as Excel: Summary, Each day, Payments, Refunds (owner, accountant, manager). */
export async function GET(req: NextRequest) {
  const { supabase, profile } = await requireStaff();
  if (!["super_admin", "accountant", "manager"].includes(profile.role)) return new NextResponse("Not allowed", { status: 403 });
  const today = kuwaitToday();
  const q = req.nextUrl.searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(q) ? q : today.slice(0, 7);
  const data = await loadMoneyData(supabase);
  const m = buildMoney(data, month);
  const p = buildMoney(data, monthRange(month).prev);

  const wb = new ExcelJS.Workbook();
  wb.creator = "LOSE | GAIN Complex";
  wb.created = new Date();
  const sheet = (name: string, cols: { header: string; key: string; width?: number; money?: boolean }[], rows: Record<string, unknown>[]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16, style: c.money ? { numFmt: KD } : {} }));
    ws.getRow(1).font = { bold: true };
    ws.addRows(rows);
    if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return ws;
  };

  sheet(
    "Summary",
    [
      { header: "KD", key: "what", width: 36 },
      { header: m.label, key: "now", width: 16, money: true },
      { header: monthRange(monthRange(month).prev).label, key: "before", width: 16, money: true },
      { header: "Change", key: "change", width: 12, money: true },
    ],
    [
      ["Net income (payments − refunds)", m.net, p.net],
      ["Payments", m.gross, p.gross],
      ["Refunds", m.refunded, p.refunded],
      ["Discounts given", m.discounts, p.discounts],
      ["Swimming", m.bySport.swimming, p.bySport.swimming],
      ["Jiu-jitsu", m.bySport.jiujitsu, p.bySport.jiujitsu],
      ["Open pool", m.bySport.openPool, p.bySport.openPool],
      ...Object.keys(METHOD).map((k) => [METHOD[k], m.byMethod[k] ?? 0, p.byMethod[k] ?? 0] as [string, number, number]),
      ["Kids", m.byType.Kid, p.byType.Kid],
      ["Titans", m.byType.Titan, p.byType.Titan],
      ["Adults", m.byType.Adult, p.byType.Adult],
    ].map(([what, now, before]) => ({ what, now, before, change: Math.round((Number(now) - Number(before)) * 1000) / 1000 })),
  );
  sheet(
    "Each day",
    [
      { header: "Date", key: "day", width: 12 },
      { header: "Payments", key: "count", width: 10 },
      { header: "Paid (KD)", key: "amount", width: 14, money: true },
      { header: "Refunds (KD)", key: "refunds", width: 14, money: true },
    ],
    m.daily,
  );
  sheet(
    "Payments",
    [
      { header: "Date", key: "day", width: 12 },
      { header: "Member", key: "member", width: 24 },
      { header: "Package", key: "what", width: 26 },
      { header: "Paid by", key: "method", width: 20 },
      { header: "Price (KD)", key: "base", width: 12, money: true },
      { header: "Discount (KD)", key: "discount", width: 14, money: true },
      { header: "Paid (KD)", key: "total", width: 12, money: true },
    ],
    m.payments,
  );
  sheet(
    "Refunds",
    [
      { header: "Date", key: "day", width: 12 },
      { header: "Member", key: "member", width: 24 },
      { header: "Package", key: "what", width: 26 },
      { header: "Returned by", key: "method", width: 16 },
      { header: "Refund (KD)", key: "amount", width: 14, money: true },
    ],
    m.refundList,
  );

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lg-complex-money-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
