ui = window.ui || {}

ui.sheet = {}

// the actual workarea
ui.sheet.stage = {}
// shallow-copy the following handlers into the cloned element
ui.sheet.stage.onclick
ui.sheet.stage.ondblclick
ui.sheet.stage.onmousedown
ui.sheet.stage.onmouseup
ui.sheet.stage.onmousemove
ui.sheet.stage.onwheel
ui.sheet.stage.keydown
ui.sheet.stage.onkeyup

// the tools panel
ui.sheet.panel = {}
ui.sheet.panel.onclick
ui.sheet.panel.ondblclick
ui.sheet.panel.onmousedown
ui.sheet.panel.onmouseup
ui.sheet.panel.onmousemove
ui.sheet.panel.onwheel
ui.sheet.panel.keydown
ui.sheet.panel.onkeyup

ui.sheet.create = function (dataref) {
    var sheet = document.querySelector('template#sheet').content.querySelector('.sheet').cloneNode(true)
    sheet.data = dataref
    sheet.stage = sheet.querySelector('.stage')
    for (var i in ui.sheet.stage) {
        sheet.stage[i] = ui.sheet.stage[i]
    }
    sheet.panel = sheet.querySelector('.panel')
    for (var i in ui.sheet.panel) {
        sheet.panel[i] = ui.sheet.panel[i]
    }
    var img = document.createElement('img')
    img.setAttribute('draggable',false)
    img.src = sheet.data.image.path || 'data:'+sheet.data.image.type+';base64,'+sheet.data.image.data
    sheet.stage.appendChild(img)
    return sheet
}
