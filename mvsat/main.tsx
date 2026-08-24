import React from 'react';
import { createRoot } from 'react-dom/client';
import { initFirebase } from './config/database.config';
import { ThemeProvider, ToastProvider, ToastContainer } from './shared';
import { useToastHelpers } from './shared/contexts/ToastContext';
import './shared/styles/globals.css';

const container = document.getElementById('root');
async function start() {
  await initFirebase();
  const { default: App } = await import('./app/App');
  if (container) {
    const root = createRoot(container);
    // Wrapper para injetar override global de alert usando o contexto de Toast
    const AppWithAlertOverride = () => {
      const { successQuick, error, info, warning } = useToastHelpers();
      React.useEffect(() => {
        const originalAlert = window.alert;
        let lastText = '';
        let lastAt = 0;
        window.alert = (msg?: any) => {
          const text = String(msg ?? '');
          const lower = text.toLowerCase();

          // Evitar spam de alert repetido (ex.: loops de erro)
          const now = Date.now();
          if (text === lastText && now - lastAt < 5000) {
            return;
          }
          lastText = text;
          lastAt = now;

          // Mensagem conhecida que costuma entrar em loop em alguns ambientes.
          // Mantemos só no console (uma vez) para não poluir a UI.
          if (lower.includes('firestore') && lower.includes('ctrl+f5') && (lower.includes('não carregou') || lower.includes('nao carregou'))) {
            console.warn('[alert suprimido]', text);
            return;
          }

          if (lower.includes('erro') || lower.includes('❌')) {
            error('Erro', text, { duration: 2000 });
          } else if (lower.includes('sucesso') || lower.includes('✅')) {
            successQuick('Sucesso', text);
          } else if (lower.includes('atenção') || lower.includes('⚠️')) {
            warning('Atenção', text, { duration: 2000 });
          } else {
            info('Aviso', text, { duration: 1500 });
          }
          // Também loga no console para auditoria
          console.log('[alert override]', text);
        };
        return () => { window.alert = originalAlert; };
      }, [successQuick, error, info, warning]);
      return <App />;
    };
    root.render(
      <ThemeProvider>
        <ToastProvider>
          <AppWithAlertOverride />
          <ToastContainer position="top-right" />
        </ToastProvider>
      </ThemeProvider>
    );
  }
}

start();


