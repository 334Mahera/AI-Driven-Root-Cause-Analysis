# AI-Driven Root Cause Analysis Platform

**AIVOA Recruitment Assignment | Product Development Project**

An AI-powered Root Cause Analysis (RCA) platform designed to support pharmaceutical API manufacturing investigations through structured workflows, evidence analysis, and AI-assisted decision support.

## 1. Problem Statement

Root cause analysis in pharmaceutical manufacturing requires structured investigations, evidence collection, identification of potential causes, and corrective and preventive action (CAPA) planning.

This project explores how AI can assist investigation teams by organizing evidence, generating potential root causes, and supporting systematic problem-solving.

## 2. Key Features

- **AI-Assisted RCA:** Generates root cause analysis based on investigation information.
- **Evidence Management:** Supports PDF report uploads and text extraction.
- **Five Whys Analysis:** Helps investigate underlying causes through iterative questioning.
- **Fishbone Analysis:** Organizes potential causes into structured categories.
- **Potential Cause Identification:** Presents possible contributing factors for investigation.
- **Missing Evidence Identification:** Highlights information that may be required for further verification.
- **CAPA Recommendations:** Suggests corrective and preventive actions.
- **Investigation Workflow:** Supports Draft, Under Review, Approved, and Committed stages.
- **Audit History:** Maintains a record of investigation-related activities.
- **AI Copilot:** Provides assistance within the investigation workflow.

## 3. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| State Management | Redux Toolkit |
| Backend | Python, FastAPI |
| AI Workflow | LangGraph |
| AI Model Provider | Groq |
| Database | PostgreSQL |
| PDF Processing | PyMuPDF |
| Development Tools | VS Code, Git, GitHub |

## 4. System Architecture

The application follows a frontend-backend architecture:

1. **Frontend:** React provides the user interface and investigation dashboard.
2. **Backend:** FastAPI handles API requests and application logic.
3. **AI Processing:** LangGraph coordinates AI-assisted analysis using Groq.
4. **Database:** PostgreSQL stores investigation information, evidence, root causes, CAPA actions, and audit logs.

## 5. Project Structure

```text
AI-Driven-Root-Cause-Analysis/
│
├── backend/
│   ├── ai/
│   │   └── graph.py
│   ├── database.py
│   ├── create_tables.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── .gitignore
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── features/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── .gitignore
│
├── .gitignore
└── README.md
```

## 6. Installation and Setup

### Prerequisites

- Python
- Node.js and npm
- PostgreSQL
- Groq API key

### Backend Setup

```bash
cd backend

python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your database connection and Groq API key in a local `backend/.env` file.

Initialize database tables:

```bash
python create_tables.py
```

Start the backend:

```bash
uvicorn main:app --reload
```

### Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Open the local development URL displayed by Vite in your browser.

## 7. Investigation Workflow

The platform supports the following investigation lifecycle:

**Draft → Under Review → Approved → Committed**

Investigations can include evidence, AI-assisted findings, Five Whys, Fishbone analysis, potential causes, and CAPA recommendations.

## 8. Product Perspective

This project demonstrates the application of AI to a domain-specific business problem through:

- Workflow-oriented product design.
- Structured investigation management.
- AI-assisted decision support.
- Evidence-driven problem-solving.
- Traceability through audit history.
- Human review of AI-generated findings.

## 9. Important Note

This repository contains a recruitment assignment project developed for the AIVOA recruitment process.

AI-generated findings and recommendations are intended as decision-support suggestions and require qualified human verification. They should not be treated as independently validated manufacturing or quality decisions.

## 10. Author

**Mahera Perween**

Computer Science and Design Undergraduate

[GitHub Profile](https://github.com/334Mahera)

---

*Developed as part of the AIVOA Product Associate recruitment assignment.*
