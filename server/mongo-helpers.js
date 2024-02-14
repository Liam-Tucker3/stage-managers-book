require('dotenv').config();

module.exports = {
    // searches drive for all files
    // id - id of specific file to search for
    authenticateUser: async function (uname, pword) {

        const { MongoClient } = require("mongodb");
        const uri = "mongodb+srv://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stagemanagersbook.mv9wrc2.mongodb.net/";
        console.log(uri)
        const mongoclient = new MongoClient(uri);

        try {
            const credentialsBase = mongoclient.db('credentials');
            const credentials = credentialsBase.collection('credentials');
            console.log("LOGIN CREDS");
            console.log(uname);
            console.log(pword);
        
            // Query for a movie that has the title 'Back to the Future'
            const query = { username: uname, password: pword };
            const userProfile = await credentials.findOne(query);
        
            // console.log(userProfile.uid);
            console.log(userProfile);
            // console.log(userProfile.uid);
            await mongoclient.close();
            return userProfile
        
        } catch (err) {
            console.log(err);
            console.log("PROFILE NOT FOUND")
            return {'uid': "-1"};
        } 
    }
}