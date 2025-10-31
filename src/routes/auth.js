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
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('All fields are required'));
    }

    if (password !== confirmPassword) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Passwords do not match'));
    }

    if (password.length < 8) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Password must be at least 8 characters'));
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Email already registered'));
    }

    // Create user
    const user = await User.create(email, password);

    // Log user in
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    console.log('✅ User registered and logged in:', user.email);
    res.redirect('/');

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.redirect('/auth/register?error=' + encodeURIComponent('Registration failed. Please try again.'));
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
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Email and password are required'));
    }

    // Verify user
    const user = await User.verify(email, password);
    
    if (!user) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password'));
    }

    // Log user in
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    console.log('✅ User logged in:', user.email);
    res.redirect('/');

  } catch (error) {
    console.error('❌ Login error:', error);
    res.redirect('/auth/login?error=' + encodeURIComponent('Login failed. Please try again.'));
  }
});

/**
 * POST /auth/logout
 * Handle logout
 */
router.post('/logout', (req, res) => {
  const userEmail = req.session.userEmail;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.redirect('/?error=' + encodeURIComponent('Logout failed'));
    }
    
    console.log('✅ User logged out:', userEmail);
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

