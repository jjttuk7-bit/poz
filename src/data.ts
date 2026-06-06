/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PoseTemplate } from './types';

// POZI's primary input is a user-uploaded reference photo. The sample below is
// kept as a single "이렇게 작동해요" demonstration card on the home screen.
export const PoseCategoriesList = [
  { id: 'all', label: '전체' }
];

export const mockPoses: PoseTemplate[] = [
  {
    id: 'sample-01',
    name: '예시 — 턱 괴고 윙크',
    category: 'solo',
    tags: ['예시', '샘플'],
    thumbnailColor: 'linear-gradient(135deg, #C8B6E2 0%, #E8C5D8 50%, #F5D5C3 100%)',
    overlayEmoji: '😉',
    personCount: 1,
    difficulty: 'easy',
    popularity: 90,
    description: '내 사진을 업로드하지 않고도 POZI가 어떻게 작동하는지 미리 체험할 수 있는 샘플 포즈입니다.',
    guidePoints: [
      '한 손을 볼 아래 지지하는 위치에 맞추세요.',
      '머리는 살짝 흔들린 듯 한쪽으로 흘려주세요.'
    ],
    tips: [
      '자연광 옆에서 사이드 라이트를 받으면 가장 예쁘게 나옵니다.'
    ],
    silhouettePath: 'M 100,50 A 25,25 0 1,0 100,100 A 25,25 0 1,0 100,50 M 60,160 C 60,140 80,120 100,120 C 120,120 140,140 140,160 M 75,130 Q 100,120 115,130 M 70,165 L 90,135 L 105,145'
  }
];
