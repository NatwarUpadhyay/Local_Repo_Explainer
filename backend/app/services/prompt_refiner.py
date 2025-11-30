"""
Prompt refinement service for LLM interactions.
Transforms user queries into structured Chain-of-Thought prompts.
"""
from typing import Optional


def refine_user_query(user_query: str, use_case: str = "repo_explain") -> str:
    """
    Refine user query into a structured Chain-of-Thought prompt.
    
    Args:
        user_query: Raw user input query
        use_case: Context for prompt generation (default: "repo_explain")
    
    Returns:
        Refined prompt string with CoT structure
    """
    if use_case == "repo_explain":
        template = f"""You are an expert code analyst. Analyze the following repository query step by step using PLAIN TEXT only.

Query: {user_query}

FORMATTING RULES: Use plain text. NO markdown (no **, __, ##). Use hyphens for lists.

Please provide:
1. Understanding: What is the user asking about?
2. Context: What repository aspects are relevant?
3. Analysis: What code patterns, architecture, or dependencies should be examined?
4. Response: Provide a clear, structured answer with examples.

Think through each step carefully before providing your final response in plain text."""
        return template
    
    elif use_case == "code_review":
        template = f"""You are a senior code reviewer. Analyze this code review request methodically using PLAIN TEXT only.

Request: {user_query}

FORMATTING RULES: Use plain text. NO markdown (no **, __, ##). Use hyphens for lists.

Evaluation steps:
1. What code quality issues are present?
2. Are there security vulnerabilities?
3. What performance optimizations are possible?
4. Provide specific suggestions with code examples.

Think step by step and be thorough in your review. Use plain text formatting only."""
        return template
    
    else:
        # Generic fallback
        template = f"""Analyze the following query carefully using PLAIN TEXT only:

{user_query}

FORMATTING RULES: Use plain text. NO markdown (no **, __, ##). Use hyphens for lists.

Provide a thorough, step-by-step response in plain text."""
        return template
