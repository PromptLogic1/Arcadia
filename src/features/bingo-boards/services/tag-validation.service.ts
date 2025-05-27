import type { Tag, TagStatus, TagType, TagCategory } from '@/types'

// Simple validation rules interface using centralized types
interface TagValidationRules {
  minLength: number
  maxLength: number
  maxTagsPerItem: number
  forbiddenTerms: string[]
  requiredFormat?: RegExp
  allowedCategories: string[]
}

export class TagValidationService {
  private rules: TagValidationRules

  constructor(rules?: Partial<TagValidationRules>) {
    this.rules = {
      minLength: 2,
      maxLength: 30,
      maxTagsPerItem: 8,
      forbiddenTerms: ['spam', 'test', 'undefined', 'null', 'admin', 'moderator'],
      requiredFormat: /^[a-zA-Z0-9\s\-_]+$/,
      allowedCategories: [],
      ...rules
    }
  }

  validateTag(tag: Tag): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!tag.name || tag.name.length < this.rules.minLength) {
      errors.push(`Tag name must be at least ${this.rules.minLength} characters`)
    }

    if (tag.name && tag.name.length > this.rules.maxLength) {
      errors.push(`Tag name cannot exceed ${this.rules.maxLength} characters`)
    }

    if (tag.name && this.rules.requiredFormat && !this.rules.requiredFormat.test(tag.name)) {
      errors.push('Tag name contains invalid characters')
    }

    if (tag.name && this.rules.forbiddenTerms.some(term => 
      tag.name.toLowerCase().includes(term.toLowerCase()))) {
      errors.push('Tag name contains forbidden terms')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validateTagStructure(tag: unknown): tag is Tag {
    if (!tag || typeof tag !== 'object') return false

    const tagObj = tag as Tag
    
    // Check required database fields using centralized types
    return (
      typeof tagObj.id === 'string' &&
      typeof tagObj.name === 'string' &&
      typeof tagObj.description === 'string' &&
      typeof tagObj.created_at === 'string' &&
      typeof tagObj.updated_at === 'string' &&
      this.isValidTagType(tagObj.type) &&
      this.isValidTagStatus(tagObj.status)
    )
  }

  private isValidTagType(type: unknown): type is TagType {
    return typeof type === 'string' && ['core', 'game', 'community'].includes(type)
  }

  private isValidTagStatus(status: unknown): status is TagStatus {
    return typeof status === 'string' && 
           ['active', 'proposed', 'verified', 'archived', 'suspended'].includes(status)
  }

  validateTagRules(tag: Tag): boolean {
    // Basic validation using database field names
    if (tag.name.length < this.rules.minLength || 
        tag.name.length > this.rules.maxLength) {
      return false
    }

    if (this.rules.requiredFormat && !this.rules.requiredFormat.test(tag.name)) {
      return false
    }

    if (this.rules.forbiddenTerms.some(term => 
      tag.name.toLowerCase().includes(term))) {
      return false
    }

    return true
  }
} 