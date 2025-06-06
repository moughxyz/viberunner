import React from "react"
import "./UiButton.css"

interface UiButtonProps {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
}

const UiButton: React.FC<UiButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = "",
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={(e) => onClick?.(e)}
      disabled={disabled}
      className={`ui-button ${className}`}
    >
      {children}
    </button>
  )
}

export default UiButton