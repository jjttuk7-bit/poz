/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MobileFrame } from './components/MobileFrame';
import { BrowseScreen } from './components/BrowseScreen';
import { DetailScreen } from './components/DetailScreen';
import { CameraScreen } from './components/CameraScreen';
import { ResultScreen } from './components/ResultScreen';
import { PoseTemplate, ScreenState } from './types';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('browse');
  const [selectedPose, setSelectedPose] = useState<PoseTemplate | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [customPoses, setCustomPoses] = useState<PoseTemplate[]>([]);

  // Load persistent user favorites and custom poses on mount
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem('pozi_favorites');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
    } catch (e) {
      console.warn('LocalStorage load favorites failed:', e);
    }

    try {
      const savedCustom = localStorage.getItem('pozi_custom_poses');
      if (savedCustom) {
        setCustomPoses(JSON.parse(savedCustom));
      }
    } catch (e) {
      console.warn('LocalStorage load custom poses failed:', e);
    }
  }, []);

  // Update favorites logic helper
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Avoid triggering card click selection on list
    }

    setFavorites((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }
      try {
        localStorage.setItem('pozi_favorites', JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage save failed:', err);
      }
      return updated;
    });
  };

  const handleAddCustomPose = (newPose: PoseTemplate) => {
    setCustomPoses((prev) => {
      const updated = [newPose, ...prev];
      try {
        localStorage.setItem('pozi_custom_poses', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save for custom poses failed:', e);
      }
      return updated;
    });
    setSelectedPose(newPose);
    setScreen('detail');
  };

  // Screen selection change handler
  const handleSelectPose = (pose: PoseTemplate) => {
    setSelectedPose(pose);
    setScreen('detail');
  };

  const handleStartCamera = () => {
    setScreen('camera');
  };

  const handleCapturePhoto = (photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl);
    setScreen('result');
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setScreen('camera');
  };

  const handleSelectAnother = () => {
    setCapturedPhoto(null);
    setSelectedPose(null);
    setScreen('browse');
  };

  // Render proper view screen inside our device wrapper
  const renderScreen = () => {
    switch (screen) {
      case 'browse':
        return (
          <BrowseScreen
            onSelectPose={handleSelectPose}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            customPoses={customPoses}
            onAddCustomPose={handleAddCustomPose}
          />
        );

      case 'detail':
        if (!selectedPose) return null;
        return (
          <DetailScreen
            pose={selectedPose}
            isFavorited={favorites.includes(selectedPose.id)}
            onToggleFavorite={() => handleToggleFavorite(selectedPose.id)}
            onBack={() => setScreen('browse')}
            onStartCamera={handleStartCamera}
          />
        );

      case 'camera':
        if (!selectedPose) return null;
        return (
          <CameraScreen
            pose={selectedPose}
            onBack={() => setScreen('detail')}
            onCapture={handleCapturePhoto}
          />
        );

      case 'result':
        if (!selectedPose || !capturedPhoto) return null;
        return (
          <ResultScreen
            capturedPhoto={capturedPhoto}
            pose={selectedPose}
            onRetake={handleRetake}
            onSelectAnother={handleSelectAnother}
          />
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center text-white text-xs">
            알 수 없는 화면에 진입했습니다. 홈으로 이동합니다.
          </div>
        );
    }
  };

  return (
    <MobileFrame>
      {renderScreen()}
    </MobileFrame>
  );
}
