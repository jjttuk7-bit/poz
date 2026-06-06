/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PoseCategory = 'couples' | 'solo' | 'group' | 'travel' | 'trending';

export type PoseDifficulty = 'easy' | 'medium' | 'hard';

export type PersonCount = 1 | 2 | 'group';

export interface PoseTemplate {
  id: string;
  name: string;
  category: PoseCategory;
  tags: string[];
  thumbnailColor: string; // Tailwind gradient classes or inline CSS styles
  overlayEmoji: string;
  personCount: PersonCount;
  difficulty: PoseDifficulty;
  popularity: number; // 0 - 100
  description: string;
  guidePoints: string[]; // Key alignment directions, e.g. ["정수리를 중앙에 맞추세요", "손을 어깨 높이에 두세요"]
  tips: string[]; // Additional photography tips for results
  silhouettePath?: string; // High-quality simple vector outline for transparent guide overlay
  imageUrl?: string; // Real-world premium aesthetic production photo of the target pose
}

export type ScreenState = 'browse' | 'detail' | 'camera' | 'result';

export interface CaptureResult {
  photoDataUrl: string; // Capture user photo
  poseId: string; // The pose that was replicated
  matchScore: number; // Simulated AI alignment score (75-98)
  capturedAt: string; // Time of creation
}
