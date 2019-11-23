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
const store = new Store();
let mainWindow = null;
let addWindow = null;
let configWindow = null;
let addWindowAdvanced = null;
let loginWindow = null
const _ = undefined
const fs = require('fs-extra');
function closeAllWindows(){
    if (addWindow){addWindow.close()}
    if (configWindow){configWindow.close()}
    if (addWindowAdvanced){addWindowAdvanced.close()}
    if (loginWindow){loginWindow.close()}
}
//Init

var Instances = {}

var dataDir = app.getPath('userData') //AppData/Roaming
var sessionsDir = path.join(dataDir, "Active Sessions") //%AppData%/NeosHeadlessManager/Active Sessions
fs.removeSync(sessionsDir)
if (!store.has('MachineId')){ //For API Calls
    store.set(new uuidv4())
}







//Disable SubMenu & Dev tools
//process.env.NODE_ENV = 'production';












// Listen for App to be ready

app.on('ready', function() {
    // Create new Window
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        icon: path.join(__dirname, '/images/HeadlessGraphic.png'),
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
    // Quit app when main closed
    mainWindow.on('closed', function() {
        safeQuit()
    })
    // Build Menu from Template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert Menu
    Menu.setApplicationMenu(mainMenu);
    mainWindow.on('close', (e) => {
        if (JSON.stringify(Instances)==='{}'){
            return false
        } else {
            e.preventDefault()
            dialog.showMessageBox(null,{
                type:'question',
                buttons: ['Cancel', `Yes, I'm Sure`,`No, I clicked this by mistake`],
                defaultId:2,
                title: "Close Program?",
                message: "Are you sure you want to quit?",
                detail: "This will Kick all players and close all sessions."
            }).then((e)=>{
                if (e.response===1){safeQuit()}
            })
            //console.log(response)
        }
      })
});
//QUIT HANDELING

shuttingDown = false

function safeQuit(){
    closeAllWindows()
    shuttingDown = true
let instances = Object.keys(Instances)
        for (let i=0;i<instances.length;i++){
            Instances[instances[i]].end()
        }
    }
    function clearCache(id){
        fs.removeSync(Instances[id].sessionDir)
        delete Instances[id]
        //console.log('Instanced Left: ',JSON.stringify(Instances))
        if (shuttingDown && JSON.stringify(Instances) === '{}'){
        //console.log("CLEAR QUIT")
            ClearQuit()
        }
    }
    function ClearQuit(){
        fs.removeSync(sessionsDir)
        setTimeout(()=>{app.quit()},5000) // Need a better way to do this
    }
// Handle Creatre Add Window
function createAddWindow() {
    if (addWindow !== null) {
        return
    }
    if (!store.get('configSet')) {
        mainWindow.webContents.send('ConfigError')
        return
    }
    mainWindow.webContents.send('removeStart')
    addWindow = new BrowserWindow({
        width: 400,
        height: 800,
        title: "New Server",
        icon: path.join(__dirname, '/images/GraphicIcon_-_Golden_Neos.png'),
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
    // GC Handle
    addWindow.on('close', function() {
        if (addWindowAdvanced) {
            addWindowAdvanced.close()
        }
        addWindow = null
    })

}

function createLoginWindow() {
    if (loginWindow !== null) {
        return
    }
    loginWindow = new BrowserWindow({
        darkTheme:true,
        width: 500,
        height: 300,
        title: "Neos Login",
        icon: path.join(__dirname, 'images/GraphicIcon_-_Golden_Neos.png'),
        webPreferences: {
            nodeIntegration: false
        }
    });
    loginWindow.loadURL(url.format({
        pathname: path.join(__dirname,'Pages/NeosLogin.html'),
        protocol: 'file:',
        slashes: true,
    }))
    if (process.env.NODE_ENV === 'production') {
        loginWindow.setMenu(null)
    }
    // GC Handle
    loginWindow.on('close', function() {
        loginWindow = null
    })

}

function createConfigWindow() {
    if (configWindow !== null) {
        return
    }
    configWindow = new BrowserWindow({
        width: 400,
        height: 790,
        title: "Config",
        icon: path.join(__dirname, '/images/Gear.png'),
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
    // GC Handle
    configWindow.on('close', function() {
        configWindow = null
    })

}
//Advanced Server Settings
function createAddWindowAdvanced() {
    if (addWindowAdvanced !== null) {
        return
    } // 1 copy
    addWindowAdvanced = new BrowserWindow({
        width: 500,
        height: 330,
        title: 'Advanced Settings',
        icon: path.join(__dirname, '/images/Gear.png'),
        webPreferences: {
            nodeIntegration: true
        }
    });
    if (process.env.NODE_ENV === 'production') {
        addWindowAdvanced.setMenu(null)
    }

    addWindowAdvanced.loadURL(url.format({
        pathname: path.join(__dirname, '/Pages/addWindowAdvanced.html'),
        protocol: 'file:',
        slashes: true
    }))



    addWindowAdvanced.on('close', function() {
        addWindowAdvanced = null //GC Cleanup
    })


}




function createURLWindow(URL, width = 1080, height = 1080) {
    let URLwindow = new BrowserWindow({
        darkTheme:true,
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

}

ipcMain.on('callWindow:Login', function(e){
    createLoginWindow()
})
ipcMain.on('addWindowAdvanced:save', function(e, ret) {
    addWindow.webContents.send('addWindowAdvanced:save', ret)
    addWindowAdvanced.close()
})
ipcMain.on('addWindowAdvanced:resize', function(e, size) {
    addWindowAdvanced.setSize(size.x, size.y)
})

ipcMain.on('Config:Update', function(e, item) {
    //console.log('ConfigUpdate')
    configWindow.close()
    mainWindow.webContents.send('removeConfig')
})

ipcMain.on('server:new:advanced', function(e) {
    //console.log('AdvancedSettings')
    createAddWindowAdvanced()
})

//catch IPC
ipcMain.on('server:new', function(e, item) {
    //console.log(item)
    //Create server
    item.id = uuidv4()
    mainWindow.webContents.send('Main:updateList', item);
    addWindow.close();
    Instances[item.id] = new Server(item.id, item.usernameOverride, item.sessionName, item.loadWorldURL, item.maxUsers, item.description, item.saveOnExit, item.autosaveInterval, item.accessLevel, item.loadWorldPresetName, item.autoRecover, item.mobileFriendly, item.tickRate, item.keepOriginalRoles, item.defaultUserRoles, item.idleRestartInterval, item.forcedRestartInterval, item.forcePort, item.autoInviteUsernames, item.autoInviteMessage)

})

ipcMain.on('openURL', function(e, item) {
    //console.log("Opening: "+item)
    createURLWindow(item)
})
ipcMain.on('addWindowAdvanced:request', function(e) {
    addWindow.webContents.send('addWindowAdvanced:request')
})
ipcMain.on('addWindowAdvanced:response', function(e, data) {
    addWindowAdvanced.webContents.send('addWindowAdvanced:response', data)
})
ipcMain.on('Console:Command',function(e,item){
        if (!Instances[item.id]){
            dialog.showMessageBox(null,{
                type:'error',
                buttons: ['Ok'],
                defaultId:2,
                title: "Session Not Found",
                message: `Session ${item.id} not found!`,
                detail: "This session does not exist!"
            })
            return
        }
        Instances[item.id].Session.stdin.write(`\n${item.command}\nlog\n`)
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
                    createURLWindow('www.github.com/bombitmanbomb/HeadlessCore/wiki','OnlineHelp')
                }
            },
            {
                label: 'My PolyLogiX Account',
                accelerator: process.platform == 'darwin' ? 'F2' : 'F2',
                click() {
                    createURLWindow('www.polylogix.studio/PolyLogiX-Account','MyAccount')
                }
            },
            {
                label: 'Report a Bug',
                accelerator: process.platform == 'darwin' ? 'F3' : 'F3',
                click() {
                    createURLWindow('www.github.com/bombitmanbomb/HeadlessCore/issues','BugReport')
                }
            },
        ]

    },
    {
        label:"Support Us on Patreon!",
        click(){
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


class Server {
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
        this.Config.usernameOverride = (!usernameOverride ? store.get('usernameOverride') : usernameOverride)
        this.Config.loginCredential = store.get('loginCredentials')
        this.Config.loginPassword = store.get('loginPassword')
        this.Config.allowedUrlHosts = (!store.get('allowedUrlHosts') ? ['localhost', 'PolyLogiX.Studio', 'PolyLogiX.Tools'] : store.get('allowedUrlHosts'))
        this.Config.dataFolder = path.join(this.sessionDir, 'Data')
        this.Config.cacheFolder = path.join(this.sessionDir, 'Cache')
        this.Status = 'Starting'
        this.Console = null
        this.event = null
        this.CloudXID = null
        this.SessionPreview = 'https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607'
        this.eventContext = null
        this.displayStatusMessage = false
        this.UserCount = 1
        this.Users = []
        this.Timers = {
            'UpdatePreview':()=>{this.updateCloudXID()}
        }
        this.PolyLogiXAPI = null
        this.configWindow = new Object()
        this.TimerProc = ()=>{setTimeout(()=>{this.runTimers()},3000);setInterval(()=>{this.runTimers()},60000)}
        fs.mkdirSync(this.sessionDir)
        fs.mkdirSync(this.Config.dataFolder)
        fs.mkdirSync(this.Config.cacheFolder)
        fs.writeFileSync(path.join(this.sessionDir, 'Config.json'), JSON.stringify(this.Config));
        if (process.platform==='win32'){ //Windows
            this.Session = spawn(path.join(store.get('neosClientPath'), 'Neos.exe'), ['--config', path.join(this.sessionDir, 'Config.json')], {
                windowsHide: true,
                cwd: store.get('neosClientPath')
            })
        } else { //Linux requires Mono
            this.Session = spawn('mono', [path.join(store.get('neosClientPath'), 'Neos.exe'),'--config', path.join(this.sessionDir, 'Config.json')], {
                windowsHide: true,
                cwd: store.get('neosClientPath')
            })
        }
        
        this.Session.stdin.write('log\n')
        this.Session.on('exit',()=>{
            //console.log("SESSION CLOSED")
            this.Session.stdin.pause();
            this.event = 'ShutDown';
            this.displayStatusMessage = true;
            this.update();
            if (this.Console!==null){this.Console.close();this.Console = null}
                
            this.Session.kill();
            this.Session = null
            clearCache(this.ID);
            
        })
        this.Session.stdout.on('data', (data) => {
            if (data.toString().startsWith('Enabling logging output.')){return}
            console.log('NEOS: ' + data)
            if (data.toString().startsWith('World running')) {
                this.Status = 'Running';
                this.event = 'Started'
                this.displayStatusMessage = true;
                this.update()
                setTimeout(()=>{this.TimerProc()},10000) // Start Internal Timers
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
                console.log(id)
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
            if (data.toString().startsWith(this.Config.startWorlds[0].sessionName+">")){return}
            if (this.Console!==null){
                this.Console.webContents.send('Server:Log',data.toString())
            }
        });
        return this
    }
    updateCloudXID(){
        if (this.CloudXID===null){
            if(this.Session===null||this.Session==undefined){return}
            this.Session.stdin.write('\nsessionUrl\nlog\n')
        //setTimeout(()=>{this.updatePreview()},10000);;
        } else {
            this.updatePreview()
        }
    }
    updatePreview(){
        if (this.CloudXID===null){return}
        let url = 'https://cloudx.azurewebsites.net/api/sessions/'+this.CloudXID
        //console.log(url)
        fetch(url)
        .then(res => res.json())
        .then(json => {
            this.SessionPreview = (json.thumbnail? json.thumbnail : "https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607")
        })
    }
    runTimers(){
        //console.log('running timers on '+this.ID)
        for (var timer in this.Timers){
            //console.log('Running '+timer)
            this.Timers[timer].call()
        }
    }
    end(){
        //console.log('Ending Session '+this.ID)
        this.Status = 'Shutting Down'
        this.event = 'ShuttingDown'
        this.displayStatusMessage = true
        this.update()
        setTimeout(()=>{this.Session.stdin.write('\nshutdown\n');},1000)
    }
        
    update() {

        //console.log('USERS: ', this.Users)
        if (this.Console) {
            this.Console.webContents.send("Update:Raw", this)
        }
        mainWindow.webContents.send('Server:Update', this)
        if (this.displayStatusMessage) {
            this.displayStatusMessage = false
        }
    }
    openWindow() {
        this.Console = new BrowserWindow({
            width: 800,
            height: 800,
            title: "Console",
            icon: path.join(__dirname, '/images/GraphicIcon_-_Golden_Neos.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        this.Console.loadURL(url.format({
            pathname: path.join(__dirname, `/Pages/ServerManager.html`),
            protocol: 'file:',
            slashes: true,
        })+`?id=${this.ID}`);
        this.Console.on('close', () => {
            this.Console = null
        })
    }
}
//Server Pipe

ipcMain.on('openManager', function(e, id) {
    Instances[id].openWindow()
})

