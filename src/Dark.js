"use strict"; // For ES6+ strict error mode

(win => {

    if(win.Dark) return;

    var Dark = function(dummy = false) {
        // Dark() = bad, new Dark() = good
        if(!(this instanceof Dark)) throw "Dark can only be called with the new operator"; 

        this.darkObject = true;

        // Shorter = faster typing time
        let d = this;
        let k = d.constants = Dark.constants;
        let o = d.objects = Dark.objects;
        let s = d.settings = {};

        // Private variables & functions
        let lastFrame = performance.now();
        let lastTime = performance.now();
        let lastHidden = -1;
        let lastScrollTime = null;
        let shapeInProgress = false;
        let frame = null;
        let screen = null;

        // Add to instances
        Dark.instances.push(d);

        // Keys
        let keys = {};
        d.keys = new Proxy(keys, {
            get: (target, prop) => target[prop] ?? false,
            set: () => {}
        });

        // Default values
        [d.width, d.height] = [innerWidth, innerHeight];
        [d.dt, d.frameCount, d.fps] = [0, 0, 60];
        d.mouseX = d.mouseY = d.pmouseX = d.pmouseY = 0;
        d.key = d.keyCode = d.mouseButton = undefined;
        d.mouseIsPressed = d.mouseIsInside = d.keyIsPressed = false;
        d.mouse = o.DVector.zero2D();
        d.pmouse = o.DVector.zero2D();
        d.imageData = new ImageData(innerWidth, innerHeight);

        d.info = {
            id: new o.DIdentification().id,
            initializationTime: performance.now(),
            version: Dark.version
        };

        d.transforms = [];
        d.saves = [];
        d.styles = [];
        d.vertices = [];
        d.vertexCache = [];
        d.imageCache = {};
        d.cachedImageCount = 0;
        d.successfullyCachedImageCount = 0;
        d.loaded = false;
        d.began = false;

        // Copy over
        d.clone = Dark.clone;
        d.format = Dark.format;
        d.noop = Dark.noop;

        // Random number generator
        d.randomGenerator = o.DRandom.create();

        // Is a dummy instance?
        d.dummy = dummy;
        d.isMain = false;

        // Create canvas
        d.canvas = new off(innerWidth, innerHeight);
        d.ctx = d.canvas.getContext("2d");

        // Add empties
        Dark.empties.forEach(emp => d[emp] = () => {});

        // Helper functions
        var bulkAdd = function(obj) {
            for(const key in obj) {
                Object.defineProperty(d, key, {
                    value: obj[key],
                    writable: false,
                    configurable: false,
                    enumerable: true
                });
            }
        };

        var angle = function(angle) {
            return d.snap((s.angleMode == k.DEGREES) ? angle * k.PI / 180 : angle, 0, k.TAU);
        };

        var angleBack = function(angle) {
            return d.snap((s.angleMode == k.DEGREES) ? angle * 180 / k.PI : angle, 0, 360);
        };

        var cacheVert = function(vert) {
            d.vertices.push(vert);
            vert.points.forEach(v => d.vertexCache.push(o.DVector.create(v.x, v.y)));
        };

        // Integer-only factorial, 100% accurate and faster
        var intFactorial = function(num) {
            if(num == 0) return 1;

            let total = num;
            while(--num > 1) {
                total *= num;
            }
            return total;
        };

        var loadDefault = function() {
            d.frameRate(60);
            d.smooth();
            d.loop();
            d.antialiasing(true);
            d.disableContextMenu();
            d.ellipseMode(k.CENTER);
            d.rectMode(k.CORNER);
            d.imageMode(k.CORNER);
            d.resizeMode(k.WIDTH);
            d.angleMode(k.DEGREES);
            d.strokeCap(k.ROUND);
            d.strokeJoin(k.MITER);
            d.textAlign(k.LEFT, k.BASELINE);
            d.curveTightness(2);
            d.fill(255);
            d.stroke(0);
            d.strokeWeight(1);
            d.textFont("12px Arial");
            d.textLeading(5);
            d.preventDefault(k.KEY);
            d.allowDefault(k.CLICK);
            d.preventDefault(k.SCROLL);
        };

        var loadStyle = function(style) {
            for(const key in d.ctx) {
                const value = style.ctx[key];
                if(key != "canvas" && typeof value != "function") {
                    try {d.ctx[key] = value;} catch {}; // For read-only's in Safari
                }
            }
            for(const key in s) {
                s[key] = style.settings[key];
            }
        };

        var loadEvents = function() {

            document.addEventListener("keydown", function(e) {
                if(Dark.focus.target === d.canvas) {
                    if(s.keyEvents) e.preventDefault();
                    d.keyIsPressed = true;
                    d.key = (Dark.special[e.keyCode] ?? e.key).toLowerCase();
                    d.keyCode = e.keyCode;
                    if(/\w/.test(String.fromCharCode(e.keyCode))) d.keyTyped();
                    keys[d.key] = true;
                    Dark.globallyUpdateVariables(d);
                    d.keyPressed();
                }
            });

            document.addEventListener("keyup", function(e) {
                if(Dark.focus.target === d.canvas) {
                    if(s.keyEvents) e.preventDefault();
                    d.key = (Dark.special[e.keyCode] ?? e.key).toLowerCase();
                    d.keyCode = e.keyCode;
                    keys[d.key] = false;
                    d.keyIsPressed = false;
                    Dark.globallyUpdateVariables(d);
                    d.keyReleased();
                    d.key = undefined;
                    d.keyCode = undefined;
                    Dark.globallyUpdateVariables(d);
                }
            });

            addEventListener("resize", function() {
                Dark.globallyUpdateVariables(d);
                d.pageResized();
            });

            document.addEventListener("visibilitychange", function() {
                if(document.visibilityState == "hidden") {
                    // Reset
                    d.keyIsPressed = false;
                    d.key = undefined;
                    d.keyCode = undefined;
                    d.mouseIsPressed = false;
                    d.mouseButton = undefined;
                    d.mouseIsInside = false;

                    lastHidden = performance.now();
                }
            });

        };

        var reloadEvents = function() {

            d.canvas.addEventListener("click", function(e) {
                if(s.clickEvents) e.preventDefault();
                Dark.globallyUpdateVariables(d);
                d.mouseClicked();
            });

            d.canvas.addEventListener("mousedown", function(e) {
                if(s.clickEvents) e.preventDefault();
                d.mouseIsPressed = true;
                d.mouseButton = Dark.mouseMap[e.button];
                Dark.globallyUpdateVariables(d);
                d.mousePressed();
            });

            d.canvas.addEventListener("mouseup", function(e) {
                if(s.clickEvents) e.preventDefault();
                d.mouseButton = undefined;
                d.mouseIsPressed = false;
                Dark.globallyUpdateVariables(d);
                d.mouseReleased();
            });

            d.canvas.addEventListener("mouseenter", function() {
                d.mouseIsInside = true;
                Dark.globallyUpdateVariables(d);
                d.mouseIn();
            });

            d.canvas.addEventListener("mouseleave", function() {
                d.mouseIsInside = false;
                Dark.globallyUpdateVariables(d);
                d.mouseOut();
            });

            d.canvas.addEventListener("mousemove", function(e) {
                // https://stackoverflow.com/questions/3234256/find-mouse-position-relative-to-element
                let boundingBox = e.target.getBoundingClientRect();
                d.pmouseX = d.pmouse.x = d.mouseX;
                d.pmouseY = d.pmouse.y = d.mouseY;
                d.mouseX = d.mouse.x = d.constrain(d.round(e.pageX - boundingBox.x), 0, d.width);
                d.mouseY = d.mouse.y = d.constrain(d.round(e.pageY - boundingBox.y), 0, d.height);
                Dark.globallyUpdateVariables(d);
                d.mouseMoved();

                if(d.mouseIsPressed) d.mouseDragged();
            });

            d.canvas.addEventListener("wheel", function(e) {
                if(s.scrollEvents) e.preventDefault();
                lastScrollTime = performance.now();
                d.mouseScroll = o.DVector.create(e.deltaX, e.deltaY, e.deltaZ);
                Dark.globallyUpdateVariables(d);
                d.mouseScrolled();
            });

            d.canvas.addEventListener("dblclick", function(e) {
                if(s.clickEvents) e.preventDefault();
                Dark.globallyUpdateVariables(d);
                d.mouseDoubleClicked();
            });

        };

        var colorString = function(c) {
            return `rgba(${d.red(c)}, ${d.green(c)}, ${d.blue(c)}, ${d.alpha(c) / 255})`;
        };

        bulkAdd({

            // Setup functions & getters
            size: function(w = innerWidth, h = innerHeight) {
                if(typeof w == "number" && typeof h == "number" && w > 0 && h > 0) {
                    // Because for some reason changing width & height reset all parameters >:(
                    // It took me ~8 hours to figure this out. D:<
                    let old = d.clone(d.ctx);

                    [d.width, d.height] = [d.canvas.width, d.canvas.height] = [w, h];

                    screen = new o.DImage(d.width, d.height, d);

                    for(const key in d.ctx) {
                        const value = old[key];
                        if(typeof value !== "function" && !Dark.styleIgnore.includes(key)) {
                            try {d.ctx[key] = value;} catch {};
                        }
                    }
                    Dark.globallyUpdateVariables(d);
                }
            },

            setCanvas: function(canvas) {
                if(canvas instanceof HTMLCanvasElement) {
                    d.canvas = canvas;
                    d.width = canvas.width;
                    d.height = canvas.height;

                    let old = d.clone(d.ctx);
                    d.ctx = canvas.getContext("2d");

                    loadStyle({
                        ctx: old,
                        settings: {...s}
                    });

                    d.canvas.style.cursor = s.cursor;
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

            exit: function() {
                // Set main to default if main
                if(d.isMain) Dark.setMain(Dark.default);

                // Stop draw function
                cancelAnimationFrame(frame);

                // Remove from instances array
                Dark.instances.splice(Dark.instances.indexOf(d), 1);
            },

            setTitle: function(title) {
                document.title = title;
            },

            disableKhanImagePreload: function() {
                Dark.changeable.khanImagePreload = false;
            },

            createGraphics: function(width, height, dummy) {
                let graphics = new Dark(dummy);
                graphics.size(width, height);
                return graphics;
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
                    dy = args[4] - args[1];
                    dz = args[5] - args[2];
                } else {
                    Dark.error("dist requires 4 or 6 parameters, not " + args.length);
                }
                return d.sqrt(dx * dx + dy * dy + dz * dz);
            },

            intersect: function(x1, y1, x2, y2, x3, y3, x4, y4) {
                if(x1 == x3 && y1 == y3) return true;
                if(x2 == x4 && y2 == y4) return true;

                let m1 = (y2 - y1) / (x2 - x1);
                let m2 = (y4 - y3) / (x4 - x3);
                if(m1 == m2) return false;

                let b1 = y1 - m1 * x1;
                let b2 = y3 - m2 * x3;

                let [left1, right1] = (x1 < x2) ? [x1, x2] : [x2, x1];
                let [left2, right2] = (x3 < x4) ? [x3, x4] : [x4, x3];

                let intersection = (b2 - b1) / (m1 - m2);

                if(left1 < intersection && intersection < right1 && intersection < left2 && intersection < right2) {
                    return true;
                } else {
                    return false;
                }
            },

            gamma: function(z) {
                // Stirling's Approximation
                return d.sqrt(k.TAU / z) * (((z + 1 / (12 * z + 1 / (10 * z))) / E) ** z);
            },

            // Not very accurate, pretty good up to the hundreths
            factorial: function(num) {
                return Number.isInteger(num) ? intFactorial(num) : gamma(num + 1);
            },

            choose: function(n, k) {
                return intFactorial(n) / (intFactorial(n - k) * intFactorial(k));
            },

            repeat: function(count, callback) {
                for(let i = 0; i < count; i++) callback(i);
            },

            random: function(...args) {
                switch(args.length) {
                    default:
                        return d.randomGenerator.next() * (args[1] - args[0]) + args[0];
                    case 0:
                        return d.randomGenerator.next();
                    case 1:
                        return d.randomGenerator.next() * args[0];
                }
            },

            randomSeed: function(seed) {
                if(seed != d.randomGenerator.seed) d.randomGenerator = o.DRandom.create(seed);
            },

            cursor: function(type = "default") {
                s.cursor = type;
                d.canvas.style.cursor = type;
            },

            noCursor: function() {
                s.cursor = "none";
                d.canvas.style.cursor = "none";
            },

            loop: function() {
                s.looping = true;
            },

            noLoop: function() {
                s.looping = false;
            },

            frameRate: function(desiredFPS) {
                s.frameStep = 1000 / desiredFPS;
            },

            enableContextMenu: function() {
                s.contextMenu = true;
                d.canvas.oncontextmenu = true;
            },

            disableContextMenu: function() {
                s.contextMenu = false;
                d.canvas.oncontextmenu = false;
            },

            fullscreen: function() {
                d.canvas.requestFullscreen();
            },

            // Color
            color: function(r, g, b, a) {
                if(d.isArray(r)) return color.apply(null, [...r]);

                let l = arguments.length;
                if(l == 0) return -1;
                if(l == 1 || l == 2) {
                    if(r <= 255 && r >= 0) {
                        if(l == 1) {
                            b = g = r;
                        } else {
                            a = g, g = r, b = r;
                        }
                    } else {
                        if(l == 2) return (r & k.ALPHA_MASK) | (g << 24)
                        return r;
                    }
                }
                a ??= 255;
                r = d.constrain(r, 0, 255);
                g = d.constrain(g, 0, 255);
                b = d.constrain(b, 0, 255);
                a = d.constrain(a, 0, 255);
                return (a << 24) + (r << 16) + (g << 8) + (b);
            },

            randomColor: function() {
                return color(d.randomGenerator.next() * 255, d.randomGenerator.next() * 255, d.randomGenerator.next() * 255);
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
                let c = s.fill = d.color.apply(null, args);
                d.ctx.fillStyle = colorString(c);
            },

            noFill: function() {
                s.fill = 0;
                d.ctx.fillStyle = "rgba(0, 0, 0, 0)";
            },

            stroke: function(...args) {
                // Same as fill
                let c = s.stroke = d.color.apply(null, args);
                d.ctx.strokeStyle = colorString(c);
            },

            noStroke: function() {
                s.stroke = 0;
                d.ctx.strokeStyle = "rgba(0, 0, 0, 0)";
            },

            background: function(...args) {
                d.ctx.save();
                d.ctx.resetTransform();
                let c = d.color.apply(null, args);
                d.ctx.fillStyle = colorString(c);
                d.ctx.clearRect(0, 0, d.width, d.height);
                d.ctx.fillRect(0, 0, d.width, d.height);
                d.ctx.restore();
            },

            clear: function() {
                d.ctx.save();
                d.ctx.resetTransform();
                d.ctx.clearRect(0, 0, d.width, d.height);
                d.ctx.restore();
            },

            // Drawing modes
            strokeCap: function(mode) {
                switch(mode) {
                    default:
                        Dark.error("Invalid strokeCap type");
                        break;
                    case k.FLAT:
                        d.ctx.lineCap = "butt";
                        s.strokeCap = k.FLAT;
                        break;
                    case k.ROUND:
                        d.ctx.lineCap = "round";
                        s.strokeCap = k.ROUND;
                        break;
                    case k.SQUARE:
                        d.ctx.lineCap = "square";
                        s.strokeCap = k.SQUARE;
                }
            },

            strokeJoin: function(mode = k.MITER) {
                switch(mode) {
                    default:
                        Dark.error("Invalid strokeJoin type");
                        break;
                    case k.MITER:
                        d.ctx.lineJoin = "miter";
                        s.strokeJoin = k.MITER;
                        break;
                    case k.BEVEL:
                        d.ctx.lineJoin = "bevel";
                        s.strokeJoin = k.BEVEL;
                        break;
                    case k.ROUND:
                        d.ctx.lineJoin = "round";
                        s.strokeJoin = k.ROUND;
                        break;
                }
            },

            strokeWeight: function(weight) {
                if(!s.smoothing) weight = d.round(weight);
                s.strokeWeight = weight;
                d.ctx.lineWidth = weight;
            },

            smooth: function() {
                s.smoothing = true;
                d.ctx.imageSmoothingQuality = "high";
            },

            noSmooth: function() {
                s.smoothing = true;
                d.ctx.imageSmoothingEnabled = false;
                d.ctx.imageSmoothingQuality = "low";
            },

            antialiasing: function(state) {
                if(typeof state == "boolean") {
                    d.ctx.mozImageSmoothingEnabled = state;
                    d.ctx.webkitImageSmoothingEnabled = state;
                    d.ctx.msImageSmoothingEnabled = state;
                    d.ctx.imageSmoothingEnabled = state;
                } else {
                    Dark.error("Antialiasing mode must be of boolean value");
                }
            },

            preventDefault: function(listener) {
                if(arguments.length == 0) Dark.error("No listener type given");
                switch(listener) {
                    default:
                        Dark.error("Invalid listener given");
                        break;
                    case k.KEY:
                        s.keyEvents = true;
                        break;
                    case k.CLICK:
                        s.clickEvents = true;
                        break;
                    case k.SCROLL:
                        s.scrollEvents = true;
                        break;
                }
            },

            allowDefault: function(listener) {
                if(arguments.length == 0) Dark.error("No listener type given");
                switch(listener) {
                    default:
                        Dark.error("Invalid listener given");
                        break;
                    case k.KEY:
                        s.keyEvents = false;
                        break;
                    case k.CLICK:
                        s.clickEvents = false;
                        break;
                    case k.SCROLL:
                        s.scrollEvents = false;
                        break;
                }
            },

            angleMode: function(mode) {
                switch(mode) {
                    default:
                        Dark.error("Invalid angleMode");
                        break;
                    case k.DEGREES:
                        s.angleMode = k.DEGREES;
                        break;
                    case k.RADIANS:
                        s.angleMode = k.RADIANS;
                        break;
                }
            },

            ellipseMode: function(mode = k.CENTER) {
                switch(mode) {
                    default:
                        Dark.error("Invalid ellipseMode");
                        break;
                    case k.CENTER:
                        s.ellipseMode = k.CENTER;
                        break;
                    case k.CORNER:
                        s.ellipseMode = k.CORNER;
                        break;
                    case k.RADIUS:
                        s.ellipseMode = k.RADIUS;
                        break;
                }
            },

            rectMode: function(mode = k.CORNER) {
                switch(mode) {
                    default:
                        Dark.error("Invalid rectMode");
                        break;
                    case k.CORNER:
                        s.rectMode = k.CORNER;
                        break;
                    case k.CENTER:
                        s.rectMode = k.CENTER;
                        break;
                }
            },

            imageMode: function(mode = k.CORNER) {
                switch(mode) {
                    default:
                        Dark.error("Invalid imageMode");
                        break;
                    case k.CORNER:
                        s.imageMode = k.CORNER;
                        break;
                    case k.CENTER:
                        s.imageMode = k.CENTER;
                        break;
                }
            },

            resizeMode: function(mode = k.WIDTH) {
                switch(mode) {
                    default:
                        Dark.error("Invalid resizeMode");
                        break;
                    case k.WIDTH:
                        s.resizeMode = k.WIDTH;
                        break;
                    case k.HEIGHT:
                        s.resizeMode = k.HEIGHT;
                        break;
                }
            },

            curveTightness: function(tightness = 0) {
                s.curveTightness = tightness;
                s.curveMatrixTightness = (tightness - 1) / 6;
            },

            // Transformations
            pushMatrix: function() {
                if(d.transforms.length > d.maxStackSize) {
                    Dark.error(`Maximum matrix stack size reached, pushMatrix() called ${d.maxStackSize} times.`);
                } else {
                    d.transforms.push(d.ctx.getTransform());
                }
            },

            popMatrix: function() {
                let transform = d.transforms.pop();
                if(!transform) {
                    Dark.error("No more transforms to restore in popMatrix()");
                } else {
                    d.ctx.setTransform(transform);
                }
            },

            resetMatrix: function() {
                d.transforms.length = 0;
                d.ctx.resetTransform();
            },

            getDOMMatrix: function() {
                return d.ctx.getTransform();
            },

            /*
    
            Note:
    
            scaleX skewX 0 translateX
            skewY scaleY 0 translateY
            0 0 1 0
            0 0 0 1
    
            */
            getMatrix: function() {
                return o.DMatrix.fromDOMMatrix(d.ctx.getTransform());
            },

            setMatrix: function(matrix) {
                d.ctx.setTransform(new o.DMatrix(matrix.toDOMMatrix()));
            },

            printMatrix: function() {
                console.log(d.getMatrix().toString());
            },

            pushStyle: function() {
                if(d.styles.length > d.maxStackSize) {
                    Dark.error(`Maximum style stack size reached, pushStyle() called ${d.maxStackSize} times.`);
                } else {
                    d.styles.push({
                        ctx: d.clone(d.ctx),
                        settings: d.clone(s)
                    });
                }
            },

            popStyle: function() {
                let style = d.styles.pop();
                if(!style) {
                    Dark.error("No more styles to restore in popStyle()");
                } else {
                    loadStyle(style);
                }
            },

            resetStyle: function() {
                d.styles.length = 0;
                loadDefault();
            },

            push: function() {
                if(d.transforms.length > d.maxStackSize) {
                    Dark.error(`Maximum stack size reached, push() called ${d.maxStackSize} times.`);
                } else {
                    d.ctx.save();
                    d.saves.push(Object.assign({}, s));
                }
            },

            pop: function() {
                let save = d.saves.pop();
                if(!save) {
                    Dark.error("No more saves to restore in pop()");
                } else {
                    d.ctx.restore();
                    Object.assign(s, save);
                }
            },

            reset: function() {
                d.saves.length = 0;
                s = {...d.defaultSettings};
                d.setCanvas(d.canvas);
            },

            translate: function(x, y) {
                d.ctx.translate(x, y);
            },

            rotate: function(ang) {
                d.ctx.rotate(angle(ang));
            },

            scale: function(w, h = w) {
                d.ctx.scale(w, h);
            },

            skew: function(h, v = 0) {
                let transform = d.ctx.getTransform();
                transform.skewYSelf(h * 0.01);
                transform.skewXSelf(v * 0.01);
                d.ctx.setTransform(transform);
            },

            // Shapes
            rect: function(x, y, width, height, r1, r2, r3, r4) {
                if(!s.smoothing) [x, y, width, height] = [d.round(x), d.round(y), d.round(width), d.round(height)];
                [width, height] = [d.abs(width), d.abs(height)];

                d.ctx.beginPath();
                d.ctx.save();
                if(s.rectMode == k.CENTER) d.ctx.translate(- width / 2, - height / 2);
                // For speed, rounded rect is so much slower
                switch(arguments.length) {
                    default:
                        Dark.error("rect takes in 4, 5 or 8 parameters, not " + arguments.length);
                        break;
                    case 4:
                        d.ctx.rect(x, y, width, height);
                        break;
                    case 5:
                        d.ctx.roundRect(x, y, width, height, r1);
                        break;
                    case 8:
                        d.ctx.roundRect(x, y, width, height, [r1, r2, r3, r4]);
                        break;
                }
                d.ctx.fill();
                d.ctx.stroke();
                d.ctx.restore();
            },

            ellipse: function(x, y, width, height) {
                if(s.ellipseMode == k.RADIUS) width /= 2, height /= 2;

                if(!s.smoothing) [x, y, width, height] = [d.round(x), d.round(y), d.round(width), d.round(height)];
                [width, height] = [d.abs(width), d.abs(height)];

                d.ctx.beginPath();
                d.ctx.save();
                if(s.ellipseMode == k.CORNER) d.ctx.translate(width / 2, height / 2);
                d.ctx.beginPath();
                d.ctx.ellipse(x, y, width / 2, height / 2, 0, 0, k.TAU, false);
                d.ctx.fill();
                d.ctx.stroke();
                d.ctx.restore();
            },

            arc: function(x, y, width, height, start, stop) {
                if(s.ellipseMode == k.RADIUS) width /= 2, height /= 2;

                if(!s.smoothing) [x, y, width, height] = [d.round(x), d.round(y), d.round(width), d.round(height)];

                d.ctx.save();
                if(s.ellipseMode == k.CORNER) d.ctx.translate(width / 2, height / 2);
                d.ctx.beginPath();
                d.ctx.moveTo(x, y);
                d.ctx.ellipse(x, y, width / 2, height / 2, 0, angle(start), angle(stop), false);
                d.ctx.fill();
                d.ctx.beginPath();
                d.ctx.ellipse(x, y, width / 2, height / 2, 0, angle(start), angle(stop), false);
                d.ctx.stroke();
                d.ctx.restore();
            },

            line: function(x1, y1, x2, y2) {
                if(!s.smoothing) [x1, y1, x2, y2] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2)];

                d.ctx.beginPath();
                d.ctx.moveTo(x1, y1);
                d.ctx.lineTo(x2, y2);
                d.ctx.stroke();
            },

            point: function(x, y) {
                if(!s.smoothing) x = d.round(x), y = d.round(y);

                d.ctx.save();
                d.ctx.beginPath();
                d.ctx.fillStyle = colorString(s.stroke);
                d.ctx.arc(x, y, s.strokeWeight / 2, 0, k.TAU);
                d.ctx.fill();
                d.ctx.restore();
            },

            circle: function(x, y, radius) {
                if(!s.smoothing) [x, y, radius] = [d.round(x), d.round(y), d.round(radius)];
                radius = d.round(radius);

                d.ctx.save();
                if(s.ellipseMode == k.CORNER) d.ctx.translate(radius, radius);
                d.ctx.beginPath();
                d.ctx.arc(x, y, radius, 0, k.TAU);
                d.ctx.fill();
                d.ctx.stroke();
                d.ctx.restore();
            },

            square: function(...args) {
                args.splice(3, 0, args[2]); // side is index 2
                rect.apply(null, args);
            },

            triangle: function(x1, y1, x2, y2, x3, y3) {
                if(!s.smoothing) [x1, y1, x2, y2, x3, y3] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2), d.round(x3), d.round(y3)];

                d.ctx.beginPath();
                d.ctx.moveTo(x1, y1);
                d.ctx.lineTo(x2, y2);
                d.ctx.lineTo(x3, y3);
                d.ctx.closePath();
                d.ctx.fill();
                d.ctx.stroke();
            },

            quad: function(x1, y1, x2, y2, x3, y3, x4, y4) {
                if(!s.smoothing) [x1, y1, x2, y2, x3, y3, x4, y4] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2), d.round(x3), d.round(y3), d.round(x4), d.round(y4)];

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
                if(shapeInProgress) {
                    Dark.error("Cannot begin a new shape before the previous shape has ended");
                } else {
                    // faster than = []
                    d.vertices.length = 0;
                    d.vertexCache.length = 0;
                    shapeInProgress = true;
                }
            },

            // https://www.cs.umd.edu/~reastman/slides/L19P01ParametricCurves.pdf
            endShape: function(type = k.OPEN) {
                if(d.vertices.length < 2 || d.vertices[0].type == k.BEZIER) return;
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
                                let t = s.curveMatrixTightness;

                                let p0 = d.vertexCache[index - 3];
                                let p1 = d.vertexCache[index - 2];
                                let p2 = d.vertexCache[index - 1];
                                let p3 = d.vertexCache[index];

                                if(index == 2) break; // temp fix

                                if(index == 0) {
                                    d.ctx.moveTo(p3.x, p3.y);
                                } else if(index < 3) {
                                    d.ctx.lineTo(p3.x, p3.y);
                                } else {
                                    if(index == 3) d.ctx.lineTo(p1.x, p1.y);

                                    // See http://jsfiddle.net/soulwire/FsEVR/
                                    d.ctx.bezierCurveTo(
                                        p2.x * t + p1.x - p0.x * t,
                                        p2.y * t + p1.y - p0.y * t,
                                        p3.x * -t + p2.x + p1.x * t,
                                        p3.y * -t + p2.y + p1.y * t,
                                        p2.x,
                                        p2.y
                                    );
                                }
                                break;
                            case k.BEZIER:
                                let pts = vert.points;
                                d.ctx.bezierCurveTo(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
                                break;
                        }
                    }
                });
                if(type == k.CLOSE) d.ctx.closePath();
                d.ctx.fill();
                d.ctx.stroke();
                shapeInProgress = false;
            },

            // Kinda copied from ski, though slightly different (curveVertex)
            vertex: function(x, y) {
                if(!s.smoothing) [x, y] = [d.round(x), d.round(y)];

                let vert = {
                    type: k.VERTEX,
                    points: [
                        {
                            x: x,
                            y: y
                        }
                    ]
                };

                cacheVert(vert);
            },

            curveVertex: function(cx, cy) {
                if(!s.smoothing) [x, y] = [d.round(cx), d.round(cy)];

                let vert = {
                    type: k.CURVE,
                    points: [
                        {
                            x: cx,
                            y: cy
                        }
                    ]
                };

                cacheVert(vert);
            },

            bezierVertex: function(x1, y1, x2, y2, x3, y3) {
                if(!s.smoothing) [x1, y1, x2, y2, x3, y3] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2), d.round(x3), d.round(y3)];

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

                cacheVert(vert);
            },

            bezier: function(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
                beginShape();
                vertex(x1, y1);
                bezierVertex(cx1, cy1, cx2, cy2, x2, y2);
                endShape();
            },

            curve: function(x1, y1, x2, y2, x3, y3, x4, y4) {
                beginShape();
                vertex(x1, y1);
                vertex(x2, y2);
                vertex(x3, y3);
                curveVertex(x4, y4);
                endShape();
            },

            // https://en.wikipedia.org/wiki/B%C3%A9zier_curve
            bezierPoint: function(a, b, c, d, t) {
                let i = 1 - t;
                return i * i * i * a + 3 * i * i * t * b + 3 * i * t * t * c + t * t * t * d;
            },

            // https://www.mvps.org/directx/articles/catmull/
            curvePoint: function(a, b, c, d, t) {
                return 0.5 * ((2 * b) + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - 3 * c + d - a) * t * t * t);
            },

            curveTangent: function(a, b, c, d, t) {
                return 0.5 * ((c - a) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (3 * b - 3 * c + d - a) * t * t);
            },

            bezierTangent: function(a, b, c, d, t) {
                let i = 1 - t;
                return 3 * i * i * (b - a) + 6 * i * t * (c - b) + 3 * t * t * (d - c);
            },

            reloadFont: function() {
                d.ctx.font = s.font.toString();
                s.genericTextMeasure = d.ctx.measureText("0");
                s.textHeight = s.genericTextMeasure.fontBoundingBoxAscent + s.genericTextMeasure.fontBoundingBoxDescent;
            },

            // Text
            textSize: function(size) {
                if(!s.smoothing) size = d.round(size);

                s.textSize = size;
                s.font.size = size;
                d.reloadFont();
            },

            textAlign: function(alignX, alignY) {
                if(arguments.length == 0) alignX = k.LEFT, alignY = k.BASELINE;
                if(arguments.length == 1 && alignX == k.CENTER) alignY = k.CENTER;
                switch(alignX) {
                    default:
                        Dark.error("Invalid x alignment type");
                        break;
                    case k.LEFT:
                        d.ctx.textAlign = "left";
                        s.alignX = k.LEFT;
                        break;
                    case k.RIGHT:
                        d.ctx.textAlign = "right";
                        s.alignX = k.RIGHT;
                        break;
                    case k.CENTER:
                        d.ctx.textAlign = "center";
                        s.alignX = k.CENTER;
                        break;
                }
                switch(alignY) {
                    default:
                        Dark.error("Invalid y alignment type");
                        break;
                    case k.BASELINE:
                        d.ctx.textBaseline = "alphabetic";
                        s.alignY = k.BASELINE;
                        break;
                    case k.TOP:
                        d.ctx.textBaseline = "top";
                        s.alignY = k.TOP;
                        break;
                    case k.BOTTOM:
                        d.ctx.textBaseline = "bottom";
                        s.alignY = k.BOTTOM;
                        break;
                    case k.CENTER:
                        d.ctx.textBaseline = "middle";
                        s.alignY = k.CENTER;
                        break;
                }
            },

            textFont: function(font) {
                if(typeof font == "string") {
                    font = new o.DFont(font);
                }
                if(font instanceof o.DFont) {
                    s.font = font;
                    s.textSize = font.size;
                    d.reloadFont();
                } else {
                    Dark.error(`${font} is not a DFont.`);
                }
            },

            createFont: function(txt) {
                return o.DFont.parse(txt);
            },

            textStyle: function(style) {
                switch(style) {
                    default:
                        s.font.weight = "normal";
                        s.font.style = "normal";
                        break;
                    case k.BOLD:
                        s.font.weight = "bold";
                        break;
                    case k.ITALIC:
                        s.font.style = "italic";
                        break;
                }
                d.reloadFont();
            },

            textWidth: function(text) {
                return d.ctx.measureText(text).width;
            },

            textAscent: function() {
                return s.genericTextMeasure.fontBoundingBoxAscent;
            },

            textDescent: function() {
                return s.genericTextMeasure.fontBoundingBoxDescent;
            },

            textLeading: function(amount) {
                s.lineGap = amount;
            },

            text: function(text, x, y, width = Infinity, height = Infinity) {
                if(!s.smoothing) [x, y] = [d.round(x), d.round(y)];

                let lines = [];
                let words = text.replaceAll("\n", " \n ").split(" ");
                let w = 0;
                let curLine = "";
                let space = d.ctx.measureText(" ").width;
                words.every(word => {
                    if(word == "\n") { // Go to next if it's a new line
                        lines.push(curLine);
                        w = 0;
                        curLine = "";
                        return true;
                    }

                    let wordWidth = d.ctx.measureText(word).width;
                    if(wordWidth > width) { // If the word is too long to be put on the next line
                        let letters = word.split("");
                        let lw = w;
                        let splitPoints = [0]; // Beginning
                        letters.forEach((letter, index) => {
                            let letterWidth = d.ctx.measureText(letter).width;
                            lw += letterWidth;
                            if(lw > width) { // Cut off
                                splitPoints.push(index);
                                lw = letterWidth;
                            }
                        });
                        splitPoints.push(word.length); // End

                        let splitWord = [];
                        for(let i = 1; i < splitPoints.length; i++) {
                            splitWord.push(word.substring(splitPoints[i - 1], splitPoints[i]));
                        }
                        // Remove last section and send it to the final line
                        curLine = splitWord.pop() + " ";
                        w = d.ctx.measureText(curLine).width;
                        splitWord.forEach(part => lines.push(part));

                        return true;
                    }
                    w += wordWidth;
                    if(w > width) { // Send to next line if too long
                        lines.push(curLine.slice(0, -1));
                        curLine = "";
                        w = wordWidth;
                    }
                    curLine += word + " ";
                    w += space;
                    return true;
                });
                lines.push(curLine);

                // If it's waaaay to small, it will cause an empty first line, so remove it here
                if(lines[0].length == 0) lines.shift();

                let off = 0;
                switch(s.alignY) {
                    case k.CENTER:
                        off = (s.textHeight + s.lineGap) / 2 * (lines.length - 1);
                        break;
                    case k.BOTTOM:
                        off = (s.textHeight + s.lineGap) * (lines.length - 1);
                        break;
                }

                let h = 0;
                lines.every(line => { // for 'break' statements
                    if(h + s.textHeight > height) return false; // 'break'
                    let inc = h - off;
                    d.ctx.fillText(line, x, y + inc);
                    d.ctx.strokeText(line, x, y + inc);
                    h += s.textHeight + s.lineGap;
                    return true;
                });
            },

            // Images
            get: function(...args) {
                switch(args.length) {
                    default:
                        return Dark.error("get requires 0 or 4 parameters, not " + args.length);
                    case 0:
                        return new o.DImage(d.canvas, d);
                    case 2:
                        return d.color(d.ctx.getImageData(args[0], args[1], 1, 1).data);
                    case 3:
                        if(s.resizeMode == k.HEIGHT) {
                            return d.get(args[0], args[1], args[2] / d.height * d.width, args[2]);
                        } else {
                            return d.get(args[0], args[1], args[2], args[2] / d.width * d.height);
                        }
                    case 4:
                        return new o.DImage(d.ctx.getImageData(args[0], args[1], args[2], args[3]), d);
                }
            },

            set: function(x, y, ...args) {
                d.ctx.save();
                d.ctx.fillStyle = colorString(d.color.apply(null, args)); // Slightly faster than d.color(...args)
                d.ctx.fillRect(x, y, 1, 1);
                d.ctx.restore();
            },

            loadPixels: function() {
                d.imageData = d.ctx.getImageData(0, 0, d.width, d.height);
            },

            updatePixels: function() {
                d.ctx.putImageData(d.imageData, 0, 0, d.width, d.height);
            },

            image: function(img, x, y, width, height) {
                img.checkLoad();

                [width, height] = [d.abs(width), d.abs(height)];
                d.ctx.save();
                if(img instanceof ImageData) img = new o.DImage(img, d);
                if(img instanceof Dark) img = new o.DImage(img.canvas, img).copy();
                let w, h;
                switch(arguments.length) {
                    default:
                        d.ctx.restore();
                        return Dark.error("image requires 1, 3, 4 or 5 parameters, not " + arguments.length);
                    case 1:
                        [x, y, w, h] = [0, 0, d.width, d.height];
                        break;
                    case 3:
                        [w, h] = [img.width, img.height];
                        break;
                    case 4:
                        if(s.resizeMode == k.HEIGHT) {
                            [w, h] = [width / img.height * img.width, width];
                        } else {
                            [w, h] = [width, width / img.width * img.height];
                        }
                        break;
                    case 5:
                        [w, h] = [width, height];
                        break;
                }
                if(s.imageMode == k.CENTER) d.ctx.translate(- w / 2, - h / 2);
                if(!s.smoothing) [x, y, width, height] = [d.round(x), d.round(y), d.round(width), d.round(height)];
                d.ctx.drawImage(img.getRenderable(), 0, 0, img.width, img.height, x, y, w, h);
                d.ctx.restore();
            },

            loadImage: function(url) {
                if(Object.keys(d.imageCache).includes(url) && d.began) return d.imageCache[url];

                d.imageCache[url] = null;
                d.cachedImageCount++;

                let result = new o.DImage(1, 1, d);
                result.loadComplete = false;
                result.loadedFromSource = true;
                result.sent = true;

                if(Dark.khan) {
                    result.image = new Image();
                    result.image.src = url;
                    result.image.crossOrigin = "anonymous";
                    result.image.onload = () => {
                        d.imageCache[url] = result;
                        d.successfullyCachedImageCount++;

                        [result.canvas.width, result.canvas.height] = [result.width, result.height] = [result.image.width, result.image.height];
                        result.imageData = new ImageData(result.width, result.height);
                        result.ctx.drawImage(result.image, 0, 0, result.width, result.height, 0, 0, result.width, result.height);
                        result.updatePixels();

                        result.sourceURL = url;
                        result.loadComplete = true;

                        if(d.successfullyCachedImageCount == Object.keys(d.imageCache).length) d.begin();
                    };
                } else {
                    Promise.all([
                        new Promise((resolve, reject) => {
                            result.image = new Image();
                            result.image.src = url;
                            result.image.crossOrigin = "anonymous";

                            result.image.onload = () => {
                                result.imageLoaded = true;
                                resolve();
                            };

                            result.image.onerror = reject;
                        }),
                        new Promise((resolve, reject) => {
                            fetch(url)
                                .then(response => response.blob())
                                .then(blob => createImageBitmap(blob)
                                    .then(bitmap => {
                                        result.bitmap = bitmap;
                                        result.bitmapLoaded = true;

                                        resolve();
                                    })
                                )
                                .catch(err => reject(err))
                        })
                    ])
                        .then(() => {
                            result.loaded = true;
                            result.sent = false;
                            result.loadComplete = true;
                            result.sourceURL = url;

                            d.imageCache[url] = result;
                            d.successfullyCachedImageCount++;

                            [result.canvas.width, result.canvas.height] = [result.width, result.height] = [result.image.width, result.image.height];

                            result.imageData = new ImageData(result.width, result.height);
                            result.ctx.drawImage(
                                result.getRenderable(), 0, 0,
                                result.width, result.height, 0, 0, result.width, result.height
                            );
                            result.updatePixels();

                            if(d.successfullyCachedImageCount == Object.keys(d.imageCache).length) d.begin();
                        })
                        .catch(err => Dark.error(err));
                }

                return result;
            },

            getImage: function(loc) {
                if(Dark.khan) {
                    let url = `https://cdn.kastatic.org/third_party/javascript-khansrc/live-editor/build/images/${loc}.png`;
                    if(Object.keys(d.imageCache).includes(url) && d.began) return d.imageCache[url].copy();

                    let img = new o.DImage(1, 1, d);
                    d.imageCache[url] = null;
                    d.cachedImageCount++;
                    img.image = new Image();
                    img.image.src = url;
                    img.image.crossOrigin = "anonymous";
                    img.image.onload = () => {
                        d.imageCache[url] = img;
                        d.successfullyCachedImageCount++;

                        [img.canvas.width, img.canvas.height] = [img.width, img.height] = [img.image.width, img.image.height];
                        img.imageData = new ImageData(img.width, img.height);
                        img.ctx.drawImage(img.image, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
                        img.updatePixels();

                        if(d.successfullyCachedImageCount == Object.keys(d.imageCache).length) d.begin();
                    };
                    return img;
                } else {
                    return d.loadImage("/" + loc);
                }
            },

            filter: function(filter, value) {
                // Tested this, fastest to include the source
                screen.ctx.drawImage(d.canvas, 0, 0, d.width, d.height, 0, 0, d.width, d.height);
                screen.filter(filter, value);
                d.ctx.putImageData(screen.imageData, 0, 0);
            },

            // Quick & Mathy functions
            min: (a, b) => (a < b) ? a : b,
            max: (a, b) => (a > b) ? a : b,
            log10: num => Math.log10(num),
            log2: num => Math.log2(num),
            log: num => Math.log(num), // note: ln
            logBase: (base, num) => Math.log(base) / Math.log(num),
            mag: (a, b) => Math.sqrt(a * a + b * b),
            norm: (num, min, max) => (num - min) / (max - min),
            constrain: (num, min, max) => Math.min(Math.max(num, min), max),
            between: (num, min, max) => num <= max && num >= min,
            exceeds: (num, min, max) => num > max || num < min,
            lerp: (val1, val2, percent) => (val2 - val1) * percent + val1,
            map: (num, min1, max1, min2, max2) => min2 + (max2 - min2) / (max1 - min1) * (num - min1),
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
            reciprocal: num => 1 / num,
            trim: str => str.trim(),
            mod: (a, b) => ((a % b) + b) % b,
            snap: (val, min, max) => (val - min) % (max - min) + min,
            percent: val => val / 100,
            translateX: x => d.translate(x, 0),
            translateY: y => d.translate(0, y),
            scaleX: x => d.scale(x, 1),
            scaleY: y => d.scale(1, y),
            skewX: x => d.skew(x, 0),
            skewY: y => d.skew(0, y),
            split: (str, delimiter) => str.split(delimiter),
            concat: (arr1, arr2) => arr1.concat(arr2),
            join: (arr, joiner = ", ") => arr.join(joiner),
            append: (arr, elem) => (arr.push(elem), arr),
            reverse: arr => arr.reverse(),
            expand: (arr, len) => Array(len ?? arr.length * 2).fill().map((_, i) => arr[i]),
            shorten: arr => d.expand(arr, arr.length - 1),
            match: (string, regex) => string.match(regex),
            matchAll: (string, regex) => [...string.matchAll(regex)].map(e => e.index),
            nf: (num, left, right) => (num + ".").padStart(left + 1, "0") + (String(num).split(".")[1] ?? "").padEnd(right <= 0 ? 1 : right, "0"),
            mix: (x, y, f) => x + ((y - x) * f >> 8),
            link: (url, target) => open(url, target ?? "_blank"),
            isArray: arr => Array.isArray(arr) || ArrayBuffer.isView(arr),
            cutoff: (str, len = 20) => str.length > len ? `${str.substring(0, len)}...` : str

        });

        // Draw function (raf = request animation frame)
        d.raf = function(time) {
            if(Dark.startTime > d.info.initializationTime) {
                Dark.warn("Deleting old Dark.js instance.");
                d.exit();
                return;
            }

            time = performance.now();

            let deltaFrame = time - lastFrame;
            let deltaTime = time - lastTime;
            lastTime = performance.now();

            if(lastScrollTime != null && lastTime - lastScrollTime > 16) {
                lastScrollTime = null;
                d.mouseScroll.zero3D();
            }

            let run = deltaFrame > s.frameStep - deltaTime / 2 && s.looping;

            // If the user left the page and just entered, make fix deltas
            if(lastHidden < time && lastHidden > lastTime) {
                deltaTime = time - lastHidden;
                deltaFrame = deltaTime;
            }

            if(run) {
                lastFrame = time;
                d.draw();
                d.dt = deltaFrame / 1000;
                d.fps = 1000 / deltaFrame;
                d.frameCount = ++d.frameCount;
            }

            Dark.globallyUpdateVariables(d);

            frame = requestAnimationFrame(d.raf);
        };

        // Start draw & do setup
        d.begin = function() {
            if(d.loaded && !d.began) { // Don't begin x2 and wait until images are loaded
                d.began = true; // I mean, it is true

                // Setup before draw loop
                d.setup();

                // Start draw function
                frame = requestAnimationFrame(d.raf);
            }
        };

        // Set defaults
        loadDefault();

        d.defaultSettings = Object.assign({}, s);

        if(!d.dummy) {
            // Load event listeners for document
            loadEvents();

            // Setup later options
            d.mouseScroll = o.DVector.zero3D();
            s.cursor = "auto";
            s.looping = true;

            if(Dark.khan && Dark.changeable.khanImagePreload) Dark.imageLocationsKA.forEach(loc => d.getImage(loc));

            addEventListener("load", () => {
                d.loaded = true;
                Dark.globallyUpdateVariables(d);
                d.preload();
                if(!d.began && d.successfullyCachedImageCount == d.cachedImageCount) d.begin();
            });
        }
    };

    // I mean, it can't be denied
    Dark.darkObject = true;

    // List of all instances
    Dark.instances = [];

    // Current version
    Dark.version = "pre-0.7.8.7";

    // Empty functions that can be changed by the user
    Dark.empties = [
        "draw",
        "setup",
        "preload",
        "keyPressed",
        "keyReleased",
        "keyTyped",
        "mouseClicked",
        "mousePressed",
        "mouseReleased",
        "mouseMoved",
        "mouseScrolled",
        "mouseIn",
        "mouseOut",
        "mouseDoubleClicked",
        "mouseDragged",
        "pageResized"
    ];

    Dark.editable = Dark.empties.concat([
        "imageData"
    ]);

    // Constants
    Dark.constants = {
        DAYS: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        PI: Math.PI,
        HALF_PI: Math.PI / 2,
        QUARTER_PI: Math.PI / 4,
        E: Math.E,
        PHI: (1 + Math.sqrt(5)) / 2,
        TAU: Math.PI * 2,
        EPSILON: Number.EPSILON,
        RED_MASK: 0b11111111000000001111111111111111,
        GREEN_MASK: 0b11111111111111110000000011111111,
        BLUE_MASK: 0b11111111111111111111111100000000,
        ALPHA_MASK: 0b00000000111111111111111111111111,
        ROUND: 0,
        FLAT: 1,
        DEGREES: 2,
        RADIANS: 3,
        VERTEX: 4,
        CURVE: 5,
        BEZIER: 6,
        CLOSE: 7,
        OPEN: 8,
        CENTER: 9,
        CORNER: 10,
        WIDTH: 11,
        HEIGHT: 12,
        NORMAL: 13,
        BOLD: 14,
        ITALIC: 15,
        BEVEL: 16,
        MITER: 17,
        SQUARE: 18,
        LEFT: 19,
        RIGHT: 20,
        TOP: 21,
        BOTTOM: 22,
        BASELINE: 23,
        GET: 24,
        SET: 25,
        RADIUS: 26,
        KEY: 27,
        CLICK: 28,
        SCROLL: 29,
        LINEAR: 30,
        RADIAL: 31,
        CONIC: 32,
        RGB: 33, // unused
        RGBA: 33, // unused
        SRGB: 33, // unused
        HSB: 34, // unused
        HSV: 34, // unused
        HSL: 35, // unused
        HEX: 36, // unused
        CMYK: 37, // unused
        CMY: 37, // unused
        PERLIN: 50, // unused
        SIMPLEX: 51, // unused
        WORLEY: 52, // unused
        VALUE: 53, // unused
        RANDOM: 54, // unused
        INVERT: 55,
        OPAQUE: 56,
        GRAY: 57,
        ERODE: 58,
        DILATE: 59,
        THRESHOLD: 60,
        POSTERIZE: 61,
        BLUR: 62,
        SHARPEN: 63,
        SEPIA: 64,
        OUTLINE: 65,
        SWIRL: 66,
        EDGE: 67,
        CONTRAST: 68,
        VIGNETTE: 69,
        BRIGHTNESS: 70,
        BLACK: 71,
        WHITE: 72,
        NORMALIZE: 73,
        BOX: 74,
        TRANSPARENCY: 75,
        PIXELATE: 76,
        FISHEYE: 77,
        EMBOSS: 78,
        SOBEL: 79
    };

    Dark.filters = [
        Dark.constants.INVERT,
        Dark.constants.OPAQUE,
        Dark.constants.GRAY,
        Dark.constants.ERODE,
        Dark.constants.DILATE,
        Dark.constants.THRESHOLD,
        Dark.constants.POSTERIZE,
        Dark.constants.BLUR,
        Dark.constants.SHARPEN,
        Dark.constants.SEPIA,
        Dark.constants.OUTLINE,
        Dark.constants.SWIRL,
        Dark.constants.EDGE,
        Dark.constants.CONTRAST,
        Dark.constants.VIGNETTE,
        Dark.constants.BRIGHTNESS,
        Dark.constants.BLACK,
        Dark.constants.WHITE,
        Dark.constants.NORMALIZE,
        Dark.constants.BOX,
        Dark.constants.TRANSPARENCY,
        Dark.constants.PIXELATE,
        Dark.constants.FISHEYE,
        Dark.constants.EMBOSS,
        Dark.constants.SOBEL
    ];

    // Special keys map
    Dark.special = {
        16: "shift",
        13: "enter",
        8: "delete",
        9: "tab",
        27: "escape",
        32: "space",
        18: "option",
        17: "control",
        91: "left_meta",
        93: "right_meta",
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
        192: "backtick",
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

    // Grabbed from https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
    Dark.cursors = [
        "auto",
        "default",
        "none",
        "context-menu",
        "help",
        "pointer",
        "progress", // duplicate of wait
        "wait",
        "cell", // duplicate of crosshair
        "crosshair",
        "text",
        "vertical-text",
        "alias",
        "copy",
        "move",
        "no-drop", // duplicate of not-allowed
        "not-allowed",
        "grab",
        "grabbing",
        "all-scroll",
        "col-resize",
        "row-resize",
        "n-resize",
        "e-resize",
        "s-resize",
        "w-resize",
        "ne-resize",
        "nw-resize",
        "se-resize",
        "sw-resize",
        "ew-resize",
        "ns-resize",
        "nesw-resize",
        "nwse-resize",
        "zoom-in",
        "zoom-out"
    ];

    // All KA getImage urls
    Dark.imageLocationsKA = [
        "avatars/aqualine-sapling",
        "avatars/aqualine-seed",
        "avatars/aqualine-seedling",
        "avatars/aqualine-tree",
        "avatars/aqualine-ultimate",
        "avatars/avatar-team",
        "avatars/duskpin-sapling",
        "avatars/duskpin-seed",
        "avatars/duskpin-seedling",
        "avatars/duskpin-tree",
        "avatars/duskpin-ultimate",
        "avatars/leaf-blue",
        "avatars/leaf-green",
        "avatars/leaf-grey",
        "avatars/leaf-orange",
        "avatars/leaf-red",
        "avatars/leaf-yellow",
        "avatars/leafers-sapling",
        "avatars/leafers-seed",
        "avatars/leafers-seedling",
        "avatars/leafers-tree",
        "avatars/leafers-ultimate",
        "avatars/marcimus",
        "avatars/marcimus-orange",
        "avatars/marcimus-purple",
        "avatars/marcimus-red",
        "avatars/mr-pants",
        "avatars/mr-pants-green",
        "avatars/mr-pants-orange",
        "avatars/mr-pants-pink",
        "avatars/mr-pants-purple",
        "avatars/mr-pants-with-hat",
        "avatars/mr-pink",
        "avatars/mr-pink-green",
        "avatars/mr-pink-orange",
        "avatars/old-spice-man",
        "avatars/old-spice-man-blue",
        "avatars/orange-juice-squid",
        "avatars/piceratops-sapling",
        "avatars/piceratops-seed",
        "avatars/piceratops-seedling",
        "avatars/piceratops-tree",
        "avatars/piceratops-ultimate",
        "avatars/primosaur-sapling",
        "avatars/primosaur-seed",
        "avatars/primosaur-seedling",
        "avatars/primosaur-tree",
        "avatars/primosaur-ultimate",
        "avatars/purple-pi",
        "avatars/purple-pi-pink",
        "avatars/purple-pi-teal",
        "avatars/questionmark",
        "avatars/robot_female_1",
        "avatars/robot_female_2",
        "avatars/robot_female_3",
        "avatars/robot_male_1",
        "avatars/robot_male_2",
        "avatars/robot_male_3",
        "avatars/spunky-sam",
        "avatars/spunky-sam-green",
        "avatars/spunky-sam-orange",
        "avatars/spunky-sam-red",
        "avatars/starky-sapling",
        "avatars/starky-seed",
        "avatars/starky-seedling",
        "avatars/starky-tree",
        "avatars/starky-ultimate",
        "creatures/Hopper-Happy",
        "creatures/Hopper-Cool",
        "creatures/Hopper-Jumping",
        "creatures/OhNoes",
        "creatures/OhNoes-Hmm",
        "creatures/OhNoes-Happy",
        "creatures/BabyWinston",
        "creatures/Winston",
        "cute/Blank",
        "cute/BrownBlock",
        "cute/CharacterBoy",
        "cute/CharacterCatGirl",
        "cute/CharacterHornGirl",
        "cute/CharacterPinkGirl",
        "cute/CharacterPrincessGirl",
        "cute/ChestClosed",
        "cute/ChestLid",
        "cute/ChestOpen",
        "cute/DirtBlock",
        "cute/DoorTallClosed",
        "cute/DoorTallOpen",
        "cute/EnemyBug",
        "cute/GemBlue",
        "cute/GemGreen",
        "cute/GemOrange",
        "cute/GrassBlock",
        "cute/Heart",
        "cute/Key",
        "cute/PlainBlock",
        "cute/RampEast",
        "cute/RampNorth",
        "cute/RampSouth",
        "cute/RampWest",
        "cute/Rock",
        "cute/RoofEast",
        "cute/RoofNorth",
        "cute/RoofNorthEast",
        "cute/RoofNorthWest",
        "cute/RoofSouth",
        "cute/RoofSouthEast",
        "cute/RoofSouthWest",
        "cute/RoofWest",
        "cute/Selector",
        "cute/ShadowEast",
        "cute/ShadowNorth",
        "cute/ShadowNorthEast",
        "cute/ShadowNorthWest",
        "cute/ShadowSideWest",
        "cute/ShadowSouth",
        "cute/ShadowSouthEast",
        "cute/ShadowSouthWest",
        "cute/ShadowWest",
        "cute/Star",
        "cute/StoneBlock",
        "cute/StoneBlockTall",
        "cute/TreeShort",
        "cute/TreeTall",
        "cute/TreeUgly",
        "cute/WallBlock",
        "cute/WallBlockTall",
        "cute/WaterBlock",
        "cute/WindowTall",
        "cute/WoodBlock",
        "space/background",
        "space/beetleship",
        "space/collisioncircle",
        "space/girl1",
        "space/girl2",
        "space/girl3",
        "space/girl4",
        "space/girl5",
        "space/healthheart",
        "space/minus",
        "space/octopus",
        "space/planet",
        "space/plus",
        "space/rocketship",
        "space/star",
        "space/0",
        "space/1",
        "space/2",
        "space/3",
        "space/4",
        "space/5",
        "space/6",
        "space/7",
        "space/8",
        "space/9",
        "animals/birds_rainbow-lorakeets",
        "animals/butterfly",
        "animals/butterfly_monarch",
        "animals/cat",
        "animals/cheetah",
        "animals/crocodiles",
        "animals/dog_sleeping-puppy",
        "animals/dogs_collies",
        "animals/fox",
        "animals/horse",
        "animals/kangaroos",
        "animals/komodo-dragon",
        "animals/penguins",
        "animals/rabbit",
        "animals/retriever",
        "animals/shark",
        "animals/snake_green-tree-boa",
        "animals/spider",
        "landscapes/beach-at-dusk",
        "landscapes/beach-in-hawaii",
        "landscapes/beach-sunset",
        "landscapes/beach-waves-at-sunset",
        "landscapes/beach-waves-daytime",
        "landscapes/beach-with-palm-trees",
        "landscapes/beach",
        "landscapes/clouds-from-plane",
        "landscapes/crop-circle",
        "landscapes/fields-of-grain",
        "landscapes/fields-of-wine",
        "landscapes/lake",
        "landscapes/lava",
        "landscapes/lotus-garden",
        "landscapes/mountain_matterhorn",
        "landscapes/mountains-and-lake",
        "landscapes/mountains-in-hawaii",
        "landscapes/mountains-sunset",
        "landscapes/sand-dunes",
        "landscapes/waterfall_niagara-falls",
        "food/bananas",
        "food/berries",
        "food/broccoli",
        "food/brussels-sprouts",
        "food/cake",
        "food/chocolates",
        "food/coffee-beans",
        "food/croissant",
        "food/dumplings",
        "food/fish_grilled-snapper",
        "food/fruits",
        "food/grapes",
        "food/hamburger",
        "food/ice-cream",
        "food/mushroom",
        "food/oysters",
        "food/pasta",
        "food/potato-chips",
        "food/potatoes",
        "food/shish-kebab",
        "food/strawberries",
        "food/sushi",
        "food/tomatoes",
        "seasonal/father-winston",
        "seasonal/fireworks-2015",
        "seasonal/fireworks-in-sky",
        "seasonal/fireworks-over-harbor",
        "seasonal/fireworks-scattered",
        "seasonal/gingerbread-family",
        "seasonal/gingerbread-house",
        "seasonal/gingerbread-houses",
        "seasonal/gingerbread-man",
        "seasonal/hannukah-dreidel",
        "seasonal/hannukah-menorah",
        "seasonal/hopper-elfer",
        "seasonal/hopper-partying",
        "seasonal/hopper-reindeer",
        "seasonal/house-with-lights",
        "seasonal/reindeer",
        "seasonal/snow-crystal1",
        "seasonal/snow-crystal2",
        "seasonal/snow-crystal3",
        "seasonal/snownoes",
        "seasonal/snowy-slope-with-trees"
    ];

    // Variables to be private
    Dark.ignoreGlobal = [
        "darkObject",
        "info",
        "empties",
        "raf",
        "begin",
        "vertices",
        "transforms",
        "styles",
        "saves",
        "vertexCache",
        "imageCache",
        "cachedImageCount",
        "successfullyCachedImageCount",
        "settings",
        "constants",
        "objects",
        "defaultSettings",
        "isMain",
        "canvas",
        "ctx",
        "dummy",
        "loaded",
        "began",
        "randomGenerator",
        "name"
    ];

    Dark.singleDefinitions = [
        "constants",
        "objects"
    ];

    // For loading and saving styles
    Dark.styleIgnore = [
        "canvas",
        "width",
        "height"
    ];

    // Maps the KeyEvent.button value to a string name that is usable
    Dark.mouseMap = [
        "left",
        "middle",
        "right",
        "back",
        "forward"
    ];

    Dark.changeable = {};
    Dark.cache = {};

    // Since object values inside frozen object can be edited
    Dark.changeable.errorCount = 0;

    // Auto on for Khan Academy
    Dark.changeable.khanImagePreload = true;

    // Constants, but not quite (can be edited)
    Dark.maxErrorCount = 50;
    Dark.maxStackSize = 500;
    Dark.maxSearchDepth = 10;

    /* 
    
        I spent so, so many hours finding that this was what was causing everything to run SO slowly:
    
        willReadFrequently: true
    
        It runs 400x slower, 5fps with 50 images vs 5ps with 20,000 images
    
    */

    // The current url
    Dark.url = new URL(location.href);

    // If on Khan Academy
    Dark.khan = Dark.url.host == "www.kasandbox.org";

    // If editing
    Dark.editor = Dark.url.host == "127.0.0.1:4444";

    // Searching and changing deep values
    Dark.setDeep = function(obj, keyArr, val) {
        let final = keyArr.pop();
        let point = obj;
        keyArr.forEach(sub => point = point[sub]);
        point[final] = val;
        return obj;
    };

    Dark.getDeep = function(obj, keyArr) {
        let point = obj;
        keyArr.forEach(sub => point = point[sub]);
        return point;
    };

    // It's always good to be able to deep clone something
    Dark.clone = function(e, depth = 0, path = [], tree = []) { // Not working!!! aghhhh
        if(depth == 0) Dark.clone.paths = [];

        if(depth > Dark.maxSearchDepth) return e;

        if(typeof e == "object" || typeof e == "function") {
            tree = [...tree];
            tree.push(e);

            let obj = {};
            for(const key in e) {
                let val = e[key];
                let curPath = path.concat(key);
                if(tree.includes(val)) {
                    // Looping
                    Dark.clone.paths.push({
                        path: curPath,
                        point: tree.slice(0, tree.indexOf(val))
                    });
                } else if(u.isArray(val)) {
                    // Array cloning
                    let cloned = Dark.clone(val, depth + 1, curPath, tree);
                    cloned.length = Object.keys(cloned).length;
                    obj[key] = Array.from(cloned);
                } else if(typeof val == "object" && val != null && val.constructor.toString().slice(val.constructor.name.length + 12) != "{ [native code] }") {
                    if(val.constructor === Object) {
                        // Deep object cloning
                        obj[key] = Dark.clone(val, depth + 1, curPath, tree);
                    } else {
                        // Quick object cloning
                        let instantiated = Object.create(val.constructor.prototype);
                        for(const cloneKey in val) instantiated[cloneKey] = val[cloneKey];
                        obj[key] = instantiated;
                    }
                } else {
                    // Pointing
                    obj[key] = val;
                }
            }
            if(depth == 0) {
                // Sort loops by depth
                Dark.clone.paths.sort((a, b) => a.path.length - b.path.length);
                Dark.clone.paths.forEach(path => Dark.setDeep(obj, path.path, Dark.getDeep(obj, path.point)));
            }
            return obj;
        } else {
            // Basic value like boolean, number or string
            return e;
        }
    };;

    Dark.format = function(obj) {
        let copied = Dark.clone(obj);
        if(typeof copied == "object") {
            return JSON.stringify(Dark.clone(obj), Dark.bigintChecker, "    ");
        } else {
            return String(obj);
        }
    };

    Dark.tree = function(e, depth = 0, tree = []) {
        if(tree.includes(e)) return;
        tree = tree.concat([e]);

        if(depth > Dark.maxSearchDepth) return e;

        if(e != null && Object.keys(e).length && (typeof e == "object" || typeof e == "function")) {
            if(u.isArray(e)) {
                let arr = [];
                e.forEach(item => {
                    let subTree = Dark.tree(item, depth + 1, tree);
                    if(subTree != undefined) arr.push(item);
                });
                return arr;
            } else {
                let obj = {};
                for(const key in e) {
                    let subTree = Dark.tree(e[key], depth + 1, tree);
                    if(subTree != undefined) obj[key] = subTree;
                }
                return obj;
            }
        } else {
            return;
        }
    };

    Dark.formatTree = function(obj) {
        let tree = Dark.tree(obj);
        return tree;
    };

    Dark.bigintChecker = function(_, obj) {
        return typeof obj == "bigint" ? obj.toString() : obj;
    };

    Dark.noop = function() {};

    // Collisions
    Dark.rectRect = function(x1, y1, width1, height1, x2, y2, width2, height2) {
        return x1 + width1 > x2 && x1 < x2 + width2 && y1 + height1 > y2 && y1 < y2 + height2;
    };

    // Canvas has a much, much faster conversion to ImageBitmap and Image than OffscreenCanvas, plus Safari… :/
    Dark.createCanvas = function(width, height) {
        let canvas = document.createElement("canvas");
        [canvas.width, canvas.height] = [width, height];
        return canvas;
    };

    Dark.doError = function(type, err) {
        if(Dark.changeable.errorCount == Dark.maxErrorCount) {
            console.warn("Too many warnings and errors have been made, the rest will not display.");
        } else if(Dark.changeable.errorCount < Dark.maxErrorCount) {
            console[type](err);
        }
        Dark.changeable.errorCount++;
    };

    Dark.warn = function(warning) {
        Dark.doError("warn", warning);
    };

    Dark.error = function(error) {
        Dark.doError("error", error instanceof Error ? error : new Error(error));
    };

    Dark.observe = function(object, type, callback) {
        if(arguments.length == 3 && type != Dark.constants.GET && type != Dark.constants.SET) {
            Dark.error("Invalid type, must be either GET or SET");
        }
        object = new Proxy(object, {
            get: function(target, prop) { // also reciever
                if(type == Dark.constants.GET) callback(prop);
                return target[prop];
            },
            set: function(target, prop, value) {
                if(type == Dark.constants.SET) callback(prop, value);
                target[prop] = value;
            }
        });
    };

    // Sets the Dark object that has global access
    Dark.setMain = function(dark) {
        if(dark instanceof Dark) {
            if(Dark.main) Dark.main.isMain = false;
            Dark.main = dark;
            dark.isMain = true;
        } else {
            Dark.error(`${dark} is not an instance of Dark`);
        }
    };

    Dark.getMain = function() {
        return Dark.main;
    };

    let off = win.OffscreenCanvas ?? Dark.createCanvas; // For Safari

    Dark.fileCacheKA = {
        "/filters/global.vert": "# version 300 es\nprecision lowp float;\nin vec2 vertPos;\nin vec2 vertUV;\nout vec2 uv;\nout vec2 pos;\nvoid main() {\n pos = vertPos;\n uv = vertUV;\n gl_Position = vec4(vertPos, 0.0, 1.0);\n}",
        "/filters/invert.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n color = vec4(1.0 - tex.rgb, tex.a);\n}",
        "/filters/opaque.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n color = vec4(tex.rgb, 1.0);\n}",
        "/filters/grayscale.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n float luminance = 0.2126 * tex.r + 0.7152 * tex.g + 0.0722 * tex.b; // Based on how human eyes precieve\n color = vec4(vec3(luminance), tex.a);\n}",
        "/filters/threshold.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n float luminance = 0.2126 * tex.r + 0.7152 * tex.g + 0.0722 * tex.b; // Same as grayscale\n if(luminance > param) {\n color = vec4(vec3(1.0), 1.0);\n } else {\n color = vec4(vec3(0.0), 1.0);\n }\n}",
        "/filters/posterize.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nfloat posterize(float val) {\n return floor(val * param + 0.5) / param;\n}\nvoid main() {\n vec4 tex = texture(sampler, uv);\n float red = posterize(tex.r);\n float green = posterize(tex.g);\n float blue = posterize(tex.b);\n \n color = vec4(red, green, blue, 1.0);\n}",
        "/filters/black.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n float luminance = 0.2126 * tex.r + 0.7152 * tex.g + 0.0722 * tex.b; // Same as grayscale\n if(luminance <= param) {\n color = vec4(vec3(0.0), tex.a);\n } else {\n color = tex;\n }\n}",
        "/filters/white.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n float luminance = 0.2126 * tex.r + 0.7152 * tex.g + 0.0722 * tex.b; // Same as grayscale\n if(luminance >= param) {\n color = vec4(vec3(1.0), tex.a);\n } else {\n color = tex;\n }\n}",
        "/filters/vignette.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n vec2 pos = (uv * 2.0 - 1.0) * param;\n float dist = 1.0 - sqrt(pos.x * pos.x + pos.y * pos.y);\n color = vec4(tex.rgb * dist, tex.a);\n}",
        "/filters/box.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nuniform float param;\nin vec2 uv;\nout vec4 color;\n#define len (param * 2.0 + 1.0)\n#define count (len * len)\nvoid main() {\n vec4 tex = texture(sampler, uv);\n \n vec4 total = vec4(0.0);\n for(float y = -param; y <= param; y++) {\n for(float x = -param; x <= param; x++) {\n total += texture(sampler, uv + vec2(x, y) / size);\n }\n }\n color = vec4(total / count);\n}",
        "/filters/brightness.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n \n color = vec4(tex.rgb + param, tex.a);\n}",
        "/filters/transparency.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n \n color = vec4(tex.rgb, tex.a - param);\n}",
        "/filters/sepia.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n \n color = vec4(\n 0.393 * tex.r + 0.769 * tex.g + 0.189 * tex.b,\n 0.349 * tex.r + 0.686 * tex.g + 0.168 * tex.b,\n 0.272 * tex.r + 0.534 * tex.g + 0.131 * tex.b,\n tex.a\n );\n}",
        "/filters/pixelate.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec2 snap(vec2 point) {\n return floor(point * size / param) * param / size;\n}\nvoid main() {\n vec4 tex = texture(sampler, snap(uv));\n \n color = tex;\n}",
        "/filters/sharpen.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec4 get(float x, float y) {\n return texture(sampler, uv + vec2(x, y) / size);\n}\nvoid main() {\n vec4 tex = texture(sampler, uv);\n const float kernel[9] = float[](\n 0.0, -1.0, 0.0,\n -1.0, 5.0, -1.0,\n 0.0, -1.0, 0.0\n ); \n color = vec4((\n get(-1.0, -1.0) * kernel[0] +\n get(0.0, -1.0) * kernel[1] +\n get(1.0, -1.0) * kernel[2] +\n get(-1.0, 0.0) * kernel[3] +\n get(0.0, 0.0) * kernel[4] +\n get(1.0, 0.0) * kernel[5] +\n get(-1.0, 1.0) * kernel[6] +\n get(0.0, 1.0) * kernel[7] +\n get(1.0, 1.0) * kernel[8]\n ).rgb, tex.a);\n}",
        "/filters/outline.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec4 get(float x, float y) {\n return texture(sampler, uv + vec2(x, y) / size);\n}\nvoid main() {\n vec4 tex = texture(sampler, uv);\n const float kernel[9] = float[](\n -1.0, -1.0, -1.0,\n -1.0, 8.0, -1.0,\n -1.0, -1.0, -1.0\n ); \n color = vec4((\n get(-1.0, -1.0) * kernel[0] +\n get(0.0, -1.0) * kernel[1] +\n get(1.0, -1.0) * kernel[2] +\n get(-1.0, 0.0) * kernel[3] +\n get(0.0, 0.0) * kernel[4] +\n get(1.0, 0.0) * kernel[5] +\n get(-1.0, 1.0) * kernel[6] +\n get(0.0, 1.0) * kernel[7] +\n get(1.0, 1.0) * kernel[8]\n ).rgb, tex.a);\n}",
        "/filters/edge.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec4 get(float x, float y) {\n return texture(sampler, uv + vec2(x, y) / size);\n}\nvoid main() {\n vec4 tex = texture(sampler, uv);\n const float kernel[9] = float[](\n 0.0, 1.0, 0.0,\n 1.0, -4.0, 1.0,\n 0.0, 1.0, 0.0\n ); \n color = vec4((\n get(-1.0, -1.0) * kernel[0] +\n get(0.0, -1.0) * kernel[1] +\n get(1.0, -1.0) * kernel[2] +\n get(-1.0, 0.0) * kernel[3] +\n get(0.0, 0.0) * kernel[4] +\n get(1.0, 0.0) * kernel[5] +\n get(-1.0, 1.0) * kernel[6] +\n get(0.0, 1.0) * kernel[7] +\n get(1.0, 1.0) * kernel[8]\n ).rgb, tex.a);\n}",
        "/filters/normalize.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n color = vec4(tex.rgb / length(tex.rgb), tex.a);\n}",
        "/filters/erode.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec4 get(float x, float y) {\n return texture(sampler, uv + vec2(x, y) / size);\n}\nfloat luminance(vec4 col) {\n return 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b; // from grayscale\n}\nvoid main() {\n vec4 middle = get(0.0, 0.0);\n vec4 top = get(0.0, 1.0);\n vec4 bottom = get(0.0, -1.0);\n vec4 right = get(1.0, 0.0);\n vec4 left = get(-1.0, 0.0);\n float lumMiddle = luminance(middle);\n float lumTop = luminance(top);\n float lumBottom = luminance(bottom);\n float lumRight = luminance(right);\n float lumLeft = luminance(left);\n if(lumBottom > lumMiddle) {\n color = bottom;\n } else if(lumTop > lumMiddle) {\n color = top;\n } else if(lumRight > lumMiddle) {\n color = right;\n } else if(lumLeft > lumMiddle) {\n color = left;\n } else {\n color = middle;\n }\n}",
        "/filters/dilate.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec4 get(float x, float y) {\n return texture(sampler, uv + vec2(x, y) / size);\n}\nfloat luminance(vec4 col) {\n return 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b; // from grayscale\n}\nvoid main() {\n vec4 middle = get(0.0, 0.0);\n vec4 top = get(0.0, 1.0);\n vec4 bottom = get(0.0, -1.0);\n vec4 right = get(1.0, 0.0);\n vec4 left = get(-1.0, 0.0);\n float lumMiddle = luminance(middle);\n float lumTop = luminance(top);\n float lumBottom = luminance(bottom);\n float lumRight = luminance(right);\n float lumLeft = luminance(left);\n if(lumBottom < lumMiddle) {\n color = bottom;\n } else if(lumTop < lumMiddle) {\n color = top;\n } else if(lumRight < lumMiddle) {\n color = right;\n } else if(lumLeft < lumMiddle) {\n color = left;\n } else {\n color = middle;\n }\n}",
        "/filters/blur.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nuniform float param;\nin vec2 uv;\nout vec4 color;\n#define len (param * 2.0 + 1.0)\n#define count (len * len)\n#define TAU (6.2831853071795864769252867665590057683943)\nvoid main() { \n vec4 total = vec4(0.0);\n float matrixTotal = 0.0;\n for(float y = -param; y <= param; y++) {\n for(float x = -param; x <= param; x++) {\n vec4 tex = texture(sampler, uv + vec2(x, y) / size);\n float gaussian = exp(- (x * x + y * y) / (2.0 * param * param)) / (TAU * param * param);\n matrixTotal += gaussian;\n total += vec4(tex.rgb * gaussian, tex.a);\n }\n }\n color = total / matrixTotal;\n}",
        "/filters/swirl.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nuniform float param;\nin vec2 uv;\nout vec4 color;\n#define radius (0.5)\nvoid main() {\n vec2 cUV = uv - vec2(0.5); // centered UV\n float len = length(cUV);\n float theta = atan(cUV.y, cUV.x) + param * smoothstep(radius, 0.0, len);\n float dist = length(cUV);\n vec4 tex = texture(sampler, vec2(dist * cos(theta), dist * sin(theta)) + vec2(0.5));\n \n color = tex;\n}",
        "/filters/contrast.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nin vec2 uv;\nout vec4 color;\nvoid main() {\n vec4 tex = texture(sampler, uv);\n color = vec4((tex.rgb - 0.5) * param + 0.5, tex.a);\n}",
        "/filters/fisheye.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nuniform vec2 size;\nin vec2 uv;\nin vec2 pos;\nout vec4 color;\n#define R2 1.414213562373095048801688\nvoid main() {\n float shifted = 2.0 - param;\n float squareness = shifted * shifted * shifted * shifted;\n vec2 c = pos * size / min(size.x, size.y) / squareness;\n float xsq = c.x * c.x;\n float ysq = c.y * c.y;\n vec2 worldMap = vec2(\n 0.5 * (sqrt(2.0 + xsq - ysq + 2.0 * c.x * R2) - sqrt(2.0 + xsq - ysq - 2.0 * c.x * R2)),\n 0.5 * (sqrt(2.0 - xsq + ysq + 2.0 * c.y * R2) - sqrt(2.0 - xsq + ysq - 2.0 * c.y * R2))\n ) * squareness;\n vec2 mapped = (worldMap + 1.0) / 2.0;\n \n if(abs(worldMap.x) <= 1.0 && abs(worldMap.y) <= 1.0) {\n color = texture(sampler, mapped);\n } else {\n color = vec4(vec3(0.0), 1.0);\n }\n}",
        "/filters/emboss.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec4 get(float x, float y) {\n return texture(sampler, uv + vec2(x, y) / size);\n}\nvoid main() {\n vec4 tex = texture(sampler, uv);\n const float kernel[9] = float[](\n -2.0, -1.0, 0.0,\n -1.0, 1.0, 1.0,\n 0.0, 1.0, 2.0\n ); \n color = vec4((\n get(-1.0, -1.0) * kernel[0] +\n get(0.0, -1.0) * kernel[1] +\n get(1.0, -1.0) * kernel[2] +\n get(-1.0, 0.0) * kernel[3] +\n get(0.0, 0.0) * kernel[4] +\n get(1.0, 0.0) * kernel[5] +\n get(-1.0, 1.0) * kernel[6] +\n get(0.0, 1.0) * kernel[7] +\n get(1.0, 1.0) * kernel[8]\n ).rgb, tex.a);\n}",
        "/filters/sobel.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform vec2 size;\nuniform float param;\nuniform float[9] kernel;\nin vec2 uv;\nout vec4 color;\nvec4 get(float x, float y) {\n return texture(sampler, uv + vec2(x, y) / size);\n}\nvoid main() {\n vec4 tex = texture(sampler, uv);\n color = vec4((\n get(-1.0, -1.0) * kernel[0] +\n get(0.0, -1.0) * kernel[1] +\n get(1.0, -1.0) * kernel[2] +\n get(-1.0, 0.0) * kernel[3] +\n get(0.0, 0.0) * kernel[4] +\n get(1.0, 0.0) * kernel[5] +\n get(-1.0, 1.0) * kernel[6] +\n get(0.0, 1.0) * kernel[7] +\n get(1.0, 1.0) * kernel[8]\n ).rgb, tex.a);\n}"
    };

    Dark.compileListKA = [];

    // https://stackoverflow.com/questions/36921947/read-a-server-side-file-using-javascript
    Dark.loadFile = function(loc) {
        if(Dark.khan) {
            return Dark.fileCacheKA[loc];
        } else {
            if(!Dark.editor) loc = `https://cdn.jsdelivr.net/gh/99TheDark/Dark.js@${Dark.version}/filters/${loc}`;
            let result = null;
            let xhr = new XMLHttpRequest();
            xhr.open("GET", loc, false);
            xhr.send();
            if(xhr.status == 200) {
                result = xhr.responseText;
            }
            if(Dark.editor) {
                // https://stackoverflow.com/questions/1981349/regex-to-replace-multiple-spaces-with-a-single-space
                Dark.compileListKA.push({
                    location: loc,
                    contents: result.replace(/\n\n+/g, "\n").replace(/  +/g, " ")
                });
            }
            return result;
        }
    };

    Dark.compileKA = function() {
        if(Dark.editor) {
            Dark.compileListKA.forEach(file => Dark.fileCacheKA[file.location] = file.contents);
            // console.log(Dark.format(Dark.fileCacheKA));
        }
    };

    // Update variables to window for main instance
    Dark.globallyUpdateVariables = function(m) {
        if(!m.isMain) return; // If it isn't the main instance 
        // Update empties so they can be defined
        Dark.editable.forEach(key => {
            if(win[key]) m[key] = win[key];
        });
        // Update global variables
        for(const mainKey in m) {
            // Skip if it should be ingored
            if(Dark.ignoreGlobal.includes(mainKey)) continue;
            if(Dark.editable.includes(mainKey)) continue;
            // Else set
            if(typeof m[mainKey] == "object" && !m[mainKey].darkObject && mainKey != "keys") {
                for(const key in m[mainKey]) {
                    win[key] = m[mainKey][key];
                }
            } else {
                win[mainKey] = m[mainKey];
            }
        }
    };

    Dark.defineConstants = function() {
        Dark.singleDefinitions.forEach(type => {
            for(key in Dark[type]) {
                Object.defineProperty(win, key, {
                    value: Dark[type][key],
                    writable: false,
                    configurable: false
                });
            }
        });
    };

    Dark.objects = (function() {

        // Vectors
        let DVector = function(x, y, z) {
            if(!(this instanceof DVector)) return new (Function.prototype.bind.apply(DVector, [null].concat(...arguments)));

            this.darkObject = true;

            switch(arguments.length) {
                default:
                    Dark.error("DVector requires 2 or 3 parameters, not " + arguments.length);
                    break;
                case 3:
                    this.x = x;
                    this.y = y;
                    this.z = z;
                    this.is2D = false;
                    break;
                case 2:
                    this.x = x;
                    this.y = y;
                    this.is2D = true;
                    break;
            }
        };
        DVector.create = function(x, y, z) {
            return new DVector(x, y, z);
        };
        DVector.zero2D = function() {
            return new DVector(0, 0);
        };
        DVector.prototype.zero2D = function() {
            [this.x, this.y, this.z, this.is2D] = [0, 0, undefined, true];
            return this;
        };
        DVector.zero3D = function() {
            return new DVector(0, 0, 0);
        };
        DVector.prototype.zero3D = function() {
            [this.x, this.y, this.z] = [0, 0, 0];
            return this;
        };
        DVector.add = function(v1, v2) {
            if(v2 instanceof DVector) {
                if(v1.is2D) {
                    return new DVector(
                        v1.x + v2.x,
                        v1.y + v2.y
                    );
                } else {
                    return new DVector(
                        v1.x + v2.x,
                        v1.y + v2.y,
                        v1.z + v2.z
                    );
                }
            } else {
                if(v1.is2D) {
                    return new DVector(
                        v1.x + v2,
                        v1.y + v2
                    );
                } else {
                    return new DVector(
                        v1.x + v2,
                        v1.y + v2,
                        v1.z + v2
                    );
                }
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
            return this;
        };
        DVector.sub = function(v1, v2) {
            if(v2 instanceof DVector) {
                if(v1.is2D) {
                    return new DVector(
                        v1.x - v2.x,
                        v1.y - v2.y
                    );
                } else {
                    return new DVector(
                        v1.x - v2.x,
                        v1.y - v2.y,
                        v1.z - v2.z
                    );
                }
            } else {
                if(v1.is2D) {
                    return new DVector(
                        v1.x - v2,
                        v1.y - v2
                    );
                } else {
                    return new DVector(
                        v1.x - v2,
                        v1.y - v2,
                        v1.z - v2
                    );
                }
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
            return this;
        };
        DVector.mult = function(v1, v2) {
            if(v2 instanceof DVector) {
                if(v1.is2D) {
                    return new DVector(
                        v1.x * v2.x,
                        v1.y * v2.y
                    );
                } else {
                    return new DVector(
                        v1.x * v2.x,
                        v1.y * v2.y,
                        v1.z * v2.z
                    );
                }
            } else if(v2 instanceof DMatrix || v2 instanceof DOMMatrix) {
                if(v2 instanceof DOMMatrix) v2 = new DMatrix(v2);
                if(v1.is2D) {
                    return new DVector(
                        v1.x * v2.get(0, 0) + v1.y * v2.get(1, 0) + v2.get(3, 0),
                        v1.x * v2.get(0, 1) + v1.y * v2.get(1, 1) + v2.get(3, 1),
                    );
                } else {
                    return new DVector(
                        v1.x * v2.get(0, 0) + v1.y * v2.get(1, 0) + v1.z * v2.get(2, 0) + v2.get(3, 0),
                        v1.x * v2.get(0, 1) + v1.y * v2.get(1, 1) + v1.z * v2.get(2, 1) + v2.get(3, 1),
                        v1.x * v2.get(0, 2) + v1.y * v2.get(1, 2) + v1.z * v2.get(2, 2) + v2.get(3, 2)
                    );
                }
            } else {
                if(v1.is2D) {
                    return new DVector(
                        v1.x * v2,
                        v1.y * v2
                    );
                } else {
                    return new DVector(
                        v1.x * v2,
                        v1.y * v2,
                        v1.z * v2
                    );
                }
            }
        };
        DVector.prototype.mult = function(v) {
            if(v instanceof DVector) {
                this.x *= v.x;
                this.y *= v.y;
                this.z *= v.z;
            } else if(v instanceof DMatrix || v instanceof DOMMatrix) {
                if(v instanceof DOMMatrix) v = new DMatrix(v);
                let z = this.z ?? 0;
                this.x * v.get(0, 0) + this.y * v.get(1, 0) + z * v.get(2, 0) + v.get(3, 0);
                this.x * v.get(0, 1) + this.y * v.get(1, 1) + z * v.get(2, 1) + v.get(3, 1);
                this.x * v.get(0, 2) + this.y * v.get(1, 2) + z * v.get(2, 2) + v.get(3, 2);
            } else {
                this.x *= v;
                this.y *= v;
                this.z *= v;
            }
            return this;
        };
        DVector.div = function(v1, v2) {
            if(v2 instanceof DVector) {
                if(v1.is2D) {
                    return new DVector(
                        v1.x / v2.x,
                        v1.y / v2.y
                    );
                } else {
                    return new DVector(
                        v1.x / v2.x,
                        v1.y / v2.y,
                        v1.z / v2.z
                    );
                }
            } else {
                if(v1.is2D) {
                    return new DVector(
                        v1.x / v2,
                        v1.y / v2
                    );
                } else {
                    return new DVector(
                        v1.x / v2,
                        v1.y / v2,
                        v1.z / v2
                    );
                }
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
            return this;
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
            return this;
        };
        DVector.angle = function(v) {
            return u.atan2(v.y, v.x);
        };
        DVector.prototype.angle = function() {
            return u.atan2(this.y, this.x);
        };
        DVector.angleBetween = function(v1, v2) {
            return u.atan2(v2.y - v1.y, v2.x - v1.x);
        };
        DVector.prototype.angleBetween = function(v) {
            return DVector.angleBetween(this, v);
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
        DVector.setMag = function(v, mag) {
            v.normalize();
            v.mult(mag);
        };
        DVector.prototype.setMag = function(mag) {
            this.normalize();
            this.mult(mag);
            return this;
        };
        DVector.getRotation = function(v) {
            return u.atan2(v.y, v.x);
        };
        DVector.prototype.getRotation = function() {
            return u.atan2(this.y, this.x);
        };
        DVector.setRotation = function(v, ang) {
            let m = v.mag();
            return new DVector(
                m * u.cos(ang),
                m * u.sin(ang)
            );
        };
        DVector.prototype.setRotation = function(ang) {
            let m = this.mag();
            [this.x, this.y] = [m * u.cos(ang), m * u.sin(ang)];
            return this;
        };
        DVector.rotate = function(v, ang) {
            v.setRotation(v.getRotation() + ang);
        };
        DVector.prototype.rotate = function(ang) {
            this.setRotation(this.getRotation() + ang);
            return this;
        };
        DVector.normalize = function(v) {
            const mag = v.mag();

            if(mag != 0) {
                return DVector.div(v, mag);
            } else {
                return v.get();
            }
        };
        DVector.prototype.normalize = function() {
            const mag = this.mag();
            if(mag != 0) {
                this.div(mag);
            }

            return this;
        };
        DVector.cross = function(v1, v2) {
            return new DVector(
                v1.y * v2.z - v2.y * v1.z,
                v1.z * v2.x - v2.z * v1.x,
                v1.x * v2.y - v2.x * v1.y
            );
        };
        DVector.prototype.cross = function(v) {
            return DVector.cross(this, v);
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
                    Dark.error("Cannot take the dot product of a 2D and 3D vector");
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
            return this;
        };
        DVector.limit = function(v, max) {
            if(v.mag() > max) v.mult(max / v.mag());
            return v;
        };
        DVector.prototype.limit = function(max) {
            if(this.mag() > max) this.mult(max / this.mag());
            return this;
        };
        DVector.lerp = function(v1, v2, percent) {
            return new DVector(
                u.lerp(v1.x, v2.x, percent),
                u.lerp(v1.y, v2.y, percent),
                u.lerp(v1.z, v2.z, percent)
            );
        };
        DVector.prototype.lerp = function(v, percent) {
            this.x = u.lerp(this.x, v.x, percent);
            this.y = u.lerp(this.y, v.y, percent);
            this.z = u.lerp(this.z, v.z, percent);
            return this;
        };
        DVector.abs = function(v) {
            if(v.is2D) {
                return new DVector(
                    Math.abs(v.x),
                    Math.abs(v.y)
                );
            } else {
                return new DVector(
                    Math.abs(v.x),
                    Math.abs(v.y),
                    Math.abs(v.z)
                );
            }
        };
        DVector.prototype.abs = function() {
            [this.x, this.y, this.z] = [Math.abs(this.x), Math.abs(this.y), Math.abs(this.z)];
            return this;
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
                Dark.error("Cannot find the distance between a 2D and 3D DVector");
            }
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        };
        DVector.prototype.dist = function(vector) {
            return DVector.dist(this, vector);
        };
        DVector.applyTransform = function(vector, matrix) {
            return DVector.mult(vector, matrix);
        };
        DVector.prototype.applyTransform = function(matrix) {
            this.mult(matrix);
            return this;
        };
        DVector.get = function(v) {
            return v.get();
        };
        DVector.prototype.get = function() {
            if(this.is2D) {
                return new DVector(this.x, this.y);
            } else {
                return new DVector(this.x, this.y, this.z);
            }
        };
        DVector.set = function(v1, ...args) {
            v1.set.apply(null, args);
        };
        DVector.prototype.set = function(...args) {
            let v = args[0];
            if(Array.isArray(v)) {
                [this.x, this.y, this.z] = v;
            } else if(typeof v == "object") {
                [this.x, this.y, this.z] = [v.x, v.y, v.z];
            } else {
                [this.x, this.y, this.z] = args;
            }
            if(this.is2D) this.z = undefined;

            return this;
        };
        DVector.toArray = function(vector) {
            return vector.toArray();
        };
        DVector.prototype.toArray = function() {
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
        DVector.fromArray = function(arr) {
            return DVector.create.apply(null, arr);
        };
        DVector.prototype.fromArray = function(arr) {
            switch(arr.length) {
                default:
                    Dark.error("DVector.fromArray takes in an array of length 2 or 3, not " + arr.length);
                    break;
                case 2:
                    [this.x, this.y] = arr;
                    this.z = undefined;
                    this.is2D = true;
                    break;
                case 3:
                    [this.x, this.y, this.z] = arr;
                    this.is2D = false;
                    break;
            }
            return this;
        };
        DVector.prototype.toString = function() {
            if(this.is2D) return `[${this.x}, ${this.y}]`;
            return `[${this.x}, ${this.y}, ${this.z}]`;
        };

        // Fonts
        let DFont = function(...args) {
            if(!(this instanceof DFont)) return new (Function.prototype.bind.apply(DFont, [null].concat(...arguments)));

            this.darkObject = true;

            if(args.length > 1) {
                // Order: family, size, weight, style, variant
                this.family = args[0] ?? DFont.defaults.family;
                this.size = args[1] ?? DFont.defaults.size;
                this.weight = args[2] ?? DFont.defaults.weight;
                this.style = args[3] ?? DFont.defaults.style;
                this.variant = args[4] ?? DFont.defaults.variant;
            } else if(typeof args[0] == "string") {
                this.parse(args[0]);
            } else if(typeof args[0] == "object") {
                if(Array.isArray(args)) {
                    let arr = args[0];
                    this.family = arr[0] ?? DFont.defaults.family;
                    this.size = arr[1] ?? DFont.defaults.size;
                    this.weight = arr[2] ?? DFont.defaults.weight;
                    this.style = arr[3] ?? DFont.defaults.style;
                    this.variant = arr[4] ?? DFont.defaults.variant;
                } else {
                    let obj = args[0];
                    this.family = obj.family ?? DFont.defaults.family;
                    this.size = obj.size ?? DFont.defaults.size;
                    this.weight = obj.weight ?? DFont.defaults.weight;
                    this.style = obj.style ?? DFont.defaults.style;
                    this.variant = obj.variant ?? DFont.defaults.variant;
                }
            } else {
                Dark.error("Invalid input to DFont");
            }
        };
        DFont.parse = function(str) {
            return new DFont(str);
        };
        DFont.prototype.parse = function(str) {
            this.style = DFont.defaults.style;
            this.variant = DFont.defaults.variant;
            this.weight = DFont.defaults.weight;
            this.size = DFont.defaults.size;
            this.family = DFont.defaults.family;

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
        DFont.prototype.toString = function() {
            return `${this.style} ${this.weight} ${this.variant} ${this.size}px ${this.family}`;
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
        DFont.defaults = {
            family: "Arial",
            size: 16,
            weight: "normal",
            style: "normal",
            variant: "normal"
        };

        // Images
        let DImage = function(...args) {
            if(!(this instanceof DImage)) return new (Function.prototype.bind.apply(DImage, [null].concat(...arguments)));

            this.darkObject = true;

            this.filters = {};
            this.disposable = false;
            this.sent = false;
            this.loaded = false;
            this.imageLoaded = false;
            this.bitmapLoaded = false;
            this.image = null;
            this.bitmap = null;
            this.loadedFromSource = false;

            if(args[0] instanceof ImageData) {
                this.imageData = args[0];
                this.source = args[1];
                this.width = args[0].width;
                this.height = args[0].height;
                this.canvas = Dark.createCanvas(this.width, this.height);
                this.ctx = this.canvas.getContext("2d");
                this.loadPixels();
            } else if(typeof args[0] == "number" && typeof args[1] == "number") { // width & height
                this.width = args[0];
                this.height = args[1];
                this.source = args[2];
                this.imageData = new ImageData(this.width, this.height);
                this.canvas = Dark.createCanvas(this.width, this.height);
                this.ctx = this.canvas.getContext("2d");
            } else if(args[0] instanceof off || args[0] instanceof HTMLCanvasElement) {
                this.width = args[0].width;
                this.height = args[0].height;
                this.source = args[1];
                this.canvas = args[0];
                this.ctx = this.canvas.getContext("2d");
                this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
            } else if(args[0] instanceof Dark) {
                this.width = args[0].width;
                this.height = args[0].height;
                this.source = args[0];
                this.canvas = Dark.createCanvas(this.width, this.height);
                this.ctx = this.canvas.getContext("2d");
                this.ctx.drawImage(args[0].canvas, 0, 0, this.width, this.height, 0, 0, this.width, this.height);
                this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
            } else {
                this.imageData = null;
                this.source = args[0];
                this.width = 0;
                this.height = 0;
            }
        };
        DImage.prototype.get = function(...args) {
            switch(args.length) {
                default:
                    return Dark.error("DImage.get requires 0 or 4 parameters, not " + args.length);
                case 0:
                    return this.copy();
                case 4:
                    return new DImage(
                        this.ctx.getImageData(args[0], args[1], args[2], args[3]),
                        this.source
                    );
            }
        };
        DImage.prototype.set = function(x, y, col) {
            let index = (x + y * this.width) * 4;
            this.imageData.data[index] = u.red(col);
            this.imageData.data[index + 1] = u.green(col);
            this.imageData.data[index + 2] = u.blue(col);
            this.imageData.data[index + 3] = u.alpha(col);
            return this;
        };
        DImage.prototype.copy = function() {
            let img = new DImage();
            [img.width, img.height, img.imageData, img.source, img.disposable, img.sourceURL, img.loadComplete, img.loadedFromSource] = [this.width, this.height, this.imageData, this.source, this.disposable, this.sourceURL, this.loadComplete, this.loadedFromSource];
            img.canvas = Dark.createCanvas(this.width, this.height);
            img.ctx = img.canvas.getContext("2d");
            img.ctx.drawImage(this.getRenderable(), 0, 0, this.width, this.height, 0, 0, this.width, this.height);
            return img;
        };
        DImage.prototype.getRenderable = function() {
            return this.loaded ? (this.image ?? this.bitmap) : this.canvas;
        };
        DImage.prototype.checkLoad = function() {
            let valid = !this.loadedFromSource || this.loadComplete;
            if(!valid) Dark.error("Cannot draw the image until loaded, put inside the setup or draw function instead");
            return valid;
        };
        DImage.resize = function(img, width, height) {
            let newImg = img.copy();
            newImg.setDisposability(true);
            newImg.resize(width, height);
            return newImg;
        };
        DImage.prototype.resize = function(width, height) {
            if(width == 0 || height == 0) return Dark.error("Image resize size must be greater than zero");
            if(this.width != width || this.height != height) {
                if(this.source instanceof Dark && arguments.length == 1) {
                    if(this.source.settings.resizeMode == this.source.constants.HEIGHT) {
                        [width, height] = [width / img.height * img.width, width];
                    } else {
                        [width, height] = [width, width / img.width * img.height];
                    }
                }
                [width, height] = [Math.ceil(width), Math.ceil(height)];

                // Save pixels
                let oldCanvas = Dark.createCanvas(this.width, this.height);
                let oldCtx = oldCanvas.getContext("2d");
                oldCtx.drawImage(this.getRenderable(), 0, 0, this.width, this.height, 0, 0, this.width, this.height);

                // Resize dimensions
                [this.canvas.width, this.canvas.height] = [this.width, this.height] = [width, height];

                // Redraw
                this.ctx.fillRect(0, 0, width, height);
                this.ctx.drawImage(oldCanvas, 0, 0, width, height, 0, 0, width, height);

                this.loadImage();
            }
            return this;
        };
        DImage.crop = function(img, x, y, width, height) {
            let newImg = img.copy();
            newImg.setDisposability(true);
            newImg.crop(x, y, width, height);
            return newImg;
        };
        DImage.prototype.crop = function(x, y, width, height) {
            if(width <= 0 || height <= 0) return Dark.error("The image crop area must have a size greater than zero");
            if(x + width > this.width || y + height > this.height || x < 0 || y < 0) return Dark.error("The cropped area must be within the image");
            if(this.width != width || this.height != height) {
                if(this.source instanceof Dark && arguments.length == 3) {
                    if(this.source.settings.resizeMode == this.source.constants.HEIGHT) {
                        [width, height] = [width / img.height * img.width, width];
                    } else {
                        [width, height] = [width, width / img.width * img.height];
                    }
                }

                // Save pixels
                let oldCanvas = Dark.createCanvas(this.width, this.height);
                let oldCtx = oldCanvas.getContext("2d");
                oldCtx.drawImage(this.getRenderable(), 0, 0, this.width, this.height, 0, 0, this.width, this.height);

                // Resize dimensions
                [this.canvas.width, this.canvas.height] = [this.width, this.height] = [width, height];

                // Redraw
                this.ctx.drawImage(oldCanvas, x, y, width, height, 0, 0, width, height);

                this.loadImage();
            }
            return this;
        };
        DImage.prototype.loadPixels = function() {
            this.ctx.putImageData(this.imageData, 0, 0);
            return this;
        };
        DImage.prototype.updatePixels = function() {
            this.imageData.data.set(this.ctx.getImageData(0, 0, this.width, this.height).data);
            return this;
        };
        DImage.prototype.setDisposability = function(disposable) {
            this.disposable = disposable;
            return this;
        };
        DImage.filter = function(img, type, value) {
            let newImg = img.copy();
            newImg.filter(type, value);
            return newImg;
        };
        DImage.prototype.filter = function(type, value) {
            if(Dark.filters.includes(type)) {
                const filter = DImage.filterShaders[type];
                let f = this.filters;

                f.gl_canvas = DImage.gl_canvas;
                f.gl = DImage.gl;
                f.program = filter.program;

                if(f.gl_canvas.width != this.width || f.gl_canvas.height != this.height) {
                    [f.gl_canvas.width, f.gl_canvas.height] = [this.width, this.height];
                    f.gl.viewport(0, 0, this.width, this.height);
                }

                f.gl.useProgram(f.program);

                f.tris = f.gl.createBuffer();
                f.gl.bindBuffer(f.gl.ARRAY_BUFFER, f.tris);
                f.gl.bufferData(f.gl.ARRAY_BUFFER, DImage.texData, f.gl.STATIC_DRAW);

                f.trisIndex = f.gl.createBuffer();
                f.gl.bindBuffer(f.gl.ELEMENT_ARRAY_BUFFER, f.trisIndex);
                f.gl.bufferData(f.gl.ELEMENT_ARRAY_BUFFER, DImage.texIndices, f.gl.STATIC_DRAW);

                f.fs = Float32Array.BYTES_PER_ELEMENT;

                f.posAttribLocation = f.gl.getAttribLocation(f.program, "vertPos");
                f.uvAttribLocation = f.gl.getAttribLocation(f.program, "vertUV");

                f.gl.vertexAttribPointer(
                    f.posAttribLocation, // location
                    2, // parameter count (vec2)
                    f.gl.FLOAT, // type
                    f.gl.FALSE, // normalized?
                    4 * f.fs, // byte input size
                    0 // byte offset
                );
                f.gl.vertexAttribPointer(
                    f.uvAttribLocation,
                    2,
                    f.gl.FLOAT,
                    f.gl.FALSE,
                    4 * f.fs,
                    2 * f.fs
                );

                f.gl.enableVertexAttribArray(f.posAttribLocation);
                f.gl.enableVertexAttribArray(f.uvAttribLocation);

                // Size of image, width by height.
                f.sizeUniformLocation = f.gl.getUniformLocation(f.program, "size");
                f.gl.uniform2f(f.sizeUniformLocation, this.width, this.height); // floats bc then I don't have to convert

                // If it has many kernels
                if(filter.multikernel) {
                    if(!Object.keys(filter.multikernel).includes(String(value))) value = filter.defaultShader;

                    f.kernelUniformLocation = f.gl.getUniformLocation(f.program, "kernel");
                    f.gl.uniform1fv(f.kernelUniformLocation, filter.multikernel[value]);
                } else {
                    // If the filter has a parameter
                    if(filter.param) {
                        // Constrain between min and max, otherwise set to default if not defined
                        if(value != undefined) {
                            value = u.constrain(value, filter.param.min, filter.param.max);
                        } else {
                            value = filter.param.default;
                        }
                        f.paramUniformLocation = f.gl.getUniformLocation(f.program, "param");
                        f.gl.uniform1f(f.paramUniformLocation, value);
                    }
                }

                f.applied ??= [];
                f.applied.push({filter: type, parameter: value});

                f.texture = f.gl.createTexture();

                // ST instead of UV coords
                f.gl.bindTexture(f.gl.TEXTURE_2D, f.texture);
                f.gl.texParameteri(f.gl.TEXTURE_2D, f.gl.TEXTURE_WRAP_S, f.gl.CLAMP_TO_EDGE);
                f.gl.texParameteri(f.gl.TEXTURE_2D, f.gl.TEXTURE_WRAP_T, f.gl.CLAMP_TO_EDGE);
                f.gl.texParameteri(f.gl.TEXTURE_2D, f.gl.TEXTURE_MIN_FILTER, f.gl.LINEAR);
                f.gl.texParameteri(f.gl.TEXTURE_2D, f.gl.TEXTURE_MAG_FILTER, f.gl.LINEAR);
                f.gl.texImage2D(f.gl.TEXTURE_2D, 0, f.gl.RGBA, f.gl.RGBA, f.gl.UNSIGNED_BYTE, this.getRenderable());
                f.gl.bindTexture(f.gl.TEXTURE_2D, null);

                // Bind texture
                f.gl.bindTexture(f.gl.TEXTURE_2D, f.texture);
                f.gl.activeTexture(f.gl.TEXTURE0);

                f.gl.clear(f.gl.COLOR_BUFFER_BIT | f.gl.DEPTH_BUFFER_BIT);

                f.gl.drawElements(
                    f.gl.TRIANGLES, // type
                    DImage.texIndices.length, // vertex count
                    f.gl.UNSIGNED_SHORT, // index type
                    0 // skip count
                );

                let buffer = new Uint8ClampedArray(this.width * this.height * 4);
                f.gl.readPixels(0, 0, this.width, this.height, f.gl.RGBA, f.gl.UNSIGNED_BYTE, buffer);

                this.imageData.data.set(buffer);
                this.ctx.putImageData(this.imageData, 0, 0);

                // Load to image, drawing images is faster
                this.loadImage();
            } else {
                return Dark.error("Invalid filter type");
            }
            return this;
        };
        DImage.texData = new Float32Array([ // rectangle = 2 triangles, UV mapped
            // Position, UV
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            1, 1, 1, 1
        ]);
        DImage.texIndices = new Uint16Array([
            // Triangle #1
            0, 1, 2,
            // Triangle #2
            1, 2, 3
        ]);
        DImage.globalVertexShader = Dark.loadFile("/filters/global.vert");
        DImage.filterShaders = [];
        DImage.gl_canvas = Dark.createCanvas(0, 0);
        DImage.gl = DImage.gl_canvas.getContext("webgl2", {antialias: false});
        DImage.initializeShaders = function(arr) {
            let gl = DImage.gl;
            let vertexSource = DImage.globalVertexShader;

            if(!gl) return Dark.warn("Your browser does not support WebGL2.");

            arr.forEach(function(obj) {
                let shader = Dark.loadFile(`/filters/${obj.shader}.frag`);

                let fragmentSource = shader;

                let vertexShader = gl.createShader(gl.VERTEX_SHADER);
                let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

                gl.shaderSource(vertexShader, vertexSource);
                gl.shaderSource(fragmentShader, fragmentSource);

                gl.compileShader(vertexShader);
                gl.compileShader(fragmentShader);

                // Check for compiler errors, very nice for debugging
                if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                    return Dark.error("Error compiling vertex shader.\n\n" + gl.getShaderInfoLog(vertexShader));
                }
                if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                    return Dark.error("Error compiling fragment shader.\n\n" + gl.getShaderInfoLog(fragmentShader));
                }

                let program = gl.createProgram();

                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);

                gl.linkProgram(program);

                // Check for more errors
                if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                    return Dark.error("Error linking program.\n\n" + gl.getProgramInfoLog(program));
                }
                gl.validateProgram(program);
                if(!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
                    return Dark.error("Error validating program.\n\n" + gl.getProgramInfoLog(program));
                }

                DImage.filterShaders[obj.key] = {
                    shader: shader,
                    param: obj.param,
                    program: program,
                    multikernel: obj.multikernel,
                    defaultShader: obj.defaultShader
                };
            });
        };
        DImage.prototype.generateImage = function(blob) {
            this.image = new Image();
            this.image.src = URL.createObjectURL(blob);
            this.image.crossOrigin = "anonymous";
            this.image.addEventListener("load", () => {
                this.imageLoaded = true;

                // All loaded
                if(this.bitmapLoaded) {
                    this.loaded = true;
                    this.sent = false;
                }
            }); // Load
        };
        DImage.prototype.generateBitmap = function() {
            createImageBitmap(this.canvas).then(bitmap => {
                this.bitmap = bitmap;
                this.bitmapLoaded = true;

                // All loaded
                if(this.imageLoaded) {
                    this.loaded = true;
                    this.sent = false;
                }
            });
        };
        DImage.animationFrames = [];
        DImage.awaitAnimationFrame = function() {
            let promiseResolve;
            let promise = new Promise(resolve => {
                promiseResolve = resolve;
            });
            DImage.animationFrames.push({
                promise: promise,
                resolve: promiseResolve
            });
            return promise;
        };
        DImage.raf = function() {
            DImage.animationFrames.forEach(request => request.resolve());
            requestAnimationFrame(DImage.raf);
        };
        DImage.prototype.loadImage = function() {
            // Reset
            this.image = null;
            this.loaded = false;
            this.imageLoaded = false;
            this.bitmapLoaded = false;

            if(!Dark.khan && !this.disposable && !this.sent) {
                this.sent = true;

                // Wait until canvas has rendered
                DImage.awaitAnimationFrame().then(() => {
                    // Generate bitmap image
                    this.generateBitmap();

                    // Convert to blob 
                    if(this.canvas instanceof HTMLCanvasElement) {
                        this.canvas.toBlob((...args) => this.generateImage.apply(this, args), {type: "image/png"});
                    } else {
                        this.canvas.convertToBlob({type: "image/png"}).then(blob => this.generateImage(blob));
                    }
                });
            }
        };
        DImage.prototype.toDataArray = function() {
            return [...(this.imageData ?? {data: []}).data];
        };
        DImage.get = (img, ...args) => img.get.apply(null, args);
        DImage.set = (img, ...args) => img.set.apply(null, args);
        DImage.copy = img => img.copy();
        DImage.getRenderable = img => img.getRenderable();
        DImage.loadPixels = img => img.loadPixels();
        DImage.updatePixels = img => img.updatePixels();
        DImage.setDisposability = (img, disposable) => img.setDisposability(disposable);
        DImage.toDataArray = img => img.toDataArray();
        DImage.initializeShaders([
            {
                key: Dark.constants.INVERT,
                shader: "invert"
            }, {
                key: Dark.constants.OPAQUE,
                shader: "opaque"
            }, {
                key: Dark.constants.GRAY,
                shader: "grayscale"
            }, {
                key: Dark.constants.ERODE,
                shader: "erode"
            }, {
                key: Dark.constants.DILATE,
                shader: "dilate"
            }, {
                key: Dark.constants.THRESHOLD,
                shader: "threshold",
                param: {
                    min: 0,
                    max: 1,
                    default: 0.5
                }
            }, {
                key: Dark.constants.POSTERIZE,
                shader: "posterize",
                param: {
                    min: 2,
                    max: 255,
                    default: 255
                }
            }, {
                key: Dark.constants.BLUR,
                shader: "blur",
                param: {
                    min: 0,
                    max: 25,
                    default: 1
                }
            }, {
                key: Dark.constants.SHARPEN,
                shader: "sharpen"
            }, {
                key: Dark.constants.SEPIA,
                shader: "sepia"
            }, {
                key: Dark.constants.OUTLINE,
                shader: "outline"
            }, {
                key: Dark.constants.SWIRL,
                shader: "swirl",
                param: {
                    min: 0,
                    max: 12,
                    default: 4
                }
            }, {
                key: Dark.constants.EDGE,
                shader: "edge"
            }, {
                key: Dark.constants.CONTRAST,
                shader: "contrast",
                param: {
                    min: 0,
                    max: 15,
                    default: 3
                }
            }, {
                key: Dark.constants.VIGNETTE,
                shader: "vignette",
                param: {
                    min: 0,
                    max: 1,
                    default: 0.5
                }
            }, {
                key: Dark.constants.BRIGHTNESS,
                shader: "brightness",
                param: {
                    min: -1,
                    max: 1,
                    default: 0
                }
            }, {
                key: Dark.constants.BLACK,
                shader: "black",
                param: {
                    min: 0,
                    max: 1,
                    default: 0
                }
            }, {
                key: Dark.constants.WHITE,
                shader: "white",
                param: {
                    min: 0,
                    max: 1,
                    default: 1
                }
            }, {
                key: Dark.constants.NORMALIZE,
                shader: "normalize"
            }, {
                key: Dark.constants.BOX,
                shader: "box",
                param: {
                    min: 0,
                    max: 25,
                    default: 1
                }
            }, {
                key: Dark.constants.TRANSPARENCY,
                shader: "transparency",
                param: {
                    min: 0,
                    max: 1,
                    default: 0
                }
            }, {
                key: Dark.constants.PIXELATE,
                shader: "pixelate",
                param: {
                    min: 1,
                    max: 5000,
                    default: 1
                }
            }, {
                key: Dark.constants.FISHEYE,
                shader: "fisheye",
                param: {
                    min: 0,
                    max: 1,
                    default: 1
                }
            }, {
                key: Dark.constants.EMBOSS,
                shader: "emboss"
            }, {
                key: Dark.constants.SOBEL,
                shader: "sobel",
                multikernel: Object.fromEntries([
                    [Dark.constants.TOP, [
                        1.0, 2.0, 1.0,
                        0.0, 0.0, 0.0,
                        -1.0, -2.0, -1.0
                    ]],
                    [Dark.constants.BOTTOM, [
                        -1.0, -2.0, -1.0,
                        0.0, 0.0, 0.0,
                        1.0, 2.0, 1.0
                    ]],
                    [Dark.constants.LEFT, [
                        1.0, 0.0, -1.0,
                        2.0, 0.0, -2.0,
                        1.0, 0.0, -1.0
                    ]],
                    [Dark.constants.RIGHT, [
                        -1.0, 0.0, 1.0,
                        -2.0, 0.0, 2.0,
                        -1.0, 0.0, 1.0
                    ]]
                ]),
                defaultShader: Dark.constants.TOP
            }
        ]);
        requestAnimationFrame(DImage.raf);

        // Matrices
        let DMatrix = function(width, height, val = 0) {
            if(!(this instanceof DMatrix)) return new (Function.prototype.bind.apply(DMatrix, [null].concat(...arguments)));

            this.darkObject = true;

            // https://stackoverflow.com/questions/53992415/how-to-fill-multidimensional-array-in-javascript
            if(width instanceof DMatrix) {
                this.width = width.width;
                this.height = width.height;
                this.mat = Array(this.height).fill(null).map(() => Array(this.width).fill(0));
                this.set(width);
            } else if(Array.isArray(width)) {
                this.mat = Array(this.height).fill(null).map(() => Array(this.width).fill(0));
                if(Array.isArray(width[0])) {
                    if(arguments.length == 1) {
                        this.width = width[0].length;
                        this.height = width.length;
                        this.set(width);
                    } else {
                        this.width = arguments.length;
                        this.height = width[0].length;
                        this.set([...arguments]);
                    }
                } else {
                    this.width = height;
                    this.height = val;
                    this.set(width);
                }
            } else if(width instanceof DOMMatrix) {
                this.width = 4;
                this.height = 4;
                this.mat = [
                    [width.m11, width.m21, width.m31, width.m41],
                    [width.m12, width.m22, width.m32, width.m42],
                    [width.m13, width.m23, width.m33, width.m43],
                    [width.m14, width.m24, width.m34, width.m44]
                ];
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
            return this;
        };
        DMatrix.dot = function(mat1, mat2, row, col) {
            if(mat1.width == mat2.height) {
                let sum = 0;
                for(let i = 0; i < mat1.width; i++) { // Either mat1.width or mat2.height
                    sum += mat1.get(i, row) * mat2.get(col, i);
                }
                return sum;
            } else {
                Dark.error("Can only take the dot product of two DMatrices  with equal width and height");
            }
        };
        DMatrix.prototype.dot = function(matrix) {
            return DMatrix.dot(this, matrix);
        };
        DMatrix.identity = function(size) {
            let mat = new DMatrix(size, size);
            for(let i = 0; i < size; i++) mat.set(i, i, 1);
            return mat;
        };
        DMatrix.prototype.identity = function() {
            if(this.width == this.height) {
                this.mat = DMatrix.identity(this.width).mat; // this.width or this.height, both work
            } else {
                Dark.error("Only DMatrices with square dimensions have identity DMatrices");
            }
            return this;
        };
        DMatrix.transpose = function(matrix) {
            let newMatrix = matrix.copy();
            newMatrix.transpose();
            return newMatrix;
        };
        DMatrix.prototype.transpose = function() {
            this.mat = Array(this.width).fill().map((_, x) => Array(this.height).fill().map((_, y) => this.mat[y][x]));
            [this.width, this.height] = [this.height, this.width];
            return this;
        };
        DMatrix.normalize = function(matrix) {
            let newMatrix = matrix.copy();
            newMatrix.normalize();
            return newMatrix;
        };
        DMatrix.prototype.normalize = function() {
            let weight = this.getWeight();
            this.mat = this.mat.map(arr => arr.map(e => e / weight));
            return this;
        };
        DMatrix.round = function(matrix, place) {
            let newMatrix = matrix.copy();
            newMatrix.round(place);
            return newMatrix;
        };
        DMatrix.prototype.round = function(place = 0) {
            let val = 10 ** place;
            this.mat = this.mat.map(arr => arr.map(e => Math.round(e * val) / val));
            return this;
        };
        DMatrix.translate = function(matrix, x, y) {
            let newMatrix = matrix.copy();
            newMatrix.translate(x, y);
            return newMatrix;
        };
        DMatrix.prototype.translate = function(x, y) {
            let mat = this.toDOMMatrix();
            mat.translateSelf(x, y);
            this.fromDOMMatrix(mat);
            return this;
        };
        DMatrix.rotate = function(matrix, angle) {
            let newMatrix = matrix.copy();
            newMatrix.rotate(angle);
            return newMatrix;
        };
        DMatrix.prototype.rotate = function(angle) {
            let mat = this.toDOMMatrix();
            mat.rotateSelf(angle);
            this.fromDOMMatrix(mat);
            return this;
        };
        DMatrix.scale = function(matrix, w, h) {
            let newMatrix = matrix.copy();
            newMatrix.scale(w, h);
            return newMatrix;
        };
        DMatrix.prototype.scale = function(w, h = w) {
            let mat = this.toDOMMatrix();
            mat.scaleSelf(w, h);
            this.fromDOMMatrix(mat);
            return this;
        };
        DMatrix.skew = function(matrix, h, v) {
            let newMatrix = matrix.copy();
            newMatrix.skew(h, v);
            return newMatrix;
        };
        DMatrix.prototype.skew = function(h, v = 0) {
            let mat = this.toDOMMatrix();
            mat.skewYSelf(h * 0.01);
            mat.skewXSelf(v * 0.01);
            this.fromDOMMatrix(mat);
            return this;
        };
        DMatrix.translateX = function(matrix, x) {
            let newMatrix = matrix.copy();
            newMatrix.translateX(x);
            return newMatrix;
        };
        DMatrix.prototype.translateX = function(x) {
            this.translate(x, 0);
            return this;
        };
        DMatrix.translateY = function(matrix, y) {
            let newMatrix = matrix.copy();
            newMatrix.translateY(y);
            return newMatrix;
        };
        DMatrix.prototype.translateY = function(y) {
            this.translate(0, y);
            return this;
        };
        DMatrix.scaleX = function(matrix, x) {
            matrix.scaleX(x);
            let newMatrix = matrix.copy();
            newMatrix.scaleX(x);
            return newMatrix;
        };
        DMatrix.prototype.scaleX = function(x) {
            this.scale(x, 1);
            return this;
        };
        DMatrix.scaleY = function(matrix, y) {
            let newMatrix = matrix.copy();
            newMatrix.scaleY(y);
            return newMatrix;
        };
        DMatrix.prototype.scaleY = function(y) {
            this.scale(y, 1);
            return this;
        };
        DMatrix.skewX = function(matrix, x) {
            let newMatrix = matrix.copy();
            newMatrix.skewX(x);
            return newMatrix;
        };
        DMatrix.prototype.skewX = function(x) {
            this.skew(x, 0);
            return this;
        };
        DMatrix.skewY = function(matrix, y) {
            let newMatrix = matrix.copy();
            newMatrix.skewY(y);
            return newMatrix;
        };
        DMatrix.prototype.skewY = function(y) {
            this.skew(0, y);
            return this;
        };
        DMatrix.add = function(mat1, mat2) {
            if(typeof mat2 == "number") {
                let mat = new DMatrix(mat1.width, mat1.height);
                for(let y = 0; y < mat.height; y++) {
                    for(let x = 0; x < mat.width; x++) {
                        mat.set(y, x, mat1.get(x, y) + mat2);
                    }
                }
                return mat;
            } else if(mat1.width == mat2.width && mat1.height == mat2.height) {
                let mat = new DMatrix(mat1.width, mat1.height);
                for(let y = 0; y < mat.height; y++) {
                    for(let x = 0; x < mat.width; x++) {
                        mat.set(y, x, mat1.get(x, y) + mat2.get(x, y));
                    }
                }
                return mat;
            } else {
                Dark.error("Cannot add two DMatrices with different dimensions");
            }
        };
        DMatrix.prototype.add = function(matrix) {
            this.set(DMatrix.add(this, matrix));
            return this;
        };
        DMatrix.sub = function(mat1, mat2) {
            if(typeof mat2 == "number") {
                let mat = new DMatrix(mat1.width, mat1.height);
                for(let y = 0; y < mat.height; y++) {
                    for(let x = 0; x < mat.width; x++) {
                        mat.set(y, x, mat1.get(x, y) - mat2);
                    }
                }
                return mat;
            } else if(mat1.width == mat2.width && mat1.height == mat2.height) {
                let mat = new DMatrix(mat1.width, mat1.height);
                for(let y = 0; y < mat.height; y++) {
                    for(let x = 0; x < mat.width; x++) {
                        mat.set(y, x, mat1.get(x, y) - mat2.get(x, y));
                    }
                }
                return mat;
            } else {
                Dark.error("Cannot subtract two DMatrices with different dimensions");
            }
        };
        DMatrix.prototype.sub = function(matrix) {
            this.set(DMatrix.sub(this, matrix));
            return this;
        };
        DMatrix.mult = function(mat1, mat2) {
            if(typeof mat2 == "number") {
                let mat = new DMatrix(mat1.width, mat1.height);
                for(let y = 0; y < mat.height; y++) {
                    for(let x = 0; x < mat.width; x++) {
                        mat.set(y, x, mat1.get(x, y) * mat2);
                    }
                }
                return mat;
            } else if(mat1.width == mat2.height) {
                let mat = new DMatrix(mat2.width, mat1.height);
                for(let y = 0; y < mat.height; y++) {
                    for(let x = 0; x < mat.width; x++) {
                        mat.set(x, y, DMatrix.dot(mat1, mat2, y, x));
                    }
                }
                return mat;
            } else {
                Dark.error("Can only multiply two DMatrices with equal width and height");
            }
        };
        DMatrix.prototype.mult = function(matrix) {
            let mat = DMatrix.mult(this, matrix);
            this.width = mat.width;
            this.height = mat.height;
            this.mat = mat.mat;
            return this;
        };
        DMatrix.getWeight = function(matrix) {
            return matrix.getWeight();
        };
        DMatrix.prototype.getWeight = function() {
            return this.toArray().reduce((sum, value) => sum += value, 0);
        };
        DMatrix.copy = function(matrix) {
            return new DMatrix([...matrix.mat]);
        };
        DMatrix.prototype.copy = function() {
            return new DMatrix([...this.mat]);
        };
        DMatrix.fromDOMMatrix = function(matrix) {
            if(matrix instanceof DOMMatrix) {
                return new DMatrix(matrix);
            } else {
                Dark.error(`${matrix} is not a DOMMatrix`);
            }
        };
        DMatrix.prototype.fromDOMMatrix = function(matrix) {
            if(matrix instanceof DOMMatrix) {
                this.width = 4;
                this.height = 4;
                this.mat = new DMatrix(matrix).mat;
            } else {
                Dark.error(`${matrix} is not a DOMMatrix`);
            }
            return this;
        };
        DMatrix.toDOMMatrix = function(matrix) {
            return matrix.toDOMMatrix();
        };
        DMatrix.prototype.toDOMMatrix = function() {
            return new DOMMatrix([
                this.get(0, 0),
                this.get(0, 1),
                this.get(1, 0),
                this.get(1, 1),
                this.get(3, 0),
                this.get(3, 1)
            ]);
        };
        DMatrix.prototype.toArray2D = function() {
            return [...this.mat];
        };
        DMatrix.prototype.toArray = function() {
            return [...this.mat.flat(1)];
        };
        DMatrix.prototype.toString = function() {
            let str = "";
            for(const arr in this.mat) {
                for(const item in this.mat[arr]) {
                    str += this.mat[arr][item].toFixed(2) + " ";
                }
                str = str.replace(/ $/, "\n");
            }
            return str;
        };

        // Psuedo-Random Number Generator
        let DRandom = function(seed = Math.random() * 1000000) {
            if(!(this instanceof DRandom)) return new (Function.prototype.bind.apply(DRandom, [null].concat(...arguments)));

            this.darkObject = true;

            this.seed = seed;
            this.a = 0x9AF1B04258D;
            this.b = 0xC6E35F;
            this.c = 0x198A660DA;
            this.d = seed * 0xFE05D3;
        };
        DRandom.prototype.next = function() {
            let t = this.b << 9;
            let r = this.a + this.d;
            r = (r << 7 | r >>> 25) + this.a;
            this.c ^= this.a;
            this.d ^= this.b;
            this.b ^= this.c;
            this.a ^= this.d;
            this.c ^= t;
            this.d = this.d << 11 | this.d >>> 21;
            return (r >>> 0) / 4294967296;
        };
        DRandom.copy = function(rand) {
            return rand.copy();
        };
        DRandom.prototype.copy = function() {
            let rand = new DRandom(this.seed);
            [rand.a, rand.b, rand.c, rand.d] = [this.a, this.b, this.c, this.d];
            return rand;
        };
        DRandom.create = function(seed) {
            return new DRandom(seed);
        };

        // Timer
        let DTimer = function() {
            if(!(this instanceof DTimer)) return new (Function.prototype.bind.apply(DTimer, [null].concat(...arguments)));

            this.darkObject = true;
            this.reset();
        };
        DTimer.prototype.start = function() {
            if(this.begin == null) {
                this.begin = performance.now();
            } else {
                Dark.error("DTimer.reset must be called before a new timer begins");
            }
            return this;
        };
        DTimer.prototype.stop = function() {
            if(this.start == null) {
                Dark.error("DTimer.start must be called before DTimer.error");
            } else {
                this.end = performance.now();
                this.time = this.end - this.begin;
            }
            return this;
        };
        DTimer.prototype.reset = function() {
            this.begin = null;
            this.end = null;
            this.time = null;
            return this;
        };
        DTimer.prototype.copy = function() {
            let timer = new DTimer();
            [timer.start, timer.end, timer.time] = [this.begin, this.end, this.time];

            return timer;
        };
        DTimer.prototype.toString = function() {
            if(this.start == null) {
                return `From ${this.begin.toFixed(2)} to ${this.end.toFixed(2)}, taking ${this.time.toFixed(2)} milliseconds`;
            } else {
                return "The timer has yet to begin";
            }
        };
        DTimer.prototype.getSecond = function() {
            return this.time / 1000;
        };
        DTimer.prototype.getMillis = function() {
            return this.time;
        };
        DTimer.prototype.getMicro = function() {
            return this.time * 1000;
        };
        DTimer.prototype.getNano = function() {
            return this.time * 1000000;
        };
        DTimer.prototype.getFPS = function() {
            return 1000 / this.time;
        };
        DTimer.time = function(func) {
            let start = performance.now();
            func();
            return performance.now() - start;
        };
        DTimer.start = timer => void (timer.start());
        DTimer.stop = timer => void (timer.stop());
        DTimer.reset = timer => void (timer.reset());
        DTimer.copy = timer => timer.copy();
        DTimer.toString = timer => timer.toString();

        // ID Generator
        let DIdentification = function() {
            if(!(this instanceof DIdentification)) return new (Function.prototype.bind.apply(DIdentification, [null].concat(...arguments)));

            this.darkObject = true;

            this.id = (++DIdentification.current).toString(36);
        };
        DIdentification.current = BigInt(Math.abs(Math.floor((Math.random() * (36 ** 10) + Date.now() ** 3) / 1e20))) << BigInt(Math.floor(Math.random() * 10));

        let DGradient = function(...args) {
            if(!(this instanceof DGradient)) return new (Function.prototype.bind.apply(DGradient, [null].concat(...arguments)));

            this.darkObject = true;

            this.stops = [];
            this.mode = Dark.constants.LINEAR;

            let increment = 1 / args.length;
            args.forEach((color, index) => this.stops.push({
                position: increment * index,
                value: color
            }));
        };
        DGradient.prototype.setMode = function(mode) {
            switch(mode) {
                default:
                    Dark.error("Invalid DGradient mode");
                    break;
                case Dark.constants.LINEAR:
                    this.mode = Dark.constants.LINEAR;
                    break;
                case Dark.constants.RADIAL:
                    this.mode = Dark.constants.RADIAL;
                    break;
                case Dark.constants.CONIC:
                    this.mode = Dark.constants.CONIC;
                    break;
            }
            return this;
        };
        DGradient.prototype.toCanvasGradient = function() {
            let gradient = u.ctx.createLinearGradient(0, 0, 1, 0);
            this.stops.forEach(stop => gradient.addColorStop(stop.position, `rgba(${u.red(stop.value)}, ${u.green(stop.value)}, ${u.blue(stop.value)}, ${u.alpha(stop.value) / 255})`));
            return gradient;
        };

        /*
        
        DColor feature ideas:
    
        convert(color, colorSpace1, colorSpace2);
        mode
        setRed(value);
        setGreen(value);
        setBlue(value);
        setAlpha(value);
    
        */

        return {
            Dark: Dark,
            DVector: DVector,
            DFont: DFont,
            DImage: DImage,
            DMatrix: DMatrix,
            DRandom: DRandom,
            DTimer: DTimer,
            DIdentification: DIdentification,
            DGradient: DGradient
        };

    })();

    // Focused element
    Dark.focus = {};

    document.addEventListener("click", e => {
        Dark.focus.target = e.target;
        Dark.focus.time = performance.now();
    });

    // For KA
    Dark.startTime = performance.now();

    let u = Dark.utils = new Dark(true); // Dummy instance for utils
    Dark.default = new Dark(); // Default Dark instance
    Dark.setMain(Dark.default); // Set default to main
    Dark.globallyUpdateVariables(Dark.main); // First load of variables
    Dark.defineConstants(); // Load constants and objects

    // Compile for Khan Academy since all files are blocked :(
    Dark.compileKA();

    // Freeze objects
    Object.freeze(Dark);

    console.log(window);
    console.log(win);

})(window);
