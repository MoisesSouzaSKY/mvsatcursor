import React, { useState, useEffect } from 'react';
import { Users, Shield, Eye, Plus, Edit, Trash, Save, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Checkbox } from '@/shared/components/ui/checkbox';

interface Funcionario {
  id: string;
  nome: string;
  email?: string;
  cargo?: string;
  status: string;
  is_admin?: boolean;
  ativo_sistema?: boolean;
}

interface Permissao {
  id: string;
  funcionario_id: string;
  modulo: string;
  permissao: string;
  ativo: boolean;
}

const MODULOS = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'equipamentos', label: 'Equipamentos' },
  { key: 'assinaturas', label: 'Assinaturas' },
  { key: 'cobrancas', label: 'Cobranças' },
  { key: 'funcionarios', label: 'Funcionários' },
  { key: 'relatorios', label: 'Relatórios' }
];

const PERMISSOES = [
  { key: 'read', label: 'Visualizar' },
  { key: 'create', label: 'Criar' },
  { key: 'update', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
  { key: 'manage', label: 'Administrar' }
];

export const PermissoesPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [editingPermissoes, setEditingPermissoes] = useState<{[key: string]: boolean}>({});

  const loadFuncionarios = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, nome, email, cargo, status, is_admin, ativo_sistema')
        .eq('user_id', user.id)
        .order('nome');

      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      console.error('Error loading funcionarios:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar funcionários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissoes = async (funcionarioId?: string) => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('funcionario_permissoes')
        .select('*')
        .eq('user_id', user.id);

      if (funcionarioId) {
        query = query.eq('funcionario_id', funcionarioId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setPermissoes(data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar permissões.",
        variant: "destructive",
      });
    }
  };

  const togglePermissao = async (funcionarioId: string, modulo: string, permissao: string, ativo: boolean) => {
    if (!user) return;

    try {
      const existingPermission = permissoes.find(p => 
        p.funcionario_id === funcionarioId && 
        p.modulo === modulo && 
        p.permissao === permissao
      );

      if (existingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('funcionario_permissoes')
          .update({ ativo })
          .eq('id', existingPermission.id);

        if (error) throw error;
        
        // Atualizar estado local imediatamente
        setPermissoes(prev => prev.map(p => 
          p.id === existingPermission.id 
            ? { ...p, ativo } 
            : p
        ));
      } else {
        // Create new permission
        const { data, error } = await supabase
          .from('funcionario_permissoes')
          .insert({
            funcionario_id: funcionarioId,
            modulo,
            permissao,
            ativo,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        
        // Adicionar nova permissão ao estado local
        if (data) {
          setPermissoes(prev => [...prev, data]);
        }
      }
      
      toast({
        title: "Permissão atualizada",
        description: "Permissão foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão.",
        variant: "destructive",
      });
    }
  };

  const toggleAcessoSistema = async (funcionarioId: string, ativoSistema: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo_sistema: ativoSistema })
        .eq('id', funcionarioId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualizar lista de funcionários
      await loadFuncionarios();
      
      // Atualizar o funcionário selecionado se for o mesmo que foi modificado
      if (selectedFuncionario && selectedFuncionario.id === funcionarioId) {
        setSelectedFuncionario(prev => prev ? { ...prev, ativo_sistema: ativoSistema } : null);
      }
      
      toast({
        title: "Acesso atualizado",
        description: `Acesso ao sistema foi ${ativoSistema ? 'ativado' : 'desativado'}.`,
      });
    } catch (error) {
      console.error('Error updating system access:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar acesso ao sistema.",
        variant: "destructive",
      });
    }
  };

  const getPermissaoStatus = (funcionarioId: string, modulo: string, permissao: string) => {
    const perm = permissoes.find(p => 
      p.funcionario_id === funcionarioId && 
      p.modulo === modulo && 
      p.permissao === permissao
    );
    return perm?.ativo || false;
  };

  useEffect(() => {
    loadFuncionarios();
    loadPermissoes();
  }, [user]);

  const handleOpenPermissoes = (funcionario: Funcionario) => {
    setSelectedFuncionario(funcionario);
    loadPermissoes(funcionario.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Painel de Permissões</h2>
          <p className="text-muted-foreground">
            Gerencie as permissões de acesso dos funcionários
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2" size={20} />
            Funcionários e Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acesso Sistema</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando funcionários...
                  </TableCell>
                </TableRow>
              ) : funcionarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                funcionarios.map((funcionario) => (
                  <TableRow key={funcionario.id}>
                    <TableCell className="font-medium">{funcionario.nome}</TableCell>
                    <TableCell>{funcionario.email || '-'}</TableCell>
                    <TableCell>{funcionario.cargo || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={funcionario.status === 'ativo' ? 'default' : 'secondary'}>
                        {funcionario.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={funcionario.ativo_sistema ? 'default' : 'destructive'}>
                        {funcionario.ativo_sistema ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={funcionario.is_admin ? 'default' : 'outline'}>
                        {funcionario.is_admin ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenPermissoes(funcionario)}
                        >
                          <Shield size={16} className="mr-1" />
                          Permissões
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Permissões */}
      {selectedFuncionario && (
        <Dialog open={!!selectedFuncionario} onOpenChange={(open) => !open && setSelectedFuncionario(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Permissões - {selectedFuncionario.nome}
              </DialogTitle>
              <DialogDescription>
                Configure as permissões de acesso ao sistema e aos módulos para este funcionário.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Controle de Acesso ao Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users size={20} className="mr-2" />
                    Acesso ao Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ativo no Sistema</p>
                      <p className="text-sm text-muted-foreground">
                        Permite que o funcionário acesse o sistema
                      </p>
                    </div>
                    <Switch
                      checked={selectedFuncionario.ativo_sistema || false}
                      onCheckedChange={(checked) => toggleAcessoSistema(selectedFuncionario.id, checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Matriz de Permissões */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Permissões por Módulo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Módulo</TableHead>
                          {PERMISSOES.map(perm => (
                            <TableHead key={perm.key} className="text-center min-w-[100px]">
                              {perm.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MODULOS.map(modulo => (
                          <TableRow key={modulo.key}>
                            <TableCell className="font-medium">
                              {modulo.label}
                            </TableCell>
                            {PERMISSOES.map(permissao => (
                              <TableCell key={permissao.key} className="text-center">
                                <Checkbox
                                  checked={getPermissaoStatus(selectedFuncionario.id, modulo.key, permissao.key)}
                                  onCheckedChange={(checked) => 
                                    togglePermissao(selectedFuncionario.id, modulo.key, permissao.key, !!checked)
                                  }
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};







