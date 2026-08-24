type LogData = Record<string, any> | undefined;

function compactData(data: LogData): string {
  if (!data) return '';
  try {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null) continue;
      const sv = typeof v === 'string' ? v.trim() : String(v);
      if (!sv) continue;
      // evita flood gigante
      parts.push(`${k}=${sv.length > 60 ? `${sv.slice(0, 57)}...` : sv}`);
    }
    return parts.length ? ` (${parts.join(' ')})` : '';
  } catch {
    return '';
  }
}

function ts(): string {
  try {
    return new Date().toLocaleTimeString('pt-BR', { hour12: false });
  } catch {
    return '';
  }
}

export function uiLog(action: string, data?: Record<string, any>) {
  try {
    // Sempre mostrar um resumo curto em produção também
    const msg = `[MV SAT ${ts()}] ${action}${compactData(data)}`;
    console.info(msg);
  } catch {
    // ignorar
  }
}

