import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative ${sizeClasses[size]} w-full bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up`}
      >
        <div className="flex items-start justify-between p-6 border-b border-dark-800">
          <div>
            <h2 className="text-lg font-display font-bold text-white">{title}</h2>
            {description && <p className="text-sm text-dark-300 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-white p-1 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
