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
const fs = require('fs-extra'); //Recursive Folder Delete


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
        this.Console = null;
        this.Vars = {
            Status:'Starting',
            
            event:null,
            CloudXID:null,
            SessionPreview:'https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607',
            eventContext:null,
            displayStatusMessage:false,
            UserCount:1,
            Users:[],
            timerMod:0,
            Timers:{
                'UpdatePreview': {
                    func: () => {
                        this.log('updateCloudXID')
                        this.updateCloudXID()
                        this.update()
                    },
                    freq: 60
                }
            },

        }
        this.log = (message) => {
            console.log(`${this.ID}:${message}`)
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
            this.Vars.event = 'ShutDown';
            this.Vars.displayStatusMessage = true;
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
                this.Vars.Status = 'Running';
                this.Vars.event = 'Started'
                this.Vars.displayStatusMessage = true;
                this.update()
                setTimeout(() => {
                    this.TimerProc()
                }, 10000) // Start Internal Timers
            }
            if (data.toString().startsWith('World Saving') || data.toString().startsWith('Autosaving')) {
                this.Vars.event = 'Saving';
                this.Vars.Status = 'Saving';
                this.Vars.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('World Saved')) {
                this.Vars.event = 'Saved';
                this.Vars.Status = 'Saved';
                this.Vars.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Starting sync')) {
                this.Vars.event = 'Syncing';
                this.Vars.Status = 'Syncing';
                this.Vars.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Finished sync')) {
                this.Vars.event = 'Synced';
                this.Vars.Status = 'Running';
                this.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Shutting Down')) {
                this.Vars.event = 'ShuttingDown';
                this.Vars.Status = 'Shutting Down';
                this.Vars.displayStatusMessage = true;
                this.update()
            }
            if (data.toString().startsWith('Peer Connected')) {
                this.Vars.event = 'UserJoin';
                this.Vars.UserCount++;
                this.Vars.displayStatusMessage = true;
                this.Vars.Users.push({
                    'ip': data.toString().substring(15).trim(),
                    'username': undefined,
                    'userID': undefined
                })
                this.update()
            }
            if (data.toString().startsWith('http://cloudx.azurewebsites.net/open/session/')) {
                let id = data.toString().substring(45)
                this.Vars.CloudXID = id
                this.updatePreview()
                return
            }
            if (data.toString().startsWith('Join Granted For')) {
                this.Vars.event = 'UserJoinContext';
                this.Vars.displayStatusMessage = true;
                let message = data.toString().substring(25).replace('\r\n', '')
                this.Vars.eventContext = [message.substring(0, message.indexOf(',')), message.substring(message.indexOf(',') + 12)]
                var foundIndex = this.Users.findIndex(x => x.username == undefined);

                this.Vars.Users[foundIndex].username = this.Vars.eventContext[1]
                this.Vars.Users[foundIndex].userID = this.Vars.eventContext[0]
                this.update()
            }
            if (data.toString().startsWith('Peer Disconnected')) {
                this.Vars.event = 'UserLeft';
                this.Vars.UserCount--;
                this.Vars.displayStatusMessage = true;
                let message = data.toString().substring(19).replace('\r\n', '')
                let ip = message.substring(0, message.indexOf(','))
                var foundIndex = this.Users.findIndex(x => x.ip == ip);
                let user = this.Users[foundIndex]
                this.Vars.eventContext = [user.userID, user.username]
                this.Vars.Users = this.Users.filter(function(returnableObjects) {
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
        if (this.Vars.CloudXID === null) {
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
        if (this.Vars.CloudXID === null) {
            return
        }
        let url = 'https://cloudx.azurewebsites.net/api/sessions/' + this.Vars.CloudXID
        fetch(url)
            .then(res => res.json())
            .then(json => {
                this.Vars.SessionPreview = (json.thumbnail ? json.thumbnail : "https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607")
            })
    }
    /**
     * Call all internal timers and run them if they should run.
     *
     * @memberof Server
     */
    runTimers() {
        for (var timer in this.Vars.Timers) {
            if (this.Vars.timerMod % this.Vars.Timers[timer].freq === 0) {
                this.Vars.Timers[timer].func.call()
            }
        }
        this.Vars.timerMod++
    }
    /**
     * Shut down the instance
     *
     * @memberof Server
     */
    end() {
        this.Vars.Status = 'Shutting Down'
        this.Vars.event = 'ShuttingDown'
        this.Vars.displayStatusMessage = true
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
        if (this.Vars.displayStatusMessage) {
            this.Vars.displayStatusMessage = false
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
    runCommand(command){
        this.Session.stdin.write(`\n${command}\nlog\n`)
    }
}
class Instances {
    constructor(){
        this.Instances = {}
    }
    get(id){
        if (!this.Instances[id]) {return undefined}
        return this.Instances[id]
    }
    endAll(){

    }

    
}
module.exports = {Instances,Server}