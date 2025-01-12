import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState, useCallback } from "react"
import type { BingoCard } from "@/src/store/types/bingocard.types"
import { DIFFICULTIES, CARD_CATEGORIES, Difficulty, CardCategory } from "@/src/store/types/game.types"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface BingoCardEditDialogProps {
  card: BingoCard
  index: number
  isOpen: boolean
  onClose: () => void
  onSave: (index: number, updates: Partial<BingoCard>) => void
}

interface CardForm {
  card_content: string
  card_explanation: string
  card_difficulty: Difficulty
  card_type: CardCategory
  card_tags: string[]
  is_public: boolean
}

export function BingoCardEditDialog({ 
  card, 
  index,
  isOpen, 
  onClose,
  onSave 
}: BingoCardEditDialogProps) {
  const [formData, setFormData] = useState<CardForm>({
    card_content: card.card_content,
    card_explanation: card.card_explanation || '',
    card_difficulty: card.card_difficulty,
    card_type: card.card_type,
    card_tags: card.card_tags || [],
    is_public: card.is_public
  })
  const [fieldErrors, setFieldErrors] = useState<{
    content?: string
    explanation?: string
    tags?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)

  const isNewCard = card.id === ""
  const buttonText = isNewCard ? 'Create Card' : 'Update Card'

  const validateField = useCallback((field: string, value: string | string[] | boolean): string | null => {
    switch (field) {
      case 'card_content':
        if (typeof value === 'string' && (value.length === 0 || value.length > 50)) {
          return 'Content must be between 1 and 50 characters'
        }
        break
      case 'card_explanation':
        if (typeof value === 'string' && value.length > 255) {
          return 'Explanation cannot exceed 255 characters'
        }
        break
      case 'card_tags':
        if (Array.isArray(value) && value.length > 5) {
          return 'Maximum of 5 tags allowed'
        }
        break
    }
    return null
  }, [])

  const updateFormField = useCallback((field: string, value: string | string[] | boolean) => {
    const error = validateField(field, value)
    
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      const key = field.replace('card_', '') as keyof typeof fieldErrors
      
      if (error) {
        newErrors[key] = error
      } else {
        delete newErrors[key]
      }
      return newErrors
    })
    
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [validateField])

  const handleSubmit = async () => {
    try {
      setIsSaving(true)
      await onSave(index, formData)
      onClose()
    } catch (error) {
      console.error('Failed to save card:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle>
            {isNewCard ? "Create New Card" : "Edit Card"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Content
              <span className="text-xs text-gray-400 ml-2">
                ({formData.card_content.length}/50)
              </span>
            </Label>
            <Textarea
              id="content"
              value={formData.card_content}
              onChange={(e) => updateFormField('card_content', e.target.value)}
              placeholder="Click to add a challenge"
              className={cn(
                "min-h-[100px] bg-gray-800/50",
                fieldErrors.content ? "border-red-500/20" : "border-cyan-500/20"
              )}
            />
            {fieldErrors.content && (
              <p className="text-red-400 text-xs">{fieldErrors.content}</p>
            )}
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">
              Explanation (Optional)
              <span className="text-xs text-gray-400 ml-2">
                ({formData.card_explanation.length}/255)
              </span>
            </Label>
            <Textarea
              id="explanation"
              value={formData.card_explanation}
              onChange={(e) => updateFormField('card_explanation', e.target.value)}
              placeholder="Add an explanation for your challenge"
              className={cn(
                "min-h-[100px] bg-gray-800/50",
                fieldErrors.explanation ? "border-red-500/20" : "border-cyan-500/20"
              )}
            />
            {fieldErrors.explanation && (
              <p className="text-red-400 text-xs">{fieldErrors.explanation}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Difficulty */}
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={formData.card_difficulty}
                onValueChange={(value: Difficulty) => 
                  updateFormField('card_difficulty', value)
                }
              >
                <SelectTrigger className="bg-gray-800/50 border-cyan-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-cyan-500">
                  {DIFFICULTIES.map((difficulty) => (
                    <SelectItem 
                      key={difficulty} 
                      value={difficulty}
                      className="capitalize"
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Card Type */}
            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select
                value={formData.card_type}
                onValueChange={(value: CardCategory) => 
                  updateFormField('card_type', value)
                }
              >
                <SelectTrigger className="bg-gray-800/50 border-cyan-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-cyan-500">
                  {CARD_CATEGORIES.map((type) => (
                    <SelectItem 
                      key={type} 
                      value={type}
                      className="capitalize"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags
              <span className="text-xs text-gray-400 ml-2">
                (Comma separated, max 5)
              </span>
            </Label>
            <Input
              id="tags"
              value={formData.card_tags.join(', ')}
              onChange={(e) => updateFormField('card_tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
              placeholder="Enter tags separated by commas..."
              className="bg-gray-800/50 border-cyan-500/20"
            />
          </div>

          {/* Public/Private */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => 
                updateFormField('is_public', checked as boolean)
              }
            />
            <Label htmlFor="is_public">Make this card public</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSaving || Object.keys(fieldErrors).length > 0}
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
          >
            {isSaving ? 'Saving...' : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 