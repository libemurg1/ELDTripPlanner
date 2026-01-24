import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  variant = "default",
  padding = "md",
  hover = false,
  onClick,
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    const variants = {
      default: {
        backgroundColor: theme.colors.background,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
      },
      outlined: {
        backgroundColor: theme.colors.background,
        border: `2px solid ${theme.colors.primary[500]}`,
        boxShadow: theme.shadows.md,
      },
      elevated: {
        backgroundColor: theme.colors.background,
        border: "none",
        boxShadow: theme.shadows.lg,
      },
    };
    return variants[variant] || variants.default;
  };

  const getPaddingStyles = () => {
    const paddings = {
      none: { padding: "0" },
      sm: { padding: theme.spacing[2] },
      md: { padding: theme.spacing[4] },
      lg: { padding: theme.spacing[6] },
      xl: { padding: theme.spacing[8] },
    };
    return paddings[padding] || paddings.md;
  };

  const variantStyles = getVariantStyles();
  const paddingStyles = getPaddingStyles();
  const hoverStyles = hover
    ? "transform scale-105 transition-transform duration-200"
    : "";
  const combinedClassName = `${className} ${hoverStyles}`;

  return (
    <div
      onClick={onClick}
      className={combinedClassName}
      style={{
        backgroundColor: variantStyles.backgroundColor,
        border: variantStyles.border,
        borderRadius: theme.borderRadius.base,
        boxShadow: variantStyles.boxShadow,
        ...paddingStyles,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
};

export default Card;
