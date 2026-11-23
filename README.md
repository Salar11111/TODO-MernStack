<div align="center">

# ✅ Task Master

**A MERN productivity app with a dashboard, calendar and drag-and-drop task board.**

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-38BDF8?logo=tailwindcss&logoColor=white)

</div>

---

## ✨ Why Task Master?

To-do apps are easy to start and hard to keep tidy. Task Master tries to close that gap: create tasks, group them into categories, add due dates and subtasks, then view the same work as a list, a calendar or a Kanban-style board. Filters and a small dashboard make it practical for everyday use rather than just another demo.

The backend is a conventional Express + MongoDB API with JWT auth, Zod validation, Helmet, rate limiting and email-based password reset. The frontend pairs TanStack Query for server data with dnd-kit for dragging and Framer Motion for transitions — a small, readable stack that still covers the full loop.

### 🧩 What's inside

- 🔐 **User authentication and protected routes.**
- ✅ **Create, update, complete and delete tasks**, with categories, due dates and metadata.
- 🧩 **Subtasks and task status** for breaking work down.
- 🖱️ **Drag and drop** tasks between workflow stages.
- 🔍 **Filters** by status, category and search term.
- 📅 **Calendar and dashboard views** of the same data.
- 📤 **JSON and CSV import/export** for backups and migrations.
- ✉️ **Password reset** through an email recovery flow.
- 📱 **Responsive layout** for desktop and mobile.

---

## 🚀 Quick start

Requirements: Node.js 20+, npm 9+, MongoDB (local or Atlas) and Git.

```bash
npm install
npm run install:all
```

Create the backend environment file:

```bash
cd Server
copy .env.example .env
```

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/todoapp
NODE_ENV=development
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@taskmaster.app
```

Start both the frontend and backend together:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 🧱 Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS, React Router |
| Interaction | Framer Motion, TanStack Query, dnd-kit |
| Backend | Node.js, Express 5, MongoDB + Mongoose |
| Auth / validation | JWT, Zod, Helmet, rate limiting, Nodemailer |
| Testing / tooling | Vitest, Supertest, ESLint, Docker Compose |

---

## 🏗 Architecture

```text
Client (React + Vite)  <--->  API (Express)  <--->  MongoDB
        |                          |
        |                          +--> Auth, Todos, Categories
        +--> JWT auth / protected routes
```

---

## 🗂 Project structure

```text
TODO - LIST/
├── client/                 # React frontend
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── Server/                 # Express backend
│   ├── config/ controllers/ middleware/ models/
│   ├── routes/ services/ validation/ tests/
│   └── package.json
├── package.json
└── README.md
```

---

## ✅ Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| Root | `npm run dev` | Run frontend and backend together |
| Root | `npm run build` | Build the frontend for production |
| Root | `npm run start` | Start the backend in production mode |
| Root | `npm test` | Run backend tests |
| Root | `npm run lint` | Frontend lint checks |
| Server | `npm run dev` | API with nodemon |
| Server | `npm test` | Server test suite |
| Client | `npm run dev` | Vite development server |
| Client | `npm run build` | Production build |

---

## 🚢 Production

```bash
npm run build
npm start
```

The server serves the built frontend and the API on port 5000. Make sure `NODE_ENV=production` and a valid `JWT_SECRET` are set in the server `.env`. Email password resets require valid SMTP credentials, and MongoDB must be running before the server starts.

---

## 🗺 Roadmap ideas

- 🧾 Richer task templates and recurring tasks
- 🤝 Shared lists with per-member permissions
- 📧 Digest emails for due dates
- 🧪 More client-side test coverage

---

<div align="center">

A clean, workflow-focused take on the everyday to-do list. Built with the MERN stack.

</div>
