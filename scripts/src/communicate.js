var peerJSKey = "esu07ebv3ni885mi";

var ambassadorID;
var peerID;
var peerName;
var peer;
var hostConnection;
var timeoutTime = 7000;
var refreshTime = 60000;
var connectedToNetwork = true;

var timeoutTimeout;
var refreshInterval;

var initialPeerList = {};
var functionsForTypes = {};
var connectedPeers = {};
var recoveryPeerList = [];
var nicknames = {};

if (/^#(.+)$/.exec(window.location.hash)) {
    ambassadorID = /^#(.+)$/.exec(window.location.hash)[1];
}

if (localStorage.getItem("lastConnected")) {
    console.log("Last connected object found!");
    var lastConnected = JSON.parse(localStorage.getItem("lastConnected"));
    if (lastConnected[ambassadorID]) {
        console.log("Detected re-opened session, restoring...");
        ambassadorID = lastConnected[ambassadorID];
    }
}

var containsSymbols = function(text) {
    if (text.indexOf("<") >= 0 || text.indexOf(">") >= 0 || text.indexOf("\"") >= 0 || text.indexOf("&") >= 0) {
        return true;
    } else {
        return false;
    }
}

var onMessageType = function(type, func) {
    functionsForTypes[type] = func;
};

var clearMessageType = function(type) {
    delete functionsForTypes[type];
};

var sendData = function(to, type, data) {
    if (connectedPeers[to]) {
        var targetPeer = connectedPeers[to];
        targetPeer.send({
            type: type,
            data: data
        });
        return true;
    } else {
        console.log("No such target!");
        return false;
    }
}

var requestData = function(type) {
    for (var key in connectedPeers) {
        sendData(key, type, "request");
        return;
    }
}

var broadcastData = function(type, data) {
    for (var key in connectedPeers) {
        sendData(key, type, data);
    }
}

var getUsername = function(peerName) {
    if (nicknames[peerName]) {
        return nicknames[peerName];
    } else {
        console.log("Could not find user!");
        return peerName;
    }
}

// Override this
var disconnectedFromNetwork = function(peer) {
    
}

var reconnectedToNetwork = function() {

}

var peerDisconnected = function(peerName, username) {
    console.log("Peer disconnected: "+peerName);
}

var peerConnected = function(peerName) {
    console.log("Peer connected: "+peerName);
}

var disconnectedInterval

var peerError = function(peerName, error) {
    if (peer.disconnected && !disconnectedInterval) {
        connectedToNetwork = false;
        disconnectedFromNetwork();
        disconnectedInterval = setInterval(function() {
            if (peer.disconnected) {
                peer.reconnect(); 
            } else {
                reconnectedToNetwork();
                clearInterval(disconnectedInterval);
                disconnectedInterval = null;
            }
        }, 1000);
    }
}

var receivedData = function(from, type, data) {
    console.log("Received data from " + from + " type " + type + " data", data);
}

var receivedUnhandledData = function(from, type, data) {
    console.log("Received unhandeled data from " + from + " type " + type + " data", data);
}

var fatalError = function(err) {
    console.log("Fatal error",err)
}
// Override end


var registerPeerConnection = function(conn, label) {
    console.log("Registered new peer: "+conn.peer);
    connectedPeers[conn.peer] = conn;
    
    conn.on("data", function(data) {
        if (data["type"] && data["data"]) {
            if (functionsForTypes[data["type"]]) {
                functionsForTypes[data["type"]](this.peer, data["data"]);
            } else {
                receivedUnhandledData(this.peer, data["type"], data["data"]);
            }
            receivedData(this.peer, data["type"], data["data"]);
        }
    });
    
    conn.on("close", function() {
        if (window.navigator.onLine) {
            var username = getUsername(this.peer);
            delete connectedPeers[this.peer];
            delete nicknames[this.peer];
            initialPeerList = {};
            peerDisconnected(this.peer, username);
        } else if (connectedToNetwork) {
            recoveryPeerList = [];
            for (var key in connectedPeers) {
                recoveryPeerList[nicknames[key]] = key;
            }
            connectedToNetwork = false;
            disconnectedFromNetwork();
            
            var connectionInterval = setInterval(function() {
                if (window.navigator.onLine) {
                    clearInterval(connectionInterval);
                    if (peer.disconnected) {
                        peer.reconnect();
                    }
                    connectedPeers = {};
                    nicknames = {};
                    connectToAllPeers(recoveryPeerList);
                    setTimeout(function() {
                        connectedToNetwork = true;
                        reconnectedToNetwork();
                    }, 3000);
                }
            }, 1000);
        }
    });
    
    conn.on("error", function(err) {
        peerError(this.peer, err);
    });
    
    if (label) {
        nicknames[conn.peer] = label;
    }
    
    if (connectedToNetwork) {
        for (var key in initialPeerList) {
            if (initialPeerList[key] == conn.peer) {
                return;
            }
        }
        peerConnected(conn.peer);
    }
}

var connectToAllPeers = function(peerList) {
    var nicknameBuffer = {};
    for (var key in peerList) {
        if ((peerList[key] == ambassadorID) && connectedToNetwork) {
            nicknames[ambassadorID] = key;
        } else {
            var connection = peer.connect(peerList[key], {label: peerName});
            nicknameBuffer[peerList[key]] = key;
            connection.on("open", function() {
               registerPeerConnection(this, nicknameBuffer[this.peer]);
            });

            connection.on("error", function(err) {
               peerError(this.peer, err); 
            });
        }
    }
}

var connect = function(name, callback) {
    var connectedToServer = false;
    var fullyConnected = false;
    
    peerName = name.trim();
    
    peer = new Peer({key: peerJSKey});
    console.log("Peer object created!");
    peer.on("open", function(id) {
        if (!connectedToServer) {
            connectedToServer = true;
            console.log("Peer open and ready!");
            peerID = id;
            
            refreshInterval = setInterval(function() {
                if (peer.disconnected) {
                    peer.reconnect();
                } else {
                    peer.disconnect();
                    setTimeout(function() {
                        peer.reconnect();  
                    }, 500);
                }
            }, refreshTime);

            peer.on("connection", function(conn) {
                conn.on("open", function(){
                    var joiningUsername = conn.label.trim();
                    if (joiningUsername.length > 4 && joiningUsername.length < 21) {
                        if (containsSymbols(joiningUsername)) {
                            console.log("Username with symbols!")
                            conn.send({type:"registration-error", data:"Username contains forbidden symbols!"});
                        }
                        if (joiningUsername == peerName) {
                            console.log("Username already taken!");
                            conn.send({type:"registration-error", data:"Username already taken!"});
                            return;
                        }
                        for (var key in nicknames) {
                            if (nicknames[key] == joiningUsername) {
                                console.log("Username already taken!");
                                conn.send({type:"registration-error", data:"Username already taken!"});
                                return;
                            }
                        }
                        registerPeerConnection(conn, joiningUsername);
                    } else {
                        console.log("Invalid username!");
                        conn.send({type:"registration-error", data:"Username must be 5 to 20 characters long!"});
                    } 
                });
            });

            // Setup ambassador tools
            window.location.hash = peerID;
            onMessageType("peer-list", function(from) {
                console.log("Peer listing request from "+from);
                var peerList = {};
                for (var key in connectedPeers) {
                    if (key != from) {
                        peerList[nicknames[key]] = key;
                    }
                }
                peerList[peerName] = peerID;
                sendData(from, "peer-list-response", peerList) 
            });

            // Connect to ambassador if there is one
            if (ambassadorID) {
                hostConnection = peer.connect(ambassadorID, {label: peerName});

                hostConnection.on("open", function() {
                    connectedToServer = true;
                    console.log("Connected to host! Requesting peer list...")
                    registerPeerConnection(hostConnection);

                    onMessageType("registration-error", function(from, data) {
                        if (from == ambassadorID) {
                            peer.destroy();
                            connectedPeers = {};
                            clearInterval(refreshInterval);
                            clearTimeout(timeoutTimeout);
                            fatalError(data);
                        } 
                    });

                    onMessageType("peer-list-response", function(from, data) {
                        console.log("Receive peer-list")
                        if (from == ambassadorID) {
                            clearMessageType("peer-list-response");
                            clearMessageType("registration-error");
                            fullyConnected = true;
                            initialPeerList = data;
                            connectToAllPeers(data);
                            callback();
                            callback = function() {};
                        }
                    });

                    hostConnection.send({type:"peer-list",data:"request"});
                });

                clearTimeout(timeoutTimeout);
                timeoutTimeout = setTimeout(function() {
                    if (!fullyConnected) {
                        console.log("Heads up! Failed to connect to ambassador")
                        callback();
                        callback = function() {};
                    }
                }, timeoutTime);
            } else {
                callback();
                callback = function() {};
            }
        } else {
            // Connection refreshed!
        }
    });
    
    peer.on("disconnected", function() {

    });
    
    peer.on("error", function(err) {
        if (err.type == "peer-unavailable") {
            clearTimeout(timeoutTimeout);
            console.log("Heads up! Failed to connect to ambassador")
            callback();
            callback = function() {};
        } else {
            peerError(peerID, err);
        }
    });
    
    timeoutTimeout = setTimeout(function() {
        if (!connectedToServer) {
            peer.destroy();
            connectedPeers = {};
            fatalError("Peer registeration failed!");
        }
    }, timeoutTime);
    startLoginCountdown();
}

window.onbeforeunload = function(e) {
    localStorage.setItem("volume", mediaVolume.toString())
    for (var key in connectedPeers) {
        var lastConnected = {};
        lastConnected[peerID] = key;
        localStorage.setItem("lastConnected", JSON.stringify(lastConnected));
        peer.destroy();
        break;
    }
}

var quick = function(name) {
    connect(name, function(){console.log("Connected!")});
}