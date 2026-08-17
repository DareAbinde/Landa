function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatParagraphs(value = '') {
  return String(value)
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map(paragraph => `<p style="margin:0 0 14px; color:#3A4550; font-size:14px; line-height:1.72;">${escapeHtml(paragraph)}</p>`)
    .join('')
    .replace(/<\/p>$/, '</p>');
}

function renderSection(kicker, title, content, options = {}) {
  const background = options.background || '#FFFFFF';
  const border = options.border || '#D2D2D7';
  return `
    <div style="background:${background}; border:1px solid ${border}; border-radius:8px; padding:24px; margin:0 0 16px;">
      <p style="margin:0 0 8px; color:#E0523D; font-size:10px; line-height:1.4; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;">${kicker}</p>
      <h3 style="margin:0 0 16px; color:#0F1820; font-size:19px; line-height:1.3; font-weight:700;">${title}</h3>
      ${formatParagraphs(content)}
    </div>`;
}

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

    const { email, report, requestedReport, marketingConsent = false } = JSON.parse(event.body);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Valid email address required" }) };
    }

    // Report delivery is transactional. Marketing consent is optional and separate.
    if (!requestedReport) {
      return { statusCode: 400, body: JSON.stringify({ error: "Report request required" }) };
    }

    const requiredSections = ['strengths', 'risks', 'recs', 'closing'];
    if (!report || typeof report !== 'object' || requiredSections.some(section => typeof report[section] !== 'string' || !report[section].trim())) {
      return { statusCode: 400, body: JSON.stringify({ error: "Complete report content required" }) };
    }

    const score = Number.isFinite(Number(report.score)) ? Math.max(0, Math.min(100, Math.round(Number(report.score)))) : null;
    const reportSections = [
      renderSection('Strengths', 'What is working in your favour', report.strengths),
      renderSection('Areas of risk', 'What deserves closer attention', report.risks),
      renderSection('Recommendations', 'Practical actions to take forward', report.recs),
      renderSection('In closing', 'A reflection, not a verdict', report.closing, { background: '#F5F5F7' })
    ].join('');

    // Send email via Resend
    const data = await resend.emails.send({
      from: 'Landa Intelligence <reports@getlanda.se>',
      to: email,
      replyTo: 'getlandahelp@gmail.com',
      subject: 'Your Landa Mobility Intelligence Report',
      html: `
        <div style="background:#F5F5F7; padding:24px 12px;">
        <div style="font-family:Inter, Arial, Helvetica, sans-serif; max-width:600px; margin:0 auto; color:#0F1820;">
          <div style="background:#0F1820; padding: 32px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:-0.3px;">get<span style="color:#E0523D;">Landa</span>.se</h1>
            <p style="color:rgba(255,255,255,0.68); margin:8px 0 0;">Student mobility intelligence</p>
          </div>
          
          <div style="padding:0 4px 24px;">
            <p style="color:#E0523D; margin:0 0 8px; font-size:10px; line-height:1.4; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;">Your personalised profile</p>
            <h2 style="color:#0F1820; margin:0 0 12px; font-size:26px; line-height:1.25;">Your Landa Full Report</h2>
            <p style="color:#66717C; margin:0; font-size:14px; line-height:1.65;">A detailed view of your current strengths, areas of risk and practical next steps for studying and settling in Sweden.</p>
          </div>

          ${score === null ? '' : `<div style="background:#FFF1ED; border-radius:8px; padding:20px 24px; margin:0 0 16px;">
            <p style="margin:0 0 6px; color:#E0523D; font-size:10px; line-height:1.4; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;">Readiness score</p>
            <p style="margin:0; color:#0F1820; font-size:32px; line-height:1.1; font-weight:700;">${score}<span style="color:#66717C; font-size:15px; font-weight:400;"> / 100</span></p>
          </div>`}

          ${reportSections}
          
          <hr style="border:none; border-top:1px solid #D2D2D7; margin:32px 0;">
          
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
