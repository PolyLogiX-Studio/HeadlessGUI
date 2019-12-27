var bus
const fetch = require('node-fetch');
/**
 * @private
 * @param {String} ID
 */
function updateSession(ID) {
    bus.emit('SessionForceUpdate', ID)
}
var strings
/**
 * Neos Config
 * @param {Object} DefaultConfig
 */

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
const Store = require('electron-store');
/**
 * App Config Store
 */
const config = new Store({
    name: 'config'
});
const path = require('path')
const fs = require('fs-extra'); //Recursive Folder Delete
const uuidv4 = require('uuid/v4');
/**
 * Neos Server
 * @class
 */
class Server {
    /**
     *Creates an instance of Server.
     * @param {string} sessionsDir Directory
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
    constructor(sessionsDir, UUID = uuidv4(), usernameOverride = null, sessionName = "DefaultWorld", loadWorldURL = null, maxUsers = 32, description = null, saveOnExit = false, autosaveInterval = -1.0, accessLevel = "Anyone", loadWorldPresetName = "SpaceWorld", autoRecover = false, mobileFriendly = false, tickRate = 60, keepOriginalRoles = false, defaultUserRoles = null, idleRestartInterval = -1.0, forcedRestartInterval = -1.0, forcePort = null, autoInviteUsernames = null, autoInviteMessage = null) {
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir)
        }
        this.Config = DefaultConfig
        this.ID = UUID
        this.sessionName = sessionName
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
            _Status: strings.getString("Terms.Starting"),
            _event: null,
            _CloudXID: null,
            _SessionPreview: 'https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607',
            _eventContext: null,
            _displayStatusMessage: false,
            _UserCount: 1,
            _Users: [],
            _timerMod: 0,
            _Timers: {
                'UpdatePreview': {
                    func: () => {
                        this.log('updateCloudXID')
                        this.updateCloudXID()
                        updateSession(this.ID)
                    },
                    freq: 60
                }
            },
            set Status(v) { this.Vars._Status = v },
            set event(v) { this.Vars._event = v },
            set displayStatusMessage(v) { this.Vars._displayStatusMessage = v }
        }
        /** 
         * Log a message with the server id
         * @param {string} message the message to send
        */
        this.log = (message) => {
            console.log(`${this.ID}:${message}`)
        }
        this.PolyLogiXAPI = null
        this.configWindow = new Object()
        /**
         * Internal Timers
         * Runs every 1000ms
         * @type Function
         * 
         */
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
            this.Vars._event = 'ShutDown';
            this.Vars._displayStatusMessage = true;
            updateSession(this.ID);
            if (this.Console !== null) {
                bus.emit("Console:Close", this.ID)
                this.Console = null
            }

            this.Session.kill();
            this.Session = null
            bus.emit('clearCache', this);
            //NEED TO MANAGE WITH MANAGER TO CALL ENDING
        })

        // Handle Events
        this.Session.stdout.on('data', (data) => {
            if (data.toString().startsWith('Enabling logging output.')) {
                return
            }
            if (data.toString().startsWith('World running')) {
                this.Vars._Status = strings.getString("Terms.Running")
                this.Vars._event = 'Started'
                this.Vars._displayStatusMessage = true;
                updateSession(this.ID)
                setTimeout(() => {
                    this.TimerProc()
                }, 10000) // Start Internal Timers
            }
            if (data.toString().startsWith('World Saving') || data.toString().startsWith('Autosaving')) {
                this.Vars._event = 'Saving';
                this.Vars._Status = strings.getString("Terms.Saving")
                this.Vars._displayStatusMessage = true;
                updateSession(this.ID)
            }
            if (data.toString().startsWith('World Saved')) {
                this.Vars._event = 'Saved';
                this.Vars._Status = strings.getString("Terms.Saved")
                this.Vars._displayStatusMessage = true;
                updateSession(this.ID)
            }
            if (data.toString().startsWith('Starting sync')) {
                this.Vars._event = 'Syncing';
                this.Vars._Status = strings.getString("Terms.Syncing")
                this.Vars._displayStatusMessage = true;
                updateSession(this.ID)
            }
            if (data.toString().startsWith('Finished sync')) {
                this.Vars._event = 'Synced';
                this.Vars._Status = strings.getString("Terms.Running")
                this.displayStatusMessage = true;
                updateSession(this.ID)
            }
            if (data.toString().startsWith('Shutting Down')) {
                this.Vars._event = 'ShuttingDown';
                this.Vars._Status = strings.getString("Terms.ShuttingDown")
                this.Vars._displayStatusMessage = true;
                updateSession(this.ID)
            }
            if (data.toString().startsWith('Peer Connected')) {
                this.Vars._event = 'UserJoin';
                this.Vars._UserCount++;
                this.Vars._displayStatusMessage = true;
                this.Vars._Users.push({
                    'ip': data.toString().substring(15).trim(),
                    'username': undefined,
                    'userID': undefined,
                    'role': undefined
                })
                updateSession(this.ID)
            }
            if (data.toString().startsWith('http://cloudx.azurewebsites.net/open/session/')) {
                let id = data.toString().substring(45)
                this.Vars._CloudXID = id
                this.updatePreview()
                return
            }
            if (data.toString().startsWith('Join Granted For')) {
                this.Vars._event = 'UserJoinContext';
                this.Vars._displayStatusMessage = true;
                let message = data.toString().substring(25).replace('\r\n', '')
                this.Vars._eventContext = [message.substring(0, message.indexOf(',')), message.substring(message.indexOf(',') + 12)]
                var foundIndex = this.Vars._Users.findIndex(x => x.username == undefined);

                this.Vars._Users[foundIndex].username = this.Vars._eventContext[1]
                this.Vars._Users[foundIndex].userID = this.Vars._eventContext[0]
                updateSession(this.ID)
            }
            if (data.toString().startsWith('Peer Disconnected')) {
                this.Vars._event = 'UserLeft';
                this.Vars._UserCount--;
                this.Vars._displayStatusMessage = true;
                let message = data.toString().substring(19).replace('\r\n', '')
                let ip = message.substring(0, message.indexOf(','))
                var foundIndex = this.Vars._Users.findIndex(x => x.ip == ip);
                let user = this.Vars._Users[foundIndex]
                this.Vars._eventContext = [user.userID, user.username]
                this.Vars._Users = this.Vars._Users.filter(function (returnableObjects) {
                    return returnableObjects.ip !== ip;
                });

                updateSession(this.ID)

            }
            if (data.toString().startsWith('User ')) {
                let message = data.toString().substring(5).replace('\r\n', '')
                let point1 = message.indexOf(' Role:')
                let user = message.substring(0, point1).trim()
                let role = message.substring(point1 + 7, message.indexOf(",")).trim()
                var foundIndex = this.Vars._Users.findIndex(x => x.username === user);
                if (this.Vars._Users[foundIndex] !== undefined) {
                    this.Vars._Users[foundIndex].role = role
                    updateSession(this.ID)
                }
            }
            if (data.toString().startsWith(this.Config.startWorlds[0].sessionName + ">")) {
                return
            }
            if (this.Console !== null) {
                bus.emit('Server:Log', this.ID, data.toString())
            }
        });
        return this
    }
    /**
     * Update the server internal CloudXID
     * @memberof Server
     */
    updateCloudXID() {
        if (this.Vars._CloudXID === null) {
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
     * set the role of a connected user (Internally)
     * @param {string} user 
     * @param {string} role 
     */
    setRole(user,role){
        var foundIndex = this.Vars._Users.findIndex(x => x.username === user.trim());
                if (this.Vars._Users[foundIndex] !== undefined) {
                    this.Vars._Users[foundIndex].role = role.trim()
                    console.log("Role Set",user,role)
                }
                updateSession(this.ID)
            }
    /**
     * Update the preview image on Main Window
     *
     * @memberof Server
     */
    updatePreview() {
        if (this.Vars._CloudXID === null) {
            return
        }
        let url = 'https://cloudx.azurewebsites.net/api/sessions/' + this.Vars._CloudXID
        fetch(url)
            .then(res => res.json())
            .then(json => {
                this.Vars._SessionPreview = (json.thumbnail ? json.thumbnail : "https://media1.tenor.com/images/9218be0e29e5acb3e17d96a3f0b1e366/tenor.gif?itemid=14857607")
            })
    }
    /**
     * Call all internal timers and run them if they should run.
     *
     * @memberof Server
     */
    runTimers() {
        for (var timer in this.Vars._Timers) {
            if (this.Vars._timerMod % this.Vars._Timers[timer].freq === 0) {
                this.Vars._Timers[timer].func.call()
            }
        }
        this.Vars._timerMod++
    }
    /**
     * Shut down the instance
     *
     * @memberof Server
     */
    end() {
        this.Vars._Status = strings.getString("Terms.ShuttingDown")
        this.Vars._event = 'ShuttingDown'
        this.Vars._displayStatusMessage = true
        updateSession(this.ID)
        this.Session.stdin.write('\nshutdown\n');
    }
    /* Getters */
    var(varname) {
        return this.Vars[`_${varname}`]
    }
    /**
     * @return server object
     */
    val() {
        return this
    }
    /* Setters */

    /**
     * Update data about the server Globally, Update server pannel in Main Window
     *
     * @memberof Server
     */
    update() {
        bus.emit('Server:Update', this)
        if (this.Vars._displayStatusMessage) {
            this.Vars._displayStatusMessage = false
        }
        this.log('Updating Server Info')
    }
    /**
     * Run a Neos Command
     * @param {String} command Command to run on server
     */
    runCommand(command) {
        if (command === 'shutdown') { this.end(); return }
        this.Session.stdin.write(`\n${command}\nlog\n`)
    }
}
/**
 * 
 */
class Instances {
    /**
     * 
     */
    constructor() {
        this.Instances = {}
    }
    /**
     * 
     * @param {string} session 
     * @param {string} user 
     * @param {string} role 
     */
    setRole(session, user, role) {
        if (!this.Instances[session]) { return null }
        this.Instances[session].setRole(user,role)
    }
    /** Returns a Server Object with variables
     * @memberof Server
     * @param {string} id 
     */
    get(id) {
        if (!this.Instances[id]) { return null }
        return this.Instances[id]
    }
    /**
     * Run a console command on the instance
     * @param {String} id 
     * @param {String} command 
     */
    runCommand(id, command) {
        this.Instances[id].runCommand(command)
    }
    /**
     * 
     * @param {String} id Server ID
     */
    openWindow(id) {
        if (!this.Instances[id]) { return undefined }
        this.Instances[id].Console = true
    }
    /**
     * Call Instance Update
     * @memberof Server
     * @param {String} id Server ID
     */
    update(id) {
        if (!this.Instances[id]) { return null }
        this.Instances[id].update()
    }
    /**
     * Close all servers
     */
    endAll() {
        for (var property in this.Instances) {
            this.Instances[property].end()
        }
    }
    /**
     * Wipe an instance from the internal cache, This will NOT kill the instance
     * @param {String} id 
     */
    clear(id) {
        this.Instances[id] = undefined
        delete this.Instances[id]
    }
    /**
     * Return all Servers
     * @returns {Object} All instances
     */
    all() {
        return this.Instances
    }
    /**
     * 
     * @param {Object} session Session Object
     */
    newSession(session) {
        if (!session.UUID) { session.UUID = uuidv4() }
        this.Instances[session.UUID] = new Server(session.sessionsDir, session.UUID, session.usernameOverride, session.sessionName, session.loadWorldURL, session.maxUsers, session.description, session.saveOnExit, session.autosaveInterval, session.accessLevel, session.loadWorldPresetName, session.autoRecover, session.mobileFriendly, session.tickRate, session.keepOriginalRoles, session.defaultUserRoles, session.idleRestartInterval, session.forcedRestartInterval, session.forcePort, session.autoInviteUsernames, session.autoInviteMessage)

    }
}
/**
 * @private
 */
module.exports = function (b, s) { bus = b; strings = s; return { Instances, Server } }