ui = window.ui || {}


HTMLElement.prototype.setClass = function (classname, tf) {
    this.className = this.className.replace(new RegExp(' *'+classname, 'g'), '')
    if (tf) this.className += this.className ? ' '+classname : classname
}

ui.sheet = {}

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
    var margin = 20 // so the image is not pinned up against the edges
    var stgW = cnv.width - margin
    var stgH = cnv.height - margin
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

 



//the create function is a factory function


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
