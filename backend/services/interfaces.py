"""
Interface definitions for services and repositories.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Union


class RouteCalculationInterface(ABC):
    """Interface for route calculation services."""

    @abstractmethod
    def get_coordinates(self, address: str) -> Dict[str, float]:
        """Get latitude and longitude for an address."""
        pass

    @abstractmethod
    def calculate_route(self, origin: str, destination: str) -> Dict[str, Any]:
        """Calculate route between two points."""
        pass

    @abstractmethod
    def calculate_fuel_stops(self, distance: float) -> List[Dict[str, Any]]:
        """Calculate optimal fuel stop locations."""
        pass

    @abstractmethod
    def generate_rest_stops(self, total_driving_time: float) -> List[Dict[str, Any]]:
        """Generate required rest stops based on HOS rules."""
        pass


class ELDComplianceInterface(ABC):
    """Interface for ELD compliance checking."""

    @abstractmethod
    def check_driving_limit(self, driving_hours: float) -> bool:
        """Check if driving time exceeds 11-hour limit."""
        pass

    @abstractmethod
    def check_duty_limit(self, duty_hours: float) -> bool:
        """Check if duty time exceeds 14-hour limit."""
        pass

    @abstractmethod
    def require_break(self, driving_since_break: float) -> bool:
        """Check if 30-minute break is required."""
        pass

    @abstractmethod
    def check_cycle_hours(self, used_hours: float) -> bool:
        """Check if cycle hours are within 70-hour limit."""
        pass


class CacheManagerInterface(ABC):
    """Interface for cache management."""

    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        pass

    @abstractmethod
    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        """Set value in cache."""
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete value from cache."""
        pass

    @abstractmethod
    def clear_pattern(self, pattern: str) -> None:
        """Clear cache entries matching pattern."""
        pass


class ExternalAPIInterface(ABC):
    """Interface for external API interactions."""

    @abstractmethod
    def make_request(self, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request to external API."""
        pass

    @abstractmethod
    def handle_error(self, error: Exception) -> Dict[str, Any]:
        """Handle API errors consistently."""
        pass

    @abstractmethod
    def is_rate_limited(self, response: Dict[str, Any]) -> bool:
        """Check if response indicates rate limiting."""
        pass


class ValidationError(Exception):
    """Custom validation error for business logic."""

    def __init__(self, message: str, code: Optional[str] = None):
        self.message = message
        self.code = code
        super().__init__(message)


class ExternalServiceError(Exception):
    """Error for external service failures."""

    def __init__(self, message: str, service: Optional[str] = None):
        self.message = message
        self.service = service
        super().__init__(message)


class ComplianceError(Exception):
    """Error for ELD compliance violations."""

    def __init__(self, message: str, rule: Optional[str] = None):
        self.message = message
        self.rule = rule
        super().__init__(message)


# Type aliases for better readability
Coordinates = Dict[str, float]
RouteData = Dict[str, Any]
StopData = Dict[str, Any]
LogEntryData = Dict[str, Any]
ComplianceResult = Dict[str, Union[bool, str]]
