import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  BookMarked,
  Library,
  Globe,
  Star,
  Plus,
  Eye,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { GeneratorSettings } from './GeneratorControls'
import { useLayout } from '../../hooks/useLayout'

// Export the interface
export interface CellTemplate {
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
  const { isCollapsed, getFluidTypography, getResponsiveSpacing } = useLayout()
  const typography = getFluidTypography(14, 16)
  const spacing = getResponsiveSpacing(16)

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
    <div className={cn(
      "grid gap-4 bg-gray-800/50 rounded-lg border border-cyan-500/20",
      isCollapsed 
        ? "grid-cols-1 p-4" 
        : "grid-cols-[320px,1fr] gap-6 p-6"
    )}>
      
      {/* Left Sidebar */}
      <div className="space-y-4" style={{ gap: spacing.gap }}>
        <Collapsible defaultOpen className="lg:hidden">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 
            bg-gray-700/50 rounded-lg border border-cyan-500/20 text-cyan-300">
            <span className="font-semibold">Generator Settings</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 
              data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <GeneratorSettings
              selectedTypes={selectedTypes}
              difficultyLevels={difficultyLevels}
              onTypeToggle={handleTypeToggle}
              onDifficultyChange={handleDifficultyChange}
              typography={typography}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <GeneratorSettings
            selectedTypes={selectedTypes}
            difficultyLevels={difficultyLevels}
            onTypeToggle={handleTypeToggle}
            onDifficultyChange={handleDifficultyChange}
            typography={typography}
          />
        </div>
      </div>

      {/* Template Library */}
      <div className="space-y-4">
        <Tabs defaultValue={activeTemplateTab} onValueChange={setActiveTemplateTab}
          className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start 
            sm:items-center gap-4 sm:gap-2 mb-4">
            <TabsList className="bg-gray-700/50 border border-cyan-500/30 w-full sm:w-auto">
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
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" size="sm" 
                className="text-cyan-300 flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
              <Button variant="ghost" size="sm" 
                className="text-cyan-300 flex-1 sm:flex-none">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          <TabsContent value="library">
            <ScrollArea className="h-[calc(100vh-300px)] lg:h-[600px] rounded-md 
              border border-cyan-500/20 bg-gray-900/50">
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTemplates.map((template: CellTemplate) => (
                  <div
                    key={template.id}
                    className="p-4 rounded-lg border border-cyan-500/20 bg-gray-800/50 
                      hover:border-cyan-500/40 hover:scale-[1.02] hover:shadow-lg
                      transition-all duration-200 cursor-pointer group
                      backdrop-blur-sm relative overflow-hidden"
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
                    <p className="text-sm text-cyan-100 mb-2 line-clamp-3">{template.text}</p>
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