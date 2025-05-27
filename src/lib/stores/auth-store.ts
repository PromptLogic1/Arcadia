import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { AuthUser, UserData } from './types'
import { logger } from '@/src/lib/logger'
import { notifications } from '@/src/lib/notifications'

export interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  error?: Error;
  needsVerification?: boolean;
}

interface UpdateUserDataParams {
  username?: string
  full_name?: string
  bio?: string
  land?: string
  region?: string
  city?: string
}

interface PasswordChecks {
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  length: boolean;
}

interface AuthState {
  // State
  authUser: AuthUser | null
  userData: UserData | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null

  // Basic Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAuthUser: (user: AuthUser) => void
  setUserData: (userData: UserData) => void
  clearUser: () => void
  updateUserData: (updates: Partial<UserData>) => void

  // Service Methods
  initializeApp: () => Promise<void>
  setupAuthListener: () => { data: { subscription: unknown } }
  signIn: (credentials: SignInCredentials) => Promise<AuthResponse>
  signInWithOAuth: (provider: 'google') => Promise<AuthResponse>
  signUp: (params: { email: string; password: string; username: string }) => Promise<AuthResponse>
  signOut: () => Promise<AuthResponse>
  refreshUserData: () => Promise<unknown>
  updateUserDataService: (userId: string, updates: UpdateUserDataParams) => Promise<unknown>
  updateEmail: (newEmail: string) => Promise<void>
  updatePassword: (password: string) => Promise<AuthResponse>
  resetPassword: (newPassword: string) => Promise<AuthResponse>
  resetPasswordForEmail: (email: string) => Promise<AuthResponse>
  checkPasswordRequirements: (password: string) => PasswordChecks
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        authUser: null,
        userData: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        // Basic Actions
        setLoading: (loading) =>
          set({ loading }, false, 'auth/setLoading'),

        setError: (error) =>
          set({ error }, false, 'auth/setError'),

        setAuthUser: (authUser) =>
          set(
            { authUser, isAuthenticated: true, error: null },
            false,
            'auth/setAuthUser'
          ),

        setUserData: (userData) =>
          set({ userData, error: null }, false, 'auth/setUserData'),

        clearUser: () =>
          set(
            {
              authUser: null,
              userData: null,
              isAuthenticated: false,
              error: null,
            },
            false,
            'auth/clearUser'
          ),

        updateUserData: (updates) => {
          const { userData } = get()
          if (userData) {
            set(
              { userData: { ...userData, ...updates } },
              false,
              'auth/updateUserData'
            )
          }
        },

        // Service Methods
        initializeApp: async () => {
          try {
            get().setLoading(true)
            
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            
            // If no user or error, just clear the store and return
            if (!user || authError) {
              get().clearUser()
              return
            }
              // Only fetch user data if we have an authenticated user
              const { data: userData, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', user.id)
                .single()

              if (dbError) throw dbError

              // Update store with user data
              get().setAuthUser({
                id: user.id,
                email: user.email ?? null,
                phone: user.phone ?? null,
                auth_username: user.user_metadata?.username ?? null,
                provider: user.app_metadata?.provider ?? null,
                userRole: (userData?.role as 'user' | 'admin' | 'moderator' | 'premium') ?? 'user'
              })

              // Update Userdata with proper null handling
              get().setUserData({
                id: userData.id,
                username: userData.username,
                full_name: userData.full_name,
                avatar_url: userData.avatar_url,
                role: userData.role,
                experience_points: userData.experience_points ?? 0,
                land: userData.land,
                region: userData.region,
                city: userData.city,
                bio: userData.bio,
                last_login_at: userData.last_login_at,
                created_at: userData.created_at ?? new Date().toISOString(),
                achievements_visibility: userData.achievements_visibility ?? 'public',
                auth_id: userData.auth_id ?? user.id,
                profile_visibility: userData.profile_visibility ?? 'public',
                submissions_visibility: userData.submissions_visibility ?? 'public',
                updated_at: userData.updated_at
              })

          } catch (error) {
            logger.error('Auth initialization failed', error as Error, { metadata: { store: 'AuthStore' } })
            get().clearUser()
          } finally {
            get().setLoading(false)
          }
        },

        setupAuthListener: () => {
          return supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              await get().initializeApp()
            }
            
            if (event === 'SIGNED_OUT') {
              get().clearUser()
            }
          })
        },

        signIn: async ({ email, password }: SignInCredentials): Promise<AuthResponse> => {
          try {
            get().setLoading(true)
            
            const { error } = await supabase.auth.signInWithPassword({
              email: email,
              password: password
            })

            if (error) {
              return { 
                error: new Error(error.message)
              }
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
              return { error: new Error('No user data received') }
            }

            await get().initializeApp()
            
            return {}
          } catch (error) {
            return { error: error as Error }
          } finally {
            get().setLoading(false)
          }
        },

        signInWithOAuth: async (provider: 'google'): Promise<AuthResponse> => {
          try {
            const { error } = await supabase.auth.signInWithOAuth({
              provider,
              options: {
                redirectTo: `${window.location.origin}/auth/oauth-success`,
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent'
                }
              }
            })

            if (error) {
              return { error: new Error(error.message) }
            }

            return {}
          } catch (error) {
            return { error: error as Error }
          }
        },

        signUp: async ({ email, password, username }: { 
          email: string; 
          password: string; 
          username: string; 
        }): Promise<AuthResponse> => {
          try {
            const { error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username,
                },
                emailRedirectTo: `${window.location.origin}/auth/oauth-success`
              }
            })

            if (error) {
              return { error: new Error(error.message) }
            }

            const { data: { user } } = await supabase.auth.getUser()
            
            if (user?.identities?.length === 0) {
              return { error: new Error('Account with this email already exists') }
            }

            if (!user?.confirmed_at) {
              return { needsVerification: true }
            }

            return {}
          } catch (error) {
            return { error: error as Error }
          }
        },

        signOut: async (): Promise<AuthResponse> => {
          try {
            get().setLoading(true)
            const { error } = await supabase.auth.signOut()
            
            if (error) {
              logger.error('Sign out failed', error as Error, { metadata: { store: 'AuthStore' } })
              notifications.error('Sign out failed', { description: 'Please try again or contact support.' })
              return { error: error as Error }
            }

            // Clear the user data from store
            get().clearUser()

            // Let the router handle navigation
            window.location.href = '/'

            return {}
          } catch (error) {
            logger.error('Sign out failed', error as Error, { metadata: { store: 'AuthStore' } })
            notifications.error('Sign out failed', { description: 'Please try again or contact support.' })
            return { error: error as Error }
          } finally {
            get().setLoading(false)
          }
        },

        refreshUserData: async () => {
          try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            
            if (!user || authError) {
              throw new Error(authError?.message || 'No user found')
            }

            const { data: userData, error: dbError } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', user.id)
              .single()

            if (dbError) throw dbError

            // Update store with user data
            get().setUserData({
              id: userData.id,
              username: userData.username,
              full_name: userData.full_name,
              avatar_url: userData.avatar_url,
              role: userData.role,
              experience_points: userData.experience_points ?? 0,
              land: userData.land,
              region: userData.region,
              city: userData.city,
              bio: userData.bio,
              last_login_at: userData.last_login_at,
              created_at: userData.created_at ?? new Date().toISOString(),
              achievements_visibility: userData.achievements_visibility ?? 'public',
              auth_id: userData.auth_id,
              profile_visibility: userData.profile_visibility ?? 'public',
              submissions_visibility: userData.submissions_visibility ?? 'public',
              updated_at: userData.updated_at
            })

            return userData
          } catch (error) {
            logger.error('Failed to refresh user data', error as Error, { metadata: { store: 'AuthStore' } })
            throw error
          }
        },

        updateUserDataService: async (userId: string, updates: UpdateUserDataParams) => {
          try {
            const { data, error } = await supabase
              .from('users')
              .update(updates)
              .eq('id', userId)
              .select()
              .single()

            if (error) throw error

            // Update store with the returned data
            get().setUserData({
              id: data.id,
              username: data.username,
              full_name: data.full_name,
              avatar_url: data.avatar_url,
              role: data.role,
              experience_points: data.experience_points ?? 0,
              land: data.land,
              region: data.region,
              city: data.city,
              bio: data.bio,
              last_login_at: data.last_login_at,
              created_at: data.created_at ?? new Date().toISOString(),
              achievements_visibility: data.achievements_visibility ?? 'public',
              auth_id: data.auth_id,
              profile_visibility: data.profile_visibility ?? 'public',
              submissions_visibility: data.submissions_visibility ?? 'public',
              updated_at: data.updated_at
            })
            notifications.success('Profile updated successfully!')
            logger.info('User data updated successfully', { metadata: { store: 'AuthStore', userId } })
            return data
          } catch (error) {
            logger.error('Failed to update user data', error as Error, { metadata: { store: 'AuthStore', userId, updates } })
            notifications.error('Failed to update profile', { description: 'Please try again or contact support.' })
            throw error
          }
        },

        updateEmail: async (newEmail: string): Promise<void> => {
          try {
            const { error } = await supabase.auth.updateUser({
              email: newEmail
            })

            if (error) throw error
            notifications.success('Email updated successfully! Please check your inbox to verify the new email.')
            logger.info('User email updated successfully', { metadata: { store: 'AuthStore', newEmail } })
          } catch (error) {
            logger.error('Failed to update email', error as Error, { metadata: { store: 'AuthStore', newEmail } })
            notifications.error('Failed to update email', { description: 'Please try again or contact support.' })
            throw error
          }
        },

        updatePassword: async (password: string): Promise<AuthResponse> => {
          try {
            // First check if password meets requirements
            const checks = get().checkPasswordRequirements(password)
            if (!Object.values(checks).every(Boolean)) {
              return { 
                error: new Error('Password does not meet all requirements') 
              }
            }

            const { error } = await supabase.auth.updateUser({ password })

            if (error) {
              // Handle error cases
              let errorMessage = error.message || 'Failed to update password'
              switch (error.message) {
                case 'New password should be different from the old password':
                  errorMessage = 'Your new password must be different from your current password'
                  break
                case 'Auth session missing!':
                  errorMessage = 'Your session has expired. Please log in again'
                  break
              }
              logger.warn('Password update failed', { metadata: { store: 'AuthStore', supabaseError: error.message } })
              notifications.error('Password update failed', { description: errorMessage })
              return { error: new Error(errorMessage) }
            }
            notifications.success('Password updated successfully!')
            logger.info('Password updated successfully', { metadata: { store: 'AuthStore' } })
            return {}
          } catch (error) {
            logger.error('Password update failed with unexpected error', error as Error, { metadata: { store: 'AuthStore' } })
            notifications.error('Password update failed', { description: 'An unexpected error occurred. Please try again.' })
            return { 
              error: error instanceof Error 
                ? error 
                : new Error('An unexpected error occurred while updating your password') 
            }
          }
        },

        resetPassword: async (newPassword: string): Promise<AuthResponse> => {
          try {
            const checks = get().checkPasswordRequirements(newPassword)
            if (!Object.values(checks).every(Boolean)) {
              return { error: new Error('Password does not meet all requirements') }
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword })

            if (error) {
              logger.warn('Password reset failed', { metadata: { store: 'AuthStore', supabaseError: error.message } })
              notifications.error('Password reset failed', { description: error.message || 'Please try again.' })
              return { 
                error: error instanceof Error 
                  ? error 
                  : new Error('Failed to reset password') 
              }
            }
            notifications.success('Password reset successfully!')
            logger.info('Password reset successfully', { metadata: { store: 'AuthStore' } })
            return {}
          } catch (error) {
            logger.error('Password reset failed with unexpected error', error as Error, { metadata: { store: 'AuthStore' } })
            notifications.error('Password reset failed', { description: 'An unexpected error occurred. Please try again.' })
            return { 
              error: error instanceof Error 
                ? error 
                : new Error('An unexpected error occurred while resetting your password') 
            }
          }
        },

        resetPasswordForEmail: async (email: string): Promise<AuthResponse> => {
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth/reset-password`
            })

            if (error) {
              logger.warn('Requesting password reset for email failed', { metadata: { store: 'AuthStore', email, supabaseError: error.message } })
              notifications.error('Failed to send password reset email', { description: error.message || 'Please try again.' })
              return { error: new Error(error.message) }
            }
            notifications.success('Password reset email sent!', { description: 'Please check your inbox for instructions.' })
            logger.info('Password reset email sent successfully', { metadata: { store: 'AuthStore', email } })
            return {}
          } catch (error) {
            logger.error('Requesting password reset for email failed with unexpected error', error as Error, { metadata: { store: 'AuthStore', email } })
            notifications.error('Failed to send password reset email', { description: 'An unexpected error occurred. Please try again.' })
            return { 
              error: error instanceof Error 
                ? error 
                : new Error('An unexpected error occurred while resetting your password') 
            }
          }
        },

        checkPasswordRequirements: (password: string): PasswordChecks => {
          return {
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
            length: password.length >= 8,
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          authUser: state.authUser,
          userData: state.userData,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// Selectors for better performance
export const useAuth = () => useAuthStore((state) => ({
  authUser: state.authUser,
  userData: state.userData,
  isAuthenticated: state.isAuthenticated,
  loading: state.loading,
  error: state.error,
}))

export const useAuthActions = () => useAuthStore((state) => ({
  setLoading: state.setLoading,
  setError: state.setError,
  setAuthUser: state.setAuthUser,
  setUserData: state.setUserData,
  clearUser: state.clearUser,
  updateUserData: state.updateUserData,
  // Service methods
  initializeApp: state.initializeApp,
  setupAuthListener: state.setupAuthListener,
  signIn: state.signIn,
  signInWithOAuth: state.signInWithOAuth,
  signUp: state.signUp,
  signOut: state.signOut,
  refreshUserData: state.refreshUserData,
  updateUserDataService: state.updateUserDataService,
  updateEmail: state.updateEmail,
  updatePassword: state.updatePassword,
  resetPassword: state.resetPassword,
  resetPasswordForEmail: state.resetPasswordForEmail,
  checkPasswordRequirements: state.checkPasswordRequirements,
})) 