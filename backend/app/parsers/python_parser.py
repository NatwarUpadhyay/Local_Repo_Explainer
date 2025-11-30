"""
Python dependency parser.
Handles: requirements.txt, pyproject.toml, setup.py, Pipfile
"""
import re
import ast
import toml
from pathlib import Path
from typing import List
import logging

from .base_parser import BaseParser, Dependency

logger = logging.getLogger(__name__)


class PythonParser(BaseParser):
    """Parser for Python projects."""
    
    def get_manifest_files(self) -> List[str]:
        return ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'setup.cfg']
    
    def get_file_extensions(self) -> List[str]:
        return ['.py']
    
    def parse_manifest(self, file_path: Path) -> List[Dependency]:
        """Parse Python manifest files."""
        if not file_path.exists():
            return []
        
        filename = file_path.name
        
        try:
            if filename == 'requirements.txt':
                return self._parse_requirements_txt(file_path)
            elif filename == 'pyproject.toml':
                return self._parse_pyproject_toml(file_path)
            elif filename == 'Pipfile':
                return self._parse_pipfile(file_path)
            elif filename in ['setup.py', 'setup.cfg']:
                return self._parse_setup_py(file_path)
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return []
        
        return []
    
    def _parse_requirements_txt(self, file_path: Path) -> List[Dependency]:
        """Parse requirements.txt file."""
        deps = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Skip URLs and editable installs
                if line.startswith(('http://', 'https://', 'git+', '-e')):
                    continue
                
                # Parse requirement
                # Format: package==version, package>=version, package[extra]
                match = re.match(r'^([a-zA-Z0-9\-_\.]+)([<>=!]+)?([0-9\.]+)?', line)
                if match:
                    name = match.group(1)
                    version = match.group(3) if match.group(3) else None
                    deps.append(Dependency(
                        name=name,
                        version=version,
                        source=str(file_path)
                    ))
        
        return deps
    
    def _parse_pyproject_toml(self, file_path: Path) -> List[Dependency]:
        """Parse pyproject.toml file."""
        deps = []
        
        try:
            data = toml.load(file_path)
            
            # Poetry dependencies
            if 'tool' in data and 'poetry' in data['tool']:
                poetry_deps = data['tool']['poetry'].get('dependencies', {})
                for name, version in poetry_deps.items():
                    if name == 'python':
                        continue
                    version_str = version if isinstance(version, str) else version.get('version', None)
                    deps.append(Dependency(
                        name=name,
                        version=version_str,
                        source=str(file_path)
                    ))
                
                # Dev dependencies
                dev_deps = data['tool']['poetry'].get('dev-dependencies', {})
                for name, version in dev_deps.items():
                    version_str = version if isinstance(version, str) else version.get('version', None)
                    deps.append(Dependency(
                        name=name,
                        version=version_str,
                        dev=True,
                        source=str(file_path)
                    ))
            
            # PEP 621 dependencies
            if 'project' in data:
                project_deps = data['project'].get('dependencies', [])
                for dep in project_deps:
                    match = re.match(r'^([a-zA-Z0-9\-_\.]+)([<>=!]+)?([0-9\.]+)?', dep)
                    if match:
                        deps.append(Dependency(
                            name=match.group(1),
                            version=match.group(3),
                            source=str(file_path)
                        ))
        except Exception as e:
            logger.error(f"Error parsing pyproject.toml: {e}")
        
        return deps
    
    def _parse_pipfile(self, file_path: Path) -> List[Dependency]:
        """Parse Pipfile."""
        deps = []
        
        try:
            data = toml.load(file_path)
            
            # Regular dependencies
            packages = data.get('packages', {})
            for name, version in packages.items():
                version_str = version if isinstance(version, str) else version.get('version', '*')
                deps.append(Dependency(
                    name=name,
                    version=version_str if version_str != '*' else None,
                    source=str(file_path)
                ))
            
            # Dev dependencies
            dev_packages = data.get('dev-packages', {})
            for name, version in dev_packages.items():
                version_str = version if isinstance(version, str) else version.get('version', '*')
                deps.append(Dependency(
                    name=name,
                    version=version_str if version_str != '*' else None,
                    dev=True,
                    source=str(file_path)
                ))
        except Exception as e:
            logger.error(f"Error parsing Pipfile: {e}")
        
        return deps
    
    def _parse_setup_py(self, file_path: Path) -> List[Dependency]:
        """Parse setup.py (simple extraction)."""
        deps = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for install_requires in setup() call
            install_requires_match = re.search(r'install_requires\s*=\s*\[(.*?)\]', content, re.DOTALL)
            if install_requires_match:
                requires_str = install_requires_match.group(1)
                # Extract quoted strings
                packages = re.findall(r'["\']([^"\']+)["\']', requires_str)
                for pkg in packages:
                    match = re.match(r'^([a-zA-Z0-9\-_\.]+)([<>=!]+)?([0-9\.]+)?', pkg)
                    if match:
                        deps.append(Dependency(
                            name=match.group(1),
                            version=match.group(3),
                            source=str(file_path)
                        ))
        except Exception as e:
            logger.error(f"Error parsing setup.py: {e}")
        
        return deps
    
    def parse_imports(self, file_path: Path) -> List[str]:
        """Parse Python file and extract import statements."""
        imports = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                tree = ast.parse(f.read())
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.append(alias.name.split('.')[0])
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(node.module.split('.')[0])
        except Exception as e:
            logger.error(f"Error parsing imports from {file_path}: {e}")
        
        return list(set(imports))  # Deduplicate
