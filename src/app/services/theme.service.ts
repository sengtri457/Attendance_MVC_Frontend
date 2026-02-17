import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  darkMode = signal<boolean>(false);

  constructor() {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.darkMode.set(savedTheme === 'dark');
    } else {
        // Optional: Check system preference
        // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // this.darkMode.set(prefersDark);
    }

    // Effect to update body class and local storage when signal changes
    effect(() => {
      const isDark = this.darkMode();
      if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  toggleTheme() {
    this.darkMode.update(val => !val);
  }

  isDark() {
    return this.darkMode();
  }
}
