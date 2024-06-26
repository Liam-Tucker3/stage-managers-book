require('dotenv').config();

// searches bucket for file with same name
const searchName = async function (bucket, name) {
    let files = bucket.find({});
    for await (const file of files) {
        // console.log("checking " + file.filename + " with " + name);
        if (file.filename == name) return true;
    }
    return false;
}

// increments a number at the end of the filename until it is unique
const incrementName = async function (bucket, name) {
    var re = /(?:\.([^.]+))?$/;
    var ext = re.exec(name)[0];
    var basename = name.substring(0, name.length - ext.length);
    let notunique = true;
    let ver = 0;
    var newname;
    while (notunique) {
        ver++;
        newname = basename + ' (' + ver.toString() + ')' + ext;
        notunique = await searchName(bucket, newname);
    }
    return newname;
}

const { MongoClient, GridFSBucket } = require("mongodb");
const uri = "mongodb+srv://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stagemanagersbook.mv9wrc2.mongodb.net/";
const mongoclient = new MongoClient(uri);
mongoclient.connect();

// https://mongodb.github.io/node-mongodb-native/6.3/classes/GridFSBucket.html
module.exports = {
    /*
    name - file name
    stream - file stream to upload to mongodb
    hubName - name of hub to store file in
    bucketName - name of bucket to store file in
    */
    uploadFile: async function (name, stream, hubName, bucketName) {
        try {
            const db = mongoclient.db(hubName);
            const bucket = new GridFSBucket(db, {bucketName: bucketName});
            let found = await searchName(bucket, name);
            if (found) name = await incrementName(bucket, name);
            const upstream = bucket.openUploadStream(name);
            const res = stream.pipe(upstream);
            return {
                name: res.filename,
                id: res.id
            };
        } catch (err) {
            console.log(err);
            return null;
        }
    },

    /*
    name - file name
    hubName - name of hub to download file from
    bucketName - name of bucket to download file from
    */
    downloadFile: async function (name, hubName, bucketName) {
        try {
            const db = mongoclient.db(hubName);
            const bucket = new GridFSBucket(db, {bucketName: bucketName});
            let found = await searchName(bucket, name);
            if (found) {
                let ret = await bucket.openDownloadStreamByName(name);
                return ret;
            }
            return {status: 404};
        } catch (err) {
            console.log(err);
            return null;
        }
    },

    /*
    name - file name
    hubName - name of hub to delete file from
    bucketName - name of bucket to delete file from
    */
    deleteFile: async function (name, hubName, bucketName) {
        try {
            const db = mongoclient.db(hubName);
            const bucket = new GridFSBucket(db, {bucketName: bucketName});
            let files = bucket.find({});
            let numFiles = 0;
            let deleted = false;
            for await (const file of files) {
                numFiles++;
                if (file.filename == name) {
                    bucket.delete(file._id);
                    deleted = true;
                }
            }
            
            if (deleted) {
                if (numFiles == 1) { // check if last file in bucket
                    bucket.drop(); // if so, delete bucket
                }
                return {status: 200};
            }
            return {status: 404};
        } catch (err) {
            console.log(err);
            return null;
        }
    },

    /*
    hubName - name of hub to get filenames from
    bucketName - name of bucket to get filenames from
    */
    getFilenames: async function (hubName, bucketName) {
        try {
            const db = mongoclient.db(hubName);
            const bucket = new GridFSBucket(db, {bucketName: bucketName});
            const res = bucket.find({});
            var filenames = [];

            for await (const file of res) {
                // console.log(file);
                filenames.push(file.filename);
            }
            // console.log(filenames);
            return filenames;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
}