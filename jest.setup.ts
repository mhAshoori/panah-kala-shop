// Hermetic tests: real provider credentials in .env must never leak into
// Jest — otherwise dev master codes are rejected and fake-number SMS/SMTP
// sends would be attempted against live providers.
delete process.env.SMSIR_API_KEY;
delete process.env.SMSIR_OTP_TEMPLATE_ID;
delete process.env.SMSIR_BASE_URL;
delete process.env.SMSIR_LINE_NUMBER;
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
