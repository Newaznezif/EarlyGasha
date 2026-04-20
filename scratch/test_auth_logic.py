import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.auth.security import verify_password, create_access_token
from backend.auth.models import User

# Mocking a user and password verification
hashed_pw = "$2b$12$6Pq1qQ9Y5nS1kX8gY0Y0U.r0v5P1p1P1p1P1p1P1p1P1p1P1p1P1" # Mock hash
# Actually, let's use the actual hash generator
from backend.auth.security import get_password_hash
pw = "Admin@123"
hashed = get_password_hash(pw)
print(f"Hashed: {hashed}")
verified = verify_password(pw, hashed)
print(f"Verified: {verified}")

token = create_access_token(data={"user_id": 1, "role": "admin"})
print(f"Token: {token}")
