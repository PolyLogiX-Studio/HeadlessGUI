const url = require('url');
const uuidv4 = require('uuid/v4');
var bus
/**
 * @typedef WindowProperties
 * @type {Object}
 */
/**
 * @typedef WindowData
 * @type {Object}
 */

/**
 * @class WindowManager
 * @classdesc Window Manager to manage all HeadlessCore Windows.
 */
class WindowManager {
    /**
     * @param {Object} BrowserWindow Electron Browser Window Object
     */
    constructor(BrowserWindow){
        this.BrowserWindow = BrowserWindow
        /**
         * All Open Windows
         * @returns Object
         */
        this.Windows = {}
    }

    /**
     * Create a new Electron Window
     * @param {String} [ID] Unique ID to use
     * @param {WindowProperties} prop 
     * @param {WindowData} data 
     * @param {Object} [menu=null]
     * @example WindowManager.createWindow('addWindow', {
        parent: 'MainWindow',
        show: false,
        darkTheme: true,
        width: 800,
        height: 800,
        title: "New Server",
        icon: ICON_GLOBAL_PNG,
        webPreferences: {
            nodeIntegration: true
        }
    }, {page:{
        pathname: path.join(__dirname, '/Pages/addWindow.html'),
        protocol: 'file:',
        slashes: true,
    },children:['ConfigWindow']})
     * @returns {String} Unique Window ID
     */
    createWindow(ID = uuidv4(),prop,data,menu=null){


        this.ID = ID
        console.log('New Window Call,',ID)
        if (this.Windows[ID] != undefined) {
            return false
        }
        prop.show = false
        if (prop.parent){
            if (this.Windows[prop.parent]){
                //Exclude Top Level
                if (ID!=='MainWindow'){
                    if (this.Windows[prop.parent].Children.includes(ID)){
                        this.Windows[prop.parent].Children.push(ID)
                    }
                }
            prop.parent = this.Windows[prop.parent]
            } else {
                prop.parent = this.Windows['MainWindow']
            }
        } else {
            prop.parent = this.Windows['MainWindow']
        }
        //console.log(prop)
        
        this.Windows[ID] = new this.BrowserWindow(prop);
        this.Windows[ID].setMenu(menu)
        this.Windows[ID].Children = (data.children? data.children : []);
        //console.log('menu',menu)
        let windowURL = url.format(data.page)
        console.log('query',data.query)
        if(data.query){
            let t_query = ""
            for (const [key, value] of Object.entries(data.query)){
                t_query += `${key}=${encodeURIComponent(value)}&`
            }
            windowURL += `?${t_query}`

        }
        console.log('windowURL',windowURL)
        this.Windows[ID].loadURL(windowURL)
        this.Windows[ID].once('ready-to-show', () => {
            this.Windows[ID].show()
        })
        // GC Handle
        this.Windows[ID].onClose = (this.Windows[ID].on('close', ()=> {
            console.log(`Manual Close on ${ID}`)
            for (let i=0;i<this.Windows[ID].Children.length; i++){
                this.closeWindow(this.Windows[ID].Children[i])
            }
            delete this.Windows[ID]
        }))
        this.Windows[ID].onClosed = (this.Windows[ID].on('closed', ()=>{
            console.log(`Window ${ID}: Closed.`)
        }))
        return ID
    }
    /**
     * 
     * @param {String} ID 
     * @param {String} tag 
     * @param {*} data 
     * @example WindowManager.sendData('MainWindow','NEOS:Login', {'neosCredential':someLogin,'neosPassword':somepassword})
     */
    sendData(ID,tag,data){
        if (!this.Windows[ID]){return false}
        this.Windows[ID].webContents.send(tag,data)
    }
    /**
     * Check if a window ID exists
     * @param {String} ID Unique Window ID
     * @example if(WindowManager.isOpen('ConfigWindow')){
     *  //Some code
     * }
     * @returns {Boolean} Is Window Open
     */
    isOpen(ID){
        return !(!this.Windows[ID])
    }
    /**
     * Close a Window if it exists
     * @param {String} ID Unique Window ID
     */
    closeWindow(ID){
        if (!this.Windows[ID]){return false}
        this.Windows[ID].close()
    }
    /**
     * Close all Windows
     */
    closeAllWindows(){
        
    }
}


module.exports = function(b){ bus = b; return {WindowManager}}