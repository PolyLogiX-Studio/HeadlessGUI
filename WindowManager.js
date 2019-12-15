const url = require('url');
class WindowManager {
    constructor(BrowserWindow){
        this.BrowserWindow = BrowserWindow
        this.Windows = {}
    }
    createWindow(ID,prop,data,menu=null){
        console.log('New Window Call,',ID)
        if (this.Windows[ID] != undefined) {
            return false
        }
        prop.show = false
        if (prop.parent){
            if (this.Windows[prop.parent]){
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
        
        this.Windows[ID].loadURL(url.format(data.page))
        this.Windows[ID].once('ready-to-show', () => {
            this.Windows[ID].show()
        })
        // GC Handle
        this.Windows[ID].onClose = (this.Windows[ID].on('close', ()=> {
            console.log(`Manual Close on ${ID}`)
            for (let i=0;this.Windows[ID].Children.length; i++){
                this.closeWindow(this.Windows[ID].Children[i])
            }
            delete this.Windows[ID]
        }))
        this.Windows[ID].onClosed = (this.Windows[ID].on('closed', ()=>{
            console.log(`Window ${ID}: Closed.`)
        }))
    }
    sendData(ID,tag,data){
        if (!this.Windows[ID]){return false}
        this.Windows[ID].webContents.send(tag,data)
    }
    isOpen(ID){
        return !(!this.Windows[ID])
    }
    closeWindow(ID){
        if (!this.Windows[ID]){return false}
        this.Windows[ID].close()
    }
    closeAllWindows(){
        
    }
}


module.exports = {WindowManager}