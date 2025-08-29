import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getDb } from '../../../config/database.config';
import { AuditFilters } from './AuditFilters';
import { AuditTable } from './AuditTable';
import { ExportButton } from './ExportButton';
import { AuditLog, AuditFilters as AuditFiltersType } from '../../types';

export function AuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditFiltersType>({});
  const [totalLogs, setTotalLogs] = useState(0);

  // Carregar logs iniciais
  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Carregar logs reais do Firestore (se existir coleção de auditoria)
      const db = getDb();
      const auditCollection = collection(db, 'audit_logs');
      
      try {
        const auditSnap = await getDocs(auditCollection);
        if (!auditSnap.empty) {
          const auditData: AuditLog[] = auditSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              timestamp: data.timestamp?.toDate?.() || new Date(),
              actorId: data.actorId || '',
              actorName: data.actorName || 'Usuário',
              actorRole: data.actorRole || '',
              module: data.module || '',
              action: data.action || '',
              targetType: data.targetType || '',
              targetId: data.targetId || '',
              details: data.details || '',
              ipAddress: data.ipAddress || '',
              userAgent: data.userAgent || '',
              diffBefore: data.diffBefore || null,
              diffAfter: data.diffAfter || null
            };
          });
          
          setLogs(auditData);
          setTotalLogs(auditData.length);
        } else {
          // Se não há logs de auditoria, mostrar lista vazia
          setLogs([]);
          setTotalLogs(0);
        }
      } catch (error) {
        console.log('Coleção de auditoria não encontrada, iniciando com lista vazia');
        setLogs([]);
        setTotalLogs(0);
      }
      
    } catch (error) {
      console.error('Erro ao carregar logs de auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // await AuditService.exportLogs(filters);
      console.log('Exportando logs com filtros:', filters);
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            margin: '0'
          }}>
            Auditoria e Histórico ({totalLogs})
          </h2>
          
          <ExportButton onExport={handleExport} />
        </div>

        {/* Filtros */}
        <AuditFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Tabela de logs */}
      <AuditTable
        logs={logs}
        loading={loading}
      />
    </div>
  );
}