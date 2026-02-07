import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { TransferPdf } from "@/lib/pdf/transfer";
import { getTransferPdfData } from "@/lib/pdf/data";
import { getServerUser } from "@/lib/auth/get-server-user";


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
    const data = await getTransferPdfData(id);

    const buffer = await renderToBuffer(<TransferPdf data={data} />);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="remito-${data.transferNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating transfer PDF:", error);
    return NextResponse.json(
      { error: "Error generating PDF" },
      { status: 500 },
    );
  }
}