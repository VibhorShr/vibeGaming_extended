# Vibe Gaming

A beginner-friendly gaming zone built using HTML, CSS, JavaScript, Node.js, Express, and MySQL as a college mini project.

## Games Included
- Memory Match - test your memory by matching card pairs.
- Rock Paper Scissors - play against the AI.
- Tic Tac Toe - classic 1v1 fun on the same device.
- Snake Game - control the snake, eat food, and grow longer.
- Brick Breaker - destroy all the bricks and beat handcrafted levels.

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js, Express.js
- Database: MySQL or XAMPP MySQL
- Icons and Fonts: FontAwesome, Google Fonts
- Media: Custom images and demo videos

## Backend Setup
Run these commands from the `backend` folder:

```bash
cd backend
npm install
copy .env.example .env
```

Update `backend/.env` with your MySQL settings. For XAMPP MySQL, the default is usually:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=vibe_gaming
```

Create the database and table:

```bash
mysql -u root -p < database.sql
```

Start the backend server:

```bash
npm start
```

Open the project through Express:

```text
http://localhost:3000
```

The suggestion box and rating section save data to the `feedback` table.

## Project Structure
```text
webproject/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── database.sql
│   ├── .env.example
│   └── node_modules/
└── frontend/
    ├── index.html
    ├── about.html
    ├── project.css
    ├── memory game.html
    ├── rock game.html
    ├── tic tac toe.html
    ├── snake game.html
    ├── brick game.html
    └── media files
```

## API Endpoints
- `GET /api/health` - checks server and MySQL connectivity.
- `POST /api/register` - creates a player account.
- `POST /api/login` - logs in a player and returns a session token.
- `GET /api/me` - checks the current logged-in player.
- `POST /api/logout` - logs out the current player.
- `POST /api/scores` - saves a score for the logged-in player.
- `GET /api/scores` - returns the latest leaderboard scores.
- `POST /api/feedback` - saves suggestion text and rating.
- `GET /api/feedback` - returns the latest saved feedback entries.

## Developers
B.Tech 2nd Year Students, Jaypee Institute of Information Technology

## Contact
- Email: vibegaming18@gmail.com
- Phone: +91 8219603264
- Instagram: @vibe_ig
- Twitter/X: @vibegaming_xhandle

## License
This project is created for educational purposes only.
All rights reserved © 2025 Vibe Gaming.
