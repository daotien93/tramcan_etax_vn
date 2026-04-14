import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type ThemeMode = 'light' | 'dark'

type ThemeModeContextValue = {
  mode: ThemeMode
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  toggleMode: () => undefined,
})

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem('theme-mode')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    window.localStorage.setItem('theme-mode', mode)
  }, [mode])

  const toggleMode = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))

  const themeConfig = useMemo(
    () => ({
      algorithm:
        mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    }),
    [mode],
  )

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ConfigProvider locale={viVN} theme={themeConfig}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeModeContext)
}
