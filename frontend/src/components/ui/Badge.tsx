import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    const variants = {
      primary: {
        backgroundColor: theme.colors.primary[600],
        color: "white",
      },
      secondary: {
        backgroundColor: theme.colors.gray[600],
        color: "white",
      },
      success: {
        backgroundColor: theme.colors.success[600],
        color: "white",
      },
      warning: {
        backgroundColor: theme.colors.warning[600],
        color: "white",
      },
      error: {
        backgroundColor: theme.colors.error[600],
        color: "white",
      },
      info: {
        backgroundColor: theme.colors.info[600],
        color: "white",
      },
    };
    return variants[variant] || variants.primary;
  };

  const getSizeStyles = () => {
    const sizes = {
      xs: {
        fontSize: theme.typography.fontSize.xs,
        padding: "0.25rem 0.5rem",
      },
      sm: {
        fontSize: theme.typography.fontSize.sm,
        padding: "0.25rem 0.75rem",
      },
      md: {
        fontSize: theme.typography.fontSize.base,
        padding: "0.25rem 1rem",
      },
      lg: {
        fontSize: theme.typography.fontSize.lg,
        padding: "0.25rem 1.5rem",
      },
    };
    return sizes[size] || sizes.md;
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const combinedClassName = `${className} inline-flex items-center justify-center font-semibold rounded-full`;

  return (
    <span
      className={combinedClassName}
      style={{
        backgroundColor: variantStyles.backgroundColor,
        color: variantStyles.color,
        ...sizeStyles,
        fontWeight: theme.typography.fontWeight.semibold,
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
