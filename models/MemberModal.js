const mongoose = require("mongoose");

const MemberSchema = mongoose.Schema(
  {
    groupID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Member", MemberSchema);
