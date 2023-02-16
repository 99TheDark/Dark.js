/*

  All code by @TheDark unless noted.
  
  Minified with Toptal.

*/

var Dark={};Dark.canvas=document.createElement("canvas"),Dark.canvas.id="Dark-default-canvas",Dark.canvas.style.position="absolute",Dark.canvas.style.inset="0px",Dark.ctx=Dark.canvas.getContext("2d"),Dark.settings={},Dark.helper={},Dark.transforms=[],Dark.vertices=[],Dark.objects={},Dark.lastFrame=performance.now(),Dark.raf=()=>{},Dark.errorCount=0,Dark.maxErrorCount=50,Dark.maxTransforms=1e3;var width=Dark.canvas.width,height=Dark.canvas.height,dt=0,frameCount=0,fps=60,draw=()=>{};for(const key in Dark.constants={DAYS:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],PI:Math.PI,HALF_PI:Math.PI/2,QUARTER_PI:Math.PI/4,E:Math.E,PHI:Math.PHI,TAU:2*Math.PI,ROUND:0,FLAT:1,DEGREES:2,RADIANS:3,VERTEX:4,CURVE:5,BEZIER:6,CLOSE:7,OPEN:8,CENTER:9,CORNER:10},Dark.constants)window[key]=Dark.constants[key];Dark.helper.angle=function(t){return Dark.settings.angleMode==DEGREES?t*PI/180:t},Dark.helper.angleBack=function(t){return Dark.settings.angleMode==DEGREES?180*t/PI:t},Dark.helper.doError=function(t,e){Dark.errorCount==Dark.maxErrorCount?console.warn("Too many warnings and errors have been made, the rest will not display."):Dark.errorCount<Dark.maxErrorCount&&console[t](e),Dark.errorCount++},Dark.warn=function(t){Dark.helper.doError("warn",t)},Dark.error=function(t){Dark.helper.doError("error",t)};var copy=function(t){if("object"!=typeof t)return Dark.warn('"'+t+'" is not an object!'),t;{let e={};for(let r in t)e[r]=t[r];return e}},size=function(t=window.innerWidth,e=window.innerHeight){if("number"==typeof t&&"number"==typeof e&&width>0&&height>0){let r=copy(Dark.ctx);for(let n in width=Dark.canvas.width=t,height=Dark.canvas.height=e,Dark.ctx){let a=r[n];"canvas"!==n&&"function"!=typeof a&&(Dark.ctx[n]=a)}}},setCanvas=function(t){if(t instanceof HTMLCanvasElement){Dark.canvas=t,width=t.width,height=t.height;let e=copy(Dark.ctx);for(let r in Dark.ctx=t.getContext("2d"),Dark.ctx){let n=e[r];"canvas"!==r&&"function"!=typeof n&&(Dark.ctx[r]=n)}}},getCanvas=function(){return Dark.canvas},getContext=function(){return Dark.ctx},dist=function(t,e,r,n){let a=r-t,o=n-e;return Math.sqrt(a*a+o*o)},gamma=function(t){return Math.sqrt(TAU/t)*((t+1/(12*t+1/(10*t)))/E)**t},factorial=function(t){return Number.isInteger(t)?intFactorial(t):gamma(t+1)},intFactorial=function(t){let e=t=Math.floor(t);for(;--t>1;)e*=t;return e},choose=function(t,e){return intFactorial(t)/(intFactorial(t-e)*intFactorial(e))},random=function(...t){switch(t.length){default:return Math.random()*(t[1]-t[0])+t[0];case 0:return Math.random();case 1:return Math.random()*t[0]}},cursor=function(t){Dark.settings.cursor=t,Dark.canvas.style.cursor=t},loop=function(){Dark.settings.looping=!0},noLoop=function(){Dark.settings.looping=!1},frameRate=function(t){Dark.settings.frameStep=1e3/t},enableContextMenu=function(){Dark.settings.contextMenu=!0,Dark.canvas.oncontextmenu=!0},disableContextMenu=function(){Dark.settings.contextMenu=!1,Dark.canvas.oncontextmenu=!1},format=function(t){return"object"==typeof t&&null!==t?JSON.stringify(copy(t),null,"    "):t+""},color=function(t,e,r,n){return void 0!=t&&void 0==e&&(e=t),void 0!=e&&void 0==r&&(r=e),void 0==n&&(n=255),t=Math.min(Math.max(t,0),255),e=Math.min(Math.max(e,0),255),r=Math.min(Math.max(r,0),255),((n=Math.min(Math.max(n,0),255))<<24)+(t<<16)+(e<<8)+r},red=t=>t>>16&255,green=t=>t>>8&255,blue=t=>255&t,alpha=t=>t>>24&255,lerpColor=function(t,e,r){return color(lerp(red(t),red(e),r),lerp(green(t),green(e),r),lerp(blue(t),blue(e),r),lerp(alpha(t),alpha(e),r))};Dark.helper.colorValue=function(t,e,r,n){return void 0==t||void 0!=e?color(t,e,r,n):t<=255?color(t,t,t):t},Dark.helper.colorString=function(t){return"rgba("+red(t)+", "+green(t)+", "+blue(t)+", "+alpha(t)/255+")"};var fill=function(t,e,r,n){let a=Dark.settings.fill=Dark.helper.colorValue(t,e,r,n);Dark.ctx.fillStyle=Dark.helper.colorString(a)},noFill=function(){Dark.settings.fill=0,Dark.ctx.fillStyle="rgba(0, 0, 0, 0)"},stroke=function(t,e,r,n){let a=Dark.settings.stroke=Dark.helper.colorValue(t,e,r,n);Dark.ctx.strokeStyle=Dark.helper.colorString(a)},noStroke=function(){Dark.settings.stroke=0,Dark.ctx.strokeStyle="rgba(0, 0, 0, 0)"},background=function(t,e,r,n){Dark.ctx.save();let a=Dark.helper.colorValue(t,e,r,n);Dark.ctx.fillStyle=Dark.helper.colorString(a),Dark.ctx.fillRect(0,0,width,height),Dark.ctx.restore()},clear=function(){Dark.ctx.clearRect(0,0,width,height)},strokeCap=function(t){switch(t){default:Dark.error(Error("Invalid strokeCap type"));break;case FLAT:Dark.ctx.lineCap="butt",Dark.settings.strokeCap=FLAT;break;case ROUND:Dark.ctx.lineCap="round",Dark.settings.strokeCap=ROUND}},strokeWeight=function(t){Dark.settings.strokeWeight=t,Dark.ctx.lineWidth=t},smooth=function(){Dark.settings.smoothing=!0,Dark.ctx.imageSmoothingEnabled=!0,Dark.ctx.imageSmoothingQuality="high"},noSmooth=function(){Dark.settings.smoothing=!0,Dark.ctx.imageSmoothingEnabled=!1,Dark.ctx.imageSmoothingQuality="low"},angleMode=function(t){switch(t){default:Dark.error(Error("Invalid angleMode type"));break;case DEGREES:Dark.settings.angleMode=DEGREES;break;case RADIANS:Dark.settings.angleMode=RADIANS}},ellipseMode=function(t=CENTER){Dark.settings.ellipseMode=t},rectMode=function(t=CORNER){Dark.settings.rectMode=t},pushMatrix=function(){Dark.transforms.length>Dark.maxTransforms?Dark.error("Maximum matrix stack size reached, pushMatrix() called "+Dark.maxTransforms+" times."):Dark.transforms.push(Dark.ctx.getTransform())},popMatrix=function(){let t=Dark.transforms.pop();void 0==t?Dark.error(Error("No more transforms to restore in popMatrix")):Dark.ctx.setTransform(t)},resetMatrix=function(){Dark.transforms.length=0},translate=function(t,e){Dark.ctx.translate(t,e)},rotate=function(t){Dark.ctx.rotate(Dark.helper.angle(t))},scale=function(t,e){void 0==e?Dark.ctx.scale(t,t):Dark.ctx.scale(t,e)},skew=function(t,e=0){let r=Dark.ctx.getTransform();r.b=e,r.c=t,Dark.ctx.setTransform(r)},rect=function(t,e,r,n){Dark.ctx.beginPath(),Dark.ctx.save(),Dark.settings.rectMode==CENTER&&Dark.ctx.translate(-r/2,-n/2),Dark.ctx.rect(t,e,r,n),Dark.ctx.fill(),Dark.ctx.stroke(),Dark.ctx.restore()},ellipse=function(t,e,r,n){Dark.ctx.beginPath(),Dark.ctx.save(),Dark.settings.ellipseMode==CORNER&&Dark.ctx.translate(r/2,n/2),Dark.ctx.beginPath(),Dark.ctx.ellipse(t,e,r/2,n/2,0,0,TAU,!1),Dark.ctx.fill(),Dark.ctx.stroke(),Dark.ctx.restore()},arc=function(t,e,r,n,a,o){Dark.ctx.save(),Dark.settings.ellipseMode==CORNER&&Dark.ctx.translate(r/2,n/2),Dark.ctx.beginPath(),Dark.ctx.ellipse(t,e,r/2,n/2,0,a,o,!1),Dark.ctx.fill(),Dark.ctx.stroke(),Dark.ctx.restore()},line=function(t,e,r,n){Dark.ctx.beginPath(),Dark.ctx.moveTo(t,e),Dark.ctx.lineTo(r,n),Dark.ctx.stroke()},point=function(t,e){Dark.ctx.save(),Dark.ctx.fillStyle="rgba(0, 0, 0, 1)",Dark.settings.ellipseMode==CORNER&&Dark.ctx.translate(width/2,height/2),Dark.ctx.fill(),Dark.ctx.restore()},circle=function(t,e,r){Dark.ctx.save(),Dark.settings.ellipseMode==CORNER&&Dark.ctx.translate(r,r),Dark.ctx.beginPath(),Dark.ctx.arc(t,e,r,0,TAU),Dark.ctx.fill(),Dark.ctx.stroke(),Dark.ctx.restore()},square=function(t,e,r){rect(t,e,r,r)},triangle=function(t,e,r,n,a,o){Dark.ctx.beginPath(),Dark.ctx.moveTo(t,e),Dark.ctx.lineTo(r,n),Dark.ctx.lineTo(a,o),Dark.ctx.closePath(),Dark.ctx.fill(),Dark.ctx.stroke()},quad=function(t,e,r,n,a,o,i,s){Dark.ctx.beginPath(),Dark.ctx.moveTo(t,e),Dark.ctx.lineTo(r,n),Dark.ctx.lineTo(a,o),Dark.ctx.lineTo(i,s),Dark.ctx.closePath(),Dark.ctx.fill(),Dark.ctx.stroke()},beginShape=function(){Dark.vertices.length=0},endShape=function(t=CLOSE){Dark.vertices.length<2||Dark.vertices[0].type!=VERTEX||(Dark.ctx.beginPath(),Dark.vertices.forEach(function(t,e){if(0==e)Dark.ctx.moveTo(t.point.x,t.point.y);else switch(t.type){case VERTEX:let r=t.point;Dark.ctx.lineTo(r.x,r.y);break;case CURVE:break;case BEZIER:let n=t.points;Dark.ctx.bezierCurveTo(n[0].x,n[0].y,n[1].x,n[1].y,n[2].x,n[2].y)}}),t==CLOSE&&Dark.ctx.closePath(),Dark.ctx.fill(),Dark.ctx.stroke())},vertex=function(t,e){Dark.vertices.push({type:VERTEX,point:{x:t,y:e}})},curveVertex=function(t,e){Dark.vertices.push({type:CURVE,node:{x:t,y:e}})},bezierVertex=function(t,e,r,n,a,o){Dark.vertices.push({type:BEZIER,points:[{x:t,y:e},{x:r,y:n},{x:a,y:o}]})},bezier=function(t,e,r,n,a,o,i,s){beginShape(),vertex(t,e),bezierVertex(r,n,a,o,i,s),endShape()},textSize=function(t){Dark.settings.textSize=t,Dark.settings.font.size=t,Dark.ctx.font=Dark.settings.font.toString()},textFont=function(t){"string"==typeof t&&(t=new DFont(t)),t instanceof DFont?(Dark.settings.font=t,Dark.settings.textSize=t.size,Dark.ctx.font=t.toString()):Dark.error(t+" is not a DFont.")},text=function(t,e,r){Dark.ctx.fillText(t,e,r),Dark.ctx.strokeText(t,e,r)},min=(t,e)=>t<e?t:e,max=(t,e)=>t>e?t:e,log10=t=>Math.log10(t),log2=t=>Math.log2(t),log=t=>Math.log(t),logBase=(t,e)=>Math.log(t)/Math.log(e),mag=(t,e)=>Math.sqrt(t*t+e*e),norm=(t,e,r)=>(t-e)/(r-e),constrain=(t,e,r)=>Math.min(Math.max(t,e),r),lerp=(t,e,r)=>(e-t)*r+t,map=(t,e,r,n,a)=>n+(a-n)/(r-e)*(value-e),sq=t=>t*t,cb=t=>t*t*t,pow=(t,e)=>t**e,root=(t,e)=>t**(1/e),sqrt=t=>Math.sqrt(t),cbrt=t=>Math.cbrt(t),exp=t=>E**t,floor=t=>Math.floor(t),round=t=>Math.round(t),ceil=t=>Math.ceil(t),trunc=t=>Math.trunc(t),deci=t=>t-Math.trunc(t),abs=t=>t<0?-t:t,sign=t=>Math.sign(t),bsign=t=>t<0?-1:1,degrees=t=>180*t/PI,radians=t=>t*PI/180,millennium=()=>Math.floor(new Date().getFullYear()/1e3),century=()=>Math.floor(new Date().getFullYear()/100),decade=()=>Math.floor(new Date().getFullYear()/10),year=()=>new Date().getFullYear(),month=()=>new Date().getMonth(),day=()=>new Date().getDate(),hour=()=>new Date().getHours(),minute=()=>new Date().getMinutes(),second=()=>new Date().getSeconds(),millis=()=>Math.floor(performance.now()),micro=()=>Math.floor(1e3*performance.now()%1e3),nano=()=>Math.floor(1e6*performance.now()%1e3),today=()=>DAYS[new Date().getDay()],timezone=()=>-new Date().getTimezoneOffset()/60,degrees=t=>180*t/PI,radians=t=>t*PI/180,sin=t=>Math.sin(Dark.helper.angle(t)),cos=t=>Math.cos(Dark.helper.angle(t)),tan=t=>Math.tan(Dark.helper.angle(t)),csc=t=>1/Math.sin(Dark.helper.angle(t)),sec=t=>1/Math.cos(Dark.helper.angle(t)),cot=t=>1/Math.tan(Dark.helper.angle(t)),atan2=(t,e)=>Dark.helper.angleBack(Math.atan2(t,e)),asin=t=>Math.asin(Dark.helper.angle(t)),acos=t=>Math.acos(Dark.helper.angle(t)),atan=t=>Math.atan(Dark.helper.angle(t)),acsc=t=>Math.asin(1/Dark.helper.angle(t)),asec=t=>Math.acos(1/Dark.helper.angle(t)),acot=t=>Math.atan(1/Dark.helper.angle(t)),sinh=t=>Math.sinh(Dark.helper.angle(t)),cosh=t=>Math.cosh(Dark.helper.angle(t)),tanh=t=>Math.tanh(Dark.helper.angle(t)),csch=t=>1/Math.sinh(Dark.helper.angle(t)),sech=t=>1/Math.cosh(Dark.helper.angle(t)),coth=t=>1/Math.tanh(Dark.helper.angle(t)),asinh=t=>Math.asinh(Dark.helper.angle(t)),acosh=t=>Math.acosh(Dark.helper.angle(t)),atanh=t=>Math.atanh(Dark.helper.angle(t)),acsch=t=>Math.asinh(1/Dark.helper.angle(t)),asech=t=>Math.acosh(1/Dark.helper.angle(t)),acoth=t=>Math.atanh(1/Dark.helper.angle(t)),now=()=>performance.now(),DVector=function(t,e,r){this.x=t,this.y=e,this.z=r};DVector.add=function(t,e){return e instanceof DVector?new DVector(t.x+e.x,t.y+e.y,t.z+e.z):new DVector(t.x+e,t.y+e,t.z+e)},DVector.prototype.add=function(t){t instanceof DVector?(this.x+=t.x,this.y+=t.y,this.z+=t.z):(this.x+=t,this.y+=t,this.z+=t)},DVector.sub=function(t,e){return e instanceof DVector?new DVector(t.x-e.x,t.y-e.y,t.z-e.z):new DVector(t.x-e,t.y-e,t.z-e)},DVector.prototype.sub=function(t){t instanceof DVector?(this.x-=t.x,this.y-=t.y,this.z-=t.z):(this.x-=t,this.y-=t,this.z-=t)},DVector.mult=function(t,e){return e instanceof DVector?new DVector(t.x*e.x,t.y*e.y,t.z*e.z):new DVector(t.x*e,t.y*e,t.z*e)},DVector.prototype.mult=function(t){t instanceof DVector?(this.x*=t.x,this.y*=t.y,this.z*=t.z):(this.x*=t,this.y*=t,this.z*=t)},DVector.div=function(t,e){return e instanceof DVector?new DVector(t.x/e.x,t.y/e.y,t.z/e.z):new DVector(t.x/e,t.y/e,t.z/e)},DVector.prototype.div=function(t){t instanceof DVector?(this.x/=t.x,this.y/=t.y,this.z/=t.z):(this.x/=t,this.y/=t,this.z/=t)},DVector.pow=function(t,e){return e instanceof DVector?new DVector(t.x**e.x,t.y**e.y,t.z**e.z):new DVector(t.x**e,t.y**e,t.z**e)},DVector.prototype.pow=function(t){t instanceof DVector?(this.x**=t.x,this.y**=t.y,this.z**=t.z):(this.x**=t,this.y**=t,this.z**=t)},DVector.mag=function(t){return t.mag()},DVector.prototype.mag=function(){return void 0==this.z?Math.sqrt(this.x*this.x+this.y*this.y):Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)},DVector.magSq=function(t){return t.magSq()},DVector.prototype.magSq=function(){return void 0==this.z?this.x*this.x+this.y*this.y:this.x*this.x+this.y*this.y+this.z*this.z},DVector.normalize=function(t){let e=t.mag();if(0!=e)return DVector.div(t,e)},DVector.prototype.normalize=function(){let t=this.mag();0!=t&&this.div(t)},DVector.cross=function(t,e){return new DVector(t.y*e.z-e.y*t.z,t.z*e.x-e.z*t.x,t.x*e.y-e.x*t.y)},DVector.prototype.cross=function(t){return this.cross(t)},DVector.dot=function(t,e){return"number"==typeof e?void 0==t.z?t.x*e+t.y*e:t.x*e+t.y*e+t.z*e:void 0==t.z||void 0==e.z?t.x*e.x+t.y*e.y:t.x*e.x+t.y*e.y+t.z*e.z},DVector.prototype.dot=function(t){return DVector.dot(this,t)},DVector.flip=function(t){return new Vector(-t.x,-t.y,-t.z)},DVector.prototype.flip=function(){this.x=-this.x,this.y=-this.y,this.z=-this.z},DVector.limit=function(t,e){return t.mag()>e&&t.mult(e/t.mag()),t},DVector.prototype.limit=function(){this.mag()>max&&this.mult(max/this.mag())},DVector.lerp=function(t,e,r){return new DVector(lerp(t.x,e.x,r),lerp(t.y,e.y,r),lerp(t.z,e.z,r))},DVector.prototype.lerp=function(t,e){return DVector.lerp(this,t,e)},DVector.get=function(t){return t.get()},DVector.prototype.get=function(){return new DVector(this.x,this.y,this.z)},DVector.prototype.set=function(t){[this.x,this.y,this.z]=[t.x,t.y,t.z]},DVector.prototype.array=function(){return[this.x,this.y,this.z]},DVector.prototype.toString=function(){return"["+this.x+", "+this.y+", "+this.z+"]"};var DFont=function(t){this.style="normal",this.variant="normal",this.weight="normal",this.size=16,this.family="Arial";let e=t.split(" ");for(let r in e){let n=e[r];switch(n){case"normal":break;case"italic":this.style="italic";break;case"bold":this.weight="bold"}if("italic"===n)this.style="italic";else if("small-caps"===n)this.variant="small-caps";else if(DFont.weights.includes(n))this.weight=n;else if("normal"!==n){let a=parseInt(n);isNaN(a)?this.family=n:this.size=a}}};DFont.parse=function(t){return new DFont(t)},DFont.prototype.toString=function(){return this.style+" "+this.weight+" "+this.variant+" "+this.size+"px "+this.family},DFont.weights=["bold","bolder","lighter","100","200","300","400","500","600","700","800","900"],Dark.objects.DVector=DVector,Dark.objects.DFont=DFont,fill(255),stroke(0),strokeWeight(2),strokeCap(ROUND),smooth(),angleMode(DEGREES),frameRate(60),textFont("12px Arial"),Dark.settings.cursor="auto",Dark.settings.looping=!0,Dark.raf=function(t){let e=t-Dark.lastFrame,r=t-Dark.lastTime;e>Dark.settings.frameStep-r/2&&Dark.settings.looping&&(fps=1e3/(dt=e),draw(),Dark.lastFrame=performance.now()),Dark.lastTime=performance.now(),requestAnimationFrame(Dark.raf)},requestAnimationFrame(Dark.raf),console.log(Dark);
