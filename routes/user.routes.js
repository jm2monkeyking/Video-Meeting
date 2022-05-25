const { check } = require("express-validator");
const permission = require("../utils/permission");
const response = require("../utils/response");
const db = require("../models");
const UserModel = db.users;
const crypto = require("crypto");

module.exports = (app) => {
  const users = require("../controllers/user.controller.js");

  var router = require("express").Router();

  // Retrieve a single Tutorial with id
  router.use(async function (req, res, next) {
    // console.log(req);
    if (
      req.originalUrl == "/api/user/changepassword" ||
      req.originalUrl == "/api/user/profile"
    ) {
      next();
    } else {
      if (await permission.checkPermission(req, "user")) {
        next();
      } else {
        response.permissionDenied(req, res);
      }
    }
  });
  // Create a new users
  router.post(
    "/",
    check("mode")
      .not()
      .isEmpty()
      .withMessage("please specified your operation"),
    check("userID").custom((value, { req }) => {
      let flag = value == undefined || value == null || value == "";
      if (req.body.mode == "Edit" && flag)
        return Promise.reject("userID cannot be empty");
      return true;
    }),
    check("email")
      .isEmail()
      .withMessage("Invalid input format")
      .not()
      .isEmpty()
      .withMessage("email cannot be empty")
      .custom(async (value, { req }) => {
        const user = await UserModel.findOne({ where: { email: value } });
        if (user != null && req.body.userID != user.userID) {
          return Promise.reject("Email already taken");
        }
      }),
    check("roleID").not().isEmpty().withMessage("role cannot be empty"),
    check("name").not().isEmpty().withMessage("name cannot be empty"),
    users.create
  );

  router.post(
    "/changepassword",
    check("current")
      .not()
      .isEmpty()
      .withMessage("Password cannot be empty")
      .custom(async (value, { req }) => {
        const user = await UserModel.findByPk(req.body.LOGGEDIN_USERID);
        if (user == null) return Promise.reject("Invalid User");
        const password = crypto
          .createHash("sha256")
          .update(`${process.env.SERVER_SALT}${value}`)
          .digest("hex");
        if (password != user.password) {
          return Promise.reject("Wrong current Password");
        }
      }),
    check("password").not().isEmpty().withMessage("Password cannot be empty"),

    users.changePassword
  );
  router.get("/profile", users.profile);

  // Retrieve all users
  router.get("/", users.findAll);
  router.get("/:id", users.findOne);
  router.post("/restoreRecord", users.restoreRecord);

  app.use("/api/user", router);
};
