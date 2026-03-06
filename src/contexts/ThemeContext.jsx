import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {darkTheme, lightTheme} from "../theme/index.js";

const ThemeToggleContext = createContext({
    mode: 'dark',
    toggleTheme: () => {},
});

export function useThemeMode() {
    return useContext(ThemeToggleContext);
}

export function AppThemeProvider({ children }) {
    const [mode, setMode] = useState(() => {
        // Persist preference in localStorage
        return localStorage.getItem('theme-mode') || 'dark';
    });

    const toggleTheme = () => {
        setMode(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme-mode', next);
            return next;
        });
    };

    const theme = mode === 'dark' ? darkTheme : lightTheme;

    return (
        <ThemeToggleContext.Provider value={{ mode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeToggleContext.Provider>
    );
}