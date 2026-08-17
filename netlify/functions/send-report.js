exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    // Check for API key
    if (!process.env.RESEND_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "RESEND_API_KEY not configured" }) };
    }

    // Dynamic import of Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { email, reportContent, requestedReport, marketingConsent = false } = JSON.parse(event.body);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Valid email address required" }) };
    }

    // Report delivery is transactional. Marketing consent is optional and separate.
    if (!requestedReport) {
      return { statusCode: 400, body: JSON.stringify({ error: "Report request required" }) };
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
        <div style="font-family: Inter, Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #1A2332;">
          <div style="background:#0F1820; padding: 32px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:-0.3px;">get<span style="color:#E0523D;">Landa</span>.se</h1>
            <p style="color:rgba(255,255,255,0.68); margin:8px 0 0;">Student mobility intelligence</p>
          </div>
          
          <h2 style="color:#0F1820; margin:24px 0 16px; font-size:20px;">Your Landa Full Report</h2>
          <p style="color: #6B7A8D; margin: 0 0 24px 0;">Thank you for using Landa. Below is your generated profile:</p>
          
          <div style="background:#F5F5F7; border-left:4px solid #E0523D; padding:20px; border-radius:8px; margin:24px 0; white-space:pre-wrap; font-size:14px; line-height:1.65; color:#0F1820;">
${reportContent}
          </div>
          
          <hr style="border: none; border-top: 1px solid #E8ECF1; margin: 32px 0;">
          
          <p style="color: #6B7A8D; font-size: 13px; margin: 16px 0;">
            <strong>Next steps:</strong> Use this report alongside other sources of information, conversations with people who have lived the experience, and official resources. Landa is a decision-support tool, not a predictor of outcomes.
          </p>
          
          <p style="color: #6B7A8D; font-size: 13px; margin: 16px 0;">
            Questions? Reply to this email or visit <a href="https://getlanda.se" style="color:#E0523D; text-decoration:none;">getlanda.se</a>
          </p>
          
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin-top: 24px; font-size: 12px; color: #6B7A8D; line-height: 1.5;">
            <p style="margin: 0;">© 2026 Landa. Free to use, free to share.</p>
            <p style="margin:8px 0 0;">Sweden is the starting point. More countries are planned.</p>
            ${marketingConsent ? '<p style="margin:8px 0 0;">You opted in to occasional Landa updates.</p>' : ''}
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
