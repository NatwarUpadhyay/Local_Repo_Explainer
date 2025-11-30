"""
Java dependency parser.
Handles: pom.xml (Maven), build.gradle (Gradle)
"""
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List
import logging

from .base_parser import BaseParser, Dependency

logger = logging.getLogger(__name__)


class JavaParser(BaseParser):
    """Parser for Java projects."""
    
    def get_manifest_files(self) -> List[str]:
        return ['pom.xml', 'build.gradle', 'build.gradle.kts']
    
    def get_file_extensions(self) -> List[str]:
        return ['.java', '.kt']  # Include Kotlin
    
    def parse_manifest(self, file_path: Path) -> List[Dependency]:
        """Parse Java manifest files."""
        if not file_path.exists():
            return []
        
        filename = file_path.name
        
        try:
            if filename == 'pom.xml':
                return self._parse_pom_xml(file_path)
            elif filename in ['build.gradle', 'build.gradle.kts']:
                return self._parse_build_gradle(file_path)
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return []
        
        return []
    
    def _parse_pom_xml(self, file_path: Path) -> List[Dependency]:
        """Parse Maven pom.xml file."""
        deps = []
        
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Handle namespaces
            ns = {'maven': 'http://maven.apache.org/POM/4.0.0'}
            if root.tag.startswith('{'):
                ns_uri = root.tag[1:].split('}')[0]
                ns = {'maven': ns_uri}
            
            # Find dependencies
            dependencies = root.findall('.//maven:dependency', ns)
            if not dependencies:  # Try without namespace
                dependencies = root.findall('.//dependency')
            
            for dep in dependencies:
                group_id = dep.find('maven:groupId', ns)
                artifact_id = dep.find('maven:artifactId', ns)
                version = dep.find('maven:version', ns)
                scope = dep.find('maven:scope', ns)
                
                if group_id is None:
                    group_id = dep.find('groupId')
                if artifact_id is None:
                    artifact_id = dep.find('artifactId')
                if version is None:
                    version = dep.find('version')
                if scope is None:
                    scope = dep.find('scope')
                
                if artifact_id is not None:
                    name = f"{group_id.text if group_id is not None else 'unknown'}:{artifact_id.text}"
                    is_dev = scope is not None and scope.text in ['test', 'provided']
                    
                    deps.append(Dependency(
                        name=name,
                        version=version.text if version is not None else None,
                        dev=is_dev,
                        source=str(file_path)
                    ))
        except Exception as e:
            logger.error(f"Error parsing pom.xml: {e}")
        
        return deps
    
    def _parse_build_gradle(self, file_path: Path) -> List[Dependency]:
        """Parse Gradle build.gradle file."""
        deps = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Match various dependency formats:
            # implementation 'group:artifact:version'
            # compile "group:artifact:version"
            # testImplementation(group = "...", name = "...", version = "...")
            
            # Pattern 1: Single-line string format
            pattern1 = r'(implementation|compile|api|compileOnly|runtimeOnly|testImplementation|testCompile)\s+["\']([^"\']+:[^"\']+:[^"\']+)["\']'
            matches1 = re.findall(pattern1, content)
            
            for scope, dep_str in matches1:
                parts = dep_str.split(':')
                if len(parts) >= 3:
                    group = parts[0]
                    artifact = parts[1]
                    version = parts[2]
                    is_dev = 'test' in scope.lower()
                    
                    deps.append(Dependency(
                        name=f"{group}:{artifact}",
                        version=version,
                        dev=is_dev,
                        source=str(file_path)
                    ))
            
            # Pattern 2: Map format
            pattern2 = r'(implementation|compile|api|testImplementation)\s*\(\s*group\s*:\s*["\']([^"\']+)["\']\s*,\s*name\s*:\s*["\']([^"\']+)["\']\s*,\s*version\s*:\s*["\']([^"\']+)["\']'
            matches2 = re.findall(pattern2, content)
            
            for scope, group, name, version in matches2:
                is_dev = 'test' in scope.lower()
                deps.append(Dependency(
                    name=f"{group}:{name}",
                    version=version,
                    dev=is_dev,
                    source=str(file_path)
                ))
        except Exception as e:
            logger.error(f"Error parsing build.gradle: {e}")
        
        return deps
    
    def parse_imports(self, file_path: Path) -> List[str]:
        """Parse Java/Kotlin file and extract import statements."""
        imports = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Match: import package.Class;
            import_statements = re.findall(r'import\s+([a-zA-Z0-9_.]+)', content)
            
            # Extract root package (first 2-3 parts, e.g., com.google)
            root_packages = []
            for imp in import_statements:
                parts = imp.split('.')
                if len(parts) >= 2:
                    # Take first 2 parts as root package
                    root = f"{parts[0]}.{parts[1]}"
                    if root not in ['java', 'javax', 'kotlin', 'android']:  # Skip standard libs
                        root_packages.append(root)
        except Exception as e:
            logger.error(f"Error parsing imports from {file_path}: {e}")
            return []
        
        return list(set(root_packages))  # Deduplicate
