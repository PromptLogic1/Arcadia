'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wand2, Save, Trash2 } from 'lucide-react'
import { DifficultySelector } from './DifficultySelector'
import { TagSelector } from './TagSelector'
import { GeneratorControls } from './GeneratorControls'
import { useGameState } from '../../hooks/useGameState'
import { useBoardGenerator } from '../../hooks/useBoardGenerator'
import { cn } from '@/lib/utils'
import type { Template } from '../../types/generator.types'

interface BoardGeneratorProps {
  onApplyTemplate: (template: Template) => void
}

export const BoardGenerator: React.FC<BoardGeneratorProps> = ({
  onApplyTemplate
}) => {
  const { settings } = useGameState()
  const [customText, setCustomText] = useState('')
  
  // Use the correct game type
  const _boardGenerator = useBoardGenerator('All Games')

  // Create local state for generator settings
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [generatedTemplates, setGeneratedTemplates] = useState<Template[]>([])

  // Handle template generation
  const handleGenerate = useCallback(async () => {
    try {
      // Generate templates locally for now
      const newTemplates: Template[] = Array(Math.pow(settings.boardSize, 2))
        .fill(null)
        .map((_, i) => ({
          id: `template-${Date.now()}-${i}`,
          text: `Generated Template ${i + 1}`,
          tags: selectedTags,
          difficulty,
          source: 'generated',
          createdAt: new Date().toISOString()
        }))
      setGeneratedTemplates(newTemplates)
    } catch (error) {
      console.error('Failed to generate templates:', error)
    }
  }, [selectedTags, difficulty, settings.boardSize])

  // Handle custom template addition
  const handleAddCustomTemplate = useCallback(() => {
    if (!customText.trim()) return

    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      text: customText.trim(),
      tags: selectedTags,
      difficulty,
      source: 'custom',
      createdAt: new Date().toISOString()
    }

    setGeneratedTemplates(prev => [...prev, newTemplate])
    setCustomText('')
  }, [customText, selectedTags, difficulty])

  return (
    <div className="space-y-6">
      {/* Generator Controls */}
      <Card className="bg-gray-800/95 backdrop-blur-sm border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-cyan-400">
            Board Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tag Selection */}
          <TagSelector
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />

          {/* Difficulty Selection */}
          <DifficultySelector
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
          />

          {/* Custom Template Input */}
          <div className="flex gap-2">
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Add custom template..."
              className="flex-1"
            />
            <Button
              onClick={handleAddCustomTemplate}
              disabled={!customText.trim()}
              variant="outline"
              size="icon"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>

          {/* Generator Controls */}
          <GeneratorControls
            onGenerate={handleGenerate}
            disabled={selectedTags.length === 0}
          />
        </CardContent>
      </Card>

      {/* Generated Templates */}
      <Card className="bg-gray-800/95 backdrop-blur-sm border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-cyan-400">
            Generated Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedTemplates.map((template: Template) => (
              <div
                key={template.id}
                className={cn(
                  "p-4 rounded-lg",
                  "bg-gray-700/50",
                  "border border-cyan-500/20",
                  "hover:border-cyan-500/40",
                  "transition-colors duration-200",
                  "group"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-300 flex-1">
                    {template.text}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onApplyTemplate(template)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                    {template.source === 'custom' && (
                      <Button
                        onClick={() => setGeneratedTemplates(prev => 
                          prev.filter(t => t.id !== template.id)
                        )}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 