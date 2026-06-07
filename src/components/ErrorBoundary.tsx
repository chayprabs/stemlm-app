import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isExtensionContextInvalidatedError } from '@/src/lib/extension-context';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  extensionInvalidated: boolean;
}

/**
 * Catches render errors in the shadow-root app so one bad formula/diagram does
 * not unmount the entire stemLM overlay.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, extensionInvalidated: false };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      extensionInvalidated: isExtensionContextInvalidatedError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isExtensionContextInvalidatedError(error)) {
      console.warn('[stemLM] extension context invalidated — refresh the page', info.componentStack);
      return;
    }
    console.error('[stemLM] panel render error', error, info.componentStack);
  }

  private retry = () => {
    if (this.state.extensionInvalidated) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, extensionInvalidated: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.extensionInvalidated) {
        return (
          <div className="slm-error-fallback" role="alert">
            <p>stemLM was updated. Refresh this page to keep using the panel.</p>
            <button type="button" className="slm-btn slm-btn-soft" onClick={this.retry}>
              Refresh page
            </button>
          </div>
        );
      }
      return (
        <div className="slm-error-fallback" role="alert">
          <p>stemLM hit a display error. Your sessions are still saved.</p>
          <button type="button" className="slm-btn slm-btn-soft" onClick={this.retry}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
