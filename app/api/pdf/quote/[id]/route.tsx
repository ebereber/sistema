import { getServerUser } from "@/lib/auth/get-server-user";
import { getQuotePdfData } from "@/lib/pdf/data";
import { QuotePdf } from "@/lib/pdf/quote";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await getQuotePdfData(id);

    const buffer = await renderToBuffer(<QuotePdf data={data} />);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="presupuesto-${data.quoteNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating quote PDF:", error);
    return NextResponse.json(
      { error: "Error generating PDF" },
      { status: 500 },
    );
  }
}
