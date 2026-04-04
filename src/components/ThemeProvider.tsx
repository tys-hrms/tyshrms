import React, { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { branding } = settings;

  useEffect(() => {
    // Inject CSS Variables into :root
    const root = document.documentElement;
    
    // Convert hex to HSL or just use hex (Tailwind can handle hex if configured with vars)
    root.style.setProperty('--color-primary', branding.primary_color);
    root.style.setProperty('--color-secondary', branding.secondary_color);
    root.style.setProperty('--color-accent', branding.accent_color);

    // Handle Dark/Light Mode Class
    if (branding.theme_mode === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [branding]);

  return <>{children}</>;
}
