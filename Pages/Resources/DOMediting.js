function removeElement(elementId) {
    // Removes an element from the document
    var element = document.getElementById(elementId);
    element.parentNode.removeChild(element);
}
function addElement(parentId, elementTag, elementId, elementClass, html) {
    // Adds an element to the document
    var p = document.getElementById(parentId);
    var newElement = document.createElement(elementTag);
    newElement.setAttribute('id', elementId);
    newElement.setAttribute('class', elementClass);
    newElement.innerHTML = html;
    p.appendChild(newElement);
}
function loadjscssfile(filename, filetype){
    if (filetype=="js"){ //if filename is a external JavaScript file
        var fileref=document.createElement('script')
        fileref.setAttribute("type","text/javascript")
        fileref.setAttribute("src", filename)
    }
    else if (filetype=="css"){ //if filename is an external CSS file
        var fileref=document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
    }
    if (typeof fileref!="undefined")
        document.getElementsByTagName("head")[0].appendChild(fileref)
}
function createjscssfile(filename, filetype){
    if (filetype=="js"){ //if filename is a external JavaScript file
        var fileref=document.createElement('script')
        fileref.setAttribute("type","text/javascript")
        fileref.setAttribute("src", filename)
    }
    else if (filetype=="css"){ //if filename is an external CSS file
        var fileref=document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
    }
    return fileref
}
 
function replacejscssfile(oldfilename, newfilename, filetype){
    var targetelement=(filetype=="js")? "script" : (filetype=="css")? "link" : "none" //determine element type to create nodelist using
    var targetattr=(filetype=="js")? "src" : (filetype=="css")? "href" : "none" //determine corresponding attribute to test for
    var allsuspects=document.getElementsByTagName(targetelement)
    for (var i=allsuspects.length; i>=0; i--){ //search backwards within nodelist for matching elements to remove
        if (allsuspects[i] && allsuspects[i].getAttribute(targetattr)!=null && allsuspects[i].getAttribute(targetattr).indexOf(oldfilename)!=-1){
            var newelement=createjscssfile(newfilename, filetype)
            allsuspects[i].parentNode.replaceChild(newelement, allsuspects[i])
        }
    }
}
function setupThemes(){
    let Store = require('electron-store');
    let store = new Store();
    const reload = require('electron-css-reload');
    if (!store.has('Themes')){
        store.set('currentTheme','Darkly')
        store.set('Themes',{
            "Darkly":{"url":"https://bootswatch.com/4/darkly/bootstrap.min.css","description":"Flatly in night mode"},
            "Flatly":{"url":"https://bootswatch.com/4/flatly/bootstrap.min.css","description":"Flat and modern"},
            "Cerulean":{"url":"https://bootswatch.com/4/cerulean/bootstrap.min.css","description":"A calm blue sky"},
            "Cosmo":{"url":"https://bootswatch.com/4/cosmo/bootstrap.min.css","description":"An ode to Metro"},
            "Cyborg":{"url":"https://bootswatch.com/4/cyborg/bootstrap.min.css","description":"Jet black and electric blue"},
            "Journal":{"url":"https://bootswatch.com/4/journal/bootstrap.min.css","description":"Crisp like a new sheet of paper"},
            "Litera":{"url":"https://bootswatch.com/4/litera/bootstrap.min.css","description":"The medium is the message"},
            "Lumen":{"url":"https://bootswatch.com/4/lumen/bootstrap.min.css","description":"Light and shadow"},
            "Lux":{"url":"https://bootswatch.com/4/lux/bootstrap.min.css","description":"A touch of class"},
            "Materia":{"url":"https://bootswatch.com/4/materia/bootstrap.min.css","description":"Material is the metapho"},
            "Minty":{"url":"https://bootswatch.com/4/minty/bootstrap.min.css","description":"A fresh feel"},
            "Pulse":{"url":"https://bootswatch.com/4/pulse/bootstrap.min.css","description":"A trace of purple"},
            "Sandstone":{"url":"https://bootswatch.com/4/sandstone/bootstrap.min.css","description":"A touch of warmth"},
            "Simplex":{"url":"https://bootswatch.com/4/simplex/bootstrap.min.css","description":"Mini and minimalist"},
            "Sketchy":{"url":"https://bootswatch.com/4/sketchy/bootstrap.min.css","description":"A hand-drawn look for mockups and mirth"},
            "Slate":{"url":"https://bootswatch.com/4/slate/bootstrap.min.css","description":"Shades of gunmetal gray"},
            "Solar":{"url":"https://bootswatch.com/4/solar/bootstrap.min.css","description":"A spin on Solarized"},
            "Spacelab":{"url":"https://bootswatch.com/4/spacelab/bootstrap.min.css","description":"Silvery and sleek"},
            "Superhero":{"url":"https://bootswatch.com/4/superhero/bootstrap.min.css","description":"The brave and the blue"},
            "United":{"url":"https://bootswatch.com/4/united/bootstrap.min.css","description":"Ubuntu orange and unique font"},
            "Yeti":{"url":"https://bootswatch.com/4/yeti/bootstrap.min.css","description":"A friendly foundation"}
        })
    }
    loadjscssfile(store.get(`Themes.${store.get('currentTheme')}.url`),'css')
    
}


function updateTheme(){
    const reload = require('electron-css-reload');
    let Store = require('electron-store');
    let store = new Store();
    document.getElementById('Theme').href = store.get(`Themes.${store.get('currentTheme')}.url`)
    reload()
}
setupThemes()