# march-people-s-app

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_mPTRGtBT6sJjHVZC05ZkPTsnJAIB)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

## Auth + MongoDB setup

This app uses Better Auth with the MongoDB adapter.

### 1) Start MongoDB

You need a running MongoDB instance before logging in or registering.

Option A — local MongoDB with Docker:

```bash
docker run -d \
  --name netizen-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=netizen \
  mongo:7
```

Option B — MongoDB Atlas:

- Create a cluster on MongoDB Atlas.
- Copy the connection string.
- Set it in `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/netizen
MONGODB_DB_NAME=netizen
BETTER_AUTH_SECRET=your-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2) Add environment values

Create `.env.local` in the project root with:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/netizen
MONGODB_DB_NAME=netizen
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3) Start the app

```bash
npm install
npm run dev
```

Then open:

- http://localhost:3000/login
- http://localhost:3000/register

### 4) Common error fix

If you see:

```text
MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

it means MongoDB is not running. Start MongoDB, then retry the login/register request.

### 5) Auth endpoints

The app exposes Better Auth endpoints at:

- `/api/auth/sign-up/email`
- `/api/auth/sign-in/email`
- `/api/auth/sign-out`
- `/api/auth/get-session`
