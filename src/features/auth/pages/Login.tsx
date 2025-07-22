import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { signIn, signInEmployee, user, employee } = useAuth();
  const { toast } = useToast();
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Função para limpar localStorage e state
  const clearAuthData = () => {
    localStorage.removeItem('employee_session');
    setLoginField('');
    setPassword('');
    toast({
      title: "Cache limpo",
      description: "Dados de autenticação removidos. Tente fazer login novamente.",
    });
  };

  // Redirect if already logged in
  if (user || employee) {
    return <Navigate to="/painel" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Debug temporário - verificar todos os valores
    console.log('🔄 [Login] Estado do formulário:', {
      loginField: loginField || 'VAZIO',
      password: password || 'VAZIO',
      passwordLength: password?.length || 0
    });

    // Validação extra antes de enviar
    if (!loginField.trim()) {
      toast({
        title: "Erro no formulário",
        description: "Digite o login ou e-mail",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      toast({
        title: "Erro no formulário", 
        description: "Digite a senha",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Se contém @, tenta primeiro como proprietário
      if (loginField.includes('@')) {
        const { error: ownerError } = await signIn(loginField, password);
        
        if (!ownerError) {
          toast({
            title: "Login realizado com sucesso",
            description: "Redirecionando para o painel...",
          });
          return;
        }
        
        // Se falhou como proprietário, mostra erro específico
        toast({
          title: "Erro no login",
          description: "E-mail ou senha incorretos",
          variant: "destructive",
        });
        return;
      }

      // Se não contém @, tenta como funcionário
      const { error: employeeError } = await signInEmployee(loginField, password);
      
      if (!employeeError) {
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo ao sistema!",
        });
        return;
      }
      
      // Se falhou como funcionário, mostra erro
      toast({
        title: "Erro no login",
        description: "Login ou senha de funcionário incorretos",
        variant: "destructive",
      });
      
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">🔐 Acesso ao Sistema</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use seu <strong>e-mail</strong> (proprietário) ou <strong>login</strong> (funcionário)
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginField">E-mail ou Login</Label>
              <Input
                id="loginField"
                name="loginField"
                type="text"
                placeholder="Ex: teste1 ou email@exemplo.com"
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                • Funcionário: digite apenas o login (ex: teste1)<br/>
                • Proprietário: digite o e-mail completo
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => {
                    const newPassword = e.target.value;
                    console.log('🔄 [Login] Senha digitada, length:', newPassword.length);
                    setPassword(newPassword);
                  }}
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          
          <div className="mt-4 space-y-2">
            <div className="text-center">
              <Button variant="link" asChild>
                <a href="/registrar">Não tem conta? Registre-se</a>
              </Button>
            </div>
            <div className="text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAuthData}
                className="text-xs"
              >
                🗑️ Limpar Cache
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;







