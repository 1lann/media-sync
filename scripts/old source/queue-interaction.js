var queueButton = $(contentSelectorStr+"#queue-button");
var queueContainer = $(contentSelectorStr+"#queue-manager-container")
var queueList = $(contentSelectorStr+"#queue-manager ul");
var scrollingQueueArea = $(contentSelectorStr+"#queue-manager-container #queue-manager")

var nextButton = $(contentSelectorStr+"button#next-media-button");
var previousButton = $(contentSelectorStr+"button#previous-media-button");

var queueInputField = $(contentSelectorStr+"input[placeholder='Enter a URL...']")
var queueNowButton = $(contentSelectorStr+"#queue-manager-container button#queue-now-button");
var queueNextButton = $(contentSelectorStr+"#queue-manager-container button#queue-next-button");
var queueLastButton = $(contentSelectorStr+"#queue-manager-container button#queue-last-button");

var sortObject;

var queueOpen = false;

var queueObject = new Queue();

//queueObject.currentlyPlaying = 0;
//queueObject.queue = [
//    {"title": "I like trains do you like trains too cause potatoes?",
//     "code": "www.anotherunique.com",
//    "type": "youtube",
//    "duration": 200} 
//];

var secondsToMinutes = function(seconds) {
    var secondsDigit = Math.floor((seconds%60)+0.5).toString();
    if (secondsDigit.length == 1) {
        secondsDigit = "0"+secondsDigit;
    }
    return Math.floor(seconds/60).toString() + ":" + secondsDigit;
}

var updateQueueFromDOM = function() {
    var newQueue = [];
    var newCurrentlyPlaying;
    var DOMQueue = $(contentSelectorStr+"#queue-manager ul li").get();
    for (key in DOMQueue) {
        if (Number($(DOMQueue[key]).attr("order")) == queueObject.currentlyPlaying) {
            newCurrentlyPlaying = newQueue.length;
        }
        newQueue.push(queueObject.queue[Number($(DOMQueue[key]).attr("order"))]);
    }
    queueObject.queue = newQueue;
    queueObject.currentlyPlaying = newCurrentlyPlaying;
    // Broadcast new queue
    drawQueue()
}

var drawQueue = function() {
    queueList.html("");
    for (key in queueObject.queue) {
        var currentObject = queueObject.queue[key];
        var listItem;
        var playButton = true;
        var mediaIcon = "doc";
        
        if (key < queueObject.currentlyPlaying) {
            listItem = $("<li class='list-group-item previous' order='" + key + "'></li>");
        } else if (key == queueObject.currentlyPlaying) {
            listItem = $("<li class='list-group-item active' order='" + key + "'></li>");
            playButton = false;
        } else {
            listItem = $("<li class='list-group-item' order='" + key + "'></li>");
        }
        
        if (currentObject.type == "youtube") {
            mediaIcon = "youtube-play"
        } else if (currentObject.type == "soundcloud") {
            mediaIcon = "soundcloud"
        }
        
        
        listItem.append("<span class='icon-" + mediaIcon +" media-icon'></span>")
        
        var nameObject = $("<span class='media-name'>" + currentObject.title + " [" + secondsToMinutes(currentObject.duration) + "]</span>")
        $("#"+hiddenDivID).append(nameObject);
        if (nameObject.height() > 50) {
            var amountToTrim = 70;
            var newTitle = currentObject.title.substr(0,amountToTrim)
            newTitle = newTitle.substr(0, newTitle.lastIndexOf(" "));
            console.log(amountToTrim);
            nameObject = $("<span class='media-name'>" + newTitle + "... [" + secondsToMinutes(currentObject.duration) + "]</span>");
        } else if (nameObject.height() < 30) {
            nameObject = $("<span class='media-name single-line'>" + currentObject.title + " [" + secondsToMinutes(currentObject.duration) + "]</span>");
        }
         $("#"+hiddenDivID).html("");
        
        listItem.append(nameObject);
        
        
        var deleteButton = $("<button type='button' class='close pull-right delete-button'><span class='glyphicon glyphicon-remove'></span>")
        deleteButton.click(function(index) {
            return function() {
                queueObject.delete(Number(index));
        }}(key));
        
        listItem.append(deleteButton);
        
        if (playButton) {
            var playButtonObject = $("<button type='button' class='close pull-right play-button'><span class='glyphicon glyphicon-play'></span></button>")
            playButtonObject.click(function(index) {
            return function() {
                queueObject.play(Number(index));
            }}(key));
            
            listItem.append(playButtonObject);
        }
        queueList.append(listItem);
    }
    
    setTimeout(function(){if($(contentSelectorStr+"#queue-manager ul li.active").position())scrollingQueueArea.scrollTop(($(contentSelectorStr+"#queue-manager ul li.active").position().top+scrollingQueueArea.scrollTop())-63)},10);
    
    if (!sortObject) {
        sortObject = new Sortable(queueList.get(0), {
            onEnd: updateQueueFromDOM
        });
    }
}

queueButton.click(function() {
    if (!queueOpen) {
        $(this).addClass("active");
        drawQueue();
        queueContainer.fadeIn(200);
    } else {
        queueInputField.popover("hide");
        $(this).removeClass("active");
        queueContainer.fadeOut(200);
        $(this).blur();
    }
    queueOpen = !queueOpen;
});

var disableQueueInput = function() {
    queueInputField.popover("hide");
    queueInputField.val("Processing...");
    queueInputField.attr("disabled", true);
    queueNowButton.attr("disabled", true);
    queueNextButton.attr("disabled", true);
    queueLastButton.attr("disabled", true);
}

var enableQueueInput = function() {
    queueInputField.val("");
    queueInputField.attr("disabled", false);
    queueNowButton.attr("disabled", false);
    queueNextButton.attr("disabled", false);
    queueLastButton.attr("disabled", false);
}

var queueInputError = function() {
    setTimeout(function(){queueInputField.popover("show")},200);
    enableQueueInput();
}

queueNowButton.click(function() {
    if (queueInputField.val().trim().length > 1) {
        var result = queueObject.getTypeAndCode(queueInputField.val().trim())
        queueObject.getMetadata(result[0], result[1], 
        function(type, code) {
            return function(title, duration) {
                if (title) {
                    console.log("Success!");
                    queueObject.addNow(type,code,title,duration);
                    enableQueueInput();
                } else {
                    queueInputError();
                }
            }
        }(result[0], result[1]));
        disableQueueInput();
    }
});

queueNextButton.click(function() {
    if (queueInputField.val().trim().length > 1) {
        var result = queueObject.getTypeAndCode(queueInputField.val().trim())
        queueObject.getMetadata(result[0], result[1], 
        function(type, code) {
            return function(title, duration) {
                if (title) {
                    console.log("Success!");
                    queueObject.addNext(type,code,title,duration);
                    enableQueueInput();
                } else {
                    queueInputError();
                }
            }
        }(result[0], result[1]));
        disableQueueInput();
    }
});

queueLastButton.click(function() {
    if (queueInputField.val().trim().length > 1) {
        var result = queueObject.getTypeAndCode(queueInputField.val().trim())
        queueObject.getMetadata(result[0], result[1], 
        function(type, code) {
            return function(title, duration) {
                if (title) {
                    console.log("Success!");
                    queueObject.addToLast(type,code,title,duration);
                    enableQueueInput();
                } else {
                    queueInputError();
                }
            }
        }(result[0], result[1]));
        disableQueueInput();
    }
});

nextButton.click(function() {
    queueObject.play(queueObject.currentlyPlaying+1);
})

previousButton.click(function() {
    queueObject.play(queueObject.currentlyPlaying-1);
})

var updateButtons = function() {
    if (queueObject.currentlyPlaying == queueObject.queue.length-1) {
        nextButton.attr("disabled", true);
    } else {
        nextButton.attr("disabled", false);
    }
    if (queueObject.currentlyPlaying == 0) {
        previousButton.attr("disabled", true);
    } else {
        previousButton.attr("disabled", false);
    }
    
    if (queueObject.queue.length < 1) {
        nextButton.attr("disabled", true);
        previousButton.attr("disabled", true);
    }
}