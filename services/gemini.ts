import { GoogleGenAI } from "@google/genai";
import { WeekData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWeeklyReport = async (week: WeekData): Promise<string> => {
  try {
    const prompt = `
      Analyze this weekly financial data for a personal user.
      Income: ${week.income}
      Transactions: ${JSON.stringify(week.transactions.map(t => ({
        title: t.title,
        amount: t.amount,
        type: t.type,
        status: t.isConfirmed ? 'completed' : 'pending'
      })))}
      
      Provide a concise, helpful summary in 3 bullet points. 
      1. Spending efficiency (Income vs Expenses).
      2. Largest category or expense.
      3. A quick tip for next week.
      Keep it friendly and short.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate analysis at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Analysis service unavailable.";
  }
};
