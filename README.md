# ELD Trip Planner

A comprehensive truck trip planning and Electronic Logging Device (ELD) log generation system built with Django REST API (backend) and React + Vite + TailwindCSS (frontend).

## Features

### Backend (Django REST Framework)
- **Trip Planning**: Complete trip planning with route calculation
- **ELD Log Generation**: Automated ELD log sheets following FMCSA Hours of Service rules
- **Route Optimization**: Fuel stops every 1,000 miles, rest stops per HOS rules
- **JWT Authentication**: Secure token-based authentication
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **PostgreSQL Database**: Robust data persistence

### Frontend (React + Vite + TailwindCSS)
- **Trip Input Forms**: Intuitive forms for trip planning
- **Interactive Maps**: Route visualization with Leaflet.js + OpenRouteService
- **ELD Log Visualization**: Canvas API for professional log sheet rendering
- **Responsive Design**: Mobile-first TailwindCSS styling

### Deployment
- **Docker Compose**: Local development with backend, frontend, PostgreSQL, Nginx
- **Terraform + GCP**: Cloud deployment ready (Phase 2)

## Hours of Service Rules Implemented

- Property-carrying driver limits
- 70 hours maximum in 8-day cycle
- 11 hours driving maximum per day
- 14 hours on-duty maximum per day
- 30-minute break after 8 hours of driving
- 10-hour minimum rest period
- 34-hour restart capability

## Tech Stack

### Backend
- **Django 6.0.1** with Django REST Framework
- **PostgreSQL** database with psycopg2
- **JWT Authentication** via djangorestframework-simplejwt
- **CORS Support** with django-cors-headers
- **API Documentation** with drf-spectacular
- **Route Calculation** with OpenRouteService API integration

### Frontend
- **React** with Vite for fast development
- **TailwindCSS** for utility-first styling
- **Axios** for API communication
- **React Router** for navigation
- **Leaflet.js** + React-Leaflet for mapping
- **Canvas API** for ELD log visualization

### Infrastructure
- **Docker** & Docker Compose
- **Nginx** reverse proxy
- **Terraform** (Phase 2)
- **Google Cloud Platform** (Phase 2)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eld-trip-planner
   ```

2. **Environment Setup**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   # Edit .env with your settings
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - API Documentation: http://localhost:8000/api/docs
   - Admin Panel: http://localhost:8000/admin

### Local Development (without Docker)

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up database (PostgreSQL required)
# Edit .env with your database credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/auth/profile/` - User profile

### Trips
- `GET /api/` - List user trips
- `POST /api/` - Create new trip
- `GET /api/{id}/` - Get trip details
- `PUT /api/{id}/` - Update trip
- `DELETE /api/{id}/` - Delete trip
- `POST /api/plan/` - Plan complete trip with ELD logs

### Trip Details
- `GET /api/{trip_id}/logs/` - Get trip log sheets
- `GET /api/{trip_id}/stops/` - Get route stops

## Database Models

### Trip
- User, locations, cycle hours, distance, duration, status
- Relations: RouteStop, LogSheet

### RouteStop
- Trip, location, coordinates, stop type, timing
- Types: fuel, rest, pickup, dropoff

### LogSheet
- Trip, date, driver, hours tracking, cycle info
- Relations: LogEntry

### LogEntry
- LogSheet, time ranges, duty status, location, remarks

## Design Patterns

### Backend
- **Repository Pattern**: Clean data access separation
- **Service Layer**: Business logic encapsulation
- **Factory Pattern**: Log sheet generation
- **Serializer Pattern**: API consistency

### Frontend
- **Container/Presentational**: State and UI separation
- **Custom Hooks**: Reusable API logic
- **Atomic Design**: Component hierarchy

## Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=eld_planner
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost  # Use 'db' in Docker
DB_PORT=5432
OPENROUTESERVICE_API_KEY=your-api-key  # Optional
```

### Frontend
```
VITE_API_URL=http://localhost:8000/api
```

## Docker Services

- **db**: PostgreSQL 15
- **backend**: Django + Gunicorn
- **frontend**: React development server
- **nginx**: Reverse proxy and static serving

## Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## Deployment (Phase 2)

### Terraform Configuration
- Google Kubernetes Engine (GKE)
- Cloud SQL for PostgreSQL
- Cloud Load Balancer
- Cloud Storage for static files

```bash
cd terraform/
terraform init
terraform plan
terraform apply
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.

---

## Development Status

### ✅ Completed (Day 1-2)
- [x] Project setup and structure
- [x] Django backend with DRF
- [x] PostgreSQL models
- [x] Trip planning service layer
- [x] ELD log generation logic
- [x] Docker Compose configuration
- [x] React + Vite + TailwindCSS setup
- [x] JWT authentication
- [x] API endpoints
- [x] Admin configuration

### 🚧 In Progress
- [ ] Frontend trip planning forms
- [ ] Map integration with Leaflet
- [ ] ELD log visualization with Canvas API

### 📋 Planned (Day 3-4)
- [ ] Frontend-backend integration
- [ ] Error handling and validation
- [ ] UI/UX improvements
- [ ] Docker deployment testing
- [ ] API documentation
- [ ] Terraform configuration