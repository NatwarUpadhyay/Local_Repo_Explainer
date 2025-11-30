"""
Chat API endpoints for interactive repository Q&A.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from ..services.llm_service import get_llm_instance

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    """Chat request model."""
    job_id: str
    message: str
    context: Optional[str] = ""
    model_id: str = "llama-3.2-1b"
    model_path: str = "./models/Llama-3.2-1B-Instruct-Q4_K_M.gguf"


class ChatResponse(BaseModel):
    """Chat response model."""
    response: str
    job_id: str


@router.post("/", response_model=ChatResponse)
async def chat_with_repository(request: ChatRequest):
    """
    Chat with the analyzed repository using local LLM.
    
    Args:
        request: ChatRequest with message and context
        
    Returns:
        ChatResponse with LLM's answer
    """
    try:
        logger.info(f"Chat request for job {request.job_id}: {request.message}")
        
        # Get LLM instance (path resolution handled in get_llm_instance)
        llm = get_llm_instance(request.model_path)
        if not llm:
            raise HTTPException(
                status_code=503,
                detail="LLM service not available. Please check model configuration."
            )
        
        # Build Chain-of-Thought prompt for clean, structured responses
        prompt = f"""You are an expert code assistant analyzing a software repository.

REPOSITORY CONTEXT:
{request.context}

USER QUESTION:
{request.message}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Think through the question step-by-step
2. Provide a clear, direct answer using plain text
3. Use simple formatting: use hyphens (-) for bullet points, numbers for lists
4. DO NOT use markdown syntax like **, __, ##, or code blocks
5. Write naturally as if explaining to a colleague
6. If you don't have specific information, say so clearly
7. Keep responses concise and practical

Think step-by-step:
- First, understand what the user is asking
- Then, find relevant information in the context
- Finally, provide a clear, well-structured answer

Your answer (plain text only, no markdown):"""
        
        # Generate response
        response_text = llm.generate(
            prompt=prompt,
            max_tokens=800,
            temperature=0.7,
            top_p=0.9
        )
        
        logger.info(f"Generated chat response for job {request.job_id}")
        
        return ChatResponse(
            response=response_text.strip(),
            job_id=request.job_id
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate chat response: {str(e)}"
        )
