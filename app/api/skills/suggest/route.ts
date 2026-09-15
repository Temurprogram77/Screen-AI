import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_ROLE_SKILLS, SKILLS_CATALOG } from "@/lib/constants/skills";

export const runtime = "nodejs";

function getFallbackSkills(title: string): string[] {
  const lower = title.toLowerCase();
  for (const [key, skills] of Object.entries(DEFAULT_ROLE_SKILLS)) {
    if (lower.includes(key)) {
      return skills;
    }
  }

  // If no direct keyword match, filter skills from catalog matching keywords
  const matched = SKILLS_CATALOG.filter((s) =>
    lower.includes(s.name.toLowerCase())
  ).map((s) => s.name);

  if (matched.length >= 4) {
    return matched.slice(0, 8);
  }

  // Default general fullstack / software engineering set
  return DEFAULT_ROLE_SKILLS.fullstack;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, seniority } = body as {
      title?: string;
      seniority?: string;
    };

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Job title is required to suggest skills" },
        { status: 400 }
      );
    }

    const trimmedTitle = title.trim();
    const cleanSeniority = seniority || "Mid-Level";

    // Attempt AI Generation if GEMINI_API_KEY is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are a principal tech recruiter. Given the job title "${trimmedTitle}" and seniority level "${cleanSeniority}", list 6 to 8 core, modern, high-impact technical skills, languages, frameworks, or tools required for this role. Be specific, concise, and standard industry terminology (e.g. "React", "TypeScript", "PostgreSQL", "Docker", "AWS").`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                skills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "6 to 8 recommended core skills",
                },
              },
              required: ["skills"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
            const cleanSkills: string[] = parsed.skills
              .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
              .filter(Boolean);
            if (cleanSkills.length > 0) {
              return NextResponse.json({ skills: cleanSkills, source: "ai" });
            }
          }
        }
      } catch (aiErr) {
        console.warn(
          "[/api/skills/suggest] AI suggestion failed, falling back to preset:",
          aiErr
        );
      }
    }

    // Fallback if AI call failed or key absent
    const fallbackSkills = getFallbackSkills(trimmedTitle);
    return NextResponse.json({ skills: fallbackSkills, source: "preset" });
  } catch (err) {
    console.error("[/api/skills/suggest] Error:", err);
    return NextResponse.json(
      { error: "Failed to suggest skills" },
      { status: 500 }
    );
  }
}
