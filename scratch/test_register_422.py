import requests

url = "http://localhost:8000/auth/register"
data = {
    "email": "admin@earlygasha.local",
    "password": "password123"
}

response = requests.post(url, json=data)
print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.json()}")
