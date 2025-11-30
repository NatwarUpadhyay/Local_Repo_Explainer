# worker/parsers/python_ast.py
import ast

def extract_imports(content: str) -> dict:
    """
    A stub for extracting imports from Python code using AST.
    """
    print("Extracting imports using AST...")
    imports = {'imports': [], 'from_imports': []}
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports['imports'].append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                imports['from_imports'].append(node.module)
    except SyntaxError as e:
        print(f"Syntax error parsing file: {e}")
    return imports
