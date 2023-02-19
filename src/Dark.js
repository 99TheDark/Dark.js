<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DarkJS Example</title>
    <link rel="stylesheet" href="style.css">
    <script src="../src/Dark.js"></script>
    <link rel="icon" type="image/x-icon" href="../images/favicons/favicon.ico?v=2">
</head>

<body>
    <canvas id="canvas"></canvas>
    <script>
        setCanvas(document.getElementById("canvas"));

        size(1000, 600);

        // Demo code
        draw = function() {
            background(180, 220, 240);

            strokeWeight(2);
            stroke(0);

            fill(252, 186, 3);
            rect(100, 100, 500, 400);

            fill(235, 64, 52);
            ellipse(800, 400, 200, 300);

            strokeWeight(5);
            stroke(50, 168, 82);
            line(100, 50, 500, 80);

            pushMatrix();
            translate(0, 50);
            noStroke();
            fill(66, 135, 245);
            triangle(200, 200, 150, 300, 300, 300);
            popMatrix();

            strokeWeight(3);
            stroke(255, 0, 0);
            quad(400, 200, 350, 300, 550, 300, 500, 150);

            // From https://www.khanacademy.org/computer-programming/i/1896720848
            stroke(0);
            fill(255, 0, 255);
            beginShape();
            vertex(250, 150);
            bezierVertex(350, 80, 300, 20, 200, 100);
            bezierVertex(85, 30, 40, 80, 120, 150);
            bezierVertex(50, 250, 100, 300, 202, 200);
            bezierVertex(350, 350, 350, 200, 250, 150);
            endShape();

            fill(0);
            noStroke();
            textSize(30);
            text("Dark.js", 300, 50);

            pushMatrix();
            skew(-50);
            translate(600, 100);
            rotate(-10);
            fill(0, 0, 255);
            rect(100, 100, 100, 50);
            popMatrix();

            fill(255, 0, 0);
            beginShape();
            vertex(184, 291);
            curveVertex(184, 291);
            curveVertex(168, 119);
            curveVertex(121, 117);
            vertex(132, 295);
            vertex(132, 200);
            endShape();

            stroke(0);
            strokeWeight(15);
            point(width / 2, height / 2);

            stroke(0);
            strokeWeight(2);
            mouseIsPressed ? fill(0, 0, 0, 100) & cursor("pointer") : noFill() & cursor();
            circle(mouseX, mouseY, 8);

            let img = get();
            fill(0);
            noStroke();
            rect(798, 458, 154, 94);
            image(img, 800, 460, 150, 90);
        };
    </script>
</body>

</html>
