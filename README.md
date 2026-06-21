# CloudStorage — Secure File Storage with Access Control

A full-stack cloud storage application built with Node.js, featuring user authentication, file upload/download, and granular access control. Designed as a scalable, production-ready system demonstrating cloud architecture principles.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Browser   │────▶│  Express.js  │────▶│  SQLite   │
│  (HTML/CSS) │     │   (REST API) │     │  (or PG)  │
└─────────────┘     └──────────────┘     └───────────┘
                           │
                    ┌──────┴──────┐
                    │  File System │
                    │  (uploads/)  │
                    └─────────────┘
```

- **Frontend**: Static HTML/CSS/JS served by Express
- **Backend**: RESTful API with Express.js
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Auth**: JWT-based stateless authentication
- **File Storage**: Local filesystem (pluggable to S3/GCS)

## Features

- **User authentication** — register, login, JWT tokens
- **File management** — upload, download, delete
- **Access control** — three-tier permission model
- **File sharing** — share files with specific users (read/write)
- **Public files** — toggle visibility for anonymous access

## Access Control Model

| Actor | Upload | Download | Delete | Share | Set Visibility |
|-------|--------|----------|--------|-------|----------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shared (write) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Shared (read) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Public (anyone) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Private + not shared | ❌ | ❌ | ❌ | ❌ | ❌ |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |

### Files (all require `Authorization: Bearer <token>` except /public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file (multipart/form-data) |
| GET | `/api/files/` | List owned + shared files |
| GET | `/api/files/public` | List public files (no auth) |
| GET | `/api/files/:id` | Download file |
| PATCH | `/api/files/:id/visibility` | Toggle public/private |
| DELETE | `/api/files/:id` | Delete file (owner only) |
| POST | `/api/files/:id/share` | Share with user |
| DELETE | `/api/files/:id/share/:username` | Remove share |

## Quick Start

```bash
# Install
npm install

# Configure
edit .env   # Set JWT_SECRET

# Run
npm start   # http://localhost:3000
```

## Deployment

The app is deployed on Render at: [https://cloud-storage-jgkx.onrender.com](https://cloud-storage-jgkx.onrender.com)

### Deploy your own
1. Fork this repo
2. Create a [Render](https://render.com) account
3. Click **New +** → **Blueprint** → select your fork
4. Render auto-detects `render.yaml` and deploys

## Scalability Considerations

- **Stateless API** — horizontal scaling with load balancer
- **Database** — swap SQLite for PostgreSQL via `DATABASE_URL`
- **File storage** — replace local disk with S3-compatible storage
- **Caching** — add Redis for file metadata
- **CDN** — serve public files through CDN for low-latency access

## Tech Stack

- Node.js / Express.js
- SQLite (better-sqlite3)
- JWT (jsonwebtoken)
- bcryptjs
- Multer (file uploads)
- Render (cloud hosting)
