
import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onConfirm,
  confirmText = "적용"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/2">
          <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-10 text-slate-200 bg-gray-900/50 text-lg">
          {children}
        </div>
        <div className="px-8 py-6 bg-white/2 flex justify-end gap-4 border-t border-white/5">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200">취소</Button>
          <Button variant="primary" onClick={onConfirm} className="px-8" size="md">{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};
