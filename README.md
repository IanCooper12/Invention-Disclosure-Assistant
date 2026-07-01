# Invention Disclosure Assistant

A web app that takes plain-language input from an engineer or inventor and uses the Claude API to produce a structured invention disclosure document. The output follows the standard sections a patent agent or attorney would expect to receive (title, field, background, summary, detailed description, novelty, prior art), formatted and ready to share. The goal is to reduce the friction between "I have an idea" and "I have something my attorney can actually work with."

## Built With

- [React](https://react.dev/) (Vite)
- [FastAPI](https://fastapi.tiangolo.com/) (Python)
- [Anthropic Claude API](https://docs.anthropic.com/) (`claude-sonnet-4-6`)
- python-dotenv, uvicorn, pydantic

## Getting Started

**Prerequisites:** Node.js 18+, Python 3.9+

### 1. Clone the repo

```bash
git clone https://github.com/IanCooper12/Invention-Disclosure-Assistant
cd Invention-Disclosure-Assistant
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` folder:

```
ANTHROPIC_API_KEY=your_api_key_here
```

Get an API key at [console.anthropic.com](https://console.anthropic.com). The `.env` file is gitignored and will never be committed.

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

### 4. Run the app

In one terminal, start the backend:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

In a second terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser (Vite may use 5174 if 5173 is taken).

## Usage

Fill out the form with a plain-language description of your invention: what problem it solves, how it works, what makes it different, and any prior art you are aware of. Click "Generate Disclosure Draft" and the app will send your input to the Claude API and return a structured disclosure document. You can copy the draft to your clipboard or use "Save as PDF" to download it via your browser's print dialog.

---

**Disclaimer:** This tool is a drafting aid only. It does not constitute legal advice and does not establish any attorney-client relationship. Have all documents reviewed by a qualified patent agent or attorney before use.
