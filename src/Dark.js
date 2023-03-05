if(window.Dark) throw "There is more than one Dark.js import"; // Stop multiple imports

var Dark = function(dummy = false) {
    if(!(this instanceof Dark)) throw "Dark can only be called with the new operator"; // Dark() = bad, new Dark() = good

    this.darkObject = true;

    // private variables & functions
    let lastFrame = performance.now();
    let lastTime = performance.now();
    let lastHidden = -1;

    // Shorter = faster to typing time
    let d = this;
    let k = d.constants = Dark.constants;

    Dark.instances.push(d);

    d.info = {
        id: Math.floor(Math.random() * 1000000),
        initializationTime: performance.now(),
        version: Dark.version
    };

    d.settings = {};
    d.transforms = [];
    d.saves = [];
    d.vertices = [];
    d.vertexCache = [];
    d.imageCache = {};
    d.cachedImageCount = 0;
    d.successfullyCachedImageCount = 0;
    d.loaded = false;
    d.began = false;
    d.objects = Dark.objects;

    // copy over
    d.copy = Dark.copy;
    d.format = Dark.format;

    // Random number generator
    d.randomGenerator = d.objects.DRandom.create();

    // Is a dummy instance?
    d.dummy = dummy;

    // Load in variables to their default values
    for(const key in Dark.variables) {
        d[key] = Dark.variables[key];
    }

    d.isMain = false;

    // Create canvas
    d.canvas = new OffscreenCanvas(innerWidth, innerHeight);
    d.ctx = d.canvas.getContext("2d", Dark.defaultContextSettings);

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

    var rounda = val => Math.abs(Math.round(val));

    var cacheVert = function(vert) {
        d.vertices.push(vert);
        vert.points.forEach(v => d.vertexCache.push(d.objects.DVector.create(v.x, v.y)));
    };

    var loadEvents = function() {

        document.addEventListener("keydown", function(e) {
            e.preventDefault();
            d.keyIsPressed = true;
            d.key = e.key;
            d.keyCode = e.keyCode;
            Dark.globallyUpdateVariables(d);
            if(/\w/.test(String.fromCharCode(e.keyCode))) d.keyTyped();
            d.keyPressed();
        });

        document.addEventListener("keyup", function(e) {
            e.preventDefault();
            d.keyIsPressed = false;
            d.key = undefined;
            d.keyCode = undefined;
            Dark.globallyUpdateVariables(d);
            d.keyReleased();
        });

        window.addEventListener("resize", function(e) {
            e.preventDefault();
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
            e.preventDefault();
            Dark.globallyUpdateVariables(d);
            d.mouseClicked();
        });

        d.canvas.addEventListener("mousedown", function(e) {
            e.preventDefault();
            d.mouseIsPressed = true;
            d.mouseButton = Dark.mouseMap[e.button];
            Dark.globallyUpdateVariables(d);
            d.mousePressed();
        });

        d.canvas.addEventListener("mouseup", function(e) {
            e.preventDefault();
            d.mouseButton = undefined;
            d.mouseIsPressed = false;
            Dark.globallyUpdateVariables(d);
            d.mouseReleased();
        });

        d.canvas.addEventListener("mouseenter", function(e) {
            e.preventDefault();
            d.mouseIsInside = true;
            Dark.globallyUpdateVariables(d);
            d.mouseIn();
        });

        d.canvas.addEventListener("mouseleave", function(e) {
            e.preventDefault();
            d.mouseIsInside = false;
            Dark.globallyUpdateVariables(d);
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
            Dark.globallyUpdateVariables(d);
            d.mouseMoved();
        });

        d.canvas.addEventListener("wheel", function(e) {
            e.preventDefault();
            d.mouseScroll = d.objects.DVector.create(e.deltaX, e.deltaY, e.deltaZ);
            Dark.globallyUpdateVariables(d);
            d.mouseScrolled();
        });

        d.canvas.addEventListener("dblclick", function(e) {
            e.preventDefault();
            Dark.globallyUpdateVariables(d);
            d.mouseDoubleClicked();
        });

    };

    var colorString = function(c) {
        return "rgba(" + d.red(c) + ", " + d.green(c) + ", " + d.blue(c) + ", " + d.alpha(c) / 255 + ")";
    };

    bulkAdd({

        // Setup functions & getters
        size: function(w = innerWidth, h = innerHeight) {
            if(typeof w == "number" && typeof h == "number" && w > 0 && h > 0) {
                // Because for some reason changing width & height reset all parameters >:(
                // It took me ~8 hours to figure this out. D:<
                let old = d.copy(d.ctx);

                [d.width, d.height] = [d.canvas.width, d.canvas.height] = [w, h];

                let ignore = [ // TODO: Move somewhere else
                    "canvas", "width", "height"
                ];

                for(const key in d.ctx) {
                    const value = old[key];
                    if(typeof value !== "function" && !ignore.includes(key)) {
                        d.ctx[key] = value;
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

                let old = d.copy(d.ctx);
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

        setTitle: function(title) {
            document.title = title;
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
                    return d.randomGenerator.next() * (args[1] - args[0]) + args[0];
                case 0:
                    return d.randomGenerator.next();
                case 1:
                    return d.randomGenerator.next() * args[0];
            }
        },

        randomSeed: function(seed) {
            if(seed != d.randomGenerator.seed) d.randomGenerator = d.objects.DRandom.create(seed);
        },

        cursor: function(type = "default") {
            d.settings.cursor = type;
            d.canvas.style.cursor = type;
        },

        noCursor: function() {
            d.settings.cursor = "none";
            d.canvas.style.cursor = "none";
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

        // Color
        color: function(r, g, b, a) {
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
                    return r;
                }
            }
            if(!a) a = 255;
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
            if(!d.settings.smoothing) weight = d.round(weight);
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
                Dark.error(new Error("Maximum matrix stack size reached, pushMatrix() called " + d.maxTransforms + " times."));
            } else {
                d.transforms.push(d.ctx.getTransform());
            }
        },

        popMatrix: function() {
            let transform = d.transforms.pop();
            if(!transform) {
                Dark.error(new Error("No more transforms to restore in popMatrix()"));
            } else {
                d.ctx.setTransform(transform);
            }
        },

        resetMatrix: function() {
            d.transforms.length = 0;
            d.ctx.resetTransform();
        },

        // pushStyle & popStyle will go here eventually

        push: function() {
            if(d.transforms.length > d.maxTransforms) {
                Dark.error(new Error("Maximum matrix stack size reached, push() called " + d.maxTransforms + " times."));
            } else {
                d.ctx.save();
                d.saves.push(Object.assign({}, d.settings));
            }
        },

        pop: function() {
            let save = d.saves.pop();
            if(!save) {
                Dark.error(new Error("No more saves to restore in pop()"));
            } else {
                d.ctx.restore();
                Object.assign(d.settings, save);
            }
        },

        reset: function() {
            d.saves.length = 0;
            d.settings = Object.assign({}, d.defaultSettings);
            d.ctx.reset();
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
        rect: function(x, y, width, height, r1, r2, r3, r4) {
            if(!d.settings.smoothing) [x, y, width, height] = [d.round(x), d.round(y), rounda(width), rounda(height)];
            d.ctx.beginPath();
            d.ctx.save();
            if(d.settings.rectMode == k.CENTER) d.ctx.translate(- width / 2, - height / 2);
            // For speed, rounded rect is so much slower
            switch(arguments.length) {
                default:
                    Dark.error(new Error("rect takes in 4, 5 or 8 parameters, not " + arguments.length));
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
            if(!d.settings.smoothing) [x, y, width, height] = [d.round(x), d.round(y), rounda(width), rounda(height)];
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
            if(!d.settings.smoothing) [x, y, width, height] = [d.round(x), d.round(y), rounda(width), rounda(height)];
            d.ctx.save();
            if(d.settings.ellipseMode == k.CORNER) d.ctx.translate(width / 2, height / 2);
            d.ctx.beginPath();
            d.ctx.ellipse(x, y, width / 2, height / 2, 0, angle(start), angle(stop), false);
            d.ctx.fill();
            d.ctx.stroke();
            d.ctx.restore();
        },

        line: function(x1, y1, x2, y2) {
            if(!d.settings.smoothing) [x1, y1, x2, y2] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2)];
            d.ctx.beginPath();
            d.ctx.moveTo(x1, y1);
            d.ctx.lineTo(x2, y2);
            d.ctx.stroke();
        },

        point: function(x, y) {
            if(!d.settings.smoothing) x = d.round(x), y = d.round(y);
            d.ctx.save();
            d.ctx.beginPath();
            d.ctx.fillStyle = colorString(d.settings.stroke);
            d.ctx.arc(x, y, d.settings.strokeWeight / 2, 0, k.TAU);
            d.ctx.fill();
            d.ctx.restore();
        },

        circle: function(x, y, radius) {
            if(!d.settings.smoothing) [x, y, radius] = [d.round(x), d.round(y), rounda(radius)];
            d.ctx.save();
            if(d.settings.ellipseMode == k.CORNER) d.ctx.translate(radius, radius);
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
            if(!d.settings.smoothing) [x1, y1, x2, y2, x3, y3] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2), d.round(x3), d.round(y3)];
            d.ctx.beginPath();
            d.ctx.moveTo(x1, y1);
            d.ctx.lineTo(x2, y2);
            d.ctx.lineTo(x3, y3);
            d.ctx.closePath();
            d.ctx.fill();
            d.ctx.stroke();
        },

        quad: function(x1, y1, x2, y2, x3, y3, x4, y4) {
            if(!d.settings.smoothing) [x1, y1, x2, y2, x3, y3, x4, y4] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2), d.round(x3), d.round(y3), d.round(x4), d.round(y4)];
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
                            // TODO: update only on curveTightness for speed
                            let t = (d.settings.curveTightness - 1) / 6;

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
            if(!d.settings.smoothing) [x, y] = [d.round(x), d.round(y)];
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
            if(!d.settings.smoothing) [x, y] = [d.round(cx), d.round(cy)];
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
            if(!d.settings.smoothing) [x1, y1, x2, y2, x3, y3] = [d.round(x1), d.round(y1), d.round(x2), d.round(y2), d.round(x3), d.round(y3)];
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

        // Copied from ProcessingJS
        curveTangent: function(a, b, c, d, t) {
            return 0.5 * ((c - a) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (3 * b - 3 * c + d - a) * t * t);
        },

        bezierTangent: function(a, b, c, d, t) {
            let i = 1 - t;
            return 3 * i * i * (b - a) + 6 * i * t * (c - b) + 3 * t * t * (d - c);
        },

        reloadFont: function() {
            d.ctx.font = d.settings.font.toString();
            d.settings.genericTextMeasure = d.ctx.measureText("0");
            d.settings.textHeight = d.settings.genericTextMeasure.fontBoundingBoxAscent + d.settings.genericTextMeasure.fontBoundingBoxDescent;
        },

        // Text
        textSize: function(size) {
            if(!d.settings.smoothing) size = d.round(size);
            d.settings.textSize = size;
            d.settings.font.size = size;
            d.reloadFont();
        },

        textAlign: function(alignX, alignY) {
            if(arguments.length == 0) alignX = k.LEFT, alignY = k.BASELINE;
            if(arguments.length == 1 && alignX == k.CENTER) alignY = k.CENTER;
            switch(alignX) {
                default:
                    Dark.error(new Error("Invalid x alignment type"));
                    break;
                case k.LEFT:
                    d.ctx.textAlign = "left";
                    d.settings.alignX = k.LEFT;
                    break;
                case k.RIGHT:
                    d.ctx.textAlign = "right";
                    d.settings.alignX = k.RIGHT;
                    break;
                case k.CENTER:
                    d.ctx.textAlign = "center";
                    d.settings.alignX = k.CENTER;
                    break;
            }
            switch(alignY) {
                default:
                    Dark.error(new Error("Invalid y alignment type"));
                    break;
                case k.BASELINE:
                    d.ctx.textBaseline = "alphabetic";
                    d.settings.alignY = k.BASELINE;
                    break;
                case k.TOP:
                    d.ctx.textBaseline = "top";
                    d.settings.alignY = k.TOP;
                    break;
                case k.BOTTOM:
                    d.ctx.textBaseline = "bottom";
                    d.settings.alignY = k.BOTTOM;
                    break;
                case k.CENTER:
                    d.ctx.textBaseline = "middle";
                    d.settings.alignY = k.CENTER;
                    break;
            }
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

        textWidth: function(text) {
            return d.ctx.measureText(text).width;
        },

        textAscent: function() {
            return d.settings.genericTextMeasure.fontBoundingBoxAscent;
        },

        textDescent: function() {
            return d.settings.genericTextMeasure.fontBoundingBoxDescent;
        },

        textLeading: function(amount) {
            d.settings.lineGap = amount;
        },

        text: function(text, x, y) {
            if(!d.settings.smoothing) [x, y] = [d.round(x), d.round(y)];
            let lines = text.split("\n");
            let off = (d.settings.alignY == k.CENTER) ? (d.settings.textHeight + d.settings.lineGap) * lines.length / 2 : 0;
            lines.forEach((line, index) => {
                let inc = index * (d.settings.textHeight + d.settings.lineGap) - off;
                d.ctx.fillText(line, x, y + inc);
                d.ctx.strokeText(line, x, y + inc);
            });
        },

        // Images
        get: function(...args) {
            if(args.length == 0) {
                return new DImage(
                    d.ctx.getImageData(0, 0, d.width, d.height),
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
            if(!d.settings.smoothing) [x, y, width, height] = [d.round(x), d.round(y), rounda(width), rounda(height)];
            d.ctx.save();
            if(img instanceof ImageData) img = new DImage(img);
            let w, h;
            switch(arguments.length) {
                default:
                    d.ctx.restore();
                    return Dark.error(new Error("image requires 1, 3, 4 or 5 parameters, not " + arguments.length));
                case 1:
                    [w, h] = [d.width, d.height];
                    break;
                case 3:
                    [w, h] = [img.width, img.height];
                    break;
                case 4:
                    [w, h] = [width, width / img.width * img.height];
                    break;
                case 5:
                    [w, h] = [width, height];
                    break;
            }
            if(d.settings.imageMode == k.CENTER) d.ctx.translate(- w / 2, - h / 2);
            d.ctx.drawImage(img.imageLoaded ? img.image : img.canvas, x, y, w, h);
            d.ctx.restore();
        },

        loadImage: function(url) {
            // TODO: delete
            if(d.began) return Dark.error(new Error("loadImage cannot be run after the setup and draw function have begun"));

            let result = new DImage(1, 1, d);
            if(Object.keys(d.imageCache).includes(url) && d.began) return d.imageCache[url];
            d.imageCache[url] = null;

            if(Dark.khan) {
                d.cachedImageCount++;
                result.image = new Image();
                result.image.src = url;
                result.image.crossOrigin = "anonymous";
                result.image.onload = () => {
                    d.imageCache[url] = result;
                    d.successfullyCachedImageCount++;

                    [result.canvas.width, result.canvas.height] = [result.width, result.height] = [result.image.width, result.image.height];
                    result.imageData = new ImageData(result.width, result.height);
                    result.ctx.drawImage(result.image, 0, 0, result.width, result.height);
                    result.updatePixels();

                    if(d.successfullyCachedImageCount == Object.keys(d.imageCache).length) d.begin();
                };
            } else {
                d.cachedImageCount++;
                fetch(url)
                    .then(response => response.blob())
                    .then(blob => {
                        result.image = new Image();
                        result.image.src = URL.createObjectURL(blob);
                        result.image.onload = () => {
                            createImageBitmap(blob)
                                .then(bitmap => {
                                    let img = new DImage(bitmap.width, bitmap.height, d.canvas);

                                    img.ctx.drawImage(bitmap, 0, 0, img.width, img.height);
                                    img.updatePixels();

                                    d.imageCache[url] = img;
                                    d.successfullyCachedImageCount++;

                                    [result.canvas.width, result.canvas.height] = [result.width, result.height] = [img.width, img.height];
                                    result.imageData = img.imageData;
                                    result.loadPixels();

                                    if(d.successfullyCachedImageCount == Object.keys(d.imageCache).length) d.begin();
                                });
                        };
                    })
                    .catch(e => Dark.error(e));
            }
            return result;
        },

        getImage: function(loc) {
            if(Dark.khan) {
                let url = "https://cdn.kastatic.org/third_party/javascript-khansrc/live-editor/build/images/" + loc + ".png";
                if(Object.keys(d.imageCache).includes(url) && d.began) return d.imageCache[url];

                let img = new d.objects.DImage(1, 1, d);
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
                    img.ctx.drawImage(img.image, 0, 0, img.width, img.height);
                    img.updatePixels();

                    if(d.successfullyCachedImageCount == Object.keys(d.imageCache).length) d.begin();
                };
                return img;
            } else {
                return loadImage(Dark.url.host + "/" + loc);
            }
        },

        filter: function(filter, value) {
            let screen = new DImage(d.ctx.getImageData(0, 0, d.width, d.height), d.canvas);
            screen.filter(filter, value);
            d.ctx.putImageData(screen.imageData, 0, 0);
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
        trim: str => str.trim()

    });

    // Draw function (raf = request animation frame)
    d.raf = function(time) {
        if(Dark.startTime > d.info.initializationTime) {
            Dark.warn("Deleting old Dark.js instance.");
            Dark.instances.splice(Dark.instances.indexOf(d), 1);
            return;
        }

        time = performance.now();

        let deltaFrame = time - lastFrame;
        let deltaTime = time - lastTime;
        lastTime = performance.now();

        let run = (deltaFrame > d.settings.frameStep - deltaTime / 2 && d.settings.looping)

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

        if(d.isMain) {
            Dark.globallyUpdateVariables(d);
        }

        requestAnimationFrame(d.raf);
    };

    // Start draw & do setup
    d.begin = function() {
        if(d.loaded && !d.began) {
            d.began = true;

            // Setup before draw loop
            d.setup();

            // Start draw function
            requestAnimationFrame(d.raf);
        }
    };

    // Set defaults
    d.frameRate(60);
    d.smooth();
    d.ellipseMode(k.CENTER);
    d.rectMode(k.CORNER);
    d.imageMode(k.CORNER);
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

    d.defaultSettings = Object.assign({}, d.settings);

    if(!d.dummy) {
        // Load event listeners for document
        loadEvents();

        // Setup later options
        d.mouse = d.objects.DVector.zero2D();
        d.pmouse = d.objects.DVector.zero2D();
        d.settings.cursor = "auto";
        d.settings.looping = true;

        if(Dark.khan) Dark.imageLocationsKA.forEach(loc => d.getImage(loc));

        addEventListener("load", () => {
            d.loaded = true;
            Dark.globallyUpdateVariables(d);
            if(!d.began && d.successfullyCachedImageCount == d.cachedImageCount) d.begin();
        });
    }
};

// List of all instances
Dark.instances = [];

// Current version
Dark.version = "pre-0.6.7.3";

// Empty functions that can be changed by the user
Dark.empties = [
    "draw",
    "setup",
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
    "pageResized"
];

// Constants
Dark.constants = {
    DAYS: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    PI: Math.PI,
    HALF_PI: Math.PI / 2,
    QUARTER_PI: Math.PI / 4,
    E: Math.E,
    PHI: Math.PHI,
    TAU: Math.PI * 2,
    EPSILON: Number.EPSILON,
    ROUND: 0,
    FLAT: 1,
    DEGREES: 2,
    RADIANS: 3,
    VERTEX: 4,
    CURVE: 5,
    SMOOTH: 6, // unused
    BEZIER: 7,
    CLOSE: 8,
    OPEN: 9,
    CENTER: 10,
    CORNER: 11,
    BOLD: 12,
    ITALIC: 13,
    NORMAL: 14,
    BEVEL: 15,
    MITER: 16,
    SQUARE: 17,
    LEFT: 18,
    RIGHT: 19,
    BASELINE: 20,
    TOP: 21,
    BOTTOM: 22,
    GET: 23,
    SET: 24,
    PERLIN: 25, // unused
    SIMPLEX: 26, // unused
    WORLEY: 27, // unused
    VALUE: 28, // unused
    RANDOM: 29, // unused
    INVERT: 30,
    OPAQUE: 31,
    GRAY: 32,
    ERODE: 33, // unused
    DILATE: 34, // unused
    THRESHOLD: 35,
    POSTERIZE: 36,
    BLUR: 37, // unused
    SHARPEN: 38, // unused
    SEPIA: 39,
    OUTLINE: 40, // unused
    EMBOSS: 41, // unused
    EDGE: 42, // unused
    COTRAST: 43, // unused
    VIGNETTE: 44,
    BRIGHTNESS: 45,
    BLACK: 46,
    WHITE: 47,
    MEDIAN: 48, // unused
    BOX: 49,
    TRANSPARENCY: 50,
    PIXELATE: 51
};

Dark.filters = [
    Dark.constants.INVERT,
    Dark.constants.OPAQUE,
    Dark.constants.GRAY,
    Dark.constants.THRESHOLD,
    Dark.constants.POSTERIZE,
    Dark.constants.SEPIA,
    Dark.constants.VIGNETTE,
    Dark.constants.BRIGHTNESS,
    Dark.constants.BLACK,
    Dark.constants.WHITE,
    Dark.constants.BOX,
    Dark.constants.TRANSPARENCY,
    Dark.constants.PIXELATE
];

// Special keys map
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
    "avatars/spunky-sam",
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
    "creatures/OhNoes-Happy",
    "creatures/OhNoes-Happy",
    "creatures/BabyWinston",
    "creatures/Winston",
    "cute/Blank",
    "cute/BrownBlock",
    "cute/CharacterBoy",
    "cute/CharacterCatGirl",
    "cute/CharacterHornGirl",
    "cute/CharacterPinkGirl",
    "cute/CharacterPinkGirl",
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
    "info",
    "empties",
    "raf",
    "begin",
    "vertices",
    "transforms",
    "vertexCache",
    "saves",
    "imageCache",
    "cachedImageCount",
    "successfullyCachedImageCount",
    "settings",
    "defaultSettings",
    "isMain",
    "canvas",
    "ctx",
    "dummy",
    "loaded",
    "began",
    "randomGenerator"
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

Dark.changeable = {};
Dark.darkObject = true;

// Constants, but not quite (can be edited)
Dark.changeable.errorCount = 0; // Since object values inside frozen object can be edited
Dark.maxErrorCount = 50;
Dark.maxTransforms = 1000;

Dark.defaultContextSettings = {
    willReadFrequently: true
};

// The current url
Dark.url = new URL(location.href);

// If on Khan Academy
Dark.khan = Dark.url.host == "www.kasandbox.org";

// If editing
Dark.editor = Dark.url.host == "127.0.0.1:4444";

// Debugging, very handy function
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
    if(typeof copied == "object") {
        return JSON.stringify(Dark.copy(obj), null, "    ");
    } else {
        return obj + "";
    }
};

Dark.rectRect = function(x1, y1, width1, height1, x2, y2, width2, height2) {
    return x1 + width1 > x2 && x1 < x2 + width2 && y1 + height1 > y2 && y1 < y2 + height2;
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
    Dark.doError("error", error);
};

Dark.observe = function(object, type, callback) {
    if(arguments.length == 3 && type != Dark.constants.GET && type != Dark.constants.SET) {
        Dark.error(new Error("Invalid type, must be either GET or SET"));
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

Dark.fileCacheKA = {
    "/filters/global.vert": "# version 300 es\nprecision lowp float;\nin vec2 pos;\nout vec2 uv;\nvoid main() {\n uv = (pos + 1.0) * 0.5; // Vertex position = -1 to 1, UV = 0 to 1\n gl_Position = vec4(pos, 0.0, 1.0);\n}",
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
    "/filters/pixelate.frag": "# version 300 es\nprecision lowp float;\nuniform sampler2D sampler;\nuniform float param;\nuniform vec2 size;\nin vec2 uv;\nout vec4 color;\nvec2 snap(vec2 point) {\n return floor(point * size / param) * param / size;\n}\nvoid main() {\n vec4 tex = texture(sampler, vec2(snap(uv)));\n \n color = tex;\n}"
};

Dark.compileListKA = [];

// https://stackoverflow.com/questions/36921947/read-a-server-side-file-using-javascript
Dark.loadFile = function(loc) {
    if(Dark.khan) {
        return Dark.fileCacheKA[loc];
    } else {
        if(!Dark.editor) loc = "https://github.com/99TheDark/Dark.js/tree/" + Dark.version + "/filters/" + loc;
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
        console.log(Dark.format(Dark.fileCacheKA));
    }
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
        if(typeof m[mainKey] == "object" && !m[mainKey].darkObject) {
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
        this.darkObject = true;

        switch(arguments.length) {
            default:
                Dark.error(new Error("DVector requires 2 or 3 parameters, not " + arguments.length));
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
        [this.x, this.y] = [0, 0];

        this.z = undefined;
        this.is2D = true;
    };
    DVector.zero3D = function() {
        return new DVector(0, 0, 0);

        this.is2D = false;
    };
    DVector.prototype.zero3D = function() {
        [this.x, this.y, this.z] = [0, 0, 0];
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
        } else {
            this.x *= v;
            this.y *= v;
            this.z *= v;
        }
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
    DVector.angle = function(v) {
        return Dark.utils.atan2(v.y, v.x);
    };
    DVector.prototype.angle = function() {
        return Dark.utils.atan2(this.y, this.x);
    };
    DVector.angleBetween = function(v1, v2) {
        return Dark.utils.atan2(v2.y - v1.y, v2.x - v1.x);
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
    };
    DVector.getRotation = function(v) {
        return Dark.utils.atan2(v.y, v.x);
    };
    DVector.prototype.getRotation = function() {
        return Dark.utils.atan2(this.y, this.x);
    };
    DVector.setRotation = function(v, ang) {
        let m = v.mag();
        return new DVector(
            m * Dark.utils.cos(ang),
            m * Dark.utils.sin(ang)
        );
    };
    DVector.prototype.setRotation = function(ang) {
        let m = this.mag();
        [this.x, this.y] = [m * Dark.utils.cos(ang), m * Dark.utils.sin(ang)];
    };
    DVector.rotate = function(v, ang) {
        v.setRotation(v.getRotation() + ang);
    };
    DVector.prototype.rotate = function(ang) {
        this.setRotation(this.getRotation() + ang);
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
            Dark.utils.lerp(v1.x, v2.x, percent),
            Dark.utils.lerp(v1.y, v2.y, percent),
            Dark.utils.lerp(v1.z, v2.z, percent)
        );
    };
    DVector.prototype.lerp = function(v, percent) {
        this.x = Dark.utils.lerp(this.x, v.x, percent);
        this.y = Dark.utils.lerp(this.y, v.y, percent);
        this.z = Dark.utils.lerp(this.z, v.z, percent);
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
                Dark.error(new Error("DVector.fromArray takes in an array of length 2 or 3, not " + arr.length));
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
    };
    DVector.prototype.toString = function() {
        if(this.is2D) return "[" + this.x + ", " + this.y + "]";
        return "[" + this.x + ", " + this.y + ", " + this.z + "]";
    };

    // Fonts
    let DFont = function(str) {
        this.darkObject = true;

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
    let DImage = function(...args) {
        this.darkObject = true;

        this.filters = {};
        if(args[0] instanceof ImageData) {
            this.imageData = args[0];
            this.source = args[1];
            this.width = args[0].width;
            this.height = args[0].height;
            this.canvas = new OffscreenCanvas(this.width, this.height);
            this.ctx = this.canvas.getContext("2d", Dark.defaultContextSettings);
            this.loadPixels();
        } else if(typeof args[0] == "number" && typeof args[1] == "number") { // width & height
            this.width = args[0];
            this.height = args[1];
            this.source = args[2];
            this.imageData = new ImageData(this.width, this.height);
            this.canvas = new OffscreenCanvas(this.width, this.height);
            this.ctx = this.canvas.getContext("2d", Dark.defaultContextSettings);
        } else {
            this.imageData = null;
            this.source = args[0];
            this.width = 0;
            this.height = 0;
        }
    };
    DImage.get = function(img, ...args) {
        return img.get.apply(null, args);
    };
    DImage.prototype.get = function(...args) {
        if(args.length == 0) { // TODO: Change to switch-case-break
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
    DImage.set = function(img, ...args) {
        img.set.apply(null, args);
    };
    DImage.prototype.set = function(x, y, col) {
        let index = (x + y * this.width) * 4;
        this.imageData.data[index] = Dark.utils.red(col);
        this.imageData.data[index + 1] = Dark.utils.green(col);
        this.imageData.data[index + 2] = Dark.utils.blue(col);
        this.imageData.data[index + 3] = Dark.utils.alpha(col);
    };
    DImage.copy = function(img) {
        return img.copy();
    };
    DImage.prototype.copy = function() {
        return new DImage(this.imageData, this.source);
    };
    DImage.resize = function(img, width, height) {
        img.resize(width, height);
    };
    DImage.prototype.resize = function(width, height) {
        if(this.width != width || this.height != height) {
            // Save pixels
            let oldCanvas = new OffscreenCanvas(this.width, this.height);
            let oldCtx = oldCanvas.getContext("2d");
            oldCtx.drawImage(this.canvas, 0, 0);

            // Resize dimensions
            [this.canvas.width, this.canvas.height] = [this.width, this.height] = [width, height];

            // Redraw
            this.ctx.drawImage(oldCanvas, 0, 0, this.width, this.height);

            this.image = undefined;
        }
    };
    DImage.prototype.loadPixels = function() {
        this.ctx.putImageData(this.imageData, 0, 0);
    };
    DImage.prototype.updatePixels = function() {
        this.imageData.data.set(this.ctx.getImageData(0, 0, this.width, this.height).data);
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
            f.gl.bufferData(f.gl.ARRAY_BUFFER, DImage.texUV, f.gl.STATIC_DRAW);

            f.fs = Float32Array.BYTES_PER_ELEMENT;

            f.posAttribLocation = f.gl.getAttribLocation(f.program, "pos");
            f.gl.vertexAttribPointer(
                f.posAttribLocation, // location
                2, // parameter count (vec2)
                f.gl.FLOAT, // type
                f.gl.FALSE, // normalized?
                2 * f.fs, // byte input size
                0 // byte offset
            );
            f.gl.enableVertexAttribArray(f.posAttribLocation);

            // Size of image, width by height.
            f.sizeUniformLocation = f.gl.getUniformLocation(f.program, "size");
            f.gl.uniform2f(f.sizeUniformLocation, this.width, this.height); // floats bc then I don't have to convert

            // If the filter has a parameter
            if(filter.param) {
                // Constrain between min and max, otherwise set to default if not defined
                if(value != undefined) {
                    value = Dark.utils.constrain(value, filter.param.min, filter.param.max);
                } else {
                    value = filter.param.default;
                }
                f.paramUniformLocation = f.gl.getUniformLocation(f.program, "param");
                f.gl.uniform1f(f.paramUniformLocation, value);
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
            f.gl.texImage2D(f.gl.TEXTURE_2D, 0, f.gl.RGBA, f.gl.RGBA, f.gl.UNSIGNED_BYTE, this.imageData);
            f.gl.bindTexture(f.gl.TEXTURE_2D, null);

            // Bind texture
            f.gl.bindTexture(f.gl.TEXTURE_2D, f.texture);
            f.gl.activeTexture(f.gl.TEXTURE0);

            f.gl.clear(f.gl.COLOR_BUFFER_BIT | f.gl.DEPTH_BUFFER_BIT);

            f.gl.drawArrays(
                f.gl.TRIANGLES, // type
                0, // offset
                6 // point count
            );

            let buffer = new Uint8ClampedArray(this.width * this.height * 4);
            f.gl.readPixels(0, 0, this.width, this.height, f.gl.RGBA, f.gl.UNSIGNED_BYTE, buffer);

            this.imageData.data.set(buffer);
            this.ctx.putImageData(this.imageData, 0, 0);

            // Reset
            this.image = null;
            this.imageLoaded = false;

            // Load to image, drawing images is faster
            if(!Dark.khan) {
                // Wait until canvas has rendered
                requestAnimationFrame(() => {
                    // Convert to blob
                    this.canvas.convertToBlob({type: "image/png"}).then(blob => {
                        this.image = new Image();
                        this.image.src = URL.createObjectURL(blob);
                        this.image.crossOrigin = "anonymous";
                        this.image.onload = () => this.imageLoaded = true; // Load
                    })
                });
            }
        } else {
            return Dark.error(new Error("Invalid filter type"));
        }
    };
    DImage.texUV = new Float32Array([ // rectangle = 2 triangles, UV mapped
        // Triangle #1
        -1, -1,
        1, -1,
        -1, 1,
        // Triangle #2
        1, 1,
        1, -1,
        -1, 1
    ]);
    DImage.globalVertexShader = Dark.loadFile("/filters/global.vert");
    DImage.filterShaders = [];
    DImage.gl_canvas = new OffscreenCanvas(0, 0);
    DImage.gl = DImage.gl_canvas.getContext("webgl2", {antialias: false});
    DImage.initializeShaders = function(arr) {
        let gl = DImage.gl;

        if(!gl) return Dark.warn("Your browser does not support WebGL2.");

        arr.forEach(function(obj) {
            let shader = Dark.loadFile("/filters/" + obj.shader + ".frag");

            vertexSource = DImage.globalVertexShader;
            fragmentSource = shader;

            vertexShader = gl.createShader(gl.VERTEX_SHADER);
            fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

            gl.shaderSource(vertexShader, vertexSource);
            gl.shaderSource(fragmentShader, fragmentSource);

            gl.compileShader(vertexShader);
            gl.compileShader(fragmentShader);

            // Check for compiler errors, very nice for debugging
            if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                return Dark.error(new Error("Error compiling vertex shader.\n\n" + gl.getShaderInfoLog(vertexShader)));
            }
            if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                return Dark.error(new Error("Error compiling fragment shader.\n\n" + gl.getShaderInfoLog(fragmentShader)));
            }

            program = gl.createProgram();

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);

            gl.linkProgram(program);

            // Check for more errors
            if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                return Dark.error(new Error("Error linking program.\n\n" + gl.getProgramInfoLog(program)));
            }
            gl.validateProgram(program);
            if(!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
                return Dark.error(new Error("Error validating program.\n\n" + gl.getProgramInfoLog(program)));
            }

            DImage.filterShaders[obj.key] = {
                shader: shader,
                param: obj.param,
                program: program
            };
        });
    };
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
            key: Dark.constants.SEPIA,
            shader: "sepia"
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
        }
    ]);

    // Matrices
    let DMatrix = function(width, height, val = 0) {
        this.darkObject = true;

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
        } else if(width instanceof DOMMatrix) {
            this.width = 4;
            this.height = 4;
            this.mat = [
                width.m11, width.m21, width.m31, width.m41,
                width.m12, width.m22, width.m32, width.m42,
                width.m13, width.m23, width.m33, width.m43,
                width.m14, width.m24, width.m34, width.m44
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
            Dark.error(new Error("Cannot add two DMatrices with different dimensions"));
        }
    };
    DMatrix.prototype.add = function(matrix) {
        this.set(DMatrix.add(this, matrix));
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
            Dark.error(new Error("Cannot subtract two DMatrices with different dimensions"));
        }
    };
    DMatrix.prototype.sub = function(matrix) {
        this.set(DMatrix.sub(this, matrix));
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
            Dark.error(new Error("Can only multiply two DMatrices with equal width and height"));
        }
    };
    DMatrix.prototype.mult = function(matrix) {
        let mat = DMatrix.mult(this, matrix);
        this.width = mat.width;
        this.height = mat.height;
        this.mat = mat.mat;
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
            Dark.error(matrix + " is not a DOMMatrix");
        }
    };
    DMatrix.prototype.fromDOMMatrix = function(matrix) {
        if(matrix instanceof DOMMatrix) {
            this.width = 4;
            this.height = 4;
            this.mat = new DMatrix(matrix).mat;
        } else {
            Dark.error(matrix + " is not a DOMMatrix");
        }
    };
    DMatrix.toDOMMatrix = function(matrix) {
        return matrix.toDOMMatrix();
    };
    DMatrix.prototype.toDOMMatrix = function() {
        return new DOMMatrix(this.toArray());
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
                str += this.mat[arr][item] + " ";
            }
            str = str.replace(/ $/, "\n");
        }
        return str;
    };

    // Psuedo-Random Number Generator
    let DRandom = function(seed = Math.random() * 1000000) {
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

    return {
        DVector: DVector,
        DFont: DFont,
        DImage: DImage,
        DMatrix: DMatrix,
        DRandom: DRandom
    };

})();

// For KA
Dark.startTime = performance.now();

// Compile for Khan Academy since all files are blocked :(
Dark.compileKA();

Dark.utils = new Dark(true); // Dummy instance for utils
Dark.setMain(new Dark()); // Default main
Dark.globallyUpdateVariables(Dark.main); // First load of variables

// Freeze objects
Object.freeze(Dark);
