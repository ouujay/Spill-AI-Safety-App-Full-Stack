#!/bin/bash

# Install dependencies
pip install -r requirements.txt

# Start the Flask app with gunicorn
gunicorn --bind 0.0.0.0:8000 --timeout 120 --workers 1 main:app