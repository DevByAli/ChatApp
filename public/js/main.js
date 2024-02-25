(function ($) {
  "use strict";

  var fullHeight = function () {
    $(".js-fullheight").css("height", $(window).height());
    $(window).resize(function () {
      $(".js-fullheight").css("height", $(window).height());
    });
  };
  fullHeight();

  $("#sidebarCollapse").on("click", function () {
    $("#sidebar").toggleClass("active");
  });
})(jQuery);

//**********************
// Script of the ChatApp
//**********************

function getCookie(name) {
  let matches = document.cookie.match(
    new RegExp(
      "(?:^|; )" +
        name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
        "=([^;]*)"
    )
  );
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

const userData = JSON.parse(getCookie("user"));

var senderID = userData._id;
var receiverID;
var globalGroupID;

// same namespace that is used on the backend, the front end made
// connection with the backend. Token is required at the backend to
// determine which user is become online.
// and when use ReactJs then send the token in place of senderID
var socket = io("/user-namespace", {
  auth: {
    token: senderID,
  },
});

$(document).ready(function () {
  $(".user-list").click(function () {
    receiverID = $(this).attr("data-id");
    $(".start-head").hide();
    $(".chat-section").show();

    socket.emit("loadOldChats", {
      senderID: senderID,
      receiverID: receiverID,
    });
  });
});

// Save chat of user
$("#chat-form").submit((event) => {
  event.preventDefault();
  const message = $("#message").val();
  $.ajax({
    url: "/save-chat",
    type: "post",
    data: { senderID: senderID, receiverID: receiverID, message: message },
    success: (response) => {
      if (!response.success) {
        alert(response.msg);
      } else {
        $("#message").val("");
        const chat = response.data.message;
        const html =
          `<div class='current-user-chat' id= '` +
          response.data["_id"] +
          `'><h5><span>` +
          chat +
          `</span>
            <i class="fa fa-trash" aria-hidden="true" data-id='` +
          response.data["_id"] +
          `'data-toggle="modal" data-target="#deleteChatModal"></i>

            <i class="fa fa-edit" aria-hidden="true" data-id='` +
          response.data["_id"] +
          `'data-msg='` +
          chat +
          `' data-toggle="modal" data-target="#editChatModal"></i>
            </h5></div>`;

        // Append the chat message to the chat container
        $("#chat-container").append(html);
        scrollChat();

        // broadcast the new message which we send to the receiver
        socket.emit("newChatMessage", response.data);
      }
    },
  });
});

socket.on("loadNewChatMessage", (data) => {
  if (senderID === data.receiverID && receiverID === data.senderID) {
    const html =
      `<div class='distance-user-chat' id='` +
      data["_id"] +
      `''><h5> ` +
      data.message +
      `</h5></div>`;

    // Append the chat message to the chat container
    $("#chat-container").append(html);
    scrollChat();
  }
});

// loadOldChats
socket.on("loadedOldChat", (data) => {
  // clear chats from the container of current user
  $("#chat-container").html("");

  // Now we click on new user. So we not load his/her chat
  const newUserOldChats = data.chat;

  let html = "";

  for (let x = 0; x < newUserOldChats.length; ++x) {
    let addClass = "";
    if (newUserOldChats[x]["senderID"] === senderID) {
      addClass = "current-user-chat";
    } else {
      addClass = "distance-user-chat";
    }

    html +=
      `
        <div class= '` +
      addClass +
      `' id= '` +
      newUserOldChats[x]["_id"] +
      `'>
          <h5><span>` +
      newUserOldChats[x]["message"] +
      "</span>";

    if (newUserOldChats[x]["senderID"] === senderID) {
      html +=
        `<i class="fa fa-trash" aria-hidden="true" data-id='` +
        newUserOldChats[x]["_id"] +
        `'
          data-toggle="modal" data-target="#deleteChatModal"></i>

          <i class="fa fa-edit" aria-hidden="true" data-id='` +
        newUserOldChats[x]["_id"] +
        `'data-msg='` +
        newUserOldChats[x]["message"] +
        `' data-toggle="modal" data-target="#editChatModal"></i>
          `;
    }
    html += `
        </h5>
        </div>
      `;
  }
  $("#chat-container").append(html);
  scrollChat();
});

// update online status of the user
socket.on("getOnlineUser", function (data) {
  $("#" + data.userID + "-status").text("Online");
  $("#" + data.userID + "-status")
    .removeClass("offline-status")
    .addClass("online-status");
});

// update offline status of the user
socket.on("getOfflineUser", function (data) {
  $("#" + data.userID + "-status").text("Offline");
  $("#" + data.userID + "-status")
    .removeClass("online-status")
    .addClass("offline-status");
});

function scrollChat() {
  $("#chat-container").animate(
    {
      scrollTop:
        $("#chat-container").offset().top +
        $("#chat-container")[0].scrollHeight,
    },
    0
  );
}

// Delete chat
$(document).on("click", ".fa-trash", function () {
  const msg = $(this).parent().text();
  $("#delete-message").text(msg);
  $("#delete-message-id").val($(this).attr("data-id"));
});

$("#delete-chat-form").submit(function (event) {
  event.preventDefault();

  const messageID = $("#delete-message-id").val();
  $.ajax({
    url: "/delete-chat",
    type: "post",
    data: { messageID: messageID },
    success: function (response) {
      if (response.success) {
        $("#" + messageID).remove();
        $("#deleteChatModal").modal("hide");

        socket.emit("chatDelete", messageID);
      } else {
        alert(response.msg);
      }
    },
  });
});

socket.on("chatMessageDeleted", function (messageID) {
  $("#" + messageID).remove();
});

// Update chat functionality
$(document).on("click", ".fa-edit", function () {
  $("#edit-message-id").val($(this).attr("data-id"));
  $("#update-message").val($(this).attr("data-msg"));
});

$("#update-chat-form").submit(function (event) {
  event.preventDefault();

  const messageID = $("#edit-message-id").val();
  const msg = $("#update-message").val();
  $.ajax({
    url: "/update-chat",
    type: "post",
    data: { message: msg, messageID: messageID },
    success: function (response) {
      if (response.success) {
        $("#editChatModal").modal("hide");
        $("#" + messageID)
          .find("span")
          .text(msg);
        $("#" + messageID)
          .find(".fa-edit")
          .attr("data-msg", msg);
        socket.emit("chatUpdated", { messageID: messageID, message: msg });
      } else {
        alert(response.msg);
      }
    },
  });
});

socket.on("chatMessageUpdated", function (data) {
  $("#" + data.messageID)
    .find("span")
    .text(data.message);
});

// Add member js
$(".addMember").click(function () {
  const id = $(this).attr("data-id");
  const limit = $(this).attr("data-limit");

  $("#groupID").val(id);
  $("#limit").val(limit);

  $.ajax({
    url: "/get-members",
    type: "post",
    data: { groupID: id },
    success: function (response) {
      if (response.success) {
        const users = response.data;
        let html = "";

        for (let i = 0; i < users.length; ++i) {
          const isMemberOfGroup = users[i]["member"].length > 0 ? true : false;

          html +=
            `
            <tr>
              <td>
                <input type="checkbox" ${
                  isMemberOfGroup ? "checked" : ""
                } name="members[]" value="` +
            users[i]["_id"] +
            `" />
              </td>
              <td>` +
            users[i]["name"] +
            `</td>
            </tr>
          `;
        }
        $(".addMembersInTable").html(html);
      } else {
        alert(response.msg);
      }
    },
  });
});

// Add member form submit code

$("#add-member-form").submit(function (event) {
  event.preventDefault();

  const formData = $(this).serialize();

  $.ajax({
    url: "/add-members",
    type: "post",
    data: formData,
    success: function (response) {
      if (response.success) {
        alert(response.msg);
        $("#memberModal").modal("hide");
        $("#add-member-form")[0].reset();
      } else {
        $("#add-member-error").text(response.msg);
        setTimeout(() => {
          $("#add-member-error").text("");
        }, 3000);
      }
    },
  });
});

// update group code
$(".updateGroup").click(function () {
  const obj = JSON.parse($(this).attr("data-obj"));
  console.log(obj);
  $("#updateGroupID").val(obj._id);
  $("#lastLimit").val(obj.limit);
  $("#updateGroupName").val(obj.name);
  $("#groupLimit").val(obj.limit);

  $("#updateChatGroupForm").submit(function (event) {
    event.preventDefault();

    $.ajax({
      url: "/update-group",
      type: "post",
      data: new FormData(this),
      contentType: false,
      cache: false,
      processData: false,
      success: function (response) {
        if (response.success) {
          location.reload();
        } else {
          alert(response.msg);
        }
      },
    });
  });
});

// Delete group
$(".deleteGroup").click(function () {
  $("#deleteGroupID").val($(this).attr("data-id"));
  $("#deleteGroupName").text($(this).attr("data-name"));
});
$("#deleteChatGroupForm").submit(function (event) {
  event.preventDefault();

  const formData = $(this).serialize();

  $.ajax({
    url: "/delete-group",
    type: "post",
    data: formData,
    success: function (response) {
      if (response.success) {
        location.reload();
      }
      alert(response.msg);
    },
  });
});

// Copy shareable link
$(".copy").click(function () {
  $(this).prepend('<span class="copiedText">&#10004;</span>');
  const groupID = $(this).attr("data-id");
  const url = window.location.host + "/share-group/" + groupID;

  const temp = $(`<input />`);
  $("body").append(temp);
  temp.val(url).select();
  document.execCommand("copy");
  temp.remove();

  setTimeout(() => {
    $(".copiedText").remove();
  }, 2000);
});

// Join the group
$(".joinNow").click(function () {
  $(this).text("Joining...");
  $(this).attr("disabled", "disabled");
  const groupID = $(this).attr("data-id");

  $.ajax({
    url: "/join-group",
    type: "post",
    data: { groupID: groupID },
    success: function (response) {
      alert(response.msg);
      if (response.success) {
        location.reload();
      } else {
        $(this).text("Join Now");
        $(this).removeAttr("disabled");
      }
    },
  });
});

//  Group chatting script
$(document).ready(function () {
  $(".group-list").click(function () {
    $(".group-start-head").hide();
    $(".group-chat-section").show();

    const groupName = $(this).attr("data-name");
    $("#group-name").text(groupName);

    globalGroupID = $(this).attr("data-id");
    $("#group-chat-container").html("");
    loadGroupChart();
  });
});

function scrollGroupChat() {
  $("#group-chat-container").animate(
    {
      scrollTop:
        $("#group-chat-container").offset().top +
        $("#group-chat-container")[0].scrollHeight,
    },
    0
  );
}

// Save chat of group user
$("#group-chat-form").submit((event) => {
  event.preventDefault();
  const message = $("#group-message").val();

  $.ajax({
    url: "/group-chat-save",
    type: "post",
    data: { senderID: senderID, groupID: globalGroupID, message: message },
    success: (response) => {
      if (response.success) {
        $("#group-message").val("");
        const message = response.chat.message;

        let html =
          `
          <div class="current-user-chat" id='` +
          response.chat._id +
          `'>
            <h5>
              <span> ` +
          message +
          `</span>
            <i class="fa fa-trash deleteGroupChat" aria-hidden="true" data-id='` +
          response.chat["_id"] +
          `'data-toggle="modal" data-target="#deleteGroupChatModal"></i>

           <i class="fa fa-edit editGroupChat" aria-hidden="true" data-id='` +
          response.chat["_id"] +
          `'data-msg='` +
          message +
          `' data-toggle="modal" data-target="#editGroupChatModal"></i>
            
            </h5>`;

        const date = new Date(response.chat["createdAt"]);
        const cDate = date.getDate();
        const cMonth =
          date.getMonth() + 1 > 9
            ? date.getMonth() + 1
            : `0` + (date.getMonth() + 1);
        const cYear = date.getFullYear();
        const fullDate = cDate + "-" + cMonth + "-" + cYear;

        html +=
          `
            <div class="userData">
                <b>Me </b>` +
          fullDate +
          `
              </div>
          </div>
        `;
        $("#group-chat-container").append(html);
        socket.emit("newGroupChat", response.chat);

        scrollGroupChat();
      } else {
        alert(response.msg);
      }
    },
  });
});

socket.on("loadNewGroupChat", function (data) {
  if (globalGroupID == data.groupID) {
    let html =
      `
      <div class="distance-user-chat" id='` +
      data._id +
      `'>
            <h5>
              <span> ` +
      data.message +
      `</span>
            </h5>`;

    const date = new Date(data["createdAt"]);
    const cDate = date.getDate();
    const cMonth =
      date.getMonth() + 1 > 9
        ? date.getMonth() + 1
        : `0` + (date.getMonth() + 1);
    const cYear = date.getFullYear();
    const fullDate = cDate + "-" + cMonth + "-" + cYear;

    html +=
      `
      <div class="userData">
        <img src='` +
      data["senderID"].image +
      `' class="group-chat-user-image"/>
                <b>` +
      data["senderID"].name +
      ` </b>` +
      fullDate +
      `</div>`;

    html += `
          </div>
    `;
    $("#group-chat-container").append(html);
    scrollGroupChat();
  }
});

function loadGroupChart() {
  $.ajax({
    url: "/load-group-chats",
    type: "post",
    data: { groupID: globalGroupID },
    success: function (response) {
      if (response.success) {
        const chats = response.chats;
        let html = "";
        console.log(response);

        for (let i = 0; i < chats.length; ++i) {
          let className = "distance-user-chat";
          if (chats[i]["senderID"]._id == senderID) {
            className = "current-user-chat";
          }
          html +=
            `
            <div class='` +
            className +
            ` mb-5' id='` +
            chats[i]["_id"] +
            `'>
              <h5>
                <span>` +
            chats[i]["message"] +
            `</span>`;

          if (chats[i]["senderID"]._id == senderID) {
            html +=
              `
                <i class="fa fa-trash deleteGroupChat" aria-hidden="true" data-id='` +
              chats[i]["_id"] +
              `'data-toggle="modal" data-target="#deleteGroupChatModal"></i>
            
               <i class="fa fa-edit editGroupChat" aria-hidden="true" data-id='` +
              chats[i]["_id"] +
              `'data-msg='` +
              chats[i]["message"] +
              `' data-toggle="modal" data-target="#editGroupChatModal"></i>   
              `;
          }
          html += `
              </h5>`;

          const date = new Date(chats[i]["createdAt"]);
          const cDate = date.getDate();
          const cMonth =
            date.getMonth() + 1 > 9
              ? date.getMonth() + 1
              : `0` + (date.getMonth() + 1);
          const cYear = date.getFullYear();
          const fullDate = cDate + "-" + cMonth + "-" + cYear;

          if (chats[i]["senderID"]._id == senderID) {
            html +=
              `
              <div class="userData">
                <b>Me </b>` +
              fullDate +
              `
              </div>
            `;
          } else {
            html +=
              `
              <div class="userData">
              <img src='` +
              chats[i]["senderID"].image +
              `' class="group-chat-user-image"/>
                <b>` +
              chats[i]["senderID"].name +
              ` </b>` +
              fullDate +
              `
              </div>
            `;
          }

          html += `
            </div>
            `;
        }
        $("#group-chat-container").append(html);
        scrollGroupChat();
      } else {
        alert(response.msg);
      }
    },
  });
}

// Delete group msg
$(document).on("click", ".deleteGroupChat", function () {
  const msg = $(this).parent().find("span").text();
  $("#delete-group-message").text(msg);
  $("#delete-group-message-id").val($(this).attr("data-id"));
});

$("#delete-group-chat-form").submit(function (event) {
  event.preventDefault();

  const id = $("#delete-group-message-id").val();

  $.ajax({
    url: "/delete-group-chat",
    type: "post",
    data: { id: id },
    success: function (response) {
      if (response.success) {
        $("#" + id).remove();
        $("#deleteGroupChatModal").modal("hide");
        socket.emit("groupChatDeleted", id);
      } else {
        alert(response.msg);
      }
    },
  });
});

// Listen group chat id that is deleted
socket.on("groupChatMessageDeleted", function (id) {
  $("#" + id).remove();
});

// Update Group chat message
$(document).on("click", ".editGroupChat", function () {
  $("#edit-group-message-id").val($(this).attr("data-id"));
  $("#update-group-message").val($(this).attr("data-msg"));
});

$("#update-group-chat-form").submit(function (event) {
  event.preventDefault();

  const id = $("#edit-group-message-id").val();
  const msg = $("#update-group-message").val();

  $.ajax({
    url: "/update-group-chat",
    type: "post",
    data: { id: id, message: msg },
    success: function (response) {
      if (response.success) {
        $("#editGroupChatModal").modal("hide");
        $("#" + id)
          .find("span")
          .text(msg);
        $("#" + id)
          .find(".editGroupChat")
          .attr("data-msg", msg);

        socket.emit("groupChatUpdated", { id: id, message: msg });
      } else {
        alert(response.msg);
      }
    },
  });
});

// UPdate the message of other user of the group
socket.on("groupChatMessageUpdated", function (data) {
  $("#" + data.id)
    .find("span")
    .text(data.message);
});
