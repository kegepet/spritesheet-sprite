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
data.Sheet.prototype.update = function (k, v) {
    this[k] = v
    data.mtime = Date.now()
}
data.stringify = function () {
    // will return the stringified JSON string
}
data.add = function (file) {
    // create new entry in data.sheets, returns ref to new entry
    var i = data.sheets.push(new data.Sheet())
    data.sheets[i-1].file = file
    data.mtime = Date.now()
    return data.sheets[i-1]
}
data.remove = function (sheet) {
    // sheet is a reference to one of the items in data.sheets
    data.sheets.splice(data.sheets.indexOf(sheet), 1)
    data.mtime = Date.now()
}
data.reorder = function (sheetsTo) {
    // the tab order is synced with data.sheets order
    // when tabs are rearranged, we must reorder data.sheets
    data.sheets = sheetsTo
    data.mtime = Date.now()
}
data.mtime = Date.now() // the modified time of the data.sheets
data.stime = data.mtime // the last time saved
data.save = function () {
    data.timeout && clearTimeout(data.timeout)
    data.timeout = setTimeout(data.save, 5000)
    if (data.mtime <= data.stime) return
    localStorage.setItem('spritesheet-sprite', JSON.stringify(data.sheets))
    data.stime = Date.now()    
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
    // get the autosave going
    data.save()
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
    var d = data.add(file)
    var s = ui.sheet.create(d)
    document.querySelector('#sheets').appendChild(s)
    // create new tab
    var t = document.createElement('div')
    t.className = 'tab'
    t.data = d
    // tab and sheet should hold reference to one another
    t.sheet = s
    s.tab = t
    t.addEventListener('mousedown', function (e) {
        e.preventDefault()
        ui.selectTabs(e)
        ui.arrangeTabs(e)
    })
    t.addEventListener('mouseup', ui.selectTabs)
    s.setClass = t.setClass = function (classname, tf) {
        this.className = this.className.replace(new RegExp(' *'+classname, 'g'), '')
        if (tf) this.className += this.className ? ' '+classname : classname
    }
    t.x = function (to=null) {
        if (to != null) {
            this.int_x = to
            this.style.left = to + 'px'
        }
        else this.int_x = 'int_x' in this ? this.int_x : parseInt(window.getComputedStyle(this).left)
        return this.int_x
    }
    t.innerText = d.file.name
    t.setAttribute('title', d.file.name)
    var tabs = document.querySelectorAll('.tab')
    var ts = tabs.length && window.getComputedStyle(tabs[0])
    t.x(tabs.length * (parseInt(ts.width) + parseInt(ts.marginRight)))
    document.querySelector('#tabs').appendChild(t)
    /*
    #tabs-spacer prevents a problem which occurs when you
    drag a range to the end of the tabs area, and the last
    tab moves out of place, which causes the scrollable
    area to shorten for a moment, messing everything up.
    #tabs-spacer maintains the scrollable areas size when
    dragging tabs around.
    */
    document.querySelector('#tabs-spacer').style.width = t.x() + parseInt(ts.width) + parseInt(ts.marginRight) + 'px'
    console.log(document.querySelector('#tabs-spacer').style.width)
    ui.selectTabs(t)
}

ui.current = null
ui.last = null // because ctrl+\ will revert to previous tab
ui.switchTab = function (tab, skipLast=false) {
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
    var newCur = toX[toX.length-1].nextSibling || toX[0].previousSibling
    for (var i=0, item; item=toX[i]; i++) {
        data.remove(item.data)
        item.sheet.parentNode.removeChild(item.sheet)
        item.parentNode.removeChild(item)
    }
    // move to new positions
    var tabs = document.body.querySelectorAll('.tab')
    var ts = tabs.length && window.getComputedStyle(tabs[0])
    for (var i=0, item; item=tabs[i]; i++) {
        item.x(i * (parseInt(ts.width) + parseInt(ts.marginRight)))
    }
    // resize #tabs-spacer
    document.querySelector('#tabs-spacer').style.width = tabs.length*(parseInt(ts.width)+parseInt(ts.marginRight)) + 'px'
    ui.current = ui.current.parentNode ? ui.current : null
    // and in case there is no previousSibling either...
    newCur = newCur || document.body.querySelector('.tab')
    newCur && ui.selectTabs(newCur)
}


ui.arrangeTabs = function (e) {
    var zeroX = e.screenX // to check whether stickiness gets unstuck
    var offsetX = e.offsetX
    var anim = false
    var tabdrag = false
    var bunched = false
    var tabs = document.body.querySelectorAll('.tab')
    var sels = document.body.querySelectorAll('.tab.selected')
    var toX = false
    var tabStyle = window.getComputedStyle(tabs[0])
    var tabW = parseInt(tabStyle.width)+parseInt(tabStyle.marginRight)
    // the bunch-up
    var tabsTo = []
    for (var i=0, q=[], x=-1; i<tabs.length; i++) {
        if (tabs[i] == e.target) x = tabsTo.length
        if (/selected/.test(tabs[i].className)) q.push(tabs[i])
        else tabsTo.push(tabs[i])
        while (x > -1 && q.length) {
            tabsTo.splice(x++, 0, q.shift())
        }
    }
    var minX = (e.pageX+e.target.parentNode.scrollLeft)-(tabW*tabsTo.indexOf(sels[0]))
    var maxX = (e.pageX+e.target.parentNode.scrollLeft)+((tabW*tabsTo.length)-(tabW*(tabsTo.indexOf(sels[sels.length-1])+1)))
    // mousemove handler
    var mm = function (e) {
        if (anim) return
        anim = true
        window.requestAnimationFrame(function () {
            anim = false
            tabdrag = tabdrag || (Math.abs(e.screenX - zeroX) > 7)
            if (!tabdrag || tabdrag=='cancel') return
            if (!toX) {
                for (var i=0; i<tabsTo.length; i++) {
                    if (bunched && /selected/.test(tabsTo[i].className)) continue
                    tabsTo[i].x(i*tabW)
                }
                bunched = true, toX = true
            }
            for (var i=0, t; t=tabs[i]; i++) {
                var iott = tabsTo.indexOf(this) // index of target
                var ioct = tabsTo.indexOf(t) // index of current tab
                if (/selected/.test(t.className)) {
                    //t.x((e.pageX - offsetX) + ((ioct - iott) * tabW))
                    t.x((Math.max(minX,Math.min(maxX,(e.pageX+this.parentNode.scrollLeft)))-offsetX)+((ioct-iott)*tabW))
                }
                else if (ioct < tabsTo.indexOf(sels[0]) &&
                sels[0].x() < t.x() + (tabW * 0.4)) {
                    tabsTo.splice(ioct+sels.length,0,tabsTo.splice(ioct,1)[0])
                    toX = false
                }
                else if (ioct > tabsTo.indexOf(sels[sels.length-1]) &&
                (sels[sels.length-1].x() + tabW) > t.x() + (tabW * 0.6)) {
                    tabsTo.splice(ioct-sels.length,0,tabsTo.splice(ioct,1)[0])
                    toX = false
                }
            }
        }.bind(this))
    }.bind(e.target)
    // mouseup handler
    var mu = function (e) {
        window.removeEventListener('mousemove', mm)
        window.removeEventListener('mouseup', mu, true)
        if (!tabdrag) return
        e.stopPropagation()
        tabdrag = 'cancel'
        // apply tabsTo to DOM
        var df = document.createDocumentFragment()
        var sheetsTo = []
        for (var i=0; i<tabsTo.length; i++) {
            df.appendChild(tabsTo[i])
            tabsTo[i].x(i*tabW)
            sheetsTo.push(tabsTo[i].data)
        }
        document.querySelector('#tabs').appendChild(df)
        data.reorder(sheetsTo)
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu, true)
}


ui.selectTabs = function (x) {
    // x can be either a MouseEvent or a reference to a tab
    var me = x.constructor == MouseEvent
    var target = me ? x.target : x
    var ck = me && (x.ctrlKey || (/mac/i.test(navigator.platform) && x.metaKey))
    var sk = me && x.shiftKey
    var selected = /selected/.test(target.className)
    var current = /current/.test(target.className)
    var tabs = document.body.querySelectorAll('.tab')
    // if only one tab is selected and the target is that one, nothign to do--return
    if (document.body.querySelectorAll('.selected').length==1 && current) return
    // if you mouse down on a selected tab without holding shift or control, return
    // only arrangeTabs does anything in that case
    if (me && x.type=='mousedown' && !ck && !sk && selected) return
    if (me && x.type=='mouseup' && !selected) return
    if (!me || !ck) {
        for (var i=0, item; item=tabs[i]; i++) {
            item.setClass('selected', false)
        }
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
        target.setClass('selected', !selected)
        if (current) {
            target = document.body.querySelector('.selected') // left-most selected tab
        }
        else if (!selected) return
    }
    target.setClass('selected', true)
    ui.switchTab(target, ck || sk)
}




//ui.tabBox = document.querySelector('#tabs')

ui.scrollTabs = function (e) {
    this.scrollLeft += (50*(e.deltaY/Math.abs(e.deltaY)))    
}
document.querySelector('#tabs').addEventListener('wheel', ui.scrollTabs)


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
    for (var i=0, item; item=e.dataTransfer.files[i]; i++) {
        ui.newTab(item)
    }
})
window.addEventListener('keydown', function (e) {
    // check reserved
    if (!/[\[\]\\w]/i.test(e.key)) return
    e.preventDefault()
    var control = (/mac/i.test(navigator.platform) && e.metaKey) || e.ctrlKey
    if (!ui.current) return
    if (e.altKey && e.key == '[') ui.selectTabs(ui.current.previousSibling || ui.current.parentNode.lastChild)
    else if (e.altKey && e.key == ']') ui.selectTabs(ui.current.nextSibling || ui.current.parentNode.firstChild)
    else if (e.altKey && e.key == '\\') ui.selectTabs(ui.last || ui.current)
    else if (e.altKey && /w/i.test(e.key)) ui.closeTabs()
})
