ui = window.ui || {}


HTMLElement.prototype.setClass = function (classname, tf) {
    this.className = this.className.replace(new RegExp(' *'+classname, 'g'), '')
    if (tf) this.className += this.className ? ' '+classname : classname
}

// anything application-wide goes here
ui.sheet = {}
ui.sheet.tools = ui.sheet.tools || {}

// anything instance-wide goes here
ui.sheet.global = {}

ui.sheet.global.tools = function () {
    var a = []
    a.mousedown = []
    a.mouseup = []
    a.mousemove = []
    a.keydown = []
    a.wheel = []
    return a
}()
ui.sheet.global.revert = [] // the undo/redo stack

ui.sheet.global.init = function () {
    // INITIALIZE THE surface
    var sfcCSS = window.getComputedStyle(this.surface)
    // cannot proceed until we have the following info
    if (!this.surface.img.width || (!ui.sheet.surface.width && isNaN(parseInt(sfcCSS.width)))) {
        setTimeout(this.init.bind(this),100)
        return
    }
    this.surface.width = ui.sheet.surface.width = ui.sheet.surface.width || parseInt(sfcCSS.width)
    this.surface.height = ui.sheet.surface.height = ui.sheet.surface.height || parseInt(sfcCSS.height)

    // work surface/panel sizing
    var resizeSheet = function (x) {
        this.data.q('dividerX', x)
        this.divider.style.left = x + 'px'
        this.surface.width = x + 2
        this.surface.style.width = this.surface.width + 'px'
        this.panel.style.left = x + 3 + 'px'
    }.bind(this)
    if (this.data.q('dividerX')) resizeSheet(this.data.q('dividerX'))
    this.divider.addEventListener('mousedown', function (e) {
        var offsetX = e.offsetX
        var mm = function (e) {
            if (this.resizing) return
            this.resizing = true
            window.requestAnimationFrame(function () {
                resizeSheet(e.clientX - offsetX)
                this.resizing = false
            }.bind(this))
        }
        window.addEventListener('mousemove', mm)
        window.addEventListener('mouseup', function (e) {
            window.removeEventListener('mousemove', mm) 
            window.removeEventListener('mouseup', arguments.callee)  
        })   
    })

    // initialize the tools
    for (var t in ui.sheet.tools) {
        this.tools.push(new ui.sheet.tools[t](this))
    }
}

// the actual workarea
ui.sheet.surface = {}

ui.sheet.surface.width
ui.sheet.surface.height











ui.sheet.tools['zoom'] = function (c) {
    this.description = 
'Zoom scales the image superficially: often \
necessary to achieve the desired precision.'
    var curZoom = c.data.q('zoom')
    var maxZoom = 500//8
    this.zoom = function (z=null, save=true) {
        if (z!==null) {
            curZoom = z
            save && c.data.q('zoom', curZoom)
            var r = this.r, img = c.surface.img
            r.value = z<1 ? (-1/z)+1 : z-1
            img.style.width = img.initW * z + 'px'
            img.style.height = img.initH * z + 'px'
            img.style.left = (c.surface.width - parseInt(img.style.width)) / 2 + 'px'
            img.style.top = (c.surface.height - parseInt(img.style.height)) / 2 + 'px'
        }
        return curZoom
    }
    c.surface.addEventListener('wheel', function (e) {
        // normalize wheel info
        var dir = -e.deltaY/Math.abs(e.deltaY)
        var z = Math[dir>0?'floor':'ceil'](curZoom<1 ? (-1/curZoom)+1 : curZoom-1)
        z = Math.max(-maxZoom,Math.min(maxZoom,z+dir))
        this.zoom(z<0 ? -1/--z : ++z)
    }.bind(this))
    window.addEventListener('keydown', function (e) {
        if (!/[+\-_=0]/.test(e.key)) return
        var z
        if (e.key=='0') z = 1
        else {
            var dir = /[+=]/.test(e.key) ? 1 : -1
            z = Math[dir>0?'floor':'ceil'](curZoom<1 ? (-1/curZoom)+1 : curZoom-1)
            z = Math.max(-maxZoom,Math.min(maxZoom,z+dir))
            z = z<0 ? -1/--z : ++z
        }
        this.zoom(z)
    }.bind(this))
    // initialize
    // create panel elements
    var z = document.createElement('div')
    z.id = 'zoom-options'
    z.className = 'tool-options'
    z.title = this.description
    var r = this.r = z.appendChild(document.createElement('input'))
    r.id = 'zoom-slider'
    r.type = 'range'
    r.min = -maxZoom
    r.max = maxZoom
    r.value = 0
    r.oninput = function (e) {
        var z = +r.value
        this.zoom(z<0 ? -1/--z : ++z)
    }.bind(this)
    var l = z.appendChild(document.createElement('label'))
    l.setAttribute('for','zoom-slider')
    l.appendChild(document.createTextNode('Zoom'))
    c.panel.appendChild(z)
    // set initial values
    var img = c.surface.img
    img.initW = img.width
    img.initH = img.height
    var padding = 20
    var stgW = c.surface.width - padding
    var stgH = c.surface.height - padding
    this.zoom(curZoom || function () {
        var wd = stgW - img.initW // width difference
        var hd = stgH - img.initH // height difference
        var wp = (img.initW/img.initH) > (stgW/stgH) // width priority
        return wp ? ((img.initW + wd) / img.initW) : ((img.initH + hd) / img.initH)
    }(), false)
}

ui.sheet.tools['pan'] = function (c) {
    this.description =
'Pan moves the image around the work surface\
for convenient placement.'
    c.data.q('pan',{
        x: parseInt(c.surface.img.style.left),
        y: parseInt(c.surface.img.style.top)
    })
}











ui.sheet.tools['rulers'] = function (c) {
    this.description =
'Rulers are visual aids useful in measuring pixel \
distances regardless of scaling. They also \
provide a surface to drag from to create guides.'
    var r = this.r = document.createElement('div')
    r.id = 'rulers-options'
    r.className = 'tool-options'
    r.title = this.description
    var i = r.appendChild(document.createElement('input'))
    i.type = 'checkbox'
    i.checked = true
    i.id = 'rulers-toggle'
    var l = r.appendChild(document.createElement('label'))
    l.for = 'rulers-toggle'
    l.appendChild(document.createTextNode('Show Rulers'))
    c.panel.appendChild(r)
    i.addEventListener('change', function (e) {
        showRulers(i.checked)
    })
    function showRulers(on) {
        rx.className = rx.className.replace(/on|off/g, on?'on':'off')
        ry.className = ry.className.replace(/on|off/g, on?'on':'off')
    }
    var rx = document.createElement('canvas')
    rx.id = 'ruler-x'
    rx.className = 'rulers on'
    var ry = document.createElement('canvas')
    ry.id = 'ruler-y'
    ry.className = 'rulers on'
    c.surface.appendChild(rx)
    c.surface.appendChild(ry)
    function getCTX() {
        rx.width = c.surface.width-17
        rx.height = 17
        rx.ctx = rx.getContext('2d')
        rx.ctx.font = '9px Arial'
        rx.ctx.fillStyle = '#fff'
        rx.ctx.imageSmoothingEnabled = false
        ry.width = 17
        ry.height = c.surface.height-17
        ry.ctx = ry.getContext('2d')
        rx.ctx.lineWidth = ry.ctx.lineWidth = 1
        rx.ctx.strokeStyle = ry.ctx.strokeStyle = '#fff'
    }
    getCTX()
    window.addEventListener('resize', getCTX)
    var fq = 1000/60, lastTime = 0
    window.requestAnimationFrame(function (curTime) {
        if ((curTime-lastTime) >= fq) {
            lastTime = curTime
            var z = c.data.q('zoom')
            var p = c.data.q('pan')
            console.log(z)
            if (z && p) {
                
                var zr = 5/z
                rx.ctx.clearRect(0,0,rx.width,rx.height)
                rx.ctx.beginPath()
                for (var i=0; i<(rx.width/(zr)); i++) {
                    //if (!i) continue
                    var x = i*zr
                    rx.ctx.moveTo(x+0.5,17)
                    rx.ctx.lineTo(x+0.5,i%5?14:10)
                    !(i%5) && rx.ctx.fillText(i*zr,x-(String(i*zr).length*2.25),8)
                    rx.ctx.stroke()
                }
            }
        }
        window.requestAnimationFrame(arguments.callee)
    })
}












ui.sheet.tools['grid'] = function (c) {
    this.description =
'Grids are visual aids that display regularly \
spaced horizontal and vertical axes. This \
can be helpful in creating your rectangles. \
They\'re also snappable, which can make quick \
work of defining areas of your spritesheet.'
    
}











ui.sheet.tools['guides'] = function (c) {
    this.description =
'Guides are visual aids that mark user-defined \
axes, horizontal or vertical, a time-saver \
when defining the data of your spritesheet. \
They are snappable, which helps in keeping \
things aligned.'
    
}












ui.sheet.tools['snap'] = function (c) {
    this.description =
'Snapping allows elements being dragged to be \
pulled toward other snappable elements, such \
as guides or grids, as if by magnetism. Helpful \
in keeping things aligned.'
        
}









// ENTRY POINT FOR NEW DOCUMENT


ui.sheet.create = function (dataref) {
    var sheet = document.querySelector('template#sheet').content.querySelector('.sheet').cloneNode(true)
    sheet.data = dataref
    for (var i in ui.sheet.global) {
        sheet[i] = ui.sheet.global[i]
    }
    sheet.surface = sheet.querySelector('.surface')
    sheet.surface.g = sheet // reference to global
    for (var i in ui.sheet.surface) {
        sheet.surface[i] = ui.sheet.surface[i]
    }
    sheet.panel = sheet.querySelector('.panel')
    sheet.panel.g = sheet // reference to global
    for (var i in ui.sheet.panel) {
        sheet.panel[i] = ui.sheet.panel[i]
    }
    sheet.divider = document.createElement('div')
    sheet.divider.className = 'divider'
    sheet.appendChild(sheet.divider)
    var img = sheet.surface.img = document.createElement('img')
    img.className = 'checkerbg'
    img.setAttribute('draggable',false)
    img.src = sheet.data.image.path || 'data:'+sheet.data.image.type+';base64,'+sheet.data.image.data
    sheet.surface.appendChild(img)
    sheet.init()
    return sheet
}
