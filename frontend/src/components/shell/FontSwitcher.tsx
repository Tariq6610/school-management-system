'use client';

import React, { useEffect, useState, useRef } from 'react';

type FontId = 'noto' | 'fraunces' | 'jetbrains' | 'inter';

interface FontOption {
  id: FontId;
  name: string;
}

const fonts: FontOption[] = [
  { id: 'noto', name: 'Noto Sans (Default)' },
  { id: 'inter', name: 'Inter' },
  { id: 'fraunces', name: 'Fraunces' },
  { id: 'jetbrains', name: 'JetBrains Mono' },
];

export function FontSwitcher() {
  const [activeFont, setActiveFont] = useState<FontId>('noto');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load font from local storage on mount
  useEffect(() => {
    // eslint-disable-next-line no-restricted-globals
    const saved = localStorage.getItem('site-font') as FontId | null;
    if (saved && fonts.some(f => f.id === saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveFont(saved);
      document.documentElement.setAttribute('data-font', saved);
    }
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectFont = (fontId: FontId) => {
    setActiveFont(fontId);
    // eslint-disable-next-line no-restricted-globals
    localStorage.setItem('site-font', fontId);
    document.documentElement.setAttribute('data-font', fontId);
    setIsOpen(false);
  };

  const activeFontName = fonts.find(f => f.id === activeFont)?.name || fonts[0].name;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Switch font, current font: ${activeFontName}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-control bg-ink-50 hover:bg-ink-100 border border-ink-200/70 text-xs font-medium text-ink-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
      >
        <span className="font-semibold" aria-hidden="true">Aa</span>
        <span className="truncate max-w-[130px] sm:max-w-[180px]">
          {activeFontName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-ink-500 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Fonts"
          className="absolute right-0 mt-1.5 w-48 rounded-card bg-surface border border-ink-100 shadow-overlay py-1 z-50 animate-in fade-in"
        >
          <div className="px-3 py-1.5 border-b border-ink-100 text-[10px] uppercase font-semibold text-ink-400 tracking-wider">
            Switch Font
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {fonts.map((font) => {
              const isSelected = font.id === activeFont;
              return (
                <button
                  key={font.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectFont(font.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-ink-50 transition-colors ${
                    isSelected ? 'text-primary-700 font-semibold bg-primary-50/50' : 'text-ink-700'
                  }`}
                >
                  <p className="truncate font-medium">{font.name}</p>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-primary-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
