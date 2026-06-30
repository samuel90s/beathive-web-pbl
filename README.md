# Arsonus Web

Arsonus is a full-stack audio marketplace project with a NestJS backend and a Next.js frontend.

## Project Structure

```txt
beathive-backend/   Backend API
beathive-frontend/  Frontend web app
docker-compose.yml  Local Docker setup
```

## Quick Start

Clone the repository:

```bash
git clone https://github.com/samuel90s/arsonus-web-pbl.git
cd arsonus-web-pbl
```

Install backend:

```bash
cd beathive-backend
npm install
copy .env.example .env
```

For Linux/Mac, use:

```bash
cp .env.example .env
```

Fill `beathive-backend/.env` with your own credentials.

Install frontend:

```bash
cd ../beathive-frontend
npm install
copy .env.local.example .env.local
```

For Linux/Mac, use:

```bash
cp .env.local.example .env.local
```

Fill `beathive-frontend/.env.local` with your own public frontend values.

## Required Services

```txt
Node.js 18+
PostgreSQL
Redis
FFmpeg
```

Optional third-party APIs:

```txt
Google OAuth        Login with Google
Midtrans            Payment and subscription checkout
Flip.id             Bank account verification
SMTP or Mailgun     Email delivery
AWS S3/CloudFront   Cloud file storage and CDN
```

## Database Setup

Create a PostgreSQL database, then set `DATABASE_URL` in `beathive-backend/.env`.

Run Prisma:

```bash
cd beathive-backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed creates the required system data and demo admin account. Regular users can register from the app.

## Run Development

Backend:

```bash
cd beathive-backend
npm run start:dev
```

Frontend:

```bash
cd beathive-frontend
npm run dev
```

Default URLs:

```txt
Backend:  http://localhost:3000/api/v1
Frontend: http://localhost:3001
```

## Environment Files

Real `.env` files are not included and should never be committed.

Use these templates:

```txt
beathive-backend/.env.example
beathive-backend/.env.production.example
beathive-frontend/.env.example
beathive-frontend/.env.local.example
```

All API keys and secrets must be filled with the buyer's own accounts.