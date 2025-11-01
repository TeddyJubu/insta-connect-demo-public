/**
 * Authentication Routes Tests
 * Tests for /auth/register, /auth/login, /auth/logout, /auth/status
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const authRoutes = require('../src/routes/auth');
const User = require('../src/models/User');

// Mock User model
jest.mock('../src/models/User');

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  
  // Mock session middleware
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  }));
  
  app.use('/auth', authRoutes);
  
  return app;
};

describe('Authentication Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /auth/register - JSON API', () => {
    it('should register a new user with JSON request', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        user: { id: 1, email: 'test@example.com' },
        message: 'Registration successful',
      });
      expect(User.create).toHaveBeenCalledWith('test@example.com', 'TestPassword123!');
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'All fields are required' });
    });

    it('should return 400 if passwords do not match', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'DifferentPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Passwords do not match' });
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'short',
          confirmPassword: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Password must be at least 8 characters' });
    });

    it('should return 400 if email already exists', async () => {
      User.findByEmail.mockResolvedValue({ id: 1, email: 'test@example.com' });

      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Email already registered' });
    });

    it('should return 500 on database error', async () => {
      User.findByEmail.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Registration failed. Please try again.' });
    });
  });

  describe('POST /auth/login - JSON API', () => {
    it('should login a user with JSON request', async () => {
      User.verify.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        user: { id: 1, email: 'test@example.com' },
        message: 'Login successful',
      });
      expect(User.verify).toHaveBeenCalledWith('test@example.com', 'TestPassword123!');
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Email and password are required' });
    });

    it('should return 401 if credentials are invalid', async () => {
      User.verify.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid email or password' });
    });

    it('should return 500 on database error', async () => {
      User.verify.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Login failed. Please try again.' });
    });
  });

  describe('GET /auth/status', () => {
    it('should return authenticated false when not logged in', async () => {
      const response = await request(app)
        .get('/auth/status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ authenticated: false });
    });

    it('should return authenticated true when logged in', async () => {
      const agent = request.agent(app);

      // First login
      User.verify.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      await agent
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

      // Then check status
      const response = await agent.get('/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.userId).toBe(1);
      expect(response.body.email).toBe('test@example.com');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user with JSON request', async () => {
      const agent = request.agent(app);

      // First login
      User.verify.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      await agent
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

      // Then logout
      const response = await agent
        .post('/auth/logout')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully',
      });

      // Verify logged out
      const statusResponse = await agent.get('/auth/status');
      expect(statusResponse.body.authenticated).toBe(false);
    });
  });
});

