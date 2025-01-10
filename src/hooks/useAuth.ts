import { useCallback } from 'react'
import { useAppSelector } from '../store/hooks'
import { authService as services } from '../store/services/auth-service'
import { 
  selectIsAuthenticated, 
  selectAuthUser, 
  selectUserRole, 
  selectUserData 
} from '../store/selectors'
import { SignInCredentials } from '../store/services/auth-service'

export const useAuth = () => {  
  // Selectors
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const authUser = useAppSelector(selectAuthUser)
  const userRole = useAppSelector(selectUserRole)
  const userData = useAppSelector(selectUserData)

  // Service methods wrapped in hooks
  const signIn = useCallback(async (credentials: SignInCredentials) => {
    return services.signIn(credentials)
  }, [])

  const signOut = useCallback(async () => {
    return services.signOut()
  }, [])

  return {
    isAuthenticated,
    authUser,
    userRole,
    userData,
    signIn,
    signOut,
  }
} 