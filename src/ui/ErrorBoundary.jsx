import { Component } from "react"

/** Keeps a crash inside one page from blanking the whole dashboard. Reset by changing `resetKey`. */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  componentDidCatch(error, info) {
    console.error(error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-lg font-semibold text-rose-800">This page failed to load</p>
        <p className="mt-2 text-sm text-rose-700">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Try again
        </button>
      </div>
    )
  }
}
