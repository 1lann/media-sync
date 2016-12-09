// jscs:disable
// Add start playing at and delete objects from queue

var youtubeMatcher = /www\.youtube\.com\/watch\?v=([^&]+)/
var hiddenDivID = "hidden-test-area";

var Queue = function() {
    nextButton.attr("disabled", true);
    previousButton.attr("disabled", true);

    this.queue = [];
    this.currentlyPlaying = 0;

    onMessageType("queue-data", function(queue) {
        return function(from, data) {
            console.log("Update queue: ",data)
            queue.setSerializedQueue(data);
        }
    }(this));

    onMessageType("request-queue-data", function(queue) {
        return function(from) {
            console.log("Received queue update request")
            queue.sendUpdate(from);
        }
    }(this));
}

Queue.prototype.play = function(index, automated) {
    if (index < this.queue.length) {
        this.currentlyPlaying = index;
    } else {
        this.currentlyPlaying = this.queue.length-1;
    }
    if (queueOpen) drawQueue();
    updateButtons();
    if (currentMedia.active) {
        currentMedia.destroy();
    }
    if (!automated) { this.broadcastUpdate(); }
    if (this.queue.length > 0) {
        if (automated) {
            currentMedia = new MediaObject(this.queue[this.currentlyPlaying].type, this.queue[this.currentlyPlaying].code, true);
        } else {
            currentMedia = new MediaObject(this.queue[this.currentlyPlaying].type, this.queue[this.currentlyPlaying].code);
        }
    } else {
        currentMedia.destroy();
    }
}

Queue.prototype.setSerializedQueue = function(serializedQueue) {
    console.log("Received serialized queue");
    if (typeof(serializedQueue["queue"]) == "object" && typeof(serializedQueue["playing"]) == "number") {
        var currentlyPlayingCode;
        if (this.queue[this.currentlyPlaying]) {
            currentlyPlayingCode = this.queue[this.currentlyPlaying].code;
        }
        this.queue = serializedQueue["queue"];
        if ((this.currentlyPlaying != serializedQueue["playing"]) || (!this.queue[serializedQueue["playing"]]) || (currentlyPlayingCode != this.queue[serializedQueue["playing"]].code)) {
            console.log("New song, playing...");
            this.play(serializedQueue.playing, true);
        }
        if (queueOpen) drawQueue();
        updateButtons();
    }
}

Queue.prototype.getSerializedQueue = function() {
    var serializedQueue = {};
    serializedQueue["queue"] = this.queue;
    serializedQueue["playing"] = this.currentlyPlaying;
    return serializedQueue;
}

Queue.prototype.getMetadata = function(type, code, callback) {
    if (type == "youtube") {
        var testPlayer = new YT.Player(hiddenDivID, {
            height: "500px",
            width: "500px",
            videoId: code,
            events: {
                "onReady": function(callback) {
                    return function(event) {
                        var videoData = event.target.getVideoData();
                        var videoTitle = videoData.title;
                        if (videoTitle.length > 0) {
                            event.target.playVideo();
                        } else {
                            console.log("YouTube: Invalid video");
                            callback(false);
                        }
                    }
                }(callback),
                "onStateChange": function(callback) {
                    return function(event) {
                        if (event.data == 1) {
                            event.target.setVolume(0);
                            var videoData = event.target.getVideoData();
                            var videoTitle = videoData.title;
                            var duration = event.target.getDuration();
                            testPlayer.destroy();
                            testPlayer = null;
                            $("#"+hiddenDivID).html("");
                            if (videoTitle.length > 0) {
                                console.log("YouTube: Valid video");
                                callback(videoTitle, duration);
                            } else {
                                console.log("YouTube: Invalid video???");
                                callback(false);
                            }
                        }
                    }
                }(callback)
            }
        });
    } else if (type == "soundcloud") {
        var testElement = $('<iframe width="500px" height="500px" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url='+ code +'&amp;auto_play=false&amp;hide_related=true&amp;show_comments=false&amp;show_user=true&amp;show_reposts=false&amp;visual=true"></iframe>');
        $("#"+hiddenDivID).append(testElement);
        var testPlayer = SC.Widget(testElement.get(0));

        var testErrorTimeout = setTimeout(function(callback, testPlayer) {
            return function() {
                console.log("Soundcloud: Could not find song!");
                testPlayer.unbind(SC.Widget.Events.READY);
                testPlayer = null;
                testElement.remove();
                testElement = null;
                $("#"+hiddenDivID).html("");
                callback(false);
            }
        }(callback, testPlayer), 5000);

        testPlayer.bind(SC.Widget.Events.READY, function(callback, testPlayer) {
            return function (){
                testPlayer.getCurrentSound(function(callback) {
                    return function(event) {
                        console.log("Soundcloud: Found title "+event.title);
                        clearTimeout(testErrorTimeout);
                        testPlayer = null;
                        testElement.remove();
                        testElement = null;
                        $("#"+hiddenDivID).html("");
                        callback(event.title, event.duration/1000)
                    }
                }(callback));
            }
        }(callback, testPlayer));
    } else if (type == "html5") {
        console.log("Waiting for HTML event...");
        var testAudio = $("<audio id='html5audio' src='" + code.replace(/&/g,"&amp;") + "'></audio>")
        $("#"+hiddenDivID).append(testAudio);
        testAudio.get(0).addEventListener("error", function(callback) {
            return function() {
                console.log("HTML: Invalid audio");
                testAudio.remove();
                $("#"+hiddenDivID).html("");
                callback(false);
            }
        }(callback));
        testAudio.get(0).addEventListener("loadedmetadata", function(callback, code) {
            return function() {
                console.log("HTML: Valid audio");
                var duration = testAudio.get(0).duration;
                testAudio.remove();
                $("#"+hiddenDivID).html("");
                callback(code.substr(code.lastIndexOf('/') + 1), duration);
            }
        }(callback, code));
    } else {
        console.log("Did not specify type???");
        return false;
    }
}

Queue.prototype.getTypeAndCode = function(url) {
    if (url.indexOf("http") < 0) {
        url = "http://"+url;
    }
    if (youtubeMatcher.exec(url)) {
        var videoCode = youtubeMatcher.exec(url)[1];
        return ["youtube", videoCode];
    } else if (url.indexOf("//soundcloud.com") > 0) {
        console.log("Matched soundcloud audio");
        return ["soundcloud", url];
    } else {
        return ["html5", url];
    }
}

Queue.prototype.broadcastUpdate = function() {
    broadcastData("queue-data", this.getSerializedQueue());
}

Queue.prototype.sendUpdate = function(target) {
    sendData(target, "queue-data", this.getSerializedQueue());
}

Queue.prototype.addToLast = function(type, code, title, duration) {
    this.queue.push({"type": type, "code": code, "title": title, "duration": duration});
    if (currentMedia.state == "stopped" && this.currentlyPlaying == this.queue.length-2) {
        this.play(queue.length-1);
    } else if (this.queue.length == 1) {
        this.play(0);
    } else {
        this.broadcastUpdate();
    }
    if (queueOpen) drawQueue();
    updateButtons();
}

Queue.prototype.addNext = function(type, code, title, duration) {
    this.queue.splice(this.currentlyPlaying+1, 0, {"type": type, "code": code, "title": title, "duration": duration});
    if (currentMedia.state == "stopped" && this.currentlyPlaying == this.queue.length-2) {
        this.play(this.queue.length-1);
    } else if (this.queue.length == 1) {
        this.play(0);
    } else {
        this.broadcastUpdate();
    }
    if (queueOpen) drawQueue();
    updateButtons();
}

Queue.prototype.addNow = function(type, code, title, duration) {
    this.queue.splice(this.currentlyPlaying+1, 0, {"type": type, "code": code, "title": title, "duration": duration});
    this.play(this.currentlyPlaying+1);
    if (queueOpen) drawQueue();
    updateButtons();
}

Queue.prototype.delete = function(index) {
    this.queue.splice(index, 1);
    if (index == this.currentlyPlaying) {
        this.play(this.currentlyPlaying);
    }
    this.broadcastUpdate();
    if (queueOpen) drawQueue();
    updateButtons();
}
