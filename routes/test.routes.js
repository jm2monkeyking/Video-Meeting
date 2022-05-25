module.exports = (app) => {
  const test = require("../controllers/test.controller.js");

  var router = require("express").Router();

  router.get("/pdf", test.pdf);
  router.get("/pdfkit", test.pdfkit);
  router.get("/excel", test.excel);
  router.get("/do", test.do);
  router.get("/testDOID", test.testDOID);
  router.get("/backup", test.backup);
  router.get("/solist", test.solist);

  app.use("/api/test", router);
};
