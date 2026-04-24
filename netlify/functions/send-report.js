const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { email, reportContent, consentGiven } = JSON.parse(event.body);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Valid email address required" }) };
    }

    // Validate GDPR consent
    if (!consentGiven) {
      return { statusCode: 400, body: JSON.stringify({ error: "GDPR consent required" }) };
    }

    if (!reportContent) {
      return { statusCode: 400, body: JSON.stringify({ error: "Report content required" }) };
    }

    // Send email via Resend
    const data = await resend.emails.send({
      from: 'Landa Intelligence <reports@getlanda.se>',
      to: email,
      replyTo: 'getlandahelp@gmail.com',
      subject: 'Your Landa Mobility Intelligence Report',
      html: `
        <div style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; color: #1A2332;">
          <div style="background: linear-gradient(135deg, #0F1820 0%, #1a3a50 100%); padding: 32px; border-radius: 12px; text-align: center; margin-bottom: 32px;">
            <h1 style="color: #C9A84C; margin: 0; font-size: 32px; letter-spacing: -1px;">Landa</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Mobility Intelligence</p>
          </div>
          
          <h2 style="color: #1B2A4A; margin: 24px 0 16px 0; font-size: 20px;">Your Mobility Intelligence Report</h2>
          <p style="color: #6B7A8D; margin: 0 0 24px 0;">Thank you for using Landa. Below is your generated profile:</p>
          
          <div style="background: #F8FAFC; border-left: 4px solid #C9A84C; padding: 20px; border-radius: 8px; margin: 24px 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #1A2332; font-family: 'Courier New', monospace;">
${reportContent}
          </div>
          
          <hr style="border: none; border-top: 1px solid #E8ECF1; margin: 32px 0;">
          
          <p style="color: #6B7A8D; font-size: 13px; margin: 16px 0;">
            <strong>Next steps:</strong> Use this report alongside other sources of information, conversations with people who have lived the experience, and official resources. Landa is a decision-support tool, not a predictor of outcomes.
          </p>
          
          <p style="color: #6B7A8D; font-size: 13px; margin: 16px 0;">
            Questions? Reply to this email or visit <a href="https://getlanda.se" style="color: #C9A84C; text-decoration: none;">getlanda.se</a>
          </p>
          
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin-top: 24px; font-size: 12px; color: #6B7A8D; line-height: 1.5;">
            <p style="margin: 0;">© 2026 Landa. Built by Dare Abinde. Free to use, free to share.</p>
            <p style="margin: 8px 0 0 0;">🌍 <em>Sweden · More countries coming</em></p>
          </div>
        </div>
      `
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: "Report sent successfully!",
        id: data.id 
      }),
      headers: { "Content-Type": "application/json" }
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to send report" }),
      headers: { "Content-Type": "application/json" }
    };
  }
};
