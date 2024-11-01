import { useState, useEffect, useCallback } from 'react'

export const useTimer = (initialTime: number, onTimeEnd: () => void) => {
  const [time, setTime] = useState<number>(initialTime)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined
    if (isTimerRunning && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => prevTime - 1)
      }, 1000)
    } else if (time === 0 && isTimerRunning) {
      onTimeEnd()
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isTimerRunning, time, onTimeEnd])

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  return {
    time,
    setTime,
    isTimerRunning,
    setIsTimerRunning,
    formatTime,
  }
}