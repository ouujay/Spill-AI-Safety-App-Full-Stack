# Spill - AI-Powered Social Safety App

A full-stack social media application with AI-powered content moderation and user safety features. Built with React Native/Expo for mobile and Django REST Framework for the backend.

## Project Overview

Spill is a modern social media platform designed with user safety as a priority. The app features:

- **Anonymous Social Networking**: Share thoughts and connect with others
- **AI-Powered Content Moderation**: Image classification for content safety
- **Push Notifications**: Real-time engagement notifications
- **Cloud Media Storage**: Cloudinary integration for image uploads
- **Secure Authentication**: JWT-based authentication with token refresh

## Architecture

```
spill/
├── spill main project/
│   ├── spill-app/          # React Native/Expo Mobile Application
│   └── spilleu/            # Production Django Backend (Azure)
├── core/                   # Django Backend (Development)
├── flask_image_classifier/ # AI Image Classification Service
├── deployedflask server/   # Deployed Flask Server
├── imageclassapp/          # Image Classification App
├── spillwebsite/           # Web Frontend
└── tester/                 # Testing Utilities
```

## Tech Stack

### Mobile App (React Native/Expo)
- React Native with Expo SDK
- React Navigation for routing
- Expo Notifications for push notifications
- Expo Camera & Image Picker
- AsyncStorage for local storage
- Theme support (light/dark mode)

### Backend (Django)
- Django 5.2.1
- Django REST Framework
- JWT Authentication (SimpleJWT)
- PostgreSQL (Supabase)
- Cloudinary for media storage
- WhiteNoise for static files
- Gunicorn for production

### AI/ML Service (Flask)
- TensorFlow/Keras
- MobileNetV2 architecture
- Gender/Content Classification Model

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Expo CLI
- PostgreSQL database (or Supabase account)
- Cloudinary account

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd "spill main project/spilleu"
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create `.env` file with required variables:
   ```env
   SECRET_KEY=your-secret-key
   DEBUG=False
   DATABASE_URL=postgresql://user:password@host:5432/database
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   ```

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the server:
   ```bash
   python manage.py runserver
   ```

### Mobile App Setup

1. Navigate to the mobile app directory:
   ```bash
   cd "spill main project/spill-app"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update API base URL in the app configuration to point to your backend.

4. Start the development server:
   ```bash
   npx expo start
   ```

5. Run on device/emulator:
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

### AI Service Setup

1. Navigate to the Flask service:
   ```bash
   cd flask_image_classifier
   ```

2. Create virtual environment:
   ```bash
   python -m venv tfenv
   source tfenv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the service:
   ```bash
   python main.py
   ```

## Environment Variables

### Backend (.env)
| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | Debug mode (True/False) |
| `DATABASE_URL` | PostgreSQL connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EMAIL_HOST_USER` | SMTP email address |
| `EMAIL_HOST_PASSWORD` | SMTP email app password |

## API Endpoints

### Authentication
- `POST /api/users/register/` - User registration
- `POST /api/users/login/` - User login (JWT)
- `POST /api/users/token/refresh/` - Refresh JWT token
- `POST /api/users/verify-otp/` - Email OTP verification

### Posts
- `GET /api/posts/` - List posts (feed)
- `POST /api/posts/` - Create new post
- `GET /api/posts/{id}/` - Get post details
- `DELETE /api/posts/{id}/` - Delete post

### Notifications
- `GET /api/notifications/` - List notifications
- `POST /api/notifications/register-device/` - Register push token

## Deployment

### Backend (Azure App Service)
The Django backend is deployed on Azure App Service with:
- Gunicorn as WSGI server
- WhiteNoise for static files
- PostgreSQL on Supabase
- SSL/HTTPS enabled

### Mobile App (Expo/EAS)
Build and deploy using EAS Build:
```bash
eas build --platform all
eas submit --platform all
```

## Security Features

- JWT token-based authentication
- Token blacklisting for logout
- HTTPS enforced in production
- CORS restricted to allowed origins
- Rate limiting on API endpoints
- Secure password validation
- CSRF protection
- XSS protection headers

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Contact

Project Link: [https://github.com/ouujay/Spill-AI-Safety-App-Full-Stack](https://github.com/ouujay/Spill-AI-Safety-App-Full-Stack)
