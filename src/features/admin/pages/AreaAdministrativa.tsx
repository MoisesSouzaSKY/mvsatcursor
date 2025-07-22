import { useState } from 'react';
import { AdminHeader } from '@/features/admin/components/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { 
  Users, 
  Package, 
  CreditCard, 
  Settings, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AreaAdministrativa = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dados mockados para demonstração
  const mockData = [
    { type: 'cliente', name: 'João Silva', email: 'joao@email.com', id: 1 },
    { type: 'cliente', name: 'Maria Santos', email: 'maria@email.com', id: 2 },
    { type: 'cliente', name: 'Pedro Alves', email: 'pedro@email.com', id: 3 },
    { type: 'equipamento', name: 'Decoder SKY-001', numero: 'NDS12345', id: 4 },
    { type: 'equipamento', name: 'Receptor NET-002', numero: 'NDS67890', id: 5 },
    { type: 'funcionario', name: 'Ana Costa', cargo: 'Gerente', id: 6 },
    { type: 'funcionario', name: 'Carlos Lima', cargo: 'Técnico', id: 7 },
    { type: 'cobranca', cliente: 'João Silva', valor: 89.90, vencimento: '2024-07-15', id: 8 },
    { type: 'cobranca', cliente: 'Maria Santos', valor: 129.90, vencimento: '2024-07-20', id: 9 },
  ];

  const handleSearch = (query: string) => {
    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    const results = mockData.filter(item => {
      const searchTerm = query.toLowerCase();
      switch (item.type) {
        case 'cliente':
          return item.name.toLowerCase().includes(searchTerm) || 
                 item.email.toLowerCase().includes(searchTerm);
        case 'equipamento':
          return item.name.toLowerCase().includes(searchTerm) || 
                 item.numero.toLowerCase().includes(searchTerm);
        case 'funcionario':
          return item.name.toLowerCase().includes(searchTerm) || 
                 item.cargo.toLowerCase().includes(searchTerm);
        case 'cobranca':
          return item.cliente.toLowerCase().includes(searchTerm);
        default:
          return false;
      }
    });

    setSearchResults(results);
  };

  const getSearchResultIcon = (type: string) => {
    switch (type) {
      case 'cliente':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'equipamento':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'funcionario':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'cobranca':
        return <CreditCard className="h-4 w-4 text-yellow-600" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const formatSearchResult = (item: any) => {
    switch (item.type) {
      case 'cliente':
        return `${item.name} - ${item.email}`;
      case 'equipamento':
        return `${item.name} - ${item.numero}`;
      case 'funcionario':
        return `${item.name} - ${item.cargo}`;
      case 'cobranca':
        return `${item.cliente} - R$ ${item.valor} - Venc: ${item.vencimento}`;
      default:
        return item.name;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Administrativo */}
      <AdminHeader />
      
      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Resultados da Busca */}
        {isSearching && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Resultados da Busca</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum resultado encontrado para sua busca
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {searchResults.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 cursor-pointer border transition-colors"
                      >
                        {getSearchResultIcon(item.type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 rounded-full capitalize">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatSearchResult(item)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Título da Página */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Área Administrativa</h1>
              <p className="text-gray-600">Painel de controle e configurações do sistema</p>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Clientes Ativos</p>
                  <p className="text-2xl font-bold">342</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Equipamentos</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <Package className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Funcionários</p>
                  <p className="text-2xl font-bold">23</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Cobranças Pendentes</p>
                  <p className="text-2xl font-bold">89</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Acesso Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link to="/clientes">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Gerenciar Clientes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Cadastrar, editar e gerenciar informações dos clientes
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">342 clientes cadastrados</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/equipamentos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span>Controle de Equipamentos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Gerenciar equipamentos, status e histórico
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">156 equipamentos</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/funcionarios">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span>Gestão de Funcionários</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Controlar permissões e acesso dos funcionários
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">23 funcionários</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/cobrancas">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-yellow-600" />
                  <span>Sistema de Cobranças</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Gerenciar cobranças e pagamentos
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-600">89 cobranças pendentes</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/assinaturas">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <span>Assinaturas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Controlar planos e assinaturas ativas
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">289 assinaturas ativas</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/configuracoes">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <span>Configurações</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Configurar parâmetros e preferências do sistema
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-600">Configurações do sistema</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Atividade Recente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pagamento processado</p>
                  <p className="text-xs text-gray-600">João Silva - R$ 89,90 - há 5 minutos</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Novo cliente cadastrado</p>
                  <p className="text-xs text-gray-600">Maria Santos - há 1 hora</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Cobrança em atraso</p>
                  <p className="text-xs text-gray-600">Pedro Alves - 3 dias em atraso</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AreaAdministrativa;







