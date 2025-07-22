import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Filter, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { firebase } from '@/shared/lib/firebaseWrapper';

interface TVBoxFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  cliente_id: string;
  status_assinatura: string;
  sistema_finalizado: string;
}

export const TVBoxFilters = ({ onFilterChange }: TVBoxFiltersProps) => {
  const { user, employee } = useAuth();
  const { userId, loading: userLoading } = useUserContext();
  const [clientes, setClientes] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    cliente_id: 'all',
    status_assinatura: 'all',
    sistema_finalizado: 'all'
  });

  useEffect(() => {
    fetchClientes();
  }, [userId, userLoading]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const fetchClientes = async () => {
    if (!userId || userLoading) return;
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('user_id', userId)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      cliente_id: 'all',
      status_assinatura: 'all',
      sistema_finalizado: 'all'
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select
              value={filters.cliente_id}
              onValueChange={(value) => handleFilterChange('cliente_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status da Assinatura</Label>
            <Select
              value={filters.status_assinatura}
              onValueChange={(value) => handleFilterChange('status_assinatura', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sistema">Sistema Finalizado</Label>
            <Select
              value={filters.sistema_finalizado}
              onValueChange={(value) => handleFilterChange('sistema_finalizado', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};







