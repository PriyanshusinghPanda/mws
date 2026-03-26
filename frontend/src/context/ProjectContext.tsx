import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../lib/api'
import { useAuth } from './AuthContext'

interface Project {
  id: string
  name: string
}

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  setCurrentProject: (p: Project) => void
  loadProjects: () => Promise<void>
  smtpConnected: boolean
  checkSmtp: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [smtpConnected, setSmtpConnected] = useState(false)

  useEffect(() => {
    if (isAuthenticated) loadProjects()
  }, [isAuthenticated])

  useEffect(() => {
    if (currentProject) checkSmtp()
  }, [currentProject])

  const loadProjects = async () => {
    try {
      const res = await api.get('/api/projects')
      setProjects(res.data)
      // auto select first project if none selected
      if (res.data.length > 0 && !currentProject) {
        setCurrentProject(res.data[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const checkSmtp = async () => {
    if (!currentProject) return
    try {
      const res = await api.get(`/api/smtp/${currentProject.id}`)
      setSmtpConnected(res.data && res.data.is_verified)
    } catch {
      setSmtpConnected(false)
    }
  }

  return (
    <ProjectContext.Provider value={{
      projects, currentProject, setCurrentProject, loadProjects,
      smtpConnected, checkSmtp,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider')
  return ctx
}
