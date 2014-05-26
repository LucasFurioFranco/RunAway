var isSuported = true;
// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
}
else{
	isSuported = false;
  	alert('The File APIs are not fully supported in this browser.');
}

var c = document.getElementById('canvasRunAway1');	//Armazena as informações do canvas, como largura e altura
var cGUI = document.getElementById('canvasRunAway1GUI');
var ctx = c.getContext("2d");
var ctxGUI = cGUI.getContext("2d");

ctx.font="12px Georgia";

var keyStatus = [];
var isMousePressed = false;
var map = new Map(c.width, c.height);
var p1;

if(isSuported){
	init();
}

function init(){
	/*Instancia o jogador 1 e sua arma nicial*/
	p1 = new Character("WC", 300, 10, 10);
	p1.isCPU = false;
	p1.visionColor = "rgba(0, 0, 0, 0.2)";
	for(var i=0; i<=255; i++){keyStatus[i]=0;}	//Inicializa o status das teclas
	
	loadMap();	//Carrega o mapa

	setInterval(draw,50);		//Chama a função draw a cada 50ms
	setInterval(movements,10);	//Chama a funão movements a cada 10ms
	setInterval(refresh_bullets, 3);
}

function refresh_bullets(){
	map.refresh_bullets();
}

function movements(){
	p1.move();
	map.refresh_guns();
	map.CPU_run();
}

function Bullet(coord, ang, range, speed, power, shooter, isCPU){
	this.coord = coord;
	this.ang = ang;
	this.range = range;
	this.speed = speed;
	this.power = power;
	this.shooter = shooter;
	this.isCPU = isCPU;
}
Bullet.prototype.draw = function(){
	ctx.save();
	ctx.translate(this.coord.x, this.coord.y);
	ctx.rotate(this.ang);
	ctx.fillStyle = "#000000"
	ctx.beginPath();
	ctx.moveTo(0,0);
	ctx.lineTo(0,this.speed);
	ctx.stroke();
	ctx.restore();
}

function Gun(type, range, bulletSpeed, power, precission, delay, shooter, delayRecharge, bulletCapacity){
	this.type = type;
	this.range = range;
	this.bulletSpeed = bulletSpeed;
	this.power = power;
	this.precission = precission;
	this.delay = delay;
	this.shooter = shooter;
	this.delayRecharge = delayRecharge;
	this.bulletCapacity = bulletCapacity;
	this.nBullets = bulletCapacity;
	this.delayCounter = 0;
}

function Character(name, life, posx, posy){
	this.name = name;
	this.life = life;
	this.isAlive = true;
	this.x = posx;
	this.y = posy;
	this.color = "#000000";
	this.size = 8;
	this.moveSpeed = 1;
	this.lookAtAngle = 0;

	this.visionColor = "rgba(255,0,0,0.3)";
	this.visionAngle = 2*Math.PI/3;
	this.visionRadius = 400;

	this.selectedGun = 0;
	this.gun = [];
						 //type        range, bulletSpeed  power   precission  delay  owner's name  delayRecharge clipSize
	this.gun[0] = new Gun("Pistol",     300,         2.5,    25,  Math.PI/48,   45,   this.name,     175, 		16);
	this.gun[1] = new Gun("Machine Gun",450,           3,    35,  Math.PI/24,   25,   this.name,     225, 		25);
	this.gun[2] = new Gun("Rifle",       750,           5,    85, Math.PI/120,  175,   this.name,     475, 		10);
	this.shootDelayCounter = 0;

	//IA atributes
	this.isCPU = true;
	this.iaState = 0;
	this.iaInterestCoord = new Coord(0,0);
	this.iaStateTimer = Math.random()*450;
}
Character.prototype.IA_run = function(){
	switch(this.iaState){
		//Preccessa um local randomico para analizar
		case 0:
			this.iaStateTimer--;
			if(p1.is_visible_from(this.x, this.y, this.lookAtAngle, this.visionAngle, this.gun[this.selectedGun].range)){
				this.iaStateTimer=Math.random()*500+200;
				this.iaState=2;
			}
			else if(this.iaStateTimer<=0){
				this.IA_generateNewInterestCoord();
				this.IA_lockTarget(this.iaInterestCoord.x, this.iaInterestCoord.y);
				this.iaState = 3;
				this.iaStateTimer = Math.random()*250 + 100;
			}
		break;

		//Atirando
		case 2:
			this.IA_lockTarget(p1.x, p1.y);
			this.iaInterestCoord.x = p1.x;
			this.iaInterestCoord.y = p1.y;
			this.shoot();
			this.iaStateTimer--;

			if(p1.is_visible_from(this.x, this.y, this.lookAtAngle, this.visionAngle, this.gun[this.selectedGun].range)){
				this.iaStateTimer=Math.random()*200;
				this.iaState=2;
			}
			else{
				this.iaStateTimer = Math.random()*150+100;
				this.iaState = 3;
			}
		break;

		//Andando para coordenada de interesse
		case 3:
			var x, y;
			x = this.iaInterestCoord.x-this.x;
			y = this.iaInterestCoord.y-this.y;
			this.iaStateTimer--;
			if(p1.is_visible_from(this.x, this.y, this.lookAtAngle, this.visionAngle, this.gun[this.selectedGun].range)){
				this.iaStateTimer=Math.random()*200+100;
				this.iaState=2;
			}
			else if(Math.abs(x)>2 || Math.abs(y)>2){
				if(this.moveHandler(this.moveSpeed*(x/Math.sqrt(x*x + y*y)), this.moveSpeed*(y/Math.sqrt(x*x + y*y)))){
					this.iaStateTimer = Math.random()*100;
					this.iaStateTimer = 0;
				}
			}
			else{
				this.iaStateTimer = Math.random()*250 + 100;
				this.iaStateTimer = 0;
			}
			if(this.iaStateTimer<=0){
				this.iaStateTimer = Math.random()*250 + 100;
				this.iaState = 0;
			}
		break;

		default:
		break;
	}
}
Character.prototype.IA_lockTarget = function(x, y){
	x=this.x-x;
	y=this.y-y;
	this.lookAtAngle = Math.atan2(y,x)-Math.PI;
}
Character.prototype.IA_generateNewInterestCoord = function(){
	var x=-1, y=-1;
	do{
		x = Math.random()*map.width;
		y = Math.random()*map.height;
	}while(map.willColide(x, y));
	this.iaInterestCoord.x = x;
	this.iaInterestCoord.y = y;
	this.IA_lockTarget(x,y);
}
Character.prototype.moveHandler = function(x, y){
	if(this.isAlive){
		x+=this.x;
		y+=this.y;
		if(x>0+this.size && x<c.width-this.size){
			if(y>0+this.size && y<c.height-this.size){
				if(!map.willColide(x,y, this.size)){
					this.y=y;
					this.x=x;
				}/*
				else{
					if(this.isCPU && this.iaState==3){
						this.IA_generateNewInterestCoord();
					}
				}*/
			}
		}
	}
}
Character.prototype.checkHit = function(x, y, power, shooter){
	if(this.isAlive){
		if(this.isCPU != shooter){
			var dx = Math.abs(x - this.x);
			var dy = Math.abs(y - this.y);
			var d = Math.sqrt(dx*dx + dy*dy);
			if(d<=this.size){
				this.life -= power;
				if(this.life <= 0){
					this.isAlive = false;
				}
				else if(this.isCPU){
					this.IA_lockTarget(p1.x, p1.y);
					this.iaInterestCoord.x = p1.x+dx*Math.random()-(dx/2);
					this.iaInterestCoord.y = p1.y+dy*Math.random()-(dy/2);
					this.iaState = 3;
					this.iaStateTimer = Math.floor(199 + Math.random()*150*power/5);
				}
				return true;
			}
		}
	}
	return false;
}
Character.prototype.draw = function(){
	if(this.isAlive){
		var info = this.name + " " + this.life
		ctx.fillText(info, this.x-4*info.length, this.y-this.size-4);
		if(this.isCPU && this.iaState==1 || this.iaState==2){
			//this.drawVision();
			ctx.save();	//Salva os estados do contexto
			ctx.translate(this.x,this.y);	//Translada o contexto
			ctx.rotate(this.lookAtAngle);	//Rotaciona o contexto
			ctx.beginPath();	//Inicia um novo desenho
			ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
				  //cx  cy,              	   raio       angulo inicial      angulo final
			ctx.arc( 0,  0, this.size+5, 0, 2*Math.PI);
			ctx.fill();
			ctx.restore();
		}
		ctx.fillStyle = "#000000";
		ctx.save();	//Salva os estados do contexto
		ctx.translate(this.x,this.y);	//Translada o contexto
		ctx.rotate(this.lookAtAngle);	//Rotaciona o contexto
		ctx.fillStyle = this.color;	//Escolhe a cor do desenho
		ctx.beginPath();	//Inicia um novo desenho
		ctx.arc(0, 0, this.size, 0, 2*Math.PI);	//Draws an arc (uses radian)  --- cx, cy, raio, angulo inicial, angulo final
		ctx.fill();	//Preenche o arco
		ctx.lineTo(this.size+4, 0);	//Prepara o desenho de uma linha a partir de onde parou o último desenho (arco acima)
		ctx.stroke();	//Desenha a linha
		ctx.restore();	//Restaura os estados do contexto
	}
}
Character.prototype.drawVision = function(){
	ctx.save();	//Salva os estados do contexto
	ctx.translate(this.x,this.y);	//Translada o contexto
	ctx.rotate(this.lookAtAngle);	//Rotaciona o contexto

	ctx.fillStyle = this.visionColor;	//Escolhe a cor do desenho
	ctx.beginPath();	//Inicia um novo desenho
	ctx.moveTo(0,0);
		  //cx  cy,              	   raio       angulo inicial      angulo final
	ctx.arc( 0,  0, this.gun[this.selectedGun].range, -this.visionAngle/2, this.visionAngle/2);
	ctx.lineTo(0, 0);
	ctx.fill();

	ctx.restore();
}
Character.prototype.is_visible_from = function(x, y, ang, angVis, maxdist){
	var dx, dy, d;
	
	var angRel = Math.atan2(this.y-y, this.x-x-Math.PI);
	if(angRel<0){
		angRel += 2*Math.PI;
	}

	while(ang<0){
		ang+=2*Math.PI;
	}
	while(ang>=2*Math.PI){
		ang-=2*Math.PI;
	}

	angRel = Math.abs(angRel-ang);
	if(angRel>Math.PI){
		angRel = Math.abs(angRel - 2*Math.PI);
	}

	if(angRel <= angVis/2){
		dx = x-this.x;
		dy = y-this.y;
		d = Math.sqrt(dx*dx + dy*dy);
		if(d <= maxdist){
			d=d/5;
			dx=-dx/d;
			dy=-dy/d;
			for(var i=2;i<d;i++){
				if(map.willColide(x+i*dx, y+i*dy, 1)){
					return false;
				}
			}
			return true;
		}
	}
	return false;
}
Character.prototype.shoot = function(){
	if(this.shootDelayCounter == 0 && this.isAlive){
		if(this.gun[this.selectedGun].nBullets<=0){
			this.shootDelayCounter = this.gun[this.selectedGun].delayRecharge;
			this.gun[this.selectedGun].nBullets = this.gun[this.selectedGun].bulletCapacity;
		}
		else{
			this.shootDelayCounter = this.gun[this.selectedGun].delay;	//Seta o timer para o próximo disparo
			this.gun[this.selectedGun].nBullets--;
			var angle = this.lookAtAngle;	//Angulo entre a arma e o eixo x
			var posx = this.x + Math.cos(angle)*(4+this.size);	//Coordenada x da ponta da arma
			var posy = this.y + Math.sin(angle)*(4+this.size);	//Coordenada y da ponta da arma
			angle += ((Math.random()-0.5)*2*this.gun[this.selectedGun].precission);
			map.bullets.push(new Bullet(
				new Coord(posx, posy),	//Coordenadas iniciais da bala
				angle,					//ângulo da bala
				this.gun[this.selectedGun].range,			//distância máxima da bala
				this.gun[this.selectedGun].bulletSpeed,	//velocidade da bala
				this.gun[this.selectedGun].power,			//poder da bala
				this.name,			//nome do jogador
				this.isCPU));			//Se é jogador ou CPU
										//coord, ang, range, speed, power, shooter
		}
	}
}

function Map(width, height){
	this.width = width;
	this.height = height;
	this.objects = new Array();
	this.cpuPlayers = new Array();
	this.bullets = new Array();

	this.addBot = function(name, life, posx, posy){	//NAO FUNCIONA
		this.cpuPlayers.push(new Character(name, life, posx, posy));
		this.cpuPlayers[this.cpuPlayers.length-1].color = "#FF0000";
	}
}
Map.prototype.draw = function(){
	for(var i=0; i<this.objects.length; i++){
		this.objects[i].draw();
	}
	for(var i=0; i<this.cpuPlayers.length; i++){
		this.cpuPlayers[i].draw();
	}
}
Map.prototype.willColide = function(px, py, ps){	//Calcula se a personagem colidirá com  alguma bounding box (utilizando a posição futura e seu tamanho)
	var x1, x2, y1, y2;
	for(var i=0; i<this.objects.length; i++){	//Percorre todos os objetos
		if(this.objects[i].isColidable){
			x1 = this.objects[i].boundingBox[0].x;
			y1 = this.objects[i].boundingBox[0].y;
			x2 = this.objects[i].boundingBox[1].x;
			y2 = this.objects[i].boundingBox[1].y;
			if(px>0 && px<map.height){
				if(py>0 && py<map.height){
					if(px+ps >= Math.min(x1, x2) && px-ps <= Math.max(x1, x2)){
						if(py+ps >= Math.min(y1, y2) && py-ps <= Math.max(y1, y2)){
							return true;
						}
					}
				}
			}
		}
	}
	return false;
}
Map.prototype.refresh_bullets = function(){
	var x, y, ang;
	var dx, dy;
	var power;
	for(var i=0;i<this.bullets.length;i++){
		if(this.bullets[i].range>0){
			power = this.bullets[i].power;
			ang = this.bullets[i].ang;
			dx = Math.cos(ang)*this.bullets[i].speed; 
			x = this.bullets[i].coord.x;
			dy = Math.sin(ang)*this.bullets[i].speed;
			y = this.bullets[i].coord.y;

			//Checa colisão com o mapa
			if(map.willColide(x+dx/3, y+dy/3, 1)){
				this.bullets[i].range = 0;
			}
			else if(map.willColide(x+2*dx/3, y+2*dy/3, 1)){
				this.bullets[i].range = 0;
			}
			else if(map.willColide(x+dx, y+dy, 1)){
				this.bullets[i].range = 0;
			}

			//Checa colisão com o jogador principal
			else if(p1.checkHit(x+dx/3, y+dy/3, power, this.bullets[i].isCPU)){
				this.bullets[i].range = 0;
			}
			else if(p1.checkHit(x+2*dx/3, y+2*dy/3, power, this.bullets[i].isCPU)){
				this.bullets[i].range = 0;
			}
			else if(p1.checkHit(x+dx, y+dy, power, this.bullets[i].isCPU)){
				this.bullets[i].range = 0;
			}

			for(var j=0;j<this.cpuPlayers.length;j++){
				if(this.cpuPlayers[j].checkHit(x+dx/3, y+dy/3, power, this.bullets[i].isCPU)){
					this.bullets[i].range = 0;
					break;
				}
				if(this.cpuPlayers[j].checkHit(x+2*dx/3, y+2*dy/3, power, this.bullets[i].isCPU)){
					this.bullets[i].range = 0;
					break;
				}
				if(this.cpuPlayers[j].checkHit(x+dx, y+dy, power, this.bullets[i].isCPU)){
					this.bullets[i].range = 0;
					break;
				}
			}

			if(this.bullets[i].range>0){
				this.bullets[i].range -= this.bullets[i].speed;
				this.bullets[i].coord.x=x+dx;
				this.bullets[i].coord.y=y+dy;
				this.bullets[i].draw();
			}
		}
		else{
			if(this.bullets.length>0){
				this.bullets[i] = this.bullets.pop();
			}
			else{
				this.bullets.pop();
			}
		}
	}
}
Map.prototype.refresh_guns = function(){
	if(p1.shootDelayCounter>0){
		p1.shootDelayCounter--;
	}
	else{
		p1.shootDelayCounter=0;
	}
	for(var i=0;i<this.cpuPlayers.length;i++){
		if(this.cpuPlayers[i].shootDelayCounter>0){
			this.cpuPlayers[i].shootDelayCounter--;
		}
		else{
			this.cpuPlayers[i].shootDelayCounter=0;
		}
	}
}
Map.prototype.CPU_run = function(){
	for(var i=0;i<this.cpuPlayers.length;i++){
		this.cpuPlayers[i].IA_run();
	}
}

//Define a classe Objects, que representará as paredes e outros objetos da cena
function Object(type){	//Inicialmente apenas line, rectangle e poligon
	this.type = type;	//Line, strokeRect, fillRect, textureRect
	this.color = "#000000";
	this.isFill = false;
	this.isColidable = false;
	this.coords = new Array();
	this.boundingBox = new Array();
}
Object.prototype.draw = function(){
	if(this.coords.length>0){
		ctx.save();	//Salva os estados do contexto
		ctx.fillStyle = this.color;	//Escolhe a cor do desenho
		ctx.beginPath();	//Inicia um novo desenho
		ctx.moveTo(this.coords[0].x, this.coords[0].y);
		for(var i=1;i<this.coords.length;i++){
			ctx.lineTo(this.coords[i].x, this.coords[i].y);	//Prepara o desenho de uma linha a partir de onde parou o último desenho (arco acima)
		}
		if(this.isFill==true){
			ctx.fill();	//Preenche o arco
		}
		ctx.stroke();	//Desenha a linha
		ctx.restore();	//Restaura os estados do contexto	
	}
}

//Define a classe de coordenadas
function Coord(x, y){
	this.x = x;
	this.y = y;
}

//Define a classe Bounding Box, que é responsável pela colisão do jogo
function BoundingBox(coord1, coord2, ang){
	this.coord1 = coord1;
	this.coord2 = coord2;
	this.angle = angle;
}

function draw(){
	//Desenha todos os objetos do mapa
	map.draw();

	//Desenha o jogador
	p1.draw();

	//Desenha o inventário
	draw_GUI();
}

document.onkeydown = function(e){
	e.preventDefault();
	if(e.keyCode == 49){		//1
		p1.selectedGun = 0;
	}
	else if(e.keyCode == 50){	//2
		p1.selectedGun = 1;
	}
	else if(e.keyCode == 51){	//3
		p1.selectedGun = 2;
	}
	else if(e.keyCode == 82){//R
		if(p1.gun[p1.selectedGun].nBullets<p1.gun[p1.selectedGun].bulletCapacity){
			p1.shootDelayCounter = p1.gun[p1.selectedGun].delayRecharge;
			p1.gun[p1.selectedGun].nBullets = p1.gun[p1.selectedGun].bulletCapacity;
		}
	}
	else{
		keyStatus[e.keyCode] = 1;
	}
}

document.onkeyup = function(e){
	e.preventDefault();
	keyStatus[e.keyCode] = 0;
}

document.onmousemove = function(e){
	var x, y;
	var rect = canvasRunAway1.getBoundingClientRect();
	x = e.clientX - rect.left;
	y = e.clientY - rect.top;
	p1.lookAtAngle = Math.atan2((y - p1.y),(x - p1.x));
}

document.onmousedown = function(e){
	isMousePressed = true;
	var x, y;
	var rect = canvasRunAway1.getBoundingClientRect();
	x = e.clientX - rect.left;
	y = e.clientY - rect.top;
	p1.lookAtAngle = Math.atan2((y - p1.y),(x - p1.x));
	p1.shoot();
}

document.onmouseup = function(e){
	//alert(Math.atan2(p1.y-300, p1.x-400)+"   "+p1.lookAtAngle);
	//alert(Math.atan2(p1.y-map.cpuPlayers[0].y, p1.x-map.cpuPlayers[0].x)+"   p1Ang:"+p1.lookAtAngle+       "    cpuAng: " + map.cpuPlayers[0].lookAtAngle);
	isMousePressed = false;
}

//Define todas as interações do usuário e do ambiente sobre
//o Character (seja pressionar botões ou o efeito da gravidade)
p1.move = function(){
	this.moveSpeed = (2-keyStatus[16])/2;	//Shift - Altera a velocidade de movimento do player1
	//Movimenta para cima/baixo/esquerda/direita
	if(keyStatus[87]==1){	//W
		this.moveHandler(0, -this.moveSpeed);
	}
	if(keyStatus[83]==1){	//S
		this.moveHandler(0, this.moveSpeed);
	}
	if(keyStatus[65]==1){	//A
		this.moveHandler(-this.moveSpeed, 0);
	}
	if(keyStatus[68]==1){	//D
		this.moveHandler(this.moveSpeed, 0);
	}
	if(isMousePressed && (p1.selectedGun == 1) ){
		p1.shoot();
	}
}

//Cria o mapa
function loadMap(){
	var ID = 0;
	var iaux;

	map.objects[ID] = new Object("mapbox");
	map.objects[ID].color = "#FFFF00";
	map.objects[ID].isFill = true;
	map.objects[ID].isColidable = false;
	//map.objects[ID].boundingBox = [];
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(0, 0);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(0, c.height);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(c.width, c.height);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(c.width, 0);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(0, 0);
	ID++;

	//Cria o objeto 1
	map.objects[ID] = new Object("wall");
	map.objects[ID].color = "#0000FF";
	map.objects[ID].isFill = true;
	map.objects[ID].isColidable = true;
	map.objects[ID].boundingBox = [new Coord(100, 100), new Coord(150, 150)];
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(100, 100);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(100, 150);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(150, 150);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(150, 100);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(100, 100);
	ID++;

	//Cria o objeto 2
	map.objects[ID] = new Object("wall");
	map.objects[ID].color = "#0000FF";
	map.objects[ID].isFill = true;
	map.objects[ID].isColidable = true;
	map.objects[ID].boundingBox = [new Coord(200, 200), new Coord(250, 250)];
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(200, 200);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(200, 250);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(250, 250);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(250, 200);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(200, 200);
	ID++;

	//Cria o objeto 3
	map.objects[ID] = new Object("wall");
	map.objects[ID].color = "#0000FF";
	map.objects[ID].isFill = true;
	map.objects[ID].isColidable = true;
	map.objects[ID].boundingBox = [new Coord(400, 100), new Coord(410, 350)];
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(400, 100);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(400, 350);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(410, 350);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(410, 100);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(400, 100);
	ID++;

	//Cria o objeto 4
	map.objects[ID] = new Object("wall");
	map.objects[ID].color = "#0000FF";
	map.objects[ID].isFill = true;
	map.objects[ID].isColidable = true;
	map.objects[ID].boundingBox = [new Coord(400, 100), new Coord(430, 350)];
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(400, 100);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(400, 350);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(430, 350);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(430, 100);
	map.objects[ID].coords[map.objects[ID].coords.length] = new Coord(400, 100);
	ID++;



	//Inserindo Bots
	var x = 0;
	map.cpuPlayers[x] = new Character("red1", 125, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#FF0000"
	map.cpuPlayers[x].selectedGun=0;
	x++;

	map.cpuPlayers[x] = new Character("red2", 125, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#FF0000"
	map.cpuPlayers[x].selectedGun=0;
	x++;

	map.cpuPlayers[x] = new Character("red3", 125, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#FF0000"
	map.cpuPlayers[x].selectedGun=0;
	x++;

	map.cpuPlayers[x] = new Character("red4", 125, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#FF0000"
	map.cpuPlayers[x].selectedGun=0;
	x++;

	map.cpuPlayers[x] = new Character("green1", 150, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#00FF00"
	map.cpuPlayers[x].selectedGun=1;
	x++;

	map.cpuPlayers[x] = new Character("green2", 150, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#00FF00"
	map.cpuPlayers[x].selectedGun=1;
	x++;

	map.cpuPlayers[x] = new Character("green3", 150, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#00FF00"
	map.cpuPlayers[x].selectedGun=1;
	x++;

	map.cpuPlayers[x] = new Character("blue1", 100, c.width-10, c.height-10);
	map.cpuPlayers[x].color = "#0000FF"
	map.cpuPlayers[x].selectedGun=2;
	x++;
}

function draw_GUI(){
	ctxGUI.fillStyle="#888888";
	ctxGUI.fillRect(0, 0, cGUI.width, cGUI.height);

	//Nome
	ctxGUI.fillStyle="#000000";
	ctxGUI.font="30px Georgia";
	ctxGUI.fillText(p1.name, 20, 30);

	//Recarregando
	if(p1.shootDelayCounter>0){
		ctxGUI.fillStyle="#000000";
		ctxGUI.font="20px Georgia";
		ctxGUI.fillText("Reloading: " + Math.round(p1.shootDelayCounter/50), 120, 30);
	}

	//Vida
	ctxGUI.font="20px Georgia";
	ctxGUI.fillText("life: " + p1.life, 20, 60);

	//Munições
	ctxGUI.font="20px Georgia";
	ctxGUI.fillText("Guns (" + p1.gun[p1.selectedGun].type + ")", 20, 90);

	ctxGUI.font="20px Georgia";
	ctxGUI.fillText("(1)" + p1.gun[0].type, 20, 120);
	for(var i=0; i<p1.gun[0].nBullets;i++){
		ctxGUI.fillText("|", 110+4*i, 118);
	}

	ctxGUI.font="20px Georgia";
	ctxGUI.fillText("(2)" + p1.gun[1].type, 20, 150);
	for(var i=0; i<p1.gun[1].nBullets;i++){
		ctxGUI.fillText("|", 185+4*i, 148);
	}

	ctxGUI.font="20px Georgia";
	ctxGUI.fillText("(3)" + p1.gun[2].type, 20, 180);
	for(var i=0; i<p1.gun[2].nBullets;i++){
		ctxGUI.fillText("|", 95+4*i, 178);
	}
}
