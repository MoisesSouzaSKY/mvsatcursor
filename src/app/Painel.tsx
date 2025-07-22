import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';

const Painel = () => {
  const { signOut, user, employee, isEmployee } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao sair. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getCurrentUser = () => {
    if (isEmployee && employee) {
      return {
        name: employee.name,
        email: employee.email || 'Não informado',
        role: employee.isAdmin ? 'Funcionário - Administrador' : 'Funcionário'
      };
    }
    return {
      name: user?.email?.split('@')[0] || 'Usuário',
      email: user?.email || 'Não informado',
      role: 'Proprietário'
    };
  };

  const currentUser = getCurrentUser();

  // Filtrar botões baseado no tipo de usuário
  const getFilteredButtons = () => {
    const allButtons = [
      { href: "/clientes", label: "👥 Clientes" },
      { href: "/assinaturas", label: "📺 Assinaturas" },
      { href: "/equipamentos", label: "📱 Equipamentos" },
      { href: "/cobrancas", label: "💰 Cobranças" },
      { href: "/funcionarios", label: "👨‍💼 Funcionários" },
      { href: "/tvbox", label: "📡 TV Box" },
      { href: "/configuracoes", label: "⚙️ Configurações" }
    ];

    if (isEmployee) {
      // Funcionários não têm acesso a Funcionários e Configurações
      return allButtons.filter(button => 
        button.href !== '/funcionarios' && button.href !== '/configuracoes'
      );
    }
    
    // Proprietário tem acesso a tudo
    return allButtons;
  };

  const filteredButtons = getFilteredButtons();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">📊 Painel Administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Bem-vindo ao sistema de gestão, {currentUser.name}!
            </p>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Nome:</span> {currentUser.name}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">E-mail:</span> {currentUser.email}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Tipo:</span> {currentUser.role}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              Sair
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Sistema de Gestão MV SAT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Acesse as funcionalidades do sistema através do menu lateral ou pelos links abaixo:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredButtons.map((button) => (
                <Button key={button.href} variant="outline" asChild>
                  <a href={button.href}>{button.label}</a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Painel;







