/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Eye, EyeOff, Sliders, Image, AlertTriangle, ArrowLeft, HelpCircle, Play } from 'lucide-react';
import { PoseTemplate } from '../types';

interface CameraScreenProps {
  pose: PoseTemplate;
  onBack: () => void;
  onCapture: (photoDataUrl: string) => void;
}

export function CameraScreen({ pose, onBack, onCapture }: CameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'error'>('idle');
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [opacity, setOpacity] = useState<number>(40); // 0 to 70
  const [guideVisible, setGuideVisible] = useState<boolean>(true);
  const [overlayMode, setOverlayMode] = useState<'silhouette' | 'photo'>(
    pose.silhouettePath ? 'silhouette' : 'photo'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fallback simulator mode controls (for browser testing without cameras / blocked permissions)
  const [simulatorSource, setSimulatorSource] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600');
  const simImageIndexRef = useRef(0);
  const simImages = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600', // Solo portrait
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600', // Solo male
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600', // Portrait selfie
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600'  // Group/outdoor beach
  ];

  // Camera request — extracted so it can be invoked by an explicit user tap (iOS Safari requires gesture).
  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraState('error');
      setErrorMessage('카메라 미디어 입력을 지원하지 않는 브라우저입니다.');
      return;
    }

    setCameraState('requesting');
    setVideoPlaying(false);
    setErrorMessage('');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.log('Initial play blocked, will retry after user gesture:', e);
        }
      }
      setCameraState('active');
      setHasCamera(true);
    } catch (err: any) {
      console.warn('Camera request failure:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage('카메라 권한이 거부됐어요. 주소창 옆 자물쇠 아이콘 → 카메라 → 허용으로 바꿔주세요.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraState('error');
        setErrorMessage('연결된 카메라를 찾지 못했어요. 외장 카메라라면 연결 후 다시 시도해주세요.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraState('error');
        setErrorMessage('다른 앱이 카메라를 점유 중입니다. Zoom/Teams/다른 탭을 종료 후 다시 시도해주세요.');
      } else if (err.name === 'OverconstrainedError') {
        setCameraState('error');
        setErrorMessage('요청한 카메라 사양을 지원하지 않습니다. 다른 카메라로 전환을 시도해보세요.');
      } else {
        setCameraState('error');
        setErrorMessage(`카메라를 켤 수 없습니다: ${err.message || err.name || '알 수 없는 오류'}`);
      }
    }
  }, [facingMode]);

  // Auto-request on mount / when facingMode changes. iOS Safari may silently reject — the "탭해서 카메라 켜기" overlay handles that.
  useEffect(() => {
    requestCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [requestCamera]);

  // Detect actual video playback so the "tap to start" overlay can dismiss.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlaying = () => setVideoPlaying(true);
    const onPause = () => setVideoPlaying(false);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  // Manual start triggered by user tap — required on iOS Safari and some autoplay-restricted browsers.
  const handleManualStart = async () => {
    if (!streamRef.current || cameraState !== 'active') {
      await requestCamera();
    }
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      try {
        await videoRef.current.play();
      } catch (e: any) {
        setErrorMessage(`재생 차단: ${e.message || e.name}. 브라우저 설정에서 자동재생을 허용해주세요.`);
      }
    }
  };

  // Flip front/back facing
  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Change Simulator Backdrop
  const cycleSimulatorBackdrop = () => {
    simImageIndexRef.current = (simImageIndexRef.current + 1) % simImages.length;
    setSimulatorSource(simImages[simImageIndexRef.current]);
  };

  // Handle shutter action
  const handleCapturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Width/Height setup based on mode
    const isMock = cameraState !== 'active';
    const targetWidth = 480;
    const targetHeight = 640;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    if (isMock) {
      // Simulate drawing the current simulator background image
      const simImg = new window.Image();
      simImg.crossOrigin = 'anonymous';
      simImg.onload = () => {
        // Draw centered and cropped object-cover alike
        const imgAspect = simImg.width / simImg.height;
        const canvasAspect = targetWidth / targetHeight;
        let sWidth = simImg.width;
        let sHeight = simImg.height;
        let sx = 0;
        let sy = 0;

        if (imgAspect > canvasAspect) {
          sWidth = simImg.height * canvasAspect;
          sx = (simImg.width - sWidth) / 2;
        } else {
          sHeight = simImg.width / canvasAspect;
          sy = (simImg.height - sHeight) / 2;
        }

        ctx.drawImage(simImg, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        
        // Return snapped data
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(dataUrl);
      };
      simImg.src = simulatorSource;
    } else if (video) {
      // Draw real video stream
      const vidWidth = video.videoWidth;
      const vidHeight = video.videoHeight;
      const vidAspect = vidWidth / vidHeight;
      const canvasAspect = targetWidth / targetHeight;
      let sWidth = vidWidth;
      let sHeight = vidHeight;
      let sx = 0;
      let sy = 0;

      if (vidAspect > canvasAspect) {
        sWidth = vidHeight * canvasAspect;
        sx = (vidWidth - sWidth) / 2;
      } else {
        sHeight = vidWidth / canvasAspect;
        sy = (vidHeight - sHeight) / 2;
      }

      ctx.save();
      // Mirror front camera snap to make it feel natural
      if (facingMode === 'user') {
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCapture(dataUrl);
    }
  };

  // Custom simulator portrait upload trigger
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSimulatorSource(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] relative overflow-hidden">
      {/* Hidden processing canvas holds snaps */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header Controls overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pb-8 flex items-center justify-between z-30 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
        <button
          onClick={onBack}
          className="p-2.5 rounded-full bg-white/5 text-white border border-white/10 backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Live Title Indicators */}
        <div className="text-center font-sans">
          <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase">따라하는 중</p>
          <h2 className="text-sm font-extrabold text-[#FF6B6B] max-w-[200px] truncate">{pose.name}</h2>
        </div>

        {/* Small pose guides drawer trigger / indicator */}
        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#FF6B6B] shadow-lg relative flex items-center justify-center bg-[#050505]">
          <div 
            className="absolute inset-0 opacity-40" 
            style={{ background: pose.thumbnailColor }}
          />
          <span className="text-xl z-10 select-none pb-0.5">{pose.overlayEmoji}</span>
        </div>
      </div>

      {/* Main View Area (Real Stream or Simulator Backdrop) */}
      <div className="flex-1 w-full bg-[#050505]/20 flex items-center justify-center relative overflow-hidden">
        {cameraState === 'active' ? (
          /* Actual Interactive Video streaming */
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover select-none bg-black ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* Tap-to-start overlay — required on iOS Safari + browsers blocking autoplay */}
            {!videoPlaying && (
              <button
                type="button"
                onClick={handleManualStart}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm text-white cursor-pointer animate-pulse"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF6B6B] to-[#8A2BE2] flex items-center justify-center shadow-2xl shadow-[#FF6B6B]/50 border-2 border-white/30">
                  <Play className="w-9 h-9 text-white fill-white ml-1" />
                </div>
                <div className="text-center space-y-1 px-6">
                  <p className="text-base font-extrabold tracking-tight">탭해서 카메라 켜기</p>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    iPhone / 일부 브라우저는 화면을 한 번 눌러야 카메라가 켜져요.
                  </p>
                </div>
              </button>
            )}
          </>
        ) : (
          /* Simulator Backdrop with instructions */
          <div className="w-full h-full relative select-none">
            {/* The beautiful mock-backdrop with soft styling */}
            <img 
              referrerPolicy="no-referrer"
              src={simulatorSource} 
              alt="Device Simulator Backdrop" 
              className="w-full h-full object-cover filter brightness-[0.7] transform duration-[1500]"
            />
            
            {/* Status alerts representing sandbox simulation */}
            <div className="absolute bottom-28 left-4 right-4 bg-black/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10 font-sans z-20 shadow-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {cameraState === 'requesting' ? '카메라 권한 요청 중…'
                      : cameraState === 'denied' ? '카메라 권한이 차단됐어요'
                      : cameraState === 'error' ? '카메라를 켤 수 없어요'
                      : '카메라 대기 중'}
                  </h4>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    {errorMessage || '아래 버튼을 눌러 카메라를 시작하거나, 샘플 이미지로 미리보기 할 수 있어요.'}
                  </p>
                </div>
              </div>

              {/* Primary: retry camera button */}
              <button
                onClick={requestCamera}
                disabled={cameraState === 'requesting'}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#8A2BE2] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B6B]/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                <Camera className="w-4 h-4" />
                {cameraState === 'requesting' ? '연결 중…' : '카메라 다시 시도'}
              </button>

              {/* Secondary: simulator fallback */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={cycleSimulatorBackdrop}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/80 flex items-center justify-center gap-1 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 text-[#FF6B6B]" /> 샘플 사진 순환
                </button>
                <label className="flex-1 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/80 flex items-center justify-center gap-1 hover:bg-white/10 transition-colors cursor-pointer text-center">
                  <Image className="w-3 h-3 text-emerald-400" /> 내 사진 올리기
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLocalFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Real photo translucent ghost overlay guide layer */}
        {guideVisible && overlayMode === 'photo' && pose.imageUrl && (
          <div 
            className="absolute inset-x-0 top-0 bottom-0 pointer-events-none select-none z-15 mix-blend-normal transition-opacity duration-300"
            style={{ opacity: opacity / 100 }}
          >
            <img 
              referrerPolicy="no-referrer"
              src={pose.imageUrl} 
              alt="Pose alignment overlay" 
              className="w-full h-full object-cover filter contrast-[1.05]"
            />
          </div>
        )}

        {/* Dynamic Template Silhouette overlay layers */}
        {guideVisible && overlayMode === 'silhouette' && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-20"
            style={{ opacity: opacity / 100 }}
          >
            {/* Outline SVG container with glow pipeline */}
            <div className="w-[280px] h-[360px] relative flex flex-col items-center justify-center bg-black/5 rounded-[40px] border border-white/10 shadow-inner">
              {pose.silhouettePath ? (
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full max-h-[290px] drop-shadow-[0_0_12px_rgba(255,107,107,0.85)] filter"
                >
                  <path
                    d={pose.silhouettePath}
                    fill="none"
                    stroke="#FF6B6B"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse-slow"
                  />
                </svg>
              ) : (
                <div className="h-44 w-full flex items-center justify-center">
                  <span className="text-[120px] filter drop-shadow-[0_10px_20px_rgba(255,255,255,0.4)]">
                    {pose.overlayEmoji}
                  </span>
                </div>
              )}

              {/* Floating align label helpers */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-20">
                <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-wider bg-[#FF6B6B] text-white rounded-md shadow-lg border border-white/20 animate-bounce">
                  ALIGN HERE
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Guide points rolling overlays bottom */}
        {guideVisible && (
          <div className="absolute top-18 left-4 right-4 bg-black/45 backdrop-blur-xl border border-white/10 rounded-xl p-3 pointer-events-none z-20">
            <span className="text-[10px] text-[#FF6B6B] font-extrabold block mb-0.5">💡 구도 가이드라인 꿀팁</span>
            <p className="text-[11px] text-white/90 leading-tight">
              {pose.guidePoints[0]}
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Drawer Controls with glass backdrop */}
      <div className="bg-[#050505]/70 border-t border-white/5 pb-6 pt-4 px-5 space-y-4 shrink-0 z-30 backdrop-blur-xl">
        
        {/* Guide Mode Toggle Tabs (Silhouette vs Actual Image Ghosting) */}
        {pose.imageUrl && guideVisible && (
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 gap-1 text-[11px]">
            <button
              onClick={() => setOverlayMode('silhouette')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                overlayMode === 'silhouette' 
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-purple-600 text-white shadow-md' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#FF6B6B]" /> 실루엣 라인 가이드
            </button>
            <button
              onClick={() => setOverlayMode('photo')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                overlayMode === 'photo' 
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-purple-600 text-white shadow-md' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Image className="w-3.5 h-3.5 text-emerald-400" /> 실제 사진 오버레이
            </button>
          </div>
        )}

        {/* Opacity control and guide Visibility toggle row */}
        <div className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 text-white/80">
            <button
              onClick={() => setGuideVisible(v => !v)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                guideVisible 
                  ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30' 
                  : 'bg-white/5 text-white/40 border border-transparent'
              }`}
            >
              {guideVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <span className="text-[11px] font-bold select-none">
              {guideVisible ? '가이드 ON' : '가이드 OFF'}
            </span>
          </div>

          {/* Opacity custom slider bar */}
          <div className="flex-1 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="range"
              min="0"
              max="90"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              disabled={!guideVisible}
              className="flex-1 accent-[#FF6B6B] h-1 bg-white/10 rounded-lg cursor-pointer disabled:opacity-30"
            />
            <span className="text-[11px] font-semibold text-white/50 font-mono w-8 text-right shrink-0">
              {guideVisible ? `${opacity}%` : '-'}
            </span>
          </div>
        </div>

        {/* Shutter primary buttons zone */}
        <div className="flex items-center justify-between px-3">
          
          {/* Flip / Cycle lens */}
          <button
            onClick={handleFlipCamera}
            disabled={cameraState !== 'active'}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-[#FF6B6B] transition-all text-white/70 cursor-pointer disabled:opacity-40"
            title="카메라 전후면 전환"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Core Shutter (Large, glowing pink) */}
          <div className="relative flex items-center justify-center p-1 border-4 border-[#FF6B6B]/20 rounded-full">
            <button
              onClick={handleCapturePhoto}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF6B6B] to-[#8A2BE2] hover:scale-105 active:scale-[0.93] transition-all flex items-center justify-center shadow-lg shadow-[#FF6B6B]/30 cursor-pointer border border-white/20"
              title="사진 찍기"
            >
              <Camera className="w-7 h-7 text-white" />
            </button>
          </div>

          {/* Guide Helper help dialog tips button */}
          <button
            onClick={() => {
              alert(`[가이드라인 안내]\n\n배경 속 핑크색 실루엣에 몸 혹은 얼굴의 영역을 정확하게 겹쳐보세요!\n\n카메라는 피사체 무릎 또는 허리선 높이로 맞추면 훨씬 더 역동적인 대세 샷을 잡을 수 있습니다.`);
            }}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-amber-400 transition-all text-white/70 cursor-pointer"
            title="조언 보기"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
}
