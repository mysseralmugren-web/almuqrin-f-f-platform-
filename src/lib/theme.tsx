import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Lang = "ar" | "en";

interface ThemeCtx {
  theme: Theme;
  lang: Lang;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("ar");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem("amf-theme") as Theme) || "light";
    const l = (localStorage.getItem("amf-lang") as Lang) || "ar";
    setTheme(t);
    setLangState(l);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    root.setAttribute("lang", lang);
    localStorage.setItem("amf-theme", theme);
    localStorage.setItem("amf-lang", lang);
  }, [theme, lang, hydrated]);

  return (
    <Ctx.Provider
      value={{
        theme,
        lang,
        toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
        setLang: (l) => setLangState(l),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}

// i18n helper
export function useT() {
  const { lang } = useTheme();
  return (ar: string, en: string) => (lang === "ar" ? ar : en);
}
