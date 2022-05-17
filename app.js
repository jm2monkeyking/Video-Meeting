const express = require("express");
var cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
var xss = require("xss");

const url = require("url");
var fs = require("fs");
var options = {};
var https = null;

if (process.env.NODE_ENV === "production") {
  https = require("https");
  options = {
    key: fs.readFileSync(
      "/etc/letsencrypt/live/demoshop2.ezsite.online/privkey.pem"
    ),
    cert: fs.readFileSync(
      "/etc/letsencrypt/live/demoshop2.ezsite.online/cert.pem"
    ),
    ca: fs.readFileSync(
      "/etc/letsencrypt/live/demoshop2.ezsite.online/chain.pem"
    ),
  };
} else {
  https = require("http");
}

const server = https.createServer(options, app);

var io = require("socket.io")(server);

app.use(cors());
app.use(bodyParser.json());
app.set("view engine", "ejs");

// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(__dirname + "/build"));
//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname + "/build/index.html"));
//   });
// }
app.set("port", process.env.PORT || 4001);

sanitizeString = (str) => {
  return xss(str);
};
app.use("/static", express.static("public"));
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  let data = {
    pageTitle: "Home",
  };
  res.render("home", data);
});

app.get("/record", (req, res) => {
  res.render("record");
});

app.get("/:room", (req, res) => {
  let data = {
    pageTitle: "Video",
  };
  res.render("video", data);
});
connections = {};
messages = {};
timeOnline = {};

app.post("/uploadFile", (request, response) => {
  var uri = url.parse(request.url).pathname,
    filename = path.join(process.cwd(), uri);

  var isWin = !!process.platform.match(/^win/);
  if (
    filename &&
    filename.toString().indexOf(isWin ? "\\uploadFile" : "/uploadFile") != -1 &&
    request.method.toLowerCase() == "post"
  ) {
    uploadFile(request, response);
    return;
  }

  fs.exists(filename, function (exists) {
    if (!exists) {
      response.writeHead(404, {
        "Content-Type": "text/plain",
      });
      response.write("404 Not Found: " + filename + "\n");
      response.end();
      return;
    }

    if (filename.indexOf("favicon.ico") !== -1) {
      return;
    }

    if (fs.statSync(filename).isDirectory() && !isWin) {
      filename += "/index.html";
    } else if (fs.statSync(filename).isDirectory() && !!isWin) {
      filename += "\\index.html";
    }

    fs.readFile(filename, "binary", function (err, file) {
      if (err) {
        response.writeHead(500, {
          "Content-Type": "text/plain",
        });
        response.write(err + "\n");
        response.end();
        return;
      }

      var contentType;

      if (filename.indexOf(".html") !== -1) {
        contentType = "text/html";
      }

      if (filename.indexOf(".js") !== -1) {
        contentType = "application/javascript";
      }

      if (contentType) {
        response.writeHead(200, {
          "Content-Type": contentType,
        });
      } else response.writeHead(200);

      response.write(file, "binary");
      response.end();
    });
  });
});

function uploadFile(request, response) {
  // parse a file upload
  var mime = require("mime");
  var formidable = require("formidable");
  var util = require("util");

  var form = new formidable.IncomingForm();

  var dir = !!process.platform.match(/^win/) ? "\\uploads\\" : "/uploads/";
  // console.log(__dirname + dir);
  form.uploadDir = __dirname + dir;
  form.keepExtensions = true;
  form.maxFieldsSize = 10 * 1024 * 1024;
  form.maxFields = 1000;
  form.multiples = false;
  form
    .parse(request)
    .on("field", function (name, field) {
      //console.log('Got a field:', field);
      //console.log('Got a field name:', name);
      // dbDocPath = field;
    })
    .on("file", function (name, files) {
      fs.rename(
        files.filepath,
        path.join(form.uploadDir, files.originalFilename),
        function (e) {}
      );

      var file = util.inspect(files);

      response.writeHead(200, getHeaders("Content-Type", "application/json"));
      var fileName = file
        .split("path:")[1]
        .split("',")[0]
        .split(dir)[1]
        .toString()
        .replace(/\\/g, "")
        .replace(/\//g, "");
      var fileURL = files.originalFilename;

      console.log("fileURL: ", fileURL);
      response.write(
        JSON.stringify({
          fileURL: fileURL,
        })
      );
      response.end();

      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
    });

  // form.parse(request, function (err, fields, files) {});
}

function getHeaders(opt, val) {
  try {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "https://l31.ezsite.online:4001";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = true;
    headers["Access-Control-Max-Age"] = "86400"; // 24 hours
    headers["Access-Control-Allow-Headers"] =
      "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";

    if (opt) {
      headers[opt] = val;
    }

    return headers;
  } catch (e) {
    return {};
  }
}

io.on("connection", (socket) => {
  socket.on("join-call", (path) => {
    if (connections[path] === undefined) {
      connections[path] = [];
    }
    connections[path].push(socket.id);

    timeOnline[socket.id] = new Date();

    for (let a = 0; a < connections[path].length; ++a) {
      io.to(connections[path][a]).emit(
        "user-joined",
        socket.id,
        connections[path]
      );
    }

    if (messages[path] !== undefined) {
      for (let a = 0; a < messages[path].length; ++a) {
        io.to(socket.id).emit(
          "chat-message",
          messages[path][a]["data"],
          messages[path][a]["sender"],
          messages[path][a]["socket-id-sender"]
        );
      }
    }

    console.log(path, connections[path]);
  });

  socket.on("signal", (toId, message) => {
    io.to(toId).emit("signal", socket.id, message);
  });

  socket.on("chat-message", (data, sender) => {
    data = sanitizeString(data);
    sender = sanitizeString(sender);

    var key;
    var ok = false;
    for (const [k, v] of Object.entries(connections)) {
      for (let a = 0; a < v.length; ++a) {
        if (v[a] === socket.id) {
          key = k;
          ok = true;
        }
      }
    }

    if (ok === true) {
      if (messages[key] === undefined) {
        messages[key] = [];
      }
      messages[key].push({
        sender: sender,
        data: data,
        "socket-id-sender": socket.id,
      });
      console.log("message", key, ":", sender, data);

      for (let a = 0; a < connections[key].length; ++a) {
        io.to(connections[key][a]).emit(
          "chat-message",
          data,
          sender,
          socket.id
        );
      }
    }
  });

  socket.on("disconnect", () => {
    var diffTime = Math.abs(timeOnline[socket.id] - new Date());
    var key;
    for (const [k, v] of JSON.parse(
      JSON.stringify(Object.entries(connections))
    )) {
      for (let a = 0; a < v.length; ++a) {
        if (v[a] === socket.id) {
          key = k;

          for (let a = 0; a < connections[key].length; ++a) {
            io.to(connections[key][a]).emit("user-left", socket.id);
          }

          var index = connections[key].indexOf(socket.id);
          connections[key].splice(index, 1);

          console.log(key, socket.id, Math.ceil(diffTime / 1000));

          if (connections[key].length === 0) {
            delete connections[key];
          }
        }
      }
    }
  });
});

server.listen(app.get("port"), () => {
  console.log("listening on", app.get("port"));
});
