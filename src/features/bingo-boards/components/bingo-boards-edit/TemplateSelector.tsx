'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Shuffle, 
  RefreshCw, 
  Eye,
  Zap,
  Crown,
  Target,
  Star
} from 'lucide-react';
import { getTemplateCards, getDiverseTemplates, type TemplateCard } from '../../data/templates';
import type { GameCategory } from '@/types';

interface TemplateSelectorProps {
  gameType: GameCategory;
  onApplyTemplate: (templates: TemplateCard[]) => void;
  onRegenerateGrid: () => void;
  currentTemplateCount: number;
}

const CATEGORY_ICONS = {
  beginner: <Target className="h-4 w-4" />,
  common: <Star className="h-4 w-4" />,
  advanced: <Zap className="h-4 w-4" />,
  expert: <Crown className="h-4 w-4" />,
};

const CATEGORY_COLORS = {
  beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
  common: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  advanced: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  expert: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function TemplateSelector({ 
  gameType, 
  onApplyTemplate, 
  onRegenerateGrid,
  currentTemplateCount 
}: TemplateSelectorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('mixed');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplates, setPreviewTemplates] = useState<TemplateCard[]>([]);

  const handleGenerateTemplate = () => {
    let templates: TemplateCard[];
    
    if (selectedDifficulty === 'mixed') {
      templates = getDiverseTemplates(gameType, 25);
    } else {
      // For specific difficulty, we'll get all templates and filter
      const allTemplates = getTemplateCards(gameType, 50);
      const filtered = allTemplates.filter(t => t.templateCategory === selectedDifficulty);
      templates = filtered.slice(0, 25);
      
      // Fill remaining with mixed if not enough
      if (templates.length < 25) {
        const remaining = getDiverseTemplates(gameType, 25 - templates.length);
        templates.push(...remaining);
      }
    }
    
    onApplyTemplate(templates);
  };

  const handlePreview = () => {
    const templates = selectedDifficulty === 'mixed' 
      ? getDiverseTemplates(gameType, 25)
      : getTemplateCards(gameType, 50)
          .filter(t => t.templateCategory === selectedDifficulty)
          .slice(0, 25);
    
    setPreviewTemplates(templates);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-purple-300">Template System</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {currentTemplateCount}/25 filled
        </Badge>
      </div>

      {/* Template Controls */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-purple-200">Generate Template Grid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Difficulty Selector */}
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Template Difficulty</label>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="bg-gray-800/50 border-purple-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed Difficulty (Recommended)</SelectItem>
                <SelectItem value="beginner">Beginner Only</SelectItem>
                <SelectItem value="common">Common Only</SelectItem>
                <SelectItem value="advanced">Advanced Only</SelectItem>
                <SelectItem value="expert">Expert Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(CATEGORY_ICONS).map(([category, icon]) => {
              const allTemplates = getTemplateCards(gameType, 50);
              const count = allTemplates.filter((t: TemplateCard) => t.templateCategory === category).length;
              return (
                <div key={category} className="flex items-center gap-2 text-gray-400">
                  {icon}
                  <span className="capitalize">{category}:</span>
                  <span className="text-gray-300">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateTemplate}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              size="sm"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Apply Template
            </Button>
            
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 hover:bg-purple-500/10"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <TemplatePreviewDialog templates={previewTemplates} />
            </Dialog>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-purple-500/20 pt-3 space-y-2">
            <Button
              onClick={onRegenerateGrid}
              variant="outline"
              size="sm"
              className="w-full border-gray-600/30 hover:bg-gray-700/30"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle Current Templates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatePreviewDialog({ templates }: { templates: TemplateCard[] }) {
  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Template Preview ({templates.length} cards)
        </DialogTitle>
        <DialogDescription>
          Preview of template cards that will be applied to your board
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {templates.map((template, index) => (
          <Card key={index} className="border-gray-700/50">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <Badge 
                  variant="outline" 
                  className={cn('text-xs', CATEGORY_COLORS[template.templateCategory])}
                >
                  {CATEGORY_ICONS[template.templateCategory]}
                  <span className="ml-1 capitalize">{template.templateCategory}</span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {template.difficulty}
                </Badge>
              </div>
              
              <h4 className="font-medium text-sm mb-1 text-gray-200">
                {template.title}
              </h4>
              
              {template.description && (
                <p className="text-xs text-gray-400 mb-2">
                  {template.description}
                </p>
              )}
              
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </DialogContent>
  );
}