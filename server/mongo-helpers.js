require('dotenv').config();

const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stagemanagersbook.mv9wrc2.mongodb.net/";
const mongoclient = new MongoClient(uri);
mongoclient.connect();

module.exports = {

    getUserID: async function (sessionID) {
        try {
            const testBase = mongoclient.db('test');
            const sessions = testBase.collection('sessions');
        
            // query
            const query = { _id: sessionID};
            const response = await sessions.findOne(query);

            if (!response) {
                return {'uid': "-1"};
            }
        
            console.log("ACCESSED SESSION IDs from DATABASE");
            console.log(response.session);
            const userData = JSON.parse(response.session);
            console.log("Getting userID");
            console.log(userData);
            console.log(userData.userId);
            return userData;
        
        } catch (err) {
            console.log(err);
            console.log("PROFILE NOT FOUND");
            return {'uid': "-1"};
        } 
    },


    authenticateUser: async function (uname, pword) {
        try {
            const credentialsBase = mongoclient.db('credentials');
            const credentials = credentialsBase.collection('credentials');
            console.log("LOGIN CREDS");
            console.log(uname);
            console.log(pword);
        
            // query
            const query = { username: uname, password: pword };
            const userProfile = await credentials.findOne(query);
        
            // console.log(userProfile.uid);
            console.log(userProfile);
            // console.log(userProfile.uid);
            return userProfile;
        
        } catch (err) {
            console.log(err);
            console.log("PROFILE NOT FOUND");
            return {'uid': "-1"};
        } 
    },

    loadProfile: async function (userId) {
        try {
            const profilesBase = mongoclient.db('profiles');
            const profiles = profilesBase.collection('profiles');
        
            // query
            const query = { uid: userId};
            console.log("Getting user profile with this query:");
            console.log(query);
            var userProfile = await profiles.findOne(query);
        
            // console.log(userProfile.uid);
            console.log("GOT USER PROFILE!!");
            console.log(userProfile);
            // console.log(userProfile.uid);
            console.log("CLOSED MONGOCLIENT");
            if (userProfile == null) {
                console.log("USER PROFILE IS NULL.");
                userProfile = {'uid': "-1", 'name': "NOT FOUND", 'bio': "NOT FOUND", 'email_address': "NOT FOUND", 
                'phone_number': "NOT FOUND", 'pronouns': "NOT FOUND", 'roles': "NOT FOUND"};
            }
            return userProfile;
        
        } catch (err) {
            console.log(err);
            console.log("PROFILE NOT FOUND");
            return {'uid': "-1"};
        } 
    },

    getBio: async function (userId) {
        try {
            const profilesBase = mongoclient.db('profiles');
            const profiles = profilesBase.collection('profiles');

            console.log("USER ID");
            console.log(userId.uid);
            const query = { uid: userId.uid};
            const userProfile = await profiles.findOne(query);

            if (userProfile == null) {
                userProfile = {'uid': "-1", 'name': "NOT FOUND", 'bio': "NOT FOUND", 'email_address': "NOT FOUND", 
                'phone_number': "NOT FOUND", 'pronouns': "NOT FOUND", 'roles': "NOT FOUND"};
            }
        
            // console.log(userProfile.uid);
            console.log(userProfile);
            // console.log(userProfile.uid);
            return userProfile;
        
        } catch (err) {
            console.log(err);
            console.log("PROFILE NOT FOUND");
            return {'uid': "-1", 'name': "NOT FOUND", 'bio': "NOT FOUND", 'email_address': "NOT FOUND", 
            'phone_number': "NOT FOUND", 'pronouns': "NOT FOUND", 'roles': "NOT FOUND"};
        } 
    },

    createProfile: async function (f) {
        try {

            // Connecting to current Database
            const credentialsBase = mongoclient.db('credentials');
            const credentials = credentialsBase.collection('credentials');

            // Getting next UserID
            var thisUID = -1;
            const countQuery = { username : "UNIQUE_COUNT_DOCUMENT_IDENTIFIER", password : "UNIQUE_COUNT_DOCUMENT_IDENTIFIER"};
            const countResult = await credentials.findOneAndUpdate(
                countQuery,
                { $inc: { count : 1 } }
            );
            console.log("COUNT RESULT");
            console.log(countResult);
            thisUID = countResult.count;

            // Connecting to profiles database
            const profilesBase = mongoclient.db('profiles');
            const profiles = profilesBase.collection('profiles');

            const doc = { uid: thisUID, name: f.name, bio: f.bio, phone_number: f.phoneNumber,
                          email_address: f.email, pronouns: f.pronouns, roles: f.roles};
            const result = await profiles.insertOne(doc);

            // TODO: Error handling if "result" is not created properly
        
            // console.log(userProfile.uid);
            console.log(result);
            return {'uid': thisUID};
        
        } catch (err) {
            console.log(err);
            console.log("COULD NOT CREATE PROFILE");
            return {'uid': "-1"};
        } 
    },

    updateProfile: async function (f, userId) {
        try {
            // Connecting to profiles database
            const profilesBase = mongoclient.db('profiles');
            const profiles = profilesBase.collection('profiles');

            // Updating record
            const result = await profiles.updateOne(
                { uid: userId },
                {
                    $set: {
                        name: f.name,
                        bio: f.bio,
                        phone_number: f.phoneNumber,
                        email_address: f.email,
                        pronouns: f.pronouns,
                        roles: f.roles
                    }
                }
            );

            // TODO: Error handling if "result" is not created properly
        
            // console.log(userProfile.uid);
            console.log(result);
            console.log("UPDATE PROFILE ABOUT TO RETURN");
            return {'uid': f.uid};
        
        } catch (err) {
            console.log(err);
            console.log("COULD NOT CREATE PROFILE");
            return {'uid': "-1"};
        } 
    },

    getHids: async function (userId) {
        try {
            const profilesBase = mongoclient.db("profiles");
            const profiles = profilesBase.collection("profiles");
            //console.log("UID");
            //console.log(userId);

            // query
            const query = { uid: userId };
            const userProfile = await profiles.findOne(query);
        
            //console.log(userProfile.uid);
            //console.log(userProfile);
            // console.log(userProfile.uid);
            return userProfile.hids;
        
        } catch (err) {
            console.log(err);
            console.log("HIDS NOT FOUND");
            return {'uid': "-1"};
        }
    },

    getHubInfo: async function (hids) {
        try {
            const db = mongoclient.db("hubs");
            const collection = db.collection("hub_info");
            var hubInfo = [];
            for(let i = 0; i < hids.length; i++) {
                const query = { hid: hids[i] };
                const hub = await collection.findOne(query);
                hubInfo.push(hub);
            }
            return hubInfo;
        } catch (err) {
            console.log(err);
            console.log("HUB INFO NOT FOUND");
            return {'uid': "-1"};
        }
    },

    getIndividualHubInfo: async function (hid) {
        try {
            const db = mongoclient.db("hubs");
            const collection = db.collection("hub_info");
            var hubInfo = [];
            const query = { hid: hid };
            const hub = await collection.findOne(query);
            hubInfo.push(hub);
            return hubInfo;
        } catch (err) {
            console.log(err);
            console.log("HUB INFO NOT FOUND");
            return {'uid': "-1"};
        }
    },

    retrieveMembers : async function (whitelist) {
        try {
            const db = mongoclient.db("profiles");
            const collection = db.collection("profiles");
            var members = [];
            for(let i = 0; i < whitelist.length; i++) {
                const query = { uid: whitelist[i] };
                const member = await collection.findOne(query);
                members.push(member);
            }
            return members;
        } catch (err) {
            console.log(err);
            console.log("MEMBER ERROR");
            return {'uid': "-1"};
        }
    }
}