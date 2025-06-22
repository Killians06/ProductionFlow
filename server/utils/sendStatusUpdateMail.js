import nodemailer from 'nodemailer';

let transporterPromise = null;

// Fonction de traduction des statuts en français
function getStatusLabel(status) {
  const statusLabels = {
    'draft': 'Brouillon',
    'pending': 'En attente',
    'validated': 'Validée',
    'in-production': 'En production',
    'quality-check': 'Contrôle qualité',
    'ready': 'Prête',
    'shipped': 'Expédiée',
    'delivered': 'Livrée',
    'canceled': 'Annulée'
  };
  return statusLabels[status] || status;
}

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

export default async function sendStatusUpdateMail(command, newStatus) {
  const subject = `Mise à jour du statut de votre commande ${command.numero}`;
  const body = `Bonjour ${command.client.nom},\n\nLe statut de votre commande n°${command.numero} a été mis à jour :\n\nNouveau statut : ${getStatusLabel(newStatus)}\nDate de livraison prévue : ${new Date(command.dateLivraison).toLocaleDateString('fr-FR')}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nVotre équipe.`;

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: `"Gestion de Commandes" <${process.env.SMTP_FROM_EMAIL || 'noreply@example.com'}>`,
    to: command.client.email,
    subject,
    text: body,
  });

  let previewUrl = null;
  if (nodemailer.getTestMessageUrl && info && nodemailer.getTestMessageUrl(info)) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('📧 Aperçu du mail (Ethereal) :', previewUrl);
  } else if (!nodemailer.getTestMessageUrl(info)) {
    console.log(`📧 Email de mise à jour de statut envoyé à ${command.client.email} via SMTP.`);
  }
  return previewUrl;
} 