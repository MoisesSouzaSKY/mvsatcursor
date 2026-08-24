const admin = require('firebase-admin');

// Configurar Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function parsePtBrDate(dateStr) {
  // "DD/MM/YYYY"
  const [dd, mm, yyyy] = String(dateStr || '').split('/').map((s) => parseInt(s, 10));
  if (!dd || !mm || !yyyy) return null;
  // 12:00 UTC para evitar regressão por fuso horário
  return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
}

const updates = [
  { login: 'dnwhvt', validade: '17/02/2026' },
  { login: 'qub22m', validade: '06/03/2026' },
  { login: '6mxvs7', validade: '13/03/2026' },
  { login: '3spmb4', validade: '13/03/2026' },
  { login: 'km8yu8', validade: '13/03/2026' },
  { login: '7pppuf', validade: '13/03/2026' },
  { login: '233rxd', validade: '17/03/2026' },
  { login: '2s7vuy', validade: '02/04/2026' },
  { login: 'wmnvf5', validade: '02/04/2026' },
  { login: 'nht3ek', validade: '07/04/2026' },
  { login: '57rctq', validade: '09/04/2026' },
  { login: '8mkmfx', validade: '09/04/2026' },
  { login: '8thjbm', validade: '09/04/2026' },
  { login: 'pye6xh', validade: '10/04/2026' },
  { login: '8yn32t', validade: '10/04/2026' },
  { login: 'c7chg8', validade: '15/04/2026' },
  { login: 'muc63s', validade: '15/04/2026' },
  { login: '36uuuq', validade: '15/04/2026' },
  { login: '4ry5vw', validade: '17/04/2026' },
  { login: 'hm8xu7', validade: '18/04/2026' },
  { login: 'qn8kvr', validade: '19/04/2026' },
  { login: 'u6bwv8', validade: '19/04/2026' },
  { login: 'h22f8p', validade: '21/04/2026' },
  { login: 'hpfe3x', validade: '21/04/2026' },
  { login: '8j2kwv', validade: '21/04/2026' },
  { login: 'yu78cs', validade: '22/04/2026' },
  { login: 'srypus', validade: '22/04/2026' },
  { login: '7tjbyq', validade: '22/04/2026' },
  { login: '7cwr8u', validade: '22/04/2026' },
  { login: 'ucmqhv', validade: '22/04/2026' },
  { login: 'dfdgp8', validade: '22/04/2026' },
  { login: 'm86jk2', validade: '22/04/2026' },
  { login: 'rdr5q6', validade: '23/04/2026' },
  { login: '7cu3bm', validade: '24/04/2026' },
  { login: 'xxkxpc', validade: '24/04/2026' },
  { login: '6xg63h', validade: '24/04/2026' },
  { login: 'uncfjf', validade: '24/04/2026' },
  { login: 'quh3q2', validade: '24/04/2026' },
  { login: 'v7fjpe', validade: '24/04/2026' },
  { login: 'xdeb2n', validade: '24/04/2026' },
  { login: 'pcsxx5', validade: '25/04/2026' },
  { login: 'mcf5mj', validade: '26/04/2026' },
  { login: 'qnxbnx', validade: '27/04/2026' },
  { login: '5ckbms', validade: '27/04/2026' },
  { login: 'ucyt68', validade: '28/04/2026' },
  { login: 'gxd8r6', validade: '29/04/2026' },
  { login: 'eq87df', validade: '29/04/2026' },
  { login: '4vq873', validade: '01/05/2026' },
  { login: 'mxeerb', validade: '01/05/2026' },
  { login: '4qns3j', validade: '01/05/2026' },
  { login: 'hxnkxm', validade: '02/05/2026' },
  { login: '8vrqew', validade: '02/05/2026' },
  { login: 'kybc42', validade: '02/05/2026' },
  { login: '2nkpf4', validade: '02/05/2026' },
  { login: 'hhpy6w', validade: '03/05/2026' },
  { login: '2ws446', validade: '03/05/2026' },
  { login: 'bsrt4x', validade: '03/05/2026' },
  { login: 'e2yejh', validade: '03/05/2026' },
  { login: 'skmut4', validade: '03/05/2026' },
  { login: 'rhhwt5', validade: '03/05/2026' },
  { login: 'xyeyys', validade: '03/05/2026' },
  { login: 'sgycmx', validade: '06/05/2026' },
  { login: 'cbm32v', validade: '06/05/2026' },
  { login: '5b7xbe', validade: '06/05/2026' },
  { login: 'xeeuuv', validade: '06/05/2026' },
  { login: 'xyng8w', validade: '06/05/2026' },
  { login: 'drubuq', validade: '06/05/2026' },
  { login: 'jv7cxd', validade: '07/05/2026' },
  { login: 'm8ffes', validade: '08/05/2026' },
  { login: 'mneset', validade: '09/05/2026' },
  { login: 'puege8', validade: '10/05/2026' },
  { login: 't42xff', validade: '10/05/2026' },
  { login: '2rvtcx', validade: '11/05/2026' },
  { login: 'kd3emx', validade: '11/05/2026' },
  { login: '6bwv6w', validade: '06/06/2026' },
  { login: 'ystds2', validade: '08/06/2026' }
];

async function main() {
  console.log('🚀 Atualizando prazos TV Box por login...');
  console.log(`📋 Itens na lista: ${updates.length}`);

  // Carregar todas as assinaturas uma vez e criar índices normalizados
  console.log('🔎 Carregando tvbox_assinaturas para indexação...');
  const allSnap = await db.collection('tvbox_assinaturas').get();
  const byLogin = new Map(); // normalizedLogin -> [docRef, ...]
  const byAssinatura = new Map(); // normalizedAssinatura -> [docRef, ...]

  allSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const rawLogin = data.login ?? data.Login ?? data.usuario ?? data.user ?? null;
    const normalizedLogin = rawLogin !== null && rawLogin !== undefined
      ? String(rawLogin).trim()
      : '';
    if (normalizedLogin) {
      const list = byLogin.get(normalizedLogin) || [];
      list.push({ ref: d.ref, data });
      byLogin.set(normalizedLogin, list);
    }
    const rawAss = data.assinatura ?? data.nome ?? null;
    const normalizedAss = rawAss !== null && rawAss !== undefined
      ? String(rawAss).trim()
      : '';
    if (normalizedAss) {
      const list = byAssinatura.get(normalizedAss) || [];
      list.push({ ref: d.ref, data });
      byAssinatura.set(normalizedAss, list);
    }
  });

  console.log(`📚 Docs carregados: ${allSnap.size}`);

  const notFound = [];
  const invalid = [];
  const duplicated = [];
  const fixedLoginWhitespace = [];
  let updatedTotal = 0;

  for (const item of updates) {
    try {
      const login = String(item.login || '').trim();
      const date = parsePtBrDate(item.validade);
      if (!date) {
        invalid.push({ login, error: `Data inválida: ${item.validade}` });
        continue;
      }
      const dia = date.getUTCDate();

      let targets = byLogin.get(login) || null;

      // Fallback: procurar por assinatura "Assinatura N" quando login não bater (ex.: whitespace no campo)
      if (!targets || targets.length === 0) {
        // tenta achar por assinatura do padrão "Assinatura <num>" em qualquer doc
        // isso cobre casos em que login tem tabs/espaços e por isso não bateu no índice do login desejado
        // (o índice já faz trim, mas se o login desejado não existe, tentamos o número da assinatura quando disponível)
        // heurística: se existir chave exatamente "Assinatura X" em algum doc e o doc.login trim bate com o login desejado, ok.
        // caso contrário, tentamos localizar docs cujo campo login trim seja igual ao login desejado percorrendo todos (raro).
        // Como já temos byLogin com trim, se não achou aqui, não existe login trim no dataset.
      }

      if (!targets || targets.length === 0) {
        notFound.push(login);
        continue;
      }

      if (targets.length > 1) {
        duplicated.push(login);
      }

      // Atualizar todos os docs encontrados para esse login
      const batch = db.batch();
      targets.forEach((t) => {
        const currentRawLogin = t.data.login ?? t.data.Login ?? null;
        const currentTrim = currentRawLogin !== null && currentRawLogin !== undefined ? String(currentRawLogin).trim() : '';
        const needsFixLogin = currentTrim && currentTrim !== String(currentRawLogin);

        batch.update(t.ref, {
          login, // regulariza (trim + padrão)
          data_renovacao: admin.firestore.Timestamp.fromDate(date),
          dia_vencimento: dia,
          status: 'ativa',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (needsFixLogin) {
          fixedLoginWhitespace.push(login);
        }
      });
      await batch.commit();
      updatedTotal += targets.length;
    } catch (e) {
      invalid.push({ login: item.login, error: e?.message || String(e) });
    }
  }

  console.log('\n✅ Concluído.');
  console.log(`🧾 Documentos atualizados: ${updatedTotal}`);
  if (duplicated.length) {
    console.log(`⚠️ Logins duplicados (atualizei todos os docs): ${duplicated.join(', ')}`);
  }
  if (fixedLoginWhitespace.length) {
    const unique = Array.from(new Set(fixedLoginWhitespace));
    console.log(`🧼 Logins regularizados (removi espaços/tabs): ${unique.join(', ')}`);
  }
  if (notFound.length) {
    console.log(`\n❌ Logins NÃO encontrados (${notFound.length}):`);
    notFound.forEach((l) => console.log(`- ${l}`));
  } else {
    console.log('\n✅ Todos os logins da lista existem no sistema.');
  }
  if (invalid.length) {
    console.log(`\n❌ Erros/dados inválidos (${invalid.length}):`);
    invalid.forEach((x) => console.log(`- ${x.login}: ${x.error}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('💥 Falha geral:', e);
    process.exit(1);
  });

