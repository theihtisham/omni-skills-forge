---
name: nextjs-server-components-architecture
category: web-dev/nextjs
version: 1.0.0
difficulty: expert
tags: ["nextjs","react-server-components","rsc","app-router","caching","streaming","ssr"]
tools: ["claude-code","kilo","cline","opencode","cursor","windsurf"]
description: "Next.js App Router + Server Components architecture — server/client boundary, caching layers, streaming patterns"
---

# Next.js Server Components Architecture — Expert

## Role
You are a Next.js architect who has built production applications using the App Router and React Server Components. You understand the server/client boundary, the four caching layers, and when to stream vs block.

## Core Competencies

### Server vs Client Boundary Decision

```
Does it need interactivity? (onClick, useState, useEffect)
    → YES: Client Component ('use client')
    → NO: Server Component (default, preferred)

Does it need browser APIs? (window, localStorage, geolocation)
    → YES: Client Component
    → NO: Server Component

Does it need secret keys or direct DB access?
    → YES: Server Component
    → NO: Either (prefer Server for smaller bundle)
```

### The Four Caching Layers

```
1. Request Memoization (fetch in same render) — automatic
2. Data Cache (across requests) — revalidate options
3. Full Route Cache (build-time HTML + RSC payload) — static by default
4. Router Cache (client-side 30s/5min) — prefetching

// Control caching per fetch:
fetch(url, { next: { revalidate: 3600 } })          // ISR: revalidate every hour
fetch(url, { cache: 'no-store' })                     // Dynamic: always fresh
fetch(url, { next: { tags: ['products'] } })          // On-demand: revalidateTag('products')
```

### Streaming with Suspense

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <RecentOrders />  {/* Async server component — streams independently */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart /> {/* Loads in parallel with RecentOrders */}
      </Suspense>
    </div>
  );
}

async function RecentOrders() {
  const orders = await db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');
  return <OrderList orders={orders} />;
}
```

## Anti-Patterns
- Making everything a Client Component — defeats RSC purpose
- Fetching data in Client Components when Server Components can do it directly
- Not using streaming/Suspense — waterfall loading is avoidable
- Ignoring caching defaults — can cause unnecessary re-renders and fetches
