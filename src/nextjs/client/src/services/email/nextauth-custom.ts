import { Theme } from 'next-auth'
const nodemailer = require('nodemailer')
const fs = require('node:fs')
// import smime from 'nodemailer-smime'

export async function customSendVerificationRequest(params: any) {

  const { identifier, url, provider, theme } = params
  const { host } = new URL(url)

  console.log('customSendVerificationRequest(): preparing email..')
  console.log(`.  url: ${url}`)
  console.log(`.  identifier: ${identifier}`)
  console.log(`.  provider: ${JSON.stringify(provider)}`)
  console.log(`.  process.env.NEXT_PUBLIC_EMAIL_DKIM_KEY_SELECTOR: ${process.env.NEXT_PUBLIC_EMAIL_DKIM_KEY_SELECTOR}`)

  // Secure flag (boolean)
  var secure: boolean

  if (process.env.NEXT_PUBLIC_EMAIL_SECURE === 'true') {
    secure = true
  } else if (process.env.NEXT_PUBLIC_EMAIL_SECURE === 'false') {
    secure = false
  } else {
    throw('NEXT_PUBLIC_EMAIL_SECURE must be set to true or false')
  }

  // DKIM var
  var dkim: any = null

  if (process.env.NEXT_PUBLIC_EMAIL_DKIM_KEY_SELECTOR != null &&
      process.env.NEXT_PUBLIC_EMAIL_DKIM_KEY_SELECTOR !== '') {

    dkim = {
      domainName: process.env.NEXT_PUBLIC_EMAIL_DKIM_HOST,
      keySelector: process.env.NEXT_PUBLIC_EMAIL_DKIM_KEY_SELECTOR,
      privateKey: process.env.NEXT_PUBLIC_EMAIL_DKIM_PRIVATE_KEY
    }
  }

  // Transport options
  // Note: using sendmail, with dkim disabled in nodemailer, so that sendmail
  // will sign with dkim. Relevant link:
  // https://github.com/nodemailer/nodemailer/issues/162#issuecomment-362785461
  const transportOptions: any = {
          // debug: true,
          host: process.env.NEXT_PUBLIC_EMAIL_HOST,
          port: process.env.NEXT_PUBLIC_EMAIL_PORT,
          secure: secure,
          auth: {
            user: process.env.NEXT_PUBLIC_EMAIL_USERNAME,
            pass: process.env.NEXT_PUBLIC_EMAIL_PASSWORD
          },
          sendmail: true,
          dkim: dkim
        }

  console.log(`.  transportOptions: ${JSON.stringify(transportOptions)}`)

  var transport: any

  try {
    transport = nodemailer.createTransport(transportOptions)
  } catch (error) {
    console.error(`creating transport failed: ${error}`)
    return
  }

  // Add S/MIME support
  /* const certContents = fs.readFileSync('/etc/smime/noreply.crt')
  const keyContents = fs.readFileSync('/etc/smime/noreply.key')

  console.log(`certContents: ${certContents}`)
  console.log(`keyContents: ${keyContents}`)

  const smimeOptions = {
    cert: certContents,
    key: keyContents,
    // passphrase: 'W(N_G.TCURL?v#a)`li!%q[RU/#4cL*a=.NW*YaXo6@(@r]O:[' // If your private key is encrypted
  }

  transport.use('stream', smime(smimeOptions)) */

  // Verify connection configuration
  transport.verify(function (error: any, success: any) {
    if (error) {
      console.log(`transport.verify(): ${error}`)
    } else {
      console.log(`transport.verify(): OK`)
    }
  })

  // Send email
  var result: any

  try {
    result = await transport.sendMail({
      to: identifier,
      from: provider.from,
      subject: `Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}`,
      text: text({ url, host }),
      html: html({ url, host, theme }),
    })
  } catch(error) {
    console.error(`transport.sendMail() failed: ${error}`)
  }

  console.log(`.  result: ${JSON.stringify(result)}`)

  if (result.rejected) {
    const failed = result.rejected.concat(result.pending).filter(Boolean)

    if (failed.length) {
      throw new Error(`Email(s) (${failed.join(', ')}) could not be sent`)
    }
  }
}

/**
 * Email HTML body
 * Insert invisible space into domains from being turned into a hyperlink by email
 * clients like Outlook and Apple mail, as this is confusing because it seems
 * like they are supposed to click on it to sign in.
 *
 * @note We don't add the email address to avoid needing to escape it, if you do, remember to sanitize it!
 */
function html(params: { url: string; host: string; theme: Theme }) {
  const { url, host, theme } = params

  const escapedHost = host.replace(/\./g, '&#8203;.')

  const brandColor = theme.brandColor || '#346df1'
  const color = {
    background: '#f9f9f9',
    text: '#444',
    mainBackground: '#fff',
    buttonBackground: brandColor,
    buttonBorder: brandColor,
    buttonText: theme.buttonText || '#fff',
  }

  return `
<body style='background: ${color.background};'>
  <table width='100%' border='0' cellspacing='20' cellpadding='0'
    style='background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;'>
    <tr>
      <td align='center'
        style='padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};'>
        Sign in to <strong>${process.env.NEXT_PUBLIC_APP_NAME}</strong>
      </td>
    </tr>
    <tr>
      <td align='center' style='padding: 20px 0;'>
        <table border='0' cellspacing='0' cellpadding='0'>
          <tr>
            <td align='center' style='border-radius: 5px;' bgcolor='${color.buttonBackground}'><a href='${url}'
                target='_blank'
                style='font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; 
font-weight: bold;'>Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align='center'
        style='padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};'>
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`
}

/** Email Text body (fallback for email clients that don't render HTML, e.g. feature phones) */
function text({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}\n${url}\n\n`
}
