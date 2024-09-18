import React from 'react';
import { cva, VariantProps } from 'class-variance-authority';

/**
 * Define toggle variants using Class Variance Authority (CVA)
 */
export const toggleVariants = cva(
  "px-4 py-2 rounded cursor-pointer transition-colors",
  {
    variants: {
      color: {
        cyan: "bg-cyan-500 text-white",
        fuchsia: "bg-fuchsia-500 text-white",
        lime: "bg-lime-500 text-black",
        yellow: "bg-yellow-500 text-black",
        red: "bg-red-500 text-white",
        blue: "bg-blue-500 text-white",
        green: "bg-green-500 text-white",
        purple: "bg-purple-500 text-white",
      },
      size: {
        sm: "text-sm",
        md: "text-md",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      color: "cyan",
      size: "md",
    },
  }
);

/**
 * Props interface for the Toggle component
 */
interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof toggleVariants> {
  variant?: keyof typeof toggleVariants.variants.color;
  size?: keyof typeof toggleVariants.variants.size;
}

/**
 * Toggle Component
 */
const Toggle: React.FC<ToggleProps> = ({ variant, size, className, children, ...props }) => {
  return (
    <button
      className={`${toggleVariants({ color: variant, size })} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Toggle;