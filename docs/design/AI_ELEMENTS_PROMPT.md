# AI Elements Deployment & Integration Prompt Blueprint

This document contains step-by-step instructions, implementation recipes, and prompt patterns for integrating Vercel AI SDK and AI Elements into an AI-native Next.js application.

---

## 1. System Requirements

* **Node.js**: `v18.0.0` or later
* **Framework**: Next.js 14/15 (App Router recommended)
* **UI Foundation**: `shadcn/ui` (Radix UI primitives)
* **Styling**: Tailwind CSS V4

---

## 2. Installation Recipes

Run the following commands in your terminal to set up the runtime library dependencies:

```bash
# Install core AI SDK and official model providers
npm install ai @ai-sdk/openai @ai-sdk/google @ai-sdk/anthropic

# Install Radix UI primitives for high-fidelity animations
npm install @radix-ui/react-slot lucide-react clsx tailwind-merge
```

---

## 3. Environment Configuration

Create a `.env.local` file in your root folder and configure the API Keys for your preferred large language model providers:

```env
# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# SiliconFlow API Key (For DeepSeek and open-source models)
SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# OpenRouter / Custom compatible gateways
OPENROUTER_API_KEY=your_openrouter_api_key_here
NEXT_PUBLIC_CUSTOM_ENDPOINT=https://api.yourprovider.com/v1
```

---

## 4. Next.js Route Handler (`/app/api/chat/route.ts`)

Here is an optimized server-side route handler using the Vercel AI SDK to stream models with reasoning content (like DeepSeek-R1 or o1):

```typescript
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, provider, model, apiKey, customUrl } = await req.json();

  // Dynamically configure vendor
  let apiKeyToUse = apiKey || process.env.OPENAI_API_KEY;
  let baseUrlToUse = customUrl || 'https://api.openai.com/v1';

  if (provider === 'siliconflow') {
    apiKeyToUse = apiKey || process.env.SILICONFLOW_API_KEY;
    baseUrlToUse = 'https://api.siliconflow.cn/v1';
  }

  const customClient = createOpenAI({
    apiKey: apiKeyToUse,
    baseURL: baseUrlToUse,
  });

  const result = streamText({
    model: customClient(model || 'gpt-4o-mini'),
    messages,
    system: 'You are a highly capable AI Scientist. Provide rigorous, citation-backed answers with detailed reasoning steps.',
  });

  return result.toDataStreamResponse();
}
```

---

## 5. Front-End AI Elements Component Usage

Use these React patterns to build an AI-native interface featuring `<Chat>`, `<Message>`, `<Reasoning>`, `<Attachment>`, and `<Citations>`:

```tsx
'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';
import { Bot, User, Brain, BookOpen, Paperclip, Send } from 'lucide-react';

export default function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-[600px] border border-zinc-800 rounded-2xl bg-zinc-950 overflow-hidden text-zinc-200">
      
      {/* 1. Model Selector Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
        <span className="text-xs font-bold font-mono tracking-wider text-purple-400">
          &lt;ModelSelector&gt; deepseek-r1
        </span>
      </div>

      {/* 2. Chat Conversation Viewport */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 border border-purple-500/10'}`}>
              
              {/* Optional: DeepSeek-style reasoning rendering */}
              {m.role === 'assistant' && (
                <div className="mb-3 bg-black/40 border-l-2 border-purple-500 pl-3 py-1.5 text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5 font-bold mb-1">
                    <Brain className="h-3.5 w-3.5" /> Reasoning Process
                  </span>
                  <div>Thinking: Verifying clinical database sources for mutations... Done.</div>
                </div>
              )}

              {/* Main message text */}
              <p className="text-sm">{m.content}</p>

              {/* Citation attachments */}
              {m.role === 'assistant' && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                  <span>[1] NCCN Oncology Guidelines (2025)</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Attachment Panel & Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900 flex gap-2">
        <button type="button" className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask AI your scientific or medical query..."
          className="flex-1 bg-zinc-800 border-none rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none"
        />
        <button type="submit" className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
```

---
*Created and optimized for Pancreas OSINT platform deployment.*
