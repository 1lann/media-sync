var colorPool = ["#ecc132", "#ed5548", "#1abc9c", "#ad4ede"];
var colorPoolIndex = 0;
var systemColor = "#555555";
var meColor = "#3498db";

var userColors = {};
var myUsername;
var lastUser;
var lastDiv;

var sanatize = function(text) {
    return text.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

var getUserColor = function(user) {
    if (user == "System") {
        return systemColor;
    } else if (user == myUsername) {
        return meColor;
    }
    if (!userColors[user]) {
        userColors[user] = colorPool[colorPoolIndex%colorPool.length];
        colorPoolIndex++;
    }
    return userColors[user];
}

var isAtBottom = function() {
    var messageArea = $("#chat-area #message-area");
    if (messageArea.scrollTop() >= messageArea[0].scrollHeight-messageArea.height()-20) {
        return true;
    } else {
        return false;
    }
}

var displayMessage = function(message, user) {
    var messageArea = $("#chat-area #message-area");
    var isBottom = isAtBottom();
    
    if (user == "System") {
        var userColor = getUserColor(user);
        messageArea.append("<span class='username' style='color: " + userColor + ";'>" + message + "</span>")
        lastDiv = null;
        lastUser = null;
    } else if (lastUser == user) {
        lastDiv.append("<span>" + Autolinker.link(sanatize(message)) + "</span><br>")
    } else {
        var userColor = getUserColor(user);
        messageArea.append("<span class='username' style='color: " + userColor + ";'>" + user + "</span>")
        lastDiv = $("<div class='message'></div>");
        lastUser = user;
        messageArea.append(lastDiv);
        lastDiv.css("borderColor", userColor);
        lastDiv.append("<span>" + Autolinker.link(sanatize(message)) + "</span><br>")
    }
    
    if (isBottom) {
        messageArea.scrollTop(messageArea[0].scrollHeight);
    }
}

var slideDown = false;

$("#chat-area #connected-list-area button").click(function() {
    if (slideDown) {
        $("#chat-area #connected-list-area #connected-list").hide();
        $("#chat-area #connected-list-area button").removeClass("active");
        $("#chat-area #connected-list-area button").blur();
    } else {
        $("#chat-area #connected-list-area button").addClass("active");
        var list = $("#chat-area #connected-list-area #connected-list ul");
        list.html("");
        list.append("<li style='color: " + getUserColor(myUsername) + ";'>" + myUsername + " (You)</li>")
        for (var key in nicknames) {
            list.append("<li style='color: " + getUserColor(nicknames[key]) + ";'>" + nicknames[key] + "</li>");
        }
        $("#chat-area #connected-list-area #connected-list").show();
    }
    
    slideDown = !slideDown;
});

var startChat = function(username) {
    var onlineBadge = $("#chat-area #connected-list-area button .badge");
    
    disconnectedFromNetwork = function() {
        displayMessage("Connection lost!", "System");
        $("#chat-area #input-box input").attr("disabled", true);
        $("#chat-area #input-box input").val("- Disconnected -")
    }
    
    reconnectedToNetwork = function() {
        displayMessage("Re-connected!", "System");
        $("#chat-area #input-box input").attr("disabled", false);
        $("#chat-area #input-box input").val("");
    }
    
    peerConnected = function(peerName) {
        var name = getUsername(peerName);
        displayMessage(name + " has joined the room!", "System");
        onlineBadge.text((1 + Object.keys(nicknames).length).toString())
    }
    
    peerDisconnected = function(peerName, name) {
        displayMessage(name + " has left the room!", "System");
        onlineBadge.text((1 + Object.keys(nicknames).length).toString())
    }
    
    onMessageType("chat-message", function(peerName, message) {
        if (typeof(message) == "string") {
            displayMessage(message, getUsername(peerName));
        }
    });
    
    myUsername = username;
    $("#chat-area #input-box input").on("keyup", function(e) {
        if (e.which == 13 && $(this).val().trim().length > 0) {
            displayMessage($(this).val(), myUsername);
            broadcastData("chat-message", $(this).val());
            $(this).val("");
        }
    });
    
    displayMessage(username + " has joined the room!", "System");
    
    onlineBadge.text((1 + Object.keys(nicknames).length).toString());
    setInterval(function() {
        onlineBadge.text((1 + Object.keys(nicknames).length).toString());
    }, 1000);
    
}
