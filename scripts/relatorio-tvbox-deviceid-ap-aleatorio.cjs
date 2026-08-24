#!/usr/bin/env node
/**
 * Relatório: TV Box com deviceId "aleatório" no padrão APxxxxxxxx(_n).
 *
 * O problema reportado é deviceId preenchido automaticamente tipo:
 *   APbea970c0_1
 *
 * Este script varre o modelo SaaS:
 *   empresas/{empresaId}/tvbox_assinaturas/{id}  (campo equipamentos[])
 * E também (se existir):
 *   empresas/{empresaId}/tvbox/{tvboxId}          (campo equipamentos[])
 *   tvbox_assinaturas (LEGADO global)            (campo equipamentos[])
 *
 * Saída:
 * - JSON: scripts/relatorio-tvbox-deviceid-ap-aleatorio-YYYY-MM-DD.json
 * - MD:   scripts/relatorio-tvbox-deviceid-ap-aleatorio-YYYY-MM-DD.md
 *
 * Credenciais:
 * - Preferencial: setar env FIREBASE_SERVICE_ACCOUNT com caminho do JSON
 * - Alternativo:  service-account.json na raiz (compatibilidade com scripts antigos)
 *
 * Uso:
 * - node scripts/relatorio-tvbox-deviceid-ap-aleatorio.cjs
 * - node scripts/relatorio-tvbox-deviceid-ap-aleatorio.cjs --empresaId=SEU_TENANT_ID
 * - node scripts/relatorio-tvbox-deviceid-ap-aleatorio.cjs --includeLegacy=true
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.join('=') || true;
  }
  return out;
}

function normStr(v) {
  return (v ?? '').toString().trim();
}

function lower(v) {
  return normStr(v).toLowerCase();
}

function asDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(v) {
  const d = asDate(v);
  if (!d) return '—';
  return d.toLocaleString('pt-BR');
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function ensureAdmin() {
  if (admin.apps.length) return;

  const byEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const legacy = path.join(process.cwd(), 'service-account.json');
  const saPath = byEnv ? path.resolve(byEnv) : legacy;

  if (!fs.existsSync(saPath)) {
    throw new Error(
      'Service account não encontrado. Defina a variável de ambiente FIREBASE_SERVICE_ACCOUNT apontando para um JSON de service account, ou coloque service-account.json na raiz.'
    );
  }

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(saPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function matchesRandomApDeviceId(deviceId) {
  const s = normStr(deviceId);
  if (!s) return false;
  // Padrão mais específico (ex.: APbea970c0_1)
  if (/^AP[a-f0-9]{8}(?:_\d+)?$/i.test(s)) return true;
  // Fallback: qualquer coisa começando com AP (para pegar variações)
  return /^AP/i.test(s);
}

function extractRowsFromDoc({ empresaId, collectionName, docId, docData }) {
  const t = docData || {};
  const assinatura = normStr(t.assinatura || t.subscriptionNumber || t.codigo || t.nome) || `${collectionName} ${docId}`;
  const login = normStr(t.login);
  const status = normStr(t.status || '—');
  const equipamentos = Array.isArray(t.equipamentos) ? t.equipamentos : [];

  const out = [];
  equipamentos.forEach((eq, idx) => {
    const deviceId = normStr(eq?.deviceId ?? eq?.device_id);
    if (!matchesRandomApDeviceId(deviceId)) return;

    const clienteId = normStr(eq?.cliente_id ?? eq?.clienteId) || null;
    const clienteNomeFallback = normStr(eq?.cliente_nome ?? eq?.cliente) || '';
    const slot = Number(eq?.slotIndex ?? eq?.slot ?? (idx + 1)) || (idx + 1);

    out.push({
      empresaId: empresaId || null,
      sourceCollection: collectionName,
      sourceDocId: docId,
      assinatura,
      login: login || null,
      status,
      slot,
      nds: normStr(eq?.nds) || null,
      mac: normStr(eq?.mac) || null,
      idAparelho: normStr(eq?.idAparelho) || null,
      deviceId,
      clienteId,
      clienteNomeFallback,
      atualizadoEm: t.updatedAt || t.dataUltimaAtualizacao || null,
    });
  });

  return out;
}

async function fetchClientesMap(db, empresaId, clienteIds) {
  const map = new Map();
  const unique = Array.from(new Set(clienteIds.filter(Boolean)));
  if (unique.length === 0) return map;

  // Firestore "in" até 10 por query
  for (let i = 0; i < unique.length; i += 10) {
    const slice = unique.slice(i, i + 10);
    const snap = await db
      .collection('empresas')
      .doc(empresaId)
      .collection('clientes')
      .where(admin.firestore.FieldPath.documentId(), 'in', slice)
      .get();
    snap.forEach((d) => {
      const c = d.data() || {};
      map.set(d.id, {
        id: d.id,
        nome: normStr(c.nomeCompleto || c.nome) || '—',
        bairro: normStr(c.bairro || c.endereco?.bairro) || '',
        telefone: normStr(c.telefone || c.whatsapp || c.celular) || '',
      });
    });
  }
  return map;
}

async function main() {
  const args = parseArgs(process.argv);
  await ensureAdmin();

  const db = admin.firestore();
  const includeLegacy = args.includeLegacy === true || String(args.includeLegacy || '').toLowerCase() === 'true';

  const empresaIds = [];
  if (args.empresaId && args.empresaId !== true) {
    empresaIds.push(String(args.empresaId));
  } else {
    const snapEmp = await db.collection('empresas').get();
    snapEmp.forEach((d) => empresaIds.push(d.id));
  }

  const rows = [];

  for (const empresaId of empresaIds) {
    const pending = [];
    const clienteIds = [];

    // 1) Fonte principal usada no app (SaaS): tvbox_assinaturas
    const subSnap = await db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas').get();
    subSnap.forEach((d) => {
      const extracted = extractRowsFromDoc({
        empresaId,
        collectionName: `empresas/${empresaId}/tvbox_assinaturas`,
        docId: d.id,
        docData: d.data(),
      });
      extracted.forEach((x) => {
        pending.push(x);
        if (x.clienteId) clienteIds.push(x.clienteId);
      });
    });

    // 2) Compat: tvbox (se existir)
    const tvSnap = await db.collection('empresas').doc(empresaId).collection('tvbox').get();
    tvSnap.forEach((d) => {
      const extracted = extractRowsFromDoc({
        empresaId,
        collectionName: `empresas/${empresaId}/tvbox`,
        docId: d.id,
        docData: d.data(),
      });
      extracted.forEach((x) => {
        pending.push(x);
        if (x.clienteId) clienteIds.push(x.clienteId);
      });
    });

    if (pending.length === 0) continue;

    const clientesMap = await fetchClientesMap(db, empresaId, clienteIds);
    for (const p of pending) {
      const c = p.clienteId ? clientesMap.get(p.clienteId) : null;
      rows.push({
        empresaId: empresaId,
        source: p.sourceCollection,
        sourceDocId: p.sourceDocId,
        assinatura: p.assinatura,
        login: p.login,
        status: p.status,
        slot: p.slot,
        deviceId: p.deviceId,
        idAparelho: p.idAparelho,
        nds: p.nds,
        mac: p.mac,
        clienteId: p.clienteId,
        clienteNome: (c?.nome || p.clienteNomeFallback || '—').trim() || '—',
        clienteBairro: c?.bairro || '',
        clienteTelefone: c?.telefone || '',
        atualizadoEm: p.atualizadoEm,
      });
    }
  }

  // 3) Legado global (opcional): tvbox_assinaturas fora de empresas
  if (includeLegacy) {
    try {
      const legacySnap = await db.collection('tvbox_assinaturas').get();
      if (!legacySnap.empty) {
        const pending = [];
        const clienteIds = [];
        legacySnap.forEach((d) => {
          const extracted = extractRowsFromDoc({
            empresaId: null,
            collectionName: 'tvbox_assinaturas (LEGADO)',
            docId: d.id,
            docData: d.data(),
          });
          extracted.forEach((x) => {
            pending.push(x);
            if (x.clienteId) clienteIds.push(x.clienteId);
          });
        });

        // Para legado global, tentar enriquecer por clientes globais (se existir)
        const clientesIndex = new Map();
        try {
          const cliSnap = await db.collection('clientes').get();
          cliSnap.forEach((d) => {
            const c = d.data() || {};
            clientesIndex.set(d.id, {
              id: d.id,
              nome: normStr(c.nomeCompleto || c.nome) || '—',
              bairro: normStr(c.bairro || c.endereco?.bairro) || '',
              telefone: normStr(c.telefone || c.whatsapp || c.celular) || '',
            });
          });
        } catch {}

        for (const p of pending) {
          const c = p.clienteId ? clientesIndex.get(p.clienteId) : null;
          rows.push({
            empresaId: null,
            source: p.sourceCollection,
            sourceDocId: p.sourceDocId,
            assinatura: p.assinatura,
            login: p.login,
            status: p.status,
            slot: p.slot,
            deviceId: p.deviceId,
            idAparelho: p.idAparelho,
            nds: p.nds,
            mac: p.mac,
            clienteId: p.clienteId,
            clienteNome: (c?.nome || p.clienteNomeFallback || '—').trim() || '—',
            clienteBairro: c?.bairro || '',
            clienteTelefone: c?.telefone || '',
            atualizadoEm: p.atualizadoEm,
          });
        }
      }
    } catch (_) {
      // ignore (coleção pode não existir no projeto SaaS)
    }
  }

  rows.sort((a, b) => {
    const c1 = String(a.empresaId || '').localeCompare(String(b.empresaId || ''), 'pt-BR');
    if (c1 !== 0) return c1;
    const c2 = String(a.assinatura).localeCompare(String(b.assinatura), 'pt-BR');
    if (c2 !== 0) return c2;
    const c3 = String(a.clienteNome).localeCompare(String(b.clienteNome), 'pt-BR');
    if (c3 !== 0) return c3;
    return String(a.deviceId).localeCompare(String(b.deviceId), 'pt-BR');
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const outJson = path.join(process.cwd(), 'scripts', `relatorio-tvbox-deviceid-ap-aleatorio-${hoje}.json`);
  const outMd = path.join(process.cwd(), 'scripts', `relatorio-tvbox-deviceid-ap-aleatorio-${hoje}.md`);
  const outCsv = path.join(process.cwd(), 'scripts', `relatorio-tvbox-deviceid-ap-aleatorio-${hoje}.csv`);

  fs.writeFileSync(
    outJson,
    JSON.stringify({ gerado_em: new Date().toISOString(), total: rows.length, rows }, null, 2),
    'utf-8'
  );

  const header = [
    'empresaId',
    'source',
    'sourceDocId',
    'assinatura',
    'login',
    'status',
    'slot',
    'deviceId',
    'idAparelho',
    'nds',
    'mac',
    'clienteId',
    'clienteNome',
    'clienteBairro',
    'clienteTelefone',
    'atualizadoEm',
  ].join(';');
  const lines = [header].concat(
    rows.map((r) =>
      [
        r.empresaId,
        r.source,
        r.sourceDocId,
        r.assinatura,
        r.login || '',
        r.status || '',
        r.slot,
        r.deviceId,
        r.idAparelho || '',
        r.nds || '',
        r.mac || '',
        r.clienteId || '',
        r.clienteNome || '',
        r.clienteBairro || '',
        r.clienteTelefone || '',
        formatDateTime(r.atualizadoEm),
      ]
        .map(csvEscape)
        .join(';')
    )
  );
  fs.writeFileSync(outCsv, lines.join('\n') + '\n', 'utf-8');

  let md = '';
  md += `# Relatório — TV Box com deviceId AP... (aleatório) (${hoje})\n\n`;
  md += `Total de ocorrências: **${rows.length}**\n\n`;
  if (rows.length === 0) {
    md += `Nenhum deviceId no padrão AP... encontrado.\n`;
  } else {
    const byEmpresa = new Map();
    for (const r of rows) {
      if (!byEmpresa.has(r.empresaId)) byEmpresa.set(r.empresaId, []);
      byEmpresa.get(r.empresaId).push(r);
    }

    for (const [empresaId, arr] of byEmpresa.entries()) {
      md += `## Empresa: ${empresaId || 'LEGADO/sem-tenant'}\n\n`;
      for (const r of arr) {
        md += `- Assinatura: **${r.assinatura}** | login: **${r.login || '—'}** | slot: **${r.slot}**\n`;
        md += `  - Cliente: ${r.clienteNome}${r.clienteId ? ` (${r.clienteId})` : ''}\n`;
        md += `  - DeviceId: \`${r.deviceId}\` | idAparelho: \`${r.idAparelho || '—'}\` | NDS: \`${r.nds || '—'}\` | MAC: \`${r.mac || '—'}\`\n`;
        md += `  - Origem: ${r.source} (${r.sourceDocId}) | Status: ${r.status || '—'} | Atualizado: ${formatDateTime(r.atualizadoEm)}\n`;
      }
      md += `\n`;
    }
  }
  fs.writeFileSync(outMd, md, 'utf-8');

  console.log('✅ Relatório gerado.');
  console.log(`- Total: ${rows.length}`);
  console.log(`- CSV:  ${outCsv}`);
  console.log(`- JSON: ${outJson}`);
  console.log(`- MD:   ${outMd}`);
}

main().catch((err) => {
  console.error('❌ Erro ao gerar relatório:', err?.message || err);
  process.exitCode = 1;
});

