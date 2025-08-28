export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
};

export const formatDate = (date: any): string => {
  if (!date) return '—';
  
  let dateObj: Date;
  
  if (date.toDate) {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    return '—';
  }
  
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Belem',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dateObj);
  } catch {
    return '—';
  }
};

export const formatDateRelative = (date: any): string => {
  if (!date) return '—';
  
  let dateObj: Date;
  
  if (date.toDate) {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    return '—';
  }
  
  const hoje = new Date();
  const diffTime = dateObj.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Hoje';
  } else if (diffDays === 1) {
    return 'Amanhã';
  } else if (diffDays === -1) {
    return 'Ontem';
  } else if (diffDays > 0) {
    return `Em ${diffDays} dias`;
  } else {
    return `${Math.abs(diffDays)} dias atrás`;
  }
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return formatNumber(value);
};

export const getStatusColor = (status: string): { bg: string; text: string } => {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
    case 'pago':
      return { bg: '#d1fae5', text: '#059669' };
    case 'pendente':
    case 'aberto':
      return { bg: '#fef3c7', text: '#d97706' };
    case 'vencido':
      return { bg: '#fee2e2', text: '#dc2626' };
    case 'cancelado':
      return { bg: '#f3f4f6', text: '#6b7280' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
};

export const getDaysUntilDue = (dueDate: any): number => {
  if (!dueDate) return 0;
  
  let dateObj: Date;
  
  if (dueDate.toDate) {
    dateObj = dueDate.toDate();
  } else if (dueDate instanceof Date) {
    dateObj = dueDate;
  } else if (typeof dueDate === 'string') {
    dateObj = new Date(dueDate);
  } else {
    return 0;
  }
  
  const hoje = new Date();
  const diffTime = dateObj.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};