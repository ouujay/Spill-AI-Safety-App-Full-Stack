import requests
import time

url = "https://genapp-dgeugtftfmaea7ds.southafricanorth-01.azurewebsites.net"

print("Checking if server responds at all...")

for i in range(3):
    print(f"Attempt {i+1}:")
    try:
        response = requests.get(url, timeout=120)  # 2 minutes
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text[:100]}")
        break
    except requests.exceptions.Timeout:
        print(f"  Timeout after 120 seconds")
    except Exception as e:
        print(f"  Error: {e}")
    
    if i < 2:
        print("  Waiting 30 seconds before retry...")
        time.sleep(30)

print("Done.")