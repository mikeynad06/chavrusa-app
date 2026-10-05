import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // "page" sits inside the main layout (navbar and footer stay); "app" is the last-resort full-screen version.
  variant?: 'page' | 'app';
  // For non-essential pieces (e.g. a banner): render nothing instead of the message.
  silent?: boolean;
}

interface State {
  hasError: boolean;
}

// Catches render errors below it so one broken component shows a friendly message instead of a white screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] A component crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.silent) return null;

    const isApp = this.props.variant === 'app';
    return (
      <div
        role="alert"
        className={
          isApp
            ? 'flex min-h-svh flex-col items-center justify-center bg-bg px-6 text-center'
            : 'mx-auto max-w-[560px] px-6 pb-[84px] pt-16 text-center'
        }
      >
        <h1 className="font-serif text-[clamp(26px,3.4vw,34px)] font-semibold text-ink">
          Something went wrong.
        </h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-ink-muted">
          Reload the page to try again. If it keeps happening, come back in a few minutes.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 rounded-full border border-ink bg-ink px-7 py-[13px] text-[15px] font-semibold text-bg transition-colors hover:border-brass hover:bg-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Reload the page
        </button>
      </div>
    );
  }
}
