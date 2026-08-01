import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. ROTTA PROXY CORS
app.all('/api/proxy', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;

    if (!targetUrl) {
        res.status(400).json({ error: 'Manca il parametro ?url=' });
        return;
    }

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...(req.headers.accept ? { 'Accept': req.headers.accept } : {})
            },
            body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
        });

        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        res.status(response.status);
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// 2. SERVIRE I FILE STATICI
const distPath = path.resolve(path.dirname(process.execPath), 'build/web'); 
const actualDistPath = fs.existsSync(distPath) 
    ? distPath 
    : path.resolve(process.cwd(), 'build/web');

app.use(express.static(actualDistPath));

// 3. FALLBACK SPA
app.get('/{*splat}', (_req: Request, res: Response) => {
    res.sendFile(path.join(actualDistPath, 'index.html'));
});

// 4. AVVIO SERVER
const server = app.listen(PORT, () => {
    console.log(`TestManga Companion attivo su http://localhost:${PORT}`);
});

// 5. SYSTEM TRAY NATIVA VIA POWERSHELL (Localizzata e con kill sicuro del processo padre)
if (process.platform === 'win32') {
    const exeDir = path.dirname(process.execPath);
    const customIconPath = path.join(exeDir, 'icon.ico');
    const fallbackIconPath = path.resolve(process.cwd(), 'icon.ico');
    
    let iconPathToUse = '';
    if (fs.existsSync(customIconPath)) {
        iconPathToUse = customIconPath;
    } else if (fs.existsSync(fallbackIconPath)) {
        iconPathToUse = fallbackIconPath;
    }

    const mainProcessId = process.pid;

    const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $tray = New-Object System.Windows.Forms.NotifyIcon
    
    $iconPath = "${iconPathToUse.replace(/\\/g, '\\\\')}"
    if ($iconPath -ne "" -and (Test-Path $iconPath)) {
        $tray.Icon = New-Object System.Drawing.Icon($iconPath)
    } else {
        $tray.Icon = [System.Drawing.SystemIcons]::Application
    }

    $tray.Text = "TestManga Companion"
    $tray.Visible = $true

    # Rilevamento lingua di sistema (Italiano vs Altre)
    $culture = [System.Globalization.CultureInfo]::InstalledUICulture.TwoLetterISOLanguageName
    $exitText = if ($culture -eq "it") { "Esci" } else { "Exit" }

    $menu = New-Object System.Windows.Forms.ContextMenu
    $itemExit = New-Object System.Windows.Forms.MenuItem
    $itemExit.Text = $exitText
    $itemExit.add_Click({
        $tray.Visible = $false
        [System.Windows.Forms.Application]::Exit()
        # Forza la chiusura del processo principale Node.js passando il PID reale
        Stop-Process -Id ${mainProcessId} -Force -ErrorAction SilentlyContinue
        exit
    })
    $menu.MenuItems.Add($itemExit) | Out-Null

    $tray.ContextMenu = $menu
    [System.Windows.Forms.Application]::Run()
    `;

    const trayProcess = spawn('powershell.exe', ['-WindowStyle', 'Hidden', '-Command', psScript], {
        windowsHide: true,
        detached: false
    });

    const cleanup = () => {
        try { trayProcess.kill(); } catch {}
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}