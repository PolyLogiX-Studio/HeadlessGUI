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

var Instances = {}

var dataDir = app.getPath('userData') //AppData/Roaming
var scriptsDir = path.join(dataDir, 'Scripts')
var globalScriptsDir = path.join(scriptsDir, 'Global')
var serverScriptsDir = path.join(scriptsDir, 'Server')
var commandScriptsDir = path.join(scriptsDir, 'Commands')
var disabledScriptsDir = path.join(scriptsDir, 'Disabled')
var sessionsDir = path.join(dataDir, "Active Sessions") //%AppData%/NeosHeadlessManager/Active Sessions
fs.removeSync(sessionsDir)
// Setup Scripts folder
if (!fs.pathExistsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir)
} 
const scriptsConfig = new Store({
    name: 'scripts',
    cwd: scriptsDir,
    defaults: {
        scripts:{
            global:{},
            server:{},
            commands:{}
        }
    }
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
        if (JSON.stringify(Instances) === '{}') {
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
    let instances = Object.keys(Instances)
    for (let i = 0; i < instances.length; i++) {
        Instances[instances[i]].end()
    }
}

/**
 * Remove Instance, Clear Local Files, and Nullify for GC
 *
 * @param {string} id ID of Instances to clear
 */
function clearCache(id) {
    fs.removeSync(Instances[id].sessionDir)
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
//Open a Browser
ipcMain.on('openURL', function(e, item) {
    createURLWindow(item)
})
ipcMain.on('getUpdateRaw', function(e, session) {
    Instances[session].update()
})
ipcMain.on('Console:Command', function(e, item) {
    if (!Instances[item.id]) {
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
    Instances[item.id].Session.stdin.write(`\n${item.command}\nlog\n`)
    if (item.command === 'shutdown') {
        Instances[item.id].Status = 'Shutting Down'
        Instances[item.id].event = 'ShuttingDown'
        Instances[item.id].displayStatusMessage = true
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


//Neos Server Code
const DefaultConfig = {
    "tickRate": 60.0,
    "usernameOverride": null,
    "loginCredential": null,
    "loginPassword": null,
    "startWorlds": [{
        "sessionName": null,
        "description": null,
        "maxUsers": 32,
        "accessLevel": "Anyone",
        "tags": null,
        "mobileFriendly": false,
        "loadWorldURL": null,
        "loadWorldPresetName": "SpaceWorld",
        "forcePort": null,
        "keepOriginalRoles": false,
        "defaultUserRoles": null,
        "autoInviteUsernames": null,
        "autoInviteMessage": null,
        "autoRecover": true,
        "idleRestartInterval": -1.0,
        "forcedRestartInterval": -1.0,
        "saveOnExit": false,
        "autosaveInterval": -1.0
    }],
    "dataFolder": null,
    "cacheFolder": null,
    "allowedUrlHosts": null,
    "autoSpawnItems": null
}
const {
    spawn
} = require('child_process');


/**
 *
 *
 * @class Server
 */
class Server {
    /**
     *Creates an instance of Server.
     * @param {string} [UUID=uuidv4()] Instance Session ID, Generate if none specified
     * @param {string} [usernameOverride=null] Username for server to use
     * @param {string} [sessionName="DefaultWorld"] Name of Session
     * @param {string} [loadWorldURL=null] neosrec:/// World URL 
     * @param {number} [maxUsers=32] User count
     * @param {string} [description=null] World Description
     * @param {boolean} [saveOnExit=false]
     * @param {number} [autosaveInterval=-1.0]
     * @param {string} [accessLevel="Anyone"] Access Level
     * @param {string} [loadWorldPresetName="SpaceWorld"] WOrld Preset
     * @param {boolean} [autoRecover=false] Restart Server if it crashes
     * @param {boolean} [mobileFriendly=false] enable Mobile/Quest Support
     * @param {number} [tickRate=60] Server Tickrate (FPS)
     * @param {boolean} [keepOriginalRoles=false]
     * @param {JSON} [defaultUserRoles=null]
     * @param {number} [idleRestartInterval=-1.0] Restart after {float} seconds of inactivity
     * @param {number} [forcedRestartInterval=-1.0] Force Restart after float seconds
     * @param {number} [forcePort=null] What port to use, Self Managed
     * @param {array} [autoInviteUsernames=null] array of Usernames
     * @param {string} [autoInviteMessage=null] Message to send with Invite
     * @memberof Server
     */
    constructor(UUID = uuidv4(), usernameOverride = null, sessionName = "DefaultWorld", loadWorldURL = null, maxUsers = 32, description = null, saveOnExit = false, autosaveInterval = -1.0, accessLevel = "Anyone", loadWorldPresetName = "SpaceWorld", autoRecover = false, mobileFriendly = false, tickRate = 60, keepOriginalRoles = false, defaultUserRoles = null, idleRestartInterval = -1.0, forcedRestartInterval = -1.0, forcePort = null, autoInviteUsernames = null, autoInviteMessage = null) {
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir)
        }
        this.Config = DefaultConfig
        this.ID = UUID
        this.sessionDir = path.join(sessionsDir, UUID)
        this.Config.startWorlds[0].sessionName = sessionName
        this.Config.startWorlds[0].description = description
        this.Config.startWorlds[0].maxUsers = parseInt(maxUsers, 10) + 1
        this.Config.startWorlds[0].accessLevel = accessLevel
        this.Config.startWorlds[0].saveOnExit = saveOnExit
        this.Config.startWorlds[0].autosaveInterval = parseFloat(autosaveInterval)
        this.Config.startWorlds[0].loadWorldURL = loadWorldURL
        this.Config.startWorlds[0].loadWorldPresetName = loadWorldPresetName
        this.Config.startWorlds[0].autoRecover = autoRecover
        this.Config.startWorlds[0].mobileFriendly = mobileFriendly
        this.Config.startWorlds[0].keepOriginalRoles = keepOriginalRoles
        this.Config.startWorlds[0].defaultUserRoles = defaultUserRoles
        this.Config.startWorlds[0].idleRestartInterval = parseFloat(idleRestartInterval)
        this.Config.startWorlds[0].forcedRestartInterval = parseFloat(forcedRestartInterval)
        this.Config.startWorlds[0].forcePort = parseInt(forcePort, 10)
        this.Config.startWorlds[0].autoInviteMessage = autoInviteMessage
        this.Config.startWorlds[0].autoInviteUsernames = autoInviteUsernames
        this.Config.tickRate = parseInt(tickRate, 10)
        this.Config.usernameOverride = (config.get('usernameOverride') === '' ? null : config.get('usernameOverride'))
        this.Config.loginCredential = config.get('loginCredentials')
        this.Config.loginPassword = config.get('loginPassword')
        this.Config.allowedUrlHosts = (!config.get('allowedUrlHosts') ? ['127.0.0.1'] : config.get('allowedUrlHosts'))
        this.Config.dataFolder = path.join(this.sessionDir, 'Data')
        this.Config.cacheFolder = path.join(this.sessionDir, 'Cache')
        this.Status = 'Starting'
        this.log = (message) => {
            console.log(`${this.ID}:${message}`)
        }
        this.Console = null
        this.event = null
        this.CloudXID = null
        this.SessionPreview = 'https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607'
        this.eventContext = null
        this.displayStatusMessage = false
        this.UserCount = 1
        this.Users = []
        this.timerMod = 0
        this.Timers = {
            'UpdatePreview': {
                func: () => {
                    this.log('updateCloudXID')
                    this.updateCloudXID()
                    this.update()
                },
                freq: 60
            }
        }
        this.PolyLogiXAPI = null
        this.configWindow = new Object()
        this.TimerProc = () => {
            setInterval(() => {
                this.runTimers()
            }, 1000)
        }
        fs.mkdirSync(this.sessionDir)
        fs.mkdirSync(this.Config.dataFolder)
        fs.mkdirSync(this.Config.cacheFolder)
        fs.writeFileSync(path.join(this.sessionDir, 'Config.json'), JSON.stringify(this.Config));
        if (process.platform === 'win32') { //Windows
            this.Session = spawn(path.join(config.get('neosClientPath'), 'Neos.exe'), ['--config', path.join(this.sessionDir, 'Config.json')], {
                windowsHide: true,
                cwd: config.get('neosClientPath')
            })
        } else { //Linux requires Mono
            this.Session = spawn('mono', [path.join(config.get('neosClientPath'), 'Neos.exe'), '--config', path.join(this.sessionDir, 'Config.json')], {
                windowsHide: true,
                cwd: config.get('neosClientPath')
            })
        }

        this.Session.stdin.write('log\n')
        this.Session.on('exit', () => {
            this.Session.stdin.pause();
            this.event = 'ShutDown';
            this.displayStatusMessage = true;
            this.update();
            if (this.Console !== null) {
                this.Console.close();
                this.Console = null
            }

            this.Session.kill();
            this.Session = null
            clearCache(this.ID);

        })
        // Handle Events
        this.Session.stdout.on('data', (data) => {
            if (data.toString().startsWith('Enabling logging output.')) {
                return
            }
            if (data.toString().startsWith('World running')) {
                this.Status = 'Running';
                this.event = 'Started'
                this.displayStatusMessage = true;
                this.update()
                setTimeout(() => {
                    this.TimerProc()
                }, 10000) // Start Internal Timers
            }
            if (data.toString().startsWith('World Saving') || data.toString().startsWith('Autosaving')) {
                this.event = 'Saving';
                this.Status = 'Saving';
                this.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('World Saved')) {
                this.event = 'Saved';
                this.Status = 'Saved';
                this.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Starting sync')) {
                this.event = 'Syncing';
                this.Status = 'Syncing';
                this.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Finished sync')) {
                this.event = 'Synced';
                this.Status = 'Running';
                this.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Shutting Down')) {
                this.event = 'ShuttingDown';
                this.Status = 'Shutting Down';
                this.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Peer Connected')) {
                this.event = 'UserJoin';
                this.UserCount++;
                this.displayStatusMessage = true;
                this.Users.push({
                    'ip': data.toString().substring(15).trim(),
                    'username': undefined,
                    'userID': undefined
                })
                this.update()
            }
            if (data.toString().startsWith('http://cloudx.azurewebsites.net/open/session/')) {
                let id = data.toString().substring(45)
                this.CloudXID = id
                this.updatePreview()
                return
            }
            if (data.toString().startsWith('Join Granted For')) {
                this.event = 'UserJoinContext';
                this.displayStatusMessage = true;
                let message = data.toString().substring(25).replace('\r\n', '')
                this.eventContext = [message.substring(0, message.indexOf(',')), message.substring(message.indexOf(',') + 12)]
                var foundIndex = this.Users.findIndex(x => x.username == undefined);

                this.Users[foundIndex].username = this.eventContext[1]
                this.Users[foundIndex].userID = this.eventContext[0]
                this.update()
            }
            if (data.toString().startsWith('Peer Disconnected')) {
                this.event = 'UserLeft';
                this.UserCount--;
                this.displayStatusMessage = true;
                let message = data.toString().substring(19).replace('\r\n', '')
                let ip = message.substring(0, message.indexOf(','))
                var foundIndex = this.Users.findIndex(x => x.ip == ip);
                let user = this.Users[foundIndex]
                this.eventContext = [user.userID, user.username]
                this.Users = this.Users.filter(function(returnableObjects) {
                    return returnableObjects.ip !== ip;
                });

                this.update()

            }
            if (data.toString().startsWith(this.Config.startWorlds[0].sessionName + ">")) {
                return
            }
            if (this.Console !== null) {
                this.Console.webContents.send('Server:Log', data.toString())
            }
        });
        return this
    }
    /**
     * Call to update the internal Neos Session ID
     * for use with the NeosAPI
     * @memberof Server
     */
    updateCloudXID() {
        if (this.CloudXID === null) {
            if (this.Session === null || this.Session == undefined) {
                return
            }
            this.Session.stdin.write('\nsessionUrl\nlog\n')
            //setTimeout(()=>{this.updatePreview()},10000);;
        } else {
            this.updatePreview()
        }
    }
    /**
     * Update the preview image on Main Window
     *
     * @memberof Server
     */
    updatePreview() {
        if (this.CloudXID === null) {
            return
        }
        let url = 'https://cloudx.azurewebsites.net/api/sessions/' + this.CloudXID
        fetch(url)
            .then(res => res.json())
            .then(json => {
                this.SessionPreview = (json.thumbnail ? json.thumbnail : "https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607")
            })
    }
    /**
     * Call all internal timers and run them if they should run.
     *
     * @memberof Server
     */
    runTimers() {
        for (var timer in this.Timers) {
            if (this.timerMod % this.Timers[timer].freq === 0) {
                this.Timers[timer].func.call()
            }
        }
        this.timerMod++
    }
    /**
     * Shut down the instance
     *
     * @memberof Server
     */
    end() {
        this.Status = 'Shutting Down'
        this.event = 'ShuttingDown'
        this.displayStatusMessage = true
        this.update()
        setTimeout(() => {
            this.Session.stdin.write('\nshutdown\n');
        }, 1000)
    }

    /**
     * Update data about the server Globally, Update server pannel in Main Window
     *
     * @memberof Server
     */
    update() {
        this.log('Updating Server Info')
        if (this.Console) {
            this.Console.webContents.send("Update:Raw", this)
        }
        mainWindow.webContents.send('Server:Update', this)
        if (this.displayStatusMessage) {
            this.displayStatusMessage = false
        }
    }
    /**
     * Open Server Console
     *
     * @memberof Server
     */
    openWindow() {
        this.Console = new BrowserWindow({
            parent: mainWindow,
            show: false,
            width: 1200,
            height: 800,
            title: "Console",
            icon: ICON_GLOBAL_PNG,
            webPreferences: {
                nodeIntegration: true
            }
        });
        this.Console.loadURL(url.format({
            pathname: path.join(__dirname, `/Pages/ServerManager.html`),
            protocol: 'file:',
            slashes: true,
        }) + `?id=${this.ID}`);
        if (process.env.NODE_ENV === 'production') {
            this.Console.setMenu(null)
        }
        this.Console.once('ready-to-show', () => {
            this.Console.show()
        })
        this.Console.on('close', () => {
            this.Console = null
        })
    }
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
    Instances[id].openWindow()
})