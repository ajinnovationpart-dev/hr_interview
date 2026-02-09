import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  user: {
    email: string
    role: 'ADMIN' | 'INTERVIEWER'
  } | null
  isAuthenticated: boolean
  /** localStorage 복원이 끝났는지 (새로고침 후 첫 렌더에서 로그인 유지 판단용) */
  _hasHydrated: boolean
  setAuth: (token: string, user: { email: string; role: 'ADMIN' | 'INTERVIEWER' }) => void
  clearAuth: () => void
  setHasHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
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
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (_state, err) => {
        if (err) return
        useAuthStore.getState().setHasHydrated(true)
      },
    }
  )
)
