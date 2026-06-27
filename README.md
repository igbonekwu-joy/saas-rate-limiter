# API Rate Limiting Platform

A production-grade SaaS API rate limiting service built with NestJS and PostgreSQL. Protects APIs using a sliding window counter algorithm with per-plan limits, burst protection, and real-time analytics.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [How It Works](#how-it-works)
- [Design Decisions](#design-decisions)

---

## Overview

Most APIs need rate limiting, but building it correctly is harder than it looks. This platform implements rate limiting as a standalone service that any API can plug into. It handles the hard parts: concurrent request counting without race conditions, burst traffic detection, plan-based limits, and aggregated analytics — all backed by PostgreSQL with no Redis dependency.

---

## Features

- **API key generation and management** — users generate keys tied to their account, each with plan-based limits applied automatically
- **Sliding window counter algorithm** — accurate rate limiting that avoids the boundary bug of fixed-window approaches
- **Per-plan limits** — free tier (100 req/min) and paid tier (10,000 req/min) with limits set automatically on key creation
- **Burst limiting** — a second, independent 1-second window prevents traffic spikes even when per-minute limits aren't exceeded
- **Proper HTTP rate limit headers** — every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on 429s
- **Analytics and usage reporting** — pre-computed rollup tables give fast dashboard queries regardless of traffic volume
- **Rejection tracking** — rejected requests are counted separately, enabling accurate rejection rate reporting
- **Automatic cleanup** — scheduled jobs delete rolled-up raw counter rows to keep the table small

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Request                        │
│                   (X-API-Key: <key>)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    RateLimitGuard                            │
│                                                             │
│  1. Look up API key in database                             │
│  2. Run per-minute sliding window check (60s window)        │
│  3. Run burst sliding window check (1s window)              │
│  4. Attach results to request for header interceptor        │
└────────────┬─────────────────────────────┬──────────────────┘
             │ allowed                     │ blocked
             ▼                             ▼
┌────────────────────┐         ┌───────────────────────────┐
│  Controller runs   │         │     RateLimitException     │
│                    │         │     thrown with details    │
│  RateLimitHeaders  │         └───────────┬───────────────┘
│  Interceptor adds  │                     │
│  headers to 200    │                     ▼
└────────────────────┘         ┌───────────────────────────┐
                               │     RateLimitFilter        │
                               │     catches exception,     │
                               │     sets 429 headers,      │
                               │     sends response         │
                               └───────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│                                                             │
│   rate_limit_counter                                        │
│   ┌──────────────┬────────────┬───────────┬───────────┐    │
│   │ apiKeyId     │ bucketTime │ count     │ rejected  │    │
│   │ abc:minute   │ 12:00:00   │ 45        │ 5         │    │
│   │ abc:burst    │ 12:00:45   │ 12        │ 0         │    │
│   └──────────────┴────────────┴───────────┴───────────┘    │
│          │  (raw, per-second/per-minute buckets)            │
│          │                                                  │
│          │ every 5 mins (computeRollups cron)               │
│          ▼                                                  │
│   analytics_rollup                                          │
│   ┌──────────────┬────────────┬──────────┬────────────┐    │
│   │ apiKeyId     │ hourBucket │ requests │ rejections │    │
│   │ abc          │ 12:00:00   │ 1250     │ 87         │    │
│   └──────────────┴────────────┴──────────┴────────────┘    │
│          (pre-computed, always fast to query)               │
└─────────────────────────────────────────────────────────────┘
```

### Request lifecycle

1. Request arrives with `X-API-Key` header
2. `RateLimitGuard` looks up the key in the database
3. Two sliding window checks run in sequence — per-minute and burst
4. Each check does an atomic upsert (`ON CONFLICT DO UPDATE SET count = count + 1`) — no race conditions
5. If both pass, results are attached to the request and the controller runs
6. `RateLimitHeadersInterceptor` adds quota headers to the 200 response on the way out
7. If either check fails, `RateLimitException` is thrown and `RateLimitFilter` handles the 429 response with headers

### Rollup pipeline

Every 5 minutes, a cron job (`computeRollups`) aggregates per-minute raw counter rows into hourly summaries in `analytics_rollup` using `DATE_TRUNC('hour', bucketTime)`. After each row is safely written to the rollup table, the raw counter rows are stamped with `rolledUpAt`. A separate cleanup cron deletes only stamped rows — ensuring no data is deleted before it has been summarised.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS |
| Database | PostgreSQL |
| ORM | TypeORM |
| Validation | Zod + nestjs-zod |
| Scheduling | @nestjs/schedule |
| API Docs | Swagger (OpenAPI) |
| Package Manager | pnpm |
| Runtime | Node.js |

---

## Installation

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for running PostgreSQL locally)

### 1. Clone the repository

```bash
git clone https://github.com/igbonekwu-joy/saas-rate-limiter.git
cd saas-rate-limiter
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=devpassword
DB_NAME=rate_limiter
WINDOW_SECONDS=60
```

### 4. Run the app

```bash
# development
pnpm run start:dev

# production
pnpm run build
pnpm run start:prod
```

### 5. Open the Swagger docs

Visit `http://localhost:3000/docs` to explore and test all endpoints interactively.

> **Note:** `synchronize: true` is enabled in development — TypeORM will create and update all database tables automatically on startup. Never use this in production; use migrations instead.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `devpassword` |
| `DB_NAME` | Database name | `rate_limiter` |
| `WINDOW_SECONDS` | Total seconds for ratelimit per minute  | `60` |

---

## API Endpoints

### API Keys

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api-keys` | Generate a new API key | JWT (Bearer) |
| GET | `/api-keys/guard-test` | Example rate-limited endpoint | X-API-Key |

### Analytics

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/analytics/overview` | Platform-wide stats (last 24h) | None |
| GET | `/analytics/top-keys` | Top 10 keys by request volume (last 24h) | None |
| GET | `/analytics/usage/:apiKeyId` | Hourly usage for a specific key (last 24h) | None |
| GET | `/analytics/rejection-rate/:apiKeyId` | Rejection rate for a specific key (last 24h) | None |

### Response Headers

Every response from a rate-limited endpoint includes:

```
X-RateLimit-Limit: 100          # total requests allowed per window
X-RateLimit-Remaining: 73       # requests remaining in current window
X-RateLimit-Reset: 1719251234   # unix timestamp when the window resets
```

On `429 Too Many Requests`, an additional header is included:

```
Retry-After: 45                 # seconds to wait before retrying
```

### Example 429 response body

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded — per-minute limit",
  "limit": 100,
  "remaining": 0,
  "resetAt": "2026-06-24T12:01:00.000Z",
  "retryAfter": 45
}
```

---

## How It Works

### Sliding window counter algorithm

Unlike a fixed-window approach (which resets counts at hard clock boundaries and allows double the limit right around midnight), this implementation uses a sliding window counter approximation:

```
estimated count = (previous bucket count × overlap%) + current bucket count
```

Where `overlap%` is how much of the previous 60-second bucket is still inside the current 60-second window. For example, if you are 15 seconds into the current minute, the previous minute contributes 75% of its count (45 of its 60 seconds are still inside the window).

This gives accurate rate limiting without storing individual request timestamps, which would require scanning thousands of rows on every request.

### Atomic counters

Each request performs a single atomic upsert:

```sql
INSERT INTO rate_limit_counter ("apiKeyId", "bucketTime", count)
VALUES ($1, $2, 1)
ON CONFLICT ("apiKeyId", "bucketTime")
DO UPDATE SET count = rate_limit_counter.count + 1
```

This is atomic at the database level, no two concurrent requests can both read the same count and both write the same incremented value. One wins and the other increments on top of it, preventing the race condition that would occur with a read-then-write approach.

### Two independent windows

Every request is checked against two windows simultaneously:

- **Per-minute window (60s)** — enforces the plan-based limit (e.g. 100 req/min for free tier)
- **Burst window (1s)** — enforces the burst limit (e.g. 20 req/sec) to prevent traffic spikes from overwhelming downstream services even when the per-minute limit hasn't been hit

Both must pass for the request to go through.

### Rollup table for analytics

Raw counter rows are aggregated every 5 minutes into `analytics_rollup` using `DATE_TRUNC('hour', bucketTime)`. Analytics queries always hit the small rollup table rather than the potentially large raw counter table, keeping dashboard queries fast regardless of traffic volume. Raw rows are only deleted after they have been confirmed as rolled up via the `rolledUpAt` timestamp.

---

## Design Decisions

**Why PostgreSQL instead of Redis for counters?**
Redis is the conventional choice for rate limiting counters because of its speed. This project deliberately uses PostgreSQL to demonstrate that correct, race-condition-free counters are achievable with atomic SQL upserts, and that the performance bottleneck can be addressed through algorithm design (counter buckets vs. timestamp rows) rather than by adding infrastructure dependencies.

**Why the sliding window approximation instead of exact sliding window?**
An exact sliding window stores every request timestamp and counts those within the last N seconds. This is accurate but requires scanning rows on every request, therefore it does not scale. The counter approximation trades a small margin of inaccuracy (assumes even distribution within each bucket) for queries that always touch exactly two rows, regardless of traffic volume.

**Why a separate rollup table for analytics?**
Querying `rate_limit_counter` directly for analytics would work at low traffic but becomes slow as the table grows. Pre-computing hourly summaries in `analytics_rollup` means dashboard queries always aggregate a small table of summaries rather than millions of raw rows. The 5-minute staleness is an acceptable tradeoff for the query performance guarantee.

**Why are raw counters only deleted after rollup confirmation?**
A naive cleanup job that deletes rows older than N minutes would race against the rollup job and delete data before it has been summarised. Stamping rows with `rolledUpAt` after confirmed rollup and only deleting stamped rows eliminates this race condition entirely.