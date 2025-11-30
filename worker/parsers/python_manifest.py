# worker/parsers/python_manifest.py

def parse_requirements_txt(content: str) -> list:
    """
    A stub for parsing requirements.txt files.
    """
    print("Parsing requirements.txt...")
    dependencies = []
    for line in content.splitlines():
        line = line.strip()
        if line and not line.startswith('#'):
            dependencies.append({"name": line.split('==')[0], "type": "runtime"})
    return dependencies

def parse_pyproject_toml(content: str) -> list:
    """
    A stub for parsing pyproject.toml files.
    TODO: Implement a proper TOML parser.
    """
    print("Parsing pyproject.toml...")
    # This is a very basic stub. A real implementation would use a TOML library.
    if '[project.dependencies]' in content:
        return [{"name": "dependency-from-toml", "type": "runtime"}]
    return []
