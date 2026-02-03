
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
    primary: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-900 text-white',
    secondary: 'bg-white hover:bg-zinc-100 border-zinc-900 text-zinc-900',
    danger: 'bg-red-800 hover:bg-red-900 border-zinc-900 text-white',
    accent: 'bg-indigo-700 hover:bg-indigo-800 border-zinc-900 text-white',
  };

  return (
    <button
      className={`
        px-6 py-2 border-b-2 border-r-2 active:border-b-0 active:border-r-0 
        active:translate-y-0.5 active:translate-x-0.5 font-bold uppercase tracking-widest
        transition-all duration-75 flex items-center justify-center gap-2 text-xs
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
