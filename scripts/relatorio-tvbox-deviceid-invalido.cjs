#!/usr/bin/env node
/**
 * Relatório: assinaturas TV Box com device_id inválido (null, vazio, "A definir").
 *
 * Saída:
 * - CSV: assinatura;nome_cliente;bairro
 *
 * Requisitos:
 * - `service-account.json` na raiz do projeto (mesmo padrão dos outros scripts)
 *
 * Uso:
 * - node scripts/relatorio-tvbox-deviceid-invalido.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function normStr(v) {
  return (v ?? '').toString().trim();
}

function lower(v) {
  return normStr(v).toLowerCase();
}

function outField(v) {
  const s = normStr(v);
  return s.length ? s : 'Não informado';
}

function isInvalidDeviceId(v) {
  const s = lower(v);
  return s.length === 0 || s === 'a definir';
}

function parseAssinaturaNumero(assinatura) {
  const s = normStr(assinatura);
  const m = s.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service-account.json não encontrado na raiz.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath))
    });
  }

  const db = admin.firestore();

  // Index de clientes para nome/bairro
  const clientesIndex = new Map();
  const clientesSnap = await db.collection('clientes').get();
  clientesSnap.forEach((d) => {
    const c = d.data() || {};
    clientesIndex.set(d.id, {
      id: d.id,
      nome: normStr(c.nomeCompleto || c.nome),
      bairro: normStr(c.bairro || c.endereco?.bairro)
    });
  });

  const snap = await db.collection('tvbox_assinaturas').get();
  const rows = [];

  snap.forEach((docSnap) => {
    const t = docSnap.data() || {};
    const assinatura = normStr(t.assinatura || t.nome) || `Assinatura ${docSnap.id}`;

    const equipamentos = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    for (const eq of equipamentos) {
      const deviceId = normStr(eq?.deviceId ?? eq?.device_id);
      if (!isInvalidDeviceId(deviceId)) continue;

      const clienteId = normStr(eq?.cliente_id ?? eq?.clienteId) || null;
      const clienteNomeFallback = normStr(eq?.cliente_nome ?? eq?.cliente);

      const clienteNome =
        (clienteId && clientesIndex.has(clienteId) ? clientesIndex.get(clienteId)?.nome : '') ||
        clienteNomeFallback;

      const bairro =
        (clienteId && clientesIndex.has(clienteId) ? clientesIndex.get(clienteId)?.bairro : '') ||
        '';

      rows.push({
        assinatura: outField(assinatura),
        nome_cliente: outField(clienteNome),
        bairro: outField(bairro)
      });
    }
  });

  rows.sort((a, b) => {
    const an = parseAssinaturaNumero(a.assinatura);
    const bn = parseAssinaturaNumero(b.assinatura);

    if (an != null && bn != null && an !== bn) return an - bn;
    if (an != null && bn == null) return -1;
    if (an == null && bn != null) return 1;

    const c = a.assinatura.localeCompare(b.assinatura, 'pt-BR');
    if (c !== 0) return c;
    return a.nome_cliente.localeCompare(b.nome_cliente, 'pt-BR');
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const outCsv = path.join(process.cwd(), 'scripts', `relatorio-tvbox-deviceid-invalido-${hoje}.csv`);
  const outJson = path.join(process.cwd(), 'scripts', `relatorio-tvbox-deviceid-invalido-${hoje}.json`);

  const header = ['assinatura', 'nome_cliente', 'bairro'].join(';');
  const lines = [header].concat(
    rows.map((r) => [r.assinatura, r.nome_cliente, r.bairro].map(csvEscape).join(';'))
  );
  fs.writeFileSync(outCsv, lines.join('\n') + '\n', 'utf-8');
  fs.writeFileSync(outJson, JSON.stringify({ gerado_em: new Date().toISOString(), total: rows.length, rows }, null, 2), 'utf-8');

  console.log('✅ Relatório gerado.');
  console.log(`- Total: ${rows.length}`);
  console.log(`- CSV:  ${outCsv}`);
  console.log(`- JSON: ${outJson}`);
}

main().catch((err) => {
  console.error('❌ Erro ao gerar relatório:', err);
  process.exitCode = 1;
});

