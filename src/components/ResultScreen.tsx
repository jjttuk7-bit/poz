/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, Share2, RefreshCw, Grid, Sparkles, Check, Clipboard, Image as ImageIcon } from 'lucide-react';
import { PoseTemplate } from '../types';

interface ResultScreenProps {
  capturedPhoto: string;
  pose: PoseTemplate;
  onRetake: () => void;
  onSelectAnother: () => void;
}

export function ResultScreen({ capturedPhoto, pose, onRetake, onSelectAnother }: ResultScreenProps) {
  const [matchScore, setMatchScore] = useState<number>(85);
  const [analyzing, setAnalyzing] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Before/After display toggle:
  // 'both' = side by side or overlay slider
  // 'photo' = only captured photo
  // 'template' = showing pose template
  const [activeTab, setActiveTab] = useState<'photo' | 'template'>('photo');

  // Randomize a premium matching score on mount and run a scan sequence
  useEffect(() => {
    // Generate 75 to 98
    const score = Math.floor(Math.random() * (98 - 75 + 1)) + 75;
    setMatchScore(score);

    // Analyzing laser scan sequence
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 6;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setAnalyzing(false);
      }
      setProgress(currentProgress);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Download logic (canvas toBlob equivalent for dataUrls)
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = capturedPhoto;
    link.download = `POZI_${pose.id}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Web Share or fallback clipboard copy
  const handleCopyLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'POZI 인생샷 매칭 결과',
        text: `POZI 앱에서 '${pose.name}' 포즈를 ${matchScore}% 싱크로율로 완벽하게 따라했습니다!`,
        url: window.location.href,
      }).catch(err => {
        console.warn('Share error:', err);
      });
    } else {
      // Fallback: Copy clipboard
      navigator.clipboard.writeText(`🔥 POZI 앱에서 '${pose.name}' 포즈와 ${matchScore}% 싱크로율 매칭 성공! 완벽 각도로 인생샷 완성!`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine feedback text
  const getFeedback = () => {
    if (matchScore >= 92) {
      return {
        badge: '🏅 월드클래스 싱크',
        color: 'from-amber-400 to-orange-500 text-amber-950',
        text: '인플루언서 뺨치는 완벽한 구도 복제 실력입니다! 각도가 100% 매칭되었습니다. 지금 당장 피드에 기록을 올려 자랑해보세요.'
      };
    } else if (matchScore >= 83) {
      return {
        badge: '⭐ 우수한 포징 수치',
        color: 'from-pink-500 to-purple-600 text-white',
        text: '대단해요! 신체 대칭과 얼굴 각도가 아주 조화롭고 자연스럽게 일치했습니다. 한층 더 업그레이드된 감성 사진이 완생되었어요.'
      };
    } else {
      return {
        badge: '👍 센스 가득한 보디핏',
        color: 'from-emerald-400 to-teal-500 text-neutral-950',
        text: '훌륭한 사진 감각입니다! 프레임 중앙 밸런스는 충분히 어울려요. 팁 가이드를 다시 상기하며 한 번만 번개 스피드로 재도전해보세요!'
      };
    }
  };

  const feedback = getFeedback();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      
      {/* Top action header bar with frosted glass */}
      <header className="px-5 py-3.5 border-b border-white/10 bg-black/45 backdrop-blur-xl flex items-center justify-between shrink-0">
        <h2 className="text-base font-black bg-gradient-to-r from-[#FF6B6B] via-pink-400 to-[#8A2BE2] bg-clip-text text-transparent">
          📸 포즈 분석 보고서
        </h2>
        <span className="text-[10px] text-white/40 tracking-wider font-mono">Captured Result</span>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 [scrollbar-width:none] pb-24">
        
        {/* Before/After visual comparison board with glass bounds */}
        <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden border border-white/10 bg-[#050505]/40 shadow-xl">
          
          {/* Main Visual Render */}
          {activeTab === 'photo' ? (
            <img 
              src={capturedPhoto} 
              alt="My replication snap" 
              className="w-full h-full object-cover"
            />
          ) : (
            // The template gradient with emoji silhouette
            <div 
              className="w-full h-full flex flex-col items-center justify-center relative p-12 transition-all duration-300"
              style={{ background: pose.thumbnailColor }}
            >
              <div className="absolute inset-0 bg-black/30" />
              <span className="text-[140px] z-10 select-none filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]">
                {pose.overlayEmoji}
              </span>
              <div className="z-10 bg-black/60 px-4 py-2 border border-white/5 rounded-full text-xs text-neutral-200 mt-4 pointer-events-none text-center leading-tight">
                <span className="text-[#FF6B6B] font-bold block text-[10px] uppercase tracking-wider">원래 포즈 가이드</span>
                {pose.name}
              </div>
            </div>
          )}

          {/* AI Scanning overlay line if analyzing */}
          {analyzing && (
            <div className="absolute inset-x-0 h-full bg-black/30 top-0 pointer-events-none z-10">
              {/* Glowing Magenta laser */}
              <div 
                className="w-full h-1 bg-gradient-to-r from-transparent via-[#FF6B6B] to-transparent absolute shadow-[0_0_12px_#FF6B6B] opacity-90"
                style={{ 
                  top: `${progress}%`,
                  transition: 'top 0.1s ease-out'
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505]/80 backdrop-blur-md font-sans px-6 gap-3 select-none">
                <div className="w-12 h-12 rounded-full border-4 border-t-[#FF6B6B] border-white/10 animate-spin" />
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-[#FF6B6B] animate-pulse" />
                    AI 보디 매칭 분석하는 중
                  </h3>
                  <p className="text-[10px] text-white/50">골격 수치 및 구도를 대조 연산하고 있습니다.</p>
                  <p className="text-[13px] font-bold text-[#FF6B6B] font-mono mt-1">{progress}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs overlay indicator for Before/After preview toggle */}
          {!analyzing && (
            <div className="absolute top-4 left-4 flex gap-1 bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/10 z-20">
              <button
                onClick={() => setActiveTab('photo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'photo' ? 'bg-[#FF6B6B] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                비포내역
              </button>
              <button
                onClick={() => setActiveTab('template')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'template' ? 'bg-[#8A2BE2] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                가이드
              </button>
            </div>
          )}

          {/* Show the overlay thumbnail floating down right for review */}
          {!analyzing && (
            <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/5 flex items-center gap-1.5 font-mono select-none text-[10px] text-neutral-300">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              오리지날: {pose.overlayEmoji}
            </div>
          )}
        </div>

        {/* AI Performance details board */}
        {!analyzing && (
          <div className="space-y-4">
            {/* Main Score radial badge row with glass frame */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4.5 tracking-tight relative overflow-hidden backdrop-blur-md">
              <div className="absolute -right-3 -bottom-3 text-white/5 select-none text-9xl font-black">
                %
              </div>
              
              {/* Circular Score display */}
              <div className="w-16 h-16 rounded-full border-4 border-[#FF6B6B] flex flex-col items-center justify-center shrink-0 bg-black font-sans shadow-lg shadow-[#FF6B6B]/10">
                <span className="text-xl font-bold text-white leading-none mt-1">{matchScore}</span>
                <span className="text-[9px] text-[#FF6B6B] uppercase font-black tracking-widest">Score</span>
              </div>

              <div className="space-y-1">
                <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r ${feedback.color}`}>
                  {feedback.badge}
                </span>
                <h3 className="text-sm font-bold text-white">{pose.name}</h3>
                <p className="text-xs text-white/60 leading-relaxed max-w-[260px]">
                  {feedback.text}
                </p>
              </div>
            </div>

            {/* Quick action buttons row: Download & Share */}
            <div className="grid grid-cols-2 gap-3 pb-2 select-none">
              <button
                onClick={handleDownload}
                className="py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md backdrop-blur-md"
              >
                <Download className="w-4 h-4 text-[#FF6B6B]" />
                기기에 저장하기
              </button>
              
              <button
                onClick={handleCopyLink}
                className="py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md backdrop-blur-md"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-indigo-400" />}
                {copied ? '링크 복사됨!' : '친구에게 자랑'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Persistent Bottom navigation router buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-[#050505] to-transparent border-t border-white/5 select-none flex gap-3 backdrop-blur-md">
        <button
          onClick={onRetake}
          className="flex-1 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-white/40 animate-spin-slow" />
          다시 촬영
        </button>

        <button
          onClick={onSelectAnother}
          className="flex-1 py-3.5 bg-gradient-to-tr from-[#FF6B6B] to-[#8A2BE2] text-white font-extrabold rounded-xl shadow-lg shadow-[#FF6B6B]/15 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
        >
          <Grid className="w-3.5 h-3.5" />
          다른 포즈 선택
        </button>
      </div>

    </div>
  );
}
