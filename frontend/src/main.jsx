import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './auth/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

const application = (
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
createRoot(document.getElementById('root')).render(
  googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{application}</GoogleOAuthProvider>
    : application,
)
