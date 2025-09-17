const express = require('express');
const app = express();
const http = require("http");
const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server);
const path = require("path");
const { disconnect } = require('process');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy; // Removed GoogleStrategy

const users = {}; // { socketId: { username, latitude, longitude, avatar } }
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname,"public")));

// Session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

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
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
}, (accessToken, refreshToken, profile, done) => {
    return done(null, {
        id: profile.id,
        displayName: profile.displayName || profile.username,
        avatar: profile.photos[0] ? profile.photos[0].value : '',
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : ''
    });
}));

io.on("connection", function(socket){
    // Send all current users' locations to the new client
    socket.emit("all-users", users);

    socket.on("send-location", function(data){
        users[socket.id] = { username: data.username, latitude: data.latitude, longitude: data.longitude, avatar: data.avatar };
        io.emit("recieve-location", {id:socket.id, ...data});
        io.emit("user-list", users);
    });

    socket.on("chat-message", (data) => {
        io.emit("chat-message", data);
    });

    socket.on("disconnect", function(){
        delete users[socket.id];
        io.emit("user-disconnected", socket.id);
        io.emit("user-list", users);
    });
    console.log("connected");
});

// Update ensureAuthenticated redirect
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/github');
}

app.get("/", ensureAuthenticated, function(req, res){
    res.render("index", { user: req.user });
});

// GitHub OAuth login
app.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
);

// GitHub OAuth callback
app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/');
    }
);

// Logout
app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

server.listen(3000);