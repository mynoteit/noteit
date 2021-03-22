const jwt = require("jsonwebtoken");
const { Contributor } = require("@models/Contributors");
const { Follow } = require("@models/Follow");
const sendGrid = require("@sendgrid/mail");
const fs = require("fs");
const path = require("path");

exports.showContributorScreen = (req, res) => {
  res.renderTemplate("index", { toRender: "contributors/contributor-screen" });
};

exports.getAll = (req, res) => {
  Contributor.getAll()
    .then((response) => res.status(200).json(response))
    .catch((error) => res.send(error));
};

exports.getOne = (req, res) => {
  Contributor.getOne(req.params.username)
    .then((response) => {
      response.isVisitorTheRequestedContributor = false;
      if (req.user) {
        if (req.user._id.toString() === response.userId.toString())
          response.isVisitorTheRequestedContributor = true;

        //check if the visitor is following the requested contributor

        Follow.isVisitorFollowing(response._id, req.user._id)
          .then(() => {
            response.isVisitorFollowing = true;
            res.renderTemplate("index", {
              toRender: "contributors/contributor-profile",
              data: {
                contributor: response,
              },
            });
          })
          .catch(() => {
            response.isVisitorFollowing = false;
            res.renderTemplate("index", {
              toRender: "contributors/contributor-profile",
              data: {
                contributor: response,
              },
            });
          });
      }
    })
    .catch((error) => {
      req.flash("errors", error);
      req.session.save(() => {
        if (req.session.user) res.redirect("/home");
        else res.redirect("/");
      });
    });
};

/**
 *
 * @description if already registered and approved, returns by responding 202 and JWT, else if registered but not approved yet, returns by responding 200, else returns by calling next().
 */

exports.isContributorAlreadyRegistered = (req, res, next) => {
  let { id } = req.body;
  let contributor = new Contributor();
  contributor
    .findBy({
      criteria: "OAuthId",
      value: id,
    })
    .then((contributor) => {
      if (contributor && contributor.isApproved) {
        const message = jwt.sign(
          { contributor: { _id: contributor._id, name: contributor.name } },
          process.env.JWTSECRET,
          {
            expiresIn: "30m",
          }
        );
        return res.status(202).json({ message });
      } else return res.status(200).json({ message: "Wait for Approval" });
    })
    .catch((error) => {
      if (error === "Cannot find any contributor with that OAuthId") {
        return next();
      } else res.status(500).json({ message: error });
    });
};

exports.create = (req, res) => {
  const contributor = new Contributor(req.body);
  contributor
    .create()
    .then(() =>
      res
        .status(201)
        .json({ message: "Contributor is created, Wait for approval." })
    )
    .catch((error) => {
      if (error.clientError) {
        return res.status(400).json({ message: error.clientError });
      }
    });
};

exports.cleanUpNoteDetails = (details) => {
  const { unit, title, subject, faculty, semester } = details;
  for (value in details) {
    if (typeof details[value] !== "string") {
      return false;
    }
  }
  return true;
};

exports.createNoteFileAndMail = (req, res) => {
  const { details, note } = req.body;
  const contributor = req.payload.contributor; /*(contributor's id and name) */
  console.log(`${contributor.name} is trying to submit "${details.title}"`);

  const isDataValid = this.cleanUpNoteDetails(details);

  // validate "note" as well. As well as a lot of other security issues.

  if (!isDataValid) {
    return res
      .status(400)
      .json({ message: "Unacceptable value type received" });
  }

  // create file and put the body

  // create the directory first if it doesn't exist
  const absoluteDir = path.join(__dirname, "../contributedNotes");

  fs.mkdir(absoluteDir, { recursive: true }, (err) => {
    if (err) throw new Error(err);

    // if no error, write new file
    createFile();
  });

  function createFile() {
    fs.writeFile(
      `${absoluteDir.toString()}/${contributor.name}.html`,
      note,
      (err) => {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        }
        afterFileCreation(
          res,
          { contributor, details },
          `${absoluteDir.toString()}/${contributor.name}.html`
        );
      }
    );
  }
};

function afterFileCreation(res, { contributor, details }, attachment) {
  const { unit, title, subject, faculty, semester } = details;

  sendGrid.setApiKey(process.env.SENDGRID_API);

  attachmentEncoded = fs.readFileSync(attachment).toString("base64");

  const message = {
    to: process.env.ADMIN_MAIL,
    from: "noteitteam@gmail.com",
    subject: `${contributor.name} has submitted a new note.`,
    text: `unit no. ${unit} titled "${title}" of "${subject}" subject for ${semester} semester, ${faculty}.`,
    attachments: [
      {
        content: attachmentEncoded,
        filename: `${unit}_${subject}_${semester}_${faculty}.html`,
        type: "text/html",
        disposition: "attachment",
      },
    ],
  };

  console.log("runs");

  sendGrid
    .send(message)
    .then(() => {
      fs.unlink(attachment, (err) => {
        if (err) return res.status(500).send(err);

        res.status(202).json({
          message: "You have successfully submitted the Note. Thank You!!",
        });
      });
    })
    .catch((error) => res.status(500).send(error));
}

exports.remove = (req, res) => {
  if (!req.recentlyRemovedContributor) {
    res
      .status(500)
      .send(
        "inside contributorsController, 'req.recentlyRemovedContributor' is undefined"
      );
    return;
  }
  Contributor.removeOne(req.recentlyRemovedContributor._id)
    .then(() => res.send("success"))
    .catch((error) => console.log(error));
};

exports.editContacts = (req, res) => {
  Contributor.editContacts(req.body)
    .then((editedProfile) => res.status(201).send(editedProfile))
    .catch((error) => res.send(error));
};
