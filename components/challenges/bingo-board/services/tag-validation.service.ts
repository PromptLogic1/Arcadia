import type { Tag, TagValidationRules } from '../types/tag-system.types'

export class TagValidationService {
  private rules: TagValidationRules

  constructor(rules?: Partial<TagValidationRules>) {
    this.rules = {
      minLength: 3,
      maxLength: 20,
      allowedCharacters: /^[a-zA-Z0-9\s-_]+$/,
      forbiddenTerms: ['spam', 'test', 'inappropriate'],
      minUsageForVoting: 5,
      minVotesForVerification: 50,
      votingDurationDays: 7,
      ...rules
    }
  }

  validateTag(tag: Tag): boolean {
    return this.validateTagStructure(tag) && this.validateTagRules(tag, this.rules)
  }

  validateTagStructure(tag: unknown): tag is Tag {
    if (!tag || typeof tag !== 'object') return false

    const requiredProps = [
      'id', 'name', 'type', 'category', 'status',
      'description', 'createdAt', 'updatedAt', 'usageCount', 'votes'
    ]

    return requiredProps.every(prop => prop in (tag as Record<string, unknown>))
  }

  validateTagRules(tag: Tag, rules: TagValidationRules): boolean {
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

    // Voting validation
    if (tag.status === 'proposed') {
      const daysSinceCreation = this.getDaysDifference(
        new Date(),
        new Date(tag.createdAt)
      )

      if (daysSinceCreation > rules.votingDurationDays) {
        return false
      }

      if (tag.usageCount < rules.minUsageForVoting) {
        return false
      }
    }

    return true
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date1.getTime() - date2.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
} 