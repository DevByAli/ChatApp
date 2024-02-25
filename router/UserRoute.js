const express = require("express");
const multer = require("multer");
const path = require("path");
const userRoute = express();
const session = require("express-session");
const cookieParser = require("cookie-parser");

const { isLogin, isLogout } = require("../middlewares/auth");
const {
  register,
  registerLoad,
  loadLogin,
  login,
  logout,
  loadDashboard,
  saveChat,
  deleteChat,
  updateChat,
  loadGroups,
  createGroup,
  getMembers,
  addMember,
  updateGroup,
  deleteGroup,
  shareGroup,
  joinGroup,
  groupChats,
  saveGroupChat,
  loadGroupChat,
  deleteGroupChat,
  updateGroupChat,
} = require("../controllers/UserController");

userRoute.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Use the cookie parser
userRoute.use(cookieParser());

userRoute.set("view engine", "ejs");
userRoute.set("views", "./views");

// *****************************************
// Store the Image file (e.g; Profile image)
// *****************************************
userRoute.use(express.static("public"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/images"));
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  },
});

const upload = multer({
  storage: storage,
});

/************End File Upload**************/

userRoute.get("/register", isLogout, registerLoad);
userRoute.post("/register", upload.single("image"), register);

userRoute.get("/", isLogout, loadLogin);
userRoute.post("/", isLogout, login);
userRoute.get("/logout", isLogin, logout);

userRoute.get("/dashboard", isLogin, loadDashboard);

userRoute.post("/save-chat", saveChat);
userRoute.post("/delete-chat", deleteChat);
userRoute.post("/update-chat", updateChat);

userRoute.get("/groups", isLogin, loadGroups);
userRoute.post("/groups", upload.single("image"), isLogin, createGroup);

userRoute.post("/get-members", isLogin, getMembers);
userRoute.post("/add-members", isLogin, addMember);

userRoute.post("/update-group", upload.single("image"), isLogin, updateGroup);
userRoute.post("/delete-group", isLogin, deleteGroup);

userRoute.get("/share-group/:id", shareGroup);
userRoute.post("/join-group", joinGroup);

userRoute.get("/group-chat", isLogin, groupChats);
userRoute.post("/group-chat-save", isLogin, saveGroupChat);
userRoute.post("/load-group-chats", isLogin, loadGroupChat);
userRoute.post("/delete-group-chat", isLogin, deleteGroupChat);
userRoute.post("/update-group-chat", isLogin, updateGroupChat);

userRoute.get("*", (_, res) => res.redirect("/"));

module.exports = userRoute;
