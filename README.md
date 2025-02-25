Linktree Backend
A scalable backend for a Linktr.ee/Bento.me-like platform built with Node.js, Prisma, PostgreSQL (Neon DB), Redis, and JWT. This project includes user authentication, a referral system, rate limiting, and caching for optimal performance.

Features
User Registration & Authentication:
Sign up with email, username, and password.
Login with JWT-based authentication.
Password reset via email with expiring tokens.
Referral System:
Unique referral links for users (e.g., https://yourdomain.com/register?referral=USER_ID).
Tracks successful referrals and provides referral statistics.
Security:
Passwords hashed with bcrypt.
Rate limiting using Redis to prevent brute-force attacks.
JWT stored securely (add HttpOnly cookies in production).
Performance:
Redis caching for frequently accessed data (referrals, stats).
Scalable architecture with Prisma and Neon DB connection pooling.
API:
RESTful endpoints for user management and referral tracking.
Tech Stack
Node.js: Backend runtime.
Express: Web framework.
Prisma: ORM for PostgreSQL.
PostgreSQL: Database (via Neon DB).
Redis: Rate limiting and caching.
bcrypt: Password hashing.
JWT: Authentication tokens.
Nodemailer: Email for password resets.
Prerequisites
Node.js: v16 or higher.
PostgreSQL: Neon DB or local instance.
Redis: Local or hosted instance (e.g., Redis Labs).
Docker: Optional, for running Redis locally.
Setup
1. Clone the Repository
bash
Wrap
Copy
git clone https://github.com/yourusername/linktree-backend.git
cd linktree-backend
2. Install Dependencies
bash
Wrap
Copy
npm install
3. Configure Environment Variables
Create a .env file in the root directory:

env
Wrap
Copy
DATABASE_URL="postgresql://user:password@neon-db-host:5432/dbname?sslmode=require"
JWT_SECRET="your-secret-key"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-email-password"
REDIS_URL="redis://localhost:6379"
Replace DATABASE_URL with your Neon DB connection string.
Use a strong JWT_SECRET.
Set up EMAIL_USER and EMAIL_PASS (e.g., Gmail SMTP credentials).
Update REDIS_URL if using a hosted Redis instance.
4. Set Up the Database
Run Prisma migrations to create tables:

bash
Wrap
Copy
npx prisma migrate dev --name init
5. Start Redis (Optional, if local)
bash
Wrap
Copy
docker run -d -p 6379:6379 redis
6. Run the Server
bash
Wrap
Copy
node src/index.js
The server will start on http://localhost:3000 (or your specified PORT).

API Endpoints
Authentication
POST /api/register
Body: { "email": "user@example.com", "username": "user1", "password": "strongpass123", "referralCode": "optional" }
Response: { "token": "jwt-token" }
POST /api/login
Body: { "emailOrUsername": "user@example.com", "password": "strongpass123" }
Response: { "token": "jwt-token" }
POST /api/forgot-password
Body: { "email": "user@example.com" }
Response: { "message": "Password reset email sent" }
Referral System
GET /api/referrals (Authenticated)
Headers: Authorization: Bearer <jwt-token>
Response: Array of referred users with usernames and emails.
GET /api/referral-stats (Authenticated)
Headers: Authorization: Bearer <jwt-token>
Response: { "successfulReferrals": 5 }
Security Features
Rate Limiting: Redis-based, 100 requests per IP per 15 minutes.
Caching: Referral data cached in Redis for 5 minutes.
SQL Injection: Prevented by Prisma's parameterized queries.
Password Security: Hashed with bcrypt.
Scaling
Redis: Use a Redis cluster for high availability.
Load Balancing: Deploy with multiple Node.js instances behind a load balancer (e.g., AWS ELB).
Database: Neon DB’s connection pooling handles high traffic.
Testing
Use Postman or cURL to test endpoints.
Verify caching: Repeated calls to /api/referral-stats should be faster after the first request.
Test rate limiting: Send >100 requests from the same IP within 15 minutes to trigger a 429 response.
Contributing
Fork the repository.
Create a feature branch (git checkout -b feature/new-feature).
Commit changes (git commit -m "Add new feature").
Push to the branch (git push origin feature/new-feature).
Open a pull request.
License
This project is licensed under the MIT License - see the LICENSE file for details.

Contact
For questions, reach out to your-email@example.com or open an issue.
