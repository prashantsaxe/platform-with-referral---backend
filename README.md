# Linktree Backend
A scalable backend for a Linktr.ee/Bento.me-like platform built with **Node.js, Prisma, PostgreSQL (Neon DB), Redis, and JWT**. 
This project includes **user authentication, a referral system, rate limiting, and caching** for optimal performance.

## Features
### **User Registration & Authentication:**
- Sign up with email, username, and password.
- Login with JWT-based authentication.
- Password reset via email with expiring tokens.

### **Referral System:**
- Unique referral links for users (e.g., `https://yourdomain.com/register?referral=USER_ID`).
- Tracks successful referrals and provides referral statistics.

### **Security:**
- Passwords hashed with bcrypt.
- Rate limiting using Redis to prevent brute-force attacks.
- JWT stored securely (use HttpOnly cookies in production).

### **Performance:**
- Redis caching for frequently accessed data (referrals, stats).
- Scalable architecture with Prisma and Neon DB connection pooling.

### **API:**
- RESTful endpoints for user management and referral tracking.

---

##  Tech Stack
- **Node.js** - Backend runtime
- **Express** - Web framework
- **Prisma** - ORM for PostgreSQL
- **PostgreSQL** - Database (via Neon DB)
- **Redis** - Rate limiting and caching
- **bcrypt** - Password hashing
- **JWT** - Authentication tokens
- **Nodemailer** - Email for password resets

---

##  Prerequisites
- **Node.js**: v16 or higher
- **PostgreSQL**: Neon DB or local instance
- **Redis**: Local or hosted instance (e.g., Redis Labs)
- **Docker**: Optional, for running Redis locally

---

##  Setup
### **1️ Clone the Repository**
```sh
git clone https://github.com/yourusername/linktree-backend.git
cd linktree-backend
```

### **2️ Install Dependencies**
```sh
npm install
```

### **3️ Configure Environment Variables**
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@neon-db-host:5432/dbname?sslmode=require"
JWT_SECRET="your-secret-key"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-email-password"
REDIS_URL="redis://localhost:6379"
```
- Replace `DATABASE_URL` with your Neon DB connection string.
- Use a strong `JWT_SECRET`.
- Set up `EMAIL_USER` and `EMAIL_PASS` (e.g., Gmail SMTP credentials).
- Update `REDIS_URL` if using a hosted Redis instance.

### **4️ Set Up the Database**
```sh
npx prisma migrate dev --name init
```

### **5️ Start Redis (Optional, if local)**
```sh
docker run -d -p 6379:6379 redis
```

### **6️ Run the Server**
```sh
node src/index.js
```
The server will start on **http://localhost:3000** (or your specified `PORT`).

---

##  API Endpoints
### **Authentication**
#### ➤ Register
```http
POST /api/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "username": "user1",
  "password": "strongpass123",
  "referralCode": "optional"
}
```
**Response:**
```json
{
  "token": "jwt-token"
}
```

#### ➤ Login
```http
POST /api/login
```
**Body:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "strongpass123"
}
```
**Response:**
```json
{
  "token": "jwt-token"
}
```

#### ➤ Forgot Password
```http
POST /api/forgot-password
```
**Body:**
```json
{
  "email": "user@example.com"
}
```
**Response:**
```json
{
  "message": "Password reset email sent"
}
```

### **Referral System**
#### ➤ Get Referrals (Authenticated)
```http
GET /api/referrals
```
**Headers:**
```http
Authorization: Bearer <jwt-token>
```
**Response:**
```json
[
  { "username": "refUser1", "email": "ref1@example.com" },
  { "username": "refUser2", "email": "ref2@example.com" }
]
```

#### ➤ Get Referral Stats (Authenticated)
```http
GET /api/referral-stats
```
**Headers:**
```http
Authorization: Bearer <jwt-token>
```
**Response:**
```json
{
  "successfulReferrals": 5
}
```

---

##  Security Features
- **Rate Limiting:** Redis-based, **100 requests per IP per 15 minutes**.
- **Caching:** Referral data cached in Redis for **5 minutes**.
- **SQL Injection Protection:** Prisma’s parameterized queries prevent injection attacks.
- **Password Security:** Hashed with bcrypt.

---

##  Scaling
- **Redis:** Use a **Redis cluster** for high availability.
- **Load Balancing:** Deploy with multiple Node.js instances behind a load balancer (e.g., AWS ELB).
- **Database:** Neon DB’s connection pooling handles high traffic.

---

##  Testing
- **Postman or cURL** to test endpoints.
- **Verify caching:** Repeated calls to `/api/referral-stats` should be faster after the first request.
- **Test rate limiting:** Send **>100 requests** from the same IP within **15 minutes** to trigger a `429` response.

---

##  Contributing
1. **Fork** the repository.
2. Create a feature branch:
   ```sh
   git checkout -b feature/new-feature
   ```
3. **Commit changes**:
   ```sh
   git commit -m "Add new feature"
   ```
4. **Push to the branch**:
   ```sh
   git push origin feature/new-feature
   ```
5. Open a **pull request**.

---

##  Contact
For questions, reach out to `prashantxhunter@gmail.com` or open an issue.
