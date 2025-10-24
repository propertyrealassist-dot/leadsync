const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * Download GHL Snapshot Template
 * Forces download instead of displaying in browser
 */
router.get('/ghl-snapshot', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../public/ghl-snapshot-template.json');
    const fileName = 'leadsync-ghl-snapshot.json';

    // Set headers to force download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download file'
        });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

/**
 * Download Import Guide
 * Forces download instead of displaying in browser
 */
router.get('/import-guide', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../public/SNAPSHOT_IMPORT_GUIDE.md');
    const fileName = 'leadsync-import-guide.md';

    // Set headers to force download
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download file'
        });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

module.exports = router;
