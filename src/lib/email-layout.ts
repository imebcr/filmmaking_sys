// 96x96 PNG, resized+re-encoded from public/favicon.png — kept small and inlined
// as a data URI so the logo renders in every email client without needing a
// publicly reachable URL (important since this app is often run on localhost).
const LOGO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAMAAADVRocKAAAALVBMVEX////5/P/1+v/x9/8qo+jr9f8djdUimd/m8v9CrOhWt+xovu7g7/+Kye+44PdIT4CvAAAACXBIWXMAACE4AAAhOAFFljFgAAAFSUlEQVRo3rWai3akIAyGuUhRUN//cReBhISLMjNuZjttz57+n38CCmGE+CVk/PdfQsaXwK83lbP09bOU/8tFNJDepBSE+Zo6yCfG29cukr4EQvrxDRMk9+hAvqZO85OzD+LEzBujHvKCDEC8N/5lJ8SvDnBayTvKbzaq7Hc9/Hj9d1dfML+UuNVW5F3CIPt+AnQcXNpKKVqI98ZPFg/yBSG+SJOEIsgKEpUTQlHEizOA6lOC/Pzh0uZHVfIE8aIL1cTH+m1WboMM2fs4tslw2yF1L08PAG8XC/FHwy5VWC8ugK4ITxaOKFQYdkxAgAbKjIc9yi8ob4cerE8p0ul9muAsczAmREB4QVATd4DTogVuIEQHoPOXYoT5MtsnByzKhLgLvSHhzkAostRNZMT9QNoZwY70bQ+Q8/QwF3bX07dTgIR4uk2ooy1CZ6L1AXoCEEz4hee/TlBTA2MIYeZZY86DhGv1uQNzIYzOlI/v2PoREBmXCzMLYE8Ab+8BJqmbGB87kPkO2NbAQHZiCRIgZupD/bMVP4Mnr3JGTHYABG0+c7BuTXYOYbwNgJx0g+nJ8RnAd6ZYUHXhHdOer1x/DugVYFvDRav9xAvml/8RoF8AGTOjDCfor1LUKcAp8tRFcf19DWSnAIKO/V6s5pcCOHjKVKr093VyMd8twC7igx7uDb3rjw6mCHuvAAoARbHWXyfXkNKHIVnPsPTIqgjrmjFrdjC31D6iPEU4BYvUAsjy7DXX8TmXsATlFnaRlsGaWmgIMUVyogBRniJOURbaJUUXYF0Bs8ZRNNFlCAWIq+hLf4MC0KU8WFiBECkm/ixwzybvChDliwPHNwu0ynVAq+fGwAn7gCUnatl2wXcjpQhdwP2ubXdbISQPp8AWC1rQDw6Gw1X6zZHdzOXiEEWeJwlKsDcOxnU4Ln1X5LfwACZNolGS9iZFgzqcm3OVhR0TRBCYJATsrYPOrmp3UZ8wUgFYkvh8BkINyFniDOldjEJYDsET1BQaAVcwQGe0HlneQSGwAJ2NM7GwXwYSQtw13k4HARa8HmzR6VCiFjhA8D3P7h0nhBddBp/haaLaMkAJ7hzInCBCSBC+Id+O8PeqGaxjB3xvuzvvEZGuv2hDHNhTq5M0AmDXKVTABwJ1wQxkgjMpTaq2cOcg9T+P6MD3MmTRwmK39ZYgxq3Jw1/hSpoc3Sj/IcGpdrBWAMWahtBRTwBKoA7+sryNj/9uGQCQekisLxmzdHpfIba/Xo7iAqmZbwhI6lLx1udFMZ4QUnQcXC9/AbJGTRBFnblgFtDD1hRhsXmNVzptZb6hg4ELdXjPXfitk6C0yJMSG5DMgkBtZJAkHTxDw4GUytwlYA0U+iAETW892UmvLXjkRKQ3rUiSBKlA+o5tyXTekE8d5LDdmds2SknSpC0EMook9TLZSqdtcnRAHz676PVVqYm79mRpA1cauhCEYmNo1OaWDx7qPy9lEIPmMGtzjw810IMaeOgDwJScODcZ9bOBIO773NWKY8yo5bHQ4raLjt3V0aluSVHXw6MDishrmnZMSWZBlyJHwgOAIOBQlx5KiXK2I+kIgjZwIDwC6mKTkpOjowLIwtgIfgY0jzt2LAW/Mgs0ZgDVpJBEWzbTuedAKz1fibJnJOUgda57s4JXvxrMumcDT9vxNgJn7z0CONDwrbxU+a+63PTzAvX9YtoB0dadeyD5REL59AAhmAIYGyg/6oEJWZ1vUgumdkCa/h2ro0GLn93ggNR5DP8EUS9DLB3EsIMfxmj2FKwMtA2WAJrMb6UHoUYuqvNfDjD/AHiBW16Be3BCAAAAAElFTkSuQmCC'

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
                <img src="${LOGO_DATA_URI}" width="48" height="48" alt="Zidny" style="border-radius:14px;display:block;" />
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
