/*
  Varredura de consistência entre coleções:
  - clientes
  - equipamentos
  - tvbox
  - tvbox_assinaturas
  - assinaturas (apenas para contagem)

  Saída: scripts/relatorio-varredura-consistencia.json
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('❌ service-account.json não encontrado na raiz do projeto');
    process.exit(1);
  }
  const sa = require(saPath);
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
}

initAdmin();
const db = admin.firestore();

async function carregarMap(colecao) {
  const snap = await db.collection(colecao).get();
  const map = new Map();
  snap.forEach((doc) => {
    const data = doc.data() || {};
    map.set(doc.id, { id: doc.id, ...data });
  });
  return map;
}

function normStr(value) {
  return (value || '').toString().trim().toLowerCase();
}

async function main() {
  const startedAt = Date.now();
  console.log('🔎 Iniciando varredura de consistência...');

  const [clientes, equipamentos, tvbox, tvboxAssin, assinaturas] = await Promise.all([
    carregarMap('clientes'),
    carregarMap('equipamentos'),
    carregarMap('tvbox'),
    carregarMap('tvbox_assinaturas'),
    carregarMap('assinaturas'),
  ]);

  // Índice por nome para conciliação quando não houver cliente_id
  const clientesPorNome = new Map();
  for (const [id, c] of clientes.entries()) {
    const nome = normStr(c.nomeCompleto || c.nome || '');
    if (nome) {
      clientesPorNome.set(nome, { id, nome: c.nomeCompleto || c.nome });
    }
  }

  const clientesSemVinculos = [];
  const clientesComEquipOuTv = [];

  const equipamentosSemCliente = [];
  const tvboxSemCliente = [];
  const tvboxAssinSemCliente = [];

  const equipComClienteInexistente = [];
  const tvboxComClienteInexistente = [];
  const tvboxAssinComClienteInexistente = [];

  // Equipamentos
  for (const [id, eq] of equipamentos.entries()) {
    const clienteId = eq.cliente_id || eq.clienteId || eq.cliente_atual_id || null;
    if (!clienteId) {
      equipamentosSemCliente.push({
        id,
        nds: eq.nds || eq.numero_nds || eq.numero_serie || '',
        smartcard: eq.smart_card || eq.cartao || eq.numero_cartao || '',
        cliente_nome: eq.cliente_nome || eq.cliente || '',
      });
    } else if (!clientes.has(clienteId)) {
      equipComClienteInexistente.push({
        id,
        cliente_id: clienteId,
        nds: eq.nds || eq.numero_nds || '',
        smartcard: eq.smart_card || eq.cartao || '',
      });
    } else {
      clientesComEquipOuTv.push(clienteId);
    }
  }

  // TV Box (coleção tvbox)
  for (const [id, t] of tvbox.entries()) {
    const clienteId = t.cliente_id || t.clienteId || null;
    if (!clienteId) {
      tvboxSemCliente.push({
        id,
        mac: t.mac || t.MAC || '',
        serial: t.serial || '',
        cliente_nome: t.cliente_nome || t.cliente || '',
      });
    } else if (!clientes.has(clienteId)) {
      tvboxComClienteInexistente.push({
        id,
        cliente_id: clienteId,
        mac: t.mac || t.MAC || '',
        serial: t.serial || '',
      });
    } else {
      clientesComEquipOuTv.push(clienteId);
    }
  }

  // tvbox_assinaturas (equipamentos dentro do array equipamentos[])
  for (const [id, t] of tvboxAssin.entries()) {
    const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    for (const e of eqs) {
      const clienteId = e?.cliente_id || e?.clienteId || null;
      const nome = normStr(e?.cliente_nome || e?.cliente || '');
      if (!clienteId && nome) {
        const by = clientesPorNome.get(nome);
        if (by) {
          clientesComEquipOuTv.push(by.id);
        } else {
          tvboxAssinSemCliente.push({ id, assinatura: t.assinatura || t.numero || '', equipamento: e });
        }
      } else if (!clienteId) {
        tvboxAssinSemCliente.push({ id, assinatura: t.assinatura || t.numero || '', equipamento: e });
      } else if (!clientes.has(clienteId)) {
        tvboxAssinComClienteInexistente.push({ id, cliente_id: clienteId, assinatura: t.assinatura || t.numero || '' });
      } else {
        clientesComEquipOuTv.push(clienteId);
      }
    }
  }

  // Clientes sem qualquer vínculo
  const setCom = new Set(clientesComEquipOuTv);
  for (const [id, c] of clientes.entries()) {
    if (!setCom.has(id)) {
      clientesSemVinculos.push({ id, nome: c.nomeCompleto || c.nome || '—', status: c.status || '' });
    }
  }

  // Destacar cliente específico
  const alvoNome = 'ronaldo da silva';
  let ronaldo = null;
  for (const [id, c] of clientes.entries()) {
    const nome = normStr(c.nomeCompleto || c.nome || '');
    if (nome.includes(alvoNome)) {
      ronaldo = {
        id,
        nome: c.nomeCompleto || c.nome,
        status: c.status || '',
        bairro: c.bairro || c.endereco?.bairro || '',
      };
      break;
    }
  }

  const resumo = {
    totais: {
      clientes: clientes.size,
      equipamentos: equipamentos.size,
      tvbox: tvbox.size,
      tvbox_assinaturas: tvboxAssin.size,
      assinaturas: assinaturas.size,
    },
    contagens: {
      clientes_sem_vinculos: clientesSemVinculos.length,
      equip_sem_cliente: equipamentosSemCliente.length,
      tvbox_sem_cliente: tvboxSemCliente.length,
      tvbox_assin_sem_cliente: tvboxAssinSemCliente.length,
      eq_com_cliente_inexistente: equipComClienteInexistente.length,
      tvbox_com_cliente_inexistente: tvboxComClienteInexistente.length,
      tvbox_assin_com_cliente_inexistente: tvboxAssinComClienteInexistente.length,
    },
  };

  const relatorio = {
    resumo,
    clientesSemVinculos,
    equipamentosSemCliente,
    tvboxSemCliente,
    tvboxAssinSemCliente,
    equipComClienteInexistente,
    tvboxComClienteInexistente,
    tvboxAssinComClienteInexistente,
    cliente_ronaldo: ronaldo,
  };

  const outPath = path.join(process.cwd(), 'scripts', 'relatorio-varredura-consistencia.json');
  fs.writeFileSync(outPath, JSON.stringify(relatorio, null, 2), 'utf8');
  console.log('✅ Relatório gerado em:', outPath);
  console.log('⏱️ Concluído em', ((Date.now() - startedAt) / 1000).toFixed(1), 's');
}

main().catch((err) => {
  console.error('❌ Erro na varredura:', err);
  process.exit(1);
});


