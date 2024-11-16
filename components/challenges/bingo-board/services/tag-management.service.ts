import type { Tag, TagValidationRules, TagVote, TagHistory } from '../types/tagsystem.types'

const DEFAULT_VALIDATION_RULES: TagValidationRules = {
  minLength: 3,
  maxLength: 20,
  allowedCharacters: /^[a-zA-Z0-9\s-_]+$/,
  forbiddenTerms: ['spam', 'test', 'inappropriate'],
  minUsageForVoting: 5,
  minVotesForVerification: 50,
  votingDurationDays: 7
}

export class TagManagementService {
  private validationRules: TagValidationRules

  constructor(rules: Partial<TagValidationRules> = {}) {
    this.validationRules = { ...DEFAULT_VALIDATION_RULES, ...rules }
  }

  validateTag(tag: Partial<Tag>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!tag.name) {
      errors.push('Tag name is required')
      return { isValid: false, errors }
    }

    if (tag.name.length < this.validationRules.minLength) {
      errors.push(`Tag name must be at least ${this.validationRules.minLength} characters`)
    }

    if (tag.name.length > this.validationRules.maxLength) {
      errors.push(`Tag name cannot exceed ${this.validationRules.maxLength} characters`)
    }

    if (!this.validationRules.allowedCharacters.test(tag.name)) {
      errors.push('Tag name contains invalid characters')
    }

    if (this.validationRules.forbiddenTerms.some(term => 
      tag.name?.toLowerCase().includes(term))) {
      errors.push('Tag name contains forbidden terms')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  processVote(tag: Tag, vote: TagVote): Tag {
    return {
      ...tag,
      votes: tag.votes + (vote.vote === 'up' ? 1 : -1),
      updatedAt: new Date()
    }
  }

  checkForVerification(tag: Tag): Tag {
    if (tag.status === 'proposed' && 
        tag.votes >= this.validationRules.minVotesForVerification &&
        tag.usageCount >= this.validationRules.minUsageForVoting) {
      return {
        ...tag,
        status: 'verified',
        updatedAt: new Date()
      }
    }
    return tag
  }

  checkForArchival(tag: Tag): Tag {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    if (tag.status === 'active' && 
        tag.updatedAt < threeMonthsAgo && 
        tag.usageCount === 0) {
      return {
        ...tag,
        status: 'archived',
        updatedAt: new Date()
      }
    }
    return tag
  }

  validateTagRules(tag: Tag, rules: TagValidationRules): boolean {
    if (!tag.name) return false

    if (tag.name.length < rules.minLength || 
        tag.name.length > rules.maxLength) {
      return false
    }

    if (!rules.allowedCharacters.test(tag.name)) {
      return false
    }

    if (rules.forbiddenTerms.some(term => 
      tag.name.toLowerCase().includes(term))) {
      return false
    }

    return true
  }

  checkDuplicates(tag: Tag, existingTags: Tag[]): boolean {
    return existingTags.some(existing => 
      existing.id !== tag.id && 
      existing.name.toLowerCase() === tag.name.toLowerCase()
    )
  }

  validateUsage(tag: Tag): boolean {
    return tag.usageCount >= this.validationRules.minUsageForVoting
  }

  validateVoting(tag: Tag): boolean {
    return tag.votes >= this.validationRules.minVotesForVerification
  }

  mergeTagUpdates(tag: Tag, updates: Partial<Tag>): Tag {
    return {
      ...tag,
      ...updates,
      updatedAt: new Date(),
      id: tag.id,
      createdAt: tag.createdAt
    }
  }

  handleTagConflict(tag1: Tag, tag2: Tag): Tag {
    if (tag1.updatedAt > tag2.updatedAt) {
      return tag1
    }
    if (tag1.updatedAt === tag2.updatedAt) {
      return tag1.votes >= tag2.votes ? tag1 : tag2
    }
    return tag2
  }

  createHistoryEntry(tag: Tag, action: TagHistory['action'], changes: Record<string, unknown>): Omit<TagHistory, 'id'> {
    return {
      tagId: tag.id,
      action,
      changes,
      performedBy: tag.createdBy || 'system',
      timestamp: new Date()
    }
  }
} 
