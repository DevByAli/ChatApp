const bodyParser = require("body-parser");
require("dotenv").config();
const socket = require("socket.io");
const http = require("http");
const express = require("express");

const User = require("./models/UserModel");
const Chat = require("./models/ChatModel");
const connectDB = require("./db/connect");
const userRoute = require("./router/UserRoute");

// Express
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routing
app.use("/", userRoute);

const server = http.Server(app);

//*********************************************
//***********Socket Wroking********************
//*********************************************

const io = socket(server);

var userNameSpace = io.of("/user-namespace");

userNameSpace.on("connection", async function (userSocket) {
  // this function run when user become online
  console.log("User connected");

  // update the status of user is_online = '1'
  const userID = userSocket.handshake.auth.token;

  // Udpate status in database
  await User.findByIdAndUpdate({ _id: userID }, { $set: { is_online: "1" } });

  // Broadcast online status to all the user. Actually raise an event here
  userSocket.broadcast.emit("getOnlineUser", { userID: userID });

  // This function run when the user is become offile
  userSocket.on("disconnect", async function () {
    // update the status of user is_onlien = '0'
    await User.findByIdAndUpdate({ _id: userID }, { $set: { is_online: "0" } });

    // broadcast the offline status to all users
    userSocket.broadcast.emit("getOfflineUser", { userID: userID });

    console.log("User disconnected");
  });

  // chatting implementation.
  // "newChatMessage" is the name of the event which we use on the front-end
  // so we use same name here. Name you can choose whatever you want.
  // Note: 'senderMessage' is the message that we send to the distance user
  // Now at the server this message is received and send it to the receiver
  userSocket.on("newChatMessage", (senderMessage) => {
    userSocket.broadcast.emit("loadNewChatMessage", senderMessage);
  });

  // Load Old Chats
  userSocket.on("loadOldChats", async (data) => {
    const oldChat = await Chat.find({
      $or: [
        {
          senderID: data.senderID,
          receiverID: data.receiverID,
        },
        {
          senderID: data.receiverID,
          receiverID: data.senderID,
        },
      ],
    });
    userSocket.emit("loadedOldChat", { chat: oldChat });
  });

  // delete chat
  userSocket.on("chatDelete", function (messageID) {
    userSocket.broadcast.emit("chatMessageDeleted", messageID);
  });

  // update chat
  userSocket.on("chatUpdated", function (data) {
    userSocket.broadcast.emit("chatMessageUpdated", data);
  });

  // New Group chat message broadcast to other group members
  userSocket.on("newGroupChat", function (data) {
    console.log(data);
    userSocket.broadcast.emit("loadNewGroupChat", data);
  });

  // Delete the group chat from the other users
  userSocket.on("groupChatDeleted", function (data) {
    userSocket.broadcast.emit("groupChatMessageDeleted", data);
  });

  // Update froup chat message
  userSocket.on("groupChatUpdated", function (data) {
    userSocket.broadcast.emit("groupChatMessageUpdated", data);
  });
});
//*********************************************/

server.listen(50001, () => {
  connectDB();
  console.log("server is listening");
});
