import { Component } from 'react';
import { EmptyState } from '@/components/common/EmptyState';

const PageCrashMessage = ({ error, onRetry }) => (
  <EmptyState
    title="Something went wrong"
    action={
      <div className="cta cta--center">
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try again
        </button>

        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Reload Shiori
        </button>
      </div>
    }
  >
    This part of Shiori stopped working{error?.message ? `: ${error.message}` : '.'}
  </EmptyState>
);

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { fallback: Fallback = PageCrashMessage, children } = this.props;

    return error ? <Fallback error={error} onRetry={this.retry} /> : children;
  }
}
