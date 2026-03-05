"""Counter -- increment/decrement contract."""
from pyvax import Contract, action


class Counter(Contract):
    """Simple counter contract."""

    count: int = 0

    @action
    def increment(self):
        """Increment counter."""
        self.count = self.count + 1
        self.emit("Incremented", self.count)

    @action
    def decrement(self):
        """Decrement counter (floor of 0)."""
        if self.count > 0:
            self.count = self.count - 1
            self.emit("Decremented", self.count)

    @action
    def get_count(self) -> int:
        """Return current count."""
        return self.count

    @action
    def reset(self):
        """Reset counter to zero."""
        self.count = 0
        self.emit("Reset")
