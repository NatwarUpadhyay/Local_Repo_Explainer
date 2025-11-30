"""
Rust dependency parser.
Handles: Cargo.toml, Cargo.lock
"""
import toml
from pathlib import Path
from typing import List
import logging

from .base_parser import BaseParser, Dependency

logger = logging.getLogger(__name__)


class RustParser(BaseParser):
    """Parser for Rust projects."""
    
    def get_manifest_files(self) -> List[str]:
        return ['Cargo.toml', 'Cargo.lock']
    
    def get_file_extensions(self) -> List[str]:
        return ['.rs']
    
    def parse_manifest(self, file_path: Path) -> List[Dependency]:
        """Parse Rust manifest files."""
        if not file_path.exists():
            return []
        
        filename = file_path.name
        
        try:
            if filename == 'Cargo.toml':
                return self._parse_cargo_toml(file_path)
            elif filename == 'Cargo.lock':
                return self._parse_cargo_lock(file_path)
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return []
        
        return []
    
    def _parse_cargo_toml(self, file_path: Path) -> List[Dependency]:
        """Parse Cargo.toml file."""
        deps = []
        
        try:
            data = toml.load(file_path)
            
            # Regular dependencies
            dependencies = data.get('dependencies', {})
            for name, version_info in dependencies.items():
                if isinstance(version_info, str):
                    version = version_info
                elif isinstance(version_info, dict):
                    version = version_info.get('version', None)
                else:
                    version = None
                
                deps.append(Dependency(
                    name=name,
                    version=version,
                    source=str(file_path)
                ))
            
            # Dev dependencies
            dev_dependencies = data.get('dev-dependencies', {})
            for name, version_info in dev_dependencies.items():
                if isinstance(version_info, str):
                    version = version_info
                elif isinstance(version_info, dict):
                    version = version_info.get('version', None)
                else:
                    version = None
                
                deps.append(Dependency(
                    name=name,
                    version=version,
                    dev=True,
                    source=str(file_path)
                ))
            
            # Build dependencies
            build_dependencies = data.get('build-dependencies', {})
            for name, version_info in build_dependencies.items():
                if isinstance(version_info, str):
                    version = version_info
                elif isinstance(version_info, dict):
                    version = version_info.get('version', None)
                else:
                    version = None
                
                deps.append(Dependency(
                    name=name,
                    version=version,
                    dev=True,  # Consider build deps as dev deps
                    source=str(file_path)
                ))
        except Exception as e:
            logger.error(f"Error parsing Cargo.toml: {e}")
        
        return deps
    
    def _parse_cargo_lock(self, file_path: Path) -> List[Dependency]:
        """Parse Cargo.lock for exact versions."""
        deps = []
        
        try:
            data = toml.load(file_path)
            
            packages = data.get('package', [])
            for pkg in packages:
                name = pkg.get('name')
                version = pkg.get('version')
                if name and version:
                    deps.append(Dependency(
                        name=name,
                        version=version,
                        source=str(file_path)
                    ))
        except Exception as e:
            logger.error(f"Error parsing Cargo.lock: {e}")
        
        return deps
    
    def parse_imports(self, file_path: Path) -> List[str]:
        """Parse Rust file and extract use statements."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Match: use crate_name::...;
            import re
            use_statements = re.findall(r'use\s+([a-zA-Z0-9_]+)(?:::|\s*;)', content)
            
            # Filter out std, core, alloc (standard library)
            external_imports = [imp for imp in use_statements 
                              if imp not in ['std', 'core', 'alloc', 'crate', 'self', 'super']]
        except Exception as e:
            logger.error(f"Error parsing imports from {file_path}: {e}")
            return []
        
        return list(set(external_imports))  # Deduplicate
