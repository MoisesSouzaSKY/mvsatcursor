import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { TVBoxAssinaturaForm } from '@/types/tvbox';

interface AssinaturaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TVBoxAssinaturaForm) => Promise<void>;
  title: string;
  submitText: string;
  initialData?: TVBoxAssinaturaForm;
  clientes: any[];
}

export const AssinaturaForm = ({
  open,
  onOpenChange,
  onSubmit,
  title,
  submitText,
  initialData,
  clientes
}: AssinaturaFormProps) => {
  const [formData, setFormData] = useState<TVBoxAssinaturaForm>(
    initialData || {
      login: '',
      senha: '',
      nome: '',
      data_renovacao: '',
      cliente_id: '',
      observacoes: ''
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onOpenChange(false);
    setFormData({
      login: '',
      senha: '',
      nome: '',
      data_renovacao: '',
      cliente_id: '',
      observacoes: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Login *</Label>
            <Input
              id="login"
              name="login"
              value={formData.login}
              onChange={(e) => setFormData(prev => ({ ...prev, login: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="senha">Senha *</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              value={formData.senha}
              onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Assinatura</Label>
            <Input
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Assinatura Sala, Quarto Principal..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="data_renovacao">Data de Renovação *</Label>
            <Input
              id="data_renovacao"
              name="data_renovacao"
              type="date"
              value={formData.data_renovacao}
              onChange={(e) => setFormData(prev => ({ ...prev, data_renovacao: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente (opcional)</Label>
            <Select name="cliente_id" value={formData.cliente_id || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value === "none" ? "" : value }))}>
              <SelectTrigger id="cliente_id">
                <SelectValue placeholder="Selecione um cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum cliente</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">{submitText}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};







