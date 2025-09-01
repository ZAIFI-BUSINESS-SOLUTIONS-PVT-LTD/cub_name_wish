# Gemini Agent Configuration

This file provides context to the Gemini agent to help it understand and assist with this project.

## Project Overview

This is a web application for creating personalized images, likely for events like Teacher's Day, based on the project name "teachersday". It consists of a React/Vite frontend and a Node.js/Express backend.

The backend handles image generation and management, while the frontend provides a user interface for editing and creating the images.

## Tech Stack

### Frontend

- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios

### Backend

- **Framework:** Express.js
- **Language:** TypeScript
- **Image Processing:** sharp
- **File Uploads:** multer
- **Scheduled Tasks:** node-cron (likely for cleanup)

## Project Structure

- `frontend/`: Contains the React frontend application.
  - `src/pages/`: Contains the main pages of the application (Editor, Landing).
- `backend/`: Contains the Node.js backend application.
  - `src/routes/`: Defines the API endpoints.
  - `src/services/`: Contains the business logic for image processing and cleanup.
  - `templates/`: Stores image templates.
  - `generated/`: Stores the generated images.
  - `uploads/`: Stores user-uploaded files.

## Development Workflow

### Running the Backend

To run the backend server in development mode:

```bash
cd backend
npm install
npm run dev
```

The server will start on the port configured in `src/index.ts`.

### Running the Frontend

To run the frontend application in development mode:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be accessible in your browser, likely at `http://localhost:5173`.
