/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Wifi, Battery, Signal, Sun, Moon } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

type BgMode = 'dark' | 'light';
const BG_STORAGE_KEY = 'pozi_bg_mode';

export function MobileFrame({ children }: MobileFrameProps) {
  const [time, setTime] = useState('05:20');
  const [bgMode, setBgMode] = useState<BgMode>(() => {
    try {
      const stored = localStorage.getItem(BG_STORAGE_KEY);
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setTime(`${hours}:${minutes} ${ampm}`);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BG_STORAGE_KEY, bgMode);
    } catch (e) {
      console.warn('Failed to persist bg mode', e);
    }
  }, [bgMode]);

  const isLight = bgMode === 'light';

  return (
    <div
      className={`min-h-screen flex items-center justify-center py-0 sm:py-8 px-4 relative overflow-hidden transition-colors duration-500 ${
        isLight
          ? 'bg-gradient-to-br from-[#fdf4ff] via-[#fce7f3] to-[#fef3e2]'
          : 'bg-gradient-to-br from-[#1a1130] via-[#0d0a1f] to-[#1f0e2a]'
      }`}
    >
      {/* Background Mesh Gradients - opacity differs by mode */}
      <div
        className={`absolute top-[-8%] left-[-8%] w-[520px] h-[520px] bg-[#FF6B6B] rounded-full blur-[140px] pointer-events-none transition-opacity duration-500 ${
          isLight ? 'opacity-[0.22]' : 'opacity-[0.32]'
        }`}
      />
      <div
        className={`absolute top-[30%] left-[-15%] w-[360px] h-[360px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-500 ${
          isLight ? 'bg-violet-400 opacity-[0.20]' : 'bg-indigo-500 opacity-[0.26]'
        }`}
      />
      <div
        className={`absolute bottom-[-8%] right-[-8%] w-[520px] h-[520px] bg-[#8A2BE2] rounded-full blur-[140px] pointer-events-none transition-opacity duration-500 ${
          isLight ? 'opacity-[0.18]' : 'opacity-[0.34]'
        }`}
      />
      <div
        className={`absolute top-[55%] right-[-10%] w-[300px] h-[300px] bg-pink-500 rounded-full blur-[100px] pointer-events-none transition-opacity duration-500 ${
          isLight ? 'opacity-[0.22]' : 'opacity-[0.18]'
        }`}
      />

      {/* Theme toggle — only visible on sm+ where the phone sits centered with margin */}
      <button
        type="button"
        onClick={() => setBgMode((m) => (m === 'dark' ? 'light' : 'dark'))}
        aria-label={isLight ? '다크 배경으로 전환' : '라이트 배경으로 전환'}
        title={isLight ? '다크 배경으로 전환' : '라이트 배경으로 전환'}
        className={`hidden sm:flex fixed top-5 right-5 z-50 items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold backdrop-blur-xl border transition-all duration-300 active:scale-95 ${
          isLight
            ? 'bg-white/70 border-black/10 text-neutral-700 hover:bg-white/90 shadow-md shadow-pink-300/30'
            : 'bg-white/10 border-white/15 text-white/85 hover:bg-white/15 shadow-lg shadow-black/30'
        }`}
      >
        {isLight ? (
          <>
            <Moon className="w-3.5 h-3.5" strokeWidth={2.2} />
            다크
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5" strokeWidth={2.2} />
            라이트
          </>
        )}
      </button>

      {/* Device wrapper — interior always dark for app's dark theme */}
      <div
        id="zozi-mobile-wrapper"
        className={`w-full max-w-[430px] h-[100vh] sm:h-[840px] bg-[#070510]/95 text-white rounded-none sm:rounded-[48px] overflow-hidden relative border-0 sm:border-[6px] flex flex-col transition-all duration-500 backdrop-blur-3xl ${
          isLight
            ? 'border-white/80 shadow-[0_30px_80px_-12px_rgba(120,80,180,0.35),0_0_0_1px_rgba(0,0,0,0.08)] ring-1 sm:ring-2 ring-black/[0.05]'
            : 'border-neutral-700/60 shadow-[0_30px_80px_-12px_rgba(255,107,107,0.25),0_0_0_1px_rgba(255,255,255,0.06)] ring-1 sm:ring-2 ring-white/[0.08]'
        }`}
      >
        {/* Dynamic Status Bar */}
        <div className="h-11 px-6 bg-black/60 backdrop-blur-md flex items-center justify-between text-[13px] font-medium tracking-tight select-none z-50 border-b border-white/5">
          <div className="flex items-center gap-1">
            <span className="font-mono text-neutral-300">{time}</span>
          </div>

          {/* Speaker Notch */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-32 h-[18px] bg-black/80 rounded-b-2xl flex items-center justify-center shrink-0 hidden sm:flex">
            <div className="w-12 h-1 bg-neutral-800 rounded-full" />
          </div>

          <div className="flex items-center gap-1.5 text-neutral-300">
            <Signal className="w-4 h-4 stroke-[1.8]" />
            <Wifi className="w-4 h-4 stroke-[1.8]" />
            <div className="flex items-center gap-0.5">
              <Battery className="w-5 h-5 stroke-[1.8]" />
            </div>
          </div>
        </div>

        {/* Dynamic App Shell Inner Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-transparent">
          {/* Internal blurred background accent */}
          <div className="absolute top-[20%] left-[-10%] w-[250px] h-[250px] bg-[#FF6B6B] rounded-full blur-[80px] opacity-[0.12] pointer-events-none"></div>
          <div className="absolute bottom-[20%] right-[-10%] w-[250px] h-[250px] bg-[#8A2BE2] rounded-full blur-[80px] opacity-[0.12] pointer-events-none"></div>

          <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
            {children}
          </div>
        </div>

        {/* Home Bottom Indicator Bar */}
        <div className="h-4 bg-[#050505]/80 backdrop-blur-md flex items-center justify-center pb-2 z-50 select-none border-t border-white/5">
          <div className="w-32 h-1 bg-neutral-700/80 rounded-full" />
        </div>
      </div>
    </div>
  );
}
