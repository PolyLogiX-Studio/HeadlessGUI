class WindowManager {
    constructor(BrowserWindow){
        this.BrowserWindow = BrowserWindow
        this.Windows = {}
    }
    createWindow(ID,prop,data,menu=null){
        if (this.Windows[ID] != undefined) {
            return false
        }
        prop.show = false
        if (prop.parent){
            prop.parent = this.Windows[prop.parent]
        }
        this.Windows[ID] = new BrowserWindow(prop);
        this.Windows[ID].setMenu(menu)
        this.Windows[ID].loadURL(url.format(data.page))
        this.Windows[ID].once('ready-to-show', () => {
            this.Windows[ID].show()
        })
        // GC Handle
        this.Windows[ID].on('close', function() {
            delete this.Windows[ID]
        })
    }
    sendData(ID,tag,data){
        if (!this.Windows[ID]){return false}
        this.Windows[ID].webContents.send(tag,data)
    }
    closeWindow(ID){
        if (!this.Windows[ID]){return false}
        this.Windows[ID].close()
    }
    closeAllWindows(){
        
    }
}


module.exports = {WindowManager}