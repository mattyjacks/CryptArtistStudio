import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CryptArtist ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-studio-bg text-studio-text p-8">
          <span className="text-5xl mb-4">{"\u{1F480}\u{1F3A8}"}</span>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-studio-muted mb-4 text-center max-w-md">
            CryptArtist Studio encountered an unexpected error. Try refreshing the application.
          </p>
          <pre className="text-[10px] text-studio-red bg-studio-surface p-4 rounded-lg border border-studio-border max-w-lg overflow-auto mb-4">
            {this.state.error?.message}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn btn-accent"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn"
            >
              Reload App
            </button>
          </div>
          <p className="text-[10px] text-studio-muted mt-6">
            Contact: <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a>
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
