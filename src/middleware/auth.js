/**
 * Authentication middleware
 * Protects routes that require user authentication
 */

/**
 * Require authentication middleware
 * Redirects to login if user is not authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    console.log('⚠️  Unauthenticated access attempt to:', req.path);
    return res.redirect('/auth/login?error=' + encodeURIComponent('Please log in to continue'));
  }

  // User is authenticated, continue
  next();
}

/**
 * Require authentication middleware for API routes
 * Returns 401 JSON response if user is not authenticated
 */
function requireAuthAPI(req, res, next) {
  if (!req.session.userId) {
    console.log('⚠️  Unauthenticated API access attempt to:', req.path);
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
  }

  // User is authenticated, continue
  next();
}

/**
 * Optional authentication middleware
 * Adds user info to request if authenticated, but doesn't require it
 */
function optionalAuth(req, res, next) {
  if (req.session.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.userEmail,
    };
  }
  next();
}

module.exports = {
  requireAuth,
  requireAuthAPI,
  optionalAuth,
};
