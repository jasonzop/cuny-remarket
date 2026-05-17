# CUNY ReMarket

A student-exclusive marketplace platform designed for CUNY students to safely buy, sell, and exchange items within their college community.

CUNY ReMarket helps students save money, reduce waste, and connect with verified peers through a trusted marketplace limited to CUNY email accounts.

---

## Team Members

- Jason Parmar  
- Kevin Tan  
- Bilal Bennour  
- Sammi Mushtaq  
- Omar Saleh  

---

## Features

### Authentication & Verification
- CUNY email-only login and registration
- Verified student accounts using `@login.cuny.edu`
- Secure authentication using Supabase Auth

### Marketplace Listings
Users can create listings with:

- Category
- Title
- Description
- Price
- Condition
- Department
- Course
- Campus location
- Images

Listings can be marked as:

- Available
- Reserved
- Sold

Users can also list free items.

### Search & Filtering
Search marketplace listings by:

- Keywords
- College/Campus
- Price range
- Category
- Department
- Course

### Saved Items
- Save favorite listings
- Dedicated Saved Items page
- Quick access through the navigation bar

### Messaging System
- Buyer-to-seller messaging
- Inbox system
- Seller information shown in chats

### User Profiles
Users can customize profiles with:

- Profile picture
- Major selection
- Editable profile information

### Smart Searchable Dropdowns
Users can:

- Search existing majors
- Search categories
- Search departments and courses
- Create new entries if they do not already exist

### Docker Support
- Full Docker containerization
- Easy local deployment

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js

### Database & Authentication
- PostgreSQL
- Supabase
- Supabase Authentication

### Deployment
- Render
- Docker Hub

---

## System Architecture

CUNY ReMarket follows a full-stack client-server architecture:

```text
Frontend (React + Vite)
          ↓
REST API (Express.js)
          ↓
Supabase PostgreSQL Database
```

Authentication is managed through Supabase while marketplace data, user profiles, listings, and messaging are stored in PostgreSQL.

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/cuny-remarket.git
cd cuny-remarket
```

### 2. Install Dependencies

Install project dependencies:

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SERPAPI_KEY=your_key_if_used
```

---

## Running the Application

### Run Development Server

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

Backend runs on:

```text
http://localhost:3001
```

---

## Docker Setup

Build Docker image:

```bash
docker build -t cuny-remarket .
```

Run container:

```bash
docker run --name CUNYReMarket \
--env-file .env \
-p 3001:3001 \
-p 5173:5173 \
jasonparmar10/cuny-remarket:latest
```

Open application:

```text
http://localhost:5173
```

---

## Deployment

### Live Backend

https://cuny-remarket-backend.onrender.com

Frontend and backend are deployed using Render.

---

## Future Improvements

- Real-time messaging notifications
- Improved recommendation system
- Better mobile responsiveness
- Campus-specific feeds
- Smarter search functionality
- AI-powered listing recommendations

---

## Project Goal

CUNY ReMarket was created to provide a secure and affordable marketplace exclusively for CUNY students.

Many students struggle with expensive textbooks, dorm essentials, electronics, and school supplies. Our platform allows students to buy and sell second-hand items within a trusted academic community, helping reduce costs and waste.

---

## License

This project was developed for academic purposes as part of a CUNY coursework final project.