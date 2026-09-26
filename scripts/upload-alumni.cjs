// Upload alumni assets to Cloudinary
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'frontend', 'public');
const ALUMNI_IMAGES = [
  'OIP.webp',
  'OIP (1).jpg.jpeg',
  'OIP (2).jpg.jpeg',
  'OIP (3).jpg.jpeg',
  'OIP (4).jpg.jpeg',
  'OIP (6).jpg.jpeg',
  '1786383606538.png',
];

async function uploadAlumniAssets() {
  console.log('Uploading alumni images to Cloudinary...\n');
  const results = {};

  for (const filename of ALUMNI_IMAGES) {
    const filePath = path.join(PUBLIC_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.error(`  ✗ Missing: ${filename}`);
        continue;
    }

    const publicId = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    try {
      const res = await cloudinary.uploader.upload(filePath, {
        folder: 'esummit/alumni',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      });
      results[filename] = res.secure_url;
      console.log(`  ✓ ${filename} → ${res.secure_url}`);
    } catch (err) {
      console.error(`  ✗ ${filename}: ${err.message}`);
    }
  }

  console.log('\n=== UPLOADED ASSETS MAPPING ===\n', JSON.stringify(results, null, 2));
}

uploadAlumniAssets().catch(console.error);
