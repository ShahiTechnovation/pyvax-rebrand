"""Voting -- decentralized voting contract."""
from pyvax import Contract, action


class Voting(Contract):
    """Simple on-chain voting contract."""

    votes: dict = {}
    voter_status: dict = {}
    total_votes: int = 0

    @action
    def vote(self, candidate_id: int):
        """Cast a vote for a candidate."""
        sender = self.msg_sender()
        self.require(self.voter_status.get(sender, 0) == 0, "Already voted")
        self.voter_status[sender] = 1
        self.votes[candidate_id] = self.votes.get(candidate_id, 0) + 1
        self.total_votes = self.total_votes + 1
        self.emit("VoteCast", sender, candidate_id)

    @action
    def get_votes(self, candidate_id: int) -> int:
        """Get vote count for a candidate."""
        return self.votes.get(candidate_id, 0)

    @action
    def get_total_votes(self) -> int:
        """Get total votes cast."""
        return self.total_votes
