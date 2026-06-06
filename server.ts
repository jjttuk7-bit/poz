/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Set higher payload limit for base64 picture uploads from users
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Gemini Pose Analyzer endpoint
  app.post("/api/gemini/extract-pose", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "이미지 데이터가 누락되었습니다." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." });
      }

      // Instantiate GoogleGenAI client (with recommended parameters)
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Assemble content parts for multimodal processing
      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      };

      const promptPart = {
        text: `Analyze the user's uploaded target pose photo carefully.
Identify the primary human figures, their orientation, gestures, and relative alignment.
Generate a structured JSON response corresponding to the following fields to guide another user on how to replicate this pose:
- name: A trendy, literal, and friendly title in Korean (e.g. "한 손 커피 일상 포즈", "시크한 기둥 기대기")
- description: A short, concise summary (1 or 2 sentences max) describing the visual angle, emotion, or hand-held accessories.
- overlayEmoji: A single, extremely relevant emoji.
- personCount: Number of people in this pose. Output "1" for 1 person, "2" for 2 persons, or "group" for multiple.
- difficulty: Tone down difficulty reasonably ("easy", "medium", or "hard").
- tags: List of exactly 3 to 4 related trending Korean search tags (e.g. ["일반셀카", "카페소품", "MZ감성"])
- guidePoints: A list of exactly 2 or 3 critical alignment guides in Korean (e.g. "오른손으로 커피 컵을 눈 바로 아래에서 들어 얼굴의 우측 하단을 밀착해 가립니다.", "어깨와 허리 수직선을 고르게 유지하고 시선은 렌즈 아래를 지향합니다.")
- tips: Exactly 1 highly rewarding photography advice in Korean (e.g., "광각 촬영 시 발끝을 모바일 아래쪽 가이드에 바싹 붙여 수직감을 확장하면 예술 같은 비율을 선사합니다.")
- silhouettePath: Draw a clean, continuous SVG path (using 'd' attribute syntax) with coordinates scaled precisely in a (0, 0, 200, 200) bounding box. Make it look like a cartoon stick figure or posture contour line. For instance, start with head circle 'M 100,45 A 15,15 0 1,1 100,75', continuing with neck/spine 'M 100,75 L 100,130', arms/legs lines, matching the uploaded pose posture. Must be valid SVG path.`
      };

      // Call recommended gemini-3.5-flash for fast multimodal schema synthesis
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              overlayEmoji: { type: Type.STRING },
              personCount: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              guidePoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              silhouettePath: { type: Type.STRING }
            },
            required: ["name", "description", "overlayEmoji", "personCount", "difficulty", "tags", "guidePoints", "tips", "silhouettePath"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty text response from Gemini API");
      }

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error("Gemini pose analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  });

  // Vite development server / static production delivery
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`POZI Full-stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
