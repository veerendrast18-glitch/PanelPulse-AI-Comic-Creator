
import { GoogleGenAI, Type, VideoGenerationReferenceType } from "@google/genai";
import { ComicStory, VillainProfile } from "../types";

// Helper for handling API retries with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    if (error?.message?.includes("blocked") || error?.message?.includes("404")) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

// Initialize Gemini API client - always using process.env.API_KEY as per guidelines
// Fix: Use named parameter for GoogleGenAI initialization
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateStoryScript = async (
  prompt: string,
  panelCount: number = 4,
  imageDescription?: string
): Promise<ComicStory> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Prompt: ${prompt}${imageDescription ? `\nVisual Context: ${imageDescription}` : ''}`,
      config: {
        systemInstruction: `You are a specialized graphic novel scriptwriter focused on adult-oriented, sophisticated storytelling. Create a compelling ${panelCount}-panel sequence based on the user's input. TONE: Mature, nuanced, and cinematic. FOCUS: Atmosphere, internal monologue, or sharp dialogue that feels grounded.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            panels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  imagePrompt: { type: Type.STRING },
                  caption: { type: Type.STRING }
                },
                required: ["imagePrompt", "caption"]
              }
            }
          },
          required: ["title", "panels"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as ComicStory;
  });
};

export const describeImage = async (base64Image: string): Promise<string> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: "Analyze this image for a mature graphic novel adaptation. Describe the mood, environmental textures, character expressions, and cinematic lighting." }
        ]
      }
    });

    return response.text || "";
  });
};

export const generatePanelImage = async (prompt: string, style: string = 'classic'): Promise<string> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const stylePrompts: Record<string, string> = {
      classic: "Dark graphic novel art style, gritty ink lines, cinematic lighting, heavy blacks",
      manga: "Seinen manga style, detailed environmental linework, dynamic hatching",
      noir: "Hardboiled Noir, deep chiaroscuro, high contrast black and white",
      realistic: "Oil-painted graphic novel style, moody atmospheric lighting",
      retro: "European indie comic style, muted Ligne Claire, sophisticated color blocking"
    };

    const enhancedPrompt = `${stylePrompts[style] || stylePrompts.classic}: ${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: enhancedPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data in response");
  });
};

export const generateComicVideo = async (story: ComicStory, style: string): Promise<string> => {
  // Fix: Create instance right before call as per Veo requirements to ensure latest API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const referenceImages = story.panels
    .filter(p => p.imageUrl)
    .slice(0, 3)
    .map(p => ({
      image: {
        imageBytes: p.imageUrl!.split(',')[1],
        mimeType: 'image/png',
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    }));

  const videoPrompt = `A motion-comic for "${story.title}". Style: Mature ${style}. Cinematic transitions, mood-focused.`;

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: videoPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
      referenceImages: referenceImages.length > 0 ? (referenceImages as any) : undefined
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  // Fix: Access with current process.env.API_KEY
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateVillainProfile = async (userTheme?: string): Promise<VillainProfile> => {
  return withRetry(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: userTheme ? `Theme: ${userTheme}` : "Create a complex antagonist for a gritty thriller.",
      config: {
        systemInstruction: `Design a complex antagonist. Avoid 'supervillain' cliches. Response must be valid JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            alias: { type: Type.STRING },
            powers: { type: Type.STRING },
            motivation: { type: Type.STRING },
            appearance: { type: Type.STRING }
          },
          required: ["name", "alias", "powers", "motivation", "appearance"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as VillainProfile;
  });
};
