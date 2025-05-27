import type { Tag, TagValidationRules } from '../types/tagsystem.types'
import { TAG_SYSTEM } from '../types/tagsystem.constants'

export class TagValidationService {
  private rules: TagValidationRules

  constructor(rules?: Partial<TagValidationRules>) {
    this.rules = {
      minLength: TAG_SYSTEM.VALIDATION.MIN_LENGTH,
      maxLength: TAG_SYSTEM.VALIDATION.MAX_LENGTH,
      allowedCharacters: TAG_SYSTEM.VALIDATION.ALLOWED_CHARACTERS,
      forbiddenTerms: [...TAG_SYSTEM.VALIDATION.FORBIDDEN_TERMS],
      minUsageForVoting: TAG_SYSTEM.LIMITS.MIN_USAGE_FOR_VOTING,
      minVotesForVerification: TAG_SYSTEM.LIMITS.MIN_VOTES_FOR_VERIFICATION,
      votingDurationDays: TAG_SYSTEM.LIMITS.VOTING_DURATION_DAYS,
      ...rules
    }
  }

  validateTag(tag: Tag): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!tag.name || tag.name.length < 3) {
      errors.push('Tag name must be at least 3 characters')
    }

    if (tag.name?.toLowerCase().includes('spam')) {
      errors.push('Tag name contains forbidden terms')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validateTagStructure(tag: unknown): tag is Tag {
    if (!tag || typeof tag !== 'object') return false

    const requiredProps = [
      'id', 'name', 'type', 'category', 'status',
      'description', 'createdAt', 'updatedAt', 'usageCount', 'votes'
    ]

    const hasRequiredProps = requiredProps.every(prop => prop in (tag as Record<string, unknown>))
    if (!hasRequiredProps) return false

    // Validiere Category-Struktur
    const tagObj = tag as Tag
    if (!this.validateCategoryStructure(tagObj.category)) return false

    // Validiere Typen
    return (
      typeof tagObj.name === 'string' &&
      typeof tagObj.description === 'string' &&
      typeof tagObj.usageCount === 'number' &&
      typeof tagObj.votes === 'number' &&
      tagObj.createdAt instanceof Date &&
      tagObj.updatedAt instanceof Date &&
      this.isValidTagType(tagObj.type) &&
      this.isValidTagStatus(tagObj.status)
    )
  }

  private validateCategoryStructure(category: unknown): boolean {
    if (!category || typeof category !== 'object') return false

    const requiredProps = ['id', 'name', 'isRequired', 'allowMultiple', 'validForGames']
    const hasRequiredProps = requiredProps.every(prop => prop in (category as Record<string, unknown>))
    if (!hasRequiredProps) return false

    const cat = category as Tag['category']
    return (
      typeof cat.id === 'string' &&
      this.isValidCategoryName(cat.name) &&
      typeof cat.isRequired === 'boolean' &&
      typeof cat.allowMultiple === 'boolean' &&
      Array.isArray(cat.validForGames) &&
      cat.validForGames.every(game => typeof game === 'string')
    )
  }

  private isValidTagType(type: unknown): type is Tag['type'] {
    return typeof type === 'string' && ['core', 'game', 'community'].includes(type)
  }

  private isValidTagStatus(status: unknown): status is Tag['status'] {
    return typeof status === 'string' && 
           ['active', 'proposed', 'verified', 'archived', 'suspended'].includes(status)
  }

  private isValidCategoryName(name: unknown): name is Tag['category']['name'] {
    const validNames = [
      'difficulty',
      'timeInvestment',
      'primaryCategory',
      'gamePhase',
      'requirements',
      'playerMode',
      'custom'
    ]
    return typeof name === 'string' && validNames.includes(name)
  }

  validateTagRules(tag: Tag, rules: TagValidationRules): boolean {
    // Name-Validierung
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

    // Status-spezifische Validierung
    if (tag.status === 'proposed') {
      const daysSinceCreation = this.getDaysDifference(
        new Date(),
        tag.createdAt
      )

      if (daysSinceCreation > rules.votingDurationDays) {
        return false
      }

      if (tag.usageCount < rules.minUsageForVoting) {
        return false
      }
    }

    // Kategorie-spezifische Validierung
    if (tag.category.isRequired && !tag.category.name) {
      return false
    }

    return true
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date1.getTime() - date2.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
} 