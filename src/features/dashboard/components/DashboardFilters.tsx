import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Calendar, Filter, Users, Settings } from 'lucide-react';

export interface DashboardFilters {
  dateRange: 'today' | 'week' | 'month' | 'custom';
  clientStatus: 'all' | 'active' | 'inactive' | 'overdue';
  equipmentStatus: 'all' | 'available' | 'defective' | 'rented';
}

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

export const DashboardFilters = ({ filters, onFiltersChange }: DashboardFiltersProps) => {
  const updateFilter = (key: keyof DashboardFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter size={20} />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtro de Data */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar size={16} />
              Período
            </label>
            <Select value={filters.dateRange} onValueChange={(value) => updateFilter('dateRange', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status do Cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users size={16} />
              Status do Cliente
            </label>
            <Select value={filters.clientStatus} onValueChange={(value) => updateFilter('clientStatus', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="overdue">Inadimplente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status do Equipamento */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Settings size={16} />
              Status do Equipamento
            </label>
            <Select value={filters.equipmentStatus} onValueChange={(value) => updateFilter('equipmentStatus', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="defective">Com Defeito</SelectItem>
                <SelectItem value="rented">Alugado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão de Reset */}
          <div className="space-y-2">
            <label className="text-sm font-medium opacity-0">Reset</label>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => onFiltersChange({
                dateRange: 'month',
                clientStatus: 'all',
                equipmentStatus: 'all'
              })}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};







