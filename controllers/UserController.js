const User = require("../models/UserModel");
const Chat = require("../models/ChatModel");
const Group = require("../models/GroupModel");
const Member = require("../models/MemberModal");
const GroupChat = require("../models/GroupChatModal");
const bcrypt = require("bcrypt");
const { default: mongoose } = require("mongoose");

const registerLoad = async (req, res) => {
  try {
    res.render("register");
  } catch (error) {
    console.log(error.message);
  }
};

const register = async (req, res) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      image: "images/" + req.file.filename,
      password: passwordHash,
    });

    await user.save();

    res.render("register", {
      message: "Your registeration has been completed!",
    });
  } catch (error) {}
};

const loadLogin = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });
    if (user) {
      const isMatched = await bcrypt.compare(password, user.password);

      if (isMatched) {
        // Delete the password property from the user object
        delete user.password;

        req.session.user = user;

        // Serialize the user object without the password property
        const userWithoutPassword = JSON.parse(JSON.stringify(user));
        delete userWithoutPassword.password;

        // Set the cookie with the serialized user object
        res.cookie("user", JSON.stringify(userWithoutPassword));

        res.redirect("/dashboard");
      } else {
        res.render("login", { message: "Email and Password is incorrect." });
      }
    } else {
      res.render("login", { message: "Email and password is incorrect!" });
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.clearCookie("user");
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.session.user._id } });
    res.render("dashboard", { user: req.session.user, users: users });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const saveChat = async (req, res) => {
  try {
    const { senderID, receiverID, message } = req.body;

    const chat = new Chat({
      senderID: senderID,
      receiverID: receiverID,
      message: message,
    });
    const newChat = await chat.save();
    res.status(200).send({ success: true, msg: "Chat saved.", data: newChat });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const deleteChat = async (req, res) => {
  try {
    await Chat.deleteOne({ _id: req.body.messageID });
    res.status(200).send({ success: true, msg: "Message Delete." });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const updateChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(
      { _id: req.body.messageID },
      {
        $set: {
          message: req.body.message,
        },
      }
    );
    res.status(200).send({ success: true, msg: "Message Delete." });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const loadGroups = async (req, res) => {
  try {
    const groups = await Group.find({ createrID: req.session.user._id });
    res.status(200).render("group", { groups: groups });
  } catch (error) {
    res.status(400).send();
  }
};

const createGroup = async (req, res) => {
  try {
    const newGroup = new Group({
      createrID: req.session.user._id,
      name: req.body.name,
      image: "images/" + req.file.filename,
      limit: req.body.limit,
    });
    await newGroup.save();
    const groups = await Group.find({ createrID: req.session.user._id });

    res.status(200).render("group", {
      message: req.body.name + " Group Created.",
      groups: groups,
    });
  } catch (error) {
    res.status(400).render("group", { error: "Something went wrong!" });
  }
};

const getMembers = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "members",
          localField: "_id",
          foreignField: "userID",
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$groupID",
                        new mongoose.Types.ObjectId(req.body.groupID),
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "member",
        },
      },
      {
        $match: {
          _id: {
            $nin: [new mongoose.Types.ObjectId(req.session.user._id)],
          },
        },
      },
    ]);
    res.status(200).send({ success: true, data: users });
  } catch (error) {
    res.status(200).send({ success: false, msg: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { members, limit, groupID } = req.body;

    if (!req.body.members) {
      return res
        .status(200)
        .send({ success: false, msg: "Please select at least 1 member." });
    } else if (members.length > parseInt(limit)) {
      return res.status(200).send({
        success: false,
        msg: `You can't select more than ${limit} members.`,
      });
    } else {
      await Member.deleteMany({ groupID: groupID });

      const data = [];

      for (let i = 0; i < members.length; ++i) {
        data.push({
          groupID: groupID,
          userID: members[i],
        });
      }
      await Member.insertMany(data);

      return res
        .status(200)
        .send({ success: true, msg: "Members are added successfully." });
    }
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    if (parseInt(req.body.limit) < parseInt(req.body.lastLimit)) {
      await Member.deleteMany({ groupID: req.body.id });
    }

    const updateObj = {
      name: req.body.name,
      limit: req.body.limit,
    };

    if (req.file !== undefined) {
      updateObj.image = "images/" + req.file.filename;
    }

    await Group.findByIdAndUpdate(
      { _id: req.body.id },
      {
        $set: updateObj,
      }
    );
    res.status(200).send({ success: true, msg: "Chat group updated." });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    await Group.deleteOne({ _id: req.body.id });
    await Member.deleteMany({ groupID: req.body.id });

    res.status(200).send({ success: true, msg: "Chat group deleted." });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const shareGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id });
    if (!group) {
      res.status(400).render("error", { message: "404 not found" });
    } else if (req.session.user == undefined) {
      res.status(400).render("error", {
        message: "You have to login to access the share URL.",
      });
    } else {
      // Not check either the group has space to add member
      const totalMembers = await Member.countDocuments({
        groupID: req.params.id,
      });
      const availableSpaceInGroup = group.limit - totalMembers;

      const isOwner = group.createrID == req.session.user._id ? true : false;
      const isJoined = await Member.countDocuments({
        groupID: req.params.id,
        userID: req.session.user._id,
      });

      res.render("shareLink", {
        group: group,
        availableSpaceInGroup: availableSpaceInGroup,
        totalMembers: totalMembers,
        isOwner: isOwner,
        isJoined: isJoined,
      });
    }
  } catch (error) {
    res.status(400).render("error", { message: "404 not found" });
  }
};

const joinGroup = async (req, res) => {
  try {
    const member = new Member({
      groupID: new mongoose.Types.ObjectId(req.body.groupID),
      userID: req.session.user._id,
    });
    const isadd = await member.save();
    res
      .status(200)
      .send({ success: true, msg: "Congratulations! group joinded." });
  } catch (error) {
    res.status(200).send({ success: false, msg: error.message });
  }
};

const groupChats = async (req, res) => {
  try {
    const myGroups = await Group.find({ createrID: req.session.user._id });
    const myJoinedGroups = await Member.find({
      userID: req.session.user._id,
    }).populate("groupID");
    res.render("chatGroup", {
      myGroups: myGroups,
      myJoinedGroups: myJoinedGroups,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const saveGroupChat = async (req, res) => {
  try {
    const chat = new GroupChat({
      senderID: req.body.senderID,
      groupID: req.body.groupID,
      message: req.body.message,
    });
    const saveChat = await chat.save();

    const newChat = await GroupChat.findOne({ _id: saveChat._id }).populate(
      "senderID"
    );

    res.status(200).send({ success: true, chat: newChat });
  } catch (error) {
    res.status(200).send({ success: true, msg: error.message });
  }
};

const loadGroupChat = async (req, res) => {
  try {
    const groupChats = await GroupChat.find({
      groupID: req.body.groupID,
    }).populate("senderID");
    res.status(200).send({ success: true, chats: groupChats });
  } catch (error) {
    res.status(200).send({ success: true, msg: error.message });
  }
};

const deleteGroupChat = async (req, res) => {
  try {
    await GroupChat.deleteOne({ _id: req.body.id });
    res.status(200).send({ success: true, msg: "Message Deleted." });
  } catch (error) {
    res.status(200).send({ success: false, msg: error.message });
  }
};

const updateGroupChat = async (req, res) => {
  try {
    await GroupChat.findByIdAndUpdate(
      { _id: req.body.id },
      {
        $set: {
          message: req.body.message,
        },
      }
    );
    res.status(200).send({ success: true, msg: "Chat Updated." });
  } catch (error) {
    res.status(200).send({ success: false, msg: error.message });
  }
};

module.exports = {
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
};
