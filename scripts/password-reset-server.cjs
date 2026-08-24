const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');

// Inicializa Admin SDK usando service-account.json na raiz do projeto
let serviceAccount;
try {
  // caminho relativo a partir da raiz
  serviceAccount = require('../service-account.json');
} catch (e) {
  console.error('service-account.json não encontrado na raiz do projeto.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

const app = express();
app.use(cors());
app.use(bodyParser.json());

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
}

// Solicitar envio de código de redefinição
app.post('/auth/request-reset', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'E-mail inválido' });
    }

    // Verificar se usuário existe
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (_) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Gerar código e salvar
    const code = generateCode();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)); // 15 min
    const docRef = db.collection('password_resets').doc(userRecord.uid);
    await docRef.set({
      uid: userRecord.uid,
      email: email.toLowerCase(),
      code,
      expiresAt,
      used: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Aqui você integraria um provedor de e-mail (SendGrid, SES, etc.)
    console.log(`Código de redefinição para ${email}: ${code}`);

    return res.json({ ok: true, message: 'Código enviado para o e-mail cadastrado.' });
  } catch (err) {
    console.error('request-reset error', err);
    return res.status(500).json({ error: 'Falha ao gerar código' });
  }
});

// Confirmar redefinição com código e nova senha
app.post('/auth/confirm-reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (_) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const docRef = db.collection('password_resets').doc(userRecord.uid);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(400).json({ error: 'Código inválido' });
    const data = snap.data();

    if (data.used) return res.status(400).json({ error: 'Código já utilizado' });
    if (data.code !== String(code)) return res.status(400).json({ error: 'Código incorreto' });
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'Código expirado' });
    }

    // Atualizar senha sem alterar cargo (claims permanecem)
    await auth.updateUser(userRecord.uid, { password: newPassword });
    await docRef.update({ used: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return res.json({ ok: true, message: 'Senha atualizada com sucesso' });
  } catch (err) {
    console.error('confirm-reset error', err);
    return res.status(500).json({ error: 'Falha ao redefinir senha' });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Password reset server rodando em http://localhost:${PORT}`);
});


