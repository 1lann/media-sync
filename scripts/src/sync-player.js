var contentSelectorStr = "#interaction-area #content-area #content-selector ";

var contentArea = $("#interaction-area #content-area #content-display-area");

var mediaVolume = 50;

var seekInterval;
var volumeInterval;

// Random youtube shit
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
// End of random youtube shit

var onYoutubePlayerReady = function() {
    currentMedia.play();
    
    var lastSecond;
    
    seekInterval = setInterval(function() {
        if (lastSecond && currentMedia.state == "playing") {
            if (!((currentMedia.getCurrentTime() >= lastSecond) && (currentMedia.getCurrentTime() <= lastSecond+2))) {
                currentMedia.onSeek();
            } 
        }
        lastSecond = currentMedia.getCurrentTime();
    }, 1000);
    
    volumeInterval = setInterval(function() {
        mediaVolume = currentMedia.player.getVolume();
        updateVolumeBar();
    }, 500);
}

var onYoutubePlayerStateChange = function(obj) {
    var state = obj.data;
    if (state == 1) {
        if (currentMedia.state == "loading") {
            console.log("Volume set");
            currentMedia.player.setVolume(mediaVolume);
        }
        if (currentMedia.state != "playing") {
            currentMedia.onPlay();
        }
    } else if (state == 2) {
        currentMedia.onPause();
    } else if (state == 0) {
        currentMedia.onStop();
    } else if (state == 3) {
        currentMedia.onBuffering();
    }
}

var onSCPlayerReady = function() {
    currentMedia.player.bind(SC.Widget.Events.PLAY, function(e) {
        currentMedia.altCurrentTime = e.currentPosition/1000;
        currentMedia.onPlay();
    });
    
    currentMedia.player.bind(SC.Widget.Events.PAUSE, function(e) {
        currentMedia.altCurrentTime = e.currentPosition/1000;
        currentMedia.onPause();
    });
    
    currentMedia.player.bind(SC.Widget.Events.FINISH, function(e) {
        currentMedia.altCurrentTime = e.currentPosition/1000;
        currentMedia.onStop();
    });
    
    currentMedia.player.bind(SC.Widget.Events.SEEK, function(e) {
        currentMedia.altCurrentTime = e.currentPosition/1000;
        currentMedia.onSeek();
    });
    
    currentMedia.player.bind(SC.Widget.Events.PLAY_PROGRESS, function(e) {
        currentMedia.altCurrentTime = e.currentPosition/1000;
        if (currentMedia.broadcastOnNextUpdate) {
            currentMedia.broadcastUpdate();
            currentMedia.broadcastOnNextUpdate = false;
        }
    });
}

var onHTML5PlayerReady = function(media) {
    media.player.addEventListener("seeked", function() {
        media.onSeek(); 
    });
    
    media.player.addEventListener("play", function() {
        media.onPlay(); 
    });
    
    media.player.addEventListener("pause", function() {
        media.onPause();
    });
    
    media.player.addEventListener("volumechange", function() {
        media.onVolumeChange();
    });
    
    media.player.addEventListener("canplay", function() {
        console.log("Metdata loaded");
        if (media.state == "loading") {
            media.play(); 
        }
    });
    
    media.player.addEventListener("ended", function() {
        media.onStop(); 
    });
}

if (localStorage.getItem("volume")) {
    mediaVolume = Number(localStorage.getItem("volume"));
}

var rangeSlider = $("#content-area #content-selector #volume-controls #volume-slider").noUiSlider({
    start: 50,
    connect: "lower",
    range: {
        "min": 0,
        "max": 100
    }
});

rangeSlider.on("slide", function(){
    mediaVolume = rangeSlider.val();
    currentMedia.setVolume(mediaVolume);
    if (mediaVolume < 1) {
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-up");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-down");
        $(contentSelectorStr+"#volume-state-icon").addClass("glyphicon-volume-off");
    } else if (mediaVolume < 50) {
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-up");
        $(contentSelectorStr+"#volume-state-icon").addClass("glyphicon-volume-down");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-off");
    } else {
        $(contentSelectorStr+"#volume-state-icon").addClass("glyphicon-volume-up");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-down");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-off");
    }
})

var updateVolumeBar = function() {
    rangeSlider.val(mediaVolume);
    
    if (mediaVolume < 1) {
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-up");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-down");
        $(contentSelectorStr+"#volume-state-icon").addClass("glyphicon-volume-off");
    } else if (mediaVolume < 50) {
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-up");
        $(contentSelectorStr+"#volume-state-icon").addClass("glyphicon-volume-down");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-off");
    } else {
        $(contentSelectorStr+"#volume-state-icon").addClass("glyphicon-volume-up");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-down");
        $(contentSelectorStr+"#volume-state-icon").removeClass("glyphicon-volume-off");
    }
}

updateVolumeBar();
