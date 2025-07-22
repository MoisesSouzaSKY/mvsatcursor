
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { usePermissionSync } from '@/shared/hooks/usePermissionSync';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  // Sincronizar permissões automaticamente
  usePermissionSync();
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};







