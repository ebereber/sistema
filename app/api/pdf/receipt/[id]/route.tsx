import { getServerUser } from "@/lib/auth/get-server-user";
import { getPaymentReceiptData } from "@/lib/pdf/data";
import { PaymentReceiptPdf } from "@/lib/pdf/payment-receipt";
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
    const data = await getPaymentReceiptData(id);

    const buffer = await renderToBuffer(<PaymentReceiptPdf data={data} />);
    const uinit8 = new Uint8Array(buffer);
    return new NextResponse(uinit8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${data.receiptNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json(
      { error: "Error generating PDF" },
      { status: 500 },
    );
  }
}
