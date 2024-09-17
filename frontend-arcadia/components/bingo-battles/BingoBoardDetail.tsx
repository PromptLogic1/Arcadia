import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, X, Edit2 } from "lucide-react"

interface BingoBoardDetailProps {
  board: any;
  onClose: () => void;
  onBookmark: () => void;
}

const BingoBoardDetail: React.FC<BingoBoardDetailProps> = ({ board, onClose, onBookmark }) => {
  // ... bestehender Detail-Inhalt ...
  return (
    <div className="space-y-4">
      {/* ... bestehender Detail-Inhalt ... */}
    </div>
  )
}

export default BingoBoardDetail