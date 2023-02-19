var Dark = function() {

    // private variables & functions
    let lastFrame = performance.now();
    let lastTime = performance.now();

    // Shorter = faster to type
    let d = this;
    let k = Dark.constants; // Quicker typing

    Dark.instances.push(d);

    d.settings = {};
    d.transforms = [];
    d.vertices = [];
    d.vertexCache = [];
    d.objects = Dark.objects;
    k = d.constants = Dark.constants;

    // Load in variables to their default values
    for(const key in Dark.variables) {
        d[key] = Dark.variables[key];
    }

    d.isMain = false;

    let randomID = Math.floor(Math.random() * 1000000000).toString(36);

    // Create temp canvas (default)
    let temp = document.createElement("canvas");
    temp.id = "DarkJS-default-canvas-" + randomID;
    temp.style.position = "absolute";
    temp.style.inset = "0px";
    // fallback
    temp.style.top = "0px";
    temp.style.left = "0px";

    temp.width = innerWidth;
    temp.height = innerHeight;

    // Create canvas
    d.defaultCanvas = temp;
    d.canvas = temp;
    d.ctx = temp.getContext("2d", Dark.defaultContextSettings);

    // Add empties
    Dark.empties.forEach(emp => d[emp] = () => {});

    // Helper functions
    var bulkAdd = function(obj) {
        for(const key in obj) {
            d[key] = obj[key];
        }
    };

    var angle = function(angle) {
        return (d.settings.angleMode == k.DEGREES) ? angle * k.PI / 180 : angle;
    };

    var angleBack = function(angle) {
        return (d.settings.angleMode == k.DEGREES) ? angle * 180 / k.PI : angle;
    };

    var loadEvents = function() {

        document.addEventListener("keydown", function(e) {
            e.preventDefault();
            d.keyIsPressed = true;
            d.key = e.key;
            d.keyCode = e.keyCode;
            d.keyPressed();
        });

        document.addEventListener("keyup", function(e) {
            e.preventDefault();
            d.keyIsPressed = false;
            d.key = undefined;
            d.keyCode = undefined;
            d.keyReleased();
        });

        document.addEventListener("keypress", function(e) {
            e.preventDefault();
            d.keyTyped();
        });

    };

    var reloadEvents = function() {

        d.canvas.addEventListener("mousedown", function(e) {
            e.preventDefault();
            d.mouseIsPressed = true;
            d.mouseButton = Dark.mouseMap[e.button];
            d.mousePressed();
        });

        d.canvas.addEventListener("mouseup", function(e) {
            e.preventDefault();
            d.mouseButton = undefined;
            d.mouseIsPressed = false;
            d.mouseReleased();
        });

        d.canvas.addEventListener("mouseenter", function(e) {
            e.preventDefault();
            d.mouseIsInside = true;
            d.mouseIn();
        });

        d.canvas.addEventListener("mouseleave", function(e) {
            d.mouseIsInside = false;
            e.preventDefault();
            d.mouseOut();
        });

        d.canvas.addEventListener("mousemove", function(e) {
            e.preventDefault();
            // https://stackoverflow.com/questions/3234256/find-mouse-position-relative-to-element
            let boundingBox = e.target.getBoundingClientRect();
            d.pmouseX = d.pmouse.x = d.mouseX;
            d.pmouseY = d.pmouse.y = d.mouseY;
            d.mouseX = d.mouse.x = d.constrain(d.round(e.pageX - boundingBox.x), 0, width);
            d.mouseY = d.mouse.y = d.constrain(d.round(e.pageY - boundingBox.y), 0, height);
            d.mouseMoved();
        });

        d.canvas.addEventListener("dblclick", function(e) {
            e.preventDefault();
            d.mouseDoubleClicked();
        });

    };

    var colorString = function(c) {
        return "rgba(" + d.red(c) + ", " + d.green(c) + ", " + d.blue(c) + ", " + d.alpha(c) / 255 + ")";
    };

    bulkAdd({

        // Very handy function to copy objects
        copy: function(e) {
            if(typeof e == "object") {
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
            if(typeof w == "number" && typeof h == "number" && w > 0 && h > 0) {
                // Because for some reason changing width & height reset all parameters >:(
                // It took me ~8 hours to figure this out. D:<
                let old = d.copy(d.ctx);

                d.width = d.canvas.width = w;
                d.height = d.canvas.height = h;

                for(const key in d.ctx) {
                    const value = old[key];
                    if(key !== "canvas" && typeof value !== "function") {
                        d.ctx[key] = value;
                    }
                }
            }
        },

        setCanvas: function(canvas) {
            if(canvas instanceof HTMLCanvasElement) {
                d.canvas = canvas;
                d.width = canvas.width;
                d.height = canvas.height;

                let old = copy(d.ctx);
                d.ctx = canvas.getContext("2d", Dark.defaultContextSettings);

                for(const key in d.ctx) {
                    const value = old[key];
                    if(key !== "canvas" && typeof value !== "function") {
                        d.ctx[key] = value;
                    }
                }

                d.canvas.style.cursor = d.settings.cursor;
                d.canvas.tabIndex = "1";

                reloadEvents();
            }
        },

        getCanvas: function() {
            return d.canvas;
        },

        getContext: function() {
            return d.ctx;
        },

        // Math-y
        dist: function(...args) {
            let dx, dy, dz = 0;
            if(args.length = 6) {
                // x1, y1, x2, y2
                dx = args[2] - args[0];
                dy = args[3] - args[1];
            } else if(args.length == 4) {
                // x1, y1, z1, x2, y2, z2
                dx = args[3] - args[0];
                let dy = args[4] - args[1];
                let dz = args[5] - args[2];
            } else {
                Dark.error(new Error("dist requires 4 or 6 parameters, not " + args.length));
            }
            return d.sqrt(dx * dx + dy * dy + dz * dz);
        },

        gamma: function(z) {
            // Stirling's Approximation
            return d.sqrt(k.TAU / z) * (((z + 1 / (12 * z + 1 / (10 * z))) / E) ** z);
        },

        // Not very accurate, pretty good up to the hundreths
        factorial: function(num) {
            return Number.isInteger(num) ? intFactorial(num) : gamma(num + 1);
        },

        // Integer-only factorial, 100% accurate and faster
        intFactorial: function(num) {
            num = d.floor(num);

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
            d.settings.cursor = type;
            d.canvas.style.cursor = type;
        },

        loop: function() {
            d.settings.looping = true;
        },

        noLoop: function() {
            d.settings.looping = false;
        },

        frameRate: function(desiredFPS) {
            d.settings.frameStep = 1000 / desiredFPS;
        },

        enableContextMenu: function() {
            d.settings.contextMenu = true;
            d.canvas.oncontextmenu = true;
        },

        disableContextMenu: function() {
            d.settings.contextMenu = false;
            d.canvas.oncontextmenu = false;
        },

        // Debugging
        format: function(obj) {
            if(typeof obj == "object" && obj !== null) {
                return JSON.stringify(copy(obj), null, "    ");
            } else {
                return obj + "";
            }
        },

        // Color
        color: function(r, g, b, a) {
            if(arguments.length == 1) b = g = r;
            if(arguments.length == 2) a = g, g = r, b = r;
            if(!a) a = 255;
            r = d.constrain(r, 0, 255);
            g = d.constrain(g, 0, 255);
            b = d.constrain(b, 0, 255);
            a = d.constrain(a, 0, 255);
            return (a << 24) + (r << 16) + (g << 8) + (b);
        },

        // Splitting color into parts
        red: color => (color >> 16) & 255,
        green: color => (color >> 8) & 255,
        blue: color => color & 255,
        alpha: color => (color >> 24) & 255,

        lerpColor: function(c1, c2, percent) {
            return color(
                d.lerp(d.red(c1), d.red(c2), percent),
                d.lerp(d.green(c1), d.green(c2), percent),
                d.lerp(d.blue(c1), d.blue(c2), percent),
                d.lerp(d.alpha(c1), d.alpha(c2), percent)
            );
        },

        fill: function(...args) {
            let c = d.settings.fill = d.color.apply(null, args);
            d.ctx.fillStyle = colorString(c);
        },

        noFill: function() {
            d.settings.fill = 0;
            d.ctx.fillStyle = "rgba(0, 0, 0, 0)";
        },

        stroke: function(...args) {
            // Same as fill
            let c = d.settings.stroke = d.color.apply(null, args);
            d.ctx.strokeStyle = colorString(c);
        },

        noStroke: function() {
            d.settings.stroke = 0;
            d.ctx.strokeStyle = "rgba(0, 0, 0, 0)";
        },

        background: function(...args) {
            d.ctx.save();
            let c = d.color.apply(null, args);
            d.ctx.fillStyle = colorString(c);
            d.ctx.fillRect(0, 0, d.width, d.height);
            d.ctx.restore();
        },

        clear: function() {
            d.ctx.clearRect(0, 0, d.width, d.height);
        },

        // Drawing modes
        strokeCap: function(mode) {
            switch(mode) {
                default:
                    Dark.error(new Error("Invalid strokeCap type"));
                    break;
                case k.FLAT:
                    d.ctx.lineCap = "butt";
                    d.settings.strokeCap = k.FLAT;
                    break;
                case k.ROUND:
                    d.ctx.lineCap = "round";
                    d.settings.strokeCap = k.ROUND;
                    break;
                case k.SQUARE:
                    d.ctx.lineCap = "square";
                    d.settings.strokeCap = k.SQUARE;
            }
        },

        strokeJoin: function(mode = k.MITER) {
            switch(mode) {
                default:
                    Dark.error(new Error("Invalid strokeJoin type"));
                    break;
                case k.MITER:
                    d.ctx.lineJoin = "miter";
                    d.settings.strokeJoin = k.MITER;
                    break;
                case k.BEVEL:
                    d.ctx.lineJoin = "bevel";
                    d.settings.strokeJoin = k.BEVEL;
                    break;
                case k.ROUND:
                    d.ctx.lineJoin = "round";
                    d.settings.strokeJoin = k.ROUND;
                    break;
            }
        },

        strokeWeight: function(weight) {
            d.settings.strokeWeight = weight;
            d.ctx.lineWidth = weight;
        },

        smooth: function() {
            d.settings.smoothing = true;
            d.ctx.imageSmoothingEnabled = true;
            d.ctx.imageSmoothingQuality = "high";
        },

        noSmooth: function() {
            d.settings.smoothing = true;
            d.ctx.imageSmoothingEnabled = false;
            d.ctx.imageSmoothingQuality = "low";
        },

        angleMode: function(mode) {
            switch(mode) {
                default:
                    Dark.error(new Error("Invalid angleMode type"));
                    break;
                case k.DEGREES:
                    d.settings.angleMode = k.DEGREES;
                    break;
                case k.RADIANS:
                    d.settings.angleMode = k.RADIANS;
                    break;
            }
        },

        ellipseMode: function(type = k.CENTER) {
            d.settings.ellipseMode = type;
        },

        rectMode: function(type = k.CORNER) {
            d.settings.rectMode = type;
        },

        imageMode: function(type = k.CORNER) {
            d.settings.imageMode = type;
        },

        curveTightness: function(tightness = 0) {
            d.settings.curveTightness = tightness;
        },

        // Transformations
        pushMatrix: function() {
            if(d.transforms.length > d.maxTransforms) {
                Dark.error("Maximum matrix stack size reached, pushMatrix() called " + d.maxTransforms + " times.");
            } else {
                d.transforms.push(d.ctx.getTransform());
            }
        },

        popMatrix: function() {
            let transform = d.transforms.pop();
            if(!transform) {
                Dark.error(new Error("No more transforms to restore in popMatrix"));
            } else {
                d.ctx.setTransform(transform);
            }
        },

        resetMatrix: function() {
            d.transforms.length = 0;
        },

        translate: function(x, y) {
            d.ctx.translate(x, y);
        },

        rotate: function(ang) {
            d.ctx.rotate(angle(ang));
        },

        scale: function(w, h) {
            if(arguments.length < 2) {
                d.ctx.scale(w, w);
            } else {
                d.ctx.scale(w, h);
            }
        },

        skew: function(h, v = 0) {
            let transform = d.ctx.getTransform();
            transform.b = v * 0.01;
            transform.c = h * 0.01;
            d.ctx.setTransform(transform);
        },

        // Shapes
        rect: function(x, y, width, height) {
            width = Math.abs(width), height = Math.abs(height);
            d.ctx.beginPath();
            d.ctx.save();
            if(d.settings.rectMode == k.CENTER) d.ctx.translate(- width / 2, - height / 2);
            d.ctx.rect(x, y, width, height);
            d.ctx.fill();
            d.ctx.stroke();
            d.ctx.restore();
        },

        ellipse: function(x, y, width, height) {
            width = Math.abs(width), height = Math.abs(height);
            d.ctx.beginPath();
            d.ctx.save();
            if(d.settings.ellipseMode == k.CORNER) d.ctx.translate(width / 2, height / 2);
            d.ctx.beginPath();
            d.ctx.ellipse(x, y, width / 2, height / 2, 0, 0, k.TAU, false);
            d.ctx.fill();
            d.ctx.stroke();
            d.ctx.restore();
        },

        arc: function(x, y, width, height, start, stop) {
            d.ctx.save();
            if(d.settings.ellipseMode == k.CORNER) d.ctx.translate(width / 2, height / 2);
            d.ctx.beginPath();
            d.ctx.ellipse(x, y, width / 2, height / 2, 0, start, stop, false);
            d.ctx.fill();
            d.ctx.stroke();
            d.ctx.restore();
        },

        line: function(x1, y1, x2, y2) {
            d.ctx.beginPath();
            d.ctx.moveTo(x1, y1);
            d.ctx.lineTo(x2, y2);
            d.ctx.stroke();
        },

        point: function(x, y) {
            d.ctx.save();
            d.ctx.beginPath();
            d.ctx.fillStyle = colorString(d.settings.stroke);
            d.ctx.arc(x, y, d.settings.strokeWeight / 2, 0, k.TAU);
            d.ctx.fill();
            d.ctx.restore();
        },

        circle: function(x, y, radius) {
            d.ctx.save();
            if(d.settings.ellipseMode == k.CORNER) d.ctx.translate(radius, radius);
            d.ctx.beginPath();
            d.ctx.arc(x, y, radius, 0, k.TAU);
            d.ctx.fill();
            d.ctx.stroke();
            d.ctx.restore();
        },

        square: function(x, y, side) {
            rect(x, y, side, side);
        },

        triangle: function(x1, y1, x2, y2, x3, y3) {
            d.ctx.beginPath();
            d.ctx.moveTo(x1, y1);
            d.ctx.lineTo(x2, y2);
            d.ctx.lineTo(x3, y3);
            d.ctx.closePath();
            d.ctx.fill();
            d.ctx.stroke();
        },

        quad: function(x1, y1, x2, y2, x3, y3, x4, y4) {
            d.ctx.beginPath();
            d.ctx.moveTo(x1, y1);
            d.ctx.lineTo(x2, y2);
            d.ctx.lineTo(x3, y3);
            d.ctx.lineTo(x4, y4);
            d.ctx.closePath();
            d.ctx.fill();
            d.ctx.stroke();
        },

        beginShape: function() {
            // faster than = []
            d.vertices.length = 0;
            d.vertexCache.length = 0;
        },

        // https://www.cs.umd.edu/~reastman/slides/L19P01ParametricCurves.pdf
        endShape: function(type = k.OPEN) {
            if(d.vertices.length < 2 || d.vertices[0].type != k.VERTEX) return;
            d.ctx.beginPath();
            d.vertices.forEach(function(vert, index) {
                if(index == 0) {
                    d.ctx.moveTo(vert.points[0].x, vert.points[0].y);
                } else {
                    switch(vert.type) {
                        case k.VERTEX:
                            let pt = vert.points[0];
                            d.ctx.lineTo(pt.x, pt.y);
                            break;
                        case k.CURVE:
                            // to be implemented
                            let t = 4;
                            let t0 = (t - 1) / 4;
                            let t1 = (1 - t) / 4; // just -t0, might change
                            let curveMatrix = new DMatrix([
                                [0, 1, 0, 0],
                                [t0, 1, t1, 0],
                                [0, t1, 1, t0],
                                [0, 0, 0, 0]
                            ]);
                            let pos = new DMatrix([
                                [d.vertexCache[index].x, d.vertexCache[index].y],
                                [d.vertexCache[index + 1].x, d.vertexCache[index + 1].y],
                                [d.vertexCache[index - 1].x, d.vertexCache[index - 1].y],
                                [d.vertexCache[index + 2].x, d.vertexCache[index + 2].y]
                            ]);
                            let cubic = DMatrix.mult(curveMatrix, pos);
                            d.ctx.bezierCurveTo(
                                cubic.get(0, 0), cubic.get(1, 0),
                                cubic.get(0, 1), cubic.get(1, 1),
                                cubic.get(0, 2), cubic.get(1, 2)
                            );
                            break;
                        case k.BEZIER:
                            let pts = vert.points;
                            d.ctx.bezierCurveTo(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
                            break;
                        case k.SMOOTH:
                            // to be implemented
                            break;
                    }
                }
            });
            if(type == k.CLOSE) d.ctx.closePath();
            d.ctx.fill();
            d.ctx.stroke();
        },

        // Kinda copied from ski, though slightly different (curveVertex)
        vertex: function(x, y) {
            let vert = {
                type: k.VERTEX,
                points: [
                    {
                        x: x,
                        y: y
                    }
                ]
            };

            d.vertices.push(vert);
            d.vertexCache = d.vertexCache.concat(vert.points);
        },

        curveVertex: function(cx, cy) {
            let vert = {
                type: k.CURVE,
                points: [
                    {
                        x: cx,
                        y: cy
                    }
                ]
            };

            d.vertices.push(vert);
            d.vertexCache = d.vertexCache.concat(vert.points);
        },

        smoothVertex: function(sx, sy) {
            let vert = {
                type: k.SMOOTH,
                points: [
                    {
                        x: sx,
                        y: sy
                    }
                ]
            };

            d.vertices.push(vert);
            d.vertexCache = d.vertexCache.concat(vert.points);
        },

        bezierVertex: function(x1, y1, x2, y2, x3, y3) {
            let vert = {
                type: k.BEZIER,
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
            };

            d.vertices.push(vert);
            d.vertexCache = d.vertexCache.concat(vert.points);
        },

        bezier: function(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
            beginShape();
            vertex(x1, y1);
            bezierVertex(cx1, cy1, cx2, cy2, x2, y2);
            endShape();
        },

        reloadFont: function() {
            d.ctx.font = d.settings.font.toString();
        },

        // Text
        textSize: function(size) {
            d.settings.textSize = size;
            d.settings.font.size = size;
            d.reloadFont();
        },

        textFont: function(font) {
            if(typeof font == "string") {
                font = new d.objects.DFont(font);
            }
            if(font instanceof d.objects.DFont) {
                d.settings.font = font;
                d.settings.textSize = font.size;
                d.reloadFont();
            } else {
                Dark.error(font + " is not a DFont.");
            }
        },

        createFont: function(txt) {
            return DFont.parse(txt);
        },

        textStyle: function(style) {
            switch(style) {
                default:
                    d.settings.font.weight = "normal";
                    d.settings.font.style = "normal";
                    break;
                case k.BOLD:
                    d.settings.font.weight = "bold";
                    break;
                case k.ITALIC:
                    d.settings.font.style = "italic";
                    break;
            }
            d.reloadFont();
        },

        text: function(text, x, y) {
            d.ctx.fillText(text, x, y);
            d.ctx.strokeText(text, x, y);
        },

        // Images
        get: function(...args) {
            if(args.length == 0) {
                return new DImage(
                    d.ctx.getImageData(0, 0, width, height),
                    d.canvas
                );
            } else if(args.length == 4) {
                return new DImage(
                    d.ctx.getImageData(args[0], args[1], args[2], args[3]),
                    d.canvas
                );
            } else {
                Dark.error(new Error("get requires 0 or 4 parameters, not " + args.length));
            }
        },

        set: function(x, y, col) {
            d.ctx.save();
            d.ctx.fillStyle = colorString(col);
            d.ctx.fillRect(x, y, 1, 1);
            d.ctx.restore();
        },

        image: function(img, x, y, width, height) {
            d.ctx.save();
            if(d.settings.imageMode == k.CENTER) d.ctx.translate(- width / 2, - height / 2);
            switch(arguments.length) {
                default:
                    Dark.error(new Error("image requires 3 to 5 parameters, not " + arguments.length));
                    break;
                case 3:
                    d.ctx.drawImage(img.canvas, x, y);
                    break;
                case 4:
                    d.ctx.drawImage(img.canvas, x, y, width, width);
                    break;
                case 5:
                    d.ctx.drawImage(img.canvas, x, y, width, height);
                    break;
            }
            d.ctx.restore();
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
        degrees: angle => angle * 180 / k.PI,
        radians: angle => angle * k.PI / 180,
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
        sin: ang => Math.sin(angle(ang)),
        cos: ang => Math.cos(angle(ang)),
        tan: ang => Math.tan(angle(ang)),
        csc: ang => 1 / Math.sin(angle(ang)),
        sec: ang => 1 / Math.cos(angle(ang)),
        cot: ang => 1 / Math.tan(angle(ang)),
        atan2: (dy, dx) => angleBack(Math.atan2(dy, dx)),
        asin: ang => Math.asin(angle(ang)),
        acos: ang => Math.acos(angle(ang)),
        atan: ang => Math.atan(angle(ang)),
        acsc: ang => Math.asin(1 / angle(ang)),
        asec: ang => Math.acos(1 / angle(ang)),
        acot: ang => Math.atan(1 / angle(ang)),
        sinh: ang => Math.sinh(angle(ang)),
        cosh: ang => Math.cosh(angle(ang)),
        tanh: ang => Math.tanh(angle(ang)),
        csch: ang => 1 / Math.sinh(angle(ang)),
        sech: ang => 1 / Math.cosh(angle(ang)),
        coth: ang => 1 / Math.tanh(angle(ang)),
        asinh: ang => Math.asinh(angle(ang)),
        acosh: ang => Math.acosh(angle(ang)),
        atanh: ang => Math.atanh(angle(ang)),
        acsch: ang => Math.asinh(1 / angle(ang)),
        asech: ang => Math.acosh(1 / angle(ang)),
        acoth: ang => Math.atanh(1 / angle(ang)),
        now: () => performance.now(),
        reciprocal: num => 1 / num

    });

    // Draw function (raf = request animation frame)
    d.raf = function(time) {
        const deltaFrame = time - lastFrame;
        const deltaTime = time - lastTime;
        if(d.isMain) {
            Dark.globallyUpdateVariables(d);
        }
        if(deltaFrame > d.settings.frameStep - deltaTime / 2 && d.settings.looping) {
            d.dt = dt = deltaFrame;
            d.fps = fps = 1000 / dt;
            d.frameCount = ++d.frameCount;
            d.draw();
            lastFrame = performance.now();
        }
        lastTime = performance.now();
        requestAnimationFrame(d.raf);
    };

    // Start draw function
    requestAnimationFrame(d.raf);

    // Set defaults
    d.frameRate(60);
    d.smooth();
    d.ellipseMode(k.CENTER);
    d.rectMode(k.CORNER);
    d.imageMode(k.CORNER);
    d.angleMode(k.DEGREES);
    d.strokeCap(k.FLAT);
    d.strokeJoin(k.MITER);
    d.fill(255);
    d.stroke(0);
    d.strokeWeight(1);
    d.textFont("12px Arial");

    // Load event listeners for document
    loadEvents();

    // Setup later options
    d.mouse = d.objects.DVector.zero2D();
    d.pmouse = d.objects.DVector.zero2D();
    d.settings.cursor = "auto";
    d.settings.looping = true;

};

// List of all instances
Dark.instances = [];

// Empty functions that can be changed by the user
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
    "SMOOTH": 6,
    "BEZIER": 7,
    "CLOSE": 8,
    "OPEN": 9,
    "CENTER": 10,
    "CORNER": 11,
    "BOLD": 12,
    "ITALIC": 13,
    "NORMAL": 14,
    "BEVEL": 15,
    "MITER": 16,
    "SQUARE": 17,
};

// Variables to be private
Dark.ignoreGlobal = [
    "empties",
    "raf",
    "vertices",
    "transforms",
    "settings",
    "isMain",
    "defaultCanvas",
    "canvas",
    "ctx"
];

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

// Maps the KeyEvent.button value to a string name that is usable
Dark.mouseMap = [
    "left",
    "middle",
    "right",
    "back",
    "forward"
];

// Constants, but not quite (can be edited)
Dark.errorCount = 0;
Dark.maxErrorCount = 50;
Dark.maxTransforms = 1000;

Dark.defaultContextSettings = {
    willReadFrequently: true
};

// Debugging
Dark.copy = function(e) {
    if(typeof e == "object" || typeof e == "function") {
        let obj = {};
        for(const key in e) {
            obj[key] = e[key];
        }
        if(typeof e == "function" && Object.keys(obj).length == 0) return e;
        return obj;
    } else {
        Dark.warn("\"" + e + "\" is not an object!");
        return e;
    }
};

Dark.format = function(obj) {
    let copied = Dark.copy(obj);
    if(typeof copied == "object" && (typeof obj == "object" || typeof obj == "function")) {
        return JSON.stringify(Dark.copy(obj), null, "    ");
    } else {
        return obj + "";
    }
};

Dark.doError = function(type, err) {
    if(Dark.errorCount == Dark.maxErrorCount) {
        console.warn("Too many warnings and errors have been made, the rest will not display.");
    } else if(Dark.errorCount < Dark.maxErrorCount) {
        console[type](err);
    }
    Dark.errorCount++;
};

Dark.warn = function(warning) {
    Dark.doError("warn", warning);
};

Dark.error = function(error) {
    Dark.doError("error", error);
};

Dark.colorParse = {
    red: color => (color >> 16) & 255,
    green: color => (color >> 8) & 255,
    blue: color => color & 255,
    alpha: color => (color >> 24) & 255
};

// Important function: sets the Dark object that has global access
Dark.setMain = function(dark) {
    if(dark instanceof Dark) {
        if(Dark.main) Dark.main.isMain = false;
        Dark.main = dark;
        dark.isMain = true;
    } else {
        Dark.error(dark + " is not an instance of Dark");
    }
};

Dark.getMain = function() {
    return Dark.main;
};

// Update variables to window for main instance
Dark.globallyUpdateVariables = function(m) {
    // Update empties so they can be defined
    Dark.empties.forEach(function(key) {
        if(window[key]) m[key] = window[key];
    });
    // Update global variables
    for(const mainKey in m) {
        // Skip if it should be ingored
        if(Dark.ignoreGlobal.includes(mainKey)) continue;
        if(Dark.empties.includes(mainKey)) continue;
        // Else set
        if(typeof m[mainKey] == "object") {
            for(const key in m[mainKey]) {
                window[key] = m[mainKey][key];
            }
        } else {
            window[mainKey] = m[mainKey];
        }
    }
};

Dark.objects = (function() {

    // Vectors
    let DVector = function(x, y, z) {
        if(arguments.length == 3) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.is2D = false;
        } else if(arguments.length == 2) {
            this.x = x;
            this.y = y;
            this.is2D = true;
        } else {
            Dark.error(new Error("DVector requires 2 or 3 parameters, not " + arguments.length));
        }
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
        if(this.is2D) {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        } else {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }
    };
    DVector.magSq = function(v) {
        return v.magSq();
    };
    DVector.prototype.magSq = function() {
        if(this.is2D) {
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
            if(v1.is2D) return v1.x * v2 + v1.y * v2;
            return v1.x * v2 + v1.y * v2 + v1.z * v2;
        } else {
            if(v1.is2D && v2.is2D) {
                return v1.x * v2.x + v1.y * v2.y;
            } else if(!v1.is2D && !v2.is2D) {
                return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
            } else {
                Dark.error(new Error("Cannot take the dot product of a 2D and 3D vector"));
            }
        }
    };
    DVector.prototype.dot = function(v) {
        return DVector.dot(this, v);
    };
    DVector.flip = function(v) {
        return new Vector(
            -v.x,
            -v.y,
            -v.z
        );
    };
    DVector.prototype.flip = function() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
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
            Dark.main.lerp(v1.x, v2.x, percent),
            Dark.main.lerp(v1.y, v2.y, percent),
            Dark.main.lerp(v1.z, v2.z, percent)
        );
    };
    DVector.prototype.lerp = function(v, percent) {
        return DVector.lerp(this, v, percent);
    };
    DVector.dist = function(v1, v2) {
        let dx, dy, dz = 0;
        if(v1.is2D && v2.is2D) {
            dx = v2.x - v1.x;
            dy = v2.y - v1.y;
        } else if(!v1.is2D && !v2.is2D) {
            dx = v2.x - v1.x;
            dy = v2.y - v1.y;
            dz = v2.z - v1.z;
        } else {
            Dark.error(new Error("Cannot find the distance between a 2D and 3D DVector"));
        }
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };
    DVector.prototype.dist = function(vector) {
        return DVector.dist(this, vector);
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
        if(this.is2D) {
            return [
                this.x,
                this.y
            ];
        } else {
            return [
                this.x,
                this.y,
                this.z
            ];
        }
    };
    DVector.prototype.toString = function() {
        if(this.is2D) return "[" + this.x + ", " + this.y + "]";
        return "[" + this.x + ", " + this.y + ", " + this.z + "]";
    };

    // Fonts
    let DFont = function(str) {
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
            if(s == "italic") {
                this.style = "italic";
            } else if(s == "small-caps") {
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

    // Images
    let DImage = function(imgData, source) {
        this.width = imgData.width;
        this.height = imgData.height;
        this.imageData = imgData;
        this.source = source;
        this.canvas = new OffscreenCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext("2d", Dark.defaultContextSettings);
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
    DImage.prototype.set = function(x, y, col) {
        let index = x + y * this.width;
        this.imageData.data[index] = Dark.colorParse.red(col);
        this.imageData.data[index + 1] = Dark.colorParse.green(col);
        this.imageData.data[index + 2] = Dark.colorParse.blue(col);
        this.imageData.data[index + 3] = Dark.colorParse.alpha(col);
    };
    DImage.prototype.copy = function() {
        return new DImage(
            this.imageData,
            this.source
        );
    };

    // Matrices
    let DMatrix = function(width, height, val = 0) {
        // https://stackoverflow.com/questions/53992415/how-to-fill-multidimensional-array-in-javascript

        if(width instanceof DMatrix) {
            this.width = width.width;
            this.height = width.height;
            this.mat = Array(this.height).fill(null).map(() => Array(this.width).fill(0));
            this.set(width);
        } else if(Array.isArray(width)) {
            if(Array.isArray(width[0])) {
                this.width = width[0].length;
                this.height = width.length;
            } else {
                this.width = height;
                this.height = val;
            }
            this.mat = Array(this.height).fill(null).map(() => Array(this.width).fill(0));
            this.set(width);
        } else {
            this.width = width;
            this.height = height;
            this.mat = Array(height).fill(null).map(() => Array(width).fill(val));
        }
    };
    DMatrix.prototype.get = function(x, y) {
        return this.mat[y][x];
    };
    DMatrix.set = function(matrix, x, y, val) {
        matrix.set(x, y, val);
    };
    DMatrix.prototype.set = function(x, y, val) {
        if(x instanceof DMatrix) {
            // DMatrix
            for(let yp = 0; yp < x.height; yp++) {
                for(let xp = 0; xp < x.width; xp++) {
                    this.mat[yp][xp] = x.mat[yp][xp];
                }
            }
        } else if(Array.isArray(x)) {
            if(Array.isArray(x[0])) {
                // 2D array
                for(let yp = 0; yp < x.length; yp++) {
                    for(let xp = 0; xp < x[0].length; xp++) {
                        this.mat[yp][xp] = x[yp][xp];
                    }
                }
            } else {
                // 1D array
                for(let i = 0; i < this.width * this.height; i++) {
                    let xp = i % this.width;
                    let yp = Math.floor(i / this.width);
                    this.mat[yp][xp] = x[i];
                }
            }
        } else {
            this.mat[y][x] = val;
        }
    };
    DMatrix.dot = function(mat1, mat2, row, col) {
        if(mat1.width == mat2.height) {
            let sum = 0;
            for(let i = 0; i < mat1.width; i++) { // Either mat1.width or mat2.height
                sum += mat1.get(i, row) * mat2.get(col, i);
            }
            return sum;
        } else {
            Dark.error(new Error("Can only take the dot product of two DMatrices  with equal width and height"));
        }
    };
    DMatrix.prototype.dot = function(matrix) {
        return DMatrix.dot(this, matrix);
    };
    DMatrix.identity = function(size) {
        let mat = new DMatrix(size, size);
        for(let i = 0; i < size; i++) {
            mat.set(i, i, 1);
        }
        return mat;
    };
    DMatrix.prototype.identity = function() {
        if(this.width == this.height) {
            this.mat = DMatrix.identity(this.width).mat; // this.width or this.height
        } else {
            Dark.error(new Error("Only DMatrices with square dimensions have identity DMatrices"));
        }
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
        this.set(DMatrix.add(this, matrix));
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
    DMatrix.prototype.sub = function(matrix) {
        this.set(DMatrix.sub(this, matrix));
    };
    DMatrix.mult = function(mat1, mat2) {
        if(mat1.width == mat2.height) {
            let mat = new DMatrix(mat2.width, mat1.height);
            for(let y = 0; y < mat.height; y++) {
                for(let x = 0; x < mat.width; x++) {
                    mat.set(x, y, DMatrix.dot(mat1, mat2, y, x));
                }
            }
            return mat;
        } else {
            Dark.error(new Error("Can only multiply two DMatrices with equal width and height"));
        }
    };
    DMatrix.prototype.mult = function(matrix) {
        let mat = DMatrix.mult(this, matrix);
        this.width = mat.width;
        this.height = mat.height;
        this.mat = mat.mat;
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

    return {
        DVector: DVector,
        DFont: DFont,
        DImage: DImage,
        DMatrix: DMatrix
    };

})();

Dark.setMain(new Dark()); // Default main
Dark.globallyUpdateVariables(Dark.main);

// Freeze objects
// Object.freeze(Dark);
