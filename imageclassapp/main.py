from flask import Flask, request, jsonify, render_template_string
import numpy as np
import cv2
import os
import time
from datetime import datetime

# === Configuration ===
MODEL_PATH = "gender_classifier_combined_mnv2.keras"
IMG_SIZE = 128
THRESHOLD = 0.80
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

# === Initialize Flask app ===
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# === Global model variable - lazy loading ===
model = None
model_load_time = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_model_if_needed():
    global model, model_load_time
    if model is None:
        try:
            start_time = time.time()
            print(f"Loading model from: {MODEL_PATH}")
            
            if not os.path.exists(MODEL_PATH):
                print(f"Model file not found: {MODEL_PATH}")
                return False
            
            from tensorflow.keras.models import load_model
            model = load_model(MODEL_PATH)
            
            model_load_time = time.time() - start_time
            print(f"Model loaded successfully in {model_load_time:.2f} seconds")
            return True
            
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    return True

# === CORS headers ===
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# === HTML Template ===
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Gender Classifier | Professional Test Interface</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .gradient-bg { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        }
        .upload-zone { 
            transition: all 0.3s ease; 
            border: 2px dashed #d1d5db;
        }
        .upload-zone:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-color: #6366f1;
        }
        .upload-zone.dragover {
            border-color: #6366f1;
            background-color: #f0f9ff;
        }
        .result-card { 
            animation: slideIn 0.5s ease-out; 
        }
        @keyframes slideIn { 
            from { opacity: 0; transform: translateY(20px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        .loading-spinner { 
            animation: spin 1s linear infinite; 
        }
        @keyframes spin { 
            from { transform: rotate(0deg); } 
            to { transform: rotate(360deg); } 
        }
        .confidence-bar {
            transition: width 1s ease-in-out;
        }
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
        }
        .status-online { background-color: #10b981; }
        .status-loading { background-color: #f59e0b; animation: pulse 2s infinite; }
        .status-offline { background-color: #ef4444; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="gradient-bg text-white py-8">
        <div class="container mx-auto px-4">
            <h1 class="text-4xl font-bold text-center flex items-center justify-center gap-4">
                <i class="fas fa-brain text-5xl"></i>
                AI Gender Classifier
            </h1>
            <p class="text-center mt-3 text-blue-100 text-lg">Advanced Deep Learning Model for Gender Classification</p>
            <div class="text-center mt-4">
                <span id="statusIndicator" class="status-indicator status-loading"></span>
                <span id="statusText" class="text-sm">Checking system status...</span>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <!-- System Info Cards -->
        <div class="grid md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center gap-3 mb-3">
                    <div class="bg-blue-100 p-2 rounded-full">
                        <i class="fas fa-cog text-blue-600"></i>
                    </div>
                    <h3 class="font-semibold text-gray-800">Model Info</h3>
                </div>
                <p class="text-sm text-gray-600">Confidence Threshold: <span class="font-bold text-blue-600">80%</span></p>
                <p class="text-sm text-gray-600">Input Size: <span class="font-bold text-blue-600">128x128px</span></p>
                <p class="text-sm text-gray-600" id="modelStatus">Status: <span class="text-orange-600">Loading...</span></p>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center gap-3 mb-3">
                    <div class="bg-green-100 p-2 rounded-full">
                        <i class="fas fa-upload text-green-600"></i>
                    </div>
                    <h3 class="font-semibold text-gray-800">Supported Files</h3>
                </div>
                <p class="text-sm text-gray-600">Formats: JPG, PNG, GIF, BMP</p>
                <p class="text-sm text-gray-600">Max Size: <span class="font-bold text-green-600">10MB</span></p>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center gap-3 mb-3">
                    <div class="bg-purple-100 p-2 rounded-full">
                        <i class="fas fa-chart-line text-purple-600"></i>
                    </div>
                    <h3 class="font-semibold text-gray-800">API Endpoint</h3>
                </div>
                <p class="text-sm text-gray-600">POST /predict-gender</p>
                <p class="text-sm text-gray-600">Content-Type: multipart/form-data</p>
            </div>
        </div>

        <!-- Upload Form -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <div class="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b">
                <h2 class="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                    <i class="fas fa-cloud-upload-alt text-indigo-600"></i>
                    Upload Image for Analysis
                </h2>
                <p class="text-gray-600 mt-1">Select or drag an image to analyze gender classification</p>
            </div>
            
            <form id="uploadForm" enctype="multipart/form-data" class="p-6">
                <div class="upload-zone rounded-lg p-8 text-center bg-gray-50 cursor-pointer relative" id="uploadZone">
                    <div class="mb-4">
                        <i class="fas fa-cloud-upload-alt text-6xl text-gray-400"></i>
                    </div>
                    <input type="file" name="file" accept="image/*" required class="hidden" id="fileInput">
                    <label for="fileInput" class="cursor-pointer">
                        <p class="text-xl font-medium text-gray-700 mb-2">Click to select an image</p>
                        <p class="text-gray-500">or drag and drop your file here</p>
                        <p class="text-sm text-gray-400 mt-2">Supported: PNG, JPG, JPEG, GIF, BMP (max 10MB)</p>
                    </label>
                    
                    <!-- Selected file preview -->
                    <div id="filePreview" class="mt-6 hidden">
                        <div class="bg-white border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-image text-blue-600 text-2xl"></i>
                                <div class="text-left">
                                    <p class="font-medium text-gray-800" id="fileName"></p>
                                    <p class="text-sm text-gray-500" id="fileSize"></p>
                                </div>
                                <button type="button" id="removeFile" class="ml-auto text-red-500 hover:text-red-700">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-center">
                    <button type="submit" id="analyzeBtn" class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i class="fas fa-magic"></i>
                        Analyze Image
                    </button>
                </div>
            </form>
        </div>

        <!-- Results Area -->
        <div id="result"></div>

        <!-- API Documentation -->
        <div class="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-code text-green-600"></i>
                API Documentation
            </h3>
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm font-semibold text-gray-700 mb-2">Endpoint:</p>
                        <code class="bg-gray-800 text-green-400 px-3 py-1 rounded text-sm block">POST /predict-gender</code>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-700 mb-2">Response Format:</p>
                        <code class="bg-gray-800 text-green-400 px-3 py-1 rounded text-sm block">JSON</code>
                    </div>
                </div>
                <div class="mt-4">
                    <p class="text-sm font-semibold text-gray-700 mb-2">Example Response:</p>
                    <pre class="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto"><code>{
  "is_female": true,
  "confidence": 0.80,
  "threshold": 0.9,
  "message": "✅ Female, allow signup"
}</code></pre>
                </div>
            </div>
        </div>
    </div>

    <script>
        let isModelReady = false;
        
        // Check system status
        async function checkSystemStatus() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                const statusIndicator = document.getElementById('statusIndicator');
                const statusText = document.getElementById('statusText');
                const modelStatus = document.getElementById('modelStatus');
                
                if (data.model_ready) {
                    statusIndicator.className = 'status-indicator status-online';
                    statusText.textContent = 'System Online - Ready for predictions';
                    modelStatus.innerHTML = 'Status: <span class="text-green-600">Ready</span>';
                    isModelReady = true;
                } else {
                    statusIndicator.className = 'status-indicator status-loading';
                    statusText.textContent = 'Model will load on first request (30-60 seconds)';
                    modelStatus.innerHTML = 'Status: <span class="text-orange-600">Will load on demand</span>';
                    isModelReady = false;
                }
            } catch (error) {
                const statusIndicator = document.getElementById('statusIndicator');
                const statusText = document.getElementById('statusText');
                statusIndicator.className = 'status-indicator status-offline';
                statusText.textContent = 'System Offline - Check connection';
                console.error('Health check failed:', error);
            }
        }

        // File handling
        const fileInput = document.getElementById('fileInput');
        const uploadZone = document.getElementById('uploadZone');
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFile = document.getElementById('removeFile');

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function handleFileSelect(file) {
            if (file) {
                fileName.textContent = file.name;
                fileSize.textContent = formatFileSize(file.size);
                filePreview.classList.remove('hidden');
                uploadZone.classList.add('border-green-500', 'bg-green-50');
            }
        }

        function clearFileSelection() {
            fileInput.value = '';
            filePreview.classList.add('hidden');
            uploadZone.classList.remove('border-green-500', 'bg-green-50');
        }

        fileInput.addEventListener('change', function(e) {
            handleFileSelect(e.target.files[0]);
        });

        removeFile.addEventListener('click', clearFileSelection);

        // Drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            uploadZone.classList.add('dragover');
        }

        function unhighlight(e) {
            uploadZone.classList.remove('dragover');
        }

        uploadZone.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelect(files[0]);
            }
        }

        // Form submission
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const fileInput = document.getElementById('fileInput');
            
            if (!fileInput.files[0]) {
                alert('Please select a file first.');
                return;
            }
            
            formData.append('file', fileInput.files[0]);
            
            const analyzeBtn = document.getElementById('analyzeBtn');
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner loading-spinner"></i> Processing...';
            
            // Show loading state
            const loadingMessage = isModelReady ? 
                'Analyzing image...' : 
                'Loading AI model and analyzing (this may take 30-60 seconds on first use)...';
                
            document.getElementById('result').innerHTML = `
                <div class="result-card bg-white rounded-xl shadow-lg p-8">
                    <div class="flex flex-col items-center justify-center gap-4">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-spinner loading-spinner text-3xl text-indigo-600"></i>
                            <span class="text-xl font-medium text-gray-700">${loadingMessage}</span>
                        </div>
                        <div class="w-full max-w-md bg-gray-200 rounded-full h-3">
                            <div class="bg-indigo-600 h-3 rounded-full animate-pulse" style="width: 45%"></div>
                        </div>
                        ${!isModelReady ? '<p class="text-sm text-gray-500 text-center">First prediction loads the AI model - please be patient</p>' : ''}
                    </div>
                </div>
            `;
            
            try {
                const response = await fetch('/predict-gender', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    const isSuccess = data.is_female;
                    const confidence = (data.confidence * 100).toFixed(1);
                    
                    // Update model status if it wasn't ready before
                    if (!isModelReady) {
                        isModelReady = true;
                        document.getElementById('statusIndicator').className = 'status-indicator status-online';
                        document.getElementById('statusText').textContent = 'System Online - Ready for predictions';
                        document.getElementById('modelStatus').innerHTML = 'Status: <span class="text-green-600">Ready</span>';
                    }
                    
                    document.getElementById('result').innerHTML = `
                        <div class="result-card bg-white rounded-xl shadow-lg overflow-hidden">
                            <div class="bg-gradient-to-r ${isSuccess ? 'from-green-50 to-emerald-50' : 'from-red-50 to-rose-50'} px-6 py-4 border-b">
                                <div class="flex items-center gap-4">
                                    <div class="${isSuccess ? 'bg-green-100' : 'bg-red-100'} p-3 rounded-full">
                                        <i class="fas ${isSuccess ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'} text-3xl"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-2xl font-bold ${isSuccess ? 'text-green-800' : 'text-red-800'}">${data.message}</h3>
                                        <p class="text-gray-600 mt-1">Analysis completed successfully</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="p-6">
                                <div class="grid md:grid-cols-2 gap-6">
                                    <div class="bg-gray-50 rounded-lg p-6">
                                        <div class="flex items-center gap-3 mb-4">
                                            <i class="fas fa-percentage text-blue-600 text-xl"></i>
                                            <span class="font-semibold text-lg">Confidence Score</span>
                                        </div>
                                        <div class="text-4xl font-bold text-gray-800 mb-3">${confidence}%</div>
                                        <div class="bg-gray-200 rounded-full h-3">
                                            <div class="bg-blue-600 h-3 rounded-full confidence-bar" style="width: ${confidence}%"></div>
                                        </div>
                                        <p class="text-sm text-gray-600 mt-2">Model confidence in prediction</p>
                                    </div>
                                    
                                    <div class="bg-gray-50 rounded-lg p-6">
                                        <div class="flex items-center gap-3 mb-4">
                                            <i class="fas fa-cog text-purple-600 text-xl"></i>
                                            <span class="font-semibold text-lg">Threshold</span>
                                        </div>
                                        <div class="text-4xl font-bold text-gray-800 mb-3">${(data.threshold * 100)}%</div>
                                        <div class="bg-gray-200 rounded-full h-3">
                                            <div class="bg-purple-600 h-3 rounded-full" style="width: ${(data.threshold * 100)}%"></div>
                                        </div>
                                        <p class="text-sm text-gray-600 mt-2">Required confidence threshold</p>
                                    </div>
                                </div>
                                
                                <div class="mt-6 bg-gray-50 rounded-lg p-4">
                                    <h4 class="font-semibold text-gray-800 mb-2">Technical Details:</h4>
                                    <ul class="text-sm text-gray-600 space-y-1">
                                        <li><span class="font-medium">Prediction:</span> ${isSuccess ? 'Female detected' : 'Female not detected'}</li>
                                        <li><span class="font-medium">Threshold Met:</span> ${data.passed_threshold ? 'Yes' : 'No'}</li>
                                        <li><span class="font-medium">Raw Score:</span> ${data.confidence.toFixed(4)}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    document.getElementById('result').innerHTML = `
                        <div class="result-card bg-white rounded-xl shadow-lg p-6">
                            <div class="flex items-center gap-4">
                                <div class="bg-red-100 p-3 rounded-full">
                                    <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-red-800">Analysis Failed</h3>
                                    <p class="text-gray-600 mt-1">${data.error}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                document.getElementById('result').innerHTML = `
                    <div class="result-card bg-white rounded-xl shadow-lg p-6">
                        <div class="flex items-center gap-4">
                            <div class="bg-red-100 p-3 rounded-full">
                                <i class="fas fa-wifi text-red-600 text-2xl"></i>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-red-800">Connection Error</h3>
                                <p class="text-gray-600 mt-1">Unable to connect to the server. Please check your connection and try again.</p>
                            </div>
                        </div>
                    </div>
                `;
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze Image';
            }
        });

        // Initialize on page load
        checkSystemStatus();
    </script>
</body>
</html>
"""

def predict_gender_from_bytes(file_bytes):
    """Predict gender from image bytes"""
    try:
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        
        # Read image from bytes
        img_array = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return None, None, "Could not read image file. Please ensure it's a valid image format."
        
        # Preprocess image
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
        img = preprocess_input(img)
        img = np.expand_dims(img, axis=0)
        
        # Make prediction
        pred = model.predict(img, verbose=0)[0][0]
        is_female = bool(pred >= THRESHOLD)
        
        return is_female, float(pred), None
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return None, None, f"Prediction failed: {str(e)}"

# === Routes ===

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_ready': model is not None,
        'model_path': MODEL_PATH,
        'threshold': THRESHOLD,
        'image_size': IMG_SIZE,
        'max_file_size': MAX_FILE_SIZE,
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'timestamp': datetime.utcnow().isoformat(),
        'model_load_time': model_load_time
    })
# Add this debug endpoint to your Flask app

@app.route('/model-debug')
def model_debug():
    """Debug model loading specifically"""
    debug_info = {
        'model_file_exists': os.path.exists(MODEL_PATH),
        'model_file_size': os.path.getsize(MODEL_PATH) if os.path.exists(MODEL_PATH) else 0,
        'tensorflow_available': False,
        'tensorflow_version': None,
        'load_attempt': None,
        'error_details': None
    }
    
    # Test TensorFlow import
    try:
        import tensorflow as tf
        debug_info['tensorflow_available'] = True
        debug_info['tensorflow_version'] = tf.__version__
        print(f"TensorFlow version: {tf.__version__}")
    except Exception as e:
        debug_info['tensorflow_import_error'] = str(e)
        return jsonify(debug_info)
    
    # Test model loading with detailed error info
    try:
        print(f"Attempting to load model: {MODEL_PATH}")
        from tensorflow.keras.models import load_model
        
        # Try loading with different options
        model_test = load_model(MODEL_PATH, compile=False)  # Don't compile optimizer
        debug_info['load_attempt'] = 'success'
        debug_info['model_summary'] = str(model_test.summary())
        
    except Exception as e:
        debug_info['load_attempt'] = 'failed'
        debug_info['error_details'] = {
            'error_type': type(e).__name__,
            'error_message': str(e),
            'error_args': str(e.args) if hasattr(e, 'args') else None
        }
        print(f"Model loading error: {e}")
    
    return jsonify(debug_info)
@app.route('/', methods=['GET'])
def index():
    """Main web interface"""
    return render_template_string(HTML_TEMPLATE)

@app.route('/predict-gender', methods=['POST', 'OPTIONS'])
def predict_gender():
    """Main prediction endpoint"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    start_time = time.time()
    
    # Load model on first request
    if not load_model_if_needed():
        return jsonify({
            'error': 'Model failed to load. Please check server logs.',
            'debug_info': {
                'model_file_exists': os.path.exists(MODEL_PATH),
                'model_path': MODEL_PATH,
                'current_directory': os.getcwd()
            }
        }), 503
    
    # Validate request
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({
            'error': f'Invalid file type. Supported formats: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    try:
        # Process file
        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({'error': 'Empty file uploaded'}), 400
            
        # Make prediction
        is_female, confidence, error = predict_gender_from_bytes(file_bytes)
        
        if error:
            return jsonify({'error': error}), 400

        processing_time = time.time() - start_time

        # Log prediction for monitoring
        log_message = (
            f"Prediction: {'FEMALE' if is_female else 'NOT FEMALE'} | "
            f"Confidence: {confidence:.4f} | "
            f"File: {file.filename} | "
            f"Size: {len(file_bytes)} bytes | "
            f"Processing time: {processing_time:.2f}s"
        )
        print(log_message)

        # Return response
        response = {
            "is_female": is_female,
            "confidence": confidence,
            "passed_threshold": is_female,
            "threshold": THRESHOLD,
            "message": "✅ Female, allow signup" if is_female else "❌ Not female, reject signup",
            "processing_time": round(processing_time, 3),
            "file_info": {
                "name": file.filename,
                "size": len(file_bytes)
            }
        }
        return jsonify(response)
        
    except Exception as e:
        error_message = f"Request processing failed: {str(e)}"
        print(f"Error processing request: {e}")
        return jsonify({
            'error': error_message,
            'processing_time': round(time.time() - start_time, 3)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Statistics endpoint"""
    return jsonify({
        'model_loaded': model is not None,
        'model_load_time': model_load_time,
        'threshold': THRESHOLD,
        'image_size': IMG_SIZE,
        'max_file_size': MAX_FILE_SIZE,
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'server_time': datetime.utcnow().isoformat()
    })

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB'
    }), 413

@app.errorhandler(400)
def bad_request(e):
    """Handle bad request error"""
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(404)
def not_found(e):
    """Handle not found error"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server error"""
    return jsonify({'error': 'Internal server error'}), 500

# === Main Application ===
if __name__ == "__main__":
    print("🚀 Starting Flask Gender Classifier...")
    print(f"📍 Model: {MODEL_PATH}")
    print(f"🧠 Threshold: {THRESHOLD}")
    print(f"📏 Image size: {IMG_SIZE}x{IMG_SIZE}")
    print(f"📁 Max file size: {MAX_FILE_SIZE // (1024*1024)}MB")
    print(f"🎯 Supported formats: {', '.join(ALLOWED_EXTENSIONS)}")
    print(f"⚡ Model loading: On-demand (lazy loading)")
    print("=" * 50)
    
    # Run the app
    app.run(debug=False, host="0.0.0.0", port=8000)
        