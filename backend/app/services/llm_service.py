"""
Local LLM service using llama.cpp for inference.
"""

import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Lazy import to avoid startup errors if llama-cpp-python not installed
try:
    from llama_cpp import Llama

    LLAMA_CPP_AVAILABLE = True
except ImportError:
    logger.warning("llama-cpp-python not installed. Local LLM features disabled.")
    LLAMA_CPP_AVAILABLE = False
    Llama = None


class LocalLLM:
    """
    Wrapper for local LLM inference using llama.cpp.
    """

    def __init__(self, model_path: str, n_ctx: int = 2048, n_threads: int = 4):
        """
        Initialize the local LLM.

        Args:
            model_path: Path to the GGUF model file
            n_ctx: Context window size (default: 2048 tokens)
            n_threads: Number of CPU threads to use
        """
        if not LLAMA_CPP_AVAILABLE:
            raise ImportError(
                "llama-cpp-python not installed. Run: pip install llama-cpp-python"
            )

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        logger.info(f"Loading model from {model_path}...")
        self.model_path = model_path

        try:
            self.llm = Llama(
                model_path=model_path,
                n_ctx=n_ctx,
                n_threads=n_threads,
                n_gpu_layers=0,  # Use CPU only for now
                verbose=False,
            )
            logger.info(f"Model loaded successfully: {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        stop: Optional[list] = None,
    ) -> str:
        """
        Generate text from the model.

        Args:
            prompt: Input prompt text
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)
            top_p: Nucleus sampling parameter
            stop: Stop sequences

        Returns:
            Generated text string
        """
        try:
            response = self.llm(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                stop=stop or [],
                echo=False,
            )

            return response["choices"][0]["text"].strip()

        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise

    def analyze_code(
        self, code_snippet: str, context: str = "", language: str = "unknown"
    ) -> str:
        """
        Analyze a code snippet with language-specific insights.

        Args:
            code_snippet: The code to analyze
            context: Additional context (file path, purpose, etc.)
            language: Programming language (for specialized analysis)

        Returns:
            Analysis text
        """
        # Language-specific analysis prompts
        language_instructions = {
            "python": "Focus on Pythonic idioms, PEP 8 compliance, type hints, decorators, list comprehensions, and common frameworks (Django, Flask, FastAPI). Check for proper exception handling and context managers.",
            "javascript": "Analyze ES6+ features, async/await patterns, promises, closures, prototype chains, and common frameworks (React, Vue, Node.js). Look for callback hell and proper error handling.",
            "typescript": "Examine type annotations, interfaces, generics, enums, and TypeScript-specific patterns. Check type safety, proper use of 'any', and framework integration (Angular, Next.js).",
            "java": "Identify OOP patterns, inheritance hierarchies, interfaces, annotations, and frameworks (Spring, Hibernate). Check for proper exception handling, generics usage, and SOLID principles.",
            "c": "Analyze memory management, pointer usage, buffer handling, header includes, and potential memory leaks. Look for unsafe operations and C standard library usage.",
            "cpp": "Examine C++ features like classes, templates, STL usage, smart pointers, RAII patterns, and modern C++ standards (C++11/14/17/20). Check for memory safety and OOP principles.",
            "csharp": "Focus on .NET patterns, LINQ usage, async/await, delegates, events, properties, and framework usage (ASP.NET Core, Entity Framework). Check for proper disposal patterns.",
            "go": "Analyze goroutines, channels, interfaces, error handling patterns, and idiomatic Go code. Look for proper concurrency patterns and package structure.",
            "rust": "Examine ownership, borrowing, lifetimes, traits, pattern matching, and Cargo dependencies. Focus on memory safety without garbage collection.",
            "php": "Check for modern PHP features (PHP 7+), namespaces, traits, type declarations, and framework usage (Laravel, Symfony). Look for security issues and proper database handling.",
            "ruby": "Analyze Ruby idioms, blocks, procs, lambdas, metaprogramming, and Rails conventions. Check for proper use of Ruby's dynamic features.",
            "swift": "Examine optionals, protocols, extensions, generics, and iOS/macOS specific patterns. Look for proper memory management with ARC.",
            "kotlin": "Analyze null safety, coroutines, extension functions, data classes, and Android-specific patterns. Check for interoperability with Java.",
        }

        lang_key = language.lower()
        specific_instructions = language_instructions.get(
            lang_key,
            "Analyze language-specific patterns, common frameworks, and best practices for this programming language.",
        )

        prompt = f"""You are a code analysis expert specializing in {language.upper()} development. Analyze the following code with deep understanding of {language} idioms and best practices.

Context: {context if context else "General code analysis"}
Language: {language.upper()}

Code:
```{language}
{code_snippet}
```

LANGUAGE-SPECIFIC ANALYSIS FOCUS:
{specific_instructions}

Provide a detailed analysis covering:
1. Purpose: What does this code do?
2. Key Components: Main functions, classes, or {language}-specific patterns
3. Dependencies: External libraries, modules, or frameworks used
4. Language Features: Specific {language} features or idioms utilized
5. Potential Issues: Security concerns, performance issues, or improvements
6. Best Practices: Adherence to {language} conventions and standards

Analysis:"""

        return self.generate(prompt, max_tokens=500, temperature=0.3)

    def explain_repository(
        self, repo_structure: Dict[str, Any], context: str = ""
    ) -> str:
        """
        Generate comprehensive repository explanation using Chain-of-Thought reasoning.

        Args:
            repo_structure: Dictionary with repository information
            context: Additional detailed context about files and content

        Returns:
            Repository explanation
        """
        if context:
            # Detect primary languages from context
            detected_languages = self._detect_languages_from_context(context)
            lang_summary = (
                ", ".join(detected_languages)
                if detected_languages
                else "Multiple languages"
            )

            # Use Chain-of-Thought prompting for detailed analysis
            prompt = f"""You are a senior software architect conducting a thorough codebase analysis for developers. Think step-by-step and provide well-formatted markdown output.

<REPOSITORY_DATA>
{context}
</REPOSITORY_DATA>

DETECTED LANGUAGES: {lang_summary}

INSTRUCTIONS: Analyze this repository systematically and provide a developer-friendly overview using markdown formatting. Use headers, bullet points, and clear sections.

STEP 1 - Initial Observations:
- What type of project is this? (web app, API, library, CLI tool, etc.)
- Primary programming languages and frameworks?
- Overall project structure? (monorepo, microservices, standard layout)

STEP 2 - Architecture Analysis:
- File/directory organization patterns
- Architectural patterns (MVC, layered, microservices, etc.)
- Component interactions
- Main entry points

STEP 3 - Technology Stack:
- Frameworks and libraries
- Key dependencies and their purposes
- Build/test/deployment tools

STEP 4 - Code Organization:
- Design patterns implemented
- Code structure within files
- State management approach

STEP 5 - Core Functionality:
- Main features and capabilities
- Module interactions
- External service integrations

Now provide your analysis in this EXACT FORMAT (use markdown):

**Project Overview**
Brief 2-3 sentence description of what this application does.

**Architecture**
- File structure and organization
- Architectural patterns used
- Key components and their relationships

**Technology Stack**
- Primary language(s): {lang_summary}
- Frameworks: List the frameworks
- Key dependencies: List important libraries

**Code Organization**
- How modules are structured
- Entry points and main files
- Design patterns observed

**Core Features**
- Feature 1: Brief description
- Feature 2: Brief description
- Feature 3: Brief description

**Dependencies & External Services**
- Dependency 1: Purpose
- Dependency 2: Purpose

**Developer Insights**
- Notable best practices
- Areas for potential improvement
- Recommended next steps

Provide your analysis following this structure:"""
            max_tokens = 1200
        else:
            # Fallback with simpler CoT for limited context
            files_list = "\n".join(repo_structure.get("files", [])[:20])

            prompt = f"""You are a repository analyst. Analyze this codebase step-by-step.

Repository: {repo_structure.get("name", "Unknown")}
Files (sample):
{files_list}

Main languages: {", ".join(repo_structure.get("languages", ["Unknown"]))}

Think through this systematically:

STEP 1: What type of project is this based on the file names and structure?
STEP 2: What frameworks or technologies can you identify from the files?
STEP 3: How is the code organized (directories, naming patterns)?
STEP 4: What is the likely purpose of this application?

Now provide your analysis:
1. Project Type: (web app, API, library, etc.)
2. Architecture: How the code is structured
3. Key Technologies: Frameworks and tools used
4. Purpose: What problem this solves
5. Organization: How files and modules are arranged

Analysis:"""
            max_tokens = 400

        return self.generate(prompt, max_tokens=max_tokens, temperature=0.5)

    def analyze_vulnerability(self, context: str) -> str:
        """
        Generate vulnerability analysis for a repository.

        Args:
            context: Repository context or component information

        Returns:
            Vulnerability analysis text
        """
        prompt = f"""You are a security expert analyzing code for vulnerabilities.

CODEBASE CONTEXT:
{context}

SECURITY ANALYSIS TASK:
Perform a thorough security assessment and identify potential vulnerabilities in this codebase.

Analyze for:
- Authentication/Authorization issues
- Input validation concerns
- Data exposure risks
- Dependency vulnerabilities
- Code injection risks (SQL, XSS, Command injection)
- Insecure configurations
- Missing security headers
- Sensitive data handling
- Cryptographic weaknesses
- API security issues

For EACH identified vulnerability, provide:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Issue: Specific vulnerability name
- Description: What the problem is
- Location: Where it appears (file/component name)
- Impact: Potential security impact
- Recommendation: How to fix it

If NO vulnerabilities found, state: "No immediate security concerns identified in this analysis."

IMPORTANT: Be specific and technical. Focus on actual security risks, not general code quality.

Security Analysis:"""

        return self.generate(prompt, max_tokens=600, temperature=0.5)

    def _detect_languages_from_context(self, context: str) -> list:
        """
        Detect programming languages from repository context.

        Args:
            context: Repository context string

        Returns:
            List of detected language names
        """
        language_indicators = {
            "python": [
                ".py",
                "python",
                "django",
                "flask",
                "fastapi",
                "requirements.txt",
                "setup.py",
            ],
            "javascript": [
                ".js",
                "javascript",
                "node",
                "react",
                "vue",
                "package.json",
                "npm",
            ],
            "typescript": [".ts", ".tsx", "typescript", "angular", "next.js"],
            "java": [".java", "java", "spring", "maven", "gradle", "pom.xml"],
            "c": [".c", ".h", "stdio.h", "stdlib.h"],
            "cpp": [".cpp", ".hpp", ".cc", "c++", "std::", "#include <iostream>"],
            "csharp": [".cs", "c#", "csharp", ".net", "asp.net", "using System"],
            "go": [".go", "golang", "package main", 'import "fmt"'],
            "rust": [".rs", "rust", "cargo", "fn main()", "use std::"],
            "php": [".php", "php", "laravel", "symfony", "<?php"],
            "ruby": [".rb", "ruby", "rails", "def ", "class ", "Gemfile"],
            "swift": [".swift", "swift", "import UIKit", "import SwiftUI"],
            "kotlin": [".kt", "kotlin", "fun main", "import android"],
        }

        context_lower = context.lower()
        detected = []

        for lang, indicators in language_indicators.items():
            if any(indicator in context_lower for indicator in indicators):
                detected.append(lang.capitalize())

        return detected[:5]  # Return top 5 detected languages


def get_llm_instance(model_path: Optional[str] = None) -> Optional[LocalLLM]:
    """
    Get or create LLM instance.

    Args:
        model_path: Path to model file (uses env var if not provided)

    Returns:
        LocalLLM instance or None if unavailable
    """
    if not LLAMA_CPP_AVAILABLE:
        logger.warning("llama-cpp-python not available")
        return None

    resolved_path = model_path or os.getenv("LOCAL_MODEL_PATH")

    if not resolved_path:
        logger.warning("No model path provided")
        return None

    # Resolve relative paths (same logic as worker)
    if not os.path.isabs(resolved_path):
        possible_paths = [
            resolved_path,
            os.path.join(os.getcwd(), resolved_path),
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                resolved_path,
            ),
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "models",
                resolved_path,
            ),
        ]

        for path in possible_paths:
            if os.path.exists(path) and os.path.isfile(path):
                resolved_path = path
                logger.info(f"Resolved model path: {resolved_path}")
                break

    try:
        return LocalLLM(resolved_path)
    except Exception as e:
        logger.error(f"Failed to initialize LLM: {e}")
        return None
