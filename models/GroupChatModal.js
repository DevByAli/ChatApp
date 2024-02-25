const mongoose = require("mongoose");

const GroupChatSchema = mongoose.Schema(
  {
    senderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GroupChat", GroupChatSchema);
