import '@testing-library/jest-dom'
import { TagValidationService } from '@/components/challenges/bingo-board/services/tag-validation.service'

describe('TagValidationService', () => {
    const service = new TagValidationService()
    
    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})

