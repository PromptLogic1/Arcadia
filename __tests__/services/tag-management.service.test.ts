import '@testing-library/jest-dom'
import { TagManagementService } from '@/components/challenges/bingo-board/services/tag-management.service'

describe('TagManagementService', () => {
    const service = new TagManagementService()
    
    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})

