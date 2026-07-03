// Global ErrorBoundary — prevents a single component crash from white-screening the entire app.
// (T7/FE-C1). Medical users losing all information sources because one card returned dirty data
// is unacceptable; this renders a friendly fallback and best-effort reports the error.
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Best-effort client error report. Network failures are ignored.
    try {
      void fetch('/api/logs/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          ts: new Date().toISOString()
        })
      }).catch(() => { /* ignore */ });
    } catch {
      /* ignore */
    }
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-bold">页面暂时出错了</h1>
            <p className="text-slate-400 text-sm">
              The application encountered an unexpected error. Your data is safe.
            </p>
            <p className="text-xs text-slate-600">
              您可以刷新页面继续使用。如反复出现，请联系维护者并附上时间戳。
            </p>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded text-white font-medium transition"
            >
              刷新页面 / Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
