// Upload branding & root assets to Cloudinary
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
const ROOT_IMAGES = [
  'eic-logo.png',
  'pec-logo.png',
  'hero-bg.jpg',
  'rupee-bg.jpg',
  'stock-bull-hero.png',
  'readme-hero.png',
  'readme-highlights.png',
];

async function uploadRootAssets() {
  console.log('Uploading root and branding images to Cloudinary...\n');
  const results = {};

  for (const filename of ROOT_IMAGES) {
    const filePath = path.join(PUBLIC_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    const publicId = filename.replace(/\.[^/.]+$/, '');
    try {
      const res = await cloudinary.uploader.upload(filePath, {
        folder: 'esummit/assets',
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

uploadRootAssets().catch(console.error);
