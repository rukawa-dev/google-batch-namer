
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-20 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500 shadow-lg shadow-indigo-900/20 border border-indigo-400/20",
    secondary: "bg-slate-800/60 text-slate-100 border border-slate-700 hover:bg-slate-700 focus:ring-slate-500 hover:border-slate-600",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-100",
    outline: "bg-transparent border border-indigo-500/50 text-indigo-400 hover:bg-indigo-950/30 focus:ring-indigo-500"
  };

  const sizes = {
    sm: "px-4 py-2.5 text-base", // 기존 md 크기를 sm으로 승격
    md: "px-6 py-3 text-lg",    // 기존 lg 크기를 md로 승격
    lg: "px-8 py-4 text-xl"     // 더 큰 사이즈 추가
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
