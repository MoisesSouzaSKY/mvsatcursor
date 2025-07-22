export const calcularStatusFatura = (dataVencimento: string): 'vencido' | 'gerado' | 'em_dias' => {
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  
  // Resetar horários para comparação apenas de datas
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);
  
  const diffTime = vencimento.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'vencido';
  } else if (diffDays <= 5) {
    return 'gerado';
  } else {
    return 'em_dias';
  }
};

export const getStatusFaturaDisplay = (status: string) => {
  switch (status) {
    case 'vencido':
      return { label: 'VENCIDA', variant: 'destructive' as const };
    case 'gerado':
      return { label: 'GERADA', variant: 'secondary' as const };
    case 'em_dias':
      return { label: 'EM DIAS', variant: 'default' as const };
    case 'pago':
      return { label: 'PAGO', variant: 'outline' as const };
    default:
      return { label: status.toUpperCase(), variant: 'secondary' as const };
  }
};