/**
 * Seed automático de CLIENTES + APARELHOS para uma assinatura (multiempresa).
 *
 * Regras aplicadas:
 * - Cria clientes em `empresas/{empresaId}/clientes` (sem duplicar por nome normalizado)
 * - Cria aparelhos em `empresas/{empresaId}/equipamentos` vinculando:
 *   - assinatura (por código)
 *   - cliente correspondente
 * - Não cadastra endereço quando for texto "não-endereço" (conforme lista)
 * - Cartão sempre formatado como 12 dígitos: "0000 0000 0000"
 *
 * Uso (PowerShell):
 *   node scripts/seed-clientes-e-aparelhos-assinatura-1525892446.cjs --email="Igor8560@gmail.com"
 *
 * Observação:
 * - Usa `FIREBASE_SERVICE_ACCOUNT` se existir; senão usa `service-account.json` na raiz.
 * - Não remove nada.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.join('=') || true;
  }
  return out;
}

function requireArg(args, key) {
  const v = args[key];
  if (!v || v === true) throw new Error(`Argumento obrigatório ausente: --${key}=...`);
  return String(v);
}

async function ensureAdmin() {
  if (admin.apps.length) return;

  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  const fallbackPath = path.resolve(__dirname, '..', 'service-account.json');
  const resolved =
    envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(fallbackPath) ? fallbackPath : null;

  if (!resolved) {
    throw new Error(
      'Service account não configurado. Defina FIREBASE_SERVICE_ACCOUNT ou crie um arquivo service-account.json na raiz do projeto.'
    );
  }

  // eslint-disable-next-line import/no-dynamic-require
  const serviceAccount = require(resolved);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAO_ENDERECO = [
  'sei onde e',
  'helio sabe onde e',
  'em casa',
  'queimado (mandei retirar)',
];

function isEnderecoInvalido(raw) {
  const t = normalizeText(raw);
  if (!t) return true;
  return NAO_ENDERECO.some((bad) => t === bad || t.includes(bad));
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatSmartCard12(raw) {
  const digits = onlyDigits(raw);
  const padded = digits.slice(-12).padStart(12, '0');
  return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)}`;
}

const EMAIL_ALVO_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1525892446';

const ITENS = [
  {
    cliente: 'ALEF BEZERRA',
    endereco: 'TRAVESSA WALTER CAVALVANTE 23',
    telefone: '85996905434',
    nds: 'CE0A0125447856576',
    cartao: '0011 3494 4253',
  },
  {
    cliente: 'SERGIO NOBREGA',
    endereco: 'Rua Ambrosio de Carvalho 725 Messejana',
    telefone: '85987357030',
    nds: '670A263417414987E',
    cartao: '0063 3269 3110',
  },
  {
    cliente: 'MARCIA SIQUEIRA',
    endereco: 'TRAVESSA CESARINA BATISTA 181 SIQUEIRA',
    telefone: '85994319272',
    nds: 'CE0A2035402576305',
    cartao: '0110 6964 3620',
  },
  {
    cliente: 'TAVINHO',
    telefone: '85988875642',
    nds: 'CE0AA135341155039',
    cartao: '0006 0643 6954',
  },
  {
    cliente: 'MAURO OLIVEIRA',
    endereco: 'RUA VAL PARAISO 1480 CJ SÃO CRISTOVAO',
    nds: 'CE0A2036144068638',
    cartao: '0120 2681 2660',
  },
  {
    cliente: 'SOCORRO TAPERA',
    endereco: 'RUA LUIZA BENTO DE ARAUJO TAPERA',
    telefone: '85989092394',
    nds: 'CE0A2036145779199',
    cartao: '0113 5063 0200',
  },
  {
    cliente: 'ALYSON COSTA',
    endereco: 'AV INDEPENDENCIA 1457 QUINTINO CUNHA',
    telefone: '85998177175',
    nds: 'CE0A2036199126825',
    cartao: '0007 8411 9984',
  },
  {
    cliente: 'MARCOS MOELIO',
    endereco: 'AV PRESIDENTE CASTELO BRANCO 2421 ALTOS',
    telefone: '85984212551',
    nds: 'CE0A2036232195688',
    cartao: '0111 9279 7580',
  },
  {
    cliente: 'SIMONE CAUCAIA',
    endereco: 'RUA JOSE DA ROCHA SALES 105 CAUCAIA',
    telefone: '85999309701',
    nds: 'CE0AA13529044270D',
    cartao: '0006 5944 5308',
  },
  {
    cliente: 'HUGO PARANGABA',
    endereco: 'RUA PADRE ELIAS SARAIVA 134 PARANGABA',
    telefone: '85988302388',
    nds: 'CE0A0125491357816',
    cartao: '0120 1312 5740',
  },
  {
    cliente: 'LUCIANO JUNIOR',
    endereco: 'RUA H 48 JW',
    telefone: '85987217144',
    nds: 'CE0A0125432067276',
    cartao: '0112 4302 8760',
  },
  {
    cliente: 'AMIGO DO AROLDO/EMID',
    endereco: 'RUA 23 CASA 121B JW',
    telefone: '85988754194',
    nds: 'CE0AA135312573014',
    cartao: '0006 9585 6203',
  },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_ALVO_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;

  const usuarioRef = db.collection('usuarios').doc(uid);
  const usuarioSnap = await usuarioRef.get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const empresaRef = db.collection('empresas').doc(empresaId);

  // 1) Localizar assinatura pelo código
  const assSnap = await empresaRef
    .collection('assinaturas')
    .where('codigo', '==', ASSINATURA_CODIGO)
    .limit(1)
    .get();

  if (assSnap.empty) {
    throw new Error(
      `Assinatura não encontrada em empresas/${empresaId}/assinaturas para codigo="${ASSINATURA_CODIGO}".`
    );
  }

  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || ''); // titular

  // 2) Carregar clientes existentes para não duplicar
  const clientesCol = empresaRef.collection('clientes');
  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map(); // key -> {id, nome}

  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (key) clienteByKey.set(key, { id: d.id, nome });
  }

  // 3) Carregar equipamentos existentes para não duplicar
  const eqCol = empresaRef.collection('equipamentos');
  const eqSnap = await eqCol.get();
  const eqByNds = new Map(); // nds -> id
  const eqByCardDigits = new Map(); // 12 digits -> id
  for (const d of eqSnap.docs) {
    const data = d.data() || {};
    const nds = String(data.nds || data.numero_nds || '').trim();
    const cardDigits = onlyDigits(data.smartcard || data.smart_card || '');
    if (nds) eqByNds.set(nds, d.id);
    if (cardDigits) eqByCardDigits.set(cardDigits, d.id);
  }

  const createdClients = [];
  const existingClients = [];
  const createdEquipamentos = [];
  const skippedEquipamentos = [];

  for (const item of ITENS) {
    const nomeCliente = String(item.cliente || '').trim();
    const key = normalizeText(nomeCliente);
    if (!key) continue;

    let clienteId = null;
    if (clienteByKey.has(key)) {
      const existing = clienteByKey.get(key);
      clienteId = existing.id;
      existingClients.push({ nome: nomeCliente, id: clienteId });
    } else {
      const telDigits = onlyDigits(item.telefone || '');
      const enderecoRaw = item.endereco ? String(item.endereco) : '';
      const temEnderecoValido = !isEnderecoInvalido(enderecoRaw);

      const clientePayload = {
        nome: nomeCliente,
        nomeCompleto: nomeCliente,
        telefone: telDigits || '',
        telefones: telDigits || '',
        status: 'ativo',
        dataCadastro: nowTs(),
        dataUltimaAtualizacao: nowTs(),
        dataCriacao: nowTs(),
        ...(temEnderecoValido
          ? {
              endereco: {
                rua: enderecoRaw.trim(),
                numero: '',
                bairro: '',
                cidade: '',
                estado: '',
                cep: '',
                pontoReferencia: '',
              },
              bairro: '',
            }
          : {}),
      };

      const ref = clientesCol.doc();
      if (!dryRun) await ref.set(clientePayload, { merge: true });
      clienteId = ref.id;
      clienteByKey.set(key, { id: clienteId, nome: nomeCliente });
      createdClients.push({ nome: nomeCliente, id: clienteId, comEndereco: temEnderecoValido });
    }

    // Equipamento
    const nds = String(item.nds || '').trim();
    const smartcardFmt = formatSmartCard12(item.cartao || '');
    const smartDigits = onlyDigits(smartcardFmt);
    if (!nds || !smartDigits) continue;

    const dupNds = eqByNds.get(nds) || null;
    const dupCard = eqByCardDigits.get(smartDigits) || null;
    if (dupNds || dupCard) {
      skippedEquipamentos.push({
        nds,
        smartcard: smartcardFmt,
        motivo: dupNds ? 'NDS já existe' : 'SmartCard já existe',
        equipamentoId: dupNds || dupCard,
      });
      continue;
    }

    const equipamentoPayload = {
      nds,
      numero_nds: nds,
      smartcard: smartcardFmt,
      smart_card: smartcardFmt,
      status: 'alugado',
      status_aparelho: 'alugado',
      cliente: nomeCliente,
      cliente_nome: nomeCliente,
      clienteId: clienteId,
      cliente_id: clienteId,
      codigo: ASSINATURA_CODIGO,
      nomeCompleto: nomeCliente,
      assinaturaId: assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
      dataUltimaAtualizacao: nowTs(),
      createdAt: nowTs(),
    };

    const eqRef = eqCol.doc();
    if (!dryRun) await eqRef.set(equipamentoPayload, { merge: true });
    eqByNds.set(nds, eqRef.id);
    eqByCardDigits.set(smartDigits, eqRef.id);
    createdEquipamentos.push({ id: eqRef.id, nds, smartcard: smartcardFmt, cliente: nomeCliente });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId, nome: assinaturaNome },
        dryRun,
        totals: {
          itens: ITENS.length,
          clientesCriados: createdClients.length,
          clientesJaExistiam: existingClients.length,
          aparelhosCriados: createdEquipamentos.length,
          aparelhosPulados: skippedEquipamentos.length,
        },
        createdClients,
        existingClients,
        createdEquipamentos,
        skippedEquipamentos,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.message || e);
  process.exitCode = 1;
});

