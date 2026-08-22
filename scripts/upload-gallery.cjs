// Plain CommonJS script — run with: node scripts/upload-gallery.cjs
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

const GALLERY_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'gallery');
const FOLDER = 'esummit/gallery';

async function uploadAll() {
  const files = fs.readdirSync(GALLERY_DIR).filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  console.log(`\nUploading ${files.length} images to Cloudinary...\n`);

  const results = {};

  for (const file of files) {
    const filePath = path.join(GALLERY_DIR, file);
    const publicId = file.replace(/\.[^/.]+$/, '');
    try {
      const res = await cloudinary.uploader.upload(filePath, {
        folder: FOLDER,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      });
      results[file] = res.secure_url;
      console.log(`  ✓ ${file} → ${res.secure_url}`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  console.log('\n\n=== SEED URL MAPPING (JSON) ===\n');
  console.log(JSON.stringify(results, null, 2));
  
  console.log('\n\n=== REPLACEMENT FOR SEED.TS ===');
  for (const [file, url] of Object.entries(results)) {
    console.log(`'/gallery/${file}' => '${url}'`);
  }
  
  // Write the mapping to a JSON file for easy import/use
  fs.writeFileSync(
    path.join(__dirname, 'cloudinary-mapping.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\nSaved mapping to scripts/cloudinary-mapping.json');
  console.log('\n✅ Done uploading all gallery images!');
}

uploadAll().catch(console.error);
