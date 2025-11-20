import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

// Safe initialization
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI", error);
  }
}

export const generateSkaterWisdom = async (theme: string, level: number, success: boolean): Promise<string> => {
  if (!ai) {
    return "The path is paved with patience. (API Key missing)";
  }

  // Use a lightweight model for quick text generation
  const modelId = 'gemini-2.5-flash';
  
  const prompt = success 
    ? `You are a wise skateboarding master like Yoda mixed with Tony Hawk. The player just beat Level ${level} which has the theme "${theme}". Give a short, one-sentence profound moral lesson or philosophical quote about this theme, relating it to skateboarding and life. Keep it inspiring.`
    : `You are a wise skateboarding master. The player failed Level ${level} (Theme: ${theme}). Give a short, one-sentence encouraging advice about getting back up and trying again.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return success 
      ? "Greatness comes to those who roll forward." 
      : "Fall seven times, stand up eight.";
  }
};