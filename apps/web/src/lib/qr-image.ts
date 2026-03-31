import QRCode from "qrcode";

type BuildQrDataUrlParams = {
  text: string;
  size?: number;
};

export async function buildQrDataUrl(params: BuildQrDataUrlParams) {
  const text = params.text.trim();
  if (!text) return "";

  const size = Number.isFinite(params.size)
    ? Math.max(120, Math.min(1024, Math.round(params.size!)))
    : 320;

  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: {
      dark: "#111111",
      light: "#ffffff"
    }
  });
}
