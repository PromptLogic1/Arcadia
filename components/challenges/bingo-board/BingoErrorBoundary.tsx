import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class BingoErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h3 className="text-xl font-semibold text-red-400">
            Something went wrong with the bingo game
          </h3>
          <p className="text-gray-400 mt-2">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      )
    }

    return this.props.children
  }
} 