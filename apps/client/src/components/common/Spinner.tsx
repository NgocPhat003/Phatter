import { Loader2 } from "lucide-react";
import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: number;
  text?: string;
  inline?: boolean;
  className?: string;
  color?: string;
}

export const Spinner = ({
  size = 28,
  text,
  inline = false,
  className = "",
  color,
}: SpinnerProps) => {
  return (
    <div
      className={`${inline ? styles.inlineWrapper : styles.spinnerWrapper} ${className}`}
    >
      <Loader2
        size={size}
        className={styles.spinIcon}
        style={color ? { color } : undefined}
      />
      {text && <span>{text}</span>}
    </div>
  );
};
