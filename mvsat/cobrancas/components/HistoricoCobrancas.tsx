import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../../shared/components/ui/Button';
import { Card } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';
import { TableSkeleton } from '../../shared/components/LoadingStates';
import { 
  listarCobrancasArquivadas, 
  restaurarCobrancaArquivada,
  obterEstatisticasArquivo 
} from '../cobrancas.archive.functions';
import { useToastHelpers } from '../../shared/contexts/ToastContext';
import { listarCobrancasArquivadasPagina, obterEstatisticasArquivadasLeves } from '../services/cobrancasReadService';
import type { DocumentSnapshot } from 'firebase/firestore';

interface CobrancaArquivada {
  id: string;
  cliente_nome: string;
  bairro: string;
  tipo: string;
  valor: number;
  valorTotalPago: number;
  dataOriginalPagamento: any;
  arquivadoEm: any;
  formaPagamento?: string;
}

interface EstatisticasArquivo {
  totalArquivadas: number;
  valorTotalArquivado: number;
  valorRecebidoArquivado: number;
  porMes: Record<string, { count: number; valor: number }>;
}

export default function HistoricoCobrancas() {
  const { successQuick, error } = useToastHelpers();
  
  // Estados
  const [cobrancasArquivadas, setCobrancasArquivadas] = useState<CobrancaArquivada[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasArquivo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const cursors = useRef<Record<number, DocumentSnapshot | null>>({ 1: null });
  
  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const [pageResult, stats] = await Promise.all([
        listarCobrancasArquivadasPagina(pageSize, cursors.current[page] || null),
        obterEstatisticasArquivadasLeves()
      ]);
      
      setCobrancasArquivadas(pageResult.items as CobrancaArquivada[]);
      if (pageResult.lastDoc && cursors.current[page + 1] === undefined) {
        cursors.current[page + 1] = pageResult.lastDoc;
      }
      setTotal(stats.totalArquivadas);
      setEstatisticas(stats);
      
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      error('Erro ao carregar histórico de cobranças');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    setPage(1);
    cursors.current = { 1: null };
  }, [searchTerm, dataInicio, dataFim]);

  useEffect(() => {
    const timer = setTimeout(() => carregarDados(), 300);
    return () => clearTimeout(timer);
  }, [page, pageSize, searchTerm, dataInicio, dataFim]);
  
  // Restaurar cobrança
  const handleRestaurar = async (cobranca: CobrancaArquivada) => {
    if (!confirm(`Deseja restaurar a cobrança de ${cobranca.cliente_nome}?`)) {
      return;
    }
    
    try {
      await restaurarCobrancaArquivada(cobranca.id);
      successQuick('Cobrança restaurada com sucesso!');
      carregarDados(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao restaurar cobrança:', err);
      error('Erro ao restaurar cobrança');
    }
  };
  
  // Formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('pt-BR');
  };
  
  // Filtrar dados
  const dadosFiltrados = useMemo(() => {
    return cobrancasArquivadas.filter(cobranca => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (cobranca.cliente_nome || '').toLowerCase().includes(search) ||
               (cobranca.bairro || '').toLowerCase().includes(search);
      }
      return true;
    });
  }, [cobrancasArquivadas, searchTerm]);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          📚 Histórico de Cobranças
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Cobranças pagas arquivadas automaticamente para otimizar performance
        </p>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <Card style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
              {estatisticas.totalArquivadas}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Cobranças Arquivadas
            </div>
          </Card>
          
          <Card style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success-600)' }}>
              {formatCurrency(estatisticas.valorRecebidoArquivado)}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Valor Total Recebido
            </div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Buscar Cliente
            </label>
            <Input
              placeholder="Nome ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Data Início
            </label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Data Fim
            </label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setDataInicio('');
              setDataFim('');
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Tabela */}
      <Card variant="elevated" padding="none">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead style={{ backgroundColor: 'var(--color-gray-50)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Cliente
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Bairro
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Valor
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Pago
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Data Pagamento
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {loading ? 'Carregando...' : 'Nenhuma cobrança arquivada encontrada'}
                    </td>
                  </tr>
                ) : (
                  dadosFiltrados.map((cobranca) => (
                    <tr key={cobranca.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td style={{ padding: '16px', fontWeight: '500' }}>
                        {cobranca.cliente_nome}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        {cobranca.bairro}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        {cobranca.tipo}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: '500' }}>
                        {formatCurrency(cobranca.valor)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: 'var(--color-success-600)', fontWeight: '500' }}>
                        {formatCurrency(cobranca.valorTotalPago)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {formatDate(cobranca.dataOriginalPagamento)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestaurar(cobranca)}
                          style={{ fontSize: '12px' }}
                        >
                          Restaurar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {dadosFiltrados.length > 0 && (
        <div style={{ 
          marginTop: '16px', 
          textAlign: 'center', 
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total} cobranças arquivadas
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
            <span style={{ alignSelf: 'center' }}>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label="Itens por página">
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}