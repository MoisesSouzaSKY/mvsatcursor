import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/shared/components/ui/select';
import { 
  Building, 
  Calendar, 
  Shield, 
  Bell, 
  Upload,
  Save
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/shared/hooks/use-toast';

interface ConfigurationSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const ConfigurationSection = ({ title, icon, children }: ConfigurationSectionProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export const ParametrosGerais = () => {
  const [config, setConfig] = useState({
    nomeEmpresa: 'MV SAT',
    whatsapp: '+55 11 99999-9999',
    mensagemBoasVindas: 'Bem-vindo ao sistema MV SAT! Estamos aqui para ajudá-lo.'
  });
  const { toast } = useToast();

  const handleSave = () => {
    // Aqui você implementaria a lógica para salvar no banco
    toast({
      title: "Configurações salvas",
      description: "Parâmetros gerais foram atualizados com sucesso.",
    });
  };

  return (
    <ConfigurationSection 
      title="Parâmetros Gerais" 
      icon={<Building className="h-5 w-5" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome-empresa">Nome da Empresa</Label>
          <Input
            id="nome-empresa"
            value={config.nomeEmpresa}
            onChange={(e) => setConfig({...config, nomeEmpresa: e.target.value})}
            placeholder="Digite o nome da empresa"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp de Contato</Label>
          <Input
            id="whatsapp"
            value={config.whatsapp}
            onChange={(e) => setConfig({...config, whatsapp: e.target.value})}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>
      
      <div className="space-y-2 mt-4">
        <Label htmlFor="logo">Logo da Empresa</Label>
        <div className="flex items-center space-x-2">
          <Input id="logo" type="file" accept="image/*" />
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 mt-4">
        <Label htmlFor="mensagem-boas-vindas">Mensagem Padrão de Boas-vindas</Label>
        <Textarea
          id="mensagem-boas-vindas"
          value={config.mensagemBoasVindas}
          onChange={(e) => setConfig({...config, mensagemBoasVindas: e.target.value})}
          placeholder="Digite a mensagem de boas-vindas"
          rows={3}
        />
      </div>
      
      <Button onClick={handleSave} className="mt-4">
        <Save className="h-4 w-4 mr-2" />
        Salvar Configurações
      </Button>
    </ConfigurationSection>
  );
};

export const PreferenciasVencimento = () => {
  const [config, setConfig] = useState({
    diaVencimento: '10',
    cobrancaAutomatica: true,
    tipoLembrete: 'whatsapp'
  });
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Preferências de vencimento foram atualizadas com sucesso.",
    });
  };

  return (
    <ConfigurationSection 
      title="Preferências de Vencimento" 
      icon={<Calendar className="h-5 w-5" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dia-vencimento">Dia Padrão de Vencimento</Label>
          <Select value={config.diaVencimento} onValueChange={(value) => setConfig({...config, diaVencimento: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o dia" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tipo-lembrete">Tipo de Lembrete</Label>
          <Select value={config.tipoLembrete} onValueChange={(value) => setConfig({...config, tipoLembrete: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="space-y-1">
          <Label htmlFor="cobranca-automatica">Cobrança Automática</Label>
          <p className="text-sm text-gray-500">Enviar cobranças automaticamente no vencimento</p>
        </div>
        <Switch
          id="cobranca-automatica"
          checked={config.cobrancaAutomatica}
          onCheckedChange={(checked) => setConfig({...config, cobrancaAutomatica: checked})}
        />
      </div>
      
      <Button onClick={handleSave} className="mt-4">
        <Save className="h-4 w-4 mr-2" />
        Salvar Configurações
      </Button>
    </ConfigurationSection>
  );
};

export const AcessoSeguranca = () => {
  const [config, setConfig] = useState({
    maxTentativas: '3',
    tempoExpiracao: '24',
    autenticacaoEmail: true,
    autenticacaoPin: false
  });
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Configurações de acesso e segurança foram atualizadas com sucesso.",
    });
  };

  return (
    <ConfigurationSection 
      title="Acesso e Segurança" 
      icon={<Shield className="h-5 w-5" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max-tentativas">Máximo de Tentativas de Login</Label>
          <Select value={config.maxTentativas} onValueChange={(value) => setConfig({...config, maxTentativas: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 tentativas</SelectItem>
              <SelectItem value="5">5 tentativas</SelectItem>
              <SelectItem value="10">10 tentativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tempo-expiracao">Tempo de Expiração da Sessão (horas)</Label>
          <Select value={config.tempoExpiracao} onValueChange={(value) => setConfig({...config, tempoExpiracao: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hora</SelectItem>
              <SelectItem value="8">8 horas</SelectItem>
              <SelectItem value="24">24 horas</SelectItem>
              <SelectItem value="168">7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="autenticacao-email">Autenticação por Email</Label>
            <p className="text-sm text-gray-500">Confirmar login via email</p>
          </div>
          <Switch
            id="autenticacao-email"
            checked={config.autenticacaoEmail}
            onCheckedChange={(checked) => setConfig({...config, autenticacaoEmail: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="autenticacao-pin">Autenticação por PIN</Label>
            <p className="text-sm text-gray-500">Usar PIN como autenticação secundária</p>
          </div>
          <Switch
            id="autenticacao-pin"
            checked={config.autenticacaoPin}
            onCheckedChange={(checked) => setConfig({...config, autenticacaoPin: checked})}
          />
        </div>
      </div>
      
      <Button onClick={handleSave} className="mt-4">
        <Save className="h-4 w-4 mr-2" />
        Salvar Configurações
      </Button>
    </ConfigurationSection>
  );
};

export const NotificacoesConfig = () => {
  const [config, setConfig] = useState({
    alertasCobranca: true,
    notificacaoComprovante: true,
    alertaLoginHorario: false
  });
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Configurações de notificações foram atualizadas com sucesso.",
    });
  };

  return (
    <ConfigurationSection 
      title="Notificações" 
      icon={<Bell className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="alertas-cobranca">Alertas de Cobrança Pendente</Label>
            <p className="text-sm text-gray-500">Receber notificação quando houver cobranças pendentes</p>
          </div>
          <Switch
            id="alertas-cobranca"
            checked={config.alertasCobranca}
            onCheckedChange={(checked) => setConfig({...config, alertasCobranca: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notificacao-comprovante">Notificação de Comprovante</Label>
            <p className="text-sm text-gray-500">Enviar notificação quando comprovante for enviado</p>
          </div>
          <Switch
            id="notificacao-comprovante"
            checked={config.notificacaoComprovante}
            onCheckedChange={(checked) => setConfig({...config, notificacaoComprovante: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="alerta-login-horario">Alerta de Login Fora do Horário</Label>
            <p className="text-sm text-gray-500">Receber alerta quando login ocorrer fora do horário comercial</p>
          </div>
          <Switch
            id="alerta-login-horario"
            checked={config.alertaLoginHorario}
            onCheckedChange={(checked) => setConfig({...config, alertaLoginHorario: checked})}
          />
        </div>
      </div>
      
      <Button onClick={handleSave} className="mt-4">
        <Save className="h-4 w-4 mr-2" />
        Salvar Configurações
      </Button>
    </ConfigurationSection>
  );
};

export { FaviconConfig } from './FaviconConfig';







