var loginInterval;

var usernameError = function(error) {
    clearInterval(loginInterval);
    $("#username-field button").attr("disabled", false);
    $("#username-field button").text("Connect");
    $("#username-field input").attr("data-content", error);
    $("#username-field input").attr("disabled", false);
    $("#username-field input").popover("show");
}

fatalError = usernameError;

$("#username-field button").click(function(e) {
    $("#username-field input").popover("destroy");
    var usernameField = $("#username-field input");
    if (containsSymbols(usernameField.val())) {
        usernameError("Username contains forbidden symbols!");
        return;
    }
    connect(usernameField.val(),function() {
        // Succesfully connected!
        $("#login-area").fadeOut(500);
        setTimeout(function() {
            $("#interaction-area").fadeIn(500);
            runEverything(usernameField.val());
        },500);
    });
    $("#username-field input").attr("disabled", true);
    $(this).attr("disabled", true);
    $(this).text("Connecting...")
});

$("#username-field input").on("keyup", function(e) {
    if ($(this).val().length > 4 && $(this).val().length < 21) {
        $("#username-field button").attr("disabled", false);
        if (e.which == 13) {
            $("#username-field button").click();
        }
    } else {
        $("#username-field button").attr("disabled", true);
    }
});

var startLoginCountdown = function() {
    var timer = 7;
    loginInterval = setInterval(function() {
        $("#username-field button").text("Connecting ("+timer+")");
        timer--;
        if (timer <= 0) {
            clearInterval(loginInterval);
        }
    }, 1000)
}