# Cloud Storage with Access Control

A simple cloud storage API with user authentication, file upload/download, and sharing permissions.

## Features

- User registration & login (JWT auth)
- File upload & download
- Public / private file visibility
- Share files with other users (read or write access)
- Owner-only delete and share management

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Edit `.env` with your own `JWT_SECRET`

3. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (body: username, email, password) |
| POST | `/api/auth/login` | Login (body: username, password) |

### Files (prefix with `/api/files`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload` | Yes | Upload a file (multipart/form-data, field: file) |
| GET | `/` | Yes | List your files + files shared with you |
| GET | `/public` | No | List all public files |
| GET | `/:id` | No* | Download a file (*public or valid token) |
| PATCH | `/:id/visibility` | Yes | Set public/private (body: { is_public: bool }) |
| DELETE | `/:id` | Yes | Delete your file |
| POST | `/:id/share` | Yes | Share with user (body: { username, permission }) |
| DELETE | `/:id/share/:username` | Yes | Remove share |

## Access Control Model

- **Owner** has full control (upload, download, delete, share, set visibility)
- **Shared (write)** — can download
- **Shared (read)** — can download
- **Public** — anyone can download
- **Private + not shared** — only owner
