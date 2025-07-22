import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface LucroData {
  categoria: string;
  valor: number;
  cor: string;
}

export const LucroLiquidoChart = () => {
  const { userId, loading: userLoading } = useUserContext();
  const [data, setData] = useState<LucroData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lucroLiquido, setLucroLiquido] = useState(0);

  const loadLucroData = async () => {
    if (!userId || userLoading) return;

    try {
      setLoading(true);

      // Buscar todas as receitas (cobranças pagas)
      const { data: receitas } = await supabase
        .from('cobrancas')
        .select('valor_recebido')
        .eq('user_id', userId)
        .eq('status', 'pago');

      // Buscar todas as despesas (custos mensais pagos)
      const { data: despesas } = await supabase
        .from('custos_mensais')
        .select('valor')
        .eq('user_id', userId)
        .eq('status', 'pago');

      const totalReceitas = receitas?.reduce((sum, r) => sum + (r.valor_recebido || 0), 0) || 0;
      const totalDespesas = despesas?.reduce((sum, d) => sum + (d.valor || 0), 0) || 0;
      const lucroLiq = totalReceitas - totalDespesas;

      setLucroLiquido(lucroLiq);

      const chartData: LucroData[] = [
        {
          categoria: 'Receitas',
          valor: totalReceitas,
          cor: '#22c55e'
        },
        {
          categoria: 'Despesas',
          valor: totalDespesas,
          cor: '#ef4444'
        },
        {
          categoria: 'Lucro Líquido',
          valor: lucroLiq,
          cor: lucroLiq >= 0 ? '#3b82f6' : '#f59e0b'
        }
      ];

      setData(chartData);
    } catch (error) {
      console.error('Erro ao carregar dados de lucro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLucroData();
  }, [userId, userLoading]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Valor: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Análise Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Análise Financeira - Lucro Líquido
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            {lucroLiquido >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={lucroLiquido >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              Resultado: {formatCurrency(lucroLiquido)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="categoria" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="valor" 
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Receitas Totais</div>
            <div className="text-sm font-medium text-green-600">
              {formatCurrency(data.find(d => d.categoria === 'Receitas')?.valor || 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Despesas Totais</div>
            <div className="text-sm font-medium text-red-600">
              {formatCurrency(data.find(d => d.categoria === 'Despesas')?.valor || 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Lucro Líquido</div>
            <div className={`text-sm font-medium ${lucroLiquido >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(lucroLiquido)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};







