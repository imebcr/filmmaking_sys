// Gmail (and most other clients) do not reliably render base64 data-URI images
// inline — they show as a broken image icon. A real hosted URL works everywhere
// (with the normal "images blocked until you click load" behavior, which is fine).
const LOGO_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/logo.png`

/**
 * Wraps a transactional email's inner content in the Zidny brand shell.
 * Table-based layout with inline styles throughout — this is deliberate,
 * email clients (Outlook especially) strip <style> blocks and don't support
 * flexbox/grid, so HTML email needs the old-school approach.
 */
export function emailLayout(opts: { preheader: string; heading: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }): string {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl } = opts

  const cta = ctaLabel && ctaUrl
    ? `
      <tr>
        <td align="center" style="padding-top:28px;">
          <a href="${ctaUrl}" style="background-color:#2AA4E7;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:12px;display:inline-block;">
            ${ctaLabel}
          </a>
        </td>
      </tr>`
    : ''

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#E9FCFF;">
    <span style="display:none;font-size:1px;color:#E9FCFF;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E9FCFF;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <img src="${LOGO_URL}" width="48" height="48" alt="Zidny" style="border-radius:14px;display:block;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border-radius:20px;padding:36px 32px;box-shadow:0 4px 24px rgba(10,96,173,0.08);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#0C224B;font-size:20px;font-weight:700;padding-bottom:16px;">
                      ${heading}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#0C224B;font-size:14px;line-height:1.6;">
                      ${bodyHtml}
                    </td>
                  </tr>
                  ${cta}
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:24px;">
                <p style="color:#0C224Bb3;font-size:11px;margin:0;font-weight:600;letter-spacing:0.02em;">ZIDNY</p>
                <p style="color:#0C224B66;font-size:11px;margin:4px 0 0;">The digital signature</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
