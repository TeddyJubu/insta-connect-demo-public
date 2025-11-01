/**
 * Authentication routes
 * Handles user registration, login, and logout
 */

const express = require('express');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /auth/register
 * Show registration page
 */
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Register - Instagram Connect</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
        }
        h1 { color: #333; }
        form { display: flex; flex-direction: column; gap: 15px; }
        input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        button {
          padding: 12px;
          background: #0095f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        button:hover { background: #0081d8; }
        .error { color: #ed4956; margin-bottom: 10px; }
        .link { text-align: center; margin-top: 20px; }
        .link a { color: #0095f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>Create Account</h1>
      ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
      <form method="POST" action="/auth/register">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password (min 8 characters)" required minlength="8" />
        <input type="password" name="confirmPassword" placeholder="Confirm Password" required minlength="8" />
        <button type="submit">Register</button>
      </form>
      <div class="link">
        Already have an account? <a href="/auth/login">Log in</a>
      </div>
    </body>
    </html>
  `);
});

/**
 * POST /auth/register
 * Handle registration
 * Supports both form submissions (redirects) and JSON API calls (JSON responses)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const isJsonRequest = req.headers['content-type']?.includes('application/json');

    // Validation
    if (!email || !password || !confirmPassword) {
      const error = 'All fields are required';
      if (isJsonRequest) {
        return res.status(400).json({ error });
      }
      return res.redirect('/auth/register?error=' + encodeURIComponent(error));
    }

    if (password !== confirmPassword) {
      const error = 'Passwords do not match';
      if (isJsonRequest) {
        return res.status(400).json({ error });
      }
      return res.redirect('/auth/register?error=' + encodeURIComponent(error));
    }

    if (password.length < 8) {
      const error = 'Password must be at least 8 characters';
      if (isJsonRequest) {
        return res.status(400).json({ error });
      }
      return res.redirect('/auth/register?error=' + encodeURIComponent(error));
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      const error = 'Email already registered';
      if (isJsonRequest) {
        return res.status(400).json({ error });
      }
      return res.redirect('/auth/register?error=' + encodeURIComponent(error));
    }

    // Create user
    const user = await User.create(email, password);

    // Log user in
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    console.log('✅ User registered and logged in:', user.email);

    if (isJsonRequest) {
      return res.json({
        success: true,
        user: { id: user.id, email: user.email },
        message: 'Registration successful'
      });
    }
    res.redirect('/');

  } catch (error) {
    console.error('❌ Registration error:', error);
    const errorMsg = 'Registration failed. Please try again.';
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ error: errorMsg });
    }
    res.redirect('/auth/register?error=' + encodeURIComponent(errorMsg));
  }
});

/**
 * GET /auth/login
 * Show login page
 */
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login - Instagram Connect</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
        }
        h1 { color: #333; }
        form { display: flex; flex-direction: column; gap: 15px; }
        input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        button {
          padding: 12px;
          background: #0095f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        button:hover { background: #0081d8; }
        .error { color: #ed4956; margin-bottom: 10px; }
        .success { color: #00a400; margin-bottom: 10px; }
        .link { text-align: center; margin-top: 20px; }
        .link a { color: #0095f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>Log In</h1>
      ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
      ${req.query.message ? `<div class="success">${req.query.message}</div>` : ''}
      <form method="POST" action="/auth/login">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit">Log In</button>
      </form>
      <div class="link">
        Don't have an account? <a href="/auth/register">Sign up</a>
      </div>
    </body>
    </html>
  `);
});

/**
 * POST /auth/login
 * Handle login
 * Supports both form submissions (redirects) and JSON API calls (JSON responses)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const isJsonRequest = req.headers['content-type']?.includes('application/json');

    // Validation
    if (!email || !password) {
      const error = 'Email and password are required';
      if (isJsonRequest) {
        return res.status(400).json({ error });
      }
      return res.redirect('/auth/login?error=' + encodeURIComponent(error));
    }

    // Verify user
    const user = await User.verify(email, password);

    if (!user) {
      const error = 'Invalid email or password';
      if (isJsonRequest) {
        return res.status(401).json({ error });
      }
      return res.redirect('/auth/login?error=' + encodeURIComponent(error));
    }

    // Log user in
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    console.log('✅ User logged in:', user.email);

    if (isJsonRequest) {
      return res.json({
        success: true,
        user: { id: user.id, email: user.email },
        message: 'Login successful'
      });
    }
    res.redirect('/');

  } catch (error) {
    console.error('❌ Login error:', error);
    const errorMsg = 'Login failed. Please try again.';
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ error: errorMsg });
    }
    res.redirect('/auth/login?error=' + encodeURIComponent(errorMsg));
  }
});

/**
 * POST /auth/logout
 * Handle logout
 * Supports both form submissions (redirects) and JSON API calls (JSON responses)
 */
router.post('/logout', (req, res) => {
  const userEmail = req.session.userEmail;
  const isJsonRequest = req.headers['content-type']?.includes('application/json');

  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      if (isJsonRequest) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      return res.redirect('/?error=' + encodeURIComponent('Logout failed'));
    }

    console.log('✅ User logged out:', userEmail);

    if (isJsonRequest) {
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }
    res.redirect('/auth/login?message=' + encodeURIComponent('Logged out successfully'));
  });
});

/**
 * GET /auth/status
 * Get current authentication status (JSON API)
 */
router.get('/status', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      userId: req.session.userId,
      email: req.session.userEmail
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

module.exports = router;

