"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")

  const applyTheme = useCallback((next: Theme) => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    if (next === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("theme")
    const initial =
      stored === "light" || stored === "dark" ? (stored as Theme) : getSystemTheme()
    applyTheme(initial)
    setThemeState(initial)
  }, [applyTheme])

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next)
      if (typeof window !== "undefined") {
        window.localStorage.setItem("theme", next)
      }
      applyTheme(next)
    },
    [applyTheme]
  )

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      if (typeof window !== "undefined") {
        window.localStorage.setItem("theme", next)
      }
      applyTheme(next)
      return next
    })
  }, [applyTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

