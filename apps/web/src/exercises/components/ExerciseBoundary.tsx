import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  onError: () => void;
  children: ReactNode;
}

/** Spec §8: a broken exercise is skipped and logged; the session continues. */
export class ExerciseBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('exercise crashed, skipping it', error, info.componentStack);
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
