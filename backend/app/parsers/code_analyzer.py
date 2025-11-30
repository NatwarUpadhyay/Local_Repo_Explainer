"""
Code structure analyzer using AST parsing.
Extracts functions, classes, methods for multi-level graph visualization.
"""

import ast
import re
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class CodeEntity:
    """Represents a code entity (function, class, method)."""

    type: str  # 'function', 'class', 'method'
    name: str
    file_path: str
    line_start: int
    line_end: int
    docstring: str = None
    params: List[str] = None
    returns: str = None
    complexity: int = 0  # Cyclomatic complexity
    calls: List[str] = None  # Functions/methods it calls

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class PythonCodeAnalyzer:
    """Analyze Python code structure using AST."""

    def analyze_file(self, file_path: Path) -> List[CodeEntity]:
        """Extract all code entities from a Python file."""
        entities = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                source = f.read()

            tree = ast.parse(source)

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    entity = self._analyze_function(node, str(file_path))
                    entities.append(entity)
                elif isinstance(node, ast.ClassDef):
                    class_entity = self._analyze_class(node, str(file_path))
                    entities.append(class_entity)

                    # Extract methods from class
                    for item in node.body:
                        if isinstance(item, ast.FunctionDef):
                            method_entity = self._analyze_method(
                                item, node.name, str(file_path)
                            )
                            entities.append(method_entity)
        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {e}")

        return entities

    def _analyze_function(self, node: ast.FunctionDef, file_path: str) -> CodeEntity:
        """Analyze a function definition."""
        docstring = ast.get_docstring(node)
        params = [arg.arg for arg in node.args.args]
        returns = self._get_return_annotation(node)
        complexity = self._calculate_complexity(node)
        calls = self._extract_function_calls(node)

        return CodeEntity(
            type="function",
            name=node.name,
            file_path=file_path,
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            docstring=docstring,
            params=params,
            returns=returns,
            complexity=complexity,
            calls=calls,
        )

    def _analyze_class(self, node: ast.ClassDef, file_path: str) -> CodeEntity:
        """Analyze a class definition."""
        docstring = ast.get_docstring(node)
        base_classes = [self._get_name(base) for base in node.bases]

        return CodeEntity(
            type="class",
            name=node.name,
            file_path=file_path,
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            docstring=docstring,
            params=base_classes,  # Store base classes in params
        )

    def _analyze_method(
        self, node: ast.FunctionDef, class_name: str, file_path: str
    ) -> CodeEntity:
        """Analyze a class method."""
        docstring = ast.get_docstring(node)
        params = [arg.arg for arg in node.args.args][1:]  # Skip 'self'
        returns = self._get_return_annotation(node)
        complexity = self._calculate_complexity(node)
        calls = self._extract_function_calls(node)

        return CodeEntity(
            type="method",
            name=f"{class_name}.{node.name}",
            file_path=file_path,
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            docstring=docstring,
            params=params,
            returns=returns,
            complexity=complexity,
            calls=calls,
        )

    def _get_return_annotation(self, node: ast.FunctionDef) -> str:
        """Extract return type annotation."""
        if node.returns:
            return ast.unparse(node.returns)
        return None

    def _get_name(self, node) -> str:
        """Get name from AST node."""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{self._get_name(node.value)}.{node.attr}"
        return str(node)

    def _calculate_complexity(self, node: ast.FunctionDef) -> int:
        """Calculate cyclomatic complexity."""
        complexity = 1  # Base complexity

        for child in ast.walk(node):
            # Count decision points
            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1

        return complexity

    def _extract_function_calls(self, node: ast.FunctionDef) -> List[str]:
        """Extract all function calls within a function."""
        calls = []

        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    calls.append(child.func.id)
                elif isinstance(child.func, ast.Attribute):
                    calls.append(
                        f"{self._get_name(child.func.value)}.{child.func.attr}"
                    )

        return list(set(calls))  # Deduplicate


class JavaScriptCodeAnalyzer:
    """Analyze JavaScript/TypeScript code structure using regex (simplified)."""

    def analyze_file(self, file_path: Path) -> List[CodeEntity]:
        """Extract code entities from JavaScript/TypeScript file."""
        entities = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                lines = content.split("\n")

            # Extract functions
            entities.extend(self._extract_functions(content, lines, str(file_path)))

            # Extract classes
            entities.extend(self._extract_classes(content, lines, str(file_path)))

        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {e}")

        return entities

    def _extract_functions(
        self, content: str, lines: List[str], file_path: str
    ) -> List[CodeEntity]:
        """Extract function declarations."""
        entities = []

        # Pattern for function declarations
        patterns = [
            r"function\s+(\w+)\s*\((.*?)\)",  # function name(params)
            r"const\s+(\w+)\s*=\s*\((.*?)\)\s*=>",  # const name = (params) =>
            r"(\w+)\s*:\s*\((.*?)\)\s*=>",  # name: (params) =>
        ]

        for pattern in patterns:
            for match in re.finditer(pattern, content):
                name = match.group(1)
                params_str = match.group(2) if len(match.groups()) > 1 else ""
                params = [p.strip() for p in params_str.split(",") if p.strip()]

                line_num = content[: match.start()].count("\n") + 1

                entities.append(
                    CodeEntity(
                        type="function",
                        name=name,
                        file_path=file_path,
                        line_start=line_num,
                        line_end=line_num + 1,  # Approximate
                        params=params,
                    )
                )

        return entities

    def _extract_classes(
        self, content: str, lines: List[str], file_path: str
    ) -> List[CodeEntity]:
        """Extract class declarations."""
        entities = []

        # Pattern for class declarations
        pattern = r"class\s+(\w+)(?:\s+extends\s+(\w+))?"

        for match in re.finditer(pattern, content):
            name = match.group(1)
            base_class = match.group(2) if match.group(2) else None
            line_num = content[: match.start()].count("\n") + 1

            entities.append(
                CodeEntity(
                    type="class",
                    name=name,
                    file_path=file_path,
                    line_start=line_num,
                    line_end=line_num + 1,
                    params=[base_class] if base_class else [],
                )
            )

        return entities


def get_analyzer(language: str):
    """Get appropriate analyzer for language."""
    analyzers = {
        "python": PythonCodeAnalyzer(),
        "javascript": JavaScriptCodeAnalyzer(),
        "typescript": JavaScriptCodeAnalyzer(),
    }
    return analyzers.get(language.lower())
