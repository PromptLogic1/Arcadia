'use client';

import React, { useState } from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { DialogWrapper } from './shared/DialogWrapper';
import { CommunityGameFilters } from './CommunityGameFilters';

import { Badge } from '@/components/ui/Badge';
import { X } from '@/components/ui/Icons';
import { BaseErrorBoundary } from '@/components/error-boundaries';

interface CreateDiscussionFormProps {
  onClose: () => void;
  onSubmit?: (discussion: {
    title: string;
    content: string;
    game: string;
    challenge_type?: string | null;
    tags?: string[] | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const CreateDiscussionForm: React.FC<CreateDiscussionFormProps> = ({
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!content.trim()) newErrors.content = 'Content is required';
    if (selectedGame === 'All Games')
      newErrors.game = 'Please select a specific game';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isProcessing || isSubmitting) return;

    const formData = {
      title: title.trim(),
      content: content.trim(),
      game: selectedGame,
      challenge_type:
        selectedChallenge === 'All Challenges' ? null : selectedChallenge,
      tags: tags.length > 0 ? tags : null,
    };

    setIsProcessing(true);
    try {
      await onSubmit?.(formData);
      onClose();
    } catch {
      // Error is handled by the mutation hook
      setIsProcessing(false);
    }
  };

  return (
    <DialogWrapper
      open={true}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <BaseErrorBoundary level="component">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-2xl font-bold text-transparent">
            Create Discussion
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Title</label>
            <Input
              placeholder="What's on your mind?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`border-gray-600 bg-gray-700/50 transition-colors focus:border-cyan-500 ${errors.title ? 'border-red-500' : ''}`}
              disabled={isProcessing || isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Game & Challenge Type
            </label>
            <fieldset disabled={isProcessing || isSubmitting}>
              <CommunityGameFilters
                selectedGame={selectedGame}
                selectedChallenge={selectedChallenge}
                onGameChange={setSelectedGame}
                onChallengeChange={setSelectedChallenge}
              />
            </fieldset>
            {errors.game && (
              <p className="text-sm text-red-500">{errors.game}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Content</label>
            <Textarea
              placeholder="Share your thoughts, strategies, or questions..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className={`min-h-[200px] border-gray-600 bg-gray-700/50 transition-colors focus:border-cyan-500 ${errors.content ? 'border-red-500' : ''}`}
              disabled={isProcessing || isSubmitting}
            />
            {errors.content && (
              <p className="text-sm text-red-500">{errors.content}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Tags (max 5)
            </label>
            <Input
              placeholder="Add tags (press Enter or comma to add)"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              disabled={tags.length >= 5 || isProcessing || isSubmitting}
              className="border-gray-600 bg-gray-700/50 transition-colors focus:border-cyan-500"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="group flex items-center gap-1 bg-gray-700/50 px-3 py-1 text-sm"
                >
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer opacity-70 transition-opacity group-hover:opacity-100"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="border-gray-600 bg-gray-700/50 transition-colors hover:bg-gray-600"
              disabled={isProcessing || isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white transition-all hover:from-cyan-600 hover:to-fuchsia-600"
              disabled={isProcessing || isSubmitting}
            >
              {isProcessing || isSubmitting
                ? 'Creating...'
                : 'Create Discussion'}
            </Button>
          </DialogFooter>
        </form>
      </BaseErrorBoundary>
    </DialogWrapper>
  );
};

export default CreateDiscussionForm;
