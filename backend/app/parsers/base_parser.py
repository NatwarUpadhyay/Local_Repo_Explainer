"""
Base parser interface for dependency extraction.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from pathlib import Path


class Dependency:
    """Represents a single dependency."""

    def __init__(
        self, name: str, version: str = None, dev: bool = False, source: str = None
    ):
        self.name = name
        self.version = version
        self.dev = dev
        self.source = source  # File where dependency was found

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "dev": self.dev,
            "source": self.source,
        }


class BaseParser(ABC):
    """Base class for language-specific parsers."""

    @abstractmethod
    def parse_manifest(self, file_path: Path) -> List[Dependency]:
        """Parse a manifest file and extract dependencies."""
        pass

    @abstractmethod
    def parse_imports(self, file_path: Path) -> List[str]:
        """Parse source file and extract import statements."""
        pass

    @abstractmethod
    def get_manifest_files(self) -> List[str]:
        """Return list of manifest filenames this parser handles."""
        pass

    @abstractmethod
    def get_file_extensions(self) -> List[str]:
        """Return list of file extensions this parser handles."""
        pass
