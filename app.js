require("dotenv").config();

const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const users = {}; // { socketId: { username, latitude, longitude, avatar } }

// ✅ Debug ENV values (safe: don’t log secret itself)
console.log("DEBUG ENV:", {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET ? "Loaded" : "Missing",
  baseUrl: process.env.BASE_URL,
});

// View engine + static files
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport config
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

// GitHub OAuth strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID_PROD,
    clientSecret: process.env.GITHUB_CLIENT_SECRET_PROD,
    callbackURL: process.env.BASE_URL_PROD + '/auth/github/callback'
}, (accessToken, refreshToken, profile, done) => {
    return done(null, {
        id: profile.id,
        displayName: profile.displayName || profile.username,
        avatar: profile.photos[0] ? profile.photos[0].value : '',
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : ''
    });
}));

// Socket.io logic
io.on("connection", (socket) => {
  // Send all current users' locations to the new client
  socket.emit("all-users", users);

  socket.on("send-location", (data) => {
    users[socket.id] = {
      username: data.username,
      latitude: data.latitude,
      longitude: data.longitude,
      avatar: data.avatar,
    };
    io.emit("recieve-location", { id: socket.id, ...data });
    io.emit("user-list", users);
  });

  socket.on("chat-message", (data) => {
    io.emit("chat-message", data);
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("user-disconnected", socket.id);
    io.emit("user-list", users);
  });

  console.log("New client connected:", socket.id);
});

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/auth/github");
}

// Routes
app.get("/", ensureAuthenticated, (req, res) => {
  res.render("index", { user: req.user });
});

// GitHub OAuth login
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

// GitHub OAuth callback
app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

// Logout
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// ✅ PORT handling for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
