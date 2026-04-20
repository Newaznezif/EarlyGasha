from backend.database import get_db  # noqa: F401 - explicit re-export for auth module consumers

# Re-exporting get_db to satisfy the structural constraint
# while maintaining connection pooling to the primary SQLite store.
__all__ = ["get_db"]
