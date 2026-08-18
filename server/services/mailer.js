import nodemailer from 'nodemailer';

let transporter = null;
let etherealAccount = null;

export const initTransporter = async () => {
  // 1. Check if explicit SMTP or Service configuration is provided
  if (process.env.SMTP_SERVICE || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    try {
      const config = process.env.SMTP_SERVICE
        ? {
            service: process.env.SMTP_SERVICE,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          }
        : {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            tls: {
              rejectUnauthorized: false,
            },
          };

      transporter = nodemailer.createTransport(config);
      console.log('✅ Custom SMTP Mail Transporter configured');
      return transporter;
    } catch (e) {
      console.warn('⚠️ Could not initialize custom SMTP Transporter:', e.message);
    }
  }

  // 2. Fallback: try creating an ephemeral Ethereal test inbox for development
  try {
    if (!etherealAccount) {
      etherealAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      });
      console.log(`ℹ️ [Mailer] Initialized Ethereal test inbox (${etherealAccount.user})`);
    }
  } catch (err) {
    console.log('ℹ️ [Mailer] Running in direct simulation mode');
    transporter = null;
  }

  return transporter;
};

// Initialize right away
initTransporter().catch(() => {});

export const sendOtpEmail = async (toEmail, userName, otpCode) => {
  const fromAddress = process.env.EMAIL_FROM || '"Attendly Security" <security@attendly.app>';
  const subject = `Your Password Reset OTP: ${otpCode}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .card { max-width: 520px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; font-weight: bold; font-size: 20px; padding: 10px 24px; border-radius: 12px; }
          .title { font-size: 22px; font-weight: 700; color: #ffffff; text-align: center; margin-bottom: 8px; }
          .subtitle { color: #94a3b8; text-align: center; font-size: 14px; margin-bottom: 24px; }
          .otp-box { background-color: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8; font-family: monospace; }
          .notice { background-color: rgba(234, 179, 8, 0.1); border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #fef08a; }
          .folder-guide { background-color: #0f172a; border-radius: 10px; padding: 16px; margin-top: 20px; font-size: 13px; color: #cbd5e1; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">
            <span class="logo-badge">Attendly</span>
          </div>
          <h1 class="title">Password Reset Verification</h1>
          <p class="subtitle">Hello ${userName || 'User'}, we received a request to reset your password.</p>
          
          <div class="otp-box">
            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your 6-Digit One-Time Code</div>
            <div class="otp-code">${otpCode}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Expires in 15 minutes</div>
          </div>

          <div class="notice">
            <strong>Important:</strong> If you did not request this password reset, please ignore this email or notify your system administrator immediately.
          </div>

          <div class="folder-guide">
            <strong>Where to find this code:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6;">
              <li><strong>Primary Inbox:</strong> Look for "Attendly Security"</li>
              <li><strong>Spam / Junk Folder:</strong> Automated emails can sometimes be filtered by Gmail, Outlook, or Yahoo into Spam or Junk folders. Click "Report Not Spam" to ensure future delivery.</li>
              <li><strong>Promotions / Updates Tab:</strong> Check categorized mailbox tabs.</li>
            </ul>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Attendly Workforce Attendance & Communications System. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  if (!transporter) {
    await initTransporter();
  }

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        html: htmlContent,
        text: `Your Attendly Password Reset OTP code is: ${otpCode}. It will expire in 15 minutes. If you did not request this, please ignore this email.`,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;
      console.log(`📧 [OTP DISPATCH] Email: ${toEmail} | Code: ${otpCode} | MessageId: ${info.messageId}`);
      if (previewUrl) {
        console.log(`🔗 [Ethereal Preview URL] ${previewUrl}`);
      }

      return {
        sent: true,
        messageId: info.messageId,
        previewUrl,
        otp: otpCode,
        simulated: Boolean(previewUrl),
      };
    } catch (err) {
      console.error(`❌ Failed to dispatch email to ${toEmail}:`, err.message);
      return { sent: false, simulated: true, otp: otpCode, error: err.message };
    }
  } else {
    console.log(`ℹ️ [OTP DISPATCH] Email: ${toEmail} | Code: ${otpCode}`);
    return { sent: false, simulated: true, otp: otpCode };
  }
};
