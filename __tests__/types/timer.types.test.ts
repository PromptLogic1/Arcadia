import '@testing-library/jest-dom'
import type { TimerState } from '@/components/challenges/bingo-board/types/timer.types'

describe('timer.types', () => {
    it('should have correct types defined', () => {
        const mockTimerState: TimerState = {
            time: 300,
            isTimerRunning: false,
            isPaused: false
        }
        expect(mockTimerState).toBeDefined()
    })
})

