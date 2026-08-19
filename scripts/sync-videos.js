const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'video');
const destDir = path.join(__dirname, '..', 'public', 'videos');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.readdirSync(srcDir).forEach((file) => {
    if (/\.(webm|mp4|ogg|mov)$/i.test(file)) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);
      fs.copyFileSync(srcFile, destFile);
    }
  });
}
