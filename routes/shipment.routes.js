const permission = require("../utils/permission");
const response = require("../utils/response");
const { check } = require("express-validator");

module.exports = (app) => {
  const Shipment = require("../controllers/shipment.controller.js");

  var router = require("express").Router();
  router.use(async function (req, res, next) {
    if (await permission.checkPermission(req, "shipment")) {
      next();
    } else {
      response.permissionDenied(req, res);
    }
  });
  router.post(
    "/",
    check("mode")
      .not()
      .isEmpty()
      .withMessage("please specified your operation")
      .custom((value, { req }) => {
        if (!["Add", "Edit"].includes(value))
          return Promise.reject("Invalid operation(Add,Edit)");
        return true;
      }),
    check("documentType").custom((value, { req }) => {
      if (req.body.mdoe == "Add") {
        if (!["Debit Note", "Credit Note", "Sales Order"].includes(value))
          return Promise.reject(
            "Invalid documentType (Debit Note,Credit Note,Sales Order)"
          );
      }
      return true;
    }),
    check("month").custom((value, { req }) => {
      if (req.body.mdoe == "Add") {
        if (isNaN(value)) return Promise.reject("Invalid month ");
      }
      return true;
    }),
    check("year").custom((value, { req }) => {
      if (req.body.mdoe == "Add") {
        if (isNaN(value)) return Promise.reject("Invalid year ");
      }
      return true;
    }),

    Shipment.create
  );

  router.get("/", Shipment.findAll);

  router.get("/:id", Shipment.findOne);

  // router.post("/confirmInvoice", Shipment.confirmInvoice);
  router.post("/rejectRequest", Shipment.rejectRequest);
  router.post("/approveRequest", Shipment.approveRequest);
  router.post("/restoreRecord", Shipment.restoreRecord);
  router.post("/copy", Shipment.copy);

  router.post("/upload", Shipment.uplaod);

  router.post("/removeAttachment", Shipment.removeUpload);

  router.post("/requestModified", Shipment.requestModified);

  app.use("/api/salesorder", router);
};
