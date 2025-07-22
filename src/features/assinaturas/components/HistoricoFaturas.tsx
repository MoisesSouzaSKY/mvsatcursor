import { useState } from 'react';
import { Eye, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Assinatura } from '@/types/subscription';
import { ComprovanteUploadDialog } from './ComprovanteUploadDialog';
import { ComprovanteViewDialog } from './ComprovanteViewDialog';

interface HistoricoFaturasProps {
  assinatura: Assinatura;
  isAdmin: boolean;
  onDeleteFatura?: (faturaId: string) => void;
}

export const HistoricoFaturas = ({ assinatura, isAdmin, onDeleteFatura }: HistoricoFaturasProps) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedFaturaId, setSelectedFaturaId] = useState<string | null>(null);

  const handleUploadClick = (faturaId: string) => {
    setSelectedFaturaId(faturaId);
    setUploadDialogOpen(true);
  };

  const handleViewClick = (faturaId: string) => {
    setSelectedFaturaId(faturaId);
    setViewDialogOpen(true);
  };

  const handleDeleteFatura = (faturaId: string) => {
    if (confirm('Tem certeza que deseja excluir esta fatura?')) {
      onDeleteFatura?.(faturaId);
    }
  };
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Histórico de Faturas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Ordenar faturas do mais recente para o mais antigo */}
          {assinatura.historico_faturas
            .sort((a, b) => {
              // Ordenar por data de pagamento se existir, senão por data de vencimento
              const dateA = new Date(a.data_pagamento || a.data_vencimento);
              const dateB = new Date(b.data_pagamento || b.data_vencimento);
              return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
            })
            .map((fatura) => (
            <div key={fatura.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">Valor Pago</Label>
                  <p className="text-lg font-bold text-green-600">R$ {fatura.valor.toFixed(2)}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">Data do Pagamento</Label>
                  <div className="flex items-center gap-2">
                    {fatura.data_pagamento ? (
                      <>
                        <p className="text-sm font-medium">
                          {new Date(fatura.data_pagamento).toLocaleDateString('pt-BR')}
                        </p>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          PAGO
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="destructive">PENDENTE</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  {fatura.data_pagamento ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      title="Ver Comprovante de Pagamento"
                      className="hover-scale"
                      onClick={() => handleViewClick(fatura.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Comprovante
                    </Button>
                  ) : isAdmin ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      title="Fazer Upload do Comprovante"
                      className="hover-scale"
                      onClick={() => handleUploadClick(fatura.id)}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Comprovante
                    </Button>
                  ) : null}
                  
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Excluir Fatura"
                      className="hover-scale text-destructive hover:text-destructive"
                      onClick={() => handleDeleteFatura(fatura.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Referência: {fatura.mes_referencia}
                </p>
              </div>
            </div>
            ))}
          
          {assinatura.historico_faturas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma fatura encontrada no histórico</p>
            </div>
          )}
        </div>

        {/* Dialogs de Upload e Visualização */}
        {selectedFaturaId && (
          <>
            <ComprovanteUploadDialog
              open={uploadDialogOpen}
              onOpenChange={setUploadDialogOpen}
              faturaId={selectedFaturaId}
              assinaturaId={assinatura.id}
            />
            <ComprovanteViewDialog
              open={viewDialogOpen}
              onOpenChange={setViewDialogOpen}
              faturaId={selectedFaturaId}
              assinaturaId={assinatura.id}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};







