import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface CreateDiscussionFormProps {
  onClose: () => void;
}

const CreateDiscussionForm: React.FC<CreateDiscussionFormProps> = ({ onClose }) => (
  <Dialog open={true} onOpenChange={onClose}>
    <DialogContent className="bg-gray-800 text-cyan-100">
      {/* ... bestehender Dialog-Inhalt ... */}
    </DialogContent>
  </Dialog>
)

export default CreateDiscussionForm