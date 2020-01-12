let c = document.getElementById("canvas");
let ctx = c.getContext("2d");

let robot = {
    pos : {x : 200, y : 200},
    radius : 20,
    speed : {x : 0, y : 0}
}

let destination = {
    pos : {x : c.width-100, y : c.height - 100},
    radius : 10,
    strength : -500
}

let obstacles = [];
let trajectory = [
    {
        x: robot.pos.x,
        y: robot.pos.y
    }
];

let potentials = [
    {
        name: "odwrotność odległości",
        calc: (r2)=>{
            return 1/Math.sqrt(r2);
        },
        defaultGains:{
            dest: -0.1,
            obstacle: 80
        }
    },
    {
        name: "stożkowy",
        calc: (r2)=>{
            return Math.sqrt(r2);
        },
        defaultGains:{
            dest: -0.1,
            obstacle: 50
        }
    },
    {
        name: "paraboidalny",
        calc: (r2)=>{
            return r2;
        },
        defaultGains:{
            dest: -0.1,
            obstacle: 50
        }
    },
    {
        name: "harmoniczny",
        calc: (r2)=>{
            return -Math.log(r2) / 2;
        },
        defaultGains:{
            dest: 0.7,
            obstacle: 100
        }
    }
]

let robotPotential = potentials[1];
let obstaclePotential = potentials[0];
let wallPotential = potentials[0];

RandInInterval = (min, max)=>{
    return min + Math.random() * (max-min)
}

for (let i = 0; i < 50; i++) {
    obstacles.push({
        pos : {x : RandInInterval(100, c.width - 100), y : RandInInterval(100, c.height - 100)},
        radius : 20,
        strength : 200,
        speed : {x : 0, y : 0},
        moveable : true
    })
}

// wals
// for (let i = 0; i < 10; i++) {
//     obstacles.push({
//         pos : {x : 700, y : 20*i + 300},
//         radius : 10,
//         strength : 200,
//         speed : {x : 0, y : 0},
//         moveable : false
//     })
// }

// for (let i = 0; i < 10; i++) {
//     obstacles.push({
//         pos : {x : 20*i + 520, y : 500},
//         radius : 10,
//         strength : 200,
//         speed : {x : 0, y : 0},
//         moveable : false
//     })
// }

const dt = 1/60;
let fps_counter = 0;
let fps = 0;

// main loop
function render() {
    Update();
    Draw();
    fps_counter++;
    requestAnimationFrame(render);
}

setInterval(()=>{
    fps = fps_counter;
    fps_counter = 0;
}, 1000);


// update
function Update() {
    UpdateRobot();
    UpdateObstacles();
}

function UpdateObstacles() {
    obstacles.forEach(obstacle => {
        if(obstacle.pos.x - obstacle.radius <= 0) {
            obstacle.speed.x = -obstacle.speed.x;
            obstacle.pos.x = obstacle.radius + 1;
        }
    
        if(obstacle.pos.y - obstacle.radius <= 0) {
            obstacle.speed.y = -obstacle.speed.y;
            obstacle.pos.y = obstacle.radius + 1;
        }
    
        if(obstacle.pos.x + obstacle.radius >= c.width) {
            obstacle.speed.x = -obstacle.speed.x;
            obstacle.pos.x = c.width - obstacle.radius - 1;
        }
    
        if(obstacle.pos.y + obstacle.radius >= c.height) {
            obstacle.speed.y = -obstacle.speed.y;
            obstacle.pos.y = c.height - obstacle.radius - 1;
        }

        obstacle.speed.x += Math.random() - 0.5; 
        obstacle.speed.y += Math.random() - 0.5; 

        if (obstacle.moveable) {
            obstacle.pos.x += obstacle.speed.x * dt;
            obstacle.pos.y += obstacle.speed.y * dt;
        }
        
    });
}

let robot_gain = -1000;

function UpdateRobot() {
    let intensivity1 = GetFieldValue(robot.pos.x + 1, robot.pos.y);
    let intensivity2 = GetFieldValue(robot.pos.x - 1, robot.pos.y);
    let intensivity3 = GetFieldValue(robot.pos.x, robot.pos.y + 1);
    let intensivity4 = GetFieldValue(robot.pos.x, robot.pos.y - 1);
    
    let dx = intensivity1 - intensivity2;
    let dy = intensivity3 - intensivity4;


    robot.speed.x = dx * robot_gain;
    robot.speed.y = dy * robot_gain;

    if(robot.pos.x - robot.radius <= 0) {
        robot.speed.x = -robot.speed.x;
        robot.pos.x = robot.radius + 1;
    }

    if(robot.pos.y - robot.radius <= 0) {
        robot.speed.y = -robot.speed.y;
        robot.pos.y = robot.radius + 1;
    }

    if(robot.pos.x + robot.radius >= c.width) {
        robot.speed.x = -robot.speed.x;
        robot.pos.x = c.width - robot.radius - 1;
    }

    if(robot.pos.y + robot.radius >= c.height) {
        robot.speed.y = -robot.speed.y;
        robot.pos.y = c.height - robot.radius - 1;
    }

    const maxSpeed = 200;
    if(robot.speed.x > maxSpeed) robot.speed.x = maxSpeed;
    if(robot.speed.y > maxSpeed) robot.speed.y = maxSpeed;
    if(robot.speed.x < -maxSpeed) robot.speed.x = -maxSpeed;
    if(robot.speed.y < -maxSpeed) robot.speed.y = -maxSpeed;


    robot.pos.x += robot.speed.x * dt;
    robot.pos.y += robot.speed.y * dt;

    if(30 < (robot.pos.x - trajectory[trajectory.length-1].x)*(robot.pos.x - trajectory[trajectory.length-1].x) + (robot.pos.y - trajectory[trajectory.length-1].y) * (robot.pos.y - trajectory[trajectory.length-1].y) ) {
        if((robot.pos.x - destination.pos.x)*(robot.pos.x - destination.pos.x) + (robot.pos.y - destination.pos.y)*(robot.pos.y - destination.pos.y) >
        (robot.radius + destination.radius)*(robot.radius + destination.radius))
        trajectory.push({
            x: robot.pos.x,
            y: robot.pos.y
        })
    }
    
}

let obstacleGain = 80;
let destGain = -0.1;
let wallGain = 3;

function GetFieldValue(x, y) {
    let intensivity = 0.0;
    obstacles.forEach(obstacle => {
        let r2 = (obstacle.pos.x - x)*(obstacle.pos.x - x) + (obstacle.pos.y - y)*(obstacle.pos.y - y) - obstacle.radius * obstacle.radius;
        if (r2<1)
            r2 = 1;
        intensivity += obstacleGain * obstaclePotential.calc(r2);
    });

    let rr2 = (destination.pos.x - x)*(destination.pos.x - x) + (destination.pos.y - y)*(destination.pos.y - y);
    intensivity -= destGain * robotPotential.calc(rr2);

    // walls potential
    // if (x < 1) {x = 1}
    // if (y < 1) {y = 1}
    // if (x > c.width) {x = c.width - 1}
    // if (y > c.height) {y = c.height - 1}
    intensivity += obstacleGain * wallGain * wallPotential.calc(x*x);
    intensivity += obstacleGain * wallGain * wallPotential.calc(y*y);
    intensivity += obstacleGain * wallGain * wallPotential.calc((c.width - x)*(c.width - x));
    intensivity += obstacleGain * wallGain * wallPotential.calc((c.height - y)*(c.height - y));


    return intensivity;
}

// draw

function Draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    DrawField(ctx, c.width, c.height);
    DrawTrajectory();
    DrawObstacles();
    DrawRobot();
    DrawDestination();
    ctx.font = "20px Arial";
    ctx.fillText("FPS: " + String(fps), 10, 20);
}

function DrawTrajectory() {
    trajectory.forEach(point => {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.stroke();
    });
}

function DrawRobot() {
    ctx.beginPath();
    ctx.arc(robot.pos.x, robot.pos.y, robot.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = "rgba(180, 0, 0, 0.7)";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#330000';
    ctx.stroke();
}

function DrawDestination() {
    ctx.beginPath();
    ctx.arc(destination.pos.x, destination.pos.y, destination.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = "rgba(0, 0, 180, 0.7)";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000033';
    ctx.stroke();
}

function DrawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.beginPath();
        ctx.arc(obstacle.pos.x, obstacle.pos.y, obstacle.radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = "rgba(0, 180, 0, 0.7)";
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#003300';
        ctx.stroke();
    });
    
}


// field drawing
const res = 20;
let map_gain = 100;
let showMap = true;
let field = [];
for(let i = 0; i < c.width/res; i++) {
    field[i] = [];
    for(let j = 0; j < c.height/res; j++) {
        field[i][j] = 0;
    }
}

let mean = 0.0;
let dev = 1.0;

function DrawField(ctx, maxX, maxY) {
    if (showMap) {
        for (let x = 0; x < maxX/res; x++) {
            for (let y = 0; y < maxY/res; y++) {
                let color = field[x][y];
                color = (color - mean) / (dev*3);
                // console.log(color);
                
                color *= 255/2;
                color += 255/2;
                // console.log(color);
                
                let r = color;
                let g = color;
                let b = color;
                let a = 255;
    
                ctx.fillStyle = "rgba("+r+","+g+","+b+","+(a/255)+")";
                ctx.fillRect( x*res, y*res, res, res )
            }
        }
    }
    
}



setInterval(()=>{
    if  (showMap) {
        
        for (let x = 0; x < c.width/res; x++) {
            for (let y = 0; y < c.height/res; y++) {
                let realX = x * res + res/2;
                let realY = y * res + res/2;
                let val = GetFieldValue(realX, realY) * map_gain;
                field[x][y] = val;
    
            }
        }

        let sum = 0.0;
        let temp = 0.0;
        field.forEach(row => {
            row.forEach(col => {
                sum += col;
                temp += (col - mean) * (col - mean);
            });
        });

        let N = field.length * field[0].length;
        mean = sum / N;
        dev = Math.sqrt(temp / (N-1));


    }
}, 100)

document.addEventListener("DOMContentLoaded", function(){
    render();

    $('#obstacleGain').change(()=>{
        obstacleGain = $('#obstacleGain')[0].value;
    })

    $('#destGain').change(()=>{
        destGain = $('#destGain')[0].value;
    })

    $('#wallGain').change(()=>{
        wallGain = $('#wallGain')[0].value;
    })
    
    $('#map_gain').change(()=>{
        map_gain = $('#map_gain')[0].value;
    })
    
    $('#robot_reset').click(()=>{
        robot.pos.x = 100;
        robot.pos.y = 100;
        trajectory = [
            {
                x: robot.pos.x,
                y: robot.pos.y
            }
        ];
    })

    $('#trajectory_reset').click(()=>{
        trajectory = [
            {
                x: robot.pos.x,
                y: robot.pos.y
            }
        ];
    })

    $('#show_map').click(()=>{
        showMap = $('#show_map')[0].checked;
    })

    $('#obstacleGain')[0].value = obstacleGain;
    $('#destGain')[0].value = destGain;
    $('#wallGain')[0].value = wallGain;
    $('#obstaclesNumber')[0].value = obstacles.length;

    for (let i = 0; i < potentials.length; i++) {
        $('#obstacleField').append(`<option value=${i} ${(i==0)?"selected":""}>${potentials[i].name}</option>`);
        $('#robotField').append(`<option value=${i} ${(i==1)?"selected":""}>${potentials[i].name}</option>`);
        $('#wallField').append(`<option value=${i} ${(i==1)?"selected":""}>${potentials[i].name}</option>`);
    }

    $('#obstacleField').change(()=>{
        let val = $('#obstacleField')[0].value;
        obstaclePotential = potentials[val];
    })

    $('#robotField').change(()=>{
        let val = $('#robotField')[0].value;
        robotPotential = potentials[val];
    })

    $('#wallField').change(()=>{
        let val = $('#wallField')[0].value;
        wallPotential = potentials[val];
    })

    $('#obstaclesNumber').change(()=>{
        let val = $('#obstaclesNumber')[0].value;
        ChangeObstaclesNumber(val);
    })

    $('#obstaclesReset').click(()=>{
        ResetObstacles();
    })
});

function ChangeObstaclesNumber(number) {
    let actualNumber = obstacles.length;
    if (actualNumber > number) { //remove some obstacles
        for (let index = 0; index < actualNumber - number; index++) {
            obstacles.pop();
        }
    }

    if (actualNumber < number) { //add some obstacles
        for (let index = 0; index < number - actualNumber; index++) {
            obstacles.push({
                pos : {x : RandInInterval(100, c.width - 100), y : RandInInterval(100, c.height - 100)},
                radius : 20,
                strength : 200,
                speed : {x : 0, y : 0},
                moveable : true
            })
        }
    }
    
}

function ResetObstacles () {
    obstacles.forEach(obstacle => {
        obstacle.pos = {x : RandInInterval(100, c.width - 100), y : RandInInterval(100, c.height - 100)};
    });
}
