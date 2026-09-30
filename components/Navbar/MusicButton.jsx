"use client";

import React, { useEffect, useState } from 'react'

// Sun / moon glyphs match the rest of the navbar's stroked SVG style.
const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: '0.4rem' }}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: '0.4rem' }}
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// This used to be the EN/AR language toggle. It's now repurposed as the
// site-wide theme switcher: the button reads/writes the active theme on
// `document.documentElement` (the same attribute the no-flash bootstrap
// script in `app/layout.js` sets on first paint), and persists the user's
const ThemeButton = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncTheme = () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      setTheme(current);
    };
    syncTheme();

    window.addEventListener('theme-change', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('theme-change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next;
      document.documentElement.classList.toggle('dark', next === 'dark');
      window.dispatchEvent(new CustomEvent('theme-change', { detail: next }));
    }
    try {
      localStorage.setItem('theme', next);
    } catch (e) {
      // localStorage may be unavailable (private mode, etc.)
    }
  };

  const isDark = theme === 'dark';
  const label = isDark ? 'DARK' : 'LIGHT';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      aria-pressed={isDark}
      className='nav_btn_lg nav_btn_light flex items-center justify-center hover:bg-brblue hover:text-white py-6 cursor-pointer transition-colors duration-200'
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      {label}
    </button>
  );
};

export default ThemeButton;
