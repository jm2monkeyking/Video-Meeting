var app = angular.module("myApp", []);
const server_url =
  window.location.href.includes("localhost") ||
  window.location.href.includes("127.0.0.1") === "production"
    ? "http://localhost:8000/"
    : "https://l31.ezsite.online:4001/";
var recordingID = "";
var recordingStatus = "";

app.controller("myCtrl", function ($scope) {
  const audioInputSelect = document.querySelector("select#audioSource");
  const audioOutputSelect = document.querySelector("select#audioOutput");
  const videoSelect = document.querySelector("select#videoSource");
  const steamVideo = document.getElementById("my-video");
  $scope.url = window.location.href;
  $scope.askForUsername = false;
  $scope.username = "";
  $scope.newmessages = 0;
  $scope.messages = [];
  $scope.message = "";

  $scope.deviceOption = {
    video: [],
    audioInput: [],
    audioOutput: [],
  };
  $scope.isChrome = function () {
    let userAgent = (navigator && (navigator.userAgent || "")).toLowerCase();
    let vendor = (navigator && (navigator.vendor || "")).toLowerCase();
    let matchChrome = /google inc/.test(vendor)
      ? userAgent.match(/(?:chrome|crios)\/(\d+)/)
      : null;
    // let matchFirefox = userAgent.match(/(?:firefox|fxios)\/(\d+)/)
    // return matchChrome !== null || matchFirefox !== null
    return matchChrome !== null;
  };

  $scope.getDeviceOption = async function (type) {
    let result = await navigator.mediaDevices
      .enumerateDevices()
      .catch((e) => console.log(e));
    return result.filter((e) => e.kind == type);
  };
  $scope.scanDevice = async function () {
    $scope.deviceOption = {
      video: await $scope.getDeviceOption("videoinput"),
      audioInput: await $scope.getDeviceOption("audioinput"),
      audioOutput: await $scope.getDeviceOption("audiooutput"),
    };
  };
  $scope.scanDevice();

  $scope.permission = {
    video: false,
    audio: false,
    screen: false,
    videoDevice:
      $scope.deviceOption.video.length > 0
        ? $scope.deviceOption.video[0].deviceId
        : undefined,
    audioInputDevice:
      $scope.deviceOption.audioInput.length > 0
        ? $scope.deviceOption.audioInput[0].deviceId
        : undefined,
    audioOutputDevice:
      $scope.deviceOption.audioOutput.length > 0
        ? $scope.deviceOption.audioOutput[0].deviceId
        : undefined,
  };

  $scope.deviceSourceControl = function () {
    $scope.getPermissions();
  };

  var connections = {};

  const peerConnectionConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:l31.ezsite.online:3478",
        username: "test",
        credential: "test123",
      },
    ],
    iceTransportPolicy: "all",
    iceCandidatePoolSize: "0",
  };
  var socket = null;
  var socketId = null;
  var elms = 0;

  $scope.getPermissions = async function () {
    try {
      if (window.stream) {
        window.stream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      await navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => ($scope.permission.video = true))
        .catch(() => ($scope.permission.video = false));

      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => ($scope.permission.audio = true))
        .catch(() => ($scope.permission.audio = false));

      if (navigator.mediaDevices.getDisplayMedia) {
        $scope.permission.screen = true;
      } else {
        $scope.permission.screen = false;
      }

      if ($scope.permission.video || $scope.permission.audio) {
        // console.log("have permission video and audio");
        // console.log({
        //   video: {
        //     deviceId: $scope.permission.videoDevice
        //       ? { exact: $scope.permission.videoDevice }
        //       : undefined,
        //   },
        //   audio: {
        //     deviceId: $scope.permission.audioInputDevice
        //       ? { exact: $scope.permission.audioInputDevice }
        //       : undefined,
        //   },
        // });
        let constraints = {};
        if ($scope.permission.video)
          constraints.video = {
            deviceId: $scope.permission.videoDevice
              ? { exact: $scope.permission.videoDevice }
              : undefined,
          };
        else constraints.video = false;

        if ($scope.permission.audio)
          constraints.audio = {
            deviceId: $scope.permission.audioInputDevice
              ? { exact: $scope.permission.audioInputDevice }
              : undefined,
          };
        else constraints.audio = false;

        navigator.mediaDevices
          .getUserMedia(constraints)
          .then((stream) => {
            window.localStream = stream;
            steamVideo.srcObject = stream;
          })
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    } catch (e) {
      console.log(e);
    }
  };

  $scope.getMedia = function () {
    $scope.permission.videoDevice = videoSelect.value
      ? videoSelect.value
      : undefined;
    $scope.permission.audioInputDevice = audioInputSelect.value
      ? audioInputSelect.value
      : undefined;
    console.log("getMedia", $scope.permission);
    $scope.getUserMedia();
    $scope.connectToSocketServer();
  };

  $scope.getUserMedia = function () {
    if ($scope.permission.video || $scope.permission.audio) {
      let constraints = {};
      if ($scope.permission.video)
        constraints.video = {
          deviceId: $scope.permission.videoDevice
            ? { exact: $scope.permission.videoDevice }
            : undefined,
        };
      else constraints.video = false;

      if ($scope.permission.audio)
        constraints.audio = {
          deviceId: $scope.permission.audioInputDevice
            ? { exact: $scope.permission.audioInputDevice }
            : undefined,
        };
      else constraints.audio = false;
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then($scope.getUserMediaSuccess)
        .then((stream) => {})
        .catch((e) => console.log(e));
    } else {
      // console.log("get stop");
      try {
        let tracks = steamVideo.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  $scope.getUserMediaSuccess = function (stream) {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    steamVideo.srcObject = stream;

    for (let id in connections) {
      if (id === socketId) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socket.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          $scope.permission.video = false;
          $scope.permission.audio = false;

          try {
            let tracks = steamVideo.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([$scope.black(...args), $scope.silence()]);
          window.localStream = blackSilence();
          steamVideo.srcObject = window.localStream;

          for (let id in connections) {
            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socket.emit(
                    "signal",
                    id,
                    JSON.stringify({
                      sdp: connections[id].localDescription,
                    })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        })
    );
  };

  $scope.getDislayMedia = function () {
    if ($scope.permission.screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: $scope.permission.screen, audio: true })
          .then($scope.getDislayMediaSuccess)
          .then((stream) => {})
          .catch((e) => {
            console.log(e);
            $scope.permission.screen = !$scope.permission.screen;
            $scope.$apply();
          });
      }
    }
  };

  $scope.getDislayMediaSuccess = function (stream) {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    steamVideo.srcObject = stream;

    for (let id in connections) {
      if (id === socketId) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socket.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          $scope.permission.screen = false;

          try {
            let tracks = steamVideo.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([$scope.black(...args), $scope.silence()]);
          window.localStream = blackSilence();
          steamVideo.srcObject = window.localStream;

          $scope.getUserMedia();
        })
    );
  };

  $scope.gotMessageFromServer = function (fromId, message) {
    var signal = JSON.parse(message);

    if (fromId !== socketId) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socket.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  $scope.changeCssVideos = function (main) {
    let widthMain = main.offsetWidth;
    let minWidth = "30%";
    if ((widthMain * 30) / 100 < 300) {
      minWidth = "300px";
    }
    let minHeight = "40%";

    let height = String(100 / elms) + "%";
    let width = "";
    if (elms === 0 || elms === 1) {
      width = "100%";
      height = "100%";
    } else if (elms === 2) {
      width = "45%";
      height = "100%";
    } else if (elms === 3 || elms === 4) {
      width = "35%";
      height = "50%";
    } else {
      width = String(100 / elms) + "%";
    }
    // console.log(width);
    // console.log(height);
    let videos = main.querySelectorAll("video");
    for (let a = 0; a < videos.length; ++a) {
      // videos[a].style.minWidth = minWidth;
      // videos[a].style.minHeight = minHeight;
      videos[a].style.setProperty("width", "100%");
      videos[a].style.setProperty("height", height);
    }

    return { minWidth, minHeight, width, height };
  };

  $scope.connectToSocketServer = function () {
    socket = io.connect(server_url, { secure: true });

    socket.on("signal", $scope.gotMessageFromServer);

    socket.on("connect", () => {
      socket.emit("join-call", window.location.href);
      socketId = socket.id;

      socket.on("chat-message", $scope.addMessage);

      socket.on("user-left", (id) => {
        let video = document.querySelector(
          `[data-socket="${id}"]`
        ).parentElement;
        if (video !== null) {
          elms--;
          video.parentNode.removeChild(video);

          let main = document.getElementById("main");
          $scope.changeCssVideos(main);
        }
      });

      socket.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConnectionConfig
          );
          // Wait for their ice candidate
          connections[socketListId].onicecandidate = function (event) {
            if (event.candidate != null) {
              socket.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          // Wait for their video stream
          connections[socketListId].onaddstream = (event) => {
            // TODO mute button, full screen button
            var searchVidep = document.querySelector(
              `[data-socket="${socketListId}"]`
            );
            if (searchVidep !== null) {
              // if i don't do this check it make an empyt square
              searchVidep.srcObject = event.stream;
            } else {
              elms = clients.length;
              let main = document.getElementById("main");
              let cssMesure = $scope.changeCssVideos(main);

              let video = document.createElement("video");
              let div = document.createElement("div");

              let button = document.createElement("button");
              button.innerText = "Pin To Main";
              let css = {
                "min-height": "100%",
                "max-height": "100%",
                "min-width": "100%",
                "border-style": "solid",
                "border-color": "#bdbdbd",
                "object-fit": "fill",
              };
              for (let i in css) video.style[i] = css[i];

              video.style.setProperty("width", cssMesure.width);
              video.style.setProperty("height", cssMesure.height);
              video.setAttribute("data-socket", socketListId);
              video.srcObject = event.stream;
              video.autoplay = true;
              video.playsinline = true;
              button.setAttribute(
                "onclick",
                "pintoscreen('" + socketListId + "',this)"
              );
              div.appendChild(video);
              div.appendChild(button);
              main.appendChild(div);
            }
          };

          // Add the local video stream
          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([$scope.black(...args), $scope.silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketId) {
          for (let id2 in connections) {
            if (id2 === socketId) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {}

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socket.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };

  $scope.silence = function () {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };
  $scope.black = function ({ width = 640, height = 480 } = {}) {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  $scope.handleVideo = function () {
    $scope.permission.video = !$scope.permission.video;
    $scope.getUserMedia();
  };
  $scope.handleAudio = function () {
    $scope.permission.audio = !$scope.permission.audio;
    $scope.getUserMedia();
  };
  $scope.handleScreen = function () {
    $scope.permission.screen = !$scope.permission.screen;
    $scope.getDislayMedia();
  };

  $scope.handleEndCall = function () {
    try {
      let tracks = steamVideo.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}
    window.location.href = "/";
  };

  $scope.openChat = function () {
    $scope.newmessages = 0;
  };
  // closeChat = () => this.setState({ showModal: false });
  // handleMessage = (e) => this.setState({ message: e.target.value });

  $scope.addMessage = function (data, sender, socketIdSender) {
    $scope.messages.push({
      sender: sender,
      data: data,
    });
    if (socketIdSender !== socketId) {
      $scope.newmessages = $scope.newmessages + 1;
    }
    $scope.$apply();
    document
      .getElementById("messageContainer")
      .scrollTo(0, document.getElementById("messageContainer").scrollHeight);
  };

  $scope.sendMessage = () => {
    if ($scope.message) {
      socket.emit("chat-message", $scope.message, $scope.username);
      $scope.message = "";
    }
  };

  $scope.copyUrl = function () {
    let text = window.location.href;
    if (!navigator.clipboard) {
      let textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        alert("Link copied to clipboard!");
      } catch (err) {
        alert("Failed to copy");
      }
      document.body.removeChild(textArea);
      return;
    }
    navigator.clipboard.writeText(text).then(
      function () {
        alert("Link copied to clipboard!");
      },
      () => {
        alert("Failed to copy");
      }
    );
  };

  $scope.connect = function () {
    $scope.askForUsername = false;
    $scope.permission.audioInputDevice = audioInputSelect.value;
    $scope.permission.videoDevice = videoSelect.value;
    $scope.getMedia();
  };

  handleVideoSource = (data) => {
    this.setState({ ...this.state, videoSource: data.target.value });
    this.getPermissions();
  };
});
function pintoscreen(socketId, $event) {
  console.log($event);
  let videoList = document.querySelectorAll("[data-socket=" + socketId + "]")[0]
    .parentElement;

  let mainScreenDiv = document.getElementById("my-video").parentElement;

  let mainScreen = document.getElementById("my-video");

  videoList.appendChild(mainScreen);

  let target = document.querySelectorAll("[data-socket=" + socketId + "]")[0];

  mainScreenDiv.appendChild(target);
}

var recorder;

// reusable helpers

// this function submits recorded blob to nodejs server
function postFiles() {
  // let videoElement = document.getElementById("my-video");
  // videoElement.muted = false;
  // videoElement.volume = 1;

  // videoElement.src = videoElement.srcObject = null;

  getSeekableBlob(recorder.getBlob(), function (blob) {
    var fileName = generateRandomString() + ".webm";

    var file = new File([blob], fileName, {
      type: "video/webm",
    });

    // videoElement.src = "";
    // videoElement.poster = "/ajax-loader.gif";

    xhr("/uploadFile", file, function (responseText) {
      if (recordingStatus == 3) {
        var fileURL = JSON.parse(responseText).fileURL;
        alert(server_url + "uploads/" + fileURL);
      }
    });
    recorder = null;
    if (recordingStatus == 1) {
      recordingStatus = 2;
      recorder = RecordRTC(document.getElementById("my-video").srcObject, {
        type: "video",
      });
      recorder.startRecording();
    }
    if (recordingStatus == 2) {
      recorder = RecordRTC(document.getElementById("my-video").srcObject, {
        type: "video",
      });
      recorder.startRecording();
    }
  });
}

// XHR2/FormData
function xhr(url, data, callback) {
  var request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (request.readyState == 4 && request.status == 200) {
      callback(request.responseText);
    }
  };

  request.upload.onprogress = function (event) {
    // progressBar.max = event.total;
    // progressBar.value = event.loaded;
    // progressBar.innerHTML =
    //   "Upload Progress " + Math.round((event.loaded / event.total) * 100) + "%";
  };

  request.upload.onload = function () {
    // percentage.style.display = "none";
    // progressBar.style.display = "none";
  };
  request.open("POST", url);

  var formData = new FormData();
  formData.append("field", `${recordingID}-${recordingStatus}`);
  formData.append("file", data);
  request.send(formData);
}

// generating random string
function generateRandomString() {
  if (window.crypto) {
    var a = window.crypto.getRandomValues(new Uint32Array(3)),
      token = "";
    for (var i = 0, l = a.length; i < l; i++) token += a[i].toString(36);
    return token;
  } else {
    return (Math.random() * new Date().getTime())
      .toString(36)
      .replace(/\./g, "");
  }
}

var mediaStream = null;
// reusable getUserMedia
function captureUserMedia(success_callback) {
  var session = {
    audio: true,
    video: true,
  };

  navigator.getUserMedia(session, success_callback, function (error) {
    alert("Unable to capture your camera. Please check console logs.");
    console.error(error);
  });
}
var recorder = null;
function toggleRecording($event) {
  if (recorder == null) {
    recordingID = new Date().getTime();
    recordingStatus = 1;
    $event.innerText = "Stop Recording";
    recorder = RecordRTC(document.getElementById("my-video").srcObject, {
      type: "video",
    });
    recorder.startRecording();
  } else {
    $event.innerText = "Record";
    recordingStatus = 3;
    recorder.stopRecording(postFiles);
  }
}

let video = document.getElementById("my-video");

video.addEventListener("play", (event) => {
  console.log("play event called", recordingStatus);
  if (recordingStatus == 1) {
    recorder.stopRecording(postFiles());
  }
  if (recordingStatus == 2) {
    recorder.stopRecording(postFiles());
  }
});
