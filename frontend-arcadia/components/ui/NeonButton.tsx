import { Button } from "@/components/ui/button"

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const NeonButton: React.FC<NeonButtonProps> = ({ children, className, ...props }) => (
  <Button
    className={`relative overflow-hidden transition-all duration-300 ${className}`}
    {...props}
  >
    <span className="relative z-10 flex items-center">{children}</span>
    <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-500 opacity-50 blur-md transition-opacity duration-300 group-hover:opacity-75"></span>
  </Button>
)

export default NeonButton