// TODO: Migrar tela de configurações para Firebase
// Temporariamente comentado para não quebrar o sistema
import { useState } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function Configuracoes() {
  const { user } = useAuth();
  const [nomeEmpresa, setNomeEmpresa] = useState('MV SAT');
  const [telefone, setTelefone] = useState('+55 11 99999-9999');

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        title="Configurações"
        description="Personalize o sistema conforme suas necessidades"
      />

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome-empresa">Nome da Empresa</Label>
              <Input 
                id="nome-empresa" 
                value={nomeEmpresa} 
                onChange={(e) => setNomeEmpresa(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">WhatsApp de Contato</Label>
              <Input 
                id="telefone" 
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo da Empresa</Label>
            <Input id="logo" type="file" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem Padrão de Boas-vindas</Label>
            <textarea
              id="mensagem"
              className="w-full min-h-[100px] p-2 border rounded-md"
              defaultValue="Bem-vindo ao sistema MV SAT! Estamos aqui para ajudá-lo."
              disabled
            />
          </div>

          <Button className="mt-4">Salvar Configurações</Button>
        </CardContent>
      </Card>

      <div className="bg-white rounded-md p-6 shadow-sm">
        <p className="text-gray-600 mb-4">Esta funcionalidade está sendo migrada para Firebase...</p>
        <p className="text-gray-500">Todas as suas configurações serão preservadas durante a migração.</p>
      </div>
    </div>
  );
}







