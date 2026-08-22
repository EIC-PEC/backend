import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PASS_TIERS_CATALOG } from '../registrations/pass-types.config';
import { ChatQueryDto } from './dto/chat.dto';

export interface ConciergeAction {
  type: 'navigate' | 'highlight' | 'pass_recommendation';
  target?: string;
  payload?: any;
}

@Injectable()
export class ConciergeService {
  private readonly logger = new Logger(ConciergeService.name);
  private readonly geminiApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.geminiApiKey = this.config.get<string>('GEMINI_API_KEY');
  }

  async processChat(dto: ChatQueryDto) {
    const query = dto.message.trim();
    const queryLower = query.toLowerCase();

    const [events, speakers, sponsors] = await Promise.all([
      this.prisma.event.findMany({ take: 25, orderBy: { startTime: 'asc' } }),
      this.prisma.speaker.findMany({ take: 20 }),
      this.prisma.sponsor.findMany({ take: 10 }),
    ]);

    let action: ConciergeAction | null = null;

    if (
      queryLower.includes('pass') ||
      queryLower.includes('ticket') ||
      queryLower.includes('price') ||
      queryLower.includes('register') ||
      queryLower.includes('fee') ||
      queryLower.includes('cost')
    ) {
      action = {
        type: 'navigate',
        target: '/register',
        payload: { section: 'register' },
      };
    } else if (
      queryLower.includes('schedule') ||
      queryLower.includes('timing') ||
      queryLower.includes('agenda') ||
      queryLower.includes('time') ||
      queryLower.includes('when')
    ) {
      action = {
        type: 'navigate',
        target: '/#timeline',
        payload: { section: 'timeline' },
      };
    } else if (
      queryLower.includes('speaker') ||
      queryLower.includes('guest') ||
      queryLower.includes('keynote') ||
      queryLower.includes('who is speaking')
    ) {
      action = {
        type: 'navigate',
        target: '/#speakers',
        payload: { section: 'speakers' },
      };
    } else if (
      queryLower.includes('hackathon') ||
      queryLower.includes('pitch') ||
      queryLower.includes('track') ||
      queryLower.includes('competition')
    ) {
      action = {
        type: 'navigate',
        target: '/#competitions',
        payload: { section: 'competitions' },
      };
    }

    if (this.geminiApiKey) {
      try {
        const aiResponse = await this.queryGemini(query, dto.history || [], {
          events,
          speakers,
          sponsors,
          passes: PASS_TIERS_CATALOG,
        });

        if (aiResponse) {
          return {
            reply: aiResponse,
            action,
            source: 'gemini',
          };
        }
      } catch (err) {
        this.logger.warn(`Gemini API call failed: ${(err as Error).message}. Falling back to semantic engine.`);
      }
    }

    const reply = this.synthesizeLocalResponse(queryLower, {
      events,
      speakers,
      sponsors,
      passes: PASS_TIERS_CATALOG,
    });

    return {
      reply,
      action,
      source: 'festival_rag',
    };
  }

  private synthesizeLocalResponse(
    q: string,
    context: { events: any[]; speakers: any[]; sponsors: any[]; passes: any[] },
  ): string {
    if (q.includes('pass') || q.includes('ticket') || q.includes('price') || q.includes('cost') || q.includes('fee')) {
      const passSummaries = context.passes
        .map((p) => `• **${p.title}** (${p.feeDisplay}): ${p.tagline}`)
        .join('\n');
      return `Here are the official pass categories for **PEC Summit 2026** (March 15–16, 2026):\n\n${passSummaries}\n\nYou can claim student passes for free or register your team on the Passes page!`;
    }

    if (q.includes('hackathon') || q.includes('hacker') || q.includes('builder')) {
      return `⚡ The **PEC Summit 24-Hour Hackathon** features a ₹5.0L+ prize pool with ₹15L+ in overall rewards!
• **Tracks**: AI/ML, Web3 & Open Source, Climate Tech, and Open Innovation.
• **Pass**: Hackathon Builder Pass (₹199 / Hacker) covers 24-hour arena access, midnight meals, energy drinks, and $500+ cloud developer credits.
• **Team Size**: 2–4 builders.`;
    }

    if (q.includes('pitch') || q.includes('startup') || q.includes('investor') || q.includes('vc')) {
      return `🚀 The **PEC Summit Pitch Competition** offers a ₹7.5L cash pool plus direct investor matchmaking!
• **Pass**: Startup Founder & Pitch Pass (₹799 / Team of up to 4).
• **Perks**: 1-on-1 Investor Deck Review, priority slot in Investor Open Hours, and Startup Expo booth discounts.`;
    }

    if (q.includes('speaker') || q.includes('speaking') || q.includes('guest') || q.includes('who is coming')) {
      const speakerList = context.speakers.slice(0, 5).map((s) => `• **${s.name}** (${s.title}): ${s.bio}`).join('\n');
      return `🎙️ PEC Summit 2026 hosts 40+ industry leaders, founders, and VCs! Featured speakers include:\n\n${speakerList}\n\nCheck out the full speaker directory on the Speakers page.`;
    }

    if (q.includes('schedule') || q.includes('time') || q.includes('day 1') || q.includes('day 2') || q.includes('agenda')) {
      const day1 = context.events.filter((e) => e.day === 1).slice(0, 3);
      const day2 = context.events.filter((e) => e.day === 2).slice(0, 3);

      const day1Text = day1.map((e) => `  - ${e.startTime}–${e.endTime}: **${e.title}** (${e.venue})`).join('\n');
      const day2Text = day2.map((e) => `  - ${e.startTime}–${e.endTime}: **${e.title}** (${e.venue})`).join('\n');

      return `📅 **PEC Summit 2026 Schedule Highlights** (March 15–16 at PEC Chandigarh):\n\n**Day 1 (March 15):**\n${day1Text || '  - Keynote, Panel Discussions, Hackathon Kickoff'}\n\n**Day 2 (March 16):**\n${day2Text || '  - Pitch Competition Finals, Startup Expo, Award Gala'}\n\nVisit the Schedule tab for complete timings and venue directions!`;
    }

    if (q.includes('where') || q.includes('venue') || q.includes('location') || q.includes('reach') || q.includes('place')) {
      return `📍 **Venue & Location**:
PEC Summit 2026 is hosted at **Punjab Engineering College (Deemed to be University), Sector 12, Chandigarh, 160012**.
• Main Keynotes: Main Auditorium (Sector 12)
• Hackathon Arena: E-Learning Complex & CC Lab
• Startup Expo: Campus Central Lawns`;
    }

    return `Welcome to **PEC Summit 2026** — North India's premier entrepreneurship summit hosted by **E-Cell PEC** on **March 15–16, 2026** in Chandigarh!
I can help you with:
1. **Passes & Registration** (Student, Founder, Hackathon, Campus Ambassador)
2. **24-Hour Hackathon & Pitch Competition** (₹15L+ Prize Pool)
3. **Event Schedule & Speaker Lineup** (40+ Keynotes and Panels)
4. **Venue Directions & Campus Accommodation**

What would you like to explore?`;
  }

  private async queryGemini(
    query: string,
    history: any[],
    context: any,
  ): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;

    const systemPrompt = `You are the AI Concierge for PEC Summit 2026 hosted by E-Cell PEC Chandigarh on March 15-16, 2026.
Fest Context:
${JSON.stringify(context, null, 2)}
Answer questions concisely, accurately, enthusiastically in markdown.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...history.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          })),
          { role: 'user', parts: [{ text: query }] },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }
}
