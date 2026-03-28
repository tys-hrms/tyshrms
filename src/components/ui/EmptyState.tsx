import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-surface-500" />
      </div>
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-surface-400 text-sm max-w-xs leading-relaxed mb-6">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
