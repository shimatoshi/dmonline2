import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", textAlign: "center", color: "#fff", background: "#111", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <h2 style={{ color: "#ff5555" }}>エラーが発生しました</h2>
          <p style={{marginBottom: "20px", color: "#ccc"}}>予期せぬ問題によりアプリが停止しました。</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: "12px 24px", fontSize: "1rem", cursor: "pointer", background: "#007bff", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}
          >
            復帰する（リロード）
          </button>
          <details style={{ marginTop: "30px", textAlign: "left", width: "90%", maxWidth: "600px", background: "#222", padding: "10px", borderRadius: "4px", overflow: "auto", maxHeight: "200px" }}>
            <summary style={{ cursor: "pointer", color: "#aaa" }}>エラー詳細（タップして表示）</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.75rem", color: "#ff8888", marginTop: "10px", fontFamily: "monospace" }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
