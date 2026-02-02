
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-white/5 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/2">
          <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-7 text-slate-300 bg-gray-900/50">
          {children}
        </div>
        <div className="px-6 py-5 bg-white/2 flex justify-end gap-3 border-t border-white/5">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200">취소</Button>
          <Button variant="primary" onClick={onConfirm} className="px-6">{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};
