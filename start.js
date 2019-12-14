const electron = require('electron');
const url = require('url');
const path = require('path');
const uuidv4 = require('uuid/v4');
const fetch = require('node-fetch');

const {
    dialog,
    app,
    BrowserWindow,
    Menu,
    ipcMain
} = electron;
const Store = require('electron-store');
const store = new Store({
    name: 'dat'
});
const config = new Store({
    name: 'config'
});
const themes = new Store({
    name: 'themes'
});
//Predefine Windows in Global Space
let mainWindow = null;
let addWindow = null;
let configWindow = null;
let addWindowAdvanced = null;
let loginWindow = null
const fs = require('fs-extra'); //Recursive Folder Delete

/**
 * Neos API Endpoints
 */
const CLOUDX_PRODUCTION_NEOS_API = "https://cloudx.azurewebsites.net/";
const CLOUDX_STAGING_NEOS_API = "https://cloudx-staging.azurewebsites.net/";
const CLOUDX_NEOS_BLOB = "https://cloudxstorage.blob.core.windows.net/";
const CLOUDX_NEOS_CDN = "https://cloudx.azureedge.net/";
const LOCAL_NEOS_API = "http://localhost:60612";
const LOCAL_NEOS_BLOB = "http://127.0.0.1:10000/devstoreaccount1/";
const ICON_GLOBAL_PNG = path.join(__dirname, '/images/icon.png')
const ICON_GLOBAL_ICO = path.join(__dirname, '/images/icon.ico')

/**
 * Close all Windows
 * (Excluding Console Windows, Handling Later)
 */
function closeAllWindows() {
    if (addWindow) {
        addWindow.close()
    }
    if (configWindow) {
        configWindow.close()
    }
    if (addWindowAdvanced) {
        addWindowAdvanced.close()
    }
    if (loginWindow) {
        loginWindow.close()
    }
}
//Init


var dataDir = app.getPath('userData') //AppData/Roaming
var scriptsDir = path.join(dataDir, 'Scripts')
var enabledScriptsDir = path.join(scriptsDir, 'Enabled')
var disabledScriptsDir = path.join(scriptsDir, 'Disabled')
var sessionsDir = path.join(dataDir, "Active Sessions") //%AppData%/NeosHeadlessManager/Active Sessions
fs.removeSync(sessionsDir)
// Setup Scripts folder
if (!fs.pathExistsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir)
} 
if (!fs.pathExistsSync(disabledScriptsDir)) {
    fs.mkdirSync(disabledScriptsDir)
} 
if (!fs.pathExistsSync(enabledScriptsDir)) {
    fs.mkdirSync(enabledScriptsDir)
} 
const scriptsConfig = new Store({
    name: 'scripts',
    cwd: dataDir,
    defaults: {
        scripts:{
            global:{},
            server:{},
            commands:{}
        }
    }
});
const API = new Store({
    name: 'api',
    cwd: dataDir,
    defaults: JSON.parse(fs.readFileSync("./Pages/Resources/API_Default.json"))
    });
if (!store.has('MachineId')) { //For API Calls
    store.set('MachineId', uuidv4())
}
checkInternet(function(isConnected) {
    if (isConnected) {
        store.set('isConnected', true)
        console.log('connected')
        if ((store.has('NEOS:token') && (new Date(store.get('NEOS:token:expire')) > new Date()))) {

            login(config.get('loginCredentials'), config.get('loginPassword')) // Login to Neos (If Able)
        }
    } else {
        console.log('no connection')
        store.set('isConnected', false)
    }
})



//Disable SubMenu & Dev tools
//process.env.NODE_ENV = 'production';

if (!themes.has('Themes')) {
    config.set('currentTheme', 'Darkly')
    themes.set('Themes', {
        "Darkly": {
            "url": `./CSS/Darkly.css`,
            "type": "file",
            "description": "Flatly in night mode"
        },
        "Flatly": {
            "url": `./CSS/Flatly.css`,
            "type": "file",
            "description": "Flat and modern"
        },
        "Cyborg": {
            "url": `./CSS/Cyborg.css`,
            "type": "file",
            "description": "Jet black and electric blue"
        },
        "Minty": {
            "url": `./CSS/Minty.css`,
            "type": "file",
            "description": "A fresh feel"
        },
        "Sketchy": {
            "url": `./CSS/Sketchy.css`,
            "type": "file",
            "description": "A hand-drawn look for mockups and mirth"
        },
        "Solar": {
            "url": `./CSS/Solar.css`,
            "type": "file",
            "description": "A spin on Solarized"
        },
        "Superhero": {
            "url": `./CSS/Superhero.css`,
            "type": "file",
            "description": "The brave and the blue"
        }
    })
}


// Listen for App to be ready

app.on('ready', function() {
    // Create new Window
    mainWindow = new BrowserWindow({
        show: false,
        width: 1920,
        height: 1080,
        icon: ICON_GLOBAL_PNG,
        webPreferences: {
            nodeIntegration: true
        }
    });
    // Load HTML file
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, '/Pages/mainWindow.html'),
        protocol: 'file:',
        slashes: true,
    }));
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })
    // Quit app when main closed
    mainWindow.on('closed', function() {
        safeQuit()
    })
    // Build Menu from Template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert Menu
    Menu.setApplicationMenu(mainMenu);
    mainWindow.on('close', (e) => {
        if (JSON.stringify(Instances.all()) === '{}') {
            return false
        } else {
            e.preventDefault()
            dialog.showMessageBox(null, {
                type: 'question',
                buttons: ['Cancel', `Yes, Kill them All :)`, `No, I clicked this by mistake`],
                defaultId: 2,
                title: "Close Program?",
                message: "Are you sure you want to quit?",
                detail: "This will Kick all players and close all sessions."
            }).then((e) => {
                if (e.response === 1) {
                    safeQuit()
                }
            })
        }
    })
});
//QUIT HANDELING

shuttingDown = false

function safeQuit() {
    closeAllWindows()
    shuttingDown = true
    Instances.endAll()
}

/**
 * Remove Instance, Clear Local Files, and Nullify for GC
 *
 * @param {string} id ID of Instances to clear
 */
function clearCache(id) {
    fs.removeSync(Instances.get(id).val().sessionDir)
    delete Instances[id]
    if (shuttingDown && JSON.stringify(Instances) === '{}') {
        ClearQuit()
    }
}

/**
 * Remove Session Directory and quit app
 *
 */
function ClearQuit() {
    fs.removeSync(sessionsDir)
    setTimeout(() => {
        app.quit()
    }, 5000) // Need a better way to do this
}
/**
 * Create the New Server window
 *
 */
function createAddWindow() {
    if (addWindow !== null) {
        return
    }
    if (!store.get('isConnected')) {
        mainWindow.webContents.send('NOCONNECTION')
        return
    }
    if (!store.get('configSet') || !config.get('loginPassword')) {
        mainWindow.webContents.send('ConfigError')
        return
    }
    mainWindow.webContents.send('removeStart')
    addWindow = new BrowserWindow({
        parent: mainWindow,
        show: false,
        width: 800,
        height: 800,
        title: "New Server",
        icon: ICON_GLOBAL_PNG,
        webPreferences: {
            nodeIntegration: true
        }
    });
    if (process.env.NODE_ENV === 'production') {
        addWindow.setMenu(null)
    }
    // Load HTML file
    addWindow.loadURL(url.format({
        pathname: path.join(__dirname, '/Pages/addWindow.html'),
        protocol: 'file:',
        slashes: true,
    }))
    addWindow.once('ready-to-show', () => {
        addWindow.show()
    })
    // GC Handle
    addWindow.on('close', function() {
        addWindow = null
    })

}

/**
 * Create the Login Window
 *
 */
function createLoginWindow() {
    if (loginWindow !== null) {
        return
    }
    loginWindow = new BrowserWindow({
        show: false,
        darkTheme: true,
        width: 500,
        height: 300,
        title: "Neos Login",
        icon: path.join(__dirname, 'images/GraphicIcon_-_Golden_Neos.png'),
        webPreferences: {
            nodeIntegration: true
        }
    });
    loginWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'Pages/NeosLogin.html'),
        protocol: 'file:',
        slashes: true,
    }))
    loginWindow.once('ready-to-show', () => {
        loginWindow.show()
    })
    if (process.env.NODE_ENV === 'production') {
        loginWindow.setMenu(null)
    }
    // GC Handle
    loginWindow.on('close', function() {
        loginWindow = null
    })

}

/**
 * Create the Config Menu
 *
 */
function createConfigWindow() {
    if (configWindow !== null) {
        return
    }
    configWindow = new BrowserWindow({
        parent: mainWindow,
        width: 1000,
        show: false,
        height: 810,
        title: "Config",
        icon: ICON_GLOBAL_PNG,
        webPreferences: {
            nodeIntegration: true
        }
    });
    if (process.env.NODE_ENV === 'production') {
        configWindow.setMenu(null)
    }
    // Load HTML file
    configWindow.loadURL(url.format({
        pathname: path.join(__dirname, '/Pages/ConfigWindow.html'),
        protocol: 'file:',
        slashes: true,
    }))
    configWindow.once('ready-to-show', () => {
        configWindow.show()
    })
    // GC Handle
    configWindow.on('close', function() {
        configWindow = null
    })

}



/**
 * Open a Window to a URL with height and width dimentions
 *
 * @param {*} URL www.host.com
 * @param {number} [width=1080] Window Width
 * @param {number} [height=1080] Window Height
 */
function createURLWindow(URL, width = 1080, height = 1080) {
    let URLwindow = new BrowserWindow({
        show: false,
        darkTheme: true,
        width: width,
        height: height,
        title: "Config",
        icon: path.join(__dirname, '/images/polylogix.jpg'),
        webPreferences: {
            nodeIntegration: false
        }
    });
    if (process.env.NODE_ENV === 'production') {
        URLwindow.setMenu(null)
    }
    // Load HTML file
    URLwindow.loadURL(url.format({
        pathname: URL,
        protocol: 'https:',
        slashes: true,
    }))
    // GC Handle
    URLwindow.on('close', function() {
        URLwindow = null
    })
    URLwindow.once('ready-to-show', () => {
        URLwindow.show()
    })

}
function createEditorWindow() {
    editorWindow = new BrowserWindow({
        parent:configWindow,
        show: false,
        darkTheme: true,
        width: 1000,
        height: 1000,
        title: "Editor",
        icon: path.join(__dirname, '/images/polylogix.jpg'),
        webPreferences: {
            nodeIntegration: true
        }
    });
    if (process.env.NODE_ENV === 'production') {
        editorWindow.setMenu(null)
    }
    // Load HTML file
    editorWindow.loadURL(url.format({
        pathname: path.join(__dirname,'Pages/ScriptEditor.html'),
        protocol: 'file:',
        slashes: true,
    }))
    // GC Handle
    editorWindow.on('close', function() {
        editorWindow = null
    })
    editorWindow.once('ready-to-show', () => {
        editorWindow.show()
    })

}
/**
 * Login to Neos
 *
 * @param {string} credential username, or email
 * @param {string} password password
 * @returns {JSON} Session Object
 */
function login(credential, password) {
    let loginPayload = {}
    loginPayload.secretMachineId = store.get('MachineId');
    if (credential) {
        if (credential.includes('@')) {
            loginPayload.email = credential
        } else {
            loginPayload.username = credential
        }
    }
    if (password) {
        loginPayload.password = password;
    }
    loginPayload.rememberMe = true
    /* Login User and return Session Token */
    return fetch(CLOUDX_PRODUCTION_NEOS_API + 'api/userSessions', {
            method: "POST",
            body: JSON.stringify(loginPayload),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(res => res.json())
        .then(json => {
            config.set('loginCredentials', credential)
            config.set('loginPassword', (password ? password : config.get('loginPassword')))
            store.set('NEOS:token', json.token)
            store.set('NEOS:userId', json.userId)
            store.set('NEOS:token:expire', json.expire)
            return json
        }).catch((err) => {
            if (!store.get('offlineMode')) { //Dont clear Credentials if offline
                config.delete('loginCredentials')
                config.delete('loginPassword')
                store.delete('NEOS:token')
                store.delete('NEOS:userId')
                store.delete('NEOS:token:expire')
            }
            return {
                err: true
            }
        })


}
/* Data Calls from Windows */
ipcMain.on('NEOS:Login', function(e, info) {
    login(info.neosCredential, info.neosPassword).then((test) => {
        if (!test.err) {
            configWindow.webContents.send('NEOS:Login')
            if (loginWindow) {
                loginWindow.close()
            }

        } else {
            loginWindow.webContents.send('NEOS:Failed', test)
        }
    })

})
ipcMain.on('callWindow:Login', function(e) {
    createLoginWindow()
})
// User has changed the Config
ipcMain.on('Config:Update', function(e, item) {
    //configWindow.close()
    mainWindow.webContents.send('removeConfig')
})
// Open Advanced Settings for New Server window

/* Create New Session */
ipcMain.on('server:new', function(e, item) {
    //console.log(item)
    //Create server
    item.id = uuidv4()
    mainWindow.webContents.send('Main:updateList', item);
    addWindow.close();
    Instances[item.id] = new Server(item.id, item.usernameOverride, item.sessionName, item.loadWorldURL, item.maxUsers, item.description, item.saveOnExit, item.autosaveInterval, item.accessLevel, item.loadWorldPresetName, item.autoRecover, item.mobileFriendly, item.tickRate, item.keepOriginalRoles, item.defaultUserRoles, item.idleRestartInterval, item.forcedRestartInterval, item.forcePort, item.autoInviteUsernames, item.autoInviteMessage)
})
ipcMain.on('new:editor', function(e, item) {
    createEditorWindow()
})
//Open a Browser
ipcMain.on('openURL', function(e, item) {
    createURLWindow(item)
})
ipcMain.on('getUpdateRaw', function(e, session) {
    Instances.get(session).update()
})
ipcMain.on('Console:Command', function(e, item) {
    if (!Instances.get(item.id).val()) {
        dialog.showMessageBox(null, {
            type: 'error',
            buttons: ['Ok'],
            defaultId: 2,
            title: "Session Not Found",
            message: `Session ${item.id} not found!`,
            detail: "This session does not exist!"
        })
        return
    }
    Instances.get(item.id).runCommand(`\n${item.command}\nlog\n`)
    if (item.command === 'shutdown') {
        Instances[item.id].Vars.Status = 'Shutting Down'
        Instances[item.id].Vars.event = 'ShuttingDown'
        Instances[item.id].Vars.displayStatusMessage = true
        Instances[item.id].update()
        Instances[item.id].Session.stdin.write(`\n${item.command}\nlog\n`)
    }
})

// Main Menu Template
const mainMenuTemplate = [{
        label: 'Main',
        submenu: [{
                label: 'New Server',
                accelerator: process.platform == 'darwin' ? 'Command+N' : 'Ctrl+N',
                click() {
                    createAddWindow()
                }
            },
            {
                label: "Config",
                accelerator: process.platform == 'darwin' ? 'Command+P' : 'Ctrl+P',
                click() {
                    createConfigWindow()
                }
            },
            {
                label: "Refresh",
                accelerator: process.platform == 'darwin' ? 'Command+R' : 'Ctrl+R',
                click() {
                    RefreshAll()
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click() {
                    safeQuit()
                }
            }
        ]
    },
    {
        label: 'Help',
        submenu: [{
                label: 'Online Help',
                accelerator: process.platform == 'darwin' ? 'F1' : 'F1',
                click() {
                    createURLWindow('www.github.com/bombitmanbomb/HeadlessCore/wiki/Introduction')
                }
            },
            {
                label: 'My PolyLogiX Account',
                accelerator: process.platform == 'darwin' ? 'F2' : 'F2',
                click() {
                    createURLWindow('www.polylogix.studio/PolyLogiX-Account')
                }
            },
            {
                label: 'Report a Bug',
                accelerator: process.platform == 'darwin' ? 'F3' : 'F3',
                click() {
                    createURLWindow('www.github.com/bombitmanbomb/HeadlessCore/issues')
                }
            },
        ]

    },
    {
        label: "Support Us on Patreon!",
        click() {
            createURLWindow('www.patreon.com/PolyLogiX_VR')
        }
    }
]

// Dev tools so i know when i fuck up
if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [{
                label: 'Toggle DevTools',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    })
}




function checkInternet(cb) {
    require('url-exists')(`https://neosvr.com/`, function(err, exists) {
        console.log(err, exists)
        if (!exists) {
            cb(false);
        } else {
            cb(true);
        }
    });
}




//Server Pipe

ipcMain.on('openManager', function(e, id) {
    Instances.get(id).openWindow()
})