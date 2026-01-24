import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { ReactNode } from "react";

// Button component with variant system
export interface ButtonProps {
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "ghost"
    | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  href?: string;
  target?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onClick,
  type = "button",
  className = "",
  href,
  target,
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    const variants = {
      primary: {
        backgroundColor: theme.colors.primary[600],
        color: "white",
        border: `1px solid ${theme.colors.primary[600]}`,
        "&:hover": {
          backgroundColor: theme.colors.primary[700],
          borderColor: theme.colors.primary[700],
        },
        "&:active": {
          backgroundColor: theme.colors.primary[800],
          borderColor: theme.colors.primary[800],
        },
        "&:disabled": {
          backgroundColor: theme.colors.gray[300],
          borderColor: theme.colors.gray[300],
          color: theme.colors.gray[500],
        },
      },
      secondary: {
        backgroundColor: "transparent",
        color: theme.colors.primary[600],
        border: `1px solid ${theme.colors.primary[600]}`,
        "&:hover": {
          backgroundColor: theme.colors.primary[50],
          color: theme.colors.primary[700],
        },
        "&:active": {
          backgroundColor: theme.colors.primary[100],
          color: theme.colors.primary[800],
        },
        "&:disabled": {
          backgroundColor: "transparent",
          borderColor: theme.colors.gray[300],
          color: theme.colors.gray[500],
        },
      },
      ghost: {
        backgroundColor: "transparent",
        color: theme.colors.primary[600],
        border: "none",
        "&:hover": {
          backgroundColor: theme.colors.primary[50],
          color: theme.colors.primary[700],
        },
        "&:active": {
          backgroundColor: theme.colors.primary[100],
          color: theme.colors.primary[800],
        },
        "&:disabled": {
          backgroundColor: "transparent",
          color: theme.colors.gray[500],
        },
      },
      success: {
        backgroundColor: theme.colors.success[600],
        color: "white",
        border: `1px solid ${theme.colors.success[600]}`,
        "&:hover": {
          backgroundColor: theme.colors.success[700],
          borderColor: theme.colors.success[700],
        },
        "&:active": {
          backgroundColor: theme.colors.success[800],
          borderColor: theme.colors.success[800],
        },
      },
      warning: {
        backgroundColor: theme.colors.warning[600],
        color: "white",
        border: `1px solid ${theme.colors.warning[600]}`,
        "&:hover": {
          backgroundColor: theme.colors.warning[700],
          borderColor: theme.colors.warning[700],
        },
        "&:active": {
          backgroundColor: theme.colors.warning[800],
          borderColor: theme.colors.warning[800],
        },
      },
      error: {
        backgroundColor: theme.colors.error[600],
        color: "white",
        border: `1px solid ${theme.colors.error[600]}`,
        "&:hover": {
          backgroundColor: theme.colors.error[700],
          borderColor: theme.colors.error[700],
        },
        "&:active": {
          backgroundColor: theme.colors.error[800],
          borderColor: theme.colors.error[800],
        },
      },
      link: {
        backgroundColor: "transparent",
        color: theme.colors.primary[600],
        border: "none",
        "&:hover": {
          color: theme.colors.primary[700],
          textDecoration: "underline",
        },
        "&:active": {
          color: theme.colors.primary[800],
        },
      },
    };
    return variants[variant] || variants.primary;
  };

  const getSizeStyles = () => {
    const sizes = {
      xs: { padding: "0.5rem 1rem", fontSize: theme.typography.fontSize.xs },
      sm: {
        padding: "0.625rem 1.25rem",
        fontSize: theme.typography.fontSize.sm,
      },
      md: {
        padding: "0.75rem 1.5rem",
        fontSize: theme.typography.fontSize.base,
      },
      lg: { padding: "1rem 2rem", fontSize: theme.typography.fontSize.lg },
      xl: { padding: "1.25rem 2.5rem", fontSize: theme.typography.fontSize.xl },
    };
    return sizes[size] || sizes.md;
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const combinedClassName = `${className} inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50 disabled:opacity-50`;

  const buttonContent = (
    <>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current border-t-transparent"></div>
      ) : (
        <span>{children}</span>
      )}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  );

  const buttonElement = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClassName}
      style={{
        backgroundColor: variantStyles.backgroundColor,
        color: variantStyles.color,
        border: variantStyles.border,
        ...sizeStyles,
        width: fullWidth ? "100%" : "auto",
      }}
    >
      {buttonContent}
    </button>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        onClick={onClick}
        className={combinedClassName}
        style={{
          backgroundColor: variantStyles.backgroundColor,
          color: variantStyles.color,
          border: variantStyles.border,
          ...sizeStyles,
          width: fullWidth ? "100%" : "auto",
          textDecoration: "none",
        }}
      >
        {buttonContent}
      </a>
    );
  }

  return buttonElement;
};

export default Button;
