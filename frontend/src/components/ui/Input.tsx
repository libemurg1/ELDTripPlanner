import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { ReactNode } from "react";

export interface InputProps {
  id?: string;
  name?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  rows?: number;
  multiline?: boolean;
}

const Input: React.FC<InputProps> = ({
  id,
  name,
  type = "text",
  placeholder,
  value,
  defaultValue,
  label,
  helperText,
  error,
  required = false,
  disabled = false,
  className = "",
  onChange,
  onFocus,
  onBlur,
  leftIcon,
  rightIcon,
  rows,
  multiline = false,
}) => {
  const { theme } = useTheme();

  const getInputStyles = () => {
    const baseStyles = {
      border: `1px solid ${
        error ? theme.colors.error[500] : theme.colors.border
      }`,
      borderRadius: theme.borderRadius.base,
      fontSize: theme.typography.fontSize.base,
      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
      backgroundColor: theme.colors.background,
      color: theme.colors.foreground,
      transition: `border-color ${theme.transitions.duration.normal} ease-in-out, box-shadow ${theme.transitions.duration.normal} ease-in-out`,
      "&:focus": {
        outline: "none",
        border: `2px solid ${theme.colors.primary[500]}`,
        boxShadow: theme.shadows.inner,
        ring: `2px solid ${theme.colors.primary[500]} ring-offset-2`,
        ringOpacity: 0.5,
      },
      "&:hover": {
        borderColor: theme.colors.primary[500],
        boxShadow: theme.shadows.md,
      },
      "&:disabled": {
        backgroundColor: theme.colors.gray[100],
        borderColor: theme.colors.gray[300],
        color: theme.colors.gray[500],
        cursor: "not-allowed",
      },
    };

    if (multiline) {
      return {
        ...baseStyles,
        resize: "vertical",
        minHeight: "120px",
        lineHeight: theme.typography.lineHeight.normal,
      };
    }

    return baseStyles;
  };

  const inputStyles = getInputStyles();
  const labelStyles = {
    display: "block",
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    marginBottom: theme.spacing[1],
  };

  const helperTextStyles = {
    fontSize: theme.typography.fontSize.sm,
    color: error ? theme.colors.error[600] : theme.colors.mutedForeground,
    marginTop: theme.spacing[1],
  };

  const iconStyles = {
    position: "absolute",
    left: theme.spacing[3],
    top: "50%",
    transform: "translateY(-50%)",
    color: theme.colors.mutedForeground,
  };

  const rightIconStyles = {
    ...iconStyles,
    left: "auto",
    right: theme.spacing[3],
  };

  const combinedClassName = `relative ${className}`;

  const inputElement = multiline ? (
    <textarea
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      defaultValue={defaultValue}
      required={required}
      disabled={disabled}
      rows={rows}
      className={combinedClassName}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      style={inputStyles}
    />
  ) : (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      defaultValue={defaultValue}
      required={required}
      disabled={disabled}
      className={combinedClassName}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      style={inputStyles}
    />
  );

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} style={labelStyles}>
          {label}
          {required && (
            <span style={{ color: theme.colors.error[500] }}> *</span>
          )}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {leftIcon && <span style={iconStyles}>{leftIcon}</span>}
        {inputElement}
        {rightIcon && <span style={rightIconStyles}>{rightIcon}</span>}
      </div>
      {helperText && <p style={helperTextStyles}>{helperText}</p>}
    </div>
  );
};

export default Input;
