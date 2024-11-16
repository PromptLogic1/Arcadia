import '@testing-library/jest-dom'
import { BoardGeneratorService } from '@/components/challenges/bingo-board/services/board-generator.service'

describe('BoardGeneratorService', () => {
    const service = new BoardGeneratorService()
    
    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})

