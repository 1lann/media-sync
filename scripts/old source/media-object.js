var displayDivID = "content-display-area"

var peopleReadyToPlay = [];

var latency = 100;

var addToReadyToPlay = function(person) {
    for (var key in peopleReadyToPlay) {
        if (person == peopleReadyToPlay[key]) {
            return false;
        }
    }
    peopleReadyToPlay.push(person);
    return true;
}

var MediaObject = function(type, code, catchUp) {
    if (catchUp) console.log("Playing catch up?");
    this.active = false;
    this.type = type;
    this.code = code;
    this.player = false;
    this.element = false;
    this.skipEvent = false;
    this.skipSeek = false;
    this.catchUp = catchUp;
    this.state = "loading";
    this.buffering = false;
    this.broadcastOnNextUpdate = false;
    this.altCurrentTime = false;
    if (type && code) {
        this.displayMedia();
    }
    
    onMessageType("media-data", function(media) {
        return function(from, data) {
            console.log("Set state: ",data)
            media.setSerializedState(from, data);
        }
    }(this));
    
    onMessageType("request-media-data", function(media) {
        return function(from) {
            console.log("Received media data request");
            if (media.active) {
                media.sendUpdate(from);
            } else {
                console.log("Not active!")
            }
        }
    }(this));
}

MediaObject.prototype.displayMedia = function() {
    if (this.code) {
        if (this.type == "youtube") {
            this.active = true;
            this.player = new YT.Player(displayDivID, {
                height: "450px",
                width: "100%",
                videoId: this.code,
                events: {
                    "onReady": onYoutubePlayerReady,
                    "onStateChange": onYoutubePlayerStateChange
                }
            });
            $("#"+displayDivID).attr("src",$("#"+displayDivID).attr("src")+"&rel=0");
            return true;
        } else if (this.type == "soundcloud") {
            this.active = true;
            this.element = $('<iframe width="100%" height="450" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url='+ this.code +'&amp;auto_play=true&amp;hide_related=true&amp;show_comments=false&amp;show_user=true&amp;show_reposts=false&amp;visual=true"></iframe>');
            $("#"+displayDivID).append(this.element);
            this.player = SC.Widget(this.element.get(0));
            this.player.bind(SC.Widget.Events.READY, onSCPlayerReady);
        } else if (this.type == "html5") {
            this.active = true;
            console.log("HTML player created");
            this.element = $("<video id='html5player' src='" + this.code + "' controls='true' autoplay='true' preload='auto'></video>");
            $("#"+displayDivID).append(this.element);
            this.player = this.element.get(0);
            this.pause();
            onHTML5PlayerReady(this);
        }
    } else {
        console.log("Attempt to display media without a code");
        return false;
    }
}

MediaObject.prototype.getSerializedState = function() {
    console.log("Creating serialized data");
    var serializedState = {};
    serializedState["time"] = this.getCurrentTime();
    serializedState["state"] = this.state;
    serializedState["code"] = this.code;
    serializedState["type"] = this.type;
    return serializedState;
}

MediaObject.prototype.setSerializedState = function(from, serializedState) {
    console.log("Setting state from message...")
    if (serializedState["type"] == this.type && serializedState["code"] == this.code) {
        console.log("Updating currently playing media");
        if (serializedState["state"]) {
            if (serializedState["state"] == "paused") {
                this.seekTo(serializedState["time"]);
                this.pause();
            } else if (serializedState["state"] == "playing") {
                this.seekTo(serializedState["time"]);
                this.play();
            } else if (serializedState["state"] == "ready") {
                addToReadyToPlay(from);
                if (peopleReadyToPlay.length == Object.keys(connectedPeers).length && this.state != "playing") {
                    console.log("Everyone ready! Playing...")
                    this.play();
                }
            }
        }
    } else {
        console.log("Unknown media! Requesting for queue update...")
        requestData("request-queue-data");
    }
}

MediaObject.prototype.broadcastUpdate = function() {
    broadcastData("media-data", this.getSerializedState());
}

MediaObject.prototype.sendUpdate = function(target) {
    sendData(target, "media-data", this.getSerializedState());
}

MediaObject.prototype.play = function() {
    if (this.state != "playing") {
        this.skipEvent = true;
        if (this.type == "youtube") {
            this.player.playVideo();
        } else if (this.type == "soundcloud") {
            this.player.play();
        } else if (this.type == "html5") {
            this.player.play();
        }
    }
}

MediaObject.prototype.pause = function() {
    if (this.state != "paused") {
        this.skipEvent = true;
        if (this.type == "youtube") {
            this.player.pauseVideo();
        } else if (this.type == "soundcloud") {
            this.player.pause();
        } else if (this.type == "html5") {
            this.player.pause();
        }
    }
}

MediaObject.prototype.seekTo = function(seconds) {
    this.skipSeek = true;
    if (this.type == "youtube") {
        if (Math.abs(this.getCurrentTime() - seconds) > 1) {
            this.player.seekTo(seconds, true);
        } else {
            this.skipSeek = false;
        }
    } else if (this.type == "soundcloud") {
        this.player.seekTo(seconds*1000);
    } else if (this.type == "html5") {
        this.player.currentTime = seconds;
    }
}

MediaObject.prototype.getCurrentTime = function() {
    if (this.type == "youtube") {
        return this.player.getCurrentTime();
    } else if (this.type == "soundcloud") {
        return this.altCurrentTime;
    } else if (this.type == "html5") {
        return this.player.currentTime;
    }
}

MediaObject.prototype.getVolume = function() {
    if (this.type == "youtube") {
        return this.player.getVolume();
    } else if (this.type == "soundcloud") {
        return mediaVolume;
    } else if (this.type == "html5") {
        return this.player.volume*100;
    }
}

MediaObject.prototype.setVolume = function(volume) {
    if (this.type == "youtube") {
        this.player.setVolume(volume);
    } else if (this.type == "soundcloud") {
        this.player.setVolume(volume / 100);
    } else if (this.type == "html5") {
        this.player.volume = volume/100;
    }
}

MediaObject.prototype.destroy = function() {
    if (this.type == "youtube") {
        console.log("Destroying player...");
        this.player.destroy();
        clearInterval(seekInterval);
        clearInterval(volumeInterval);
    }
    if (this.element) {
        this.element.remove();
    }
    peopleReadyToPlay = [];
    this.active = false;
    this.type = false;
    this.code = false;
    this.player = false;
    this.element = false;
    this.skipEvent = false;
    this.skipSeek = false;
    this.catchUp = false;
    this.state = "loading";
    this.buffering = false;
    this.broadcastOnNextUpdate = false;
    this.altCurrentTime = false;
}

MediaObject.prototype.onPause = function() {
    if (this.state == "loading") {
        this.state = "ready";
    } else if (this.state != "ready") {
        this.state = "paused";
        if (!this.skipEvent) {
            this.broadcastUpdate();
        } else {
            this.skipEvent = false;
        }
    }
}

MediaObject.prototype.onPlay = function() {
    if (this.state == "loading") {
        this.readyToPlay();
    } else {
        this.state = "playing";
        if (this.buffering) {
            this.buffering = false;
            setTimeout(function(){requestData("request-media-data")}, 500);
        }
        if (!this.skipEvent) {
            this.broadcastUpdate();  
        } else {
            this.skipEvent = false;
        }
    }
}

MediaObject.prototype.onBuffering = function() {
    this.buffering = true;
}

MediaObject.prototype.onStop = function() {
    this.state = "stopped";
    if (queueObject.currentlyPlaying < queueObject.queue.length-1) {
        queueObject.play(queueObject.currentlyPlaying+1);
    }
}

MediaObject.prototype.onSeek = function() {
    if (!this.skipSeek) {
        console.log("Detected seek");
        if (this.type == "youtube") {
            this.broadcastUpdate();
        } else if (this.type == "soundcloud") {
            this.broadcastOnNextUpdate = true;
        }
    } else {
        this.skipSeek = false;
    }
}

MediaObject.prototype.onVolumeChange = function() {
    mediaVolume = this.getVolume();
    updateVolumeBar();
}

MediaObject.prototype.readyToPlay = function() {
    console.log("Ready to play!");
    this.state = "ready";
    this.setVolume(mediaVolume);
    this.pause();
    this.broadcastUpdate();
    if (this.catchUp) {
        console.log("BUT WAIT! CHATCHUP!")
        requestData("request-media-data");
        this.catchUp = false;
    } else {
        if (peopleReadyToPlay.length >= Object.keys(connectedPeers).length) {
            console.log("Everyone already ready! Playing...")
            setTimeout(function(media) { return function() {
                media.play()
            }}(this), latency);
        }
    }
}

currentMedia = new MediaObject();