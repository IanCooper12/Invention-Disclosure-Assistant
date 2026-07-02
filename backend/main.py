import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic

# Load API key from .env file
load_dotenv()

app = FastAPI()

# Allow requests from the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# System prompt sent with every Claude API call
# Defines the output structure and instructs Claude not to give legal advice
SYSTEM_PROMPT = (
    "You are assisting a non-lawyer engineer or inventor in drafting a formal "
    "invention disclosure document for review by a patent agent or attorney. Take "
    "the plain-language input provided and restructure it into the following "
    "standard sections:\n\n"
    "1. Title of Invention\n"
    "2. Field of Invention (one or two sentences on the general technical area)\n"
    "3. Background / Problem Statement\n"
    "4. Summary of the Invention\n"
    "5. Detailed Description (expand on how it works, using clear technical "
    "language, but do not invent technical details the user did not provide). "
    "This section must include the following subsections in order:\n"
    "   5.1 System Overview\n"
    "   5.2 Key Components\n"
    "   5.3 Data Flow or Signal Flow\n"
    "   5.4 Control Logic or Decision Logic\n"
    "   5.5 Operational Flow — a numbered step-by-step sequence describing "
    "how the system operates end-to-end (e.g. step 1: sensor measures X, "
    "step 2: signal transmitted to controller, step 3: controller compares "
    "to threshold, step 4: actuator responds, etc.). Use only details the "
    "inventor provided; do not invent steps.\n"
    "   5.6 Intended Installation or Deployment Context\n"
    "6. Novelty and Advantages (what's different/better about this approach)\n"
    "7. Known Prior Art or Related Work (only include what the user actually "
    "mentioned; if they didn't mention anything, note that none was provided "
    "and prior art search is recommended)\n\n"
    "Do not draft patent claims. Do not provide legal advice or legal conclusions "
    "about patentability. This is a drafting aid only, to help organize the "
    "inventor's own description into a clearer format for their patent agent or "
    "attorney to review."
)


# Form fields sent from the frontend
class DisclosureRequest(BaseModel):
    title: str
    problem: str
    how_it_works: str
    what_is_different: str
    prior_art: str = ""
    who_uses_it: str = ""


@app.post("/generate-disclosure")
async def generate_disclosure(req: DisclosureRequest):
    # Reject the request if the API key is not set
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)

    # Build the user message from the submitted form fields
    user_message = f"""Please draft an invention disclosure based on the following information provided by the inventor:

Title / Working Name: {req.title}

Problem Being Solved:
{req.problem}

How It Works:
{req.how_it_works}

What Makes It Different:
{req.what_is_different}

Known Prior Art or Similar Existing Solutions:
{req.prior_art if req.prior_art else "Not provided."}

Who Would Use This and In What Context:
{req.who_uses_it if req.who_uses_it else "Not provided."}"""

    # Send to Claude and return the generated draft
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return {"draft": message.content[0].text}
