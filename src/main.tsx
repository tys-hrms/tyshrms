import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Root ErrorBoundary to catch and display crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ef4444', backgroundColor: '#0f172a', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Application Crash</h2>
          <pre style={{ background: '#1e293b', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {this.state.error?.message || 'Unknown Error'}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#2d7cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
