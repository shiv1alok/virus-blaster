
// Import the necessary modules
const express = require("express");

const bodyParser = require("body-parser");
const expressSanitizer = require('express-sanitizer');
const logger = require("morgan");

// Secret for the session
const secretJSON = require("./secret.json");
// Create session
const session = require("express-session")({
    key: "user_id",
    secret: secretJSON["secret"],
    resave: true,
    saveUninitialized: true,
});
// Create socket + express session
const sharedsession = require("express-socket.io-session");

// Template engine
// const pug = require("pug");

// Socket
const socket = require('socket.io');

// Instantiate app
const app = express();

// Set view engine as pug
// app.set("view engine", "pug");
app.set('views','./public/views');

// Mount middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressSanitizer());
app.use(logger("dev"));

app.use(session);
app.use( (req, res, next) => {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

// Start server
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
    console.log("Server listening on port " + PORT);
})

// Socket
let io = socket(server);

io.use(sharedsession(session, {
    autoSave: true
    })
);

// Check if session cookie is still saved in browser and user is not set, then automatically log the user out.
app.use((req, res, next) => {
    if (req.session.user_id == undefined) {
        res.cookie("user_id", "", { expires: new Date(Number(new Date()) - 1000)});      
    }
    next();
  });

// Check for users with valid session
const sessionChecker = (req, res, next) => {
    hs = 0;
    if (req.session.user_id) {
        res.sendFile(__dirname + "/public/views/game_html.html");
    } else {
        req.session.user_id = new Date().getTime();
        res.sendFile(__dirname + "/public/views/game_html.html");
    }    
};

app.use(express.static("public"));

let hs;

// Default route
app.route("/")
    .get(sessionChecker, () => {
        
    })

// Socket connection
io.on("connection",
    (client) => {
        // Client variables 
        let warning = 0;

        // Client highscore up till now
        let score = hs;
        
        // Date to join
        let prevTime = new Date().getTime();
        
        // let Op = Sequelize.Op;
        
        if (client.handshake.session.user_id != undefined) {
            console.log(`A new client joined: ${client.id}`);
            
            // Initialize score for the client
            client.emit("setScore", {
                "score": 0,
                "highScore": hs
            });

            // Update client score
            client.on("updateScore", (data) => {
                let receivedTime = new Date().getTime();
                
                // Check difference between the two times 
                if (checkTime(prevTime, receivedTime)) {

                    // If new score is more than current high score
                    if (score < data.score){

                        // Check if it is possible to get that much score in delta time
                        if (data.score - score < 60 * (receivedTime - prevTime) / 1000) { // If true
                            score = data.score;
                        } else { // If not, user is cheating
                            console.log(`ID:${client.handshake.session.user_id} FOUND CHEATING! WARNING NUMBER ${++warning}`);
                        }
                    }

                    // Set prev time as last recieved time
                    prevTime = receivedTime;
                }

                // If user is cheating repeatedly delete that account
                if (warning >= 3) {
                    console.error(`Repeated Cheating! Deleting ID: ${client.handshake.session.user_id}`);
                    client.handshake.session.user_id = undefined;
                    client.disconnect();
                }
            })
            // When user disconnects
            client.on("disconnect", () => console.log("Client has disconnected:", client.id));
        }
    }
);

// Utility funciton to check difference between two times
const checkTime = (prevTime, newTime) => {
    if (newTime - prevTime >= 2800) {
        return true;
    }
    return false;
}