/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Star, Users, Flame, Info, CheckCircle2, Lightbulb, Sparkles, Heart } from 'lucide-react';
import { PoseTemplate } from '../types';

interface DetailScreenProps {
  pose: PoseTemplate;
  onBack: () => void;
  onStartCamera: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export function DetailScreen({ pose, onBack, onStartCamera, isFavorited, onToggleFavorite }: DetailScreenProps) {
  // Render difficulty star rating
  const renderDifficultyStars = () => {
    const totalStars = 3;
    let filled = 1;
    if (pose.difficulty === 'medium') filled = 2;
    if (pose.difficulty === 'hard') filled = 3;

    return (
      <div className="flex gap-1">
        {Array.from({ length: totalStars }).map((_, index) => (
          <Star
            key={index}
            className={`w-4 h-4 ${
              index < filled ? 'fill-pink-500 text-pink-500' : 'text-neutral-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Top action header bar with frosted glass */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-black/45 backdrop-blur-xl border-b border-white/10 absolute top-0 left-0 right-0 z-20">
        <button
          onClick={onBack}
          className="p-2 bg-white/5 rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-semibold text-white/80 tracking-wide font-sans">포즈 레시피 상세</span>

        <button
          onClick={onToggleFavorite}
          className="p-2 bg-white/5 rounded-full border border-white/10 text-white hover:text-rose-500 transition-colors cursor-pointer backdrop-blur-md"
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-500 text-rose-500 border-rose-500' : ''}`} />
        </button>
      </header>

      {/* Main content scroll container */}
      <div className="flex-1 overflow-y-auto pb-24 pt-16 [scrollbar-width:none]">
        {/* Large Pose Header Card with gorgeous Unsplash photo and translucent silhouette outline overlay */}
        <div className="h-80 w-full relative flex items-center justify-center overflow-hidden bg-zinc-950 border-b border-white/10 shrink-0 select-none">
          {pose.imageUrl ? (
            <img
              referrerPolicy="no-referrer"
              src={pose.imageUrl}
              alt={pose.name}
              className="w-full h-full object-cover opacity-90 transition-transform duration-[1000ms] hover:scale-105"
            />
          ) : (
            <div 
              className="w-full h-full opacity-40"
              style={{ background: pose.thumbnailColor }}
            />
          )}

          {/* Graduated dark shadow overlay vignette for premium typography contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/30 to-black/10" />

          {/* Centralized super elegant SVG vector silhouette overlay on the photo */}
          {pose.silhouettePath && (
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10 opacity-75">
              <svg
                viewBox="0 0 200 200"
                className="w-48 h-48 drop-shadow-[0_0_15px_rgba(255,107,107,0.85)] filter"
              >
                <path
                  d={pose.silhouettePath}
                  fill="none"
                  stroke="#FF6B6B"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-pulse"
                />
              </svg>
            </div>
          )}

          {/* Styled Emoji Float */}
          <span className="absolute top-20 right-5 bg-black/60 border border-white/10 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider text-white capitalize backdrop-blur-md flex items-center gap-1 z-10 shadow-lg">
            <span className="text-sm">{pose.overlayEmoji}</span> Mood Pose
          </span>

          {/* Category Chip */}
          <span className="absolute bottom-4 left-4 bg-black/65 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider text-pink-400 capitalize backdrop-blur-md z-10 shadow-lg">
            #{pose.category === 'couples' ? '커플' : pose.category === 'solo' ? '솔로' : pose.category === 'group' ? '그룹' : pose.category === 'travel' ? '여행' : '트렌딩'}
          </span>

          {/* Match popularity overlay info */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/65 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md z-10 shadow-lg">
            <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse" />
            <span className="text-zinc-200">선호도 {pose.popularity}%</span>
          </div>
        </div>

        {/* Core Pose Details Panel */}
        <div className="p-6 space-y-6">
          {/* Heading block */}
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white line-clamp-2">
              {pose.name}
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              {pose.description}
            </p>
          </div>

          {/* Quick specs grid */}
          <div className="grid grid-cols-2 gap-3 pb-2">
            <div className="bg-white/5 border border-white/10 p-4.5 rounded-2xl flex flex-col justify-center space-y-1 backdrop-blur-md">
              <span className="text-[9px] text-white/40 font-semibold tracking-widest uppercase">
                권장 인원
              </span>
              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                <Users className="w-4 h-4 text-[#FF6B6B]" />
                <span>{pose.personCount === 'group' ? '3인 이상' : `${pose.personCount}인 촬영`}</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4.5 rounded-2xl flex flex-col justify-center space-y-1 backdrop-blur-md">
              <span className="text-[9px] text-white/40 font-semibold tracking-widest uppercase">
                구도 난이도
              </span>
              <div className="flex items-center gap-2">
                {renderDifficultyStars()}
              </div>
            </div>
          </div>

          {/* Section: Alignment checklist */}
          <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 space-y-3.5 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white/60 flex items-center gap-1.5 uppercase tracking-wide">
              <Info className="w-4 h-4 text-[#FF6B6B]" /> 몸 정렬 가이드 라인
            </h3>
            <ul className="space-y-2.5">
              {pose.guidePoints.map((point, index) => (
                <li key={index} className="flex gap-2.5 items-start text-xs text-white/80 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B6B] shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section: Professional tips */}
          <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 space-y-3.5 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white/60 flex items-center gap-1.5 uppercase tracking-wide">
              <Lightbulb className="w-4 h-4 text-amber-400 animate-pulse" /> 인플루언서 촬영 꿀팁
            </h3>
            <ul className="space-y-2.5">
              {pose.tips.map((tip, index) => (
                <li key={index} className="flex gap-2.5 items-start text-xs text-white/80 leading-relaxed">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tag and meta list */}
          <div className="flex flex-wrap gap-1.5">
            {pose.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-white/5 border border-white/10 text-white/50 px-3 py-1 rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action CTA Box */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-[#050505] to-transparent border-t border-white/5">
        <button
          onClick={onStartCamera}
          className="w-full py-4 bg-gradient-to-tr from-[#FF6B6B] to-[#8A2BE2] hover:from-[#FF6B6B]/90 hover:to-[#8A2BE2]/90 text-white font-extrabold rounded-2xl shadow-xl shadow-[#FF6B6B]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          <Sparkles className="w-4.5 h-4.5 transform animate-spin-slow" />
          포즈 가이드 시작하기
        </button>
      </div>
    </div>
  );
}
