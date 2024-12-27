const { app, BrowserWindow, Tray, Menu, ipcMain, session } = require('electron');
const path = require('path');
const https = require('https');
let Store;
(async () => {
    const module = await import('electron-store');
    Store = module.default;
})();

let store;
let splash;
let mainWindow;
let version = 1;
let tray;
let settingsWindow; 

function createTray() {
    const trayIcon = path.join(__dirname, 'OIG1.png'); // Укажите путь к вашей иконке
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open App',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                }
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('SwiftMessage App');
}

function createSplash() {
    splash = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false
        },
        frame: false, // Отключение стандартной рамки
        fullscreen: false // Полноэкранный режим для splash
    });

    splash.loadFile('splash.html');
    splash.webContents.on('ipc-message', (event, channel) => {
        if (channel === 'close-main-window') {
            splash.close();
        } else if (channel === 'minimize-main-window') {
            splash.minimize();
        } else if (channel === 'maximize-main-window') {
            if (splash.isMaximized()) {
                splash.unmaximize();
            } else {
                splash.maximize();
            }
        }
    });
}
ipcMain.on('minimize', () => {
    if (splash && !splash.isDestroyed()) {
        splash.minimize();
    }
});

ipcMain.on('maximize', () => {
    if (splash && !splash.isDestroyed()) {
        if (splash.isMaximized()) {
            splash.unmaximize();
        } else {
            splash.maximize();
        }
    }
});

ipcMain.on('close-splash', () => {
    if (splash && !splash.isDestroyed()) {
        splash.close();
        splash = null; // Обнулите переменную, чтобы избежать дальнейших ошибок
    }
});


function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js') // Убедитесь, что путь к preload.js указан
        },
        frame: false, // Отключение стандартной рамки
        titleBarStyle: 'hidden' // Скрывает стандартный заголовок
    });

    mainWindow.loadURL('url');

    // Интеграция панели управления в основное окно
    mainWindow.webContents.on('did-finish-load', () => {
        // Добавляем HTML для панели управления
        mainWindow.webContents.executeJavaScript(`
            document.body.insertAdjacentHTML('afterbegin', \`
                <div id="control-panel" style="
                    position: absolute;
                    top: 0;
                    right: 0;
                    height: 40px;
                    width: 100%;
                    background: transparent;
                    display: flex;
                    justify-content: flex-end;
                    z-index: 1000;
                    -webkit-app-region: drag;
                ">
                    <button class="button minimize" style="
                        width: 30px;
                        height: 30px;
                        margin: 5px;
                        cursor: pointer;
                        border: none;
                        color: white;
                        font-size: 20px;
                        text-align: center;
                        background: #555;
                        border-radius: 5px;
                        -webkit-app-region: no-drag;
                    ">-</button>
                    <button class="button maximize" style="
                        width: 30px;
                        height: 30px;
                        margin: 5px;
                        cursor: pointer;
                        border: none;
                        color: white;
                        font-size: 20px;
                        text-align: center;
                        background: #777;
                        border-radius: 5px;
                        -webkit-app-region: no-drag;
                    ">□</button>
                    <button class="button close" style="
                        width: 30px;
                        height: 30px;
                        margin: 5px;
                        cursor: pointer;
                        border: none;
                        color: white;
                        font-size: 20px;
                        text-align: center;
                        background: red;
                        border-radius: 5px;
                        -webkit-app-region: no-drag;
                    ">×</button>
                </div>
            \`);
        
      
            
            document.querySelector('.minimize').addEventListener('click', () => {
                window.electronAPI.minimize();
            });
        
            document.querySelector('.maximize').addEventListener('click', () => {
                window.electronAPI.maximize();
            });
        
            document.querySelector('.close').addEventListener('click', () => {
                window.electronAPI.close();
            });
        `);
    });
    function setProxySettings(proxy) {
        const { host, port, username, password } = proxy;
    
        // Construct the proxy URL
        const proxyConfig = `socks5://${username}:${password}@${host}:${port}`;
    
        // Set the proxy for the session
        session.defaultSession.setProxy({
            proxyRules: proxyConfig
        }).then(() => {
            console.log('Proxy settings updated:', proxyConfig);
        }).catch(error => {
            console.error('Failed to set proxy:', error);
        });
    }
    
    // Handle the open-settings event
    ipcMain.on('open-settings', () => {
        if (!settingsWindow || settingsWindow.isDestroyed()) {
            createSettingsWindow();
        } else {
            settingsWindow.show();
        }
    });

    // Handle saving proxy settings
    ipcMain.on('save-proxy-settings', (event, proxy) => {
        console.log('Received proxy settings:', proxy);
        store.set('proxySettings', proxy); // Save settings to Store
        setProxySettings(proxy);
    });
    
    // Handle clear proxy settings
    ipcMain.on('clear-proxy-settings', () => {
        clearProxySettings();
        store.delete('proxySettings'); // Remove settings from Store
    });
    
    // Function to create the settings window
    function createSettingsWindow() {
        settingsWindow = new BrowserWindow({
            width: 400,
            height: 300,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: path.join(__dirname, 'preload.js')
            }
        });
    
        settingsWindow.loadFile('settings.html');
    
        settingsWindow.once('ready-to-show', () => {
            settingsWindow.show();
        });
    }
    
    

    // Обработка запросов от рендерера
    ipcMain.on('minimize', () => mainWindow.minimize());
    ipcMain.on('maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on('close', () => mainWindow.close());
    ipcMain.on('drag-start', (event, { x, y }) => {
        mainWindow.startDrag();
    });
    
    ipcMain.on('drag-start', (event, { x, y }) => {
        mainWindow.setBounds({
            x: mainWindow.getBounds().x + (x - mainWindow.getBounds().x),
            y: mainWindow.getBounds().y + (y - mainWindow.getBounds().y),
            width: mainWindow.getBounds().width,
            height: mainWindow.getBounds().height
        });
    });
    // Обработка закрытия главного окна
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function checkInternet() {
    return new Promise((resolve) => {
        // Проверяем доступность сайта
        https.get('url', (res) => {
            if (res.statusCode === 200) {
                // Если сайт доступен, загружаем информацию о версии
                fetchVersion(resolve);
            } else {
                resolve(false);
            }
        }).on('error', () => {
            resolve(false);
        });
    });
}
const currentVersion = 2;
// Функция для загрузки версии из удаленного JSON-файла
function fetchVersion(resolve) {
    https.get('url', (res) => {
        let data = '';

        // Получаем данные
        res.on('data', (chunk) => {
            data += chunk;
        });

        // Когда получены все данные
        res.on('end', () => {
            const versionInfo = JSON.parse(data);
            checkForUpdate(versionInfo.version);
            resolve(true);
        });
    }).on('error', () => {
        console.error('Ошибка при загрузке версии.');
        resolve(false);
    });
}

// Функция для проверки обновления
function checkForUpdate(latestVersion) {
    console.log(` ${currentVersion}`);
    console.log(` ${latestVersion}`);

    if (currentVersion < latestVersion) {
        console.log(`Update ${latestVersion}.`);
    } else {
        console.log(`Вы используете последнюю версию.`);
    }
}

// Вызов функции для проверки интернета и версии
checkInternet().then((isConnected) => {
    if (isConnected) {
        console.log('Соединение с интернетом установлено.');
    } else {
        console.log('Нет соединения с интернетом.');
    }
});
async function handleSplashScreen() {
    const hasInternet = await checkInternet();
    console.log(`Internet status: ${hasInternet ? 'connected' : 'disconnected'}`);

    if (hasInternet) {
        setTimeout(() => {
            createMainWindow();
            if (splash) splash.close();
        }, 10000);
    } else {
        console.log('No internet connection. Retrying...');
        setTimeout(handleSplashScreen, 5000);
    }
}

app.whenReady().then(() => {
    createTray();
    createSplash();
    handleSplashScreen();
    if (!Store) throw new Error("electron-store failed to load");
    store = new Store();
    loadProxySettings();
});

app.on('window-all-closed', () => {
    // Закрыть приложение, если нет открытых окон, кроме на macOS
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // Восстановить окно, если оно было закрыто, и на macOS
    if (mainWindow === null) {
        createSplash();
    }
});
