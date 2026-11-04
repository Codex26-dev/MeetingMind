import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-300',
        ghost: 'bg-transparent text-emerald-100 hover:bg-emerald-400/10',
        outline: 'border border-emerald-300/20 bg-emerald-950/30 text-emerald-100 hover:border-emerald-300/50 hover:bg-emerald-400/10',
      },
      size: {
        default: 'h-9 rounded-md px-4 text-sm',
        sm: 'h-8 rounded-md px-3 text-xs',
        icon: 'size-9 rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export function Button({ asChild = false, className, variant, size, ...props }) {
  const Component = asChild ? Slot : 'button';
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
