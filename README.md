This is a assessment submitted by Devansh Gaur for PrimetradeAI Internship. 
# Secure Notes API

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

A high-performance, asynchronous RESTful backend service built with FastAPI, designed to manage personal notes securely. This project implements stateless JWT-based authentication, Role-Based Access Control (RBAC), and is fully containerized using Docker for seamless deployment.

A lightweight vanilla HTML/JS frontend is also included to interact with the API directly.

## Quick Links
- **Live Postman Documentation:** [View Interactive API Docs](https://documenter.getpostman.com/view/51103349/2sBXiknW6g) *(Includes pre-configured request bodies and headers)*
- **Interactive Swagger UI:** Accessible at `http://localhost:8000/docs` (when running locally).
- **Image on Docker hub:** https://hub.docker.com/repository/docker/devansh10gaur/backend/general

---

## Key Features

* **Asynchronous Architecture:** Built using `asyncio` and `asyncpg` to handle high concurrency and non-blocking database operations.
* **Secure Authentication:** Implements OAuth2 with Password Flow and Bearer JWTs for stateless session management.
* **Modern Cryptography:** Secures user passwords using the industry-standard `bcrypt` hashing algorithm.
* **Full CRUD Functionality:** Create, read, update, and delete personal notes. Users can only access notes explicitly tied to their account.
* **Role-Based Access Control (RBAC):** Distinct `user` and `admin` roles. Admins have access to a protected dashboard to view all registered users.
* **Database Migrations:** Integrated with **Alembic** to ensure reliable database schema versioning and seamless state transitions.
* **Comprehensive Logging:** Built-in Python logging to track system events, auth attempts, and data modifications to a local `app.log` file.

---

## Tech Stack

**Backend**
* **Framework:** FastAPI
* **Database:** PostgreSQL 15
* **ORM:** SQLAlchemy 2.0 (Async)
* **Migrations:** Alembic
* **Security:** Python-JOSE (JWT), Bcrypt

**Frontend**
* **Technologies:** Vanilla HTML5, CSS3, JavaScript (ES6+ Fetch API)

**DevOps & Deployment**
* **Containerization:** Docker & Docker Compose
* **Web Server:** Uvicorn (ASGI)

---

## Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI application and route definitions
│   │   ├── models.py       # SQLAlchemy ORM models
│   │   ├── database.py     # Asyncpg engine and session management
│   │   └── auth.py         # JWT generation and Bcrypt hashing logic
│   ├── migrations/         # Alembic configuration and revision history
│   ├── dockerfile          # Backend container instructions
│   ├── requirements.txt    # Python dependencies
│   └── alembic.ini         # Alembic initialization file
├── frontend/
│   ├── index.html          # Main application UI
│   ├── app.js              # API interaction and DOM manipulation
│   └── style.css           # Styling
└── docker-compose.yml      # Multi-container orchestration (Web + DB)
```

### Local Development Setup
Because the application is fully containerized, you do not need to install Python or PostgreSQL on your host machine to run this project.

Prerequisites
- Docker
- Docker Compose

## Build and Spin Up the Containers
Clone the repository, navigate to the root directory where the docker-compose.yml file is located, and run:

**Bash:**
docker-compose up --build

Note: The docker-compose.yml file automatically maps the local backend directory to the container and sets up the PostgreSQL database (notes_db). Alembic will automatically upgrade the database to the latest schema upon startup.

## Access the Application
**Backend API / Swagger UI**: http://localhost:8000/docs

**Frontend UI**: Open frontend/index.html directly in your web browser, or serve it using a simple local server (e.g., VS Code Live Server).


## Future Scalability & Production Readiness
Although this application is currently designed as a single containerized unit for ease of assessment, the underlying architecture is highly scalable. To support production-level traffic and high availability, the following scalability strategies would be implemented:

**1. Horizontal Scaling & Load Balancing:**

Because the FastAPI application is inherently stateless (JWT tokens manage user sessions rather than server-side memory), the web tier can be infinitely scaled horizontally. Multiple instances of the FastAPI container would be placed behind a Reverse Proxy / Load Balancer (e.g., Nginx, AWS ALB). This distributes incoming API requests evenly across all available containers.

**2. Caching Layer (Redis):**

Currently, every request to fetch notes (GET /api/v1/notes) directly queries PostgreSQL. In a read-heavy application, we would introduce an in-memory data store like Redis. Subsequent requests would be served from the lightning-fast cache, with cache invalidation triggered on POST/PUT/DELETE write operations.

**3. Transition to Microservices:**

As the application grows, the monolithic structure can be decoupled. We would separate the Auth Service (handling registration and JWT issuance) from the Notes Service. This allows independent deployment; if authentication endpoints receive massive traffic, we can allocate more compute strictly to the Auth Service without over-provisioning the Notes Service.

**4. Database Optimization:**

To scale the data layer, we would introduce Connection Pooling (using PgBouncer) to manage asynchronous database connections efficiently. Furthermore, we would set up Read Replicas—directing all GET requests to replicas while keeping the primary database dedicated strictly to write operations.
