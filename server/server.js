require('dotenv').config();

const express = require('express');
const cors = require('cors');
const formidable = require('express-formidable');
const fs = require('fs');
const sanitize = require('sanitize-filename');

const bcrypt = require('bcrypt');
const saltrounds = 10;

const mongoHelpers = require('./mongo-helpers');
const testDB = require('./test-db-functions');
const gridfsHelpers = require('./gridfs-helpers');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // May need to change to const MongoStore = require('connect-mongo')(session);

const { body, validationResult } = require('express-validator'); // For validating user input
const router = express.Router();

// const crypto = require('crypto'); // for generating random token
// const nodemailer = require('nodemailer'); // for sending emails
// // create a transporter object for nodemailer
// let transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: (process.env.EMAIL),
//         pass: (process.env.EMAIL_PASSWORD)
//     }
// });

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

app.get('/test', (req, res) => { // don't delete, necessary for unit tests
    res.json({message: "Test successful"});
});

// creating a new user from the sign-up form
app.post('/register', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    try{
        // hash the password
        const hashedPassword = await bcrypt.hash(fields.password, saltrounds);

        // Attempt to create a user  
        const userCreationResult = await mongoHelpers.createUser(fields.fullName, fields.email, hashedPassword, fields.isTest);
        if (userCreationResult.success) {
            res.status(201).send('User created successfully');
        }
        else if (!userCreationResult.success) {
            //res.status(400).send(userCreationResult.message);
            res.json({ status: 400, message: userCreationResult.message });
        }
    } catch (error) { 
        res.json({ status: 500, message: 'Server Error' });
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
        const name = "auto-test-file.jpg";
        const hub = "auto-test";
        const bucket = "auto-test";
        const ret = await gridfsHelpers.uploadFile(name, stream, hub, bucket);
        if (ret == null) res.json({status: 500});
        else res.json(ret);
    } else {
        const file = req.files.file;
        // check for file size
        const MAX_FILE_SIZE = 20000000; // 20 MB in bytes (change later)
        if (file.size > MAX_FILE_SIZE) {
            res.json({status: 413}); // status code for "file is too large"
        } else {
            const name = sanitize(file.name); // sanitize file name to remove control/reserved characters and etc.
            file.name = name;
            const hub = req.fields.hub;
            const bucket = req.fields.bucket;
            const stream = fs.createReadStream(file.path); // path here refers to the temporary location of the file within the server returned by mongoDB. It should not be accessible in any way by the client
            const ret = await gridfsHelpers.uploadFile(name, stream, hub, bucket);
            if (ret == null) res.json({status: 500});
            else res.json(ret);
        }
    }
});

app.post('/create-test', async (req, res) => {
    // console.log("before testDB creation");
    testDB.createTestDB();
    // console.log("after testDB creation");
    res.json("Created");
});

app.post('/destroy-test', async (req, res) => {
    // console.log("before testDB destruction");
    await testDB.destroyTestDB();
    // console.log("after testDB destruction");
    res.json("Destroyed");
});

// download file stream of file with give nname
// to access file data in the front end,
// use .blob() and URL.createObjectURL(blob)
// this will return a URL to use with <a href={url}>filename</a>
app.get('/download-file', async (req, res) => {
    const name = req.query.name;
    const hub = req.query.hub;
    const bucket = req.query.bucket;
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

// returns file stream of image with given name
// to access image data in the front end, 
//  use .blob() and URL.createObjectURL(blob)
// this will return a URL to use with <img src={url} />
app.get('/display-image', async (req, res) => {
    const name = req.query.name;
    var re = /(?:\.([^.]+))?$/;
    var ext = re.exec(name)[1];
    if (ext !== 'jpg' && ext !== 'png') {
        res.json({
            status: 422, // status code for unprocessable entity (wrong file format)
            message: `Invalid file format .${ext}`
        });
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

// app.post('/check-logged-in', async (req, res) => {
//     const fields = JSON.parse(Object.keys(req.fields)[0]);
//     const sessionID = fields.sessionID;
//     let uid = await getUID(sessionID);
//     res.json(uid);
//     // var userId = await mongoHelpers.isLoggedIn(uid); 

//     // if (userId === null) {
//     //     req.session.isLoggedIn = false;
//     //     req.session.userId = "-1";
//     // }
//     // else {
//     //     req.session.isLoggedIn = true;
//     //     req.session.userId = userId;
//     // }
//     // console.log(req.sessionID);
//     // res.json(req.session.userId);
// });

app.post('/create-hub', async (req, res) => {
    const formData = JSON.parse(Object.keys(req.fields)[0]);
    const userIDResponse = await mongoHelpers.getUserID(formData.sessionID);
    let hub = {
        name: formData.name,
        description: formData.description,
        owner: userIDResponse.userId
    };
    const newHub = await mongoHelpers.createHub(hub);
    const addToProfilesHids = await mongoHelpers.addToProfileHids(userIDResponse.userId, newHub.hid);
    res.json(newHub);
});

// returns a list of hub info to load into buttons in hubs.js
app.post('/hubs', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const uid = await getUID(fields.sessionID);
    const hids = await mongoHelpers.getHids(uid); // breaking here
    const hubInfo = await mongoHelpers.getHubInfo(hids);
    res.json(hubInfo);
});

app.post('/add-announcement', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const hid = fields.hid;
    const announcement = fields.announcement;
    const newAnnouncement = await mongoHelpers.addAnnouncement(hid, announcement);
});

// returns a single collection of hub info to load into a page hub-individual.js
app.post('/hub-individual', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const hid = fields.hid;
    const hubInfo = await mongoHelpers.getIndividualHubInfo(hid);
    //console.log(hubInfo);
    res.json(hubInfo);
});

app.post('/retrieve-members', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    const members = await mongoHelpers.retrieveMembers(fields);
    res.json(members);
});

app.get('/add-join-request', async (req, res) => {
    const accessCode = req.query.accessCode;
    const uid = Number(req.query.uid);
    const hub = await mongoHelpers.findHub(accessCode);
    // console.log(hub);
    if (uid === "-1") hub.status = 500;
    if (hub.status === 200) {
        let hid = hub.hid;
        const hubInfo = await mongoHelpers.getIndividualHubInfo(hid);
        if (hubInfo[0].whitelist?.includes(uid) || hubInfo[0].owner === uid) {
            res.json({status: 409}); // status code for conflict
        } else if (hubInfo[0].blacklist?.includes(uid)) {
            res.json({status: 406}) // status code for not acceptable
        } else if (hubInfo[0].join_requests?.includes(uid)) {
            res.json({status: 403}); // status code for already exists
        } else {
            hubInfo[0].join_requests.push(Number(uid));
            let ret = await mongoHelpers.updateHub(hubInfo[0]);
            res.json(ret);
        }
    } else {
        res.json({status: hub.status});
    }
});

app.get('/remove-join-request', async (req, res) => {
    const hid = req.query.hid;
    const uid = req.query.uid;
    const hubInfo = await mongoHelpers.getIndividualHubInfo(hid);
    hubInfo[0].join_requests = hubInfo[0].join_requests?.filter((jruid) => jruid !== Number(uid));
    let ret = await mongoHelpers.updateHub(hubInfo[0]);
    res.json(ret);
})

app.get('/add-member', async (req, res) => {
    const hid = req.query.hid;
    const uid = req.query.uid;
    const hubInfo = await mongoHelpers.getIndividualHubInfo(hid);
    if (hubInfo[0].whitelist?.includes(uid)) {
        res.json({status: 403}); // status code for already exists
    } else {
        let profile = await mongoHelpers.loadProfile(Number(uid), false);
        // console.log(profile);
        if (profile.hids === null) profile.hids = [];
        profile.hids.push(Number(hid));
        // console.log("Profile in add-member");
        // console.log(profile);
        // await mongoHelpers.addToProfileHids(uid, hid);
        await mongoHelpers.updateProfile(profile, uid);
        hubInfo[0].whitelist.push(Number(uid));
        let ret = await mongoHelpers.updateHub(hubInfo[0]);
        res.json(ret);
    }
});

app.get('/kick-member', async (req, res) => {
    const hid = req.query.hid;
    const uid = req.query.uid;
    let profile = await mongoHelpers.loadProfile(uid, false);
    console.log(profile);
    profile.hids = profile.hids?.filter((phid) => phid !== Number(hid));
    await mongoHelpers.updateProfile(profile, uid);
    const hubInfo = await mongoHelpers.getIndividualHubInfo(hid);
    // console.log(hubInfo);
    hubInfo[0].whitelist = hubInfo[0].whitelist?.filter((wluid) => wluid !== Number(uid));
    let ret = await mongoHelpers.updateHub(hubInfo[0]);
    res.json(ret);
});

app.get('/ban-member', async (req, res) => {
    const hid = req.query.hid;
    const uid = req.query.uid;
    const hubInfo = await mongoHelpers.getIndividualHubInfo(hid);
    if (hubInfo[0].blacklist?.includes(uid)) {
        res.json({status: 403}); // status code for already exists
    } else {
        let profile = await mongoHelpers.loadProfile(uid, false);
        profile.hids = profile.hids?.filter((phid) => phid !== Number(hid));
        await mongoHelpers.updateProfile(profile, uid);
        hubInfo[0].blacklist.push(Number(uid));
        let ret = await mongoHelpers.updateHub(hubInfo[0]);
        res.json(ret);
    }
});

app.get('/unban-member', async (req, res) => {
    const hid = req.query.hid;
    const uid = req.query.uid;
    const hubInfo = await mongoHelpers.getIndividualHubInfo(hid);
    hubInfo[0].blacklist = hubInfo[0].blacklist?.filter((wluid) => wluid !== Number(uid));
    let ret = await mongoHelpers.updateHub(hubInfo[0]);
    res.json(ret);
});

app.post('/update-hub', async (req, res) => {
    const fields = JSON.parse(Object.keys(req.fields)[0]);
    let hid = fields.hid;
    let hub = await mongoHelpers.getIndividualHubInfo(hid);
    hub = hub[0];
    let hubInfo = {
        hid: hub.hid,
        owner: hub.owner,
        name: fields.name,
        access_code: hub.access_code,
        whitelist: hub.whitelist,
        blacklist: hub.blacklist,
        description: fields.description,
        announcements: hub.announcements,
        join_requests: hub.join_requests
    };
    let result = await mongoHelpers.updateHub(hubInfo);
    res.json(result);
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
        const lockoutStatus = await mongoHelpers.checkLockout(fields.email, fields.isTest); // Check if user is locked out

        if (!lockoutStatus.exists) {
            res.json({ status: 401, message: "Invalid Credentials. Please try again." });
            return;
        }

        if (lockoutStatus.isLocked) {
            res.json({ status: 423, message: "Account is locked. Please try again later." });
            return;
        }
        // FOR DEBUGGING
        // console.log("GOT FIELDS");
        // console.log(fields);
        try {
            // var userId = await mongoHelpers.authenticateUser(fields.email, fields.password); 

            // implementing hashed passwords
            // fetch user's hashed password from the database
            const user = await mongoHelpers.authenticateUser(fields.email, fields.isTest);
            if (!user) {
                res.json({ status: 401, message: "Invalid Credentials. Please try again." });
                return;
            }
            // compare the hashed password with the password provided by the user
            
            const isMatch = await bcrypt.compare(fields.password, user.password);
            // console.log(isMatch);
            if (!isMatch) {
                // console.log("Invalid Credentials. Please try again.");
                req.session.isLoggedIn = false;
                req.session.userId = "-1";
                await mongoHelpers.incrementLoginAttempts(fields.email, fields.isTest); // Increment login attempts
                res.json({ status: 401, message: "Invalid Credentials. Please try again.", sessionID: req.sessionID});
                return;
            } else {
                await mongoHelpers.resetLoginAttempts(fields.email, fields.isTest); // Reset login attempts

                req.session.isLoggedIn = true;
                req.session.userId = user.uid;

                // FOR DEBUGGING
                // console.log("USER's SESSION ID");
                // console.log(req.sessionID); // Newly Created SessionID
                res.status(201).json(req.sessionID);
                //res.json(req.sessionID);
                return;
            }
        } catch (error) {
            // console.error("Authentication Error:", error);
            // res.status(500).json("Server Error");
            res.json({ status: 500, message: "Server Error" }); 
            return;
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
    const profile = await mongoHelpers.loadProfile(userID);
    fields.hids = profile.hids;
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
    const profileData = await mongoHelpers.loadProfile(userID, fields.isTest); 
    res.json(profileData);
});
 
app.listen(8000, () => {
    console.log('Server is running on port 8000.');
});

// Need to get OAuth to work for this to be able to send a password reset email from our Google account
// app.post('/forgot-password', async (req, res) => {
//     const fields = JSON.parse(Object.keys(req.fields)[0]);
//     const email = fields.email;
//     console.log(email);
//     try {
//         const user = await mongoHelpers.authenticateUser(email);
//         if (!user) {
//             res.json({ status: 404, message: "Email not found" });
//             return;
//         }

//         // Generate a random token
//         const token = crypto.randomBytes(20).toString('hex');
//         // Set token expiration
//         const tokenExpiration = Date.now() + 3600000; // 1 hour from now

//         // Update user in the database with token and expiration
//         await mongoHelpers.updatePasswordResetToken(email, token, tokenExpiration);
//         console.log('Token:', token);
//         // Send email to user with token
//         const resetURL = `http://localhost:3000/reset-password/${token}`;
//         const mailOptions = {
//             to: email,
//             from: 'your-email@gmail.com', // should match the transporter user
//             subject: 'Password Reset Request',
//             text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
//             Please click on the following link, or paste this into your browser to complete the process:\n\n
//             ${resetURL}\n\n
//             If you did not request this, please ignore this email and your password will remain unchanged.\n`
//         };

//         transporter.sendMail(mailOptions, function(error, info) {
//             if (error) {
//                 console.log('Error in sending email:', error);
//                 res.json({ status: 500, message: 'Error in sending email' });
//             } else {
//                 console.log('Email sent: ' + info.response);
//                 res.json({ status: 201, message: 'Email sent' });
//             }
//         });
//     } catch (error) {
//         console.error('Error in /forgot-password:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });