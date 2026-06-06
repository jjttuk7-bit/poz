/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Heart, Flame, Users, Sparkles, SlidersHorizontal, BookOpen, UploadCloud, Loader2, ArrowUpRight } from 'lucide-react';
import { PoseTemplate, PoseCategory } from '../types';
import { PoseCategoriesList, mockPoses } from '../data';

interface BrowseScreenProps {
  onSelectPose: (pose: PoseTemplate) => void;
  favorites: string[];
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  customPoses: PoseTemplate[];
  onAddCustomPose: (pose: PoseTemplate) => void;
}

export function BrowseScreen({ onSelectPose, favorites, onToggleFavorite, customPoses, onAddCustomPose }: BrowseScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  // AI Pose extraction states
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "AI가 사진 속 인물 구도를 분석하고 있어요...",
    "동작 실루엣 윤곽선을 섬세하게 추출하는 중...",
    "겹치기 촬영용 투명 오버레이를 디자인하고 있어요...",
    "대세 사진을 완성할 황금 구도 꿀팁을 빌드하는 중..."
  ];

  // Progress message cycler
  useEffect(() => {
    if (!analyzing) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [analyzing]);

  // Combine default presets and custom user creations
  const allPoses = useMemo(() => {
    return [...customPoses, ...mockPoses];
  }, [customPoses]);

  // Dynamic lists of categories including My Custom folder
  const categoriesList = useMemo(() => {
    return [
      ...PoseCategoriesList,
      { id: 'custom', label: '🎨 나만의 포즈' }
    ];
  }, []);

  // Multi-criteria filter pipeline including custom poses folder
  const filteredPoses = useMemo(() => {
    return allPoses.filter((pose) => {
      // Category Match
      let catMatch = true;
      if (selectedCategory === 'trending') {
        catMatch = pose.popularity >= 90; // High popularity displays in trending
      } else if (selectedCategory === 'custom') {
        catMatch = customPoses.some(cp => cp.id === pose.id);
      } else if (selectedCategory !== 'all') {
        catMatch = pose.category === selectedCategory;
      }

      // Search query Match (by name, tags or custom fields)
      const matchesSearch = 
        pose.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pose.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        pose.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Favorites Toggle
      const matchesFavorites = onlyFavorites ? favorites.includes(pose.id) : true;

      // Difficulty level
      const matchesDifficulty = difficultyFilter === 'all' ? true : pose.difficulty === difficultyFilter;

      return catMatch && matchesSearch && matchesFavorites && matchesDifficulty;
    });
  }, [allPoses, selectedCategory, searchQuery, onlyFavorites, favorites, difficultyFilter, customPoses]);

  // File Upload and Base64 parsing call
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setLoadingStep(0);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fullBase64 = event.target?.result as string;
        if (!fullBase64) return;

        // Strip "data:image/jpeg;base64," prefix
        const mimeType = file.type;
        const commaIdx = fullBase64.indexOf(",");
        const base64Data = fullBase64.substring(commaIdx + 1);

        // Fetch pose extraction from server-side proxy
        const res = await fetch("/api/gemini/extract-pose", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: mimeType
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "포즈 분석에 오류가 발생했습니다.");
        }

        const data = await res.json();

        // Standardize output to fit beautiful PoseTemplate
        const createdPose: PoseTemplate = {
          id: `custom-${Date.now()}`,
          name: data.name || "나만의 스마트 포즈",
          category: 'solo', // Default categorization fallback
          tags: data.tags || ["나만의포즈", "스마트가이드"],
          thumbnailColor: "linear-gradient(135deg, #FF6B6B 0%, #8A2BE2 100%)",
          overlayEmoji: data.overlayEmoji || "📸",
          personCount: data.personCount === "group" ? "group" : (Number(data.personCount) || 1) as any,
          difficulty: data.difficulty || "medium",
          popularity: 96,
          description: data.description || "사용자께서 직접 등록하신 고성능 AI 복제 가이드라인입니다.",
          guidePoints: data.guidePoints && data.guidePoints.length > 0 ? data.guidePoints : [
            "두상의 정수리 영역을 가이드 오버레이 최상단 타원에 매칭해 보세요.",
            "어깨 높이가 선명하도록 자리를 세련되게 타격해 주셔야 완성도 높습니다."
          ],
          tips: data.tips && data.tips.length > 0 ? data.tips : [
            "카메라 고도를 살짝 높이고 자연광 창문 아래에서 시각 중심을 조준하세요."
          ],
          silhouettePath: data.silhouettePath || undefined,
          imageUrl: fullBase64 // Keep full image base64 as responsive overlay backdrop
        };

        onAddCustomPose(createdPose);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("AI Extractor failure:", err);
      alert(`[AI 분석 실패]\n\n에러 내용: ${err.message || '네트워크 상태 혹은 세션 타임아웃'}\n\n다시 한번 깔끔한 인물 중심 사진으로 업로드 해주세요!`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Top Header Branding with Glassmorphous blur */}
      <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.06] bg-black/50 backdrop-blur-2xl sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#FF6B6B] via-pink-500 to-[#8A2BE2] flex items-center justify-center shadow-lg shadow-[#FF6B6B]/25">
            <div className="absolute inset-0 rounded-[12px] bg-gradient-to-tr from-white/20 to-transparent" />
            <Sparkles className="w-4 h-4 text-white relative z-10" strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <h1 className="text-[22px] font-black tracking-[-0.04em] leading-none bg-gradient-to-r from-[#FF6B6B] via-pink-400 to-[#8A2BE2] bg-clip-text text-transparent">
              POZI
            </h1>
            <p className="text-[9px] text-white/45 tracking-[0.18em] uppercase mt-1 font-medium">Pose Replica</p>
          </div>
        </div>

        {/* Favorite Quick Filter Action */}
        <button
          onClick={() => setOnlyFavorites(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 backdrop-blur-md ${
            onlyFavorites
              ? 'bg-gradient-to-r from-[#FF6B6B] to-pink-500 text-white border border-white/20 shadow-lg shadow-pink-500/30'
              : 'bg-white/[0.06] text-white/70 border border-white/10 hover:bg-white/10 hover:border-white/15'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 transition-transform ${onlyFavorites ? 'fill-white text-white scale-110' : ''}`} />
          즐겨찾기
        </button>
      </header>

      {/* Main scrollable grid area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 [scrollbar-width:none]">
        {/* Search Bar Input */}
        <div className="relative group">
          <input
            type="text"
            className="w-full bg-white/[0.04] text-white placeholder-white/35 pl-11 pr-4 py-3 rounded-2xl text-[13px] border border-white/10 backdrop-blur-md focus:outline-hidden focus:ring-1 focus:ring-[#FF6B6B]/60 focus:border-[#FF6B6B]/60 focus:bg-white/[0.06] transition-all duration-300 font-sans tracking-tight"
            placeholder="어떤 무드의 포즈를 찾고 있어요?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-white/40 group-focus-within:text-[#FF6B6B] transition-colors duration-300" strokeWidth={2.2} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md border border-white/10 transition-all"
            >
              지우기
            </button>
          )}
        </div>

        {/* PREMIUM AI UPLOADER BOX: Answers the user's specific image-overlay request */}
        {analyzing ? (
          /* High-fidelity procedural loading frame during analysis calls */
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#FF6B6B]/12 via-purple-500/8 to-transparent border border-white/[0.12] overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#FF6B6B]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#8A2BE2]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl border border-white/15 bg-black/30 backdrop-blur-md flex items-center justify-center overflow-hidden">
                  <Loader2 className="w-5 h-5 text-[#FF6B6B] animate-spin" strokeWidth={2.4} />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-500 border-2 border-black animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-bold text-white tracking-tight">AI 분석 중</h4>
                  <span className="text-[8px] tracking-[0.18em] text-white/50 uppercase font-semibold">processing</span>
                </div>
                <p className="text-[11px] text-white/60 font-medium transition-all duration-500 truncate">
                  {loadingMessages[loadingStep]}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Visual upload call-to-action banner */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative p-4 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer transition-all duration-300 group overflow-hidden"
          >
            {/* Ambient glow on hover */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#FF6B6B]/0 group-hover:bg-[#FF6B6B]/10 rounded-full blur-3xl transition-all duration-500 pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#8A2BE2]/0 group-hover:bg-[#8A2BE2]/10 rounded-full blur-3xl transition-all duration-500 pointer-events-none" />

            <div className="relative flex items-center gap-3.5">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B6B]/20 to-[#8A2BE2]/20 border border-white/15 flex items-center justify-center group-hover:scale-105 group-hover:rotate-[-3deg] transition-transform duration-300">
                <UploadCloud className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13px] font-bold text-white tracking-tight">
                    내 사진으로 만들기
                  </h3>
                  <span className="text-[8.5px] tracking-[0.14em] bg-gradient-to-r from-[#FF6B6B] to-[#8A2BE2] text-white px-1.5 py-[3px] rounded-md font-black uppercase">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-white/50 leading-snug mt-0.5 truncate">
                  인생샷 한 장이면 실루엣 가이드 완성
                </p>
              </div>

              <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" strokeWidth={2.4} />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Categories Horizontal Carousel */}
        <div className="overflow-x-auto pb-1 flex gap-1.5 [scrollbar-width:none] -mx-5 px-5">
          {categoriesList.map((cat) => {
            const isActive = selectedCategory === cat.id && !onlyFavorites;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setOnlyFavorites(false);
                }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold transition-all duration-300 backdrop-blur-md border tracking-tight ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-pink-500 border-white/20 text-white shadow-lg shadow-pink-500/30 scale-[1.02]'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/15'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Difficulty quick filter pills */}
        <div className="flex items-center justify-between text-xs pt-1 pb-3 border-b border-white/[0.06]">
          <span className="text-white/40 flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase font-semibold">
            <SlidersHorizontal className="w-3 h-3 text-white/35" strokeWidth={2.2} /> 난이도
          </span>
          <div className="flex gap-1">
            {['all', 'easy', 'medium', 'hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDifficultyFilter(d)}
                className={`px-2.5 py-1 rounded-lg transition-all duration-200 text-[10.5px] font-semibold tracking-tight ${
                  difficultyFilter === d
                    ? 'bg-white text-black shadow-md shadow-white/10'
                    : 'bg-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
              >
                {d === 'all' ? '전체' : d === 'easy' ? '쉬움' : d === 'medium' ? '보통' : '어려움'}
              </button>
            ))}
          </div>
        </div>

        {/* Pose Grid Content */}
        {filteredPoses.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 pb-8">
            {filteredPoses.map((pose) => {
              const isFavorited = favorites.includes(pose.id);
              const difficultyLabel = pose.difficulty === 'easy' ? 'EASY' : pose.difficulty === 'medium' ? 'MID' : 'HARD';
              const difficultyDot = pose.difficulty === 'easy' ? 'bg-emerald-400' : pose.difficulty === 'medium' ? 'bg-amber-400' : 'bg-rose-400';

              return (
                <div
                  key={pose.id}
                  onClick={() => onSelectPose(pose)}
                  className="relative bg-white/[0.035] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/20 group cursor-pointer flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-500/10 active:translate-y-0 active:scale-[0.98]"
                >
                  {/* Thumbnail Banner */}
                  <div className="aspect-[4/5] w-full relative overflow-hidden bg-neutral-950 shrink-0 select-none">
                    {pose.imageUrl ? (
                      <>
                        <img
                          referrerPolicy="no-referrer"
                          src={pose.imageUrl}
                          alt={pose.name}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                        {/* Layered dual-stop gradient for editorial depth */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                      </>
                    ) : (
                      <>
                        {/* Colored baseline */}
                        <div
                          className="absolute inset-0 opacity-70 transition-transform duration-700 ease-out group-hover:scale-110"
                          style={{ background: pose.thumbnailColor }}
                        />
                        {/* Silhouette overlay if available */}
                        {pose.silhouettePath && (
                          <svg
                            viewBox="0 0 200 250"
                            className="absolute inset-0 w-full h-full opacity-40 mix-blend-overlay"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <path
                              d={pose.silhouettePath}
                              fill="none"
                              stroke="white"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        {/* Large central emoji */}
                        <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-90 drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
                          {pose.overlayEmoji}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 pointer-events-none" />
                      </>
                    )}

                    {/* Top-left: difficulty (unified mini chip) */}
                    <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/55 border border-white/15 backdrop-blur-md text-[9px] font-bold tracking-[0.1em] text-white z-10">
                      <span className={`w-1 h-1 rounded-full ${difficultyDot}`} />
                      {difficultyLabel}
                    </span>

                    {/* Top-right: popularity flame (only 93+) */}
                    {pose.popularity >= 93 && (
                      <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#FF6B6B] to-pink-500 border border-white/20 text-white text-[9px] font-black tracking-wider shadow-lg shadow-pink-500/30 z-10">
                        <Flame className="w-2.5 h-2.5 fill-white" strokeWidth={2.4} /> HOT
                      </span>
                    )}

                    {/* Bottom-left: overlay emoji small chip (only when image exists, since fallback shows large emoji already) */}
                    {pose.imageUrl && (
                      <span className="absolute bottom-2 left-2 flex items-center justify-center w-6 h-6 rounded-md bg-black/55 border border-white/15 backdrop-blur-md text-[12px] select-none z-10">
                        {pose.overlayEmoji}
                      </span>
                    )}

                    {/* Bottom-right: headcount */}
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/55 border border-white/15 backdrop-blur-md text-[9.5px] font-semibold text-white/95 z-10">
                      <Users className="w-2.5 h-2.5 text-pink-300" strokeWidth={2.4} />
                      {pose.personCount === 'group' ? '그룹' : `${pose.personCount}인`}
                    </span>
                  </div>

                  {/* Metadata & Title */}
                  <div className="p-3 pt-2.5 flex-1 flex flex-col gap-2">
                    <div>
                      <h3 className="font-bold text-[14px] leading-tight tracking-tight text-white line-clamp-1 group-hover:text-pink-300 transition-colors duration-300">
                        {pose.name}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {pose.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="text-[9.5px] text-white/40 font-medium tracking-tight">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-auto border-t border-white/[0.05]">
                      {/* Popularity as minimalist visual */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-8 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF6B6B] to-pink-400 rounded-full"
                            style={{ width: `${Math.min(100, pose.popularity)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/55 font-bold tracking-tight tabular-nums">
                          {pose.popularity}
                        </span>
                      </div>

                      {/* Heart btn */}
                      <button
                        onClick={(e) => onToggleFavorite(pose.id, e)}
                        className="p-1 -m-1 rounded-full text-white/35 hover:text-rose-400 transition-all duration-200"
                      >
                        <Heart
                          className={`w-[15px] h-[15px] transition-all duration-200 active:scale-125 ${
                            isFavorited ? 'fill-rose-500 text-rose-500 scale-110' : 'hover:scale-110'
                          }`}
                          strokeWidth={2.2}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center backdrop-blur-md">
              <BookOpen className="w-6 h-6 text-white/40" strokeWidth={1.8} />
            </div>
            <div className="space-y-1">
              <p className="text-white/80 text-[13px] font-semibold tracking-tight">결과가 없어요</p>
              <p className="text-[11px] text-white/45">다른 키워드나 카테고리를 시도해보세요</p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setOnlyFavorites(false);
                setDifficultyFilter('all');
              }}
              className="text-[11px] text-white bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-full font-semibold transition-all"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

