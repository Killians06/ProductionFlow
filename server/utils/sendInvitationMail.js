import nodemailer from 'nodemailer';

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  // Si toutes les variables SMTP sont définies, utilise-les
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporterPromise = Promise.resolve(nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false }
    }));
    return transporterPromise;
  }

  // Sinon, crée un compte de test Ethereal
  transporterPromise = nodemailer.createTestAccount().then(testAccount => {
    console.log('⚠️  Aucun SMTP configuré, utilisation d\'un compte de test Ethereal.');
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      tls: { rejectUnauthorized: false }
    });
  });
  return transporterPromise;
}

export default async function sendInvitationMail(email, invitationLink) {
  const subject = `Vous êtes invité(e) à rejoindre notre application`;
  const body = `Bonjour,\n\nVous avez été invité(e) à rejoindre notre application de gestion de commandes.\n\nVeuillez cliquer sur le lien ci-dessous pour créer votre compte :\n\n${invitationLink}\n\nCe lien expirera dans 24 heures.\n\nCordialement,\nL'équipe.`;

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: `"Gestion de Commandes" <${process.env.SMTP_FROM_EMAIL || 'noreply@example.com'}>`,
    to: email,
    subject,
    text: body,
  });

  let previewUrl = null;
  if (nodemailer.getTestMessageUrl && info && nodemailer.getTestMessageUrl(info)) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('📧 Aperçu du mail d\'invitation (Ethereal) :', previewUrl);
  } else {
    console.log(`📧 Email d'invitation envoyé à ${email} via SMTP.`);
  }

  return previewUrl;
} 