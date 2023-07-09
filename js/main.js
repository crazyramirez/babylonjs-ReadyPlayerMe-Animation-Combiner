// On Document Loaded - Start Game //
document.addEventListener("DOMContentLoaded", startGame);

// Global BabylonJS Variables
var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true, { stencil: false }, true);
var scene = createScene(engine, canvas);
var camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(-90), BABYLON.Tools.ToRadians(65), 6, BABYLON.Vector3.Zero(), scene);
var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0,0,0), scene);
var hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
var shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight, true);

var ground;
var hdrTexture;
var hdrRotation = 0;

var currentAnimation;

// Create Scene
function createScene(engine, canvas) {
    // Set Canvas & Engine //
    canvas = document.getElementById("renderCanvas");
    engine.clear(new BABYLON.Color3(0, 0, 0), true, true);
    var scene = new BABYLON.Scene(engine);
    return scene;
}

// Start Game
function startGame() {
    // Set Canvas & Engine //
    var toRender = function () {
        scene.render();
    }
    engine.runRenderLoop(toRender);
    
    createCamera();

    // Hemispheric Light //
    hemiLight.intensity = 0.1;

    // Directional Light //
    dirLight.intensity = 1.0;
    dirLight.position = new BABYLON.Vector3(0,30,10);
    dirLight.direction = new BABYLON.Vector3(-2, -4, -5);

    // Cylinder Ground //
    ground = BABYLON.MeshBuilder.CreateCylinder("ground", {diameter: 7, height: 0.2, tessellation: 80}, scene);
    ground.position.y = -0.1;
    ground.isPickable = false;
    var groundMat = new BABYLON.PBRMaterial("groundMaterial", scene);
    groundMat.albedoColor = new BABYLON.Color3(0.95,0.95,0.95);
    groundMat.roughness = 0.85;
    groundMat.metallic = 0;
    ground.material = groundMat;
    ground.receiveShadows = true;

    setLighting();    
    importAnimationsAndModel();
    
    // scene.debugLayer.show({embedMode: true}).then(function () {
    // });
}

// Create ArcRotateCamera //
function createCamera() {  
    camera.position.z = 10;
    camera.setTarget(new BABYLON.Vector3(0, 1, 0));
    camera.allowUpsideDown = false;
    camera.panningSensibility = 0;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 16;
    camera.lowerBetaLimit = 0.75;
    camera.upperBetaLimit = Math.PI / 2;
    camera.panningSensibility = 0;
    camera.pinchDeltaPercentage = 0.00050;
    camera.wheelPrecision = 60;
    camera.useBouncingBehavior = false;
    camera.useAutoRotationBehavior = true;
    camera.autoRotationBehavior.idleRotationSpeed = 0.15;
    camera.radius = 5;
    camera.attachControl(canvas, true);
}

// Setup Animations & Player
var player;
var animationsGLB = [];
// Import Animations and Models
async function importAnimationsAndModel() {
    await importAnimations("/masculine/idle/M_Standing_Idle_Variations_002.glb");
    for (let index = 0; index < 9; index++) {
      var int = index + 1;
      await importAnimations("/masculine/dance/M_Dances_00" + int + ".glb");
    }
    importModel("readyplayer.glb");
}


// Import Animations
function importAnimations(animation) {
    return BABYLON.SceneLoader.ImportMeshAsync(null, "./resources/models/animations/" + animation, null, scene)
      .then((result) => {
        result.meshes.forEach(element => {
            if (element)
                element.dispose();  
        });
        animationsGLB.push(result.animationGroups[0]);
    });
}
  
// Import Model
function importModel(model) {

    BABYLON.SceneLoader.ImportMeshAsync(null, "./resources/models/" + model, null, scene)
      .then((result) => {
        player = result.meshes[0];
        player.name = "Character";
        const modelTransformNodes = player.getChildTransformNodes();
        
        animationsGLB.forEach((animation) => {
          const modelAnimationGroup = animation.clone(animation.name + "_clone", (oldTarget) => {
            return modelTransformNodes.find((node) => node.name === oldTarget.name);
          });
          animation.dispose();
        });
        
        setReflections();
        setShadows();
        scene.animationGroups[0].play(true, 1.0);
        console.log("Animations: " + scene.animationGroups);
        document.getElementById("info-text").innerHTML = "Current Animation<br>" + scene.animationGroups[0].name;
        currentAnimation = scene.animationGroups[0];
        hideLoadingView();
    });
}

// Random Number
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random Animation Function
var disableButton = false;
function randomAnimation() {  

    if (disableButton)
        return;
    disableButton = true;
    setTimeout(() => {
        disableButton = false;
    }, 1500);

    var randomNumber = getRandomInt(1, 9);
    var newAnimation = scene.animationGroups[randomNumber];
    console.log("Random Animation: " + newAnimation.name);

    scene.onBeforeRenderObservable.runCoroutineAsync(animationBlending(currentAnimation, 1.0, newAnimation, 1.0, true, 0.05));
    document.getElementById("info-text").innerHTML = "Current Animation<br>" + newAnimation.name;
}

// Animation Blending
function* animationBlending(fromAnim, fromAnimSpeedRatio, toAnim, toAnimSpeedRatio, repeat, speed)
{
    currentAnimation = toAnim;
    let currentWeight = 1;
    let newWeight = 0;
    fromAnim.stop();
    toAnim.play(repeat);
    fromAnim.speedRatio = fromAnimSpeedRatio;
    toAnim.speedRatio = toAnimSpeedRatio;
    while(newWeight < 1)
    {
        newWeight += speed;
        currentWeight -= speed;
        toAnim.setWeightForAllAnimatables(newWeight);
        fromAnim.setWeightForAllAnimatables(currentWeight);
        yield;
    }
}

// Environment Lighting
function setLighting() {
    hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./resources/env/environment_19.env", scene);
    hdrTexture.rotationY = BABYLON.Tools.ToRadians(hdrRotation);
    hdrSkybox = BABYLON.MeshBuilder.CreateBox("skybox", {size: 1024}, scene);
    var hdrSkyboxMaterial = new BABYLON.PBRMaterial("skybox", scene);
    hdrSkyboxMaterial.backFaceCulling = false;
    hdrSkyboxMaterial.reflectionTexture = hdrTexture.clone();
    hdrSkyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    hdrSkyboxMaterial.microSurface = 0.4;
    hdrSkyboxMaterial.disableLighting = true;
    hdrSkybox.material = hdrSkyboxMaterial;
    hdrSkybox.infiniteDistance = true;
}

// Set Shadows
function setShadows() {
    scene.meshes.forEach(function(mesh) {
        if (mesh.name != "skybox" 
        && mesh.name != "ground")
        {
            shadowGenerator.darkness = 0.1;
            shadowGenerator.bias = 0.00001;
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.addShadowCaster(mesh);
        }
    });
}

// Set Reflections
function setReflections() {
    scene.materials.forEach(function (material) {
        if (material.name != "skybox") {
            material.reflectionTexture = hdrTexture;
            material.reflectionTexture.level = 0.9;
            material.environmentIntensity = 0.7;
            material.disableLighting = false;
        }
    });
}

// Hide Loading View
function hideLoadingView() {
    document.getElementById("loadingDiv").style.display = "none";
}

// Resize Window
window.addEventListener("resize", function () {
    engine.resize();
});