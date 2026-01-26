import nodemailer from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const portRaw = process.env.SMTP_PORT?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const from = process.env.SMTP_FROM?.trim() ?? "";
  const port = portRaw ? Number(portRaw) : 0;

  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

export function isEmailConfigured() {
  return Boolean(getSmtpConfig());
}

export async function sendGuestOrderReceipt(params: { to: string; subject: string; text: string }) {
  const cfg = getSmtpConfig();
  if (!cfg) throw new Error("Email not configured");

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass }
  });

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: params.subject,
    text: params.text
  });
}

