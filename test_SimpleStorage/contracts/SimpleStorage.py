"""SimpleStorage -- minimal PyVax contract."""
from pyvax import Contract, action


class SimpleStorage(Contract):
    """Simple storage contract -- stores a single integer."""

    stored_data: int = 0

    @action
    def set(self, value: int):
        """Set stored data."""
        self.stored_data = value
        self.emit("DataStored", value)

    @action
    def get(self) -> int:
        """Get stored data."""
        return self.stored_data
