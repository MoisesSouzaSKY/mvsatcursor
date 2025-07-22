import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';

interface NovaAssinaturaFormProps {
  onSave?: (dadosAssinatura: any) => void;
  onCancel?: () => void;
  isAdmin?: boolean;
}

export const NovaAssinaturaForm = ({ onSave, onCancel, isAdmin = false }: NovaAssinaturaFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    email: '',
    telefone: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      'nome_completo',
      'cpf', 
      'rg',
      'data_nascimento',
      'email',
      'telefone'
    ];

    const emptyFields = requiredFields.filter(field => !formData[field as keyof typeof formData].trim());
    
    if (emptyFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Todos os campos devem ser preenchidos para registrar uma nova assinatura.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas usuários com permissão de administrador podem criar novas assinaturas.",
        variant: "destructive"
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    onSave?.(formData);
    
    toast({
      title: "Assinatura criada",
      description: "Nova assinatura foi registrada com sucesso!",
    });
  };

  if (!isAdmin) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg">🔒 Acesso Restrito</p>
            <p className="mt-2">Apenas usuários com permissão de administrador podem criar novas assinaturas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          ➕ Nova Assinatura – Formulário
        </CardTitle>
        <p className="text-muted-foreground">
          ✅ Todos os campos devem ser preenchidos para registrar uma nova assinatura.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="nome_completo" className="text-sm font-medium">
              🧑 Nome Completo *
            </Label>
            <Input
              id="nome_completo"
              name="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => handleInputChange('nome_completo', e.target.value)}
              placeholder="Digite o nome completo"
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="cpf" className="text-sm font-medium">
              🪪 CPF *
            </Label>
            <Input
              id="cpf"
              name="cpf"
              value={formData.cpf}
              onChange={(e) => handleInputChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="rg" className="text-sm font-medium">
              🪪 RG *
            </Label>
            <Input
              id="rg"
              name="rg"
              value={formData.rg}
              onChange={(e) => handleInputChange('rg', e.target.value)}
              placeholder="Digite o RG"
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="data_nascimento" className="text-sm font-medium">
              📅 Data de Nascimento *
            </Label>
            <Input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              📧 E-mail *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="telefone" className="text-sm font-medium">
              📞 Telefone *
            </Label>
            <Input
              id="telefone"
              name="telefone"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              placeholder="(00) 00000-0000"
              className="mt-2"
              required
            />
          </div>
          
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="hover-scale"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            className="hover-scale"
          >
            Registrar Assinatura
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};







