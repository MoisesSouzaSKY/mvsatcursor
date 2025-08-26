import React, { useState, useEffect } from 'react';
import { Button } from '../../shared/components/ui/Button';
import { Card } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';
import { Select } from '../../shared/components/ui/Select';

// Tipos para as cobranças
interface Cobranca {
  id: string;
  cliente: string;
  bairro: string;
  tipo: string;
  vencimento: string;
  valor: number;
  pagamento?: string;
  status: 'em_atraso' | 'pendente' | 'paga';
  observacao?: string;
}

// Dados mockados para demonstração
const mockCobrancas: Cobranca[] = [
  {
    id: '1',
    cliente: 'Andreza',
    bairro: 'Jurunas',
    tipo: 'SKY',
    vencimento: '05/08/2025',
    valor: 120.00,
    status: 'em_atraso'
  },
  {
    id: '2',
    cliente: 'Maria Angelina',
    bairro: 'Tenone',
    tipo: 'SKY',
    vencimento: '10/08/2025',
    valor: 130.00,
    status: 'em_atraso'
  },
  {
    id: '3',
    cliente: 'Laise elane',
    bairro: 'Rios Pará',
    tipo: 'SKY',
    vencimento: '15/08/2025',
    valor: 100.00,
    status: 'em_atraso'
  },
  {
    id: '4',
    cliente: 'Negão',
    bairro: 'Gordim',
    tipo: 'SKY',
    vencimento: '20/08/2025',
    valor: 110.00,
    status: 'em_atraso'
  },
  {
    id: '5',
    cliente: 'Arlete',
    bairro: 'Mosqueiro',
    tipo: 'SKY',
    vencimento: '25/08/2025',
    valor: 70.00,
    status: 'em_atraso'
  },
  {
    id: '6',
    cliente: 'Paulo Roberto',
    bairro: 'Tapanã',
    tipo: 'SKY',
    vencimento: '30/08/2025',
    valor: 120.00,
    status: 'em_atraso'
  },
  {
    id: '7',
    cliente: 'Lauro Lima',
    bairro: 'Parque Verde',
    tipo: 'SKY',
    vencimento: '05/09/2025',
    valor: 130.00,
    status: 'em_atraso'
  },
  {
    id: '8',
    cliente: 'Celso',
    bairro: 'Telegrafo',
    tipo: 'SKY',
    vencimento: '10/09/2025',
    valor: 100.00,
    status: 'em_atraso'
  },
  {
    id: '9',
    cliente: 'Glauber',
    bairro: 'Cabanagem',
    tipo: 'SKY',
    vencimento: '15/09/2025',
    valor: 110.00,
    status: 'em_atraso'
  },
  {
    id: '10',
    cliente: 'Lucivaldo Souza',
    bairro: 'Jurunas',
    tipo: 'TV Box',
    vencimento: '20/09/2025',
    valor: 80.00,
    status: 'em_atraso'
  }
];

export default function CobrancasPage() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>(mockCobrancas);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('data');

  // Estatísticas calculadas
  const totalRecebido = 69919.00;
  const emAtraso = 5690.00;
  const pendentes = 39330.00;
  const taxaRecebimento = 92.5;

  // Função para formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter o status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      em_atraso: { text: 'Em Atraso', color: 'var(--color-error-600)' },
      pendente: { text: 'Pendente', color: 'var(--color-warning-500)' },
      paga: { text: 'Paga', color: 'var(--color-success-500)' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.em_atraso;

    return (
      <span style={{
        backgroundColor: config.color,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {config.text}
      </span>
    );
  };

  // Função para filtrar cobranças
  const filteredCobrancas = cobrancas.filter(cobranca =>
    cobranca.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cobranca.bairro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: 'var(--color-primary-50)',
      minHeight: '100vh'
    }}>
      {/* Header com título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '30px', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)' 
        }}>
          Cobranças
        </h1>
      </div>

      {/* Cards de resumo */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px', 
        marginBottom: '32px' 
      }}>
        {/* Total Recebido */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Total Recebido
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success-500)' }}>
                {formatCurrency(totalRecebido)}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-success-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'var(--color-success-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Em Atraso */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Em Atraso
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-error-600)' }}>
                {formatCurrency(emAtraso)}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-error-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'var(--color-error-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Pendentes */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Pendentes
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-warning-500)' }}>
                {formatCurrency(pendentes)}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-warning-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'var(--color-warning-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Taxa de Recebimento */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Taxa de Recebimento</p>
                              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                  {taxaRecebimento}%
                </p>
            </div>
                          <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                              <svg style={{ width: '20px', height: '20px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Botões de ação */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <Button variant="outline" icon={
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        }>
          Gerar Cobranças em Massa
        </Button>
        <Button variant="primary" icon={
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }>
          Gerar Cobranças
        </Button>
      </div>

      {/* Barra de busca e filtros */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Buscar por cliente ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" icon={
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
          }>
            Ordenação: Data
          </Button>
          <Button variant="outline" icon={
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }>
            Exportar Cobranças
          </Button>
        </div>
      </div>

      {/* Tabela de cobranças */}
      <Card variant="elevated" padding="none">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: 'var(--color-gray-50)' }}>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cliente
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bairro
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tipo
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vencimento
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Valor
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pagamento
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Observação
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'white' }}>
              {filteredCobrancas.map((cobranca) => (
                <tr key={cobranca.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {cobranca.cliente}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca.bairro}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca.tipo}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca.vencimento}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {formatCurrency(cobranca.valor)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca.pagamento || '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {getStatusBadge(cobranca.status)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca.observacao || '-'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ color: 'var(--color-primary-600)', padding: '4px', borderRadius: '4px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button style={{ color: 'var(--color-success-500)', padding: '4px', borderRadius: '4px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </button>
                      <button style={{ color: 'var(--color-error-600)', padding: '4px', borderRadius: '4px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


