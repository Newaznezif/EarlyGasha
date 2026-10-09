/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      let resolved = theme;
      if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }

      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    };

    applyTheme();
    
    if (theme === "system") {
       const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
       const handler = () => applyTheme();
       mediaQuery.addEventListener('change', handler);
       return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Expose toggle shortcuts
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
