ui = window.ui || {}


HTMLElement.prototype.setClass = function (classname, tf) {
    this.className = this.className.replace(new RegExp(' *'+classname, 'g'), '')
    if (tf) this.className += this.className ? ' '+classname : classname
}

ui.sheet = {}
ui.sheet.activeTools = []

ui.sheet.global = {}
ui.sheet.global.init = function () {
    // INITIALIZE THE CANVAS
    var cnv = this.canvas
    var cnvCSS = window.getComputedStyle(cnv)
    // cannot proceed until we have the following info
    if (!cnv.img.width || (!ui.sheet.canvas.width && isNaN(parseInt(cnvCSS.width)))) {
        this.timeout = setTimeout(this.init.bind(this),100)
        return
    }
    cnv.width = ui.sheet.canvas.width = ui.sheet.canvas.width || parseInt(cnvCSS.width)
    cnv.height = ui.sheet.canvas.height = ui.sheet.canvas.height || parseInt(cnvCSS.height)
    var img = cnv.img
    img.initW = img.width // save initial values
    img.initH = img.height
    var padding = 20 // so the image is not pinned up against the edges
    var stgW = cnv.width - padding
    var stgH = cnv.height - padding
    var zoom = this.data.q('zoom') || function () {
        var wd = stgW - img.initW // width difference
        var hd = stgH - img.initH // height difference
        var wp = (img.initW/img.initH) > (stgW/stgH) // width priority
        return wp ? ((img.initW + wd) / img.initW) : ((img.initH + hd) / img.initH)
    }.call(cnv)
    img.style.width = img.initW * zoom + 'px'
    img.style.height = img.initH * zoom + 'px'
    img.style.left = (cnv.width - parseInt(img.style.width)) / 2 + 'px'
    img.style.top = (cnv.height - parseInt(img.style.height)) / 2 + 'px'
}

// the actual workarea
ui.sheet.canvas = {}

ui.sheet.canvas.width
ui.sheet.canvas.height


ui.sheet.canvas.onmousedown = function (e) {
    if (!'onmousedown' in ui.sheet.activeTools[0]) return
    ui.sheet.activeTools[0].onmousedown.call(this, e)
}
ui.sheet.canvas.onmousemove = function (e) {
    if (!'onmousemove' in ui.sheet.activeTools[0]) return
    if (ui.sheet.canvas.mmActive) return
    ui.sheet.canvas.mmActive = true
    window.requestAnimationFrame(function () {
        ui.sheet.activeTools[0].onmousemove.call(this, e)
        ui.sheet.canvas.mmActive = false
    })
}
ui.sheet.canvas.onmouseup = function (e) {
    if (!'onmouseup' in ui.sheet.activeTools[0]) return
    ui.sheet.activeTools[0].onmouseup.call(this, e)
}
ui.sheet.canvas.onwheel = function (e) {
    if (!'onwheel' in ui.sheet.activeTools[0]) return
    ui.sheet.activeTools[0].onwheel.call(this, e)
}
ui.sheet.canvas.onkeydown = function (e) {
    if (!'onkeydown' in ui.sheet.activeTools[0]) return
    ui.sheet.activeTools[0].onkeydown.call(this, e)
}


// TOOLS

/*
All the event handlers in the canvas above will simply relay the
messages to the currently active tool in the active tool stack.

e.g. If the "rect" tool is active, the mousedown and mousemove
will simply relay the messages to the "rect" tool's handlers.

Holding spacebar down will temporarily activate the "pan" tool, and
the "pan" tool will receive the events.

A tool must meet certain specifications:
1. a self-calling init() function which does any prepwork and registers itself
   with the tool registry.
2. handlers for all events received by the canvas, whether or not they will
   be used by the tool. Tools may also relay handlers to other tools, as in the
   case of the snapping tool.
3. 

*/
ui.sheet.tools = ui.sheet.tools || [] // external tools can also be created

// default nothing tool
ui.sheet.tools.push({
    onmousedown: function (e) {
        console.log(e.button)
    },
    onmousemove: function (e) {
        //console.log(e.offsetX + ', ' + e.offsetY)
    },
    onmouseup: function (e) {
        return
    },
    onkeydown: function (e) {
        return
    },
    onwheel: function (e) {
        return
    }
})


ui.sheet.activeTools.push(ui.sheet.tools[0])


// ENTRY POINT FOR NEW DOCUMENT


ui.sheet.create = function (dataref) {
    var sheet = document.querySelector('template#sheet').content.querySelector('.sheet').cloneNode(true)
    sheet.data = dataref
    for (var i in ui.sheet.global) {
        sheet[i] = ui.sheet.global[i]
    }
    sheet.canvas = sheet.querySelector('.canvas')
    for (var i in ui.sheet.canvas) {
        sheet.canvas[i] = ui.sheet.canvas[i]
    }
    sheet.panel = sheet.querySelector('.panel')
    for (var i in ui.sheet.panel) {
        sheet.panel[i] = ui.sheet.panel[i]
    }
    var img = sheet.canvas.img = document.createElement('img')
    img.className = 'checkerbg'
    img.setAttribute('draggable',false)
    img.src = sheet.data.image.path || 'data:'+sheet.data.image.type+';base64,'+sheet.data.image.data
    sheet.canvas.appendChild(img)
    sheet.init()
    return sheet
}
