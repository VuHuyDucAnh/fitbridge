import { Component } from "react";

/**
 * Catches render-time errors anywhere in the tree so a runtime fault shows a
 * recoverable message instead of a white screen. Intentionally self-contained
 * (no context/i18n hooks) so it can render even if a provider is what failed.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface for debugging; a real deployment would forward this to logging.
    console.error("FitBridge crashed:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "var(--bg, #f7f7f5)",
          color: "var(--ink, #1a1a18)",
          fontFamily:
            "'Be Vietnam Pro', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div
            style={{
              margin: "0 auto 20px",
              width: "56px",
              height: "56px",
              display: "grid",
              placeItems: "center",
              borderRadius: "16px",
              background: "var(--accent, #ff5a1f)",
              color: "#fff",
              fontSize: "28px",
              fontWeight: 800,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 8px" }}>
            Something broke on our end
          </h1>
          <p style={{ opacity: 0.7, lineHeight: 1.6, margin: "0 0 24px" }}>
            The app hit an unexpected error. Reloading usually fixes it — your
            training data is safe in your account.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              height: "48px",
              padding: "0 28px",
              borderRadius: "12px",
              border: "none",
              background: "var(--accent, #ff5a1f)",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload FitBridge
          </button>
        </div>
      </div>
    );
  }
}
