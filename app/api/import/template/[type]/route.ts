import { TEMPLATES, type ImportType } from "@/lib/import/templates";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  if (!TEMPLATES[type as ImportType]) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  const importType = type as ImportType;
  const template = TEMPLATES[importType];

  // Build worksheet data: instruction row, headers row, descriptions row
  const wsData: (string | null)[][] = [];

  // Row 1: Instruction (merged across all columns)
  const instructionRow: (string | null)[] = [template.instruction];
  for (let i = 1; i < template.columns.length; i++) {
    instructionRow.push(null);
  }
  wsData.push(instructionRow);

  // Row 2: Column headers
  wsData.push(template.columns.map((col) => col.header));

  // Row 3: Descriptions
  wsData.push(template.columns.map((col) => col.description));

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = template.columns.map((col) => ({
    wch: Math.max(col.header.length, col.description.length, 20),
  }));

  // Merge instruction row across all columns
  ws["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: template.columns.length - 1 },
    },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, template.sheetName);

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `plantilla-${type}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
