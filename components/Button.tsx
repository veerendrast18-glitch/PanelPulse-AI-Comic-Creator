
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const variants = {
    primary: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-900 text-white shadow-xl',
    secondary: 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-900 shadow-sm',
    danger: 'bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-lg',
    accent: 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white shadow-2xl',
  };

  return (
    <button
      className={`
        px-8 py-4 font-bold uppercase tracking-widest
        transition-all duration-300 flex items-center justify-center gap-3 text-[10px]
        hover:-translate-y-1 active:translate-y-0 active:scale-[0.97]
        ${variants[variant]}
        ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
