import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Assinatura } from '@/types/subscription';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';


interface EquipamentosVinculadosProps {
  assinatura: Assinatura;
  isAdmin: boolean;
}

interface EquipamentoVinculadoDB {
  id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: string;
  clientes: {
    nome: string;
    endereco: string;
    bairro: string;
  } | null;
}

export const EquipamentosVinculados = ({ assinatura, isAdmin }: EquipamentosVinculadosProps) => {
  const { user, employee, isEmployee } = useAuth();
  const { toast } = useToast();
  const [equipamentos, setEquipamentos] = useState<EquipamentoVinculadoDB[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEquipamentos = useCallback(async () => {
    if (!user && !employee) return;
    
    setIsLoading(true);
    try {
      // Usar diretamente o ID da assinatura se disponível
      let assinaturaId = assinatura.id;
      
      // Se não temos o ID direto, buscar a assinatura
      if (!assinaturaId) {
        let assinaturaData = null;
        
        // Tentar buscar por código da assinatura primeiro
        if (assinatura.codigo_assinatura) {
          const { data, error } = await supabase
            .from('assinaturas')
            .select('id')
            .eq('codigo_assinatura', assinatura.codigo_assinatura)
            .eq('user_id', user?.id || employee?.ownerId)
            .single();
          
          if (!error && data) {
            assinaturaData = data;
          }
        }
        
        // Se não encontrou por código, tentar por CPF do cliente
        if (!assinaturaData && assinatura.cpf) {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('id')
            .eq('documento', assinatura.cpf)
            .eq('user_id', user?.id || employee?.ownerId)
            .single();
          
          if (!clienteError && clienteData) {
            const { data: assinaturaByClient, error: assinaturaByClientError } = await supabase
              .from('assinaturas')
              .select('id')
              .eq('cliente_id', clienteData.id)
              .eq('user_id', user?.id || employee?.ownerId)
              .single();
            
            if (!assinaturaByClientError && assinaturaByClient) {
              assinaturaData = assinaturaByClient;
            }
          }
        }
        
        // Se ainda não encontrou, tentar buscar por nome do cliente nas observações
        if (!assinaturaData && assinatura.nome_completo) {
          const { data: allAssinaturas, error: allAssinaturasError } = await supabase
            .from('assinaturas')
            .select('id, observacoes')
            .eq('user_id', user?.id || employee?.ownerId)
            .eq('status', 'ativa');
          
          if (!allAssinaturasError && allAssinaturas) {
            for (const ass of allAssinaturas) {
              if (ass.observacoes) {
                try {
                  const dadosObservacoes = JSON.parse(ass.observacoes);
                  if (dadosObservacoes.nome_completo === assinatura.nome_completo) {
                    assinaturaData = { id: ass.id };
                    break;
                  }
                } catch (e) {
                  // Continuar se não conseguir parsear
                }
              }
            }
          }
        }

        if (!assinaturaData) {
          console.log('Assinatura não encontrada no banco para:', assinatura);
          setEquipamentos([]);
          return;
        }
        
        assinaturaId = assinaturaData.id;
      }

      console.log('Buscando equipamentos para assinatura ID:', assinaturaId);

      // Buscar dados da assinatura para obter o cliente_id se existir
      const { data: assinaturaCompleta, error: assinaturaError } = await supabase
        .from('assinaturas')
        .select('cliente_id')
        .eq('id', assinaturaId)
        .single();

      if (assinaturaError) {
        console.error('Erro ao buscar dados da assinatura:', assinaturaError);
      }

      // Carregar equipamentos vinculados - buscar tanto por assinatura_id quanto por cliente_id
      let query = supabase
        .from('equipamentos')
        .select(`
          id,
          numero_nds,
          smart_card,
          status_aparelho,
          assinatura_id,
          cliente_atual_id,
          clientes!cliente_atual_id(
            nome,
            endereco,
            bairro
          )
        `)
        .eq('user_id', user?.id || employee?.ownerId);

      // Buscar equipamentos vinculados à assinatura OU ao cliente da assinatura
      if (assinaturaCompleta?.cliente_id) {
        query = query.or(`assinatura_id.eq.${assinaturaId},cliente_atual_id.eq.${assinaturaCompleta.cliente_id}`);
      } else {
        query = query.eq('assinatura_id', assinaturaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('Equipamentos encontrados:', data);
      setEquipamentos(data || []);
    } catch (error) {
      console.error('Error loading equipamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar equipamentos vinculados.",
        variant: "destructive",
      });
      setEquipamentos([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, employee, assinatura.id, assinatura.cpf, assinatura.codigo_assinatura, assinatura.nome_completo, toast]);

  useEffect(() => {
    loadEquipamentos();

    console.log('Configurando realtime listeners para assinatura:', assinatura.codigo_assinatura);

    // Configurar realtime para atualizar automaticamente quando equipamentos mudarem
    const channel = supabase
      .channel(`equipamentos-assinatura-${assinatura.id || assinatura.codigo_assinatura}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipamentos',
          filter: `user_id=eq.${user?.id || employee?.ownerId}`
        },
        (payload) => {
          console.log('🔄 Mudança detectada em equipamentos:', payload);
          
          // Verificar se a mudança é relevante para esta assinatura
          const record = payload.new || payload.old;
          const assinaturaIdRecord = (record as any)?.assinatura_id;
          
          // Se a mudança envolve nossa assinatura específica, atualizar
          if (assinaturaIdRecord === assinatura.id || assinaturaIdRecord === null) {
            console.log('✅ Mudança relevante para assinatura:', assinatura.codigo_assinatura);
            
            // Recarregar equipamentos imediatamente
            loadEquipamentos();
            
            // Notificar usuário sobre mudanças apenas para nossa assinatura
            if (payload.eventType === 'UPDATE') {
              toast({
                title: "🔄 Atualização automática",
                description: "Equipamentos atualizados automaticamente",
              });
            } else if (payload.eventType === 'INSERT' && assinaturaIdRecord === assinatura.id) {
              toast({
                title: "📱 Novo equipamento",
                description: "Equipamento vinculado automaticamente",
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assinaturas',
          filter: `user_id=eq.${user?.id || employee?.ownerId}`
        },
        (payload) => {
          console.log('Mudança detectada em assinaturas:', payload);
          
          // Recarregar quando assinaturas mudarem
          setTimeout(() => {
            loadEquipamentos();
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
          filter: `user_id=eq.${user?.id || employee?.ownerId}`
        },
        (payload) => {
          console.log('Mudança detectada em clientes:', payload);
          
          // Recarregar quando clientes mudarem
          setTimeout(() => {
            loadEquipamentos();
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('Status do canal realtime:', status);
      });

    return () => {
      console.log('Removendo canal realtime');
      firebase.removeChannel(channel);
    };
  }, [loadEquipamentos, user?.id, employee?.ownerId, assinatura.codigo_assinatura]);

  const extrairBairro = (endereco: string) => {
    if (endereco) {
      // Formato esperado: "rua, número, bairro, cidade, estado, cep"
      const partes = endereco.split(',').map(parte => parte.trim());
      // O bairro geralmente é a terceira parte (índice 2)
      return partes.length > 2 ? partes[2] : 'Não informado';
    }
    return 'Não informado';
  };

  return (
    <div>
      <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📱 Equipamentos Vinculados
          {equipamentos.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {equipamentos.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando equipamentos...</span>
          </div>
        ) : equipamentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📱</div>
            <p className="text-lg font-medium">Nenhum equipamento vinculado</p>
            <p className="text-sm">Esta assinatura ainda não possui equipamentos vinculados</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">NDS</TableHead>
                  <TableHead className="w-[120px]">Cartão</TableHead>
                  <TableHead className="w-[150px]">Cliente</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map((equipamento) => (
                  <TableRow key={equipamento.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {equipamento.numero_nds}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {equipamento.smart_card}
                    </TableCell>
                    <TableCell className="font-medium">
                      {equipamento.clientes ? equipamento.clientes.nome : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {equipamento.clientes ? equipamento.clientes.bairro || 'Não informado' : 'Não informado'}
                    </TableCell>
                    <TableCell>
                      {equipamento.status_aparelho === 'disponivel' && (
                        <Badge className="bg-green-500 hover:bg-green-600">🟢 Disponível</Badge>
                      )}
                      {equipamento.status_aparelho === 'alugado' && (
                        <Badge className="bg-blue-500 hover:bg-blue-600">🔵 Alugado</Badge>
                      )}
                      {equipamento.status_aparelho === 'problema' && (
                        <Badge className="bg-red-500 hover:bg-red-600">🔴 Problema</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};







