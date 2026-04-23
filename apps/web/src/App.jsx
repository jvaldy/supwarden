import './App.css'
import { AppErrorBoundary } from './components/feedback/AppErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppRouter } from './routes/AppRouter.jsx'

function App() {
  return (
    <AuthProvider>
      <AppErrorBoundary>
        <AppRouter />
      </AppErrorBoundary>
    </AuthProvider>
  )
}

export default App
