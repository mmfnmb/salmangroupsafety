import QRCode from "qrcode";

export function assetQrUrl(qrToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/qr/${qrToken}`;
}

export async function assetQrDataUri(qrToken: string): Promise<string> {
  return QRCode.toDataURL(assetQrUrl(qrToken), { margin: 1, width: 240 });
}
