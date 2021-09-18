import express from "express";
import * as socketio from "socket.io";
import http from "http";
import cors from "cors";
import router from "./router.js";
import { addUser, removeUser, getUser, getUsersInRoom } from "./users.js";

const PORT = process.env.PORT || 5000;
const app = express(); //initialize express
const server = http.createServer(app); //intialize server
const io = new socketio.Server(server, {
  cors: {
    origin: "*",
  }, //to get rid from CORS error
}); //instance of server

app.use(router);
app.use(cors());

//socket code for user conncetion and disconnection (socket.io documentation)
io.on("connection", (socket) => {
  //here socket is going to be connected as a client side socket
  //custom join event functionality
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);
    socket.join(user.room); //joins user in a room

    //system generated/admin msgs on user join/left etc.
    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to the room ${user.room}`,
    }); //welcome msg for any user
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` }); //let everybody know who is joined except that user itselt

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    }); // get all users inside room

    callback();
  });

  //Events for user generated msgs
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("message", { user: user.name, text: message });
    callback();
  });

  //disconnect function
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left!`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => console.log(`Server is up and running on ${PORT}`));
