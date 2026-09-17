import type React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children?: React.ReactNode;
}

export declare const Button: React.FC<ButtonProps>;
export default Button;
