const express = require('express');
const app = express();
const http = require("http");
const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server);
const path = require("path");
const { disconnect } = require('process');
const users = {};
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname,"public")));

io.on("connection", function(socket){
    socket.on("send-location", function(data){
        users[socket.id] = { username: data.username };
        io.emit("recieve-location", {id:socket.id, ...data});
        io.emit("user-list", users); // broadcast user list
    });

    socket.on("disconnect", function(){
        delete users[socket.id];
        io.emit("user-disconnected", socket.id);
        io.emit("user-list", users); // update user list
    });
    console.log("connected");
});

app.get("/", function(req,res){
    res.render("index");
});

server.listen(3000);