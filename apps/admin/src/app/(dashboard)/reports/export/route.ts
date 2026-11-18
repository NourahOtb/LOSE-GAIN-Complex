import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";

import { requireStaff } from "@/lib/auth";
import { kuwaitToday } from "@/lib/checkin";
import { buildReport, loadReportData, monthRange, NOT_RENEWED_DAYS } from "@/lib/reports";

/** Reports as an Excel file: a summary sheet plus one sheet per list (owner and managers). */
export async function GET(req: NextRequest) {
  const { supabase, profile } = await requireStaff();
  if (!["super_admin", "manager"].includes(profile.role)) return new NextResponse("Not allowed", { status: 403 });
  const today = kuwaitToday();
  const q = req.nextUrl.searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(q) ? q : today.slice(0, 7);
  const data = await loadReportData(supabase);
  const r = buildReport(data, month, today);
  const p = buildReport(data, monthRange(month).prev, today);

  const wb = new ExcelJS.Workbook();
  wb.creator = "LOSE | GAIN Complex";
  wb.created = new Date();
  const sheet = (name: string, cols: { header: string; key: string; width?: number }[], rows: Record<string, unknown>[]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ ...c, width: c.width ?? 16 }));
    ws.getRow(1).font = { bold: true };
    ws.addRows(rows);
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return ws;
  };

  sheet(
    "Summary",
    [
      { header: "What", key: "what", width: 36 },
      { header: r.label, key: "now", width: 16 },
      { header: monthRange(month).prev ? monthRange(monthRange(month).prev).label : "", key: "before", width: 16 },
      { header: "Change", key: "change", width: 10 },
    ],
    [
      ["Active members", r.members.active, p.members.active],
      ["  Swimming", r.members.bySport.swimming, p.members.bySport.swimming],
      ["  Jiu-jitsu", r.members.bySport.jiujitsu, p.members.bySport.jiujitsu],
      ["  Open pool", r.members.bySport.openPool, p.members.bySport.openPool],
      ["  Kids", r.members.byType.Kid, p.members.byType.Kid],
      ["  Titans", r.members.byType.Titan, p.members.byType.Titan],
      ["  Adults", r.members.byType.Adult, p.members.byType.Adult],
      ["New members", r.members.new, p.members.new],
      ["Registrations ended", r.members.ended, p.members.ended],
      ["  Renewed", r.members.renewed, p.members.renewed],
      [`  Not renewed (${NOT_RENEWED_DAYS} days)`, r.members.notRenewed, p.members.notRenewed],
      ["  Not renewed yet", r.members.waiting, p.members.waiting],
      ["Check-ins", r.attendance.checkIns, p.attendance.checkIns],
      ["Booked classes (counted)", r.attendance.booked, p.attendance.booked],
      ["Booked classes attended", r.attendance.came, p.attendance.came],
      ["Members who missed 2+", r.attendance.flagged.length, p.attendance.flagged.length],
    ].map(([what, now, before]) => ({ what, now, before, change: Number(now) - Number(before) })),
  );

  sheet(
    "Attendance by class",
    [
      { header: "Day", key: "day", width: 8 },
      { header: "Time", key: "time", width: 10 },
      { header: "Class", key: "label", width: 30 },
      { header: "Booked", key: "booked", width: 10 },
      { header: "Came", key: "came", width: 10 },
      { header: "Attendance %", key: "rate", width: 14 },
    ],
    r.attendance.perClass.map((c) => ({ ...c, rate: Math.round(c.rate * 100) })),
  );

  sheet(
    "Attendance by member",
    [
      { header: "Member", key: "name", width: 24 },
      { header: "Type", key: "type", width: 8 },
      { header: "Guardian", key: "guardian", width: 22 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Booked", key: "booked", width: 10 },
      { header: "Came", key: "came", width: 10 },
      { header: "Missed", key: "missed", width: 10 },
      { header: "Missed dates", key: "dates", width: 40 },
    ],
    r.attendance.perMember.map((m) => ({ ...m, dates: m.missedDates.join(", ") })),
  );

  sheet(
    "Not renewed",
    [
      { header: "Member", key: "name", width: 24 },
      { header: "Type", key: "type", width: 8 },
      { header: "Guardian", key: "guardian", width: 22 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Ended", key: "ended", width: 12 },
      { header: "Status", key: "status", width: 18 },
    ],
    r.members.notRenewedList.map((m) => ({ ...m, status: m.waiting ? "Not renewed yet" : "Not renewed" })),
  );

  sheet(
    "New members",
    [
      { header: "Member", key: "name", width: 24 },
      { header: "Type", key: "type", width: 8 },
      { header: "Guardian", key: "guardian", width: 22 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Started", key: "started", width: 12 },
    ],
    r.members.newList,
  );

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lg-complex-report-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
