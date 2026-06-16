import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { reportError } from "@/lib/errorReporting";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors in the page tree so a single broken component
 * shows a recoverable error card instead of blanking the whole SPA. Errors are
 * reported (see errorReporting) before falling back to the UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { scope: "ErrorBoundary", componentStack: info.componentStack });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="container-page py-20">
          <ErrorState
            title="Une erreur est survenue"
            message="Cette page n'a pas pu s'afficher correctement. Réessayez ou rechargez la page."
            onRetry={this.handleReset}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
