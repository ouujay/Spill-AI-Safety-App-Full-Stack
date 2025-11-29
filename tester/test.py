import requests
import json
import os

# Your Azure Flask URL
FLASK_URL = "https://genapp-dgeugtftfmaea7ds.southafricanorth-01.azurewebsites.net"

def test_flask_server():
    print("Testing Flask microservice on Azure...")
    print(f"URL: {FLASK_URL}")
    print("-" * 50)
    
    # 1. Test if server is alive
    print("1. Testing server health...")
    try:
        response = requests.get(f"{FLASK_URL}/", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   ERROR: {e}")
        print("   Server might be down or URL is wrong")
        return False
    
    print("\n" + "-" * 50)
    
    # 2. Test gender prediction endpoint
    print("2. Testing gender prediction endpoint...")
    
    # Look for an image file in current directory
    image_files = [f for f in os.listdir('.') if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not image_files:
        print("   No image files found in current directory.")
        print("   Please add a .jpg or .png file to test with.")
        return False
    
    # Use the first image file found
    image_file = image_files[0]
    print(f"   Using image: {image_file}")
    
    try:
        with open(image_file, 'rb') as f:
            files = {'file': (image_file, f, 'image/jpeg')}
            response = requests.post(f"{FLASK_URL}/predict-gender", files=files, timeout=30)
        
        print(f"   Status: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   JSON Response: {json.dumps(result, indent=2)}")
                
                # Check expected fields
                if 'is_female' in result:
                    print(f"   ✓ Gender prediction: {'Female' if result['is_female'] else 'Male'}")
                if 'confidence' in result:
                    print(f"   ✓ Confidence: {result['confidence']:.2%}")
                
                return True
            except json.JSONDecodeError:
                print(f"   Raw response: {response.text}")
                print("   WARNING: Response is not valid JSON")
        else:
            print(f"   Error response: {response.text}")
            
    except FileNotFoundError:
        print(f"   ERROR: Could not find image file: {image_file}")
    except requests.exceptions.Timeout:
        print("   ERROR: Request timed out (30 seconds)")
    except requests.exceptions.RequestException as e:
        print(f"   ERROR: {e}")
    
    return False

def test_error_handling():
    print("\n" + "-" * 50)
    print("3. Testing error handling...")
    
    try:
        # Test with no file
        response = requests.post(f"{FLASK_URL}/predict-gender", timeout=10)
        print(f"   No file test - Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        # Test with empty form data
        response = requests.post(f"{FLASK_URL}/predict-gender", data={}, timeout=10)
        print(f"   Empty data test - Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
    except requests.exceptions.RequestException as e:
        print(f"   ERROR: {e}")

if __name__ == "__main__":
    print("Flask Microservice Tester")
    print("=" * 50)
    
    # Test the server
    success = test_flask_server()
    
    # Test error handling regardless of success
    test_error_handling()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ Flask server is working!")
        print("Your microservice is ready for mobile app integration.")
    else:
        print("❌ Flask server has issues.")
        print("Check the logs above for details.")
    
    print("\nTesting complete!")