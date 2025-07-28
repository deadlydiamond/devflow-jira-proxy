# MySQL Backend Setup for Devflow

This guide will help you set up the MySQL backend for your Devflow squad management system.

## 🚀 Quick Start

### 1. Install MySQL

**Windows:**
- Download MySQL Community Server from [mysql.com](https://dev.mysql.com/downloads/mysql/)
- Install with default settings
- Remember the root password you set during installation

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### 2. Set Up the Backend

1. **Navigate to the backend directory:**
   ```bash
   cd devflow/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   ```

4. **Edit `.env` file with your MySQL credentials:**
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=devflow_db
   DB_PORT=3306
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:4200
   JWT_SECRET=your_jwt_secret_key_here
   ```

5. **Set up the database:**
   ```bash
   npm run setup
   ```

6. **Start the backend server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   🚀 Devflow API server running on port 3001
   📊 Health check: http://localhost:3001/health
   🔗 CORS origin: http://localhost:4200
   🌍 Environment: development
   ```

### 3. Test the API

Visit `http://localhost:3001/health` in your browser to verify the API is running.

## 📊 Database Schema

The setup creates three main tables:

### Squads Table
- `id`: Primary key
- `name`: Squad name (unique)
- `description`: Squad description
- `color`: Squad color (hex code)
- `is_active`: Active status
- `created_at`, `updated_at`: Timestamps

### Team Members Table
- `id`: Primary key
- `name`: Member name
- `email`: Email address (unique)
- `role`: Job role
- `avatar_url`: Profile picture URL
- `is_active`: Active status
- `created_at`, `updated_at`: Timestamps

### Squad Assignments Table
- `id`: Primary key
- `squad_id`: Foreign key to squads
- `member_id`: Foreign key to team_members
- `assigned_at`: Assignment timestamp
- `is_active`: Active status

## 🔧 API Endpoints

### Squads
- `GET /api/squads` - Get all squads
- `POST /api/squads` - Create squad
- `PUT /api/squads/:id` - Update squad
- `DELETE /api/squads/:id` - Delete squad

### Team Members
- `GET /api/members` - Get all members
- `POST /api/members` - Create member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member
- `POST /api/members/:id/assign` - Assign to squad
- `DELETE /api/members/:id/assign` - Remove from squad

## 🎯 Sample Data

The setup script creates sample data:

**Squads:**
- Frontend Team (Blue)
- Backend Team (Green)
- DevOps Team (Orange)
- QA Team (Red)

**Team Members:**
- John Doe (Senior Frontend Developer)
- Jane Smith (Backend Developer)
- Mike Johnson (DevOps Engineer)
- Sarah Wilson (QA Engineer)
- Alex Brown (Full Stack Developer)
- Emily Davis (UI/UX Designer)

## 🔄 Frontend Integration

The Angular frontend has been updated to use the MySQL backend:

1. **New API Service**: `src/app/services/squad-api.service.ts`
2. **Updated Component**: `src/app/pages/squad-management-page/squad-management-page.ts`
3. **HTTP Client**: Already configured in `app.config.ts`

### Key Changes:
- Replaced local storage with MySQL persistence
- Added proper error handling
- Implemented loading states
- Added API response validation

## 🛠️ Troubleshooting

### Database Connection Issues

**Error: "Access denied for user"**
- Check your MySQL username and password in `.env`
- Ensure MySQL is running
- Try connecting manually: `mysql -u root -p`

**Error: "Database doesn't exist"**
- Run the setup script: `npm run setup`
- Or create manually: `CREATE DATABASE devflow_db;`

### CORS Issues

**Error: "CORS policy blocked"**
- Check `CORS_ORIGIN` in `.env` matches your frontend URL
- Default: `http://localhost:4200`

### Port Issues

**Error: "Port 3001 already in use"**
- Change `PORT` in `.env` to another port (e.g., 3002)
- Update the frontend API URL accordingly

## 🔒 Security Notes

1. **Production Setup:**
   - Change `JWT_SECRET` to a strong random string
   - Use environment-specific database credentials
   - Enable SSL for database connections
   - Set up proper firewall rules

2. **Development:**
   - The current setup is for development only
   - Don't use default passwords in production
   - Consider using Docker for consistent environments

## 📈 Performance

The backend includes:
- Connection pooling (10 connections)
- Rate limiting (100 requests per 15 minutes)
- Query optimization with indexes
- Soft deletes for data recovery

## 🚀 Next Steps

1. **Start both servers:**
   ```bash
   # Terminal 1 - Backend
   cd devflow/backend
   npm run dev

   # Terminal 2 - Frontend
   cd devflow
   npm start
   ```

2. **Test the application:**
   - Navigate to `http://localhost:4200`
   - Go to Squad Management page
   - Try creating, editing, and deleting squads/members

3. **Monitor the API:**
   - Check `http://localhost:3001/health`
   - View server logs for debugging

## 📝 Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | root |
| `DB_PASSWORD` | MySQL password | (empty) |
| `DB_NAME` | Database name | devflow_db |
| `DB_PORT` | MySQL port | 3306 |
| `PORT` | API server port | 3001 |
| `NODE_ENV` | Environment | development |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:4200 |
| `JWT_SECRET` | JWT signing secret | (required) |

## 🎉 Success!

Once everything is set up, you'll have:
- ✅ MySQL database with sample data
- ✅ RESTful API with full CRUD operations
- ✅ Angular frontend connected to MySQL
- ✅ Real-time squad management capabilities

Your squad management system is now powered by a fast, reliable MySQL backend! 