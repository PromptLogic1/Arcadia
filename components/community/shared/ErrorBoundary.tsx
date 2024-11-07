import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <h2 className="text-xl font-bold text-red-500">Something went wrong</h2>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="bg-cyan-500 hover:bg-cyan-600 text-gray-900"
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
} 