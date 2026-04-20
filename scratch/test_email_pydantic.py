from pydantic import BaseModel, EmailStr
try:
    class User(BaseModel):
        email: EmailStr
    User(email='test@example.com')
    print('Email OK')
except Exception as e:
    print(f'Email Error: {e}')
