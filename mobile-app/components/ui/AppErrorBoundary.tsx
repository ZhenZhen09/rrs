import React from 'react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error; clearError: () => void }>;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  private clearError = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      const FallbackComponent = this.props.FallbackComponent;
      return <FallbackComponent error={error} clearError={this.clearError} />;
    }

    return this.props.children;
  }
}
