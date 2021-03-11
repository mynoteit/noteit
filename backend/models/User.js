const ObjectID = require("mongodb").ObjectID;
let usersCollection;

require("./utils/dbCollectionInit")(["users"])
  .then((collections) => {
    if (collections !== null) {
      [usersCollection] = collections;
    }
  })
  .catch((error) => console.log(error));

let setCollection = function (collection) {
  usersCollection = collection;
};

let User = function (data, provider) {
  this.data = data;
  this.provider = provider;
  this.errors = [];
};

User.prototype.validateAndCleanUp = function () {
  const validProperties = ["id", "email", "firstName", "lastName", "picture"];
  for (const property in this.data) {
    if (!validProperties.includes(property)) {
      return this.errors.push(`bogus property ${property} received`);
    }
    if (typeof this.data[property] !== "string") {
      return this.errors.push(
        `unacceptable value type on ${property} property`
      );
    }
  }

  this.data = {
    OAuthId: this.data.id,
    email: this.data.email.trim(),
    firstName: this.data.firstName,
    lastName: this.data.lastName,
    picture: this.data.picture,
    provider: this.provider,
    faculty: null,
    semester: null,
    roles: ["basic"], // ["basic", "contributor", "moderator", "admin"]
    isApproved: false,
    isSubscriptionExpired: false,
    joinedOn: new Date(),
    savedNotes: [],
    sessionCount: 0,
    lastLogin: new Date(),
  };
};

User.prototype.validateFacultyAndSemester = function (faculty, semester) {
  // faculty validation
  const acceptableFaculty = ["bim", "bca", "csit"];
  let isFacultyValid = false;
  for (let i = 0; i < acceptableFaculty.length; i++) {
    if (faculty == acceptableFaculty[i]) {
      isFacultyValid = true;
      break;
    }
  }
  if (!isFacultyValid) this.errors.push("faculty is not valid");

  // semester validation
  const acceptableSemester = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
  ];
  let isSemesterValid = false;
  for (let i = 0; i < acceptableSemester.length; i++) {
    if (semester == acceptableSemester[i]) {
      isSemesterValid = true;
      break;
    }
  }
  if (!isSemesterValid) this.errors.push("semester is not valid");
};

User.prototype.createUser = function () {
  return new Promise((resolve, reject) => {
    this.validateAndCleanUp();
    if (this.errors.length > 0) {
      return reject(this.errors);
    }
    usersCollection
      .insertOne(this.data)
      .then((newUser) => {
        if (newUser.ops[0]) return resolve(newUser.ops[0]);
        else return reject("Cannot create the user");
      })
      .catch((error) => console.log(error));
  });
};

User.prototype.sessionCountHandler = function (id, action) {
  return new Promise((resolve, reject) => {
    if (new ObjectID(id).toString() !== id.toString()) {
      return reject("Invalid ObjectID is provided.");
    }

    if (!["increment", "decrement"].includes(action)) {
      return reject(
        "Invalid action is provided. Only increment and decrement are accepted."
      );
    }

    if (action === "increment") {
      return usersCollection
        .findOneAndUpdate(
          { _id: new ObjectID(id) },
          { $inc: { sessionCount: 1 } },
          { returnOriginal: false }
        )
        .then((updatedUser) => {
          if (updatedUser.value) {
            resolve(updatedUser.value);
          } else reject("Cannot find the user");
        })
        .catch((err) => reject(err));
    }

    if (action === "decrement") {
      return usersCollection
        .findOneAndUpdate(
          { _id: new ObjectID(id) },
          { $inc: { sessionCount: -1 } },
          { returnOriginal: false }
        )
        .then((updatedUser) => {
          if (updatedUser.value) {
            resolve(updatedUser.value);
          } else reject("Cannot find the user");
        })
        .catch((err) => reject(err));
    }
  });
};

User.prototype.saveFacultyAndSemester = function (faculty, semester) {
  return new Promise((resolve, reject) => {
    if (typeof faculty !== "string" || typeof semester !== "string") {
      return reject("Unacceptable values are provided");
    }

    faculty = faculty.toLowerCase();
    semester = semester.toLowerCase();

    this.validateFacultyAndSemester(faculty, semester);

    if (!this.errors.length) {
      usersCollection
        .findOneAndUpdate(
          { _id: new ObjectID(this.data._id) },
          {
            $set: {
              faculty: faculty,
              semester: semester,
            },
          },
          { returnOriginal: false }
        )
        .then((updatedUser) => {
          if (updatedUser.value) return resolve(updatedUser.value);
          return reject("The requested user cannot be found");
        })
        .catch((error) => {
          console.log(error);
          return reject("rejected for server-side error");
        });
    } else {
      return reject(this.errors);
    }
  });
};

User.prototype.saveNotesHandler = function (noteId, action = "save") {
  return new Promise((resolve, reject) => {
    if (
      !ObjectID.isValid(noteId) ||
      new ObjectID(noteId).toString() !== noteId.toString()
    ) {
      return reject("Invalid ObjectID is provided for that note.");
    }

    if (!["save", "remove"].includes(action)) {
      return reject(
        "Invalid action is provided. Only save and remove are accepted."
      );
    }

    let queryObject =
      action === "save"
        ? { $push: { savedNotes: noteId } }
        : { $pull: { savedNotes: noteId } };

    usersCollection
      .findOneAndUpdate({ _id: new ObjectID(this.data._id) }, queryObject, {
        returnOriginal: false,
      })
      .then((updatedUser) => {
        if (updatedUser.value) resolve(updatedUser.value);
        else reject("Cannot find the user");
      })
      .catch((error) => console.log(error));
  });
};

User.prototype.findSavedNotes = function () {
  return new Promise((resolve, reject) => {
    usersCollection
      .findOne({ _id: new ObjectID(this.data._id) })
      .then((user) => {
        if (user) resolve(user.savedNotes);
        else reject("Cannot find the user");
      })
      .catch((error) => console.log(error));
  });
};

User.prototype.findBy = function ({ criteria, value, update }) {
  return new Promise((resolve, reject) => {
    if (
      typeof criteria !== "string" ||
      !["ObjectId", "OAuthId", "email", "faculty", "semester", "role"].includes(
        criteria
      )
    ) {
      return reject({
        reason: "invalidArgument",
        message: "Invalid criteria is provided",
      });
    }

    if (
      update &&
      (typeof update !== "string" || !["lastLogin"].includes(update))
    ) {
      return reject({
        reason: "invalidArgument",
        message: "Invalid update value is provided",
      });
    }

    let queryObject,
      atMostOne = false;
    switch (criteria) {
      case "ObjectId":
        queryObject = { _id: new ObjectID(value) };
        atMostOne = true;
        break;
      case "OAuthId":
        queryObject = { OAuthId: value };
        atMostOne = true;
        break;
      case "email":
        queryObject = { email: value };
        atMostOne = true;
        break;
      case "faculty":
        queryObject = { faculty: value };
        break;
      case "semester":
        queryObject = { semester: value };
        break;
      case "role":
        queryObject = { roles: value };
        break;
    }

    if (!update) {
      usersCollection
        .find(queryObject)
        .toArray()
        .then((users) => {
          if (users.length) {
            if (atMostOne) {
              return resolve(users[0]);
            } else {
              return resolve(users);
            }
          }
          return reject({
            reason: "noUser",
            message: `Cannot find any user with that ${criteria}`,
          });
        })
        .catch((error) => console.log(error));
    } else {
      let updateFilter;
      switch (update) {
        case "lastLogin":
          updateFilter = {
            $set: {
              lastLogin: new Date(),
            },
          };
          break;
      }
      usersCollection
        .findOneAndUpdate(queryObject, updateFilter, { returnOriginal: false })
        .then((updatedUser) => {
          if (updatedUser.value) {
            return resolve(updatedUser.value);
          } else {
            return reject({
              reason: "noUser",
              message: `Cannot find any user with that ${criteria} to update`,
            });
          }
        })
        .catch((err) => console.log(err));
    }
  });
};

module.exports = { User, setCollection };
