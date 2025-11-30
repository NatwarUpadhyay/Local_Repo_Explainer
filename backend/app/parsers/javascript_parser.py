"""
JavaScript/TypeScript dependency parser.
Handles: package.json, package-lock.json, yarn.lock
"""

import json
import re
from pathlib import Path
from typing import List
import logging

from .base_parser import BaseParser, Dependency

logger = logging.getLogger(__name__)


class JavaScriptParser(BaseParser):
    """Parser for JavaScript/TypeScript projects."""

    def get_manifest_files(self) -> List[str]:
        return ["package.json", "package-lock.json", "yarn.lock"]

    def get_file_extensions(self) -> List[str]:
        return [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]

    def parse_manifest(self, file_path: Path) -> List[Dependency]:
        """Parse JavaScript manifest files."""
        if not file_path.exists():
            return []

        filename = file_path.name

        try:
            if filename == "package.json":
                return self._parse_package_json(file_path)
            elif filename == "package-lock.json":
                return self._parse_package_lock(file_path)
            elif filename == "yarn.lock":
                return self._parse_yarn_lock(file_path)
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return []

        return []

    def _parse_package_json(self, file_path: Path) -> List[Dependency]:
        """Parse package.json file."""
        deps = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Regular dependencies
            dependencies = data.get("dependencies", {})
            for name, version in dependencies.items():
                # Clean version (remove ^, ~, etc.)
                clean_version = re.sub(r"[\^~>=<]", "", version)
                deps.append(
                    Dependency(name=name, version=clean_version, source=str(file_path))
                )

            # Dev dependencies
            dev_dependencies = data.get("devDependencies", {})
            for name, version in dev_dependencies.items():
                clean_version = re.sub(r"[\^~>=<]", "", version)
                deps.append(
                    Dependency(
                        name=name,
                        version=clean_version,
                        dev=True,
                        source=str(file_path),
                    )
                )

            # Peer dependencies
            peer_dependencies = data.get("peerDependencies", {})
            for name, version in peer_dependencies.items():
                clean_version = re.sub(r"[\^~>=<]", "", version)
                deps.append(
                    Dependency(name=name, version=clean_version, source=str(file_path))
                )
        except Exception as e:
            logger.error(f"Error parsing package.json: {e}")

        return deps

    def _parse_package_lock(self, file_path: Path) -> List[Dependency]:
        """Parse package-lock.json for exact versions."""
        deps = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # npm v7+ format
            if "packages" in data:
                packages = data.get("packages", {})
                for path, info in packages.items():
                    if not path:  # Skip root package
                        continue
                    name = path.replace("node_modules/", "")
                    version = info.get("version")
                    if name and version:
                        deps.append(
                            Dependency(
                                name=name,
                                version=version,
                                dev=info.get("dev", False),
                                source=str(file_path),
                            )
                        )
            # npm v6 format
            elif "dependencies" in data:
                dependencies = data.get("dependencies", {})
                for name, info in dependencies.items():
                    version = info.get("version")
                    if version:
                        deps.append(
                            Dependency(
                                name=name,
                                version=version,
                                dev=info.get("dev", False),
                                source=str(file_path),
                            )
                        )
        except Exception as e:
            logger.error(f"Error parsing package-lock.json: {e}")

        return deps

    def _parse_yarn_lock(self, file_path: Path) -> List[Dependency]:
        """Parse yarn.lock file."""
        deps = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Simple regex-based parsing (yarn.lock has specific format)
            pattern = r'"?([^@\n"]+)@.*?:\n  version "([^"]+)"'
            matches = re.findall(pattern, content)

            seen = set()
            for name, version in matches:
                name = name.strip()
                if name not in seen:
                    deps.append(
                        Dependency(name=name, version=version, source=str(file_path))
                    )
                    seen.add(name)
        except Exception as e:
            logger.error(f"Error parsing yarn.lock: {e}")

        return deps

    def parse_imports(self, file_path: Path) -> List[str]:
        """Parse JavaScript/TypeScript file and extract import statements."""
        imports = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Match ES6 imports: import ... from 'package'
            es6_imports = re.findall(
                r'import\s+.*?\s+from\s+["\']([^"\']+)["\']', content
            )
            imports.extend(es6_imports)

            # Match require: require('package')
            require_imports = re.findall(r'require\(["\']([^"\']+)["\']\)', content)
            imports.extend(require_imports)

            # Filter out relative imports (starting with . or /)
            imports = [
                imp
                for imp in imports
                if not imp.startswith(".") and not imp.startswith("/")
            ]

            # Extract package name (handle scoped packages like @org/package)
            clean_imports = []
            for imp in imports:
                if imp.startswith("@"):
                    # Scoped package: @org/package/subpath -> @org/package
                    parts = imp.split("/")
                    if len(parts) >= 2:
                        clean_imports.append(f"{parts[0]}/{parts[1]}")
                else:
                    # Regular package: package/subpath -> package
                    clean_imports.append(imp.split("/")[0])
        except Exception as e:
            logger.error(f"Error parsing imports from {file_path}: {e}")

        return list(set(clean_imports))  # Deduplicate
