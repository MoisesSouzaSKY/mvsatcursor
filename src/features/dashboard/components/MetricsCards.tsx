import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Users, Tv, Satellite, Settings, Boxes, CheckCircle, AlertTriangle, MapPin, DollarSign } from 'lucide-react';

interface MetricsData {
  clientes: {
    total: number;
    tvbox: number;
    sky: number;
    combo: number;
  };
  equipamentos: {
    total: number;
    tvbox: number;
    sky: number;
    disponiveis: number;
    com_defeito: number;
    alugados: number;
  };
  financeiro: {
    total_mes: number;
    tvbox_mes: number;
    sky_mes: number;
    combo_mes: number;
  };
}

interface MetricsCardsProps {
  data: MetricsData;
}

export const MetricsCards = ({ data }: MetricsCardsProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Clientes Ativos */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Clientes Ativos</p>
              <p className="text-3xl font-bold text-blue-900">{data.clientes.total}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <Tv size={12} className="mr-1" />
                  {data.clientes.tvbox} TV Box
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Satellite size={12} className="mr-1" />
                  {data.clientes.sky} SKY
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Settings size={12} className="mr-1" />
                  {data.clientes.combo} Combo
                </Badge>
              </div>
            </div>
            <div className="p-3 bg-blue-500 rounded-full">
              <Users className="text-white" size={24} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipamentos */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Equipamentos</p>
              <p className="text-3xl font-bold text-purple-900">{data.equipamentos.total}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <Tv size={12} className="mr-1" />
                  {data.equipamentos.tvbox} TV Box
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Satellite size={12} className="mr-1" />
                  {data.equipamentos.sky} SKY
                </Badge>
              </div>
            </div>
            <div className="p-3 bg-purple-500 rounded-full">
              <Boxes className="text-white" size={24} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status dos Equipamentos */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Status Equipamentos</p>
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">{data.equipamentos.disponiveis} Disponíveis</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  <span className="text-sm">{data.equipamentos.com_defeito} Com Defeito</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" />
                  <span className="text-sm">{data.equipamentos.alugados} Alugados</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-green-500 rounded-full">
              <Settings className="text-white" size={24} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receita do Mês */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-sm font-medium">Receita do Mês</p>
              <p className="text-3xl font-bold text-emerald-900">{formatCurrency(data.financeiro.total_mes)}</p>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex justify-between text-xs">
                  <span>TV Box:</span>
                  <span className="font-medium">{formatCurrency(data.financeiro.tvbox_mes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>SKY:</span>
                  <span className="font-medium">{formatCurrency(data.financeiro.sky_mes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Combo:</span>
                  <span className="font-medium">{formatCurrency(data.financeiro.combo_mes)}</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-emerald-500 rounded-full">
              <DollarSign className="text-white" size={24} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};







