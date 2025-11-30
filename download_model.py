"""
Download Llama 3.2 1B Model for Local Analysis
This script downloads the recommended Llama 3.2 1B Instruct model
"""
import os
import sys
from pathlib import Path

def print_header():
    print("\n" + "="*70)
    print("  RepoInsight - Download Llama 3.2 1B Model")
    print("="*70)

def check_huggingface_cli():
    """Check if huggingface-cli is available"""
    import subprocess
    try:
        result = subprocess.run(
            ["huggingface-cli", "--version"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False

def install_huggingface_cli():
    """Install huggingface_hub"""
    print("\nInstalling huggingface_hub...")
    import subprocess
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "huggingface_hub[cli]"],
            check=True
        )
        print("✓ huggingface_hub installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("✗ Failed to install huggingface_hub")
        return False

def download_model():
    """Download the Llama 3.2 1B model"""
    import subprocess
    
    model_dir = Path("./models")
    model_dir.mkdir(exist_ok=True)
    
    # Remove any empty placeholder file
    placeholder = model_dir / "model.gguf"
    if placeholder.exists() and placeholder.stat().st_size == 0:
        print(f"Removing empty placeholder file: {placeholder}")
        placeholder.unlink()
    
    print("\nDownloading Llama 3.2 1B Instruct (Q4_K_M quantization)")
    print("File: Llama-3.2-1B-Instruct-Q4_K_M.gguf")
    print("Size: ~810 MB (0.81 GB)")
    print("Quality: Good quality, default size for most use cases (recommended)")
    print("\nThis may take 5-10 minutes depending on your internet speed.")
    print("Please be patient...\n")
    
    try:
        cmd = [
            "huggingface-cli",
            "download",
            "bartowski/Llama-3.2-1B-Instruct-GGUF",
            "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
            "--local-dir",
            str(model_dir),
            "--local-dir-use-symlinks",
            "False"
        ]
        
        print("Running: " + " ".join(cmd))
        print("-" * 70)
        subprocess.run(cmd, check=True)
        print("-" * 70)
        
        model_path = model_dir / "Llama-3.2-1B-Instruct-Q4_K_M.gguf"
        if model_path.exists():
            size_mb = model_path.stat().st_size / (1024 * 1024)
            
            if size_mb < 100:
                print(f"\n✗ Download incomplete. File is only {size_mb:.2f} MB")
                print(f"  Expected size: ~810 MB (0.81 GB)")
                print("  Try running the script again.")
                return False
            
            print(f"\n✓ Model downloaded successfully!")
            print(f"  Location: {model_path}")
            print(f"  Size: {size_mb:.2f} MB")
            print(f"  Quantization: Q4_K_M (Good quality, recommended)")
            
            # Verify it's a valid GGUF file
            with open(model_path, 'rb') as f:
                magic = f.read(4)
                if magic == b'GGUF':
                    print(f"  Format: ✓ Valid GGUF file")
                else:
                    print(f"  Format: ⚠️  Warning - may not be valid GGUF")
            
            return True
        else:
            print("\n✗ Model file not found after download")
            print(f"  Expected location: {model_path}")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Download failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your internet connection")
        print("  2. Try running: pip install --upgrade huggingface_hub[cli]")
        print("  3. Or download manually from:")
        print("     https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

def manual_download_instructions():
    """Print manual download instructions"""
    print("\n" + "="*70)
    print("  Manual Download Instructions")
    print("="*70)
    print("\nIf automatic download fails, you can download manually:")
    print("\n1. Visit the model page:")
    print("   https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF")
    print("\n2. Click on 'Files and versions'")
    print("\n3. Download: Llama-3.2-1B-Instruct-Q4_K_M.gguf (760 MB)")
    print("\n4. Place the file in:")
    print(f"   {Path('./models').resolve()}")
    print("\n5. Rename it to: Llama-3.2-1B-Instruct-Q4_K_M.gguf")
    print("\n" + "="*70)

def main():
    """Main download flow"""
    print_header()
    
    # Check if model already exists
    model_path = Path("./models/Llama-3.2-1B-Instruct-Q4_K_M.gguf")
    if model_path.exists():
        size_mb = model_path.stat().st_size / (1024 * 1024)
        if size_mb > 1:
            print(f"\n✓ Model already exists!")
            print(f"  Location: {model_path}")
            print(f"  Size: {size_mb:.2f} MB")
            print("\nNo download needed. You're all set!")
            return True
        else:
            print(f"\n⚠️  Model file exists but is too small ({size_mb:.2f} MB)")
            print("   It may be corrupted. Re-downloading...")
            model_path.unlink()
    
    # Check for huggingface-cli
    if not check_huggingface_cli():
        print("\nhuggingface-cli not found. Installing...")
        if not install_huggingface_cli():
            manual_download_instructions()
            return False
    
    # Download model
    if download_model():
        print("\n" + "="*70)
        print("  ✓ Setup Complete!")
        print("="*70)
        print("\nNext steps:")
        print("  1. Run the end-to-end test:")
        print("     python test_e2e_llm.py")
        print("\n  2. Start the backend (if not running):")
        print("     uvicorn backend.app.main:app --reload")
        print("\n  3. Start the frontend (if not running):")
        print("     cd frontend && npm run dev")
        print("\n  4. Visit http://localhost:3000 and analyze a repository!")
        return True
    else:
        manual_download_instructions()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
