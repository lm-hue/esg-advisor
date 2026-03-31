import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface AuthGuardProps {
  user: any
  children: ReactNode
}

export default function AuthGuard({ user, children }: AuthGuardProps) {
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
