data = {}
data.sheets = []
data.Sheet = function () { // each element in data.sheets has its prototype set to this
    this.image = {
        data: '', // base64-encoded image data
        path: '', // path must be provided manually by user
        name: '',
        type: '',
        size: ''
    }
    /*
    The next three are relational.
    e.g.
    a sprite might be a member of several states
    a frame might be a member of several states
    a state might be a member of several sprites or frames

    These relationships are stored as ref properties in their respective
    container objects in the form of indices within the other lists.
    */
    this.persistent = true, // whether localstorage should store the image data
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
data.add = function (file, callback) {
    var s = data.sheets[data.sheets.push(new data.Sheet())-1]
    var fr = new FileReader()
    fr.addEventListener('load', function (e) {
        //console.log(e.total/1000 + 'KB')
        s.update('image', {
            data: fr.result.split(',',2)[1],
            name: file.name,
            type: file.type,
            size: e.total
        })
        callback(s)
    })
    fr.readAsDataURL(file)
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
    try {
        localStorage.setItem('spritesheet-sprite', JSON.stringify(data.sheets))
        data.stime = Date.now()
    }
    catch (e) {
        // for now, do nothing
        console.log('storage quota full')
        data.stime = Date.now()
    }    
}
data.init = function () {
    // create localStorage object if one does not exist
    // fetch data from localStorage
    // populate data.sheets
    if (!('spritesheet-sprite' in localStorage)) {
        localStorage.setItem('spritesheet-sprite', '')
    }
    try {
        data.sheets = JSON.parse(localStorage.getItem('spritesheet-sprite'))
    }
    catch (err) {
        data.sheets = []
    }
    // get the autosave going
    data.save()
}()




ui = window.ui || {}



// UTILITY


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

ui.openModal = function (message, choices, callback, context=document.body) {
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
    context.appendChild(o)
}



// TAB STUFF



ui.newTab = function (x) {
    if (x.constructor == File) {
        data.add(x, ui.newTab)
        return
    }
    var s = ui.sheet.create(x)
    document.querySelector('#sheets').appendChild(s)
    // create new tab
    var t = document.createElement('div')
    t.className = 'tab'
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
    t.innerText = x.image.name
    t.setAttribute('title', x.image.name)
    var tabs = document.querySelectorAll('.tab')
    t.x(tabs.length * (ui.tabW || 0))
    ui.tabs = ui.tabs || document.querySelector('#tabs')
    ui.tabs.appendChild(t)
    if (!ui.tabW) var ts = window.getComputedStyle(t)
    ui.tabW = ui.tabW || parseInt(ts.width)+parseInt(ts.marginRight)
    // set #tabs width manually maintains the scrollable areas size when dragging tabs around.
    ui.tabs.style.width = t.x() + ui.tabW + 'px'
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
    // make sure current tab is within view
    var tabsMain = document.body.querySelector('#tabs-main')
    ui.tabsMainW = parseInt(window.getComputedStyle(tabsMain).width)
    if (ui.current.x() < tabsMain.scrollLeft) {
        tabsMain.scrollLeft = ui.current.x()
    }
    else if ((ui.current.x() + ui.tabW - tabsMain.scrollLeft) > ui.tabsMainW) {
        tabsMain.scrollLeft = ui.current.x() + ui.tabW - ui.tabsMainW
    }
}

ui.closeTabs = function (tab=null) {
    var toX = tab ? [tab] : ui.tabs.querySelectorAll('.tab.selected')
    if (!toX) return
    var newCur = toX[toX.length-1].nextSibling || toX[0].previousSibling
    for (var i=0, item; item=toX[i]; i++) {
        data.remove(item.sheet.data)
        item.sheet.parentNode.removeChild(item.sheet)
        item.parentNode.removeChild(item)
    }
    // move to new positions
    var tabs = ui.tabs.querySelectorAll('.tab')
    for (var i=0, item; item=tabs[i]; i++) {
        item.x(i * ui.tabW)
    }
    ui.tabs.style.width = tabs.length * ui.tabW + 'px'
    ui.current = ui.current.parentNode ? ui.current : null
    if (ui.current) return
    // and in case there is no previousSibling either...
    newCur = ui.tabs.querySelector('.tab.selected') || newCur || ui.tabs.querySelector('.tab')
    newCur && ui.selectTabs(newCur, false)
}


ui.arrangeTabs = function (e) {
    var target = e.target
    var zeroX = e.screenX // to check whether stickiness gets unstuck
    var offsetX = e.offsetX
    var mouseX = e.clientX
    var anim = false
    var tabdrag = false // scope tabdrag to ui so the autoscrolling feature can work
    var autoscroll = false
    var bunched = false
    var tabs = document.body.querySelectorAll('.tab')
    var sels = document.body.querySelectorAll('.tab.selected')
    var toX = false
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
    var dragTabs = function () {
        if (!toX) {
            for (var i=0; i<tabsTo.length; i++) {
                if (bunched && /selected/.test(tabsTo[i].className)) continue
                tabsTo[i].x(i*ui.tabW)
            }
            bunched = true, toX = true
        }
        var scrlX = ui.tabsMain.scrollLeft // ui.tabsMain is defined in the scrolling section
        for (var i=0, s=-1, t; t=tabs[i]; i++) {
            var iott = tabsTo.indexOf(target) // index of target tab
            var ioct = tabsTo.indexOf(t) // index of current tab
            if (/selected/.test(t.className)) {
                var offsetS = ui.tabW * (ioct - iott)
                var minX = ui.tabW * ++s
                var maxX = parseInt(ui.tabs.style.width) - (ui.tabW * (sels.length - s))
                t.x(Math.max(minX,Math.min(maxX,mouseX+scrlX-offsetX+offsetS)))
            }
            else if (ioct < tabsTo.indexOf(sels[0]) &&
            sels[0].x() < t.x() + (ui.tabW * 0.4)) {
                tabsTo.splice(ioct+sels.length,0,tabsTo.splice(ioct,1)[0])
                toX = false
            }
            else if (ioct > tabsTo.indexOf(sels[sels.length-1]) &&
            (sels[sels.length-1].x() + ui.tabW) > t.x() + (ui.tabW * 0.6)) {
                tabsTo.splice(ioct-sels.length,0,tabsTo.splice(ioct,1)[0])
                toX = false
            }
        }
    }
    var scrollTabs = function () {
        autoscroll = true
        var tabsMainW = parseInt(window.getComputedStyle(ui.tabsMain).width)
        if (tabdrag && ((mouseX < 30) || (mouseX > (tabsMainW - 30)))) {
            ui.tabsMain.scrollLeft += mouseX - ((mouseX < 30) ? 30 : (tabsMainW-30))
            dragTabs()
        }
        tabdrag && window.requestAnimationFrame(scrollTabs)
    }
    var mm = function (e) {
        e.preventDefault()
        if (anim) return
        anim = true
        window.requestAnimationFrame(function () {
            anim = false
            tabdrag = tabdrag || (Math.abs(e.screenX - zeroX) > 7)
            if (!tabdrag) return
            mouseX = e.clientX // for the tabdrag autoscroll feature in scrolling section
            !autoscroll && scrollTabs()
            dragTabs()
        })
    }.bind(e.target)
    var mu = function (e) {
        window.removeEventListener('mousemove', mm)
        window.removeEventListener('mouseup', mu, true)
        if (!tabdrag) return
        e.stopPropagation()
        tabdrag = false
        zeroX = e.screenX // reset zeroX to prevent vestigial iteration of mm to reset tabdrag to true
        // apply tabsTo to DOM
        var df = document.createDocumentFragment()
        var sheetsTo = []
        for (var i=0; i<tabsTo.length; i++) {
            df.appendChild(tabsTo[i])
            tabsTo[i].x(i*ui.tabW)
            sheetsTo.push(tabsTo[i].sheet.data)
        }
        ui.tabs.appendChild(df)
        data.reorder(sheetsTo)
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu, true)
}


ui.selectTabs = function (x, deselect=true) {
    // x can be either a MouseEvent or a reference to a tab
    var me = x.constructor == MouseEvent
    var target = me ? x.target : x
    var ck = me && (x.ctrlKey || (/mac/i.test(navigator.platform) && x.metaKey))
    var sk = me && x.shiftKey
    var selected = /selected/.test(target.className)
    var current = /current/.test(target.className)
    var tabs = document.body.querySelectorAll('.tab')
    // if only one tab is selected and the target is that one, nothing to do, return
    if (document.body.querySelectorAll('.selected').length==1 && current) return
    // if you mouse down on a selected tab without holding shift or control, return
    // only arrangeTabs does anything in that case
    if (me && x.type=='mousedown' && !ck && !sk && selected) return
    if (me && x.type=='mouseup' && !(selected && !ck && !sk)) return
    if (deselect && (!me || !ck)) {
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
        target.setClass('selected', selected=!selected)
        if (current) {
            target = document.body.querySelector('.selected') // left-most selected tab
        }
        else if (!selected) return
    }
    target.setClass('selected', true)
    ui.switchTab(target, ck || sk)
}




// TAB SCROLLING



ui.tabsMain = ui.tabsMain || document.body.querySelector('#tabs-main')
ui.tabs = ui.tabs || document.querySelector('#tabs')
ui.tabScroller = document.body.querySelector('#tab-scroller')
ui.tabScroller.bar = ui.tabScroller.querySelector('.bar')
ui.tabScroller.knob = ui.tabScroller.querySelector('.knob')
ui.tabsMainW = parseInt(window.getComputedStyle(ui.tabsMain).width)
ui.tabScroller.barW = parseInt(window.getComputedStyle(ui.tabScroller.bar).width)
ui.tabScroller.barX = parseInt(window.getComputedStyle(ui.tabScroller.bar).left)

ui.tabsMain.addEventListener('wheel', function (e) {
    //console.log('deltaMode is ' + e.deltaMode + ', deltaX is ' + e.deltaX + ', deltaY is ' + e.deltaY)
    //var delta = e.deltaX || e.deltaY
    var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    // normalize delta for deltaModes greater than 0
    // e.g. firefox uses line-based deltas (mode 1)
    if (e.deltaMode) {
        delta = 50*(delta/Math.abs(delta))
    }
    this.scrollLeft += delta
    e.preventDefault()
})

ui.tabScroller.addEventListener('mouseover', function (e) {
    if (!ui.tabs.hasChildNodes() || parseInt(ui.tabs.style.width) <= ui.tabsMainW) return
    ui.tabScroller.timeout = clearTimeout(ui.tabScroller.timeout)
    this.className = this.className.replace(/ *on/g,'') + (this.className ? ' on' : 'on')
})
ui.tabScroller.addEventListener('mouseout', function (e) {
    if (ui.tabScroller.active) {
        ui.tabScroller.timeout = setTimeout(arguments.callee,500)
        return
    }
    ui.tabScroller.timeout = setTimeout(function () {
    ui.tabScroller.className = ui.tabScroller.className.replace(/ *on/g,'')
    },2000)
})

ui.tabScroller.knob.addEventListener('mousedown', function (e) {
    var barW = ui.tabScroller.barW
    var barX = ui.tabScroller.barX
    var knob = ui.tabScroller.knob
    var knobW = parseInt(window.getComputedStyle(ui.tabScroller.knob).width)
    var tabsW = parseInt(ui.tabs.style.width)
    var offsetX = e.offsetX
    var maxScroll = tabsW - ui.tabsMainW
    ui.tabScroller.active = true
    var mm = function (e) {
        e.preventDefault()
        if (knob.anim) return
        knob.anim = true
        window.requestAnimationFrame(function () {
            var x = Math.max(0,Math.min(barW-knobW, e.clientX - barX - offsetX))
            knob.style.left = x + 'px'
            ui.tabsMain.scrollLeft = maxScroll * (x / (barW - knobW))
            knob.anim = false
        })
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', function (e) {
        if (!ui.tabScroller.active) return
        ui.tabScroller.active = false
        window.removeEventListener('mousemove', mm)
        window.removeEventListener('mouseup', arguments.callee)
    })
})

ui.tabScroller.bar.addEventListener('mousedown', function (e) {
    if (e.target != this) return
    ui.tabScroller.active = true
    var hot = true // determines whether mouse is in the activation area
    var barW = ui.tabScroller.barW
    var tabsW = parseInt(ui.tabs.style.width)
    var scrollTo = (tabsW - ui.tabsMainW) * (e.offsetX / barW)
    var marginX = ui.tabs.querySelector('.tab').x.call(this)
    var trackX = function (e) {
        hot = (e.target == ui.tabScroller.bar) || ui.tabScroller.bar.contains(e.target)
        e.preventDefault()
        scrollTo = (tabsW - ui.tabsMainW) * ((e.clientX - marginX) / barW)
    }
    window.requestAnimationFrame(function (ts) {
        if (hot) {
            var vector = scrollTo - ui.tabsMain.scrollLeft
            ui.tabsMain.scrollLeft += ((vector / Math.abs(vector)) || 0) * Math.min(Math.abs(vector),20)
        }
        ui.tabScroller.active && window.requestAnimationFrame(arguments.callee)
    })
    window.addEventListener('mousemove', trackX)
    window.addEventListener('mouseup', function (e) {
        ui.tabScroller.active = false
        window.removeEventListener('mousemove', trackX)
        window.removeEventListener('mouseup', arguments.callee)
    })
})

ui.resettingScrollbar = false
ui.resetScrollbar = function (e) {
    if (ui.resettingScrollbar) return
    ui.resettingScrollbar = true
    window.requestAnimationFrame(function () {
        var barW = ui.tabScroller.barW
        var knob = ui.tabScroller.knob
        knob.initW = knob.initW || parseInt(window.getComputedStyle(knob).width)
        var tabsW = parseInt(ui.tabs.style.width)
        // adjust knob size
        knobW = Math.max(knob.initW,Math.min(barW,barW*(ui.tabsMainW/tabsW)))
        var ratioScrolled = ui.tabsMain.scrollLeft / (tabsW - ui.tabsMainW)
        knob.style.width = knobW + 'px'
        knob.style.left = (barW - knobW) * ratioScrolled + 'px'
        ui.resettingScrollbar = false
    })
}

ui.tabsMain.addEventListener('scroll', ui.resetScrollbar)
window.addEventListener('resize', function (e) {
    ui.tabsMainW = parseInt(window.getComputedStyle(ui.tabsMain).width)
    ui.tabScroller.barW = parseInt(window.getComputedStyle(ui.tabScroller.bar).width)
    ui.resetScrollbar()
})




// DRAG AND DROP FILES

ui.main = ui.main || document.querySelector('#main')

ui.main.addEventListener('dragenter', function (e) {
    if (e.dataTransfer.types.indexOf('Files')<0) return
    ui.openAlert('filedrop')
})
ui.main.addEventListener('dragleave', function (e) {
    e.preventDefault()
    if (e.dataTransfer.types.indexOf('Files')<0) return
    document.querySelector('body > .overlay').remove()
})
ui.main.addEventListener('dragover', function (e) {// yes, this is necessary
    e.preventDefault()
})
ui.main.addEventListener('drop', function (e) {
    e.preventDefault()
    if (e.dataTransfer.types.indexOf('Files')<0) return
    document.querySelector('body > .overlay').remove()
    if (!e.dataTransfer.files) {
        return
    }
    for (var i=0, item; item=e.dataTransfer.files[i]; i++) {
        ui.newTab(item)
    }
})




// KEY BINDINGS



window.addEventListener('keydown', function (e) {
    // check reserved
    if (!/[\[\]\\w]/i.test(e.key)) return
    e.preventDefault()
    var control = (/mac/i.test(navigator.platform) && e.metaKey) || e.ctrlKey
    if (!ui.current) return
    // remove alt key as modifier for tab navigation--no need
    if (e.key == '[') ui.selectTabs(ui.current.previousSibling || ui.current.parentNode.lastChild)
    else if (e.key == ']') ui.selectTabs(ui.current.nextSibling || ui.current.parentNode.firstChild)
    else if (e.key == '\\') ui.selectTabs(ui.last || ui.current)
    //else if (e.altKey && /[0-9]/.test(e.key)) ui.selectTabs(getTabRef(+e.key))
    else if (e.altKey && /w/i.test(e.key)) ui.closeTabs()
})





// LOAD EXISTING SESSION IF IT EXISTS



if (data.sheets.length) {
    for (var i=0; i<data.sheets.length; i++) {
        ui.newTab(data.sheets[i])
    }
}
