"""
Go dependency parser.
Handles: go.mod, go.sum
"""

import re
from pathlib import Path
from typing import List
import logging

from .base_parser import BaseParser, Dependency

logger = logging.getLogger(__name__)


class GoParser(BaseParser):
    """Parser for Go projects."""

    def get_manifest_files(self) -> List[str]:
        return ["go.mod", "go.sum"]

    def get_file_extensions(self) -> List[str]:
        return [".go"]

    def parse_manifest(self, file_path: Path) -> List[Dependency]:
        """Parse Go manifest files."""
        if not file_path.exists():
            return []

        filename = file_path.name

        try:
            if filename == "go.mod":
                return self._parse_go_mod(file_path)
            elif filename == "go.sum":
                return self._parse_go_sum(file_path)
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return []

        return []

    def _parse_go_mod(self, file_path: Path) -> List[Dependency]:
        """Parse go.mod file."""
        deps = []
        in_require_block = False

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()

                    # Skip empty lines and comments
                    if not line or line.startswith("//"):
                        continue

                    # Check for require block
                    if line.startswith("require ("):
                        in_require_block = True
                        continue
                    elif line == ")":
                        in_require_block = False
                        continue

                    # Parse single require statement
                    if line.startswith("require ") or in_require_block:
                        # Format: require module/path v1.2.3
                        match = re.match(r"require\s+([^\s]+)\s+([^\s]+)", line)
                        if not match and in_require_block:
                            match = re.match(r"([^\s]+)\s+([^\s]+)", line)

                        if match:
                            name = match.group(1)
                            version = match.group(2)
                            # Check if it's an indirect dependency
                            is_indirect = "// indirect" in line
                            deps.append(
                                Dependency(
                                    name=name,
                                    version=version,
                                    dev=is_indirect,
                                    source=str(file_path),
                                )
                            )
        except Exception as e:
            logger.error(f"Error parsing go.mod: {e}")

        return deps

    def _parse_go_sum(self, file_path: Path) -> List[Dependency]:
        """Parse go.sum for checksum verification (optional)."""
        # go.sum is mainly for checksums, go.mod has the actual deps
        # We can skip this or use it for validation
        return []

    def parse_imports(self, file_path: Path) -> List[str]:
        """Parse Go file and extract import statements."""
        imports = []
        in_import_block = False

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()

                    # Single import
                    if line.startswith('import "'):
                        match = re.match(r'import "([^"]+)"', line)
                        if match:
                            imports.append(match.group(1))

                    # Import block start
                    elif line.startswith("import ("):
                        in_import_block = True

                    # Import block end
                    elif line == ")" and in_import_block:
                        in_import_block = False

                    # Inside import block
                    elif in_import_block:
                        match = re.match(r'"([^"]+)"', line)
                        if match:
                            imports.append(match.group(1))

            # Filter out standard library imports (no dots in path)
            external_imports = [imp for imp in imports if "." in imp]

            # Get root package (first part of path)
            root_packages = [
                (
                    imp.split("/")[0] + "/" + imp.split("/")[1]
                    if len(imp.split("/")) > 1
                    else imp
                )
                for imp in external_imports
            ]
        except Exception as e:
            logger.error(f"Error parsing imports from {file_path}: {e}")
            return []

        return list(set(root_packages))  # Deduplicate
