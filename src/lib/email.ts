import "server-only";

/**
 * Pengirim email via Resend REST API (https://resend.com — tier gratis 3.000 email/bulan).
 * Sengaja memakai fetch langsung agar tanpa dependency tambahan.
 * Tanpa RESEND_API_KEY: email tidak terkirim, tautan dicetak ke konsol server (untuk development).
 */

const API_URL = "https://api.resend.com/emails";

export function appUrl(path: string) {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] RESEND_API_KEY belum diisi — email "${subject}" ke ${to} tidak terkirim.`);
    return false;
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Simon <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] Gagal mengirim:", e);
    return false;
  }
}

function emailLayout(title: string, body: string, buttonLabel: string, buttonUrl: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f8fa;font-family:ui-sans-serif,system-ui,sans-serif;color:#0f172a">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
      <div style="font-size:20px;font-weight:700;margin-bottom:4px">
        <span style="display:inline-block;background:#059669;color:#fff;border-radius:8px;padding:2px 10px;margin-right:8px">S</span>Simon
      </div>
      <h1 style="font-size:17px;margin:20px 0 8px">${title}</h1>
      <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px">${body}</p>
      <a href="${buttonUrl}"
         style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px">
        ${buttonLabel}
      </a>
      <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">
        Jika tombol tidak berfungsi, salin tautan ini ke browser:<br/>
        <a href="${buttonUrl}" style="color:#059669;word-break:break-all">${buttonUrl}</a>
      </p>
      <p style="font-size:12px;color:#94a3b8;margin:16px 0 0">
        Abaikan email ini jika Anda tidak merasa memintanya.
      </p>
    </div>
  </body>
</html>`;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = appUrl(`/reset-password/${token}`);
  const sent = await sendEmail({
    to,
    subject: "Reset password Simon",
    html: emailLayout(
      "Reset password Anda",
      "Kami menerima permintaan reset password untuk akun Simon Anda. Tautan ini berlaku 1 jam.",
      "Reset Password",
      url
    ),
  });
  if (!sent) console.log(`[email] Tautan reset password untuk ${to}: ${url}`);
  return sent;
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = appUrl(`/verify-email/${token}`);
  const sent = await sendEmail({
    to,
    subject: "Verifikasi email Simon",
    html: emailLayout(
      "Verifikasi alamat email Anda",
      "Terima kasih sudah mendaftar di Simon. Klik tombol di bawah untuk memverifikasi alamat email Anda. Tautan berlaku 24 jam.",
      "Verifikasi Email",
      url
    ),
  });
  if (!sent) console.log(`[email] Tautan verifikasi untuk ${to}: ${url}`);
  return sent;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MEMBER: "Anggota",
  VIEWER: "Pengamat (hanya lihat)",
};

export async function sendInvitationEmail(
  to: string,
  token: string,
  workspaceName: string,
  inviterName: string,
  role: string
) {
  const url = appUrl(`/invite/${token}`);
  const sent = await sendEmail({
    to,
    subject: `Undangan bergabung ke "${workspaceName}" di Simon`,
    html: emailLayout(
      `${inviterName} mengundang Anda`,
      `Anda diundang bergabung ke workspace <b>${workspaceName}</b> sebagai <b>${ROLE_LABEL[role] ?? role}</b>. Klik tombol di bawah untuk menerima undangan. Tautan berlaku 7 hari. Jika Anda belum punya akun Simon, daftar dulu dengan email ini lalu buka tautannya.`,
      "Terima Undangan",
      url
    ),
  });
  if (!sent) console.log(`[email] Tautan undangan ${workspaceName} untuk ${to}: ${url}`);
  return sent;
}
