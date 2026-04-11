import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProjectProvider } from './context/ProjectContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Emails from './pages/Emails'
import EmailDetail from './pages/EmailDetail'
import Templates from './pages/Templates'
import ConnectEmail from './pages/ConnectEmail'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import DeadLetterQueue from './pages/DeadLetterQueue'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <Layout />
                </ProjectProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="emails" element={<Emails />} />
            <Route path="emails/:emailId" element={<EmailDetail />} />
            <Route path="templates" element={<Templates />} />
            <Route path="connect-email" element={<ConnectEmail />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:jobId" element={<JobDetail />} />
            <Route path="dlq" element={<DeadLetterQueue />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
