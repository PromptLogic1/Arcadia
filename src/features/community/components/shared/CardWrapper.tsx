import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  onClick?: () => void;
}

export const CardWrapper: React.FC<CardWrapperProps> = ({
  children,
  title,
  description,
  footer,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
  onClick,
}) => {
  return (
    <Card
      variant="cyber"
      glow="subtle"
      className={cn('w-full transition-all duration-300 hover:scale-[1.02] group', className)}
      onClick={onClick}
    >
      {(title || description) && (
        <CardHeader className={headerClassName}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
      {footer && <CardFooter className={footerClassName}>{footer}</CardFooter>}
    </Card>
  );
};
