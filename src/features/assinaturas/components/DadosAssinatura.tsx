import { useState } from 'react';
import { Edit2, FileText, MapPin } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { Assinatura } from '@/types/subscription';
import { EditDadosAssinaturaDialog } from './EditDadosAssinaturaDialog';
import { useToast } from '@/shared/hooks/use-toast';

interface DadosAssinaturaProps {
  assinatura: Assinatura;
  isAdmin: boolean;
  mode?: 'view' | 'edit';
  onEdit?: () => void;
  onUpdateAssinatura?: (updatedData: Partial<Assinatura>) => void;
}

export const DadosAssinatura = ({ assinatura, isAdmin, mode = 'edit', onEdit, onUpdateAssinatura }: DadosAssinaturaProps) => {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditClick = () => {
    console.log('🔘 Botão de editar clicado!');
    console.log('👑 isAdmin:', isAdmin);
    console.log('📂 Abrindo dialog de edição...');
    console.log('📋 Dados da assinatura atual:', {
      id: assinatura.id,
      codigo: assinatura.codigo_assinatura,
      nome: assinatura.nome_completo
    });
    setEditDialogOpen(true);
    // Também chama a função onEdit se foi passada (para compatibilidade)
    onEdit?.();
  };

  const handleSaveEdit = async (data: any) => {
    console.log('💾 Salvando dados editados:', data);
    console.log('🔄 onUpdateAssinatura function:', !!onUpdateAssinatura);
    
    // Atualizar os dados da assinatura no estado local
    if (onUpdateAssinatura) {
      const updatedAssinatura = {
        ...assinatura,
        codigo_assinatura: data.codigo_assinatura,
        nome_completo: data.nome_completo,
        cpf: data.cpf,
        rg: data.rg,
        data_nascimento: data.data_nascimento,
        email: data.email,
        telefone: data.telefone,
        endereco_completo: data.endereco_completo || [
          data.rua,
          data.numero,
          data.bairro,
          data.cidade,
          data.estado,
          data.cep
        ].filter(Boolean).join(', '),
        // Manter os dados detalhados também nas observações
        observacoes: JSON.stringify({
          nome_completo: data.nome_completo || '',
          cpf: data.cpf || '',
          rg: data.rg || '',
          email: data.email || '',
          telefone: data.telefone || '',
          data_nascimento: data.data_nascimento || '',
          endereco_completo: data.endereco_completo || '',
          estado: data.estado || '',
          cidade: data.cidade || '',
          bairro: data.bairro || '',
          rua: data.rua || '',
          numero: data.numero || '',
          cep: data.cep || '',
          ponto_referencia: data.ponto_referencia || ''
        })
      };
      
      console.log('📤 Assinatura atualizada no estado local:', updatedAssinatura);
      console.log('📞 Chamando onUpdateAssinatura...');
      onUpdateAssinatura(updatedAssinatura);
      console.log('✅ onUpdateAssinatura executado com sucesso!');
    } else {
      console.log('❌ onUpdateAssinatura não está definido!');
    }
    
    // Toast de confirmação é mostrado pelo dialog
    setEditDialogOpen(false);
  };

  // Função para extrair partes do endereço das observações ou endereço completo
  const extrairPartesEndereco = () => {
    // Primeiro, verificar se há dados estruturados nas observações
    if (assinatura.observacoes) {
      try {
        const dados = JSON.parse(assinatura.observacoes);
        if (dados.estado || dados.cidade || dados.bairro || dados.rua || dados.numero || dados.cep) {
          return {
            rua: dados.rua || '',
            numero: dados.numero || '',
            bairro: dados.bairro || '',
            cidade: dados.cidade || '',
            estado: dados.estado || '',
            cep: dados.cep || ''
          };
        }
      } catch (e) {
        console.log('Erro ao parsear observações:', e);
      }
    }
    
    // Se não há dados estruturados, tentar extrair do endereço completo
    if (assinatura.endereco_completo) {
      const partes = assinatura.endereco_completo.split(',').map(p => p.trim());
      return {
        rua: partes[0] || '',
        numero: partes[1] || '',
        bairro: partes[2] || '',
        cidade: partes[3] || '',
        estado: partes[4] || '',
        cep: partes[5] || ''
      };
    }
    
    return { rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' };
  };

  // Função para extrair dados dos clientes das observações (para assinaturas sem cliente vinculado)
  const extrairDadosCliente = () => {
    if (assinatura.observacoes) {
      try {
        const dados = JSON.parse(assinatura.observacoes);
        return {
          nome_completo: dados.nome_completo || assinatura.nome_completo || '',
          cpf: dados.cpf || assinatura.cpf || '',
          rg: dados.rg || assinatura.rg || '',
          data_nascimento: dados.data_nascimento || assinatura.data_nascimento || '',
          email: dados.email || assinatura.email || '',
          telefone: dados.telefone || assinatura.telefone || '',
          endereco_completo: dados.endereco_completo || assinatura.endereco_completo || ''
        };
      } catch (e) {
        console.log('Erro ao parsear dados do cliente das observações:', e);
      }
    }
    
    return {
      nome_completo: assinatura.nome_completo || '',
      cpf: assinatura.cpf || '',
      rg: assinatura.rg || '',
      data_nascimento: assinatura.data_nascimento || '',
      email: assinatura.email || '',
      telefone: assinatura.telefone || '',
      endereco_completo: assinatura.endereco_completo || ''
    };
  };

  const enderecoParts = extrairPartesEndereco();
  const dadosCliente = extrairDadosCliente();
  const showEditButton = isAdmin && mode === 'edit';

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dados da Assinatura
        </CardTitle>
        {showEditButton && (
          <Button variant="outline" size="sm" onClick={handleEditClick} className="hover-scale">
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Código da Assinatura</Label>
            <p className="text-sm font-medium">{assinatura.codigo_assinatura}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Nome Completo</Label>
            <p className="text-sm font-medium">{dadosCliente.nome_completo}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
            <p className="text-sm font-medium">{dadosCliente.cpf}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">RG</Label>
            <p className="text-sm font-medium">{dadosCliente.rg}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
            <p className="text-sm font-medium">{dadosCliente.data_nascimento ? new Date(dadosCliente.data_nascimento).toLocaleDateString() : 'Não informado'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">E-mail</Label>
            <p className="text-sm font-medium">{dadosCliente.email}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
            <p className="text-sm font-medium">{dadosCliente.telefone}</p>
          </div>
        </div>

        {/* Seção de Endereço Detalhado */}
        <Separator className="my-4" />
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço Detalhado
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">🏙️ Estado</Label>
              <p className="text-sm font-medium">{enderecoParts.estado || 'Não informado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">🏡 Cidade</Label>
              <p className="text-sm font-medium">{enderecoParts.cidade || 'Não informado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">🏘️ Bairro</Label>
              <p className="text-sm font-medium">{enderecoParts.bairro || 'Não informado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">🚧 Rua</Label>
              <p className="text-sm font-medium">{enderecoParts.rua || 'Não informado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">🔢 Número</Label>
              <p className="text-sm font-medium">{enderecoParts.numero || 'Não informado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">🏷️ CEP</Label>
              <p className="text-sm font-medium">{enderecoParts.cep || 'Não informado'}</p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Dialog de Edição */}
      <EditDadosAssinaturaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        assinatura={assinatura}
        onSave={handleSaveEdit}
      />
    </Card>
  );
};







