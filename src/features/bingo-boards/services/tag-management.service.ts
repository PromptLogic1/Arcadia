import type {
  Database,
  Tag,
  TagVote,
  TagHistory,
  TagStatus,
  Json,
  TagAction,
} from '@/types';
import { TagValidationService as _TagValidationService } from './tag-validation.service';
import { logger as _logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase';

// Type aliases for compatibility (unused imports prefixed with _)
type _Database = Database;
type _TagVote = TagVote;
type _TagHistory = TagHistory;

const validationRules = {
  minLength: 2,
  maxLength: 30,
  maxTagsPerItem: 8,
  forbiddenTerms: ['spam', 'test', 'undefined', 'null', 'admin', 'moderator'],
  requiredFormat: /^[a-zA-Z0-9\s\-_]+$/,
  allowedCategories: [],
};

export class TagManagementService {
  private validationRules = validationRules;
  private supabase = createClient();

  async createTag(tagData: Partial<Tag>): Promise<Tag> {
    const validation = this.validateTagCreation(tagData);
    if (!validation.isValid) {
      throw new Error(`Tag validation failed: ${validation.errors.join(', ')}`);
    }

    if (!tagData.name) {
      throw new Error('Tag name is required after validation');
    }

    const { data, error } = await this.supabase
      .from('tags')
      .insert({
        name: tagData.name,
        type: tagData.type || 'community',
        category: tagData.category || null,
        status: 'proposed' as TagStatus,
        description: tagData.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
        votes: 0,
        created_by: null,
        game: null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private validateTagCreation(tag: Partial<Tag>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!tag.name) {
      errors.push('Tag name is required');
      return { isValid: false, errors };
    }

    if (tag.name.length < this.validationRules.minLength) {
      errors.push(
        `Tag name must be at least ${this.validationRules.minLength} characters`
      );
    }

    if (tag.name.length > this.validationRules.maxLength) {
      errors.push(
        `Tag name cannot exceed ${this.validationRules.maxLength} characters`
      );
    }

    if (!this.validationRules.requiredFormat.test(tag.name)) {
      errors.push('Tag name contains invalid characters');
    }

    const tagName = tag.name;
    if (
      tagName &&
      this.validationRules.forbiddenTerms.some(term =>
        tagName.toLowerCase().includes(term)
      )
    ) {
      errors.push('Tag name contains forbidden terms');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async voteOnTag(
    tagId: string,
    userId: string,
    voteType: 'up' | 'down'
  ): Promise<Tag> {
    // Record the vote
    await this.supabase.from('tag_votes').insert({
      tag_id: tagId,
      user_id: userId,
      vote: voteType,
      created_at: new Date().toISOString(),
    });

    // Update tag vote count
    const { data: tag, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (error || !tag) throw error || new Error('Tag not found');

    const voteChange = voteType === 'up' ? 1 : -1;
    const newVoteCount = (tag.votes || 0) + voteChange;

    const { data: updatedTag, error: updateError } = await this.supabase
      .from('tags')
      .update({
        votes: newVoteCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tagId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedTag;
  }

  async getTagsByStatus(status: TagStatus): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async autoModerateTag(tag: Tag): Promise<Tag | null> {
    // Simple auto-moderation based on votes
    if (tag.status === 'proposed' && (tag.votes || 0) >= 5) {
      const { data, error } = await this.supabase
        .from('tags')
        .update({
          status: 'active' as TagStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tag.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Archive tags with negative votes
    if ((tag.votes || 0) <= -3) {
      const { data, error } = await this.supabase
        .from('tags')
        .update({
          status: 'archived' as TagStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tag.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    return null;
  }

  async logTagChange(
    tagId: string,
    action: TagAction,
    changes: Json | null,
    performedBy: string
  ): Promise<void> {
    await this.supabase.from('tag_history').insert({
      tag_id: tagId,
      action: action,
      changes,
      performed_by: performedBy,
      created_at: new Date().toISOString(),
    });
  }
}
