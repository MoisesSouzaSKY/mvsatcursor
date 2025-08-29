import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { listarClientes } from '../../clientes/clientes.functions';
import ConsolidatedFinancialCard from '../../dashboard/components/ConsolidatedFinancialCard/ConsolidatedFinancialCard';

// CSS para animações
const styles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Adicionar estilos ao documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

interface DashboardStats {
  // Clientes
  clientesSoTvBox: number;        // Clientes que têm apenas TV Box
  clientesCombo: number;          // Clientes que têm TV Box + Sky
  clientesSoSky: number;          // Clientes que têm apenas Sky (equipamentos de assinatura)
  
  // Assinaturas (Sky)
  assinaturasAtivas: number;      // Total de assinaturas Sky ativas
  equipamentosVinculados: number; // Equipamentos Sky alugados (com base na coleção de equipamentos)
  equipamentosDisponiveis: number; // Equipamentos Sky disponíveis
  equipamentosComProblema: number; // Equipamentos Sky com problema
  
  // TV Box
  tvBoxAssinaturasAtivas: number;  // Assinaturas TV Box ativas
  tvBoxAparelhosAlugados: number;  // Aparelhos TV Box alugados
  tvBoxAparelhosDisponiveis: number; // Aparelhos TV Box disponíveis
  tvBoxAparelhosComProblema: number; // Aparelhos TV Box com problema
  
  // Cobranças
  recebidoMesAtual: number;
  faltaReceber: number;
  vencimentoAtraso: number;
  
  // Despesas
  custoMensalTotal: number;
  despesasIPTV: number;
  despesasAssinaturas: number;
  despesasOutros: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Carregando dados reais do Dashboard...');
      
      // Carregar dados reais de todas as abas
      const [
        clientesData,
        tvboxData,
        assinaturasData,
        equipamentosData,
        despesasData,
        cobrancasData
      ] = await Promise.all([
        // Clientes
        listarClientes(),
        // TV Box
        getDocs(collection(getDb(), 'tvbox_assinaturas')),
        // Assinaturas (Sky)
        getDocs(collection(getDb(), 'assinaturas')),
        // Equipamentos
        getDocs(collection(getDb(), 'equipamentos')),
        // Despesas
        getDocs(collection(getDb(), 'despesas')),
        // Cobranças
        getDocs(collection(getDb(), 'cobrancas'))
      ]);

      // Processar dados dos clientes
      const clientes = clientesData as any[];
      console.log(`📊 ${clientes.length} clientes encontrados`);

      // Processar dados do TV Box
      const tvboxes = tvboxData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`📺 ${tvboxes.length} assinaturas TV Box encontradas`);

      // Processar dados das assinaturas Sky
      const assinaturas = assinaturasData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`📡 ${assinaturas.length} assinaturas Sky encontradas`);

      // Processar dados dos equipamentos
      const equipamentos = equipamentosData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`⚙️ ${equipamentos.length} equipamentos encontrados`);

      // Processar dados das despesas
      const despesas = despesasData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      const despesasMesAtual = despesas.filter(d => {
        const dataDespesa = d.data?.toDate ? d.data.toDate() : new Date(d.data);
        return dataDespesa.getMonth() === mesAtual && dataDespesa.getFullYear() === anoAtual;
      });
      console.log(`💸 ${despesas.length} despesas encontradas (${despesasMesAtual.length} no mês atual)`);

      // Processar dados das cobranças
      const cobrancas = cobrancasData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const cobrancasMesAtual = cobrancas.filter(c => {
        const dataCobranca = c.dataVencimento?.toDate ? c.dataVencimento.toDate() : new Date(c.dataVencimento);
        return dataCobranca.getMonth() === mesAtual && dataCobranca.getFullYear() === anoAtual;
      });
      console.log(`💰 ${cobrancas.length} cobranças encontradas (${cobrancasMesAtual.length} no mês atual)`);

      // Calcular estatísticas reais
      
      // CLIENTES - Classificação conforme regras (contar apenas clientes ativos e deduplicar por ID)
      let clientesSoTvBox = 0;
      let clientesCombo = 0;
      let clientesSoSky = 0;

      const clientesAtivos = clientes.filter((c: any) => c.status === 'ativo');

      clientesAtivos.forEach((cliente: any) => {
        // TV Box: cliente aparece na aba TV Box (vínculo em equipamentos dentro dos documentos de TV Box)
        const temTvBox = tvboxes.some((tvbox: any) => 
          tvbox.equipamentos?.some((eq: any) => 
            eq.cliente_id === cliente.id || eq.cliente_nome === cliente.nome
          )
        );

        // SKY: cliente possui equipamento alugado na aba Equipamentos
        // Consideramos duas fontes de verdade:
        // 1) Coleção `equipamentos` com vínculo ao cliente e tipo/categoria SKY
        // 2) Equipamentos dentro de documentos de `assinaturas` vinculados ao cliente
        const temSkyPorColecaoEquipamentos = equipamentos.some((equipamento: any) => {
          const vinculo = (
            equipamento.cliente_id === cliente.id || 
            equipamento.cliente_atual_id === cliente.id ||
            equipamento.cliente_nome === cliente.nome
          );
          const status = String(equipamento.status || equipamento.status_aparelho || '').toLowerCase();
          const estaAlugado = status === 'alugado' || (!!(equipamento.cliente_id || equipamento.cliente_atual_id) && status !== 'disponivel');
          const categoria = (equipamento.categoria || '').toLowerCase();
          const tipo = (equipamento.tipo || '').toLowerCase();
          const eSky = tipo === 'sky' || categoria === 'assinatura' || categoria === 'sky' || (tipo !== 'tvbox' && categoria !== 'tvbox');
          return vinculo && estaAlugado && eSky;
        });

        const temSkyPorAssinaturas = assinaturas.some((assinatura: any) => {
          return assinatura.equipamentos?.some((eq: any) => {
            const vinculo = eq.cliente_id === cliente.id || eq.cliente_nome === cliente.nome;
            const nome = (eq.cliente_nome || '').toLowerCase();
            const vinculado = !!eq.cliente_id || (nome && nome !== 'disponível' && nome !== 'disponivel');
            return vinculo && vinculado;
          });
        });

        const temSky = temSkyPorColecaoEquipamentos || temSkyPorAssinaturas;

        // Classificação exclusiva por cliente (deduplicado por ID)
        if (temTvBox && temSky) {
          clientesCombo++;
          console.log(`🔄 Cliente Combo: ${cliente.nome} (TV Box + Sky)`);
        } else if (temTvBox) {
          clientesSoTvBox++;
          console.log(`📺 Cliente só TV Box: ${cliente.nome}`);
        } else if (temSky) {
          clientesSoSky++;
          console.log(`📡 Cliente só Sky: ${cliente.nome}`);
        }
      });

      console.log(`📊 Distribuição de clientes: ${clientesSoTvBox} só TV Box, ${clientesCombo} Combo, ${clientesSoSky} só Sky`);

      // TV BOX - Estatísticas detalhadas
      const tvBoxAssinaturasAtivas = tvboxes.filter(t => t.status === 'ativa').length;
      const tvBoxAparelhosAlugados = tvboxes.reduce((total, tvbox) => {
        return total + (tvbox.equipamentos?.filter((eq: any) => 
          eq.cliente_nome && eq.cliente_nome !== 'Disponível' && eq.cliente_id
        ).length || 0);
      }, 0);
      const tvBoxAparelhosDisponiveis = tvboxes.reduce((total, tvbox) => {
        return total + (tvbox.equipamentos?.filter((eq: any) => 
          !eq.cliente_nome || eq.cliente_nome === 'Disponível' || !eq.cliente_id
        ).length || 0);
      }, 0);
      const tvBoxAparelhosComProblema = equipamentos.filter((eq: any) => 
        (eq.tipo === 'tvbox' || eq.categoria === 'tvbox') && 
        (String(eq.status || eq.status_aparelho).toLowerCase() === 'problema' || String(eq.status || eq.status_aparelho).toLowerCase() === 'defeito')
      ).length;

      // ASSINATURAS SKY - Estatísticas detalhadas
      const assinaturasAtivas = assinaturas.filter(a => a.status === 'ativa').length;

      // Contabilizar equipamentos (Geral) com base na coleção `equipamentos`
      const getStatus = (eq: any) => String(eq.status || eq.status_aparelho || '').toLowerCase();
      const equipamentosAlugados = equipamentos.filter((eq: any) => {
        const status = getStatus(eq);
        return status === 'alugado' || (!!(eq.cliente_id || eq.cliente_atual_id) && status !== 'disponivel' && status !== 'problema' && status !== 'defeito');
      }).length;

      const equipamentosDisponiveis = equipamentos.filter((eq: any) => {
        const status = getStatus(eq);
        return status === 'disponivel' || (!eq.cliente_id && !eq.cliente_atual_id && !status);
      }).length;

      const equipamentosComProblema = equipamentos.filter((eq: any) => {
        const status = getStatus(eq);
        return status === 'problema' || status === 'defeito';
      }).length;

      console.log(`📺 TV Box: ${tvBoxAssinaturasAtivas} ativas, ${tvBoxAparelhosAlugados} alugados, ${tvBoxAparelhosDisponiveis} disponíveis`);
      console.log(`📡 Sky: ${assinaturasAtivas} ativas, ${equipamentosAlugados} alugados, ${equipamentosDisponiveis} disponíveis`);

      // COBRANÇAS - Cálculos mais precisos
      const hoje = new Date();
      
      const recebidoMesAtual = cobrancas
        .filter(c => {
          const dataPagamento = c.dataPagamento?.toDate ? c.dataPagamento.toDate() : 
                               c.data_pagamento?.toDate ? c.data_pagamento.toDate() : null;
          if (!dataPagamento) return false;
          return dataPagamento.getMonth() === mesAtual && 
                 dataPagamento.getFullYear() === anoAtual && 
                 (c.status === 'pago' || c.status === 'recebido');
        })
        .reduce((total, c) => total + (c.valor || 0), 0);
        
      const faltaReceber = cobrancas
        .filter(c => 
          (c.status === 'pendente' || c.status === 'aberto') &&
          c.dataVencimento?.toDate && 
          c.dataVencimento.toDate().getMonth() === mesAtual &&
          c.dataVencimento.toDate().getFullYear() === anoAtual
        )
        .reduce((total, c) => total + (c.valor || 0), 0);
        
      const vencimentoAtraso = cobrancas
        .filter(c => {
          const vencimento = c.dataVencimento?.toDate ? c.dataVencimento.toDate() : 
                           c.data_vencimento?.toDate ? c.data_vencimento.toDate() : null;
          if (!vencimento) return false;
          return vencimento < hoje && 
                 (c.status === 'pendente' || c.status === 'aberto' || c.status === 'vencido');
        })
        .reduce((total, c) => total + (c.valor || 0), 0);

      console.log(`💰 Cobranças: R$ ${recebidoMesAtual.toFixed(2)} recebido, R$ ${faltaReceber.toFixed(2)} a receber, R$ ${vencimentoAtraso.toFixed(2)} em atraso`);

      // DESPESAS - Cálculos por categoria
      const custoMensalTotal = despesasMesAtual.reduce((total, d) => total + (d.valor || 0), 0);
      
      const despesasIPTV = despesasMesAtual
        .filter(d => 
          d.categoria === 'IPTV' || 
          d.categoria === 'iptv' ||
          d.descricao?.toLowerCase().includes('iptv') ||
          d.tipo?.toLowerCase().includes('iptv')
        )
        .reduce((total, d) => total + (d.valor || 0), 0);
        
      const despesasAssinaturas = despesasMesAtual
        .filter(d => 
          d.categoria === 'Assinaturas' || 
          d.categoria === 'assinaturas' ||
          d.categoria === 'Sky' ||
          d.categoria === 'sky' ||
          d.descricao?.toLowerCase().includes('assinatura') ||
          d.descricao?.toLowerCase().includes('sky')
        )
        .reduce((total, d) => total + (d.valor || 0), 0);
        
      const despesasOutros = despesasMesAtual
        .filter(d => {
          const categoria = d.categoria?.toLowerCase() || '';
          const descricao = d.descricao?.toLowerCase() || '';
          return !categoria.includes('iptv') && 
                 !categoria.includes('assinatura') && 
                 !categoria.includes('sky') &&
                 !descricao.includes('iptv') &&
                 !descricao.includes('assinatura') &&
                 !descricao.includes('sky');
        })
        .reduce((total, d) => total + (d.valor || 0), 0);

      console.log(`💸 Despesas: R$ ${custoMensalTotal.toFixed(2)} total (IPTV: R$ ${despesasIPTV.toFixed(2)}, Assinaturas: R$ ${despesasAssinaturas.toFixed(2)}, Outros: R$ ${despesasOutros.toFixed(2)})`);

      const realStats: DashboardStats = {
        // Clientes
        clientesSoTvBox,
        clientesCombo,
        clientesSoSky,
        
        // Assinaturas (Sky)
        assinaturasAtivas,
        equipamentosVinculados: equipamentosAlugados,
        equipamentosDisponiveis,
        equipamentosComProblema,
        
        // TV Box
        tvBoxAssinaturasAtivas,
        tvBoxAparelhosAlugados,
        tvBoxAparelhosDisponiveis,
        tvBoxAparelhosComProblema,
        
        // Cobranças
        recebidoMesAtual,
        faltaReceber,
        vencimentoAtraso,
        
        // Despesas
        custoMensalTotal,
        despesasIPTV,
        despesasAssinaturas,
        despesasOutros,
      };

      console.log('📊 Estatísticas calculadas:', realStats);
      setStats(realStats);
    } catch (err) {
      console.error('❌ Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (loading || !stats) {
    return (
      <div style={{ padding: '20px', width: '100%', maxWidth: 'none' }}>
        {/* Banner Informativo */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
          borderRadius: '16px',
          padding: '40px 32px',
          marginBottom: '32px',
          width: '100%',
          minHeight: '160px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '56px',
            opacity: '0.25',
            color: 'white'
          }}>
            📊
          </div>
          
          <div style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            width: '120px',
            height: '120px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(30px)'
          }} />
          
          <div style={{
            textAlign: 'center',
            paddingLeft: '100px',
            paddingRight: '40px',
            position: 'relative',
            zIndex: 1
          }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 16px 0',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '2px'
            }}>
              DASHBOARD
            </h1>
            <p style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: '400',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Visão geral completa do sistema MVSAT com métricas e indicadores em tempo real
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: 'none' }}>
      {/* Banner Informativo */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
        borderRadius: '16px',
        padding: '40px 32px',
        marginBottom: '32px',
        width: '100%',
        minHeight: '160px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          position: 'absolute',
          left: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '56px',
          opacity: '0.25',
          color: 'white'
        }}>
          📊
        </div>
        
        <div style={{
          position: 'absolute',
          right: '-20px',
          top: '-20px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />
        
        <div style={{
          textAlign: 'center',
          paddingLeft: '100px',
          paddingRight: '40px',
          position: 'relative',
          zIndex: 1
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            letterSpacing: '2px'
          }}>
            DASHBOARD
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.95)',
            fontWeight: '400',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Visão geral completa do sistema MVSAT com métricas e indicadores em tempo real
          </p>
        </div>
      </div>

      {/* Cards principais (3 primeiros) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Distribuição de Clientes */}
        <ChartCard
          title="Distribuição de Clientes"
          data={[
            { label: 'Só TV Box', value: stats.clientesSoTvBox, color: '#3b82f6' },
            { label: 'Combo', value: stats.clientesCombo, color: '#10b981' },
            { label: 'Só Sky', value: stats.clientesSoSky, color: '#f59e0b' }
          ]}
        />

        {/* Equipamentos TV Box (inclui Assinaturas Ativas) */}
        <ChartCard
          title="Equipamentos TV Box"
          data={[
            { label: 'Alugados', value: stats.tvBoxAparelhosAlugados, color: '#10b981' },
            { label: 'Disponíveis', value: stats.tvBoxAparelhosDisponiveis, color: '#6b7280' },
            { label: 'Com Problema', value: stats.tvBoxAparelhosComProblema, color: '#ef4444' },
            { label: 'Assinaturas Ativas', value: stats.tvBoxAssinaturasAtivas, color: '#059669' }
          ]}
        />

        {/* Equipamentos Sky */}
        <ChartCard
          title="Equipamentos Sky"
          data={[
            { label: 'Alugados', value: stats.equipamentosVinculados, color: '#10b981' },
            { label: 'Disponíveis', value: stats.equipamentosDisponiveis, color: '#6b7280' },
            { label: 'Com Problema', value: stats.equipamentosComProblema, color: '#ef4444' }
          ]}
        />
      </div>

      {/* Card Financeiro Consolidado - Ocupa toda a largura */}
      <div style={{ marginBottom: '32px' }}>
        <ConsolidatedFinancialCard />
      </div>

      {/* (Cards de resumo removidos em favor dos gráficos de pizza acima) */}

      {/* Resumo Geral removido para simplificar a visualização por gráficos de pizza */}
    </div>
  );
}



interface StatCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string;
    color: string;
  }>;
}

function StatCard({ title, items }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9',
      height: 'fit-content'
    }}>
      <h3 style={{ 
        margin: '0 0 20px 0', 
        fontSize: '1.125rem', 
        fontWeight: '700',
        color: '#111827'
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {items.map((item, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: index < items.length - 1 ? '1px solid #f1f5f9' : 'none'
          }}>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {item.label}
            </span>
            <span style={{ 
              fontSize: '1.125rem', 
              fontWeight: '700',
              color: item.color
            }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
}

function ChartCard({ title, data }: ChartCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9',
      height: 'fit-content',
      minHeight: '360px'
    }}>
      <h3 style={{ 
        margin: '0 0 20px 0', 
        fontSize: '1.125rem', 
        fontWeight: '700',
        color: '#111827'
      }}>
        {title}
      </h3>
      
      {/* Gráfico de Pizza SVG */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <PieChart data={data} size={160} />
      </div>
      
      {/* Legenda */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: item.color
                }} />
                <span style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {item.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {item.value}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#9ca3af'
                }}>
                  ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FinanceiroChartCardProps {
  recebidoMesAtual: number;
  faltaReceber: number;
  vencimentoAtraso: number;
  despesasIPTV: number;
  despesasAssinaturas: number;
  despesasOutros: number;
}

function FinanceiroChartCard({
  recebidoMesAtual,
  faltaReceber,
  vencimentoAtraso,
  despesasIPTV,
  despesasAssinaturas,
  despesasOutros
}: FinanceiroChartCardProps) {
  const cards = [
    {
      title: 'Financeiro - Cobranças',
      data: [
        { label: 'Recebido', value: Math.round(recebidoMesAtual), color: '#059669' },
        { label: 'A receber', value: Math.round(faltaReceber), color: '#f59e0b' },
        { label: 'Em atraso', value: Math.round(vencimentoAtraso), color: '#ef4444' }
      ]
    },
    {
      title: 'Financeiro - Despesas',
      data: [
        { label: 'IPTV', value: Math.round(despesasIPTV), color: '#8b5cf6' },
        { label: 'Assinaturas', value: Math.round(despesasAssinaturas), color: '#ec4899' },
        { label: 'Outros', value: Math.round(despesasOutros), color: '#6b7280' }
      ]
    }
  ];

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9'
    }}>
      <h3 style={{ 
        margin: '0 0 20px 0', 
        fontSize: '1.125rem', 
        fontWeight: '700',
        color: '#111827'
      }}>
        📊 Financeiro
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {cards.map((c, idx) => (
          <ChartCard key={idx} title={c.title} data={c.data} />
        ))}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  size: number;
}

function PieChart({ data, size }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 10;
  const center = size / 2;
  
  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="#f3f4f6"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fill="#6b7280"
        >
          Sem dados
        </text>
      </svg>
    );
  }
  
  let currentAngle = -90; // Começar do topo
  
  return (
    <svg width={size} height={size}>
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const angle = (item.value / total) * 360;
        
        if (item.value === 0) return null;
        
        const startAngle = (currentAngle * Math.PI) / 180;
        const endAngle = ((currentAngle + angle) * Math.PI) / 180;
        
        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(endAngle);
        const y2 = center + radius * Math.sin(endAngle);
        
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        const pathData = [
          `M ${center} ${center}`,
          `L ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ');
        
        currentAngle += angle;
        
        return (
          <g key={index}>
            <path
              d={pathData}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
            />
            {percentage > 8 && (
              <text
                x={center + (radius * 0.7) * Math.cos((startAngle + endAngle) / 2)}
                y={center + (radius * 0.7) * Math.sin((startAngle + endAngle) / 2)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fontWeight="600"
                fill="white"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {Math.round(percentage)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}