const { MongoClient, ObjectID } = require("mongodb");
const fetch = require("node-fetch");
const { User, setCollection } = require("../../User");
require("dotenv").config();

describe("create", () => {
  let connection;
  let db;
  let usersCollection;

  beforeAll(async () => {
    connection = await MongoClient.connect("mongodb://localhost/test", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db();
    usersCollection = db.collection("users");
    setCollection(usersCollection);
  });

  afterAll(async () => {
    db.collection("users").deleteMany({});
    await connection.close();
  });

  const googleOAuthData = {
    id: "123456GoogleID",
    email: "test@testing.com",

    firstName: "Rahul",
    lastName: "Dahal",
    picture: "https://pictureAPI.com",
  };
  const newUser = new User(googleOAuthData, "google");

  test("should resolve by saving faculty and semester", async () => {
    const user = await newUser.create();
    const thatUserData = new User(user);
    const { faculty, semester } = await thatUserData.saveFacultyAndSemester(
      "bim",
      "FirSt"
    );
    expect({ faculty, semester }).toEqual({
      faculty: "bim",
      semester: "first",
    });
  });

  test("should reject for conflict in type of arguments", async () => {
    const user = new User(googleOAuthData, "google");
    await user.create();
    const thatUserData = new User(user);
    try {
      await thatUserData.saveFacultyAndSemester({}, {});
    } catch (rejectionMessage) {
      expect(rejectionMessage.message).toEqual(
        "Unacceptable values are provided"
      );
    }
  });

  test("should reject for conflict in the acceptable enum", async () => {
    const user = new User(googleOAuthData, "google");
    await user.create();
    const thatUserData = new User(user);
    try {
      await thatUserData.saveFacultyAndSemester("bbs", "ninth");
    } catch (rejectionMessage) {
      expect(rejectionMessage).toEqual(
        expect.arrayContaining([
          "faculty is not valid",
          "semester is not valid",
        ])
      );
    }
  });

  test("should reject for bogus values", async () => {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/minimaxir/big-list-of-naughty-strings/master/blns.json"
      );
      const bogusValues = await response.json();
      const asyncPromises = [];
      const user = new User(googleOAuthData, "google");
      await user.create();

      for (let i = 0; i < bogusValues.length; i += 2) {
        const thatUserData = new User(user);
        if (i + 1 < bogusValues.length) {
          asyncPromises.push(
            thatUserData.saveFacultyAndSemester(
              bogusValues[i],
              bogusValues[i + 1]
            )
          );
        } else {
          asyncPromises.push(
            thatUserData.saveFacultyAndSemester(bogusValues[i], "")
          );
        }
      }
      await Promise.all(asyncPromises);
    } catch (rejectionMessage) {
      expect(rejectionMessage).toEqual(
        expect.arrayContaining([
          "faculty is not valid",
          "semester is not valid",
        ])
      );
    }
  });

  test("should reject for unmatched objectID", async () => {
    const thatUserData = new User({ _id: new ObjectID() });
    try {
      await thatUserData.saveFacultyAndSemester("bim", "fourth");
    } catch (rejectionMessage) {
      expect(rejectionMessage.message).toEqual(
        "The requested user cannot be found"
      );
    }
  });
});
