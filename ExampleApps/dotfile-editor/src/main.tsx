import App from './App.tsx'

// Export the component for Viberunner to load
export default App;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_APP__) {
  (window as any).__LOAD_APP__(App);
}