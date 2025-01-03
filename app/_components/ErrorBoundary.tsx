'use client'

import React, { type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('Error caught by boundary:', error)
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Oops! Something went wrong.</h1>
            <p className="mb-4">We are sorry for the inconvenience. Please try refreshing the page or contact support if the problem persists.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}