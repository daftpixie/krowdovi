import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-sm text-text-primary ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-text-tertiary placeholder:font-mono',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
