data = {}
data.sheets = []
data.Sheet = function () { // each element in data.sheets has its prototype set to this
    this.file = {} // file object to be re-retrieved upon load by a FileReader
    /*
    The next three are relational.
    e.g.
    a sprite might be a member of several states
    a frame might be a member of several states
    a state might be a member of several sprites or frames

    These relationships are stored as ref properties in their respective
    container objects in the form of indices within the other lists.
    */
    this.sprites = [] // all sprites and member data in current sheet
    this.states = []  // all different states among different sprites 
    this.frames = []  // all different frames among different states
    this.grid_distance = 100
    this.grid_on = true
    this.guidelines_h = []
    this.guidelines_v = []
    this.guidelines_on = true
}
data.stringify = function () {
    // will return the stringified JSON string
}
data.add = function (file) {
    // create new entry in data.sheets, returns ref to new entry
    var i = data.sheets.push(new data.Sheet())
    data.sheets[i-1].file = file
    return data.sheets[i-1]
}
data.remove = function (sheet) {
    // sheet is a reference to one of the items in data.sheets
    data.sheets.splice(data.sheets.indexOf(sheet), 1)
}
data.update = function (sheet, value=null) {

}
data.reorder = function () {
    // the tab order is synced with data.sheets order
    // when tabs are rearranged, we must reorder data.sheets
}
data.init = function () {
    // create localStorage object if one does not exist
    // fetch data from localStorage
    // populate data.sheets
    if (!('spritesheet-sprite' in localStorage)) {
        localStorage.setItem('spritesheet-sprite', '')
        return
    }
    try { data.sheets = JSON.parse(localStorage.getItem('spritesheet-sprite')) }
    catch (err) { data.sheets = [] }
}()




ui = window.ui || {}

// utility functions
ui.openAlert = function (template_id, ttl=0) {
    // ttl set to 0 (secs) will not timeout (default)
    // clicking on the alert, hitting esc, or the X will close the alert
    var ov = document.querySelector('template#overlays').content.querySelector('#'+template_id).cloneNode(true)
    ov.remove = function () {
        this.className += ' off'
    }
    ov.addEventListener('transitionend', function (e) {
        ov.parentNode.removeChild(ov)
    })
    document.body.appendChild(ov)
    ttl && setTimeout(ov.remove.bind(ov), ttl*1000)
}

ui.openModal = function (message, choices, callback) {
    // choices is an array with each item a button value
    // the callback will be passed the selected index from the choices array
    var o = document.createElement('div')
    o.className = 'overlay'
    var m = document.createElement('div')
    m.className = 'modal'
    o.appendChild(m)
    var mm = document.createElement('div')
    mm.className = 'message'
    mm.innerText = message
    m.appendChild(mm)
    for (var i=0; i < choices.length; i++) {
        var b = document.createElement('div')
        b.className = 'choice'
        b.choice = i;
        b.innerText = choices[i]
        b.addEventListener('click', function (e) {
            callback(this.choice)
            o.className += ' off'
        })
        m.appendChild(b)
    }
    document.body.appendChild(o)
}


// TAB STUFF

ui.newTab = function (file) {
    // if no file is passed, it will open the default filedrop tab
    //console.log(file.name)
    var d = data.add(file)
    var s = ui.sheet.create(d)
    document.querySelector('#sheets').appendChild(s)
    // create new tab
    var t = document.querySelector('template#tab').content.querySelector('.tab').cloneNode(true)
    t.data = d
    // tab and sheet should hold reference to one another
    t.sheet = s
    s.tab = t
    t.addEventListener('mousedown', ui.selectTabs)
    s.setClass = t.setClass = function (classname, tf) {
        this.className = this.className.replace(new RegExp(' *'+classname, 'g'), '')
        if (tf) this.className += this.className ? ' '+classname : classname
    }
    t.innerText = d.file.name
    t.setAttribute('title', d.file.name)
    document.querySelector('#tabs').appendChild(t)
    ui.selectTabs(t)
}

ui.current = null
ui.last = null // because ctrl+\ will revert to previous tab
ui.switchTab = function (tab, skipLast=false) {
    //console.log(tab.data.file.name)
    if (ui.current) {
        ui.current.setClass('current', false)
        ui.current.sheet.setClass('current', false)
    }
    tab.sheet.setClass('current', true)
    tab.setClass('current', true)
    ui.last = skipLast ? ui.last : ui.current
    ui.current = tab
}

ui.closeTabs = function (tab=null) {
    var toX = tab ? [tab] : document.body.querySelectorAll('.tab.selected')
    for (var i=0; i < toX.length; i++) {
        data.remove(toX[i].data)
        toX[i].sheet.parentNode.removeChild(toX[i].sheet)
        toX[i].parentNode.removeChild(toX[i])
    }
    ui.selectTabs(document.body.querySelector('.tab.selected') || document.body.querySelector('.tab'))
}

ui.anchor = null
ui.selectTabs = function (x) {
    // x can be either a MouseEvent or a reference to a tab
    var me = x.constructor == MouseEvent
    var target = me ? x.target : x
    if (document.body.querySelectorAll('.selected').length==1 &&
        /current/.test(target.className)) return
    var ck = me && (x.ctrlKey || (/mac/i.test(navigator.platform) && x.metaKey))
    var sk = me && x.shiftKey
    var tabs = document.body.querySelectorAll('.tab')
    if (!me || !ck) {
        [].forEach.call(tabs, function (i) {
            i.setClass('selected', false)
        })
    }
    if (sk) {
        for (var i=0, sel=0; sel < 2; i++) {
            sel += tabs[i] == ui.anchor
            sel += tabs[i] == target
            sel && tabs[i].setClass('selected', true)
        }
    }
    else ui.anchor = target
    if (!sk && ck) {
        target.setClass('selected', !/selected/.test(target.className))
        if (/current/.test(target.className)) {
            target = document.body.querySelector('.selected') // left-most selected tab
        }
        else if (!/selected/.test(target.className)) return
    }
    target.setClass('selected', true)
    ui.switchTab(target, ck || sk)
}


ui.main = document.querySelector('#main')
ui.main.addEventListener('dragenter', function (e) {
    ui.openAlert('filedrop')
})
ui.main.addEventListener('dragleave', function (e) {
    document.querySelector('body > .overlay').remove()
})
ui.main.addEventListener('dragover', function (e) {// yes, this is necessary
    e.preventDefault()
})
ui.main.addEventListener('drop', function (e) {
    e.preventDefault()
    document.querySelector('body > .overlay').remove()
    if (!e.dataTransfer.files) {
        return
    }
    [].forEach.call(e.dataTransfer.files, function (item) {
        ui.newTab(item)
    })
})
window.addEventListener('keydown', function (e) {
    
    // check reserved
    if (!/[\[\]\\w]/.test(e.key)) return
    e.preventDefault()
    //e.stopPropagation()
    if (!((/mac/i.test(navigator.platform) && e.metaKey) || e.ctrlKey || e.altKey)) return

    if (!ui.current) return
    if (e.key == '[') ui.selectTabs(ui.current.previousSibling || ui.current.parentNode.lastChild)
    if (e.key == ']') ui.selectTabs(ui.current.nextSibling || ui.current.parentNode.firstChild)
    if (e.key == '\\') ui.selectTabs(ui.last)
    if (e.altKey && (e.key == 'w')) ui.closeTabs()
})