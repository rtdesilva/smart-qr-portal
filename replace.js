const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
        let content = fs.readFileSync(path.join(dir, file), 'utf8');
        
        // Brand replacements
        content = content.replace(/SmartQR/g, 'SmartQR');
        content = content.replace(/Aegis<span>Bio<\/span>/g, 'Smart<span>QR</span>');
        
        // Term replacements
        content = content.replace(/QR Portal/ig, 'QR Portal');
        content = content.replace(/QR Scanner/ig, 'QR Scanner');
        content = content.replace(/QR scanning feeds/ig, 'QR scanning feeds');
        content = content.replace(/QR Code/ig, 'QR Code');
        content = content.replace(/QR attendance logs/ig, 'QR attendance logs');
        content = content.replace(/QR identification/ig, 'QR identification');
        content = content.replace(/QR Code Login/ig, 'QR Code Login');
        content = content.replace(/QR scanning process/ig, 'QR scanning process');
        content = content.replace(/QR/g, 'QR');
        content = content.replace(/QR/g, 'qr');
        
        // UI / Icon replacements
        content = content.replace(/fa-qrcode/g, 'fa-qrcode');
        content = content.replace(/Live QR Scan Demo/g, 'Live QR Scan Demo');
        
        // Replace image src
        content = content.replace(/<img src="scan\.png" alt="Live QR Scan Demo" class="feed-image">/g, '<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Student:SC-2489" alt="Live QR Scan Demo" class="feed-image" style="object-fit: contain; padding: 3rem; opacity: 0.9;">');
        
        fs.writeFileSync(path.join(dir, file), content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
