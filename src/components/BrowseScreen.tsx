/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, UploadCloud, Loader2, Camera } from 'lucide-react';
import { PoseTemplate } from '../types';
import { mockPoses } from '../data';

interface BrowseScreenProps {
  onSelectPose: (pose: PoseTemplate) => void;
  favorites: string[];
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  customPoses: PoseTemplate[];
  onAddCustomPose: (pose: PoseTemplate) => void;
}

export function BrowseScreen({ onSelectPose, onAddCustomPose }: BrowseScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    'AI가 사진 속 포즈를 분석하고 있어요…',
    '몸의 윤곽선을 세밀하게 추출하는 중…',
    '카메라 화면 위에 띄울 가이드를 만드는 중…'
  ];

  useEffect(() => {
    if (!analyzing) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [analyzing]);

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

        const mimeType = file.type;
        const commaIdx = fullBase64.indexOf(',');
        const base64Data = fullBase64.substring(commaIdx + 1);

        const res = await fetch('/api/gemini/extract-pose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data, mimeType }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '포즈 분석에 실패했습니다.');
        }

        const data = await res.json();

        const createdPose: PoseTemplate = {
          id: `custom-${Date.now()}`,
          name: data.name || '내가 따라할 포즈',
          category: 'solo',
          tags: ['내 사진'],
          thumbnailColor: 'linear-gradient(135deg, #FF6B6B 0%, #8A2BE2 100%)',
          overlayEmoji: data.overlayEmoji || '📸',
          personCount: data.personCount === 'group' ? 'group' : ((Number(data.personCount) || 1) as 1 | 2),
          difficulty: data.difficulty || 'medium',
          popularity: 90,
          description: data.description || '업로드하신 사진에서 추출한 포즈 가이드입니다.',
          guidePoints: data.guidePoints && data.guidePoints.length > 0 ? data.guidePoints : [
            '핑크 실루엣 라인에 몸을 맞춰보세요.'
          ],
          tips: data.tips && data.tips.length > 0 ? data.tips : [
            '카메라 화면을 한 번 탭하면 시작됩니다.'
          ],
          silhouettePath: data.silhouettePath || undefined,
          imageUrl: fullBase64,
        };

        onAddCustomPose(createdPose);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('AI Extractor failure:', err);
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`사진 분석에 실패했어요.\n\n${msg}\n\n인물이 잘 보이는 사진으로 다시 시도해 주세요.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const samplePose = mockPoses[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Minimal header */}
      <header className="px-6 pt-5 pb-3 shrink-0 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FF6B6B] to-[#8A2BE2] flex items-center justify-center shadow-md shadow-[#FF6B6B]/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-[20px] font-black tracking-[-0.04em] leading-none bg-gradient-to-r from-[#FF6B6B] via-pink-400 to-[#8A2BE2] bg-clip-text text-transparent">
            POZI
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col [scrollbar-width:none]">
        {/* HERO — upload */}
        <div className="flex-1 flex flex-col justify-center min-h-[420px] py-8">
          <div className="text-center mb-6 space-y-2">
            <h2 className="text-[22px] font-extrabold text-white leading-tight tracking-tight">
              따라하고 싶은 사진을<br />올려주세요
            </h2>
            <p className="text-[12.5px] text-white/55 leading-relaxed px-2">
              AI가 포즈를 분석해서 카메라 화면 위에<br />똑같이 따라할 수 있는 가이드를 만들어줘요.
            </p>
          </div>

          {analyzing ? (
            <div className="rounded-3xl bg-gradient-to-br from-[#FF6B6B]/15 via-purple-500/10 to-transparent border border-white/15 p-8 flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#FF6B6B] animate-spin" />
                <Loader2 className="w-6 h-6 text-purple-300 absolute inset-0 m-auto animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">포즈 분석 중</h4>
                <p className="text-[12px] text-white/65 font-medium transition-all duration-500">
                  {loadingMessages[loadingStep]}
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-3xl p-8 flex flex-col items-center gap-4 bg-gradient-to-br from-[#FF6B6B]/15 via-purple-500/10 to-transparent border-2 border-dashed border-white/20 hover:border-[#FF6B6B]/60 hover:shadow-2xl hover:shadow-[#FF6B6B]/15 active:scale-[0.99] transition-all duration-300 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF6B6B] to-[#8A2BE2] flex items-center justify-center shadow-xl shadow-[#FF6B6B]/40 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7 text-white" strokeWidth={2.2} />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-[15px] font-extrabold text-white">사진 올리기</p>
                <p className="text-[11.5px] text-white/55">JPG · PNG · HEIC</p>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Sample — small demo card */}
        {samplePose && !analyzing && (
          <div className="shrink-0 pt-2">
            <p className="text-[10.5px] text-white/40 font-bold tracking-[0.15em] uppercase mb-3 text-center">
              이렇게 작동해요
            </p>
            <button
              onClick={() => onSelectPose(samplePose)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.99] transition-all text-left cursor-pointer"
            >
              {/* Mini thumb */}
              <div
                className="w-14 h-14 rounded-xl relative overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: samplePose.thumbnailColor }}
              >
                {samplePose.silhouettePath && (
                  <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full opacity-60">
                    <path
                      d={samplePose.silhouettePath}
                      fill="none"
                      stroke="white"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span className="relative text-xl drop-shadow">{samplePose.overlayEmoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-white truncate">샘플 포즈 체험하기</p>
                <p className="text-[10.5px] text-white/50 mt-0.5 line-clamp-1">
                  업로드 없이 가이드 작동 방식 미리보기
                </p>
              </div>
              <Camera className="w-4 h-4 text-white/40 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
