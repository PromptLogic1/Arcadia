import '@testing-library/jest-dom'
import { SessionService } from '@/components/challenges/bingo-board/services/session.service'

describe('SessionService', () => {
    const service = new SessionService()
    
    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})

