var express = require('express');
var bodyParser = require('body-parser');

// Initialize http server
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const MongoClient = require('mongodb').MongoClient;
const uri = process.env.MONGODB_URI;

// Handle Sign In
app.post('/', (req, res) => {
  let userID = req.body.userID;
  let username = req.body.username;
  let userEmail = req.body.email;
  let photoUrl = req.body.photoUrl;

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("connection is working");
    collection.findOne({ userID: userID }, (error, doc) => {
      if (error) return next(error);
      //If user is not registered in diddit DB
      if (doc === null) {
        console.log("No Such User, Creating new one");
        collection.insertOne({ userID: userID, username: username, userEmail: userEmail, userPhoto: photoUrl, projects: {} }, (error, results) => {
          if (error) {
            return res.json({ "error": "something went wrong creating new user" });
          } else {
            console.log("New User Created");
            console.log(results);
            res.json({ newUser: true, username: username, userID: userID, projects: {} });
          }
        })
        //If user is registered in DB
      } else {
        res.json({
          username: username,
          userID: userID,
          projects: doc.projects,
          
        });
      }
    })
  })
})


//Handle add project

app.post('/newProject', (req, res) => {
  let userID = req.body.userID;
  let projectName = req.body.projectName;
  let date = req.body.date;
  let projectColor = req.body.projectColor;
  let projectKey = `projects.${projectName}`

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("connection is working, will try to add proejcts");
    collection.updateOne({ userID: userID },
      {
        $set: {
          [projectKey]: {
            creationDate: date,
            color: projectColor,
            log: [],
            projectTime: 0,
          }
        }
      },
      (error, doc) => {
        if (error) return console.log(error);
        if (doc == null) {
          console.log("Can't find user to add project.")
          res.sendStatus(404);
        } else {
          console.log("Added project", doc);
          res.sendStatus(200);
        }
      }
    )
  })
})

//Handle remove project

app.post('/removeProject', (req, res) => {
  let userID = req.body.userID;
  let projectName = req.body.projectName;
  let projectKey = `projects.${projectName}`
  console.log("user", userID);
  console.log("project", projectName);

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("connection is working, will try to remove project");
    collection.updateOne({ userID: userID },
      {
        $unset: {
          [projectKey]: '',
        }
      },
      (error, doc) => {
        if (error) return console.log(error);
        if (doc == null) {
          console.log("Can't find user to remove project.")
          res.sendStatus(404);
        } else {
          console.log("Removed project", doc.result);
          res.sendStatus(200);
        }
      }
    )
  })
})

//Handle Log activity

app.post('/log', (req, res) => {
  let userID = req.body.userID;
  let projectName = req.body.projectName;
  let taskName = req.body.taskName;
  let date = req.body.date;
  let taskTime = req.body.taskTime;
  let projectKeyLog = `projects.${projectName}.log`;
  let projectKeyTime = `projects.${projectName}.projectTime`

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("connection is working, will try to add task");
    collection.updateOne({ userID: userID },
      {
        $push: {
          [projectKeyLog]: {
            projectName: projectName,
            taskName: taskName,
            taskTime: taskTime,
            date: date
          }
        },
        $inc: {
          [projectKeyTime]: taskTime
        }
      },
      (error, doc) => {
        if (error) return console.log(error);
        if (doc == null) {
          console.log("Can't find user to log.")
          res.sendStatus(404);
        } else {
          console.log("Found user to update");
          res.sendStatus(200);
        }
      })
  })
})

//Handle Remove Task

app.post('/removeTask', (req, res) => {
  let userID = req.body.userID;
  let projectName = req.body.projectName;
  let taskDate = req.body.taskDate;
  let taskTime = req.body.taskTime;
  let taskKey = `projects.${projectName}.log`;
  let projectKeyTime = `projects.${projectName}.projectTime`;
  console.log("taskTime", taskTime);

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("connection is working, will try to remove project");
    collection.updateOne({ userID: userID },
      {
        $pull: {
          [taskKey]: {date: taskDate},
        },
        $inc: {
          [projectKeyTime]: (taskTime * -1)
        }
      },
      (error, doc) => {
        if (error) return console.log(error);
        if (doc == null) {
          console.log("Can't find user to remove project.")
          res.sendStatus(404);
        } else {
          console.log("Removed task", doc.result);
          res.sendStatus(200);
        }
      }
    )
  })
})

//Handle Get Actvitiy Log

app.post("/showLog", (req, res, next) => {
  let userID = req.body.userID;

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("connection is working");

    collection.findOne({ userID: userID }, (error, doc) => {
      console.log("Getting user data...");
      if (error) res.send(error);
      if (doc == null) {
        next("Can't find user");
      } else {
        console.log("Here's the data", doc.projects);
        res.json({ projects: doc.projects, userID: userID });
      }
    })
  })
})

//Handle get single project Log
app.post('/showSingleLog', (req, res) => {
  let userID = req.body.userID;
  let projectName = req.body.projectName;

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("showSingleLog - connection is working");

    collection.findOne({ userID: userID }, (error, doc) => {
      console.log("Getting user data...");
      if (error) res.send(error);
      if (doc == null) {
        next("Can't find user");
      } else {
        console.log("Here's the data");
        res.json({ projects: doc.projects[projectName].log, userID: userID });
      }
    })
  })
})

// Handle Save User Settings
app.post('/saveSettings', (req, res) => {
  let userID = req.body.userID;
  let {
    switchValue,
    thumbColor,
    sessionValue,
    shortBreakValue,
    longBreakValue
  } = req.body.settings;

  console.log(req.body);
  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("Settings - connection is working");
    collection.updateOne({ userID: userID },
      {
        $set: {
          settings: {
            styles: !switchValue ? "lightStyles" : "darkStyles",
            thumbColor: thumbColor,
            sessionValue: sessionValue,
            shortBreakValue: shortBreakValue,
            longBreakValue: longBreakValue
          }
        }
      },
      (error, doc) => {
        if (error) return next(error);
        if (doc == null) {
          console.log("Can't find user to save settings.")
          res.sendStatus(404);
        } else {
          console.log("Found user to update settings");
          res.sendStatus(200);
        }
      })
  })
})

//Handle Loading of user settings on Log In
app.post("/getSettings", (req, res, next) => {
  let username = req.body.username;

  MongoClient.connect(uri, { useNewUrlParser: true }, (error, client) => {
    if (error) return process.exit(1);
    var db = client.db('Pomodoro');
    var collection = db.collection('Users');
    console.log("Get Settings - connection is working");

    collection.findOne({ username: username }, (error, doc) => {
      console.log("Getting user settings...");
      if (error) res.send(error);
      if (doc == null) {
        next("Can't find user");
      } else if (!doc.settings) {
        console.log("server didnt find any settings")
        res.json({ username: username, settings: null });
      } else {
        res.json({
          username: username,
          settings: {
            styles: doc.settings.styles,
            sessionValue: doc.settings.sessionValue,
            shortBreakValue: doc.settings.shortBreakValue,
            longBreakValue: doc.settings.longBreakValue,
          }
        });
      }
    })
  })
})

// Launch the server on port 3000
/*const server = app.listen(3000, () => {
  const { address, port } = server.address();
  console.log(`Listening at http://${address}:${port}`);
});
*/

module.exports = app;
