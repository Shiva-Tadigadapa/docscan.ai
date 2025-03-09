const express = require("express");
const multer = require("multer");
const scanController = require("../controllers/scanController");
const aiScanController = require("../controllers/aiScanController");

const router = express.Router();

// Ensure the "uploads/" directory exists
const upload = multer({ dest: "uploads/" });

router.post("/scan", upload.single("file"), scanController.scanFile);

router.get("/matches/:docId", scanController.getMatchesByDocId);

router.get("/documents/:userId", scanController.getDocumentsByUserId);

router.post("/scan/ai/:docId", upload.single("file"), aiScanController.scanWithAI);

router.get("/ai/compare/:docId/:compareId",aiScanController.getDocumentComparison);


module.exports = router;
