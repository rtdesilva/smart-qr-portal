$files = Get-ChildItem -Path "c:\Users\harin\Downloads\student-biometric-face-recognition-portal-main\student-biometric-face-recognition-portal-main" -Include *.html,*.js,*.css -Recurse

foreach ($file in $files) {
    if ($file.Extension -match "\.(html|js|css)") {
        $content = Get-Content $file.FullName -Raw
        
        # Replacements
        $content = $content -replace 'AegisBio', 'SmartQR'
        $content = $content -replace 'Aegis<span>Bio</span>', 'Smart<span>QR</span>'
        
        $content = $content -replace '(?i)Biometric Portal', 'QR Portal'
        $content = $content -replace '(?i)Biometric Terminal', 'QR Scanner'
        $content = $content -replace '(?i)biometric feeds', 'QR scanning feeds'
        $content = $content -replace '(?i)Face Biometric', 'QR Code'
        $content = $content -replace '(?i)biometric attendance logs', 'QR attendance logs'
        $content = $content -replace '(?i)Biometric identification', 'QR identification'
        $content = $content -replace '(?i)Biometric Face Login', 'QR Code Login'
        $content = $content -replace '(?i)biometric scanning process', 'QR scanning process'
        
        $content = $content -replace 'Biometric', 'QR'
        $content = $content -replace 'biometric', 'qr'
        
        $content = $content -replace 'fa-face-viewfinder', 'fa-qrcode'
        $content = $content -replace 'Live Face Scan Demo', 'Live QR Scan Demo'
        
        # Handle the image source specifically after "Live QR Scan Demo"
        $content = $content -replace '<img src="scan\.png" alt="Live QR Scan Demo" class="feed-image">', '<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Student:SC-2489" alt="Live QR Scan Demo" class="feed-image" style="object-fit: contain; padding: 3rem; opacity: 0.9; background: #fff;">'
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
