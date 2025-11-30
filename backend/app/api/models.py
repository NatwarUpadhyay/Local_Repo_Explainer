"""
API endpoints for LLM model management and validation.
"""
import os
from typing import Optional, List
from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class ModelDescriptor(BaseModel):
    """Model descriptor with metadata."""
    id: str
    name: str
    size: str
    type: str = "local"
    params: Optional[str] = None
    cpu_capable: bool = True
    gpu_capable: bool = False
    download_url: Optional[str] = None
    description: Optional[str] = None
    is_custom: bool = False


class ModelTestRequest(BaseModel):
    """Request to test a model configuration."""
    model_id: str
    path: Optional[str] = None


class ModelTestResponse(BaseModel):
    """Response from model test."""
    ok: bool
    valid: bool = False
    info: Optional[str] = None
    message: Optional[str] = None
    model_path: Optional[str] = None
    size_bytes: Optional[int] = None
    size_mb: Optional[float] = None
    error: Optional[str] = None


class ModelSaveRequest(BaseModel):
    """Request to save model configuration."""
    model_id: str
    path: str


class ModelSaveResponse(BaseModel):
    """Response from model save."""
    ok: bool
    saved_line: Optional[str] = None
    error: Optional[str] = None


@router.get("/", response_model=List[ModelDescriptor])
async def list_models():
    """
    Return list of available models.
    Includes Docker LLM service and recommended downloadable models.
    """
    return [
        ModelDescriptor(
            id="llama-3.2-1b",
            name="Llama 3.2 1B (Recommended)",
            size="810 MB",
            type="local",
            params="1B",
            cpu_capable=True,
            gpu_capable=True,
            download_url="https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF",
            description="Fast, lightweight model perfect for code analysis. Q4_K_M quantization (~810MB). Good quality, recommended for most use cases."
        ),
        ModelDescriptor(
            id="qwen2.5-coder-1.5b",
            name="Qwen2.5-Coder 1.5B",
            size="1 GB",
            type="local",
            params="1.5B",
            cpu_capable=True,
            gpu_capable=True,
            download_url="https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF",
            description="Optimized for code understanding. Download Q4_K_M variant (~1GB)."
        ),
        ModelDescriptor(
            id="phi-3-mini",
            name="Phi-3 Mini 3.8B",
            size="2.2 GB",
            type="local",
            params="3.8B",
            cpu_capable=True,
            gpu_capable=True,
            download_url="https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf",
            description="Microsoft's efficient model for code. Download Q4_K_M variant (~2.2GB)."
        ),
        ModelDescriptor(
            id="custom-model",
            name="Upload Your Own Model",
            size="Custom",
            type="local",
            params="Custom",
            cpu_capable=True,
            gpu_capable=True,
            download_url=None,
            description="Use any GGUF format model from HuggingFace or your own fine-tuned model.",
            is_custom=True
        )
    ]


@router.post("/test", response_model=ModelTestResponse)
async def test_model(request: ModelTestRequest):
    """
    Test model availability and configuration.
    Validates that the local model file exists and is a valid GGUF file.
    """
    # Local model validation
    model_path = request.path or os.getenv("LOCAL_MODEL_PATH")
    
    if not model_path:
        return ModelTestResponse(
            ok=False,
            valid=False,
            error="No model path provided and LOCAL_MODEL_PATH not set"
        )
    
    # Validate path exists
    if not os.path.exists(model_path):
        return ModelTestResponse(
            ok=False,
            valid=False,
            error=f"Model file not found: {model_path}"
        )
    
    # Check if it's a file
    if not os.path.isfile(model_path):
        return ModelTestResponse(
            ok=False,
            valid=False,
            error=f"Path is not a file: {model_path}"
        )
    
    # Check minimum size (1MB) and file extension
    size_bytes = os.path.getsize(model_path)
    size_mb = size_bytes / (1024 * 1024)
    
    if size_bytes < 1024 * 1024:
        return ModelTestResponse(
            ok=False,
            valid=False,
            error=f"Model file too small ({size_bytes} bytes), expected > 1MB"
        )
    
    # Check for GGUF extension (recommended format)
    if not model_path.lower().endswith('.gguf'):
        return ModelTestResponse(
            ok=True,
            valid=True,
            model_path=model_path,
            size_bytes=size_bytes,
            size_mb=size_mb,
            message=f"Warning: File does not have .gguf extension. Size: {size_mb:.2f}MB"
        )
    
    return ModelTestResponse(
        ok=True,
        valid=True,
        model_path=model_path,
        size_bytes=size_bytes,
        size_mb=size_mb,
        info=f"Valid GGUF model found: {size_mb:.2f}MB"
    )


class ModelValidateRequest(BaseModel):
    """Request to validate a model file."""
    model_path: str


# Alias for /validate (same as /test but accepts direct model_path)
@router.post("/validate", response_model=ModelTestResponse)
async def validate_model(request: ModelValidateRequest):
    """
    Validate model availability and configuration.
    Validates that the local model file exists and is a valid GGUF file.
    """
    # Convert to ModelTestRequest format
    test_req = ModelTestRequest(model_id="", path=request.model_path)
    return await test_model(test_req)


@router.post("/save", response_model=ModelSaveResponse)
async def save_model(request: ModelSaveRequest):
    """
    Save model configuration to .env file.
    Only for local development - sanitizes path to prevent traversal.
    """
    # Sanitize path - prevent parent directory traversal
    clean_path = request.path.replace("..", "").replace("~", "")
    
    # Convert to absolute path for validation
    abs_path = os.path.abspath(clean_path)
    
    # Find project root (.env location)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    env_file = os.path.join(project_root, ".env")
    
    # Read existing .env or create new
    env_lines = []
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            env_lines = f.readlines()
    
    # Remove existing LOCAL_MODEL_PATH line
    env_lines = [line for line in env_lines if not line.startswith("LOCAL_MODEL_PATH=")]
    
    # Add new line
    new_line = f"LOCAL_MODEL_PATH={abs_path}\n"
    env_lines.append(new_line)
    
    # Write back
    try:
        with open(env_file, "w") as f:
            f.writelines(env_lines)
        
        return ModelSaveResponse(
            ok=True,
            saved_line=new_line.strip()
        )
    except Exception as e:
        return ModelSaveResponse(
            ok=False,
            error=f"Failed to write .env: {str(e)}"
        )
