require('dotenv').config();

const express = require('express');
const cors = require('cors');
const formidable = require('express-formidable');
const fs = require('fs');

const bcrypt = require('bcrypt');
const saltrounds = 10;

const mongoHelpers = require('./mongo-helpers');
const gridfsHelpers = require('./gridfs-helpers');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // May need to change to const MongoStore = require('connect-mongo')(session);

const { body, validationResult } = require('express-validator'); // For validating user input
const router = express.Router();

const app = express();

const thisMongoStore = new MongoStore({
    mongoUrl: "mongodb+srv://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stagemanagersbook.mv9wrc2.mongodb.net/",
    collectionName: 'sessions',
    ttl: 60 * 60, // In seconds; verification here expires after one hour
    autoRemove: 'native'
});

app.use(session({
    secret: 'SECRET KEY',
    resave: false,
    saveUninitialized: true,
    store: thisMongoStore
}));

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true, // for cookies
    optionsSuccessStatus: 200,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE"
};

// router.post('/google', async (req, res) => {
//     console.log("Google Auth");
//     console.log(req.body);
//     res.json({message: 'Google Auth'}); 
// })


// app.get('/', (req, res) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.send({ "msg": "This has CORS enabled"});
// })

// const response = await fetch('http://localhost:8000', {mode: 'cors'});

app.use(cors(corsOptions));
app.use(express.json());
app.use(formidable());

app.use((req, res, next) => {
    res.header('Cross-Origin-Opener-Policy', 'same-origin');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});  

// For getting userID from a sessionID
async function getUID(sessionID) {
    const userIDResponse = await mongoHelpers.getUserID(sessionID);
    return userIDResponse.userId;
};

app.get('/test', (req, res) => {
    res.json({message: "Test successful"});
});

// creating a new user from the sign-up form
app.post('/register', async (req, res) => {
    console.log("Registering user");
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    console.log(fields);

    try{     
        if (fields.password != fields.verifyPassword) {
            return res.status(400).send({message: "Passwords do not match"});
        }
        //console.log("Creating user with email: " + fields.email)

        // hash the password
        const hashedPassword = await bcrypt.hash(fields.password, saltrounds);

        // Attempt to create a user
        const userCreationResult = await mongoHelpers.createUser(fields.fullName, fields.email, fields.password);
        if (userCreationResult.success) {
            console.log(userCreationResult.message);
            res.status(201).send('User created successfully');
        }
        else {
            res.status(400).send(userCreationResult.message);
        }
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Server Error');
    }
});

// uploads attached file to database in the attached bucket
// use the following code block to format attached data
    // const data = new FormData();
    // data.append('file', fileData);
    // data.append('hub', "hubName");
    // data.append('bucket', "bucketName");
    // const headers = {
    //     headers: {
    //         'Content-Type': `multipart/form-data; boundary=${data._boundary}`
    //     }
    // };
app.post('/upload-file', async (req, res) => {
    if (req.fields.hub == "Unit Test") {
        const stream = fs.createReadStream("unit-test-files/unit-test-file.jpg");
        const name = "unit-test-file.jpg";
        const hub = "unit-tests";
        const bucket = "unit-tests";
        const ret = await gridfsHelpers.uploadFile(name, stream, hub, bucket);
        if (ret == null) res.json({status: 500});
        else res.json(ret);
    } else {
        const file = req.files.file;
        const name = file.name;
        const hub = req.fields.hub;
        const bucket = req.fields.bucket;
        const stream = fs.createReadStream(file.path); // path here refers to the temporary location of the file within the server returned by mongoDB. It should not be accessible in any way by the client
        const ret = await gridfsHelpers.uploadFile(name, stream, hub, bucket);
        if (ret == null) res.json({status: 500});
        else res.json(ret);
    }
});

// download file stream of file with give nname
// to access file data in the front end,
// use .blob() and URL.createObjectURL(blob)
// this will return a URL to use with <a href={url}>filename</a>
app.get('/download-file', async (req, res) => {
    const name = req.query.name;
    const hub = req.query.hub;
    const bucket = req.query.bucket;
    // TODO - check for proper file extension, input sanitization, etc
    // var re = /(?:\.([^.]+))?$/;
    // var ext = re.exec(name)[1];
    const ret = await gridfsHelpers.downloadFile(name, hub, bucket);
    if (ret == null) res.json({status: 500});
    else if (ret.status == 404) res.json(ret);
    else ret.pipe(res);
});

app.get('/delete-file', async (req, res) => {
    const name = req.query.name;
    const hub = req.query.hub;
    const bucket = req.query.bucket;
    const ret = await gridfsHelpers.deleteFile(name, hub, bucket);
    if (ret == null) res.json({status: 500});
    else res.json(ret);
})

// uploads attached image to database in the images bucket
app.post('/upload-image', async (req, res) => {
    const file = req.files.file;
    const name = file.name;
    const type = file.type;
    if (type !== 'image/jpeg' && type !== 'image/png') {
        res.json({message: `Invalid file format ${type}`});
    } else {
        const stream = fs.createReadStream(file.path); // path here refers to the temporary location of the file within the server returned by mongoDB. It should not be accessible in any way by the client
        const ret = await gridfsHelpers.uploadFile(name, stream, 'images');
        if (ret == null) res.json({status: 500});
        else res.json(ret);
    }
});

// returns file stream of image with given name
// to access image data in the front end, 
//  use .blob() and URL.createObjectURL(blob)
// this will return a URL to use with <img src={url} />
app.get('/display-image', async (req, res) => {
    const name = req.query.name;
    var re = /(?:\.([^.]+))?$/;
    var ext = re.exec(name)[1];
    if (ext !== 'jpg' && ext !== 'png') {
        res.json({message: `Invalid file format .${ext}`});
    } else {
        const ret = await gridfsHelpers.downloadFile(name, 'images');
        if (ret == {status: 404}) res.json(ret);
        else if (ret == null) res.json({status: 500});
        else ret.pipe(res);
    }
});

// returns array of strings with the filenames in a bucket
// currently just returns images, but can be modified to check other buckets
// these filenames can be piped to /display-image/:name to display on a page
app.get('/get-filenames', async (req, res) => {
    const hub = req.query.hub;
    const bucket = req.query.bucket;
    const ret = await gridfsHelpers.getFilenames(hub, bucket);
    if (ret == null) res.json({status: 500});
    else res.json(ret);
});

// returns a list of hub info to load into buttons in hubs.js
app.post('/hubs', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    //const uid = await getUID(fields.sessionID)
    const uid = fields.sessionID;
    const hids = await mongoHelpers.getHids(uid)
    const hubInfo = await mongoHelpers.getHubInfo(hids);
    res.json(hubInfo);
});

// returns a single collection of hub info to load into a page hub-individual.js
app.post('/hub-individual', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const hubInfo = await mongoHelpers.getIndividualHubInfo(fields.hid);
    res.json(hubInfo);
});

app.post('/retrieve-members', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const members = await mongoHelpers.retrieveMembers(fields);
    res.json(members);
});

// Returns dictionary of authenticated user; 'uid' is the only attribute definitely returned
app.post('/authenticate', 
    async (req, res) => {

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const fields = JSON.parse(Object.keys(req.fields)[0]);

        // FOR DEBUGGING
        // console.log("GOT FIELDS");
        // console.log(fields);

        try {
            var userId = await mongoHelpers.authenticateUser(fields.email, fields.password); 

            if (userId == null) {
                res.status(401).json("NOT AUTHENTICATED");
            } else {
                req.session.isLoggedIn = true;
                req.session.userId = userId.uid;

                // FOR DEBUGGING
                // console.log("USER's SESSION ID");
                // console.log(req.sessionID); // Newly Created SessionID
                res.json(req.sessionID);
            }
        } catch (error) {
            console.error("Authentication Error:", error);
            res.status(500).json("Server Error");
        }
    }
);

// Returns dictionary of authenticated user; 'uid' is the only attribute definitely returnde
app.post('/updateProfile', async (req, res) => {
    // Converting req into readable format
    //TODO: Sanitize input
    //TODO: Handle Errors
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const userID = await getUID(fields.sessionID);
    const userId = await mongoHelpers.updateProfile(fields, userID); 

    // FOR DEBUGGING
    // console.log("Got back from updateProfile");
    // console.log(userId);
    if (userId==null) {
        userId = {'uid': '-1'};
    } 
    res.json(userId);
});

app.post('/loadProfile', async (req, res) => {
    // Converting req into readable format
    // TODO: Sanitize input
    // TODO: Handle errors
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const userID = await getUID(fields.sessionID);

    if (userID == "-1") {
        console.log("Could not verify user's identity.");
    }
    const profileData = await mongoHelpers.loadProfile(userID); 
    res.json(profileData);
});
 
app.listen(8000, () => {
    console.log('Server is running on port 8000.');
});