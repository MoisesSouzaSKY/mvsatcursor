/**
 * Seed de CLIENTES + VÍNCULO com EQUIPAMENTOS por NDS (assinatura 1525892446).
 *
 * Regras:
 * - Criar clientes em `empresas/{empresaId}/clientes` sem duplicar (por nome normalizado)
 * - Se endereço for vago/não-endereço (ex.: "SEI ONDE É", "HELIO SABE...", "EM CASA", "QUEIMADO..."), NÃO salvar endereço
 * - Se cliente estiver vazio ou for marcador (ex.: "EM CASA"), não criar cliente e deixar equipamento DISPONÍVEL
 * - Vincular cada equipamento (por NDS) ao cliente correspondente:
 *   - preenche clienteId/cliente_nome/cliente/nomeCompleto
 *   - status "alugado" quando tiver cliente
 *   - status "disponivel" quando não tiver cliente
 * - Mantém todos os equipamentos vinculados à assinatura 1525892446 (por código/id)
 *
 * Uso:
 *   node scripts/seed-clientes-e-vincular-equipamentos-por-nds-1525892446.cjs --email="Igor8560@gmail.com"
 *   node scripts/seed-clientes-e-vincular-equipamentos-por-nds-1525892446.cjs --email="Igor8560@gmail.com" --dryRun
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

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const INVALID_PHRASES = [
  'sei onde e',
  'helio sabe onde e',
  'em casa',
  'queimado (mandei retirar)',
  'nao encontrado(mandei retirar)',
  'nao encontrado (mandei retirar)',
];

function isInvalidPhrase(raw) {
  const t = normalizeText(raw);
  if (!t) return true;
  return INVALID_PHRASES.some((p) => t === p || t.includes(p));
}

function isEnderecoValido(enderecoRaw) {
  const t = String(enderecoRaw || '').trim();
  if (!t) return false;
  if (isInvalidPhrase(t)) return false;

  const tt = normalizeText(t);
  const hasDigits = /\d/.test(t);
  const hasStreetToken = [
    'rua',
    'av ',
    'avenida',
    'travessa',
    'tv ',
    'estrada',
    'rodovia',
    'alameda',
    'praca',
    'praça',
    'beco',
    'via',
    'km',
    'bl',
    'ap ',
    'apto',
    'cj ',
    'conj',
  ].some((k) => tt.includes(k));

  // endereço real: ter número OU ter token de logradouro
  return hasDigits || hasStreetToken;
}

function isClienteValido(nomeRaw) {
  const t = String(nomeRaw || '').trim();
  if (!t) return false;
  // Se o próprio "nome" for marcador, não criar cliente
  return !isInvalidPhrase(t);
}

const ASSINATURA_CODIGO = '1525892446';
const EMAIL_DEFAULT = 'Igor8560@gmail.com';

// Lista extraída da imagem (Cliente | Endereço | Telefone | NDS)
const ITENS = [
  { cliente: 'ALEF BEZERRA', endereco: 'TRAVESSA WALTER CAVALVANTE 23', telefone: '85996905434', nds: 'CE0A0125447856576' },
  { cliente: 'SERGIO NOBREGA', endereco: 'rua ambrosio de carvalho 725 messejana', telefone: '85987357030', nds: '670A263417414987E' },
  { cliente: '', endereco: 'QUEIMADO (MANDEI RETIRAR)', telefone: '', nds: '670AA135300947964' },
  { cliente: 'MARCIA SIQUEIRA', endereco: 'TRAVESSA CESARINA BATISTA 181 SIQUEIRA', telefone: '85994319272', nds: 'CE0A2035402576305' },
  { cliente: 'TAVINHO', endereco: 'AQUIRAZ HELIO SABE ONDE E', telefone: '85988875642', nds: 'CE0AA135341155039' },
  { cliente: 'MAURO OLIVEIRA', endereco: 'RUA VAL PARAISO 1480 CJ SÃO CRISTOVAO', telefone: '', nds: 'CE0A2036144068638' },
  { cliente: 'SOCORRO TAPERA', endereco: 'RUA LUIZA BENTO DE ARAUJO TAPERA', telefone: '85989092394', nds: 'CE0A2036145779199' },
  { cliente: 'ALYSON COSTA', endereco: 'AV INDEPENDENCIA 1457 QUINTINO CUNHA', telefone: '85998177175', nds: 'CE0A2036199126825' },
  { cliente: 'MARCOS MOELIO', endereco: 'AV PRESIDENTE CASTELO BRANCO 2421 ALTOS', telefone: '85984212551', nds: 'CE0A2036232195688' },
  { cliente: 'SIMONE CAUCAIA', endereco: 'RUA JOSE DA ROCHA SALES 105 CAUCAIA', telefone: '85999309701', nds: 'CE0AA13529044270D' },
  { cliente: 'HUGO PARANGABA', endereco: 'RUA PADRE ELIAS SARAIVA 134 PARANGABA', telefone: '85988302388', nds: 'CE0A0125491357816' },
  { cliente: 'LUCIANO JUNIOR', endereco: 'RUA H 48 JW', telefone: '85987217144', nds: 'CE0A0125432067276' },
  { cliente: 'AMIGO DO AROLDO/EMID', endereco: 'RUA 23 CASA 121B JW', telefone: '85988754194', nds: 'CE0AA135312573014' },
  { cliente: 'CARLOS HENRIQUE', endereco: 'RUA FLORIANO PEIXOTO 2357 AP 201', telefone: '85996340233', nds: 'CE0A0125577885723' },
  { cliente: 'PAI DO JUNIOR AMARO', endereco: 'RUA CORONEL JOAO CORREIA 386 BOM JARDIM', telefone: '85997251329', nds: 'CE0A012543116932B' },
  { cliente: 'TARCISIO EMIDIO', endereco: 'RUA ADAUTO CASTELO 19 , SIQUEIRA', telefone: '85984071704', nds: 'CE0A0125431764972' },
  { cliente: 'RENATA PESSOA', endereco: 'AV GENERAL OSORIO DE PAIVA 1431 BL 03 AP 103', telefone: '85996645574', nds: 'CE0A0125485155272' },
  { cliente: 'EM CASA', endereco: 'EM CASA', telefone: '', nds: 'CE0A0120825374836' },
  { cliente: 'PAULINHO MOELIO 2', endereco: 'SEI ONDE E', telefone: '85989280921', nds: 'CE0A012082733826A' },
  { cliente: 'DARLESOM', endereco: 'RUA POUSO ALEGRE 80 MESSEJANA', telefone: '85981279377', nds: 'CE0A0120770653196' },
  { cliente: 'PAULINHO 1 MOELIO', endereco: 'SEI ONDE E', telefone: '85989280921', nds: 'CE0A012548606169E' },
  { cliente: 'TAVINHO AQUIRAZ', endereco: 'HELIO SABE ONDE E', telefone: '85988875642', nds: 'CE0A012548433898A' },
  { cliente: 'RODRIGO GADELHA', endereco: 'RUA ADOLFO PINHEIRO 382', telefone: '85988473843', nds: 'CE0A2036212448304' },
  { cliente: 'SEU MANUEL FRANCINEUDO', endereco: 'EM FRENTE AO FRANCINEUDO', telefone: '85999614623', nds: 'CE0A0125509496683' },
  { cliente: 'EM CASA', endereco: 'EM CASA', telefone: '', nds: 'CE0A0125552141546' },
  { cliente: 'SERGIO ASSIS', endereco: 'RUA 04 190 NOVO ORIENTE', telefone: '85988676216', nds: 'CE0A0125510298446' },
  { cliente: '', endereco: 'EM CASA', telefone: '', nds: 'CE0A012551166363F' },
  { cliente: 'MARIA DO SOCORRO IGUA', endereco: 'ESTRADA DO IGUAPE -AQUIRAZ', telefone: '85999386943', nds: '670A0125387707503' },
  { cliente: 'CARLIM VANIA', endereco: 'TABAPUA APARTAMENTO', telefone: '85981246570', nds: 'CE0A012079386524E' },
  { cliente: 'TAVINHO AQUIRAZ', endereco: 'HELIO SABE ONDE E', telefone: '85988875642', nds: 'CE0A0125516823527' },
  { cliente: 'TIA DO ABRAAO', endereco: 'RUA 16 CASA 1B CJ INDUSTRIAL', telefone: '85989282519', nds: 'CE0A0125519202306' },
  { cliente: '', endereco: 'NÃO ENCONTRADO(MANDEI RETIRAR)', telefone: '', nds: 'CE0A012553266866B' },
  { cliente: 'ADRIANO', endereco: 'RUA EDILSON GOMES 17 PICI', telefone: '85997384317', nds: 'CE0A0125529970593' },
  { cliente: 'AMIGO DO PAI DO NADSO', endereco: 'RUA CORONEL PERGENTINO FERREIRA 185 COD', telefone: '85994199137', nds: 'CE0AA13527413258C' },
  { cliente: 'RODRIGO DEYVID', endereco: 'AV D BLOCO 160 AP 201', telefone: '85987619925', nds: 'CE0A012544825787E' },
  { cliente: 'MARCOS EDSON QUEIROZ', endereco: 'TRAVESSA IBIAPABA 94 EDSON QUEIROZ', telefone: '85999821507', nds: 'CE0A0125552065842' },
  { cliente: 'WENDER MONTESE', endereco: 'RUA GALILEU 371 MONTESE', telefone: '85989310851', nds: 'CE0A0125508487756' },
  { cliente: 'JOSE CARLOS INDUSTRIAL', endereco: 'RUA 15 A CSA 61 A CJ INDUSTRIAL', telefone: '85992085044', nds: '670A0125516913702' },
  { cliente: 'CARLOS ALBERTO', endereco: 'RUA XXVIII 240 QUINTINO CUNHA', telefone: '85988953261', nds: 'CE0A012552849595A' },
  { cliente: 'TAVINHO AQUIRAZ', endereco: 'HELIO SABE ONDE E', telefone: '85988875642', nds: 'CE0A012553231677B' },
  { cliente: 'WENDER MONTESE', endereco: 'RUA GALILEU 371 MONTESE', telefone: '85989310851', nds: 'CE0A0125495745846' },
  { cliente: 'RODRIGO GADELHA', endereco: 'RUA ADOLFO PINHEIRO 382', telefone: '85988473843', nds: 'CE0A203621969700D' },
  { cliente: 'SAVIO 01', endereco: 'APT NO ANTONIO BEZERRA', telefone: '85988997595', nds: 'CE0A012551235688F' },
  { cliente: 'EDGLAY/CENTRO FHAS', endereco: 'CENTRO FASHION', telefone: '85998401565', nds: 'CE0A012557605902B' },
  { cliente: 'FLAVIO AQUIRAZ', endereco: 'RUA WALDERI UCHOA 700 BENFICA (TRABALHO)', telefone: '85987574780', nds: 'CE0A0120798104022' },
  { cliente: 'FATIMA CUNHADA DO MA', endereco: 'CONDOMINIO PROXIMO AO MARCOS', telefone: '85999919906', nds: 'CE0A0125503163902' },
  { cliente: 'LIDUINA', endereco: 'RUA PEDRO QUEIROZ 1366 AMADEU FURTADO', telefone: '85987619129', nds: 'CE0A0125551272106' },
  { cliente: 'HILDERVAN HELIO', endereco: 'HELIO SABE ONDE E', telefone: '85996188239', nds: 'CE0A0120824563392' },
  { cliente: 'ANDRE VICTOR', endereco: 'RUA FONSECA LOBO 1163', telefone: '85988373069', nds: 'CE0A0125510308232' },
  { cliente: 'MARIO MORENO', endereco: 'RUA DIONISIO ALENCAR 1500', telefone: '85991511843', nds: '670AAC25380395551' },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;

  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);

  // Assinatura por código
  const assSnap = await empresaRef
    .collection('assinaturas')
    .where('codigo', '==', ASSINATURA_CODIGO)
    .limit(1)
    .get();
  if (assSnap.empty) {
    throw new Error(`Assinatura não encontrada para codigo="${ASSINATURA_CODIGO}" em empresas/${empresaId}/assinaturas.`);
  }
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || '');

  const clientesCol = empresaRef.collection('clientes');
  const eqCol = empresaRef.collection('equipamentos');

  // Cache de clientes existentes
  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (key) clienteByKey.set(key, { id: d.id, data });
  }

  let clientesCriados = 0;
  let clientesJaExistiam = 0;
  let clientesAtualizados = 0;
  let equipamentosVinculados = 0;
  let equipamentosDisponiveis = 0;
  let equipamentosNaoEncontrados = 0;

  const jaExistiam = [];
  const criados = [];
  const atualizados = [];
  const faltando = [];

  for (const item of ITENS) {
    const nds = String(item.nds || '').trim();
    if (!nds) continue;

    const nome = String(item.cliente || '').trim();
    const telDigits = onlyDigits(item.telefone || '');
    const enderecoRaw = String(item.endereco || '').trim();

    const clienteValido = isClienteValido(nome);
    const enderecoValido = isEnderecoValido(enderecoRaw);

    let clienteId = null;
    let clienteNomeFinal = '';

    if (clienteValido) {
      const key = normalizeText(nome);
      const existing = key ? clienteByKey.get(key) : null;
      if (existing) {
        clienteId = existing.id;
        clienteNomeFinal = nome;
        clientesJaExistiam += 1;
        jaExistiam.push({ nome, id: clienteId });

        // Atualizar somente campos ausentes (merge seguro)
        const existingData = existing.data || {};
        const updates = {};
        const existingTelefone = String(existingData.telefone || existingData.telefones || '').trim();
        if (!existingTelefone && telDigits) {
          updates.telefone = telDigits;
          updates.telefones = telDigits;
        }
        const hasEndereco = Boolean(existingData.endereco && (existingData.endereco.rua || existingData.endereco.logradouro));
        if (!hasEndereco && enderecoValido) {
          updates.endereco = {
            rua: enderecoRaw,
            numero: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: '',
            pontoReferencia: '',
          };
          updates.bairro = '';
        }
        if (Object.keys(updates).length > 0) {
          updates.dataUltimaAtualizacao = nowTs();
          if (!dryRun) await clientesCol.doc(clienteId).set(updates, { merge: true });
          clientesAtualizados += 1;
          atualizados.push({ nome, id: clienteId, updates: Object.keys(updates) });
        }
      } else {
        const payload = {
          nome,
          nomeCompleto: nome,
          telefone: telDigits || '',
          telefones: telDigits || '',
          status: 'ativo',
          dataCadastro: nowTs(),
          dataUltimaAtualizacao: nowTs(),
          dataCriacao: nowTs(),
          ...(enderecoValido
            ? {
                endereco: {
                  rua: enderecoRaw,
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
        if (!dryRun) await ref.set(payload, { merge: true });
        clienteId = ref.id;
        clienteNomeFinal = nome;
        clienteByKey.set(normalizeText(nome), { id: clienteId, data: payload });
        clientesCriados += 1;
        criados.push({ nome, id: clienteId, comEndereco: enderecoValido });
      }
    }

    // Localizar equipamento pelo NDS
    const eqSnap = await eqCol.where('nds', '==', nds).limit(1).get();
    const eqSnap2 = eqSnap.empty ? await eqCol.where('numero_nds', '==', nds).limit(1).get() : eqSnap;
    if (eqSnap2.empty) {
      equipamentosNaoEncontrados += 1;
      faltando.push({ nds, cliente: nome || null });
      continue;
    }

    const eqDoc = eqSnap2.docs[0];
    const eqRef = eqDoc.ref;

    const base = {
      codigo: ASSINATURA_CODIGO,
      assinaturaId: assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
      dataUltimaAtualizacao: nowTs(),
    };

    if (clienteValido && clienteId) {
      const eqUpdates = {
        ...base,
        status: 'alugado',
        status_aparelho: 'alugado',
        cliente: clienteNomeFinal,
        cliente_nome: clienteNomeFinal,
        clienteId: clienteId,
        cliente_id: clienteId,
        nomeCompleto: clienteNomeFinal,
      };
      if (!dryRun) await eqRef.set(eqUpdates, { merge: true });
      equipamentosVinculados += 1;
    } else {
      const eqUpdates = {
        ...base,
        status: 'disponivel',
        status_aparelho: 'disponivel',
        cliente: '',
        cliente_nome: '',
        clienteId: null,
        cliente_id: null,
        nomeCompleto: '',
      };
      if (!dryRun) await eqRef.set(eqUpdates, { merge: true });
      equipamentosDisponiveis += 1;
    }
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
          clientesCriados,
          clientesJaExistiam,
          clientesAtualizados,
          equipamentosVinculados,
          equipamentosDisponiveis,
          equipamentosNaoEncontrados,
        },
        clientes: {
          criados,
          jaExistiam,
          atualizados,
        },
        equipamentosNaoEncontrados: faltando,
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

