import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  user: {
    email: string
    role: 'ADMIN' | 'INTERVIEWER'
  } | null
  isAuthenticated: boolean
  setAuth: (token: string, user: { email: string; role: 'ADMIN' | 'INTERVIEWER' }) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({
        accessToken: token,
        user,
        isAuthenticated: true,
      }),
      clearAuth: () => set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
