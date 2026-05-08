# Vibe Gaming Extended

A full-stack college mini project for a browser-based gaming zone. It includes a static HTML/CSS/JavaScript frontend and a Node.js, Express, and MySQL backend for login, scores, and feedback.

## Games Included
- Memory Match
- Rock Paper Scissors
- Tic Tac Toe
- Snake Game
- Brick Breaker

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js, Express.js
- Database: MySQL or XAMPP MySQL
- Media: custom images, audio, and demo videos

## Setup
Install backend dependencies:

```bash
cd backend
npm install
copy .env.example .env
```

Update `backend/.env` with your MySQL settings.

Create the database:

```bash
mysql -u root -p < database.sql
```

Start the server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Project Structure
```text
.
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── database.sql
│   └── .env.example
└── frontend/
    ├── index.html
    ├── about.html
    ├── project.css
    ├── game-auth.js
    ├── memory game.html
    ├── rock game.html
    ├── tic tac toe.html
    ├── snake game.html
    └── brick game.html
```

## API Routes
- `GET /api/health`
- `POST /api/register`
- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`
- `POST /api/scores`
- `GET /api/scores`
- `POST /api/feedback`
- `GET /api/feedback`
