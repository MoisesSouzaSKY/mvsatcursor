import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/config';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Registrar = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('moisestimesky@gmail.com');
  const [password, setPassword] = useState('B12e57D8@');
  const [nome, setNome] = useState('Moises Timesky');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Atualizar o perfil do usuário com o nome
      await updateProfile(user, {
        displayName: nome
      });

      // Criar documento no Firestore para o perfil do usuário
      await setDoc(doc(db, 'profiles', user.uid), {
        id: user.uid,
        user_id: user.uid,
        nome: nome,
        email: email,
        permissoes: [],
        created_at: new Date(),
        updated_at: new Date()
      });

      toast({
        title: "Usuário criado com sucesso!",
        description: "Redirecionando para o login...",
      });
      
      // Redirect to login after successful registration
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('Erro no registro:', error);
      
      let errorMessage = "Ocorreu um erro inesperado. Tente novamente.";
      
      // Tratar erros específicos do Firebase
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este e-mail já está sendo usado por outra conta.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "E-mail inválido.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha deve ter pelo menos 6 caracteres.";
      }
      
      toast({
        title: "Erro no registro",
        description: errorMessage,
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
          <CardTitle className="text-2xl font-bold">📝 Criar Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Digite seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button variant="link" asChild>
              <a href="/login">Já tem conta? Faça login</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registrar;







