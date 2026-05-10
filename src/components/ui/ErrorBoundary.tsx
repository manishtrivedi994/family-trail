import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ft-bg flex items-center justify-center px-4">
          <div className="bg-ft-bg3 border border-ft-border rounded-2xl p-8 w-full max-w-sm text-center">
            <p className="font-display text-2xl font-bold text-ft-text mb-2">Something went wrong</p>
            <p className="text-ft-text3 text-sm mb-6 leading-relaxed">
              An unexpected error occurred. Please reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="border border-ft-border2 text-ft-v200 rounded-2xl px-6 py-2.5 text-sm font-medium hover:bg-ft-border hover:border-ft-border3 transition-all"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
