// const styles = require('./css/styles.css');
const auraMinSize = 8;
const auraMaxSize = 11;
const auraDefaultSize = 10;
const canvasMaxSize = 600;
let windowSize = window.innerWidth || document.body.clientWidth;
let canvasSize = Math.min(windowSize * .9, canvasMaxSize);

class AuraPicture {
    constructor(size, orientation, pixels) {
      this.size = size;
      this.orientation = orientation;
      this.pixels = pixels;
    }
    static empty(size, orientation, color) {
      let pixels = new Array(auraMaxSize * auraMaxSize).fill(color);
      return new AuraPicture(size, orientation, pixels);
    }
    pixel(x, y) {
      return this.pixels[x + y * auraMaxSize];
    }
    draw(pixels) {
      let copy = this.pixels.slice();
      for (let {x, y, color} of pixels) {
        copy[x + y * auraMaxSize] = color;
      }
      return new AuraPicture(this.size, this.orientation, copy);
    }
  }

  function elt(type, attrs, props, ...children) {
    let dom = document.createElement(type);
    if (attrs) {
        for (let attr of Object.keys(attrs)) {
          dom.setAttribute(attr, attrs[attr]);
        }
    }
    if (props) Object.assign(dom, props);
    for (let child of children) {
      if (typeof child != "string") dom.appendChild(child);
      else dom.appendChild(document.createTextNode(child));
    }
    return dom;
  }

class AuraCanvas {
  constructor(state, pointerDown) {
    this.dom = elt("canvas", {class: 'aura-editor__canvas'}, {
      onmousedown: event => this.mouse(event, pointerDown),
      ontouchstart: event => this.touch(event, pointerDown)
    },
    );
    this.syncState(state);
  }
  resize() {
    this.scale = Math.ceil(Math.sqrt(canvasSize ** 2 / 2) / this.picture.size);
    drawAura(this.picture, this.dom, this.scale, this.grid);
  }
  syncState(state) {
    if (this.picture == state.picture && this.grid == state.grid) return;
    this.picture = state.picture;
    this.grid = state.grid;
    this.scale = Math.ceil(Math.sqrt(canvasSize ** 2 / 2) / state.picture.size);
    drawAura(this.picture, this.dom, this.scale, this.grid);
  }
}

AuraCanvas.prototype.mouse = function(downEvent, onDown) {
    if (downEvent.button != 0) return;
    let pos = pointerPosition(downEvent, this);
    let onMove = onDown(pos);
    if (!onMove) return;
    let move = moveEvent => {
      if (moveEvent.buttons == 0) {
        this.dom.removeEventListener("mousemove", move);
      } else {
        let newPos = pointerPosition(moveEvent, this);
        if (newPos.x == pos.x && newPos.y == pos.y) return;
        pos = newPos;
        onMove(newPos);
      }
    };
    this.dom.addEventListener("mousemove", move);
};

AuraCanvas.prototype.touch = function(startEvent, onDown) {
    let pos = pointerPosition(startEvent.touches[0], this);
    let onMove = onDown(pos);
    startEvent.preventDefault();
    if (!onMove) return;
    let move = moveEvent => {
        let newPos = pointerPosition(moveEvent.touches[0], this);
        if (newPos.x == pos.x && newPos.y == pos.y) return;
        pos = newPos;
        onMove(newPos);
    };
    let end = () => {
        this.dom.removeEventListener("touchmove", move);
        this.dom.removeEventListener("touchend", end);
    };
    this.dom.addEventListener("touchmove", move);
    this.dom.addEventListener("touchend", end);
};

function drawAura(picture, canvas, scale, grid = false) {
    let auraRadius = Math.sqrt((picture.size * scale) ** 2 * 2) / 2;
    canvas.width = picture.size * scale;
    canvas.height = picture.size * scale;
    if (picture.orientation === 'square') {
        canvas.style.transform = '';
        canvas.style.marginTop = `0`;
        canvas.style.marginBottom = `0`;
    } else if (picture.orientation === 'diamond') {
        canvas.style.transform = `rotate(45deg)`;
        canvas.style.marginTop = `${picture.size * scale / 5}px`;
        canvas.style.marginBottom = `${picture.size * scale / 5}px`;
    }
    let cx = canvas.getContext("2d");
  
    for (let y = 0; y < picture.size; y++) {
      for (let x = 0; x < picture.size; x++) {
        if (picture.pixel(x, y) === null) continue;
        cx.fillStyle = picture.pixel(x, y);
        cx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    if (grid) {
        for (let y = 0; y < picture.size; y++) {
            cx.strokeStyle = '#181a1b';
            cx.beginPath();
            cx.moveTo(y * scale, 0);
            cx.lineTo(y * scale, picture.size * scale);
            cx.stroke();
            cx.beginPath();
            cx.moveTo(0, y * scale);
            cx.lineTo(picture.size * scale, y * scale);
            cx.stroke();
        }
    }
}
function drawAuraSVG(picture, svg, scale = 10, grid = false) {
    let auraDiameter = Math.sqrt((picture.size * scale) ** 2 * 2);
    let offset = (auraDiameter - picture.size * scale) / 2;
    svg.setAttribute('width', auraDiameter);
    svg.setAttribute('height', auraDiameter);
    if (picture.orientation === 'diamond') {
        svg.style.transform = `rotate(45deg)`;
        // svg.style.marginTop = `${picture.size * scale / 4}px`;
        // svg.style.marginBottom = `${picture.size * scale / 4}px`;
    }
    // let rect = elt('rect', {
    //     x: 0,
    //     y: 0,
    //     width: auraDiameter,
    //     height: auraDiameter,
    //     fill: '#df0d0d'
    // })
    // svg.appendChild(rect);
  
    for (let y = 0; y < picture.size; y++) {
      for (let x = 0; x < picture.size; x++) {
        if (picture.pixel(x, y) === null) continue;
        let pixelRect = elt('rect', {
            x: x * scale + offset,
            y: y * scale + offset,
            width: scale,
            height: scale,
            fill: picture.pixel(x, y)
        })
        svg.appendChild(pixelRect);
      }
    }
}
  
function pointerPosition(pos, auraCanvas) {
    let rect = auraCanvas.dom.getBoundingClientRect();
    let auraCanvasPos = {
        x: pos.clientX - rect.left, 
        y: pos.clientY - rect.top
    }
    let center = {
        x: rect.width / 2,
        y: rect.height / 2
    };
    let centerDelta = {
        x: auraCanvasPos.x - center.x,
        y: auraCanvasPos.y - center.y
    }
    if (auraCanvas.picture.orientation === 'diamond') {
        let radius = Math.sqrt(centerDelta.x ** 2 + centerDelta.y ** 2);
        let angle = Math.atan2(centerDelta.y, centerDelta.x);
        centerDelta.x = radius * Math.cos(angle - Math.PI / 4);
        centerDelta.y = radius * Math.sin(angle - Math.PI / 4);
    }
    return {x: Math.floor((centerDelta.x / auraCanvas.scale) + auraCanvas.picture.size / 2),
            y: Math.floor((centerDelta.y / auraCanvas.scale) + auraCanvas.picture.size / 2)
        };
}

  class AuraEditor {
    constructor(state, config) {
        let {tools, options, controls, dispatch} = config;
        this.state = state;
  
        this.options = options.map(Option => new Option(state, config));
        this.canvas = new AuraCanvas(state, pos => {
            let tool = tools[this.state.tool];
            let onMove = tool(pos, this.state, dispatch);
            if (onMove) return pos => onMove(pos, this.state);
        });
        this.controls = controls.map(Control => new Control(state, config));
        this.dom = elt("div", {class: 'aura-editor'}, null, 
            elt('div', {class: 'aura-editor__options'}, null,
            ...this.options.reduce(
                (a, c) => a.concat(" ", c.dom), [])),
            this.canvas.dom, 
            elt('div', {class: 'aura-editor__controls'}, null,
                ...this.controls.reduce(
                    (a, c) => a.concat(" ", c.dom), [])));
    }
    resize() {
        this.canvas.resize()
    }
    syncState(state) {
      this.state = state;
      this.canvas.syncState(state);
      for (let ctrl of this.controls) ctrl.syncState(state);
      for (let opt of this.options) opt.syncState(state);
    //   console.log(state);
    }
  }

//   controls
  class ToolSelect {
    constructor(state, {tools, dispatch}) {
      this.select = elt("select", null, {
        onchange: () => dispatch({tool: this.select.value})
      }, ...Object.keys(tools).map(name => elt("option", null, {
        selected: name == state.tool
      }, name)));
      this.dom = elt("label", null, null, "🖌 Tool: ", this.select);
    }
    syncState(state) { this.select.value = state.tool; }
  }
  class ColorSelect {
    constructor(state, {dispatch}) {
      this.input = elt("input", null, {
        type: "color",
        value: state.color,
        oninput: () => dispatch({color: this.input.value})
      });
      this.dom = elt("label", null, null, "🎨 Color: ", this.input);
    }
    syncState(state) { this.input.value = state.color; }
  }
  class SaveButton {
    constructor(state) {
      this.picture = state.picture;
      this.dom = elt("button", {class: 'button button-outline'}, {
        onclick: () => this.save()
      }, "💾 Save");
    }
    save() {
      let svg = elt("svg", {
        xmlns: "http://www.w3.org/2000/svg"
      });
    //   let svg = elt("svg");
      drawAuraSVG(this.picture, svg);
      console.log(svg);
      let link = elt("a", null, {
        href: "data:text/plain;charset=utf-8," + encodeURIComponent(svg.outerHTML),
        download: "aura.svg"
      });
      document.body.appendChild(link);
      link.click();
      link.remove();

    }
    syncState(state) { this.picture = state.picture; }
  }
  class UndoButton {
    constructor(state, {dispatch}) {
        this.dom = elt("button", {class: 'button button-outline'}, {
            onclick: () => {
                dispatch({undo: true});
                this.dom.blur();
            },
            disabled: state.done.length == 0
        }, "Undo");
    }
    syncState(state) {
        this.dom.disabled = state.done.length == 0;
    }
}
class ResetButton {
    constructor(state, {dispatch}) {
        this.dom = elt("button", {class: 'button button-outline'}, {
            onclick: () => {
                this.picture = AuraPicture.empty(this.picture.size, this.picture.orientation, null);
                dispatch({picture: this.picture})
                this.dom.blur();
            }, 
            disabled: state.done.length == 0
      }, "Reset");
    }
    syncState(state) {
        this.picture = state.picture; 
        this.dom.disabled = state.done.length == 0;
    }
}
class GridButton {
    constructor(state, {dispatch}) {
        this.dom = elt("button", {class: 'button button-outline'}, {
            onclick: () => {
                dispatch({grid: !this.grid})
                this.dom.classList.toggle('button-outline');
                this.dom.blur();
            }
        }, 'Show grid');
    }
    syncState(state) {
        this.grid = state.grid;
        this.dom.textContent = state.grid ? 'Hide grid' : 'Show grid';
    }
}
class SizeSelect {
    constructor(state, {dispatch}) {
        this.picture = state.picture;
        this.sizes = Array.from({length: auraMaxSize - auraMinSize + 1}, (_, i) => i + auraMinSize);
        this.buttons = this.sizes.map(size => {
            let button = elt("button", { 
                value: size,
                class: size == auraDefaultSize ? 'button button-small' : 'button button-small button-outline'
            }, {
                onclick: () => {
                    this.picture = new AuraPicture(parseInt(button.value), this.picture.orientation, this.picture.pixels);
                    dispatch({picture: this.picture})
                }
            }, `${size} x ${size}`);
            return button;
        })
        this.select = elt("list", null, null, ...this.buttons)
        this.dom = elt("label", null, null, "Aura size: ", this.select);
    }
    syncState(state) { 
        this.picture = state.picture;
        this.buttons.forEach(button => {
            if (button.value == state.picture.size) button.classList.remove('button-outline')
            else button.classList.add('button-outline');
            button.blur();
        });
    }
}
class OrientationSelect {
    constructor(state, {dispatch}) {
        this.picture = state.picture;
        this.orientations = ['square','diamond']
        this.buttons = this.orientations.map(orientation => {
            let button = elt("button", { 
                value: orientation,
                class: orientation == state.picture.orientation ? 'button button-small' : 'button button-small button-outline'
            }, {
                onclick: () => {
                    this.picture = new AuraPicture(this.picture.size, button.value, this.picture.pixels);
                    dispatch({picture: this.picture})
                }
            }, `${orientation}`);
            return button;
        })
        this.select = elt("list", null, null, ...this.buttons)
        this.dom = elt("label", null, null, "Aura orientation: ", this.select);
    }
    syncState(state) { 
        this.picture = state.picture;
        this.buttons.forEach(button => {
            if (button.value == state.picture.orientation) button.classList.remove('button-outline')
            else button.classList.add('button-outline');
            button.blur();
        });
    }
}

//   tools
  function draw(pos, state, dispatch) {
    function drawPixel({x, y}, state) {
      let drawn = {x, y, color: state.color};
      dispatch({picture: state.picture.draw([drawn])});
    }
    drawPixel(pos, state);
    return drawPixel;
  }
  function rectangle(start, state, dispatch) {
    function drawRectangle(pos) {
      let xStart = Math.min(start.x, pos.x);
      let yStart = Math.min(start.y, pos.y);
      let xEnd = Math.max(start.x, pos.x);
      let yEnd = Math.max(start.y, pos.y);
      let drawn = [];
      for (let y = yStart; y <= yEnd; y++) {
        for (let x = xStart; x <= xEnd; x++) {
          drawn.push({x, y, color: state.color});
        }
      }
      dispatch({picture: state.picture.draw(drawn)});
    }
    drawRectangle(start);
    return drawRectangle;
  }
  const around = [{dx: -1, dy: 0}, {dx: 1, dy: 0},
    {dx: 0, dy: -1}, {dx: 0, dy: 1}];

function fill({x, y}, state, dispatch) {
    let targetColor = state.picture.pixel(x, y);
    let drawn = [{x, y, color: state.color}];
    for (let done = 0; done < drawn.length; done++) {
        for (let {dx, dy} of around) {
            let x = drawn[done].x + dx, y = drawn[done].y + dy;
            if (x >= 0 && x < state.picture.size && 
                y >= 0 && y < state.picture.size &&
                state.picture.pixel(x, y) == targetColor &&
                !drawn.some(p => p.x == x && p.y == y)) {
                    drawn.push({x, y, color: state.color});
            }
        }
    }
    dispatch({picture: state.picture.draw(drawn)});
}
function erase(pos, state, dispatch) {
  function erasePixel({x, y}, state) {
    let drawn = {x, y, color: null};
    dispatch({picture: state.picture.draw([drawn])});
  }
  erasePixel(pos, state);
  return erasePixel;
}

function updateState(state, action) {
        // console.log('dispatch state: ', state, action);
    if (action.undo == true) {
        if (state.done.length == 0) return state;
        return Object.assign({}, state, {
            picture: state.done[0],
            done: state.done.slice(1),
            doneAt: 0
          });
    } else if (action.picture &&
        state.doneAt < Date.now() - 1000) {
            return Object.assign({}, state, action, {
                done: [state.picture, ...state.done],
                doneAt: Date.now()
            });
    } else {
        return Object.assign({}, state, action);
    }
}
        
const baseState = {
    tool: "draw",
    color: "#000000",
    picture: AuraPicture.empty(auraDefaultSize, 'square', null),
    done: [],
    doneAt: 0,
    grid: false
};
const baseControls = [ToolSelect, ColorSelect, UndoButton, ResetButton, SaveButton];
const baseOptions = [SizeSelect, OrientationSelect, GridButton];
const baseTools = {draw, fill, rectangle, erase};

function startAuraEditor(state = baseState, tools = baseTools, options = baseOptions, controls = baseControls) {
    let app = new AuraEditor(state, {
        tools,
        options,
        controls,
        dispatch(action) {
            // console.log(state, action);
            state = updateState(state, action);
            app.syncState(state);
        }
    });
    window.addEventListener('resize', () => {
        windowSize = window.innerWidth || document.body.clientWidth;
        canvasSize = Math.min(windowSize * .9, canvasMaxSize);
        app.resize();
    })
    return app.dom;
}

document.body.appendChild(startAuraEditor());