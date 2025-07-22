import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  onNewClick?: () => void;
  newButtonText?: string;
  showNewButton?: boolean;
}

export const PageHeader = ({ 
  title, 
  description, 
  onNewClick, 
  newButtonText = "Novo",
  showNewButton = true
}: PageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {showNewButton && onNewClick && (
        <Button onClick={onNewClick} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {newButtonText}
        </Button>
      )}
    </div>
  );
};







