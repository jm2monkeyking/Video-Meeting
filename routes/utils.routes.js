const { check } = require("express-validator");

module.exports = (app) => {
  const utils = require("../controllers/utils.controller.js");

  var router = require("express").Router();

  router.get("/options/:module", utils.options);
  router.post("/delete/:module", utils.delete);
  router.post(
    "/contactus",
    check("name").not().isEmpty().withMessage("name cannot be empty"),
    check("country").not().isEmpty().withMessage("country cannot be empty"),
    check("contact").not().isEmpty().withMessage("contact cannot be empty"),
    check("message").not().isEmpty().withMessage("message cannot be empty"),
    check("email")
      .isEmail()
      .withMessage("Invalid input format")
      .not()
      .isEmpty()
      .withMessage("email cannot be empty"),
    utils.contactus
  );

  app.use("/api/utils", router);
};
