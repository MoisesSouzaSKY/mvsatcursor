#!/usr/bin/env node

// Lista clientes que possuem TV BOX (coleção `tvbox`) ou equipamento SKY (coleção `equipamentos` com smart_card)
// ativos/vinculados a cliente, mas sem cobranças no mês atual nem no mês anterior.

/*
  Observações:
  - Coleções usadas: `tvbox`, `equipamentos`, `clientes`, `cobrancas`.
  - Critérios TV BOX: documentos em `tvbox` com `cliente_id` definido e `status` != 'cancelado'/'inativo'.
  - Critérios SKY: documentos em `equipamentos` que tenham `smart_card` (indicativo SKY) e `cliente_id` (ou `cliente_atual_id`) definido,
    e cujo `status_aparelho` não indique desativado (quando disponível). Se o campo de status não existir, consideramos vinculado como válido.
  - Cobranças: documentos em `cobrancas` com `cliente_id` igual. Considera-se existência de ao menos uma cobrança cujo `data_vencimento`
    caia no mês atual OU no mês anterior (independente do `status` da cobrança). O campo pode ser Timestamp ou string ISO/aaaa-mm-dd.
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializa Firebase Admin com service account
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Arquivo service-account.json não encontrado na raiz do projeto.');
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Firestore Timestamp compatível
  if (value && typeof value.toDate === 'function') return value.toDate();
  // String
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? null : dt;
}

function isInMonth(date, year, month) {
  return date && date.getFullYear() === year && date.getMonth() === month;
}

async function carregarClientesIndex() {
  const snap = await db.collection('clientes').get();
  const index = new Map();
  snap.forEach(doc => {
    const data = doc.data() || {};
    index.set(doc.id, {
      id: doc.id,
      nome: data.nomeCompleto || data.nome || '—',
      status: (data.status || '').toString().toLowerCase(),
      bairro: data.bairro || data.endereco?.bairro || ''
    });
  });
  return index;
}

async function coletarClientesComTvBoxOuSky() {
  const clientes = new Map(); // cliente_id -> { fonte: 'TV BOX'|'SKY'|'AMBOS', refs: [...], statusCliente, nome, bairro }

  // TV BOX
  const tvboxSnap = await db.collection('tvbox').get();
  const adicionar = (clienteId, refId) => {
    if (!clienteId) return;
    const existente = clientes.get(clienteId);
    const fonte = existente?.fonte === 'SKY' ? 'AMBOS' : 'TV BOX';
    clientes.set(clienteId, {
      ...(existente || {}),
      cliente_id: clienteId,
      fonte,
      refs: [...(existente?.refs || []), { colecao: 'tvbox', id: refId }]
    });
  };
  tvboxSnap.forEach(doc => {
    const d = doc.data() || {};
    const status = (d.status || '').toString().toLowerCase();
    if (['cancelado', 'inativo', 'desativado'].includes(status)) return;
    // vínculo direto por id
    adicionar(d.cliente_id || d.clienteId || null, doc.id);
    // possíveis arrays: equipamentos[].cliente_id, clientes[].id ou clientes[].cliente_id
    const equipamentos = Array.isArray(d.equipamentos) ? d.equipamentos : [];
    equipamentos.forEach(eq => {
      adicionar(eq?.cliente_id || eq?.clienteId || null, doc.id);
      // fallback por nome
      const nome = (eq?.cliente_nome || eq?.cliente || '').toString().trim();
      if (nome) {
        // não temos id aqui; coleta por nome será conciliada ao final via índice de clientes
        // marcamos numa lista separada
        (clientes.__pendentesNome ||= []).push({ nome: nome.toLowerCase(), refId: doc.id, fonte: 'TV BOX' });
      }
    });
    const clientesArr = Array.isArray(d.clientes) ? d.clientes : [];
    clientesArr.forEach(c => {
      adicionar(c?.id || c?.cliente_id || c?.clienteId || null, doc.id);
      const nome = (c?.nome || c?.cliente_nome || c?.cliente || '').toString().trim();
      if (nome) {
        (clientes.__pendentesNome ||= []).push({ nome: nome.toLowerCase(), refId: doc.id, fonte: 'TV BOX' });
      }
    });
    const nomeDireto = (d.cliente_nome || d.cliente || '').toString().trim();
    if (nomeDireto) {
      (clientes.__pendentesNome ||= []).push({ nome: nomeDireto.toLowerCase(), refId: doc.id, fonte: 'TV BOX' });
    }
  });

  // SKY via equipamentos
  const equipamentosSnap = await db.collection('equipamentos').get();
  equipamentosSnap.forEach(doc => {
    const d = doc.data() || {};
    const clienteId = d.cliente_id || d.cliente_atual_id || null;
    const temSmartCard = Boolean(d.smart_card || d.cartao || d.numero_cartao || d.cartao_id);
    if (!temSmartCard) return; // heurística para SKY
    const statusAparelho = (d.status_aparelho || '').toString().toLowerCase();
    if (statusAparelho && ['desativado', 'inativo', 'cancelado'].includes(statusAparelho)) return;
    const existente = clientes.get(clienteId);
    const fonte = existente?.fonte === 'TV BOX' ? 'AMBOS' : (existente ? existente.fonte : 'SKY');
    if (clienteId) {
      clientes.set(clienteId, {
        ...(existente || {}),
        cliente_id: clienteId,
        fonte,
        refs: [...(existente?.refs || []), { colecao: 'equipamentos', id: doc.id }]
      });
    }
    const nome = (d.cliente_nome || d.cliente || '').toString().trim();
    if (!clienteId && nome) {
      (clientes.__pendentesNome ||= []).push({ nome: nome.toLowerCase(), refId: doc.id, fonte: 'SKY' });
    }
  });

  // Assinaturas consideradas TV (IPTV/TV BOX) e ativas
  const assinSnap = await db.collection('assinaturas').get();
  const tiposTv = new Set(['IPTV', 'TV BOX', 'TVBOX', 'TVBOX/IPTV']);
  const addAss = (clienteId, refId) => {
    if (!clienteId) return;
    const existente = clientes.get(clienteId);
    const fonte = existente?.fonte ? existente.fonte : 'TV BOX';
    clientes.set(clienteId, {
      ...(existente || {}),
      cliente_id: clienteId,
      fonte,
      refs: [...(existente?.refs || []), { colecao: 'assinaturas', id: refId }]
    });
  };
  assinSnap.forEach(doc => {
    const a = doc.data() || {};
    const statusOk = (a.status || 'ativa').toString().toLowerCase() === 'ativa';
    const tipoNorm = (a.tipo || a.categoria || a.servico || '').toString().toUpperCase();
    const isTv = tiposTv.has(tipoNorm) || tipoNorm.includes('IPTV') || tipoNorm.includes('TV');
    if (!statusOk || !isTv) return;
    addAss(a.cliente_id || a.clienteId || null, doc.id);
    const cls = Array.isArray(a.clientes) ? a.clientes : [];
    cls.forEach(cc => addAss(cc?.id || cc?.cliente_id || cc?.clienteId || null, doc.id));
  });

  // Fonte específica TV Box usada na UI: tvbox_assinaturas (2 slots por assinatura)
  const tvboxAssinSnap = await db.collection('tvbox_assinaturas').get();
  tvboxAssinSnap.forEach(doc => {
    const t = doc.data() || {};
    const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    eqs.forEach(e => {
      const id = e?.cliente_id || e?.clienteId || null;
      if (id) {
        const existente = clientes.get(id);
        const fonte = existente?.fonte === 'SKY' ? 'AMBOS' : (existente?.fonte || 'TV BOX');
        clientes.set(id, {
          ...(existente || {}),
          cliente_id: id,
          fonte,
          refs: [...(existente?.refs || []), { colecao: 'tvbox_assinaturas', id: doc.id }]
        });
      }
      const nome = (e?.cliente_nome || e?.cliente || '').toString().trim();
      if (!id && nome) {
        (clientes.__pendentesNome ||= []).push({ nome: nome.toLowerCase(), refId: doc.id, fonte: 'TV BOX' });
      }
    });
  });

  return clientes;
}

async function temCobrancaNoMesOuAnterior(clienteId, agora) {
  // Busca todas as cobranças do cliente e filtra localmente por mês/ano
  const snap = await db.collection('cobrancas').where('cliente_id', '==', clienteId).get();

  const atual = { year: agora.getFullYear(), month: agora.getMonth() };
  const anteriorDate = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const anterior = { year: anteriorDate.getFullYear(), month: anteriorDate.getMonth() };

  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const dt = asDate(d.data_vencimento || d.vencimento || d.data || d.referencia);
    if (!dt) continue;
    if (isInMonth(dt, atual.year, atual.month) || isInMonth(dt, anterior.year, anterior.month)) {
      return true;
    }
  }
  return false;
}

async function main() {
  const inicio = Date.now();
  const agora = new Date();

  console.log('🔎 Gerando lista de clientes com TV BOX/SKY sem cobrança no mês atual ou anterior...');

  const [clientesIndex, clientesComServico] = await Promise.all([
    carregarClientesIndex(),
    coletarClientesComTvBoxOuSky()
  ]);

  // Resolver pendências por nome (quando não havia id no documento)
  const pendentes = clientesComServico.__pendentesNome || [];
  if (pendentes.length) {
    pendentes.forEach(p => {
      // encontrar cliente por nome aproximado (contains)
      for (const [id, c] of clientesIndex.entries()) {
        const nome = (c.nome || '').toString().toLowerCase();
        if (nome.includes(p.nome)) {
          const existente = clientesComServico.get(id);
          const fonte = existente?.fonte && existente.fonte !== p.fonte ? 'AMBOS' : (existente?.fonte || p.fonte);
          clientesComServico.set(id, {
            ...(existente || {}),
            cliente_id: id,
            fonte,
            refs: [...(existente?.refs || []), { colecao: p.fonte === 'SKY' ? 'equipamentos' : 'tvbox', id: p.refId }]
          });
          break;
        }
      }
    });
    delete clientesComServico.__pendentesNome;
  }

  const resultados = [];
  let verificados = 0;

  for (const [clienteId, info] of clientesComServico.entries()) {
    verificados++;
    // Verifica existência de cobrança
    // Inclui mesmo se cliente estiver inativo/ex-cliente
    const possui = await temCobrancaNoMesOuAnterior(clienteId, agora);
    if (!possui) {
      const c = clientesIndex.get(clienteId) || { id: clienteId, nome: '—', status: '', bairro: '' };
      resultados.push({
        cliente_id: clienteId,
        cliente_nome: c.nome,
        status_cliente: c.status || '—',
        bairro: c.bairro || '',
        servico: info.fonte === 'AMBOS' ? 'COMBO' : info.fonte, // normaliza exibição
      });
    }
  }

  resultados.sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome));

  const resumo = {
    data_execucao: new Date().toISOString(),
    total_com_servico: clientesComServico.size,
    total_sem_cobranca_2_meses: resultados.length,
    verificados
  };

  console.log('');
  console.log(`📊 Total com TV BOX/SKY vinculados: ${clientesComServico.size}`);
  console.log(`⚠️ Sem cobrança mês atual/anterior: ${resultados.length}`);
  console.log('');

  if (resultados.length) {
    console.log('Lista (nome | status | bairro | serviço | cliente_id):');
    resultados.slice(0, 200).forEach(r => {
      console.log(`- ${r.cliente_nome} | ${r.status_cliente} | ${r.bairro} | ${r.servico} | ${r.cliente_id}`);
    });
    if (resultados.length > 200) {
      console.log(`... (+${resultados.length - 200} restantes)`);
    }
  }

  // Salvar arquivo JSON
  const outDir = path.join(process.cwd(), 'scripts');
  const file = path.join(outDir, `relatorio-clientes-sem-cobranca-tvbox-sky-${new Date().toISOString().slice(0,10)}.json`);
  const payload = { resumo, resultados };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf-8');
  console.log('');
  console.log(`💾 Relatório salvo em: ${file}`);

  console.log('⏱️ Concluído em', ((Date.now() - inicio) / 1000).toFixed(1), 's');
}

main().catch(err => {
  console.error('❌ Erro no relatório:', err);
  process.exitCode = 1;
});


