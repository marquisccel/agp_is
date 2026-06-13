# AGP IS

AGP IS (Agrapana Greenworks Polymer Information System) is an internal information system for PET purchasing operations across warehouses. The current scope focuses on purchasing, supplier management, warehouse targets, approval workflows, transfer tracking, and management dashboards.

## Tech Stack

- Next.js 16 App Router
- React 19
- Prisma ORM
- PostgreSQL
- NextAuth v4
- Tailwind CSS v4
- Recharts

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL` and `NEXTAUTH_SECRET` in `.env`.

4. Generate Prisma Client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

5. Seed initial data when needed:

```bash
npm run seed
```

Seeded login accounts use `password123`. Available roles are Manager, Supervisor, Admin, and Staff. Example supervisor account:

```text
supervisor.kediri@example.com
```

6. Start the app:

```bash
npm run dev
```

## Verification

```bash
npm run build
npm run lint
```

`npm run lint` is currently part of the stabilization work and may still surface legacy issues until the cleanup is complete.
