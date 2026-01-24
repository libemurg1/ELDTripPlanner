import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import TripPlannerPage from './pages/TripPlannerPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import './App.css'

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 transition-all duration-500">
          <Navbar />
          <main className="animate-fade-in">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/plan" element={<TripPlannerPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App