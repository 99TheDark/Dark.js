var Dark = {
    /*
        * CONTAINS *
        settings        | settings & values stored
        canvas          | the canvas being drawn on
        ctx             | the context
        raf             | short for 'request animation frame' for draw loop
        lastFrame       | time at last draw run
        lastTime        | time at last render
        errorCount      | number of errors
        maxErrorCount   | maximum number of errors before stopping
        maxTransforms   | maximum length of transform stack
        helper          | hidden helper functions
        transforms      | stack of transformations from push & pop matrix
        vertices        | vertices in the current path
        constants       | a bunch of constants
        objects         | special Dark.js objects like DVector
        warn            | warn with checking & counter
        error           | error with checking & counter
        keys            | key dictionary
        special         | list of special keycodes
        mouseMap        | map from numbers to mouse name
        functions       | all the functions available
        variables       | all the variables available
        empties         | initially empty functions
        tempCanvas      | a temporary canvas if none is selected
        loadCatagories  | names of the keys to be loaded
    */
};

// Initiate objects & constants
Dark.settings = {};
Dark.helper = {};
Dark.transforms = [];
Dark.vertices = [];
Dark.objects = {};
Dark.functions = {};
Dark.lastFrame = performance.now();
Dark.raf = () => {};
Dark.errorCount = 0;
Dark.maxErrorCount = 50; // to move to constants
Dark.maxTransforms = 1000; // to move to constants
Dark.loadCatagories = [
    "constants",
    "functions",
    "variables"
];

Dark.tempCanvas = document.createElement("canvas");
Dark.tempCanvas.id = "DarkJS-default-canvas";
Dark.tempCanvas.style.position = "absolute";
Dark.tempCanvas.style.inset = "0px";
Dark.tempCanvas.width = innerWidth;
Dark.tempCanvas.height = innerHeight;
Dark.canvas = Dark.tempCanvas;
Dark.ctx = Dark.canvas.getContext("2d", {willReadFrequently: true});

Dark.keys = {};
Dark.special = {
    16: "shift",
    10: "enter",
    8: "delete",
    32: "space",
    18: "option",
    17: "control",
    157: "command",
    38: "up",
    40: "down",
    37: "left",
    39: "right",
    112: "f1",
    113: "f2",
    114: "f3",
    115: "f4",
    116: "f5",
    117: "f6",
    118: "f7",
    119: "f8",
    120: "f9",
    121: "f10",
    122: "f11",
    123: "f12",
    20: "capslock",
    190: "period",
    188: "comma",
    191: "slash",
    220: "backslash",
    48: "zero",
    49: "one",
    50: "two",
    51: "three",
    52: "four",
    53: "five",
    54: "six",
    55: "seven",
    56: "eight",
    57: "nine",
    189: "minus",
    187: "equals",
    219: "left_bracket",
    221: "right_bracket",
    222: "single_quote",
    186: "semicolon"
};

Dark.variables = {
    width: innerWidth,
    height: innerHeight,
    dt: 0,
    frameCount: 0,
    fps: 60,
    key: undefined,
    keyCode: undefined,
    keyIsPressed: false,
    mouseIsPressed: false,
    mouseIsInside: false,
    mouseX: 0,
    mouseY: 0,
    pmouseX: 0,
    pmouseY: 0,
    mouse: undefined,
    pmouse: undefined,
    mouseButton: undefined
};

Dark.mouseMap = [
    "left",
    "middle",
    "right",
    "back",
    "forward"
];

Dark.empties = [
    "draw",
    "keyPressed",
    "keyReleased",
    "keyTyped",
    "mousePressed",
    "mouseReleased",
    "mouseMoved",
    "mouseIn",
    "mouseOut",
    "mouseDoubleClicked"
];

Dark.empties.forEach(emp => Dark.functions[emp] = () => {});

// Constants
Dark.constants = {
    "DAYS": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "PI": Math.PI,
    "HALF_PI": Math.PI / 2,
    "QUARTER_PI": Math.PI / 4,
    "E": Math.E,
    "PHI": Math.PHI,
    "TAU": Math.PI * 2,
    "ROUND": 0,
    "FLAT": 1,
    "DEGREES": 2,
    "RADIANS": 3,
    "VERTEX": 4,
    "CURVE": 5,
    "BEZIER": 6,
    "CLOSE": 7,
    "OPEN": 8,
    "CENTER": 9,
    "CORNER": 10,
    "BOLD": 11,
    "ITALIC": 12,
    "NORMAL": 13
};

Dark.helper.angle = function(angle) {
    return (Dark.settings.angleMode == DEGREES) ? angle * PI / 180 : angle;
};

Dark.helper.angleBack = function(angle) {
    return (Dark.settings.angleMode == DEGREES) ? angle * 180 / PI : angle;
};

Dark.helper.doError = function(type, err) {
    if(Dark.errorCount == Dark.maxErrorCount) {
        console.warn("Too many warnings and errors have been made, the rest will not display.");
    } else if(Dark.errorCount < Dark.maxErrorCount) {
        console[type](err);
    }
    Dark.errorCount++;
};

Dark.helper.bulkAdd = function(loc, obj) {
    for(const key in obj) {
        Dark[loc][key] = obj[key];
    }
};

Dark.warn = function(warning) {
    Dark.helper.doError("warn", warning);
};

Dark.error = function(error) {
    Dark.helper.doError("error", error);
};

Dark.helper.bulkAdd("functions", {

    // Very handy function to copy objects
    copy: function(e) {
        if(typeof e === "object") {
            let obj = {};
            for(const key in e) {
                obj[key] = e[key];
            }
            return obj;
        } else {
            Dark.warn("\"" + e + "\" is not an object!");
            return e;
        }
    },

    // Setup functions & getters
    size: function(w = innerWidth, h = innerHeight) {
        if(typeof w === "number" && typeof h === "number" && width > 0 && height > 0) {
            // Because for some reason changing width & height reset all parameters >:(
            // It took me ~8 hours to figure this out. D:<
            let old = copy(Dark.ctx);

            Dark.variables.width = width = Dark.canvas.width = w;
            Dark.variables.height = height = Dark.canvas.height = h;

            for(const key in Dark.ctx) {
                const value = old[key];
                if(key !== "canvas" && typeof value !== "function") {
                    Dark.ctx[key] = value;
                }
            }
        }
    },

    setCanvas: function(canvas) {
        if(canvas instanceof HTMLCanvasElement) {
            Dark.canvas = canvas;
            Dark.variables.width = width = canvas.width;
            Dark.variables.height = height = canvas.height;

            let old = copy(Dark.ctx);
            Dark.ctx = canvas.getContext("2d", {willReadFrequently: true});

            for(const key in Dark.ctx) {
                const value = old[key];
                if(key !== "canvas" && typeof value !== "function") {
                    Dark.ctx[key] = value;
                }
            }

            Dark.canvas.style.cursor = Dark.settings.cursor;
            Dark.canvas.tabIndex = "1";

            Dark.helper.reloadEvents();
        }
    },

    getCanvas: function() {
        return Dark.canvas;
    },

    getContext: function() {
        return Dark.ctx;
    },

    // Math-y
    dist: function(x1, y1, x2, y2) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    gamma: function(z) {
        // Stirling's Approximation
        return Math.sqrt(TAU / z) * (((z + 1 / (12 * z + 1 / (10 * z))) / E) ** z);
    },

    // Not very accurate, pretty good up to the hundreths
    factorial: function(num) {
        return Number.isInteger(num) ? intFactorial(num) : gamma(num + 1);
    },

    // Integer-only factorial, 100% accurate and faster
    intFactorial: function(num) {
        num = Math.floor(num);

        let total = num;
        while(--num > 1) {
            total *= num;
        }
        return total;
    },

    choose: function(n, k) {
        return intFactorial(n) / (intFactorial(n - k) * intFactorial(k));
    },

    // Very close to ProcessingJS code
    random: function(...args) {
        switch(args.length) {
            default:
                return Math.random() * (args[1] - args[0]) + args[0];
                break;
            case 0:
                return Math.random();
                break;
            case 1:
                return Math.random() * args[0];
        }
    },

    cursor: function(type = "auto") {
        Dark.settings.cursor = type;
        Dark.canvas.style.cursor = type;
    },

    loop: function() {
        Dark.settings.looping = true;
    },

    noLoop: function() {
        Dark.settings.looping = false;
    },

    frameRate: function(desiredFPS) {
        Dark.settings.frameStep = 1000 / desiredFPS;
    },

    enableContextMenu: function() {
        Dark.settings.contextMenu = true;
        Dark.canvas.oncontextmenu = true;
    },

    disableContextMenu: function() {
        Dark.settings.contextMenu = false;
        Dark.canvas.oncontextmenu = false;
    },

    // Debugging
    format: function(obj) {
        if(typeof obj === "object" && obj !== null) {
            return JSON.stringify(copy(obj), null, "    ");
        } else {
            return obj + "";
        }
    },

    // Color
    color: function(r, g, b, a) {
        if(r != undefined && g == undefined) g = r;
        if(g != undefined && b == undefined) b = g;
        if(a == undefined) a = 255;
        r = constrain(r, 0, 255);
        g = constrain(g, 0, 255);
        b = constrain(b, 0, 255);
        a = constrain(a, 0, 255);
        return (a << 24) + (r << 16) + (g << 8) + (b);
    },

    // Splitting color into parts
    red: color => (color >> 16) & 255,
    green: color => (color >> 8) & 255,
    blue: color => color & 255,
    alpha: color => (color >> 24) & 255,

    lerpColor: function(c1, c2, percent) {
        return color(
            lerp(red(c1), red(c2), percent),
            lerp(green(c1), green(c2), percent),
            lerp(blue(c1), blue(c2), percent),
            lerp(alpha(c1), alpha(c2), percent)
        );
    },

    fill: function(r, g, b, a) {
        let c = Dark.settings.fill = Dark.helper.colorValue(r, g, b, a);
        Dark.ctx.fillStyle = Dark.helper.colorString(c);
    },

    noFill: function() {
        Dark.settings.fill = 0;
        Dark.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    },

    stroke: function(r, g, b, a) {
        // Same as fill
        let c = Dark.settings.stroke = Dark.helper.colorValue(r, g, b, a);
        Dark.ctx.strokeStyle = Dark.helper.colorString(c);
    },

    noStroke: function() {
        Dark.settings.stroke = 0;
        Dark.ctx.strokeStyle = "rgba(0, 0, 0, 0)";
    },

    background: function(r, g, b, a) {
        Dark.ctx.save();
        let c = Dark.helper.colorValue(r, g, b, a);
        Dark.ctx.fillStyle = Dark.helper.colorString(c);
        Dark.ctx.fillRect(0, 0, width, height);
        Dark.ctx.restore();
    },

    clear: function() {
        Dark.ctx.clearRect(0, 0, width, height);
    },

    // Drawing modes
    strokeCap: function(mode) {
        switch(mode) {
            default:
                Dark.error(new Error("Invalid strokeCap type"));
                break;
            case FLAT:
                Dark.ctx.lineCap = "butt";
                Dark.settings.strokeCap = FLAT;
                break;
            case ROUND:
                Dark.ctx.lineCap = "round";
                Dark.settings.strokeCap = ROUND;
                break;
        }
    },

    strokeWeight: function(weight) {
        Dark.settings.strokeWeight = weight;
        Dark.ctx.lineWidth = weight;
    },

    smooth: function() {
        Dark.settings.smoothing = true;
        Dark.ctx.imageSmoothingEnabled = true;
        Dark.ctx.imageSmoothingQuality = "high";
    },

    noSmooth: function() {
        Dark.settings.smoothing = true;
        Dark.ctx.imageSmoothingEnabled = false;
        Dark.ctx.imageSmoothingQuality = "low";
    },

    angleMode: function(mode) {
        switch(mode) {
            default:
                Dark.error(new Error("Invalid angleMode type"));
                break;
            case DEGREES:
                Dark.settings.angleMode = DEGREES;
                break;
            case RADIANS:
                Dark.settings.angleMode = RADIANS;
                break;
        }
    },

    ellipseMode: function(type = CENTER) {
        Dark.settings.ellipseMode = type;
    },

    rectMode: function(type = CORNER) {
        Dark.settings.rectMode = type;
    },

    imageMode: function(type = CORNER) {
        Dark.settings.imageMode = type;
    },

    curveTightness: function(tightness = 0) {
        Dark.settings.curveTightness = tightness;
    },

    // Transformations
    pushMatrix: function() {
        if(Dark.transforms.length > Dark.maxTransforms) {
            Dark.error("Maximum matrix stack size reached, pushMatrix() called " + Dark.maxTransforms + " times.");
        } else {
            Dark.transforms.push(Dark.ctx.getTransform());
        }
    },

    popMatrix: function() {
        let transform = Dark.transforms.pop();
        if(transform == undefined) {
            Dark.error(new Error("No more transforms to restore in popMatrix"));
        } else {
            Dark.ctx.setTransform(transform);
        }
    },

    resetMatrix: function() {
        Dark.transforms.length = 0;
    },

    translate: function(x, y) {
        Dark.ctx.translate(x, y);
    },

    rotate: function(angle) {
        Dark.ctx.rotate(Dark.helper.angle(angle));
    },

    scale: function(w, h) {
        if(h == undefined) {
            Dark.ctx.scale(w, w);
        } else {
            Dark.ctx.scale(w, h);
        }
    },

    skew: function(h, v = 0) {
        let transform = Dark.ctx.getTransform();
        transform.b = v * 0.01;
        transform.c = h * 0.01;
        Dark.ctx.setTransform(transform);
    },

    // Shapes
    rect: function(x, y, width, height) {
        width = Math.abs(width), height = Math.abs(height);
        Dark.ctx.beginPath();
        Dark.ctx.save();
        if(Dark.settings.rectMode == CENTER) Dark.ctx.translate(- width / 2, - height / 2);
        Dark.ctx.rect(x, y, width, height);
        Dark.ctx.fill();
        Dark.ctx.stroke();
        Dark.ctx.restore();
    },

    ellipse: function(x, y, width, height) {
        width = Math.abs(width), height = Math.abs(height);
        Dark.ctx.beginPath();
        Dark.ctx.save();
        if(Dark.settings.ellipseMode == CORNER) Dark.ctx.translate(width / 2, height / 2);
        Dark.ctx.beginPath();
        Dark.ctx.ellipse(x, y, width / 2, height / 2, 0, 0, TAU, false);
        Dark.ctx.fill();
        Dark.ctx.stroke();
        Dark.ctx.restore();
    },

    arc: function(x, y, width, height, start, stop) {
        Dark.ctx.save();
        if(Dark.settings.ellipseMode == CORNER) Dark.ctx.translate(width / 2, height / 2);
        Dark.ctx.beginPath();
        Dark.ctx.ellipse(x, y, width / 2, height / 2, 0, start, stop, false);
        Dark.ctx.fill();
        Dark.ctx.stroke();
        Dark.ctx.restore();
    },

    line: function(x1, y1, x2, y2) {
        Dark.ctx.beginPath();
        Dark.ctx.moveTo(x1, y1);
        Dark.ctx.lineTo(x2, y2);
        Dark.ctx.stroke();
    },

    point: function(x, y) {
        Dark.ctx.save();
        Dark.ctx.beginPath();
        Dark.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        if(Dark.settings.ellipseMode == CORNER) Dark.ctx.translate(width / 2, height / 2);
        Dark.ctx.fill();
        Dark.ctx.restore();
    },

    circle: function(x, y, radius) {
        Dark.ctx.save();
        if(Dark.settings.ellipseMode == CORNER) Dark.ctx.translate(radius, radius);
        Dark.ctx.beginPath();
        Dark.ctx.arc(x, y, radius, 0, TAU);
        Dark.ctx.fill();
        Dark.ctx.stroke();
        Dark.ctx.restore();
    },

    square: function(x, y, side) {
        rect(x, y, side, side);
    },

    triangle: function(x1, y1, x2, y2, x3, y3) {
        Dark.ctx.beginPath();
        Dark.ctx.moveTo(x1, y1);
        Dark.ctx.lineTo(x2, y2);
        Dark.ctx.lineTo(x3, y3);
        Dark.ctx.closePath();
        Dark.ctx.fill();
        Dark.ctx.stroke();
    },

    quad: function(x1, y1, x2, y2, x3, y3, x4, y4) {
        Dark.ctx.beginPath();
        Dark.ctx.moveTo(x1, y1);
        Dark.ctx.lineTo(x2, y2);
        Dark.ctx.lineTo(x3, y3);
        Dark.ctx.lineTo(x4, y4);
        Dark.ctx.closePath();
        Dark.ctx.fill();
        Dark.ctx.stroke();
    },

    beginShape: function() {
        Dark.vertices.length = 0;
    },

    // https://www.cs.umd.edu/~reastman/slides/L19P01ParametricCurves.pdf
    endShape: function(type = OPEN) {
        if(Dark.vertices.length < 2 || Dark.vertices[0].type != VERTEX) return;
        Dark.ctx.beginPath();
        Dark.vertices.forEach(function(vert, index) {
            if(index == 0) {
                Dark.ctx.moveTo(vert.point.x, vert.point.y);
            } else {
                switch(vert.type) {
                    case VERTEX:
                        let pt = vert.point;
                        Dark.ctx.lineTo(pt.x, pt.y);
                        break;
                    case CURVE:
                        // to be implemented
                        let node = vert.node;
                        break;
                    case BEZIER:
                        let pts = vert.points;
                        Dark.ctx.bezierCurveTo(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
                        break;
                }
            }
        });
        if(type == CLOSE) Dark.ctx.closePath();
        Dark.ctx.fill();
        Dark.ctx.stroke();
    },

    // Kinda copied from ski, though slightly different (curveVertex)
    vertex: function(x, y) {
        Dark.vertices.push({
            type: VERTEX,
            point: {
                x: x,
                y: y
            }
        });
    },

    curveVertex: function(cx, cy) {
        Dark.vertices.push({
            type: CURVE,
            node: {
                x: cx,
                y: cy
            }
        });
    },

    bezierVertex: function(x1, y1, x2, y2, x3, y3) {
        Dark.vertices.push({
            type: BEZIER,
            points: [
                {
                    x: x1,
                    y: y1,
                }, {
                    x: x2,
                    y: y2
                }, {
                    x: x3,
                    y: y3
                }
            ]
        });
    },

    bezier: function(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
        beginShape();
        vertex(x1, y1);
        bezierVertex(cx1, cy1, cx2, cy2, x2, y2);
        endShape();
    },

    reloadFont: function() {
        Dark.ctx.font = Dark.settings.font.toString();
    },

    // Text
    textSize: function(size) {
        Dark.settings.textSize = size;
        Dark.settings.font.size = size;
        reloadFont();
    },

    textFont: function(font) {
        if(typeof font === "string") {
            font = new DFont(font);
        }
        if(font instanceof DFont) {
            Dark.settings.font = font;
            Dark.settings.textSize = font.size;
            reloadFont();
        } else {
            Dark.error(font + " is not a DFont.");
        }
    },

    textStyle: function(style) {
        switch(style) {
            default:
                Dark.settings.font.weight = "normal";
                Dark.settings.font.style = "normal";
                break;
            case BOLD:
                Dark.settings.font.weight = "bold";
                break;
            case ITALIC:
                Dark.settings.font.style = "italic";
                break;
        }
        reloadFont();
    },

    text: function(text, x, y) {
        Dark.ctx.fillText(text, x, y);
        Dark.ctx.strokeText(text, x, y);
    },

    // Images
    get: function(...args) {
        if(args.length == 0) {
            return new DImage(
                Dark.ctx.getImageData(0, 0, width, height),
                Dark.canvas
            );
        } else if(args.length == 4) {
            return new DImage(
                Dark.ctx.getImageData(args[0], args[1], args[2], args[3]),
                Dark.canvas
            );
        } else {
            Dark.error(new Error("get requires 0 or 4 parameters, not " + args.length));
        }
    },

    set: function(x, y, col) {
        Dark.ctx.save();
        Dark.ctx.fillStyle = Dark.helper.colorString(col);
        Dark.ctx.fillRect(x, y, 1, 1);
        Dark.ctx.restore();
    },

    image: function(img, x, y, width, height) {
        Dark.ctx.save();
        if(Dark.settings.imageMode == CENTER) Dark.ctx.translate(- width / 2, - height / 2);
        switch(arguments.length) {
            default:
                Dark.error(new Error("image requires 3 to 5 parameters, not " + arguments.length));
                break;
            case 3:
                Dark.ctx.drawImage(img.canvas, x, y);
                break;
            case 4:
                break;
                Dark.ctx.drawImage(img.canvas, x, y, width, width);
            case 5:
                Dark.ctx.drawImage(img.canvas, x, y, width, height);
                break;
        }
        Dark.ctx.restore();
    },

    // Quick & Mathy functions
    // Map copied from ProcessingJS
    min: (a, b) => (a < b) ? a : b,
    max: (a, b) => (a > b) ? a : b,
    log10: num => Math.log10(num),
    log2: num => Math.log2(num),
    log: num => Math.log(num),
    logBase: (base, num) => Math.log(base) / Math.log(num),
    mag: (a, b) => Math.sqrt(a * a + b * b),
    norm: (num, min, max) => (num - min) / (max - min),
    constrain: (num, min, max) => Math.min(Math.max(num, min), max),
    lerp: (val1, val2, percent) => (val2 - val1) * percent + val1,
    map: (num, min1, max1, min2, max2) => min2 + (max2 - min2) / (max1 - min1) * (value - min1),
    sq: num => num * num,
    cb: num => num * num * num,
    pow: (num, power) => num ** power,
    root: (num, power) => num ** (1 / power),
    sqrt: num => Math.sqrt(num),
    cbrt: num => Math.cbrt(num),
    exp: num => E ** num,
    floor: num => Math.floor(num),
    round: num => Math.round(num),
    ceil: num => Math.ceil(num),
    trunc: num => Math.trunc(num),
    deci: num => num - Math.trunc(num),
    abs: num => (num < 0) ? - num : num,
    sign: num => Math.sign(num),
    bsign: num => (num < 0) ? -1 : 1,
    degrees: angle => angle * 180 / PI,
    radians: angle => angle * PI / 180,
    millennium: () => Math.floor(new Date().getFullYear() / 1000),
    century: () => Math.floor(new Date().getFullYear() / 100),
    decade: () => Math.floor(new Date().getFullYear() / 10),
    year: () => new Date().getFullYear(),
    month: () => new Date().getMonth(),
    day: () => new Date().getDate(),
    hour: () => new Date().getHours(),
    minute: () => new Date().getMinutes(),
    second: () => new Date().getSeconds(),
    millis: () => Math.floor(performance.now()),
    micro: () => Math.floor((performance.now() * 1000) % 1000),
    nano: () => Math.floor((performance.now() * 1000000) % 1000),
    today: () => DAYS[new Date().getDay()],
    timezone: () => - new Date().getTimezoneOffset() / 60,
    degrees: rad => rad * 180 / PI,
    radians: deg => deg * PI / 180,
    sin: ang => Math.sin(Dark.helper.angle(ang)),
    cos: ang => Math.cos(Dark.helper.angle(ang)),
    tan: ang => Math.tan(Dark.helper.angle(ang)),
    csc: ang => 1 / Math.sin(Dark.helper.angle(ang)),
    sec: ang => 1 / Math.cos(Dark.helper.angle(ang)),
    cot: ang => 1 / Math.tan(Dark.helper.angle(ang)),
    atan2: (dy, dx) => Dark.helper.angleBack(Math.atan2(dy, dx)),
    asin: ang => Math.asin(Dark.helper.angle(ang)),
    acos: ang => Math.acos(Dark.helper.angle(ang)),
    atan: ang => Math.atan(Dark.helper.angle(ang)),
    acsc: ang => Math.asin(1 / Dark.helper.angle(ang)),
    asec: ang => Math.acos(1 / Dark.helper.angle(ang)),
    acot: ang => Math.atan(1 / Dark.helper.angle(ang)),
    sinh: ang => Math.sinh(Dark.helper.angle(ang)),
    cosh: ang => Math.cosh(Dark.helper.angle(ang)),
    tanh: ang => Math.tanh(Dark.helper.angle(ang)),
    csch: ang => 1 / Math.sinh(Dark.helper.angle(ang)),
    sech: ang => 1 / Math.cosh(Dark.helper.angle(ang)),
    coth: ang => 1 / Math.tanh(Dark.helper.angle(ang)),
    asinh: ang => Math.asinh(Dark.helper.angle(ang)),
    acosh: ang => Math.acosh(Dark.helper.angle(ang)),
    atanh: ang => Math.atanh(Dark.helper.angle(ang)),
    acsch: ang => Math.asinh(1 / Dark.helper.angle(ang)),
    asech: ang => Math.acosh(1 / Dark.helper.angle(ang)),
    acoth: ang => Math.atanh(1 / Dark.helper.angle(ang)),
    now: () => performance.now(),
    reciprocal: num => 1 / num

});

Dark.helper.colorValue = function(r, g, b, a) {
    if(r != undefined && g == undefined) {
        if(r <= 255) {
            return color(r, r, r);
        } else {
            return r;
        }
    } else {
        return color(r, g, b, a);
    }
};

Dark.helper.colorString = function(c) {
    return "rgba(" + red(c) + ", " + green(c) + ", " + blue(c) + ", " + alpha(c) / 255 + ")";
};

// Vectors
var DVector = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
};
DVector.create = function(x, y, z) {
    return new DVector(x, y, z);
};
DVector.zero2D = function() {
    return new DVector(0, 0);
};
DVector.zero3D = function() {
    return new DVector(0, 0, 0);
};
DVector.add = function(v1, v2) {
    if(v2 instanceof DVector) {
        return new DVector(
            v1.x + v2.x,
            v1.y + v2.y,
            v1.z + v2.z
        );
    } else {
        return new DVector(
            v1.x + v2,
            v1.y + v2,
            v1.z + v2
        );
    }
};
DVector.prototype.add = function(v) {
    if(v instanceof DVector) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    } else {
        this.x += v;
        this.y += v;
        this.z += v;
    }
};
DVector.sub = function(v1, v2) {
    if(v2 instanceof DVector) {
        return new DVector(
            v1.x - v2.x,
            v1.y - v2.y,
            v1.z - v2.z
        );
    } else {
        return new DVector(
            v1.x - v2,
            v1.y - v2,
            v1.z - v2
        );
    }
};
DVector.prototype.sub = function(v) {
    if(v instanceof DVector) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
    } else {
        this.x -= v;
        this.y -= v;
        this.z -= v;
    }
};
DVector.mult = function(v1, v2) {
    if(v2 instanceof DVector) {
        return new DVector(
            v1.x * v2.x,
            v1.y * v2.y,
            v1.z * v2.z
        );
    } else {
        return new DVector(
            v1.x * v2,
            v1.y * v2,
            v1.z * v2
        );
    }
};
DVector.prototype.mult = function(v) {
    if(v instanceof DVector) {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
    } else {
        this.x *= v;
        this.y *= v;
        this.z *= v;
    }
};
DVector.div = function(v1, v2) {
    if(v2 instanceof DVector) {
        return new DVector(
            v1.x / v2.x,
            v1.y / v2.y,
            v1.z / v2.z
        );
    } else {
        return new DVector(
            v1.x / v2,
            v1.y / v2,
            v1.z / v2
        );
    }
};
DVector.prototype.div = function(v) {
    if(v instanceof DVector) {
        this.x /= v.x;
        this.y /= v.y;
        this.z /= v.z;
    } else {
        this.x /= v;
        this.y /= v;
        this.z /= v;
    }
};
DVector.pow = function(v1, v2) {
    if(v2 instanceof DVector) {
        return new DVector(
            v1.x ** v2.x,
            v1.y ** v2.y,
            v1.z ** v2.z
        );
    } else {
        return new DVector(
            v1.x ** v2,
            v1.y ** v2,
            v1.z ** v2
        );
    }
};
DVector.prototype.pow = function(v) {
    if(v instanceof DVector) {
        this.x **= v.x;
        this.y **= v.y;
        this.z **= v.z;
    } else {
        this.x **= v;
        this.y **= v;
        this.z **= v;
    }
};
DVector.mag = function(v) {
    return v.mag();
};
DVector.prototype.mag = function() {
    if(this.z == undefined) {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    } else {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
};
DVector.magSq = function(v) {
    return v.magSq();
};
DVector.prototype.magSq = function() {
    if(this.z == undefined) {
        return this.x * this.x + this.y * this.y;
    } else {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
};
DVector.normalize = function(v) {
    const mag = v.mag();

    if(mag != 0) {
        return DVector.div(v, mag);
    }
};
DVector.prototype.normalize = function() {
    const mag = this.mag();

    if(mag != 0) {
        this.div(mag);
    }
};
DVector.cross = function(v1, v2) {
    return new DVector(
        v1.y * v2.z - v2.y * v1.z,
        v1.z * v2.x - v2.z * v1.x,
        v1.x * v2.y - v2.x * v1.y
    );
};
DVector.prototype.cross = function(v) {
    return this.cross(v);
};
DVector.dot = function(v1, v2) {
    if(typeof v2 == "number") {
        if(v1.z == undefined) return v1.x * v2 + v1.y * v2;
        return v1.x * v2 + v1.y * v2 + v1.z * v2;
    } else {
        if(v1.z == undefined || v2.z == undefined) return v1.x * v2.x + v1.y * v2.y;
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }
};
DVector.prototype.dot = function(v) {
    return DVector.dot(this, v);
};
DVector.flip = function(v) {
    return new Vector(
        - v.x,
        - v.y,
        - v.z
    );
};
DVector.prototype.flip = function() {
    this.x = - this.x;
    this.y = - this.y;
    this.z = - this.z;
};
DVector.limit = function(v, max) {
    if(v.mag() > max) v.mult(max / v.mag());
    return v;
};
DVector.prototype.limit = function() {
    if(this.mag() > max) this.mult(max / this.mag());
};
DVector.lerp = function(v1, v2, percent) {
    return new DVector(
        lerp(v1.x, v2.x, percent),
        lerp(v1.y, v2.y, percent),
        lerp(v1.z, v2.z, percent)
    );
};
DVector.prototype.lerp = function(v, percent) {
    return DVector.lerp(this, v, percent);
};
DVector.get = function(v) {
    return v.get();
};
DVector.prototype.get = function() {
    return new DVector(this.x, this.y, this.z);
};
DVector.prototype.set = function(v) {
    [this.x, this.y, this.z] = [v.x, v.y, v.z];
};
DVector.prototype.array = function() {
    return [
        this.x,
        this.y,
        this.z
    ];
};
DVector.prototype.toString = function() {
    if(this.z == undefined) return "[" + this.x + ", " + this.y + "]";
    return "[" + this.x + ", " + this.y + ", " + this.z + "]";
};

var DFont = function(str) {
    this.style = "normal";
    this.variant = "normal";
    this.weight = "normal";
    this.size = 16;
    this.family = "Arial";

    let params = str.split(" ");
    for(const i in params) {
        const s = params[i];
        switch(s) {
            case "normal":
                break;
            case "italic":
                this.style = "italic";
                break;
            case "bold":
                this.weight = "bold";
        }
        if(s === "italic") {
            this.style = "italic";
        } else if(s === "small-caps") {
            this.variant = "small-caps";
        } else if(DFont.weights.includes(s)) {
            this.weight = s;
        } else if(s !== "normal") {
            let parsed = parseInt(s);
            if(isNaN(parsed)) {
                this.family = s;
            } else {
                this.size = parsed;
            }
        }
    }
};
DFont.parse = function(str) {
    return new DFont(str);
};
DFont.prototype.toString = function() {
    return this.style + " " + this.weight + " " + this.variant + " " + this.size + "px " + this.family;
};
DFont.weights = [
    "bold",
    "bolder",
    "lighter",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900"
];

var DImage = function(imgData, source) {
    this.width = imgData.width;
    this.height = imgData.height;
    this.imageData = imgData;
    this.source = source;
    this.canvas = new OffscreenCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext("2d", {willReadFrequently: true});
    this.ctx.putImageData(imgData, 0, 0);
};
DImage.prototype.get = function(...args) {
    if(args.length == 0) {
        return this.copy();
    } else if(args.length == 4) {
        return new DImage(
            this.ctx.getImageData(args[0], args[1], args[2], args[3]),
            this.source
        );
    } else {
        Dark.error(new Error("DImage.get requires 0 or 4 parameters, not " + args.length));
    }
};
DImage.prototype.copy = function() {
    return new DImage(
        this.imageData,
        this.source
    );
};

var DMatrix = function(width, height, val = 0) {
    // https://stackoverflow.com/questions/53992415/how-to-fill-multidimensional-array-in-javascript
    this.mat = Array(height).fill(null).map(() => Array(width).fill(val));
    this.width = width;
    this.height = height;
};
DMatrix.prototype.toString = function() {
    let str = "";
    for(const arr in this.mat) {
        for(const item in this.mat[arr]) {
            str += this.mat[arr][item] + " ";
        }
        str = str.replace(/ $/, "\n");
    }
    return str;
};
DMatrix.prototype.get = function(x, y) {
    return this.mat[y][x];
};
DMatrix.prototype.set = function(x, y, val) {
    this.mat[y][x] = val;
};
DMatrix.add = function(mat1, mat2) {
    if(mat1.width == mat2.width && mat1.height == mat2.height) {
        let mat = new DMatrix(mat1.width, mat1.height);
        for(let y = 0; y < mat.height; y++) {
            for(let x = 0; x < mat.width; x++) {
                mat.set(y, x, mat1.get(x, y) + mat2.get(x, y));
            }
        }
        return mat;
    } else {
        Dark.error(new Error("Cannot add two DMatrices with different dimensions"));
    }
};
DMatrix.prototype.add = function(matrix) {
    // cannot implement until add to set and constructor
};
DMatrix.sub = function(mat1, mat2) {
    if(mat1.width == mat2.width && mat1.height == mat2.height) {
        let mat = new DMatrix(mat1.width, mat1.height);
        for(let y = 0; y < mat.height; y++) {
            for(let x = 0; x < mat.width; x++) {
                mat.set(y, x, mat1.get(x, y) - mat2.get(x, y));
            }
        }
        return mat;
    } else {
        Dark.error(new Error("Cannot subtract two DMatrices with different dimensions"));
    }
};

let mat = new DMatrix(4, 2);
mat.set(2, 1, 8);
console.log(mat.toString());

Dark.objects.DVector = DVector;
Dark.objects.DFont = DFont;
Dark.objects.DImage = DImage;
Dark.objects.DMatrix = DMatrix;

// Key & mouse events
Dark.helper.loadEvents = function() {

    document.addEventListener("keydown", function(e) {
        e.preventDefault();
        Dark.variables.keyIsPressed = keyIsPressed = true;
        Dark.variables.key = key = e.key;
        Dark.variables.keyCode = keyCode = e.keyCode;
        keyPressed();
    });

    document.addEventListener("keyup", function(e) {
        e.preventDefault();
        Dark.variables.keyIsPressed = keyIsPressed = false;
        Dark.variables.key = key = undefined;
        Dark.variables.keyCode = keyCode = undefined;
        keyReleased();
    });

    document.addEventListener("keypress", function(e) {
        e.preventDefault();
        keyTyped();
    });

};

Dark.helper.reloadEvents = function() {

    Dark.canvas.addEventListener("mousedown", function(e) {
        e.preventDefault();
        Dark.variables.mouseIsPressed = mouseIsPressed = true;
        Dark.variables.mouseButton = mouseButton = Dark.mouseMap[e.button];
        mousePressed();
    });

    Dark.canvas.addEventListener("mouseup", function(e) {
        e.preventDefault();
        Dark.variables.mouseButton = mouseButton = undefined;
        Dark.variables.mouseIsPressed = mouseIsPressed = false;
        mouseReleased();
    });

    Dark.canvas.addEventListener("mouseenter", function(e) {
        e.preventDefault();
        Dark.variables.mouseIsInside = mouseIsInside = true;
        mouseIn();
    });

    Dark.canvas.addEventListener("mouseleave", function(e) {
        Dark.variables.mouseIsInside = mouseIsInside = false;
        e.preventDefault();
        mouseOut();
    });

    Dark.canvas.addEventListener("mousemove", function(e) {
        e.preventDefault();
        // https://stackoverflow.com/questions/3234256/find-mouse-position-relative-to-element
        let boundingBox = e.target.getBoundingClientRect();
        Dark.variables.pmouseX = pmouseX = pmouse.x = mouseX;
        Dark.variables.pmouseY = pmouseY = pmouse.y  = mouseY;
        Dark.variables.mouseX = mouseX = mouse.x = constrain(round(e.pageX - boundingBox.x), 0, width);
        Dark.variables.mouseY = mouseY = mouse.y = constrain(round(e.pageY - boundingBox.y), 0, height);
        mouseMoved();
    });

    Dark.canvas.addEventListener("dblclick", function(e) {
        e.preventDefault();
        mouseDoubleClicked();
    });

};

// Draw function
Dark.raf = function(time) {
    const deltaFrame = time - Dark.lastFrame;
    const deltaTime = time - Dark.lastTime;
    if(deltaFrame > Dark.settings.frameStep - deltaTime / 2 && Dark.settings.looping) {
        Dark.variables.dt = dt = deltaFrame;
        Dark.variables.fps = fps = 1000 / dt;
        Dark.variables.frameCount = ++frameCount;
        draw();
        Dark.lastFrame = performance.now();
    }
    Dark.lastTime = performance.now();
    requestAnimationFrame(Dark.raf);
};
    
// Start draw function
requestAnimationFrame(Dark.raf);

// Add variables to global space
Dark.loadCatagories.forEach(function(catagory) {
    for(const key in Dark[catagory]) {
        window[key] = Dark[catagory][key];
    }
});

// Load event listeners for document
Dark.helper.loadEvents();

// Setup later options
mouse = DVector.zero2D();
pmouse = DVector.zero2D();
Dark.settings.cursor = "auto";
Dark.settings.looping = true;

// Load default settings & functions
frameRate(60);
smooth();
ellipseMode(CENTER);
rectMode(CORNER);
imageMode(CORNER);
angleMode(DEGREES);
strokeCap(ROUND);
fill(255);
stroke(0);
strokeWeight(1);
textFont("12px Arial");
