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
    */
};

// Constants
const
    DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    PI = Math.PI,
    HALF_PI = Math.PI / 2,
    E = Math.E,
    PHI = Math.PHI,
    TAU = Math.PI * 2,
    ROUND = 0,
    FLAT = 1,
    DEGREES = 2,
    RADIANS = 3,
    VERTEX = 4,
    CURVE = 5,
    BEZIER = 6,
    CLOSE = 7

// Create default canvas
Dark.canvas = document.createElement("canvas");
Dark.canvas.id = "Dark-default-canvas";
Dark.canvas.style.position = "absolute";
Dark.canvas.style.inset = "0px";

// Context
Dark.ctx = Dark.canvas.getContext("2d");

// Initiate Dark objects
Dark.settings = {};
Dark.helper = {};
Dark.transforms = [];
Dark.vertices = [];
Dark.objects = {};
Dark.lastFrame = performance.now();
Dark.raf = () => {};
Dark.errorCount = 0;
Dark.maxErrorCount = 50;
Dark.maxTransforms = 1000;

var width = Dark.canvas.width;
var height = Dark.canvas.height;

var dt = 0;
var frameCount = 0;
var fps = 60;
var draw = () => {};

Dark.constants = {
    "DAYS": DAYS,
    "PI": PI,
    "HALF_PI": HALF_PI,
    "E": E,
    "PHI": PHI,
    "TAU": TAU,
    "ROUND": ROUND,
    "FLAT": FLAT,
    "DEGREES": DEGREES,
    "RADIANS": RADIANS,
    "VERTEX": VERTEX,
    "CURVE": CURVE,
    "BEZIER": BEZIER,
    "CLOSE": CLOSE
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

Dark.warn = function(warning) {
    Dark.helper.doError("warn", warning);
};

Dark.error = function(error) {
    Dark.helper.doError("error", error);
};

// Very handy function to copy objects
var copy = function(e) {
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
};

// Setup functions & getters
var size = function(w = window.innerWidth, h = window.innerHeight) {
    if(typeof w === "number" && typeof h === "number" && width > 0 && height > 0) {
        // Because for some reason changing width & height reset all parameters >:(
        // It took me ~8 hours to figure this out. D:<
        let old = copy(Dark.ctx);

        width = Dark.canvas.width = w;
        height = Dark.canvas.height = h;

        for(const key in Dark.ctx) {
            const value = old[key];
            if(key !== "canvas" && typeof value !== "function") {
                Dark.ctx[key] = value;
            }
        }
    }
};

var setCanvas = function(canvas) {
    if(canvas instanceof HTMLCanvasElement) {
        Dark.canvas = canvas;
        width = canvas.width;
        height = canvas.height;

        let old = copy(Dark.ctx);
        Dark.ctx = canvas.getContext("2d");

        for(const key in Dark.ctx) {
            const value = old[key];
            if(key !== "canvas" && typeof value !== "function") {
                Dark.ctx[key] = value;
            }
        }
    }
};

var getCanvas = function() {
    return Dark.canvas;
};

var getContext = function() {
    return Dark.ctx;
};

// Math-y
var dist = function(x1, y1, x2, y2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

var gamma = function(z) {
    // Stirling's Approximation
    return Math.sqrt(TAU / z) * (((z + 1 / (12 * z + 1 / (10 * z))) / E) ** z);
};

// Not very accurate, pretty good up to the hundreths
var factorial = function(num) {
    return Number.isInteger(num) ? intFactorial(num) : gamma(num + 1);
};

// Integer-only factorial, 100% accurate and faster
var intFactorial = function(num) {
    num = Math.floor(num);

    let total = num;
    while(--num > 1) {
        total *= num;
    }
    return total;
};

var choose = function(n, k) {
    return intFactorial(n) / (intFactorial(n - k) * intFactorial(k));
};

// Very close to ProcessingJS code
var random = function(...args) {
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
};

var frameRate = function(desiredFPS) {
    Dark.settings.frameStep = 1000 / desiredFPS;
};

// Debugging
var format = function(obj) {
    if(typeof obj === "object" && obj !== null) {
        return JSON.stringify(copy(obj), null, "    ");
    } else {
        return obj + "";
    }
};

// Color
var color = function(r, g, b, a) {
    if(r != undefined && g == undefined) g = r;
    if(g != undefined && b == undefined) b = g;
    if(a == undefined) a = 255;
    r = Math.min(Math.max(r, 0), 255);
    g = Math.min(Math.max(g, 0), 255);
    b = Math.min(Math.max(b, 0), 255);
    a = Math.min(Math.max(a, 0), 255);
    return (a << 24) + (r << 16) + (g << 8) + (b);
};

// Splitting color into parts
var red = color => (color >> 16) & 255;
var green = color => (color >> 8) & 255;
var blue = color => color & 255;
var alpha = color => (color >> 24) & 255;

var lerpColor = function(c1, c2, percent) {
    return color(
        lerp(red(c1), red(c2), percent),
        lerp(green(c1), green(c2), percent),
        lerp(blue(c1), blue(c2), percent),
        lerp(alpha(c1), alpha(c2), percent)
    );
};

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

var fill = function(r, g, b, a) {
    let c = Dark.settings.fill = Dark.helper.colorValue(r, g, b, a);
    Dark.ctx.fillStyle = Dark.helper.colorString(c);
};

var noFill = function() {
    Dark.settings.fill = 0;
    Dark.ctx.fillStyle = "rgba(0, 0, 0, 0)";
};

var stroke = function(r, g, b, a) {
    // Same as fill
    let c = Dark.settings.stroke = Dark.helper.colorValue(r, g, b, a);
    Dark.ctx.strokeStyle = Dark.helper.colorString(c);
};

var noStroke = function() {
    Dark.settings.stroke = 0;
    Dark.ctx.strokeStyle = "rgba(0, 0, 0, 0)";
};

var background = function(r, g, b, a) {
    Dark.ctx.save();
    let c = Dark.helper.colorValue(r, g, b, a);
    Dark.ctx.fillStyle = Dark.helper.colorString(c);
    Dark.ctx.fillRect(0, 0, width, height);
    Dark.ctx.restore();
};

var clear = function() {
    Dark.ctx.clearRect(0, 0, width, height);
};

// Drawing modes
var strokeCap = function(mode) {
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
};

var strokeWeight = function(weight) {
    Dark.settings.strokeWeight = weight;
    Dark.ctx.lineWidth = weight;
};

var smooth = function() {
    Dark.settings.smoothing = true;
    Dark.ctx.imageSmoothingEnabled = true;
    Dark.ctx.imageSmoothingQuality = "high";
};

var noSmooth = function() {
    Dark.settings.smoothing = true;
    Dark.ctx.imageSmoothingEnabled = false;
    Dark.ctx.imageSmoothingQuality = "low";
};

var angleMode = function(mode) {
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
};

// Transformations
var pushMatrix = function() {
    if(Dark.transforms.length > Dark.maxTransforms) {
        Dark.error("Maximum matrix stack size reached, pushMatrix() called " + Dark.maxTransforms + " times.");
    } else {
        Dark.transforms.push(Dark.ctx.getTransform());
    }
};

var popMatrix = function() {
    let transform = Dark.transforms.pop();
    if(transform == undefined) {
        Dark.error(new Error("No more transforms to restore in popMatrix"));
    } else {
        Dark.ctx.setTransform(transform);
    }
};

var resetMatrix = function() {
    Dark.transforms.length = 0;
};

var translate = function(x, y) {
    Dark.ctx.translate(x, y);
};

var rotate = function(angle) {
    Dark.ctx.rotate(Dark.helper.angle(angle));
};

var scale = function(w, h) {
    if(y == undefined) {
        Dark.ctx.scale(w, w);
    } else {
        Dark.ctx.scale(w, h);
    }
};

var skew = function(h, v = 0) {
    let transform = Dark.ctx.getTransform();
    transform.b = v;
    transform.c = h;
    Dark.ctx.setTransform(transform);
};

// Shapes
var rect = function(x, y, width, height) {
    Dark.ctx.rect(x, y, width, height);
    Dark.ctx.fill();
    Dark.ctx.stroke();
};

var ellipse = function(x, y, width, height) {
    Dark.ctx.beginPath();
    Dark.ctx.ellipse(x, y, width / 2, height / 2, 0, 0, TAU, false);
    Dark.ctx.fill();
    Dark.ctx.stroke();
};

var arc = function(x, y, width, height, start, stop) {
    Dark.ctx.beginPath();
    Dark.ctx.ellipse(x, y, width / 2, height / 2, 0, start, stop, false);
    Dark.ctx.fill();
    Dark.ctx.stroke();
};

var line = function(x1, y1, x2, y2) {
    Dark.ctx.beginPath();
    Dark.ctx.moveTo(x1, y1);
    Dark.ctx.lineTo(x2, y2);
    Dark.ctx.stroke();
};

var point = function(x, y) {
    Dark.ctx.save();
    Dark.ctx.fillStyle = "rgba(0, 0, 0, 1)";
    if(Dark.settings.strokeWeight > 1) {
        Dark.ctx.beginPath();
        Dark.ctx.arc(x, y, Dark.settings.strokeWeight / 2, 0, TAU);
    } else {
        Dark.ctx.rect(x, y, 1, 1);
    }
    Dark.ctx.fill();
    Dark.ctx.restore();
};

var circle = function(x, y, radius) {
    Dark.ctx.beginPath();
    Dark.ctx.arc(x, y, radius, 0, TAU);
    Dark.ctx.fill();
    Dark.ctx.stroke();
};

var square = function(x, y, side) {
    rect(x, y, side, side);
};

var triangle = function(x1, y1, x2, y2, x3, y3) {
    Dark.ctx.beginPath();
    Dark.ctx.moveTo(x1, y1);
    Dark.ctx.lineTo(x2, y2);
    Dark.ctx.lineTo(x3, y3);
    Dark.ctx.closePath();
    Dark.ctx.fill();
    Dark.ctx.stroke();
};

var quad = function(x1, y1, x2, y2, x3, y3, x4, y4) {
    Dark.ctx.beginPath();
    Dark.ctx.moveTo(x1, y1);
    Dark.ctx.lineTo(x2, y2);
    Dark.ctx.lineTo(x3, y3);
    Dark.ctx.lineTo(x4, y4);
    Dark.ctx.closePath();
    Dark.ctx.fill();
    Dark.ctx.stroke();
};

var beginShape = function() {
    Dark.vertices.length = 0;
};

var endShape = function(type) {
    if(Dark.vertices[0].type != VERTEX || Dark.vertices.length < 2) return;
    Dark.ctx.beginPath();
    Dark.vertices.forEach(function(vert, index) {
        if(index == 0) {
            Dark.ctx.moveTo(vert.point.x, vert.point.y);
        } else {
            switch(vert.type) {
                case VERTEX:
                    const pt = vert.point;
                    Dark.ctx.moveTo(pt.x, pt.y);
                    break;
                case CURVE:
                    // to be implemented
                    break;
                case BEZIER:
                    const pts = vert.points;
                    Dark.ctx.bezierCurveTo(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
                    break;
            }
        }
    });
    if(type == CLOSE) Dark.ctx.closePath();
    Dark.ctx.fill();
    Dark.ctx.stroke();
};

// Kinda copied from ski, though slightly different (curveVertex)
var vertex = function(x, y) {
    Dark.vertices.push({
        type: VERTEX,
        point: {
            x: x,
            y: y
        }
    });
};

var curveVertex = function(cx, cy) {
    Dark.vertices.push({
        type: CURVE,
        node: {
            x: cx,
            y: cy
        }
    });
};

var bezierVertex = function(x1, y1, x2, y2, x3, y3) {
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
};

var bezier = function(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
    beginShape();
    vertex(x1, y1);
    bezierVertex(cx1, cy1, cx2, cy2, x2, y2);
    endShape();
};

// Quick & Mathy functions
// Map copied from ProcessingJS
var min = (a, b) => (a < b) ? a : b;
var max = (a, b) => (a > b) ? a : b;
var log10 = num => Math.log10(num);
var log2 = num => Math.log2(num);
var log = num => Math.log(num);
var logBase = (base, num) => Math.log(base) / Math.log(num);
var hypot = (a, b) => Math.sqrt(a * a + b * b);
var constrain = (num, min, max) => Math.min(Math.max(num, min), max);
var lerp = (val1, val2, percent) => (val2 - val1) * percent + val1;
var map = (num, min1, max1, min2, max2) => min2 + (max2 - min2) / (max1 - min1) * (value - min1);
var sq = num => num * num;
var cb = num => num * num * num;
var pow = (num, power) => num ** power;
var root = (num, power) => num ** (1 / power);
var sqrt = num => Math.sqrt(num);
var cbrt = num => Math.cbrt(num);
var exp = num => E ** num;
var floor = num => Math.floor(num);
var round = num => Math.round(num);
var ceil = num => Math.ceil(num);
var trunc = num => Math.trunc(num);
var deci = num => num - Math.trunc(num);
var abs = num => (num < 0) ? - num : num;
var sign = num => Math.sign(num);
var bsign = num => (num < 0) ? -1 : 1;
var degrees = angle => angle * 180 / PI;
var radians = angle => angle * PI / 180;
var millennium = () => Math.floor(new Date().getFullYear() / 1000);
var century = () => Math.floor(new Date().getFullYear() / 100);
var decade = () => Math.floor(new Date().getFullYear() / 10);
var year = () => new Date().getFullYear();
var month = () => new Date().getMonth();
var day = () => new Date().getDate();
var hour = () => new Date().getHours();
var minute = () => new Date().getMinutes();
var second = () => new Date().getSeconds();
var millis = () => Math.floor(performance.now());
var micro = () => Math.floor((performance.now() * 1000) % 1000);
var nano = () => Math.floor((performance.now() * 1000000) % 1000);
var today = () => DAYS[new Date().getDay()];
var timezone = () => - new Date().getTimezoneOffset() / 60;
var degrees = rad => rad * 180 / PI;
var radians = deg => deg * PI / 180;
var sin = ang => Math.sin(Dark.helper.angle(ang));
var cos = ang => Math.cos(Dark.helper.angle(ang));
var tan = ang => Math.tan(Dark.helper.angle(ang));
var csc = ang => 1 / Math.sin(Dark.helper.angle(ang));
var sec = ang => 1 / Math.cos(Dark.helper.angle(ang));
var cot = ang => 1 / Math.tan(Dark.helper.angle(ang));
var atan2 = (dy, dx) => Dark.helper.angleBack(Math.atan2(dy, dx));
var asin = ang => Math.asin(Dark.helper.angle(ang));
var acos = ang => Math.acos(Dark.helper.angle(ang));
var atan = ang => Math.atan(Dark.helper.angle(ang));
var acsc = ang => Math.asin(1 / Dark.helper.angle(ang));
var asec = ang => Math.acos(1 / Dark.helper.angle(ang));
var acot = ang => Math.atan(1 / Dark.helper.angle(ang));
var sinh = ang => Math.sinh(Dark.helper.angle(ang));
var cosh = ang => Math.cosh(Dark.helper.angle(ang));
var tanh = ang => Math.tanh(Dark.helper.angle(ang));
var csch = ang => 1 / Math.sinh(Dark.helper.angle(ang));
var sech = ang => 1 / Math.cosh(Dark.helper.angle(ang));
var coth = ang => 1 / Math.tanh(Dark.helper.angle(ang));
var asinh = ang => Math.asinh(Dark.helper.angle(ang));
var acosh = ang => Math.acosh(Dark.helper.angle(ang));
var atanh = ang => Math.atanh(Dark.helper.angle(ang));
var acsch = ang => Math.asinh(1 / Dark.helper.angle(ang));
var asech = ang => Math.acosh(1 / Dark.helper.angle(ang));
var acoth = ang => Math.atanh(1 / Dark.helper.angle(ang));

// Vectors
var DVector = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
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
    return "[" + this.x + ", " + this.y + ", " + this.z + "]";
};
Dark.objects.DVector = DVector;

// Load default settings & functions
fill(255);
stroke(0);
strokeWeight(2);
strokeCap(ROUND);
smooth();
angleMode(DEGREES);
frameRate(60);

// Draw function
Dark.raf = function(time) {
    const deltaFrame = time - Dark.lastFrame;
    const deltaTime = time - Dark.lastTime;
    if(deltaFrame > Dark.settings.frameStep - deltaTime / 2) {
        dt = deltaFrame;
        fps = 1000 / dt;
        draw();
        Dark.lastFrame = performance.now();
    }
    Dark.lastTime = performance.now();
    requestAnimationFrame(Dark.raf);
};

requestAnimationFrame(Dark.raf);

console.log(Dark);