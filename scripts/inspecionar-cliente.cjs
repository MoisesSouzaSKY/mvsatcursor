#!/usr/bin/env node

// Uso: node scripts/inspecionar-cliente.cjs "NOME DO CLIENTE"

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? null : dt;
}

function isInMonth(date, year, month) {
  return date && date.getFullYear() === year && date.getMonth() === month;
}

async function main() {
  const nameArg = (process.argv[2] || '').trim();
  if (!nameArg) {
    console.error('Informe o nome do cliente. Ex: node scripts/inspecionar-cliente.cjs "Max Cabanagem"');
    process.exit(1);
  }

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service-account.json não encontrado na raiz.');
    process.exit(1);
  }
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  const termo = nameArg.toLowerCase();
  console.log(`🔎 Inspecionando cliente por nome ~ "${nameArg}"`);

  // Carregar clientes e filtrar por nome/nomeCompleto contém termo (case-insensitive)
  const clientesSnap = await db.collection('clientes').get();
  const candidatos = [];
  clientesSnap.forEach(doc => {
    const d = doc.data() || {};
    const nome = (d.nomeCompleto || d.nome || '').toString();
    if (nome.toLowerCase().includes(termo)) {
      candidatos.push({ id: doc.id, nome, status: (d.status || '').toString().toLowerCase() });
    }
  });

  if (candidatos.length === 0) {
    console.log('❗ Nenhum cliente encontrado com esse termo.');
    return;
  }

  for (const c of candidatos) {
    console.log('');
    console.log(`👤 ${c.nome} [${c.status || '—'}] (${c.id})`);

    // TV BOX vinculados
    const tvboxColecao = await db.collection('tvbox').get();
    const tvboxTodos = tvboxColecao.docs.map(d => ({ id: d.id, ...d.data() }));
    const tvboxVinc = tvboxTodos.filter(t => {
      const statusOk = !['cancelado', 'inativo', 'desativado'].includes((t.status || '').toString().toLowerCase());
      if (!statusOk) return false;
      if (t.cliente_id === c.id || t.clienteId === c.id) return true;
      if ((t.cliente_nome || t.cliente || '').toString().toLowerCase().includes(termo)) return true;
      const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];
      if (eqs.some(e => e?.cliente_id === c.id || e?.clienteId === c.id || ((e?.cliente_nome || e?.cliente || '').toString().toLowerCase().includes(termo)))) return true;
      const cls = Array.isArray(t.clientes) ? t.clientes : [];
      if (cls.some(cc => cc?.id === c.id || cc?.cliente_id === c.id || cc?.clienteId === c.id || ((cc?.nome || cc?.cliente_nome || cc?.cliente || '').toString().toLowerCase().includes(termo)))) return true;
      return false;
    });
    const tvboxAtivos = tvboxVinc;
    console.log(`  • TV BOX vinculados: ${tvboxVinc.length} (ativos: ${tvboxAtivos.length})`);

    // SKY via equipamentos
    const equipSnap = await db.collection('equipamentos').where('cliente_id', '==', c.id).get();
    const equip = equipSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sky = equip.filter(e => Boolean(e.smart_card || e.cartao || e.numero_cartao || e.cartao_id));
    const skyAtivos = sky.filter(e => !['cancelado', 'inativo', 'desativado'].includes((e.status_aparelho || '').toString().toLowerCase()));
    console.log(`  • SKY (por smart_card) vinculados: ${sky.length} (ativos: ${skyAtivos.length})`);

    // Assinaturas vinculadas (considerar IPTV como TV BOX)
    // 1) via campo assinatura_id no cliente
    let assinaturaVinculadaAtiva = false;
    let assinaturaInfo = null;
    const assinaturaId = (await db.collection('clientes').doc(c.id).get()).data()?.assinatura_id || null;
    const tiposTv = new Set(['IPTV', 'TV BOX', 'TVBOX', 'TVBOX/IPTV']);
    async function loadAssinaturaInfoById(id) {
      const aDoc = await db.collection('assinaturas').doc(id).get();
      if (aDoc.exists) {
        const a = aDoc.data() || {};
        const statusOk = (a.status || 'ativa').toString().toLowerCase() === 'ativa';
        const tipoNorm = (a.tipo || a.categoria || a.servico || '').toString().toUpperCase();
        const isTv = tiposTv.has(tipoNorm) || tipoNorm.includes('IPTV') || tipoNorm.includes('TV');
        return { ok: statusOk && isTv, raw: a };
      }
      return { ok: false, raw: null };
    }
    if (assinaturaId) {
      const res = await loadAssinaturaInfoById(assinaturaId);
      assinaturaVinculadaAtiva = res.ok;
      assinaturaInfo = res.raw;
    }
    // 2) fallback: procurar em assinaturas onde clientes[].id contém este cliente
    if (!assinaturaVinculadaAtiva) {
      const assSnap = await db.collection('assinaturas').get();
      for (const d of assSnap.docs) {
        const a = d.data() || {};
        const cls = Array.isArray(a.clientes) ? a.clientes : [];
        if (cls.some(cc => cc?.id === c.id || cc?.cliente_id === c.id)) {
          const statusOk = (a.status || 'ativa').toString().toLowerCase() === 'ativa';
          const tipoNorm = (a.tipo || a.categoria || a.servico || '').toString().toUpperCase();
          const isTv = tiposTv.has(tipoNorm) || tipoNorm.includes('IPTV') || tipoNorm.includes('TV');
          if (statusOk && isTv) {
            assinaturaVinculadaAtiva = true;
            assinaturaInfo = a;
            break;
          }
        }
      }
    }
    console.log(`  • Assinatura vinculada (IPTV/TV): ${assinaturaVinculadaAtiva ? 'sim' : 'não'}`);

    // Cobranças
    const cobrSnap = await db.collection('cobrancas').where('cliente_id', '==', c.id).get();
    const agora = new Date();
    const atual = { y: agora.getFullYear(), m: agora.getMonth() };
    const antDate = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const anterior = { y: antDate.getFullYear(), m: antDate.getMonth() };
    let temAtual = false;
    let temAnterior = false;
    const ultimas = [];
    cobrSnap.forEach(d => {
      const data = d.data() || {};
      const dt = asDate(data.data_vencimento || data.vencimento || data.data || data.referencia);
      if (dt) {
        if (isInMonth(dt, atual.y, atual.m)) temAtual = true;
        if (isInMonth(dt, anterior.y, anterior.m)) temAnterior = true;
        ultimas.push({ id: d.id, data: dt.toISOString().slice(0,10), tipo: data.tipo || '', valor: data.valor || '', status: data.status || '' });
      }
    });
    ultimas.sort((a,b) => a.data.localeCompare(b.data)).slice(-5);

    console.log(`  • Cobranças encontradas: ${cobrSnap.size} (mês atual: ${temAtual ? 'sim' : 'não'}, mês anterior: ${temAnterior ? 'sim' : 'não'})`);
    if (ultimas.length) {
      console.log('    - Últimas cobranças:');
      ultimas.slice(-5).forEach(u => console.log(`      · ${u.data} | ${u.tipo} | ${u.status} | R$ ${u.valor} (${u.id})`));
    }

    const possuiServico = tvboxAtivos.length > 0 || skyAtivos.length > 0 || assinaturaVinculadaAtiva;
    const semCobranca2Meses = !(temAtual || temAnterior);
    console.log(`  • Possui TV BOX/SKY ativo: ${possuiServico ? 'sim' : 'não'}`);
    console.log(`  • Deve entrar no relatório: ${possuiServico && semCobranca2Meses ? 'SIM' : 'não'}`);
  }
}

main().catch(err => {
  console.error('Erro na inspeção:', err);
  process.exitCode = 1;
});


