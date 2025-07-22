import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PaymentMethodData {
  method: string;
  count: number;
  amount: number;
}

interface PaymentMethodChartProps {
  data: PaymentMethodData[];
}

export const PaymentMethodChart = ({ data }: PaymentMethodChartProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`Método: ${label}`}</p>
          <p style={{ color: payload[0].color }}>
            {`Quantidade: ${payload[0].value} pagamentos`}
          </p>
          <p style={{ color: payload[1]?.color }}>
            {`Valor: ${formatCurrency(payload[1]?.value || 0)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Métodos de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="method" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Quantidade" />
            <Bar yAxisId="right" dataKey="amount" fill="#10b981" name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};







