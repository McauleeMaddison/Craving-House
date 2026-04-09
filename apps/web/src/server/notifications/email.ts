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

async function sendTextEmail(params: { to: string; subject: string; text: string }) {
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

export async function sendGuestOrderReceipt(params: { to: string; subject: string; text: string }) {
  await sendTextEmail(params);
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string; ttlMinutes: number }) {
  await sendTextEmail({
    to: params.to,
    subject: "Reset your Craving House password",
    text: [
      "We received a request to reset your Craving House password.",
      "",
      `Use this link within ${params.ttlMinutes} minutes:`,
      params.resetUrl,
      "",
      "If you did not request this, you can ignore this email."
    ].join("\n")
  });
}

export async function sendOperationsAlertEmail(params: { to: string; subject: string; text: string }) {
  await sendTextEmail(params);
}
