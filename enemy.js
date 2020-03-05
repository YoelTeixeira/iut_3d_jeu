var enemyShader;

function initEnemyShader() {
    enemyShader = initShaders("enemy-vs","enemy-fs");

    // active ce shader
    gl.useProgram(enemyShader);

     // adresse des variables de type uniform dans le shader
    enemyShader.enemyMatrixUniform = gl.getUniformLocation(enemyShader, "uEnemyMatrix");
    enemyShader.viewMatrixUniform = gl.getUniformLocation(enemyShader, "uViewEnemyMatrix");
    enemyShader.projMatrixUniform = gl.getUniformLocation(enemyShader, "uProjEnemyMatrix");

    console.log("enemy shader initialized");
}

function Enemy(filename) {
    this.vertexBuffer = gl.createBuffer();
    this.vertexBuffer.itemSize = 0;
    this.vertexBuffer.numItems = 0;

    this.normalBuffer = gl.createBuffer();
    this.normalBuffer.itemSize = 0;
    this.normalBuffer.numItems = 0;

    this.bbmin = [0,0,0];
    this.bbmax = [0,0,0];

    this.bbminP = [0,0,0,0];
    this.bbmaxP = [0,0,0,0];
    this.loaded = false;

    this.load(filename);
}

Enemy.prototype.computeBoundingBox = function(vertices) {
    var i,j;

    if(vertices.length>=3) {
	     this.bbmin = [vertices[0],vertices[1],vertices[2]];
       this.bbmax = [vertices[0],vertices[1],vertices[2]];
    }

    for(i=3;i<vertices.length;i+=3) {
    	for(j=0;j<3;j++) {
    	    if(vertices[i+j]>this.bbmax[j]) {
  		        this.bbmax[j] = vertices[i+j];
    	    }

    	    if(vertices[i+j]<this.bbmin[j]) {
    		      this.bbmin[j] = vertices[i+j];
    	    }
    	}
    }
}

Enemy.prototype.handleLoadedObject = function(objData) {
    var vertices = objData[0];
    var normals = objData[1];

    console.log("Nb vertices: " + vertices.length/3);

    this.computeBoundingBox(vertices);
    console.log("BBox min: "+this.bbmin[0]+","+this.bbmin[1]+","+this.bbmin[2]);
    console.log("BBox max: "+this.bbmax[0]+","+this.bbmax[1]+","+this.bbmax[2]);

    this.initParameters();

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // cree un nouveau buffer sur le GPU et l'active
    this.vertexBuffer = gl.createBuffer();
    this.vertexBuffer.itemSize = 3;
    this.vertexBuffer.numItems = vertices.length/3;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(0);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);


    this.normalBuffer = gl.createBuffer();
    this.normalBuffer.itemSize = 3;
    this.normalBuffer.numItems = normals.length/3;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.enableVertexAttribArray(1);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);


    gl.bindVertexArray(null);

    console.log("enemy initialized");
    this.loaded = true;
}


Enemy.prototype.initParameters = function() {
    this.enemyMatrix = mat4.identity();
    this.viewMatrix = mat4.identity();
    this.projMatrix = mat4.identity();

    // la caméra est positionné sur l'axe Z et regarde le point 0,0,0
    this.viewMatrix = mat4.lookAt([0,0,10],[0,0,0],[0,1,0]);

    // matrice de projection perspective classique
    this.projMatrix = mat4.perspective(45.0,1,0.1,30);

    // on utilise des variables pour se rappeler quelles sont les transformations courantes
    // rotation, translation, scaling de l'objet
    this.position = [Math.floor(Math.random() * (3 - 1 + 1) + 0),5,0]; // l'ennemi apparait en haut et de manière aléatoire pour l'axe latéral
    this.rotationY = 0.; // angle de rotation en radian autour de l'axe Y
    this.rotationX = 0.3; // angle de rotation en radian autour de l'axe X
    this.rotationZ = 3.15; // angle de rotation en radian autour de l'axe Z
    this.scale = 0.15; // mise à l'echelle (car l'objet est trop  gros par défaut)
}

Enemy.prototype.setParameters = function(elapsed) {
    // fonction appelée à chaque frame.
    // mise à jour de la matrice modèle avec les paramètres de transformation
    // les matrices view et projection ne changent pas

    this.move(-1,0); // Mouvement continu de l'ennemi du haut vers le bas

    // creation des matrices rotation/translation/scaling
    var rMat = mat4.rotate(mat4.identity(),this.rotationY,[0,1,0]);
    var rxMat = mat4.rotate(mat4.identity(),this.rotationX,[1,0,0]);
    var rzMat = mat4.rotate(mat4.identity(),this.rotationZ,[0,0,1]);
    var tMat = mat4.translate(mat4.identity(),[this.position[0],this.position[1],this.position[2]]);
    var sMat = mat4.scale(mat4.identity(),[this.scale,this.scale,this.scale]);

    // on applique les transformations successivement
    this.enemyMatrix = mat4.identity();
    this.enemyMatrix = mat4.multiply(sMat,this.enemyMatrix);
    this.enemyMatrix = mat4.multiply(rMat,this.enemyMatrix);
    this.enemyMatrix = mat4.multiply(rxMat,this.enemyMatrix);
    this.enemyMatrix = mat4.multiply(rzMat,this.enemyMatrix);
    this.enemyMatrix = mat4.multiply(tMat,this.enemyMatrix);

}

Enemy.prototype.move = function(x,y) {
    // faire bouger votre vaisseau ici. Exemple :
    this.rotationY += x*0.15; // permet de tourner autour de l'axe Y
    this.rotationX += y*0.15;
    //this.position[0] += x*0.2; // translation gauche/droite
    this.position[1] += x*0.03; // translation haut/bas
}

Enemy.prototype.getBBox = function() {
    return [this.bbminP,this.bbmaxP];
}

Enemy.prototype.sendUniformVariables = function() {
    // on envoie les matrices de transformation (enemy/view/proj) au shader
    // fonction appelée a chaque frame, avant le dessin du vaisseau
    if(this.loaded) {
    	var m = this.enemyMatrix;
    	var v = this.viewMatrix;
    	var p = this.projMatrix;

    	// envoie des matrices aux GPU
    	gl.uniformMatrix4fv(enemyShader.enemyMatrixUniform,false,this.enemyMatrix);
    	gl.uniformMatrix4fv(enemyShader.viewMatrixUniform,false,this.viewMatrix);
    	gl.uniformMatrix4fv(enemyShader.projMatrixUniform,false,this.projMatrix);

    	// calcul de la boite englobante (projetée)
    	mat4.multiplyVec4(m,[this.bbmin[0],this.bbmin[1],this.bbmin[2],1],this.bbminP);
    	mat4.multiplyVec4(m,[this.bbmax[0],this.bbmax[1],this.bbmax[2],1],this.bbmaxP);
    	mat4.multiplyVec4(v,this.bbminP);
    	mat4.multiplyVec4(v,this.bbmaxP);
    	mat4.multiplyVec4(p,this.bbminP);
    	mat4.multiplyVec4(p,this.bbmaxP);

    	this.bbminP[0] /= this.bbminP[3];
    	this.bbminP[1] /= this.bbminP[3];
    	this.bbminP[2] /= this.bbminP[3];
    	this.bbminP[3] /= this.bbminP[3];

    	this.bbmaxP[0] /= this.bbmaxP[3];
    	this.bbmaxP[1] /= this.bbmaxP[3];
    	this.bbmaxP[2] /= this.bbmaxP[3];
    	this.bbmaxP[3] /= this.bbmaxP[3];
    }
}

Enemy.prototype.shader = function() {
    return enemyShader;
}

Enemy.prototype.draw = function() {
    // cette fonction dit à la carte graphique de dessiner le vaisseau (déjà stocké en mémoire)
    if(this.loaded) {
    	gl.bindVertexArray(this.vao);
    	gl.drawArrays(gl.TRIANGLES,0,this.vertexBuffer.numItems)
    	gl.bindVertexArray(null);
    }
}

Enemy.prototype.clear = function() {
    // clear all GPU memory
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.normalBuffer);
    gl.deleteVertexArray(this.vao);
    this.loaded = false;
}

Enemy.prototype.load = function(filename) {
    // lecture du fichier, récupération des positions et des normales
    var vertices = null;
    var xmlhttp = new XMLHttpRequest();
    var instance = this;

    xmlhttp.onreadystatechange = function() {

        if (xmlhttp.readyState == XMLHttpRequest.DONE) {

            if (xmlhttp.status == 200) {

                var data = xmlhttp.responseText;

                var lines = data.split("\n");

            		var positions = [];
            		var normals = [];
            		var arrayVertex = []
            		var arrayNormal = [];

            		for ( var i = 0 ; i < lines.length ; i++ ) {
            		    var parts = lines[i].trimRight().split(' ');
            		    if ( parts.length > 0 ) {
            			switch(parts[0]) {
            			case 'v':  positions.push(
            			    vec3.create([
            				parseFloat(parts[1]),
            				parseFloat(parts[2]),
            				parseFloat(parts[3])]
            			    ));
            			    break;
            			case 'vn':
            			    normals.push(
            				vec3.create([
            				    parseFloat(parts[1]),
            				    parseFloat(parts[2]),
            				    parseFloat(parts[3])]
            				));
            			    break;
            			case 'f': {
            			    var f1 = parts[1].split('/');
            			    var f2 = parts[2].split('/');
            			    var f3 = parts[3].split('/');
            			    Array.prototype.push.apply(arrayVertex,positions[parseInt(f1[0])-1]);
            			    Array.prototype.push.apply(arrayVertex,positions[parseInt(f2[0])-1]);
            			    Array.prototype.push.apply(arrayVertex,positions[parseInt(f3[0])-1]);

            			    Array.prototype.push.apply(arrayNormal,normals[parseInt(f1[2])-1]);
            			    Array.prototype.push.apply(arrayNormal,normals[parseInt(f2[2])-1]);
            			    Array.prototype.push.apply(arrayNormal,normals[parseInt(f3[2])-1]);
            			    break;
            			}
            			default: break;
            			}
            		    }
            		}

            		var objData = [
            		    new Float32Array(arrayVertex),
            		    new Float32Array(arrayNormal)
            		]
            		instance.handleLoadedObject(objData);

            }
        }
    };

    console.log("Loading Enemy <" + filename + ">...");

    xmlhttp.open("GET", filename, true);
    xmlhttp.send();
}
