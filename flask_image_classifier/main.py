from flask import Flask, request, jsonify
import numpy as np
import cv2
import os
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from werkzeug.utils import secure_filename

# === Config ===
MODEL_PATH = "gender_classifier_combined_mnv2.keras"  # update if needed

IMG_SIZE = 128
THRESHOLD = 0.90

# === Initialize Flask app and load model ===
app = Flask(__name__)
model = load_model(MODEL_PATH)

# === Prediction function ===
def predict_gender_from_bytes(file_bytes):
    # Read image from bytes
    img_array = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        return None, None, "Could not read image"
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = preprocess_input(img)
    img = np.expand_dims(img, axis=0)
    pred = model.predict(img, verbose=0)[0][0]
    is_female = bool(pred >= THRESHOLD)
    return is_female, float(pred), None

# === Flask endpoint ===
@app.route('/predict-gender', methods=['POST'])
def predict_gender():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    file_bytes = file.read()
    is_female, confidence, error = predict_gender_from_bytes(file_bytes)
    if error:
        return jsonify({'error': error}), 400

    # Print prediction to terminal
    print(f"Prediction: {'FEMALE' if is_female else 'NOT FEMALE'} | Confidence: {confidence:.4f}")

    response = {
        "is_female": is_female,
        "confidence": confidence,
        "passed_threshold": is_female,
        "threshold": THRESHOLD,
        "message": "âœ… Female, allow signup" if is_female else "âŒ Not female, reject signup"
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)