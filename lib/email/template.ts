/**
 * This is the single email template used by both the web form and CSV script.
 * Edit the subject, text, and HTML here when the campaign content changes.
 */
export const PREDEFINED_EMAIL_TEMPLATE = {
  version: "2026-08-18.1",
  subject: "A quick update from our team",
  text: [
    "Hello,",
    "",
    "A quick update from our team: we have something new to share with you.",
    "",
    "Thank you for staying connected.",
  ].join("\n"),
  html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>A quick update from our team</title>
  </head>
  <body style="margin:0;background:#f4f4f0;color:#20211e;font-family:Arial,Helvetica,sans-serif;padding:32px 12px">
    <main style="background:#ffffff;border:1px solid #deded7;border-radius:16px;margin:0 auto;max-width:600px;padding:36px">
      <p style="color:#74766f;font-size:11px;font-weight:700;letter-spacing:1.6px;margin:0 0 10px">A QUICK UPDATE</p>
      <h1 style="color:#20211e;font-size:24px;line-height:1.3;margin:0">Hello from our team</h1>
      <hr style="border:0;border-top:1px solid #e8e8e2;margin:28px 0">
      <p style="color:#343630;font-size:16px;line-height:1.7;margin:0">We have something new to share with you.</p>
      <p style="color:#343630;font-size:16px;line-height:1.7;margin:18px 0 0">Thank you for staying connected.</p>
    </main>
  </body>
</html>`,
} as const;
