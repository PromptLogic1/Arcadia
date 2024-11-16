import '@testing-library/jest-dom'
import { BalanceService } from '@/components/challenges/bingo-board/services/balance.service'

describe('BalanceService', () => {
    const service = new BalanceService()
    
    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})

