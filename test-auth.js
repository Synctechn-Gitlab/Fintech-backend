const auth = require('./src/middleware/auth.middleware');
console.log(auth);
try {
  const mw = auth.authorize('admin');
  console.log("Authorize middleware created.");
  
  const req = { user: { role: 'user' } };
  const res = {};
  const next = (err) => {
    if (err) {
      console.log("Next called with error:", err.message, err.statusCode);
    } else {
      console.log("Next called cleanly.");
    }
  };
  
  mw(req, res, next);
} catch (e) {
  console.error("Crash:", e);
}
