/**
 * Email templates untuk SIBIMKON
 * Dipanggil oleh API route /api/send-verification-email
 */

export function verificationEmailTemplate({
  name,
  verificationUrl,
}: {
  name: string
  verificationUrl: string
}): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verifikasi Email SIBIMKON</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#050a18 0%,#0a1628 60%,#1e3a5f 100%);padding:36px 40px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <div style="display:inline-block;background:rgba(244,196,48,0.12);border:1px solid rgba(244,196,48,0.25);border-radius:12px;padding:10px 18px;">
                      <span style="font-size:22px;font-weight:900;letter-spacing:3px;color:#f4c430;">SIBIMKON</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Link Productive</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px;">
              
              <!-- Greeting -->
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;">
                Verifikasi Email Anda
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
                Halo <strong style="color:#0f172a;">${name}</strong>, terima kasih telah mendaftar di SIBIMKON.
                Klik tombol di bawah untuk memverifikasi alamat email Anda dan mulai menggunakan platform.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}"
                      style="display:inline-block;background:linear-gradient(135deg,#0a1628,#1e3a5f);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.5px;">
                      ✅ Verifikasi Sekarang
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #f4c430;border-radius:8px;padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Informasi Penting</p>
                    <ul style="margin:0;padding-left:16px;font-size:13px;color:#475569;line-height:1.8;">
                      <li>Link verifikasi berlaku selama <strong>24 jam</strong></li>
                      <li>Jika tidak merasa mendaftar, abaikan email ini</li>
                      <li>Jangan bagikan link ini ke siapapun</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                Jika tombol tidak berfungsi, salin link berikut ke browser Anda:<br/>
                <a href="${verificationUrl}" style="color:#0a1628;word-break:break-all;font-size:11px;">${verificationUrl}</a>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7;">
                Email ini dikirim otomatis oleh sistem SIBIMKON — Link Productive.<br/>
                Harap jangan membalas email ini.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">
                © 2026 SIBIMKON · Link Productive
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim()
}

export function welcomeEmailTemplate({ name }: { name: string }): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Selamat Datang di SIBIMKON</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#050a18 0%,#0a1628 60%,#1e3a5f 100%);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(244,196,48,0.12);border:1px solid rgba(244,196,48,0.25);border-radius:12px;padding:10px 18px;">
                <span style="font-size:22px;font-weight:900;letter-spacing:3px;color:#f4c430;">SIBIMKON</span>
              </div>
              <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Link Productive</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;">
                Selamat Datang, ${name}! 🎉
              </h1>
              <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.7;">
                Akun Anda telah berhasil diverifikasi. Kini Anda dapat login dan mulai menggunakan SIBIMKON untuk memantau dan meningkatkan produktivitas perusahaan.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login"
                      style="display:inline-block;background:linear-gradient(135deg,#0a1628,#1e3a5f);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;">
                      Login ke Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                © 2026 SIBIMKON · Link Productive
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
