import jsPDF from "jspdf";
import "jspdf-autotable";

interface ReportData {
  totalComplaints: number;
  activeIssues: number;
  delayedIssues: number;
  resolvedToday: number;
  complaintsByCategory: Record<string, number>;
  complaintsByDepartment: Record<string, number>;
  departments: Array<{
    department_name: string;
    head: string;
    active_issues: number;
    resolved_issues: number;
    avg_resolution_days: number;
  }>;
}

export function generateGovernanceReport(data: ReportData) {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("NitiSetu", 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Governance Intelligence Report", 14, 28);
  doc.text(`Generated: ${dateStr}`, 14, 33);

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 36, 196, 36);

  // Executive Summary
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Executive Summary", 14, 44);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(
    [
      `Total Complaints Received: ${data.totalComplaints}`,
      `Active Issues: ${data.activeIssues}`,
      `Delayed Issues (SLA Breach): ${data.delayedIssues}`,
      `Resolved Today: ${data.resolvedToday}`,
      `Report Period: Last 30 days`,
      `Districts Covered: Delhi, Noida, Ghaziabad, Gurugram, Faridabad`,
    ],
    14,
    52
  );

  // Complaints by Category table
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Complaints by Category", 14, 90);

  const categoryRows = Object.entries(data.complaintsByCategory).map(
    ([cat, count]) => [
      cat,
      String(count),
      `${Math.round((count / data.totalComplaints) * 100)}%`,
    ]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: 94,
    head: [["Category", "Count", "Share"]],
    body: categoryRows,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14 },
  });

  // Department Performance table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deptY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Department Performance", 14, deptY);

  const deptRows = data.departments.map((d) => [
    d.department_name,
    d.head,
    String(d.active_issues),
    String(d.resolved_issues),
    `${d.avg_resolution_days} days`,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: deptY + 4,
    head: [["Department", "Head", "Active", "Resolved", "Avg Time"]],
    body: deptRows,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14 },
  });

  // Complaints by Department
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deptY2 = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(14);
  doc.text("Complaints by Department", 14, deptY2);

  const deptComplaintRows = Object.entries(data.complaintsByDepartment).map(
    ([dept, count]) => [dept, String(count)]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: deptY2 + 4,
    head: [["Department", "Complaints"]],
    body: deptComplaintRows,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `NitiSetu — Bridging Policy to People | Page ${i} of ${pageCount}`,
      14,
      287
    );
    doc.text("India Innovates 2026 | Team Bugged Bhature", 140, 287);
  }

  doc.save(`NitiSetu_Governance_Report_${dateStr.replace(/ /g, "_")}.pdf`);
}
