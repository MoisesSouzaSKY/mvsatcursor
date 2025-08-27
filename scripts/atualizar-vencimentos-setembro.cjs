/*
 Uso: node scripts/atualizar-vencimentos-setembro.cjs
 Requisitos: service-account.json na raiz do projeto.
 Objetivo: comparar lista colada abaixo com as cobranças no Firestore,
 atualizar data_vencimento para setembro mantendo o dia, e emitir relatório.
*/

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '..', 'service-account.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
} catch (e) {
  console.error('Erro ao inicializar Firebase Admin:', e);
  process.exit(1);
}

const db = admin.firestore();

// Cole aqui a lista fornecida pelo usuário
const INPUT = `Geovane Carlos	Jardim Europa	SKY	2025-07-05 00:00:00
Aldenour	Castanhal	SKY	2025-07-05 00:00:00
Osiel Lima	Telégrafo	SKY	2025-07-05 00:00:00
Rafael Costa	Icoaraci	SKY	2025-07-05 00:00:00
Ivan Martins	Mosqueiro	SKY	2025-07-05 00:00:00
Antônio Batista	Icui	Combo	2025-07-05 00:00:00
Jessica Barbosa	icoaraci	SKY	2025-07-05 00:00:00
Marina Melo	Soturno	SKY	2025-07-05 00:00:00
Edgar ambé	Icoaraci	SKY	2025-07-05 00:00:00
Paula	Cidade nova 2	SKY	2025-07-05 00:00:00
Salomão Goes	Paar	SKY	2025-07-05 00:00:00
Diogo Silva	Marambaia	SKY	2025-07-05 00:00:00
Francisco Jhone	Cajueiro	SKY	2025-07-05 00:00:00
Evaristo Porfirio	Coqueiro	SKY	2025-07-05 00:00:00
Evandro	Jurunas	SKY	2025-07-05 00:00:00
Benedito Ribeiro	Cremação	SKY	2025-07-05 00:00:00
Andreza	Jurunas	SKY	2025-07-05 00:00:00
Renato Casanova	Benfica	SKY	2025-07-05 00:00:00
Fernando Sergio	Marco	Combo	2025-07-05 00:00:00
Jorge Henrique	Parque Alvorada	SKY	2025-07-05 00:00:00
Lucas Vaz	Vale Quem Tem	SKY	2025-07-05 00:00:00
Joselina Inácio	Parque Poti	SKY	2025-07-05 00:00:00
Valner Vasconcelos	Buenos Aires	SKY	2025-07-05 00:00:00
João Batista	Castanhal	SKY	2025-07-05 00:00:00
Laise elane	Rios Pará	SKY	2025-07-05 00:00:00
Pedro Novas	Marco	SKY	2025-07-05 00:00:00
Francisco Eduardo	Taquari	SKY	2025-07-05 00:00:00
Adailton Costa	40 Horas	SKY	2025-07-05 00:00:00
Arnaldo Cruz	Marituba	SKY	2025-07-05 00:00:00
Jose Carlos Souza	Curuça	SKY	2025-07-05 00:00:00
Fabio	Barreiro	SKY	2025-07-05 00:00:00
Jair	Cidade nova	SKY	2025-07-05 00:00:00
Maria das Graças	Cidade Nova	SKY	2025-07-05 00:00:00
Gleidson	Distrito	SKY	2025-07-05 00:00:00
Mauro	Aguas Lindas	SKY	2025-07-05 00:00:00
Renee de Abreu	Icoaraci	SKY	2025-07-05 00:00:00
Sidney	Cidade Nova	SKY	2025-07-05 00:00:00
Vania Pampolha	Coqueiro	SKY	2025-07-05 00:00:00
Carlos Alberto	Castanheira	SKY	2025-07-05 00:00:00
Izac Do Nascimento	Terra Firme	SKY	2025-07-05 00:00:00
Rafael de Vilhena	Aguas Lindas	SKY	2025-07-05 00:00:00
Regina Leão	Condor	Combo	2025-07-05 00:00:00
Walter Damasceno	Tenoné	SKY	2025-07-05 00:00:00
Matheus Pitagoras	Maguari	TV Box	2025-07-05 00:00:00
Dirceu Rodrigo	Marituba	TV Box	2025-07-05 00:00:00
Maria Antônia	Cidade Nova	TV Box	2025-07-05 00:00:00
Núbia de Araújo	Pratinha	TV Box	2025-07-05 00:00:00
Jonnys Raimundo	Télegrafo	TV Box	2025-07-05 00:00:00
Gerson Borges	Parque Verde	TV Box	2025-07-05 00:00:00
Francisco Jefisson	Novo horizonte	SKY	2025-07-05 00:00:00
Lukas kaue	Distrito	TV Box	2025-07-05 00:00:00
Edilson Cunha	Tenone	TV Box	2025-07-05 00:00:00
Edilson Cunha	Tenone	TV Box	2025-07-05 00:00:00
Alexandre	Icoaraci	TV Box	2025-07-05 00:00:00
Almir	Tapanã	TV Box	2025-07-05 00:00:00
Adawilkson Santos	Taua	TV Box	2025-07-05 00:00:00
Alexandre	Icoaraci	TV Box	2025-07-05 00:00:00
Dirceu Rodrigo	Marituba	TV Box	2025-07-05 00:00:00
Robson Alexandre	Canudos	SKY	2025-07-05 00:00:00
Ana Raquel	Deus Quer	SKY	2025-07-10 00:00:00
...`; // Lista truncada para manter o arquivo enxuto. Cole a lista completa aqui, se necessário.

function pad2(n) { return String(n).padStart(2, '0'); }

function parseLista(txt) {
  const linhas = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const nomes = new Set();
  const nomeDia = {};
  for (const l of linhas) {
    const cols = l.split(/\t+|\s{2,}\s*/).map(c => c.trim()).filter(Boolean);
    if (cols.length < 4) continue;
    const nome = cols[0].toLowerCase();
    const data = cols[3];
    const m = String(data).match(/(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);
    const dia = m ? m[3] : '01';
    nomes.add(nome);
    nomeDia[nome] = dia;
  }
  return { nomes, nomeDia };
}

async function main() {
  const { nomes, nomeDia } = parseLista(INPUT);

  const cobrancasSnap = await db.collection('cobrancas').get();
  const clientesSnap = await db.collection('clientes').get().catch(() => ({ empty: true, docs: [] }));

  const clientesByNome = new Map();
  for (const d of clientesSnap.docs || []) {
    const data = d.data() || {};
    const nome = String(data.nome || data.cliente_nome || '').toLowerCase();
    if (nome) clientesByNome.set(nome, data);
  }

  const atualizados = [];
  const naoEncontrados = [];
  const extras = [];
  const desativados = [];

  // Index das cobranças por nome
  const cobrancasByNome = new Map();
  for (const d of cobrancasSnap.docs) {
    const c = { id: d.id, ...d.data() };
    const nomeLower = String(c.cliente_nome || '').toLowerCase();
    if (!cobrancasByNome.has(nomeLower)) cobrancasByNome.set(nomeLower, []);
    cobrancasByNome.get(nomeLower).push(c);
  }

  for (const nomeLower of nomes) {
    const doNome = cobrancasByNome.get(nomeLower) || [];
    if (doNome.length === 0) {
      naoEncontrados.push(nomeLower);
      continue;
    }
    const dia = nomeDia[nomeLower] || '01';
    for (const c of doNome) {
      // manter ano da cobrança original, ajustar mês para 09
      const raw = String(c.data_vencimento || '');
      const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
      const ano = m ? m[1] : '2025';
      const nova = `${ano}-09-${pad2(Number(dia))}`;
      await db.collection('cobrancas').doc(c.id).update({ data_vencimento: nova, data_atualizacao: new Date() });
      atualizados.push(c.cliente_nome);
      const cli = clientesByNome.get(nomeLower);
      if (cli && String(cli.status || '').toLowerCase().includes('desativ')) {
        desativados.push(c.cliente_nome);
      }
    }
  }

  // Extras: o que está em cobranças mas não na lista
  for (const [nomeLower, arr] of cobrancasByNome.entries()) {
    if (!nomes.has(nomeLower)) {
      arr.forEach(c => extras.push(c.cliente_nome));
    }
  }

  const relatorio = { atualizados, naoEncontrados, extras, desativados };
  console.log('RELATORIO_ATUALIZACAO_JSON_START');
  console.log(JSON.stringify(relatorio, null, 2));
  console.log('RELATORIO_ATUALIZACAO_JSON_END');
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});



