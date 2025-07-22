import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface RevenueData {
  date: string;
  total: number;
  tvbox: number;
  sky: number;
  combo: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  type?: 'line' | 'bar';
}

export const RevenueChart = ({ data, type = 'bar' }: RevenueChartProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`Data: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📈 Receita dos Últimos 30 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tvbox" stackId="a" fill="#8b5cf6" name="TV Box" />
              <Bar dataKey="sky" stackId="a" fill="#3b82f6" name="SKY" />
              <Bar dataKey="combo" stackId="a" fill="#10b981" name="Combo" />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} name="Total" />
              <Line type="monotone" dataKey="tvbox" stroke="#8b5cf6" strokeWidth={2} name="TV Box" />
              <Line type="monotone" dataKey="sky" stroke="#06b6d4" strokeWidth={2} name="SKY" />
              <Line type="monotone" dataKey="combo" stroke="#10b981" strokeWidth={2} name="Combo" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};







