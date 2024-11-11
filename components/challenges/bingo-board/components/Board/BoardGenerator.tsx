import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  BookMarked,
  Library,
  Globe,
  Star,
  Plus,
  Filter,
  Shuffle,
  Download,
  Upload,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CellTemplate {
  id: string
  text: string
  type: 'pvp' | 'pve' | 'quest' | 'achievement'
  difficulty: 'normal' | 'hard' | 'extreme'
  tags: string[]
  source: 'official' | 'community' | 'personal'
  favorited?: boolean
}

interface BoardGeneratorProps {
  onApplyTemplate: (template: CellTemplate) => void
  onPreview?: () => void
}

const CHALLENGE_TYPES = [
  { id: 'pve', label: 'PvE', color: 'green' },
  { id: 'pvp', label: 'PvP', color: 'red' },
  { id: 'quest', label: 'Quest', color: 'blue' },
  { id: 'achievement', label: 'Achievement', color: 'purple' },
] as const

// Beispiel-Templates als Konstante
const EXAMPLE_TEMPLATES: CellTemplate[] = [
  {
    id: '1',
    text: 'Defeat a World Boss',
    type: 'pve',
    difficulty: 'hard',
    tags: ['combat', 'group'],
    source: 'official'
  },
  {
    id: '2',
    text: 'Win a Battleground',
    type: 'pvp',
    difficulty: 'normal',
    tags: ['combat', 'pvp'],
    source: 'official'
  },
  {
    id: '3',
    text: 'Complete a Daily Quest',
    type: 'quest',
    difficulty: 'normal',
    tags: ['daily', 'solo'],
    source: 'official'
  },
  {
    id: '4',
    text: 'Earn a Rare Achievement',
    type: 'achievement',
    difficulty: 'extreme',
    tags: ['rare', 'challenge'],
    source: 'official'
  }
]

export const BoardGenerator: React.FC<BoardGeneratorProps> = ({
  onApplyTemplate,
  onPreview: _onPreview
}) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['pve', 'pvp']))
  const [difficultyLevels, setDifficultyLevels] = useState({
    normal: 3,
    hard: 2,
    extreme: 1
  })
  const [activeTemplateTab, setActiveTemplateTab] = useState('library')

  // Filtere Templates basierend auf ausgewählten Typen
  const filteredTemplates = EXAMPLE_TEMPLATES.filter(template => 
    selectedTypes.has(template.type)
  )

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => {
      const newTypes = new Set(prev)
      if (newTypes.has(type)) {
        if (newTypes.size > 1) { // Ensure at least one type remains selected
          newTypes.delete(type)
        }
      } else {
        newTypes.add(type)
      }
      return newTypes
    })
  }

  const handleDifficultyChange = (diff: string, newValue: number[]) => {
    setDifficultyLevels(prev => ({
      ...prev,
      [diff]: newValue[0]
    }))
  }

  return (
    <div className="grid grid-cols-[320px,1fr] gap-6 p-6 bg-gray-800/50 rounded-lg border border-cyan-500/20">
      {/* Linke Seitenleiste */}
      <div className="space-y-8">
        {/* Challenge Type Selection */}
        <div className="space-y-4">
          <Label className="text-base font-semibold text-cyan-300">Challenge Types</Label>
          <div className="grid grid-cols-1 gap-3">
            {CHALLENGE_TYPES.map(type => (
              <div
                key={type.id}
                className={cn(
                  "flex items-center p-3 rounded-lg border transition-all",
                  "hover:bg-gray-700/30 cursor-pointer",
                  selectedTypes.has(type.id)
                    ? `border-${type.color}-500/30 bg-${type.color}-500/10`
                    : "border-gray-700/50 bg-gray-800/30"
                )}
                onClick={() => handleTypeToggle(type.id)}
              >
                <Checkbox
                  checked={selectedTypes.has(type.id)}
                  className={cn(
                    "mr-3",
                    `data-[state=checked]:bg-${type.color}-500 
                     data-[state=checked]:border-${type.color}-500`
                  )}
                />
                <span className={cn(
                  "text-sm font-medium",
                  selectedTypes.has(type.id)
                    ? `text-${type.color}-400`
                    : "text-gray-400"
                )}>
                  {type.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="space-y-4">
          <Label className="text-base font-semibold text-cyan-300">Difficulty Levels</Label>
          {Object.entries(difficultyLevels).map(([diff, value]) => (
            <div key={diff} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={cn(
                  "font-medium",
                  diff === 'normal' ? "text-cyan-300" :
                  diff === 'hard' ? "text-amber-300" :
                  "text-red-300"
                )}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </span>
                <span className="text-gray-400">Level {value}</span>
              </div>
              <Slider
                defaultValue={[value]}
                min={0}
                max={5}
                step={1}
                onValueChange={(newValue) => handleDifficultyChange(diff, newValue)}
                className={cn(
                  "[&>span]:transition-colors",
                  diff === 'normal' ? "[&>span]:bg-cyan-500" :
                  diff === 'hard' ? "[&>span]:bg-amber-500" :
                  "[&>span]:bg-red-500"
                )}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>None</span>
                <span>Maximum</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 h-11"
            onClick={() => {}}
          >
            <Shuffle className="w-5 h-5 mr-2" />
            Generate Board
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="border-cyan-500/30 text-cyan-300 h-11"
            >
              <Download className="w-5 h-5 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              className="border-cyan-500/30 text-cyan-300 h-11"
            >
              <Upload className="w-5 h-5 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Template Library */}
      <div className="space-y-4">
        <Tabs defaultValue={activeTemplateTab} onValueChange={setActiveTemplateTab}>
          <TabsList className="bg-gray-700/50 border border-cyan-500/30">
            <TabsTrigger 
              value="library"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
            >
              <Library className="w-4 h-4 mr-2" />
              Library
            </TabsTrigger>
            <TabsTrigger 
              value="community"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
            >
              <Globe className="w-4 h-4 mr-2" />
              Community
            </TabsTrigger>
            <TabsTrigger 
              value="favorites"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
            >
              <Star className="w-4 h-4 mr-2" />
              Favorites
            </TabsTrigger>
            <TabsTrigger 
              value="personal"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
            >
              <BookMarked className="w-4 h-4 mr-2" />
              Personal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-cyan-300">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <span className="text-sm text-cyan-300">
                  {filteredTemplates.length} templates
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-cyan-300">
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
                <Button variant="ghost" size="sm" className="text-cyan-300">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px] rounded-md border border-cyan-500/20 bg-gray-900/50">
              <div className="p-4 grid grid-cols-2 gap-4">
                {filteredTemplates.map((template: CellTemplate) => (
                  <div
                    key={template.id}
                    className="p-4 rounded-lg border border-cyan-500/20 bg-gray-800/50 
                      hover:border-cyan-500/40 transition-colors cursor-pointer group"
                    onClick={() => onApplyTemplate(template)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        {
                          'bg-red-500/20 text-red-400': template.type === 'pvp',
                          'bg-green-500/20 text-green-400': template.type === 'pve',
                          'bg-blue-500/20 text-blue-400': template.type === 'quest',
                          'bg-purple-500/20 text-purple-400': template.type === 'achievement',
                        }
                      )}>
                        {template.type.toUpperCase()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Toggle favorite
                        }}
                      >
                        <Star className="w-4 h-4 text-cyan-300" />
                      </Button>
                    </div>
                    <p className="text-sm text-cyan-100 mb-2">{template.text}</p>
                    <div className="flex flex-wrap gap-1">
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
            </ScrollArea>
          </TabsContent>
          <TabsContent value="community">
            {/* ... Community Content ... */}
          </TabsContent>
          <TabsContent value="favorites">
            {/* ... Favorites Content ... */}
          </TabsContent>
          <TabsContent value="personal">
            {/* ... Personal Content ... */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 