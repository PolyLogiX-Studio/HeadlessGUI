//process.env.NODE_ENV = ((process.argv.indexOf("--debug")>-1)?'development':'production');
process.env.NODE_ENV = 'development';
const os = require('os');
const PLATFORM = os.platform();
console.log(PLATFORM);
console.log(process.env.NODE_ENV);
const unhandled = require('electron-unhandled');
unhandled();
const electron = require('electron');
const url = require('url');
const path = require('path');
const uuidv4 = require('uuid/v4');
const fetch = require('node-fetch');
/**EventBus;
 * This is a standard Event Emitter linking the Server, Windows, and main process
 * @namespace {Object} bus
 * @listens {{Server:Update|Server:Log|Console:Close}}
 * @see EventEmitter
 */
var bus = require('./eventBus');
const {
  crashReporter,
  dialog,
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  Tray,
  remote,
} = electron;
/**
 * Window Manager
 */
const Window = require('./WindowManager')(bus).WindowManager;

/**
 * System Window Manager
 */
const window = new Window(BrowserWindow);
const { store, config, themes } = require(path.join(
  __dirname,
  'Pages/Resources/store'
));
//Predefine Windows in Global Space
const fs = require('fs-extra'); //Recursive Folder Delete

console.log('ARGUMENTS', process.argv);
store.set('pseudo', process.argv.indexOf('--translationDebug') > -1);

const ICON_GLOBAL_PNG = path.join(__dirname, '/images/icon.png');
const ICON_GLOBAL_ICO = path.join(__dirname, '/images/icon.ico');
// Path to %AppData%/Headless Core/
var dataDir = app.getPath('userData');
// Path to %AppData%/Headless Core/Scripts/
var scriptsDir = path.join(dataDir, 'Scripts');
// Path to %AppData%/Headless Core/Scripts/Enabled
var enabledScriptsDir = path.join(scriptsDir, 'Enabled');
// Path to %AppData%/Headless Core/Scripts/Disabled
var disabledScriptsDir = path.join(scriptsDir, 'Disabled');
// Path to %AppData%/Headless Core/Active Sessions/
var sessionsDir = path.join(dataDir, 'Active Sessions');
fs.removeSync(sessionsDir);
// Setup Scripts folder
if (!fs.pathExistsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir);
}
if (!fs.pathExistsSync(disabledScriptsDir)) {
  fs.mkdirSync(disabledScriptsDir);
}
if (!fs.pathExistsSync(enabledScriptsDir)) {
  fs.mkdirSync(enabledScriptsDir);
}
// Path to %AppData%/Headless Core/Lang/
var langDir = path.join(dataDir, 'Lang');

if (!fs.pathExistsSync(langDir)) {
  fs.copySync(path.join(__dirname, 'Lang'), langDir);
}
var lang = {};
let filenames = fs.readdirSync(langDir);
store.set('langDir', langDir);
filenames.forEach(function (filename) {
  let content = fs.readFileSync(path.join(langDir, filename));
  lang[filename] = JSON.parse(content);
});

const LocalizedStrings = require('localized-strings').default;
var strings = new LocalizedStrings(lang, {
  pseudo: store.get('pseudo'),
});
strings.setLanguage(config.get('lang'));

const { Instances } = require('./Server.js')(bus, strings, config);
const instances = new Instances();
if (!store.has('MachineId')) {
  //For API Calls
  store.set('MachineId', uuidv4());
}

//Disable SubMenu & Dev tools

const contextMenu = require('electron-context-menu');
if (process.env.NODE_ENV != 'production') {
  contextMenu({
    /**
     * @private
     * @function
     */

    prepend: (defaultActions, params, browserWindow) => [
      {
        label: 'Rainbow',
        // Only show it when right-clicking images
        visible: params.mediaType === 'image',
      },
      {
        label: 'Search Google for “{selection}”',
        // Only show it when right-clicking text
        visible: params.selectionText.trim().length > 0,
        /**
         * @private
         * @function
         */

        click: () => {
          shell.openExternal(
            `https://google.com/search?q=${encodeURIComponent(
              params.selectionText
            )}`
          );
        },
      },
    ],
  });
}

if (!themes.has('Themes')) {
  config.set('currentTheme.name', 'Darkly');
  config.set('currentTheme.dark', true);
  themes.set('Themes', {
    Darkly: {
      url: `./CSS/Darkly.css`,
      type: 'file',
      description: 'Flatly in night mode',
      dark: true,
    },
    Flatly: {
      url: `./CSS/Flatly.css`,
      type: 'file',
      description: 'Flat and modern',
      dark: false,
    },
    Cyborg: {
      url: `./CSS/Cyborg.css`,
      type: 'file',
      description: 'Jet black and electric blue',
      dark: true,
    },
    Minty: {
      url: `./CSS/Minty.css`,
      type: 'file',
      description: 'A fresh feel',
      dark: false,
    },
    Sketchy: {
      url: `./CSS/Sketchy.css`,
      type: 'file',
      description: 'A hand-drawn look for mockups and mirth',
      dark: false,
    },
    Solar: {
      url: `./CSS/Solar.css`,
      type: 'file',
      description: 'A spin on Solarized',
      dark: true,
    },
    Superhero: {
      url: `./CSS/Superhero.css`,
      type: 'file',
      description: 'The brave and the blue',
      dark: true,
    },
  });
}
let singlemode = false;

// Listen for App to be ready
let tray = null;
app.on('ready', function () {
  const contextMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(Menu.buildFromTemplate(mainMenuTemplate));
  // Create new Window
  if (process.argv.indexOf('--light') > -1) {
    tray = new Tray(ICON_GLOBAL_PNG);
    tray.setToolTip('HeadlessGUI');
    tray.setContextMenu(contextMenu);
    window.createWindow(
      'MainWindow',
      {
        backgroundColor: '#303030',
        parent: 'MainWindow',
        width: 1920,
        height: 1080,
        title: 'Main Window',
        icon: ICON_GLOBAL_PNG,
        webPreferences: {
          nodeIntegration: true,
        },
      },
      {
        page: {
          pathname: path.join(__dirname, '/Pages/mainWindow.html'),
          protocol: 'file:',
          slashes: true,
        },
      },
      false
    );
    //window.Windows['MainWindow'].setMenu(Menu.buildFromTemplate(mainMenuTemplate))
    window.Windows['MainWindow'].on('closed', function () {
      safeQuit();
    });
    window.Windows['MainWindow'].on('close', (e) => {
      if (JSON.stringify(instances.all()) === '{}') {
        return false;
      } else {
        e.preventDefault();
        dialog
          .showMessageBox(null, {
            type: 'question',
            buttons: [
              strings.getString('Terms.Cancel'),
              strings.getString('Terms.Yes'),
              strings.getString('Terms.No'),
            ],
            defaultId: 2,
            title: strings.getString('Notifications.closeTitle'),
            message: strings.getString('Notifications.closeMessage'),
            detail: strings.getString('Notifications.closeDetail'),
          })
          .then((e) => {
            if (e.response === 1) {
              safeQuit();
            }
          });
      }
    });
  } else {
    window.createWindow(
      'MainWindow',
      {
        backgroundColor: '#303030',
        parent: 'MainWindow',
        width: 1920,
        height: 1080,
        title: 'Main Window',
        icon: ICON_GLOBAL_PNG,
        webPreferences: {
          nodeIntegration: true,
        },
      },
      {
        page: {
          pathname: path.join(__dirname, '/Pages/mainWindow.html'),
          protocol: 'file:',
          slashes: true,
        },
      }
    );
    window.Windows['MainWindow'].setMenu(
      Menu.buildFromTemplate(mainMenuTemplate)
    );
    window.Windows['MainWindow'].on('closed', function () {
      safeQuit();
    });
    window.Windows['MainWindow'].on('close', (e) => {
      if (JSON.stringify(instances.all()) === '{}') {
        return false;
      } else {
        e.preventDefault();
        dialog
          .showMessageBox(null, {
            type: 'question',
            buttons: [
              strings.getString('Terms.Cancel'),
              strings.getString('Terms.Yes'),
              strings.getString('Terms.No'),
            ],
            defaultId: 2,
            title: strings.getString('Notifications.closeTitle'),
            message: strings.getString('Notifications.closeMessage'),
            detail: strings.getString('Notifications.closeDetail'),
          })
          .then((e) => {
            if (e.response === 1) {
              safeQuit();
            }
          });
      }
    });
  }
  //Create Main Window
});
//Setup NEOS
const Neos = new (require("@bombitmanbomb/neosjs"))()
const {CommandManager} = require("neosjs-commands")
const Commands = CommandManager.CreateCommands(Neos)

//QUIT HANDELING

shuttingDown = false;
/**
 * Safely quit the program
 */
function safeQuit() {
  Neos.Logout()
  shuttingDown = true;
  instances.endAll();
}

/**
 * Remove Session Directory and quit app
 *
 */
function ClearQuit() {
  fs.removeSync(sessionsDir);
  window.closeWindow('MainWindow');
  setTimeout(() => {
    app.quit();
  }, 5000); // Need a better way to do this
}
/**
 * Open the New Server window
 *
 */
function createAddWindow() {
  if (!store.get('isConnected') && !singlemode) {
    window.sendData('MainWindow', 'NOCONNECTION');
    return;
  }
  if (!store.get('configSet') || !store.get('loginPassword')) {
    window.sendData('MainWindow', 'ConfigError');
    return;
  }
  window.sendData('MainWindow', 'removeStart');

  window.createWindow(
    'AddWindow',
    {
      backgroundColor: '#303030',
      parent: 'MainWindow',
      show: false,
      darkTheme: true,
      width: 800,
      height: 800,
      title: 'New Server',
      icon: ICON_GLOBAL_PNG,
      webPreferences: {
        nodeIntegration: true,
      },
    },
    {
      page: {
        pathname: path.join(__dirname, '/Pages/addWindow.html'),
        protocol: 'file:',
        slashes: true,
      },
    },
    true
  );
}

/**
 * Open the Login Window
 *
 */
function createLoginWindow() {
  window.createWindow(
    'LoginWindow',
    {
      backgroundColor: '#303030',
      parent: 'ConfigWindow',
      show: false,
      darkTheme: true,
      width: 500,
      height: 300,
      title: 'Neos Login',
      icon: path.join(__dirname, 'images/GraphicIcon_-_Golden_Neos.png'),
      webPreferences: {
        nodeIntegration: true,
      },
    },
    {
      page: {
        pathname: path.join(__dirname, 'Pages/NeosLogin.html'),
        protocol: 'file:',
        slashes: true,
      },
    }
  );
}

/**
 * Open the Config Menu
 */
function createConfigWindow() {
  window.createWindow(
    'ConfigWindow',
    {
      backgroundColor: '#303030',
      parent: 'MainWindow',
      width: 1000,
      show: false,
      height: 810,
      title: 'Config',
      icon: ICON_GLOBAL_PNG,
      webPreferences: {
        nodeIntegration: true,
      },
    },
    {
      page: {
        pathname: path.join(__dirname, '/Pages/ConfigWindow.html'),
        protocol: 'file:',
        slashes: true,
      },
      children: ['LoginWindow'],
    }
  );
}
/**
 * Open the Config Menu
 */
function createAccountWindow() {
  window.createWindow(
    'NeosAccount',
    {
      backgroundColor: '#303030',
      parent: 'MainWindow',
      width: 700,
      show: false,
      height: 300,
      title: 'Neos',
      icon: ICON_GLOBAL_PNG,
      webPreferences: {
        nodeIntegration: true,
      },
    },
    {
      page: {
        pathname: path.join(__dirname, '/Pages/AccountWindow.html'),
        protocol: 'file:',
        slashes: true,
      },
      children: ['LoginWindow',"Messages","Chat","Friends"],
    }
  );
}
function createFriendsWindow() {
  window.createWindow(
    'Friends',
    {
      backgroundColor: '#303030',
      parent: 'MainWindow',
      width: 1000,
      show: false,
      height: 810,
      title: 'Friends',
      icon: ICON_GLOBAL_PNG,
      webPreferences: {
        nodeIntegration: true,
      },
    },
    {
      page: {
        pathname: path.join(__dirname, '/Pages/Friends.html'),
        protocol: 'file:',
        slashes: true,
      },
    }
  );
}
/**
 * Open a Window to a URL
 *
 * @param {URL} URL www.host.com
 */
function createURLWindow(URL, width = 1080, height = 1080) {
  window.createWindow(
    'URLWINDOW' + uuidv4(),
    {
      parent: 'MainWindow',
      show: false,
      darkTheme: true,
      width: 1080,
      height: 1080,
      title: 'WINDOW',
      icon: path.join(__dirname, '/images/polylogix.jpg'),
      webPreferences: {
        nodeIntegration: false,
      },
    },
    {
      page: {
        pathname: URL,
        protocol: 'https:',
        slashes: true,
      },
    }
  );
}
/**
 * Open the Script Editor Window
 */
function createEditorWindow() {
  window.createWindow(
    'EditorWindow',
    {
      backgroundColor: '#303030',
      parent: 'ConfigWindow',
      show: true,
      darkTheme: true,
      width: 1920,
      height: 1080,
      title: 'Editor',
      icon: path.join(__dirname, '/images/polylogix.jpg'),
      webPreferences: {
        nodeIntegration: true,
      },
    },
    {
      page: {
        pathname: path.join(__dirname, 'Pages/ScriptEditor.html'),
        protocol: 'file:',
        slashes: true,
      },
    },
    null
  );
}


const mainMenuTemplate = [
  {
    label: strings.getString('Menu.Main'),
    submenu: [
      {
        label: strings.getString('Menu.New_Server'),
        accelerator: process.platform == 'darwin' ? 'Command+N' : 'Ctrl+N',
        /**
         * @private
         * @function
         */
        click() {
          createAddWindow();
        },
      },
      {
        label: strings.getString('Menu.Config'),
        accelerator: process.platform == 'darwin' ? 'Command+P' : 'Ctrl+P',
        /**
         * @private
         * @function
         */
        click() {
          createConfigWindow();
        },
      },
      {
        label: strings.getString('Menu.Refresh'),
        accelerator: process.platform == 'darwin' ? 'Command+R' : 'Ctrl+R',
        /**
         * @private
         * @function
         */
        click() {
          RefreshAll();
        },
      },
      {
        type: 'separator',
      },
      {
        label: strings.getString('Menu.Quit'),
        accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        /**
         * @private
         * @function
         */
        click() {
          safeQuit();
        },
      },
    ],
  },{
    label:strings.getString('Menu.Neos'),
    submenu:[
      {
        label: strings.getString('Menu.Account'),
        /**
         * @private
         * @function
         */
        click() {
          createAccountWindow();
        },
      }
    ]
  },
  {
    label: strings.getString('Menu.Help'),
    submenu: [
      {
        label: strings.getString('Menu.Online_Help'),
        accelerator: process.platform == 'darwin' ? 'F1' : 'F1',
        /**
         * @private
         * @function
         */
        click() {
          createURLWindow(
            'www.github.com/bombitmanbomb/HeadlessGUI/wiki/Introduction'
          );
        },
      },
      {
        label: strings.getString('Menu.MyPXAccount'),
        accelerator: process.platform == 'darwin' ? 'F2' : 'F2',
        /**
         * @private
         * @function
         */
        click() {
          createURLWindow('www.polylogix.studio/PolyLogiX-Account');
        },
      },
      {
        label: strings.getString('Menu.ReportBug'),
        accelerator: process.platform == 'darwin' ? 'F3' : 'F3',
        /**
         * @private
         * @function
         */
        click() {
          createURLWindow('www.github.com/bombitmanbomb/HeadlessGUI/issues');
        },
      },
    ],
  },
  {
    label: strings.getString('Menu.SupportUs'),
    /**
     * @private
     * @function
     */
    click() {
      createURLWindow('www.patreon.com/PolyLogiX_VR');
    },
  },
];

// Dev tools so i know when i mess up
if (process.env.NODE_ENV !== 'production') {
  mainMenuTemplate.push({
    label: 'Developer Tools',
    submenu: [
      {
        label: 'Toggle DevTools',
        accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        /**
         * @private
         * @function
         */

        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        },
      },
      {
        role: 'reload',
      },
    ],
  });
}
if (process.argv.indexOf('--light') > -1) {
  mainMenuTemplate.push({
    label: 'Light Mode',
    submenu: [
      {
        label: 'Nothing Yet.. :)',
      },
    ],
  });
}
ipcMain.on("OpenFriendsList", ()=>{
  createFriendsWindow()
})
ipcMain.on("NEOS:Login", (event, arg)=>{
  Neos.Login(arg.neosCredential, arg.neosPassword, undefined, uuidv4(),true).then(e=>{if (e && e.IsOK){
    console.log("Success")
    event.reply("NEOS:LoginSuccess")
  } else {
    console.log("Failed")
    event.reply("NEOS:LoginFailed")
  }}).catch(()=>{
    console.log("Error")
    event.reply("NEOS:LoginFailed")
  })
})
ipcMain.on("NEOS:Logout", (event)=>{
  Neos.once("logout",()=>event.reply("NEOS:LoggedOut"))
  Neos.Logout()
})
ipcMain.on("GetAccount", (event)=>{
  console.log(Neos.CurrentUser)
  event.returnValue = Neos.CurrentUser
})
ipcMain.on('fetchLanguage', (event, arg) => {
  event.returnValue = strings.getContent();
});
bus.on('getLang', (event, arg) => {
  bus.emit('sendLang', strings.getContent());
});
Neos.on("error",(error)=>{
  //Error Handling! lol
})