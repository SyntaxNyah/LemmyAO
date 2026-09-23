import{Lc as k}from"./chunk-284eakdn.js";var q="sceneUboDeclaration",A=`struct Scene {viewProjection : mat4x4<f32>,
#ifdef MULTIVIEW
viewProjectionR : mat4x4<f32>,
#endif 
view : mat4x4<f32>,
projection : mat4x4<f32>,
vEyePosition : vec4<f32>,
inverseProjection : mat4x4<f32>,};
#define SCENE_UBO
var<uniform> scene : Scene;
`;if(!k.IncludesShadersStoreWGSL[q])k.IncludesShadersStoreWGSL[q]=A;var I={name:q,shader:A};var v="meshUboDeclaration",B=`struct Mesh {world : mat4x4<f32>,
visibility : f32,};var<uniform> mesh : Mesh;
#define WORLD_UBO
`;if(!k.IncludesShadersStoreWGSL[v])k.IncludesShadersStoreWGSL[v]=B;var N={name:v,shader:B};var w="defaultUboDeclaration",C="uniform diffuseLeftColor: vec4f;uniform diffuseRightColor: vec4f;uniform opacityParts: vec4f;uniform reflectionLeftColor: vec4f;uniform reflectionRightColor: vec4f;uniform refractionLeftColor: vec4f;uniform refractionRightColor: vec4f;uniform emissiveLeftColor: vec4f;uniform emissiveRightColor: vec4f;uniform vDiffuseInfos: vec2f;uniform vAmbientInfos: vec2f;uniform vOpacityInfos: vec2f;uniform vEmissiveInfos: vec2f;uniform vLightmapInfos: vec2f;uniform vSpecularInfos: vec2f;uniform vBumpInfos: vec3f;uniform diffuseMatrix: mat4x4f;uniform ambientMatrix: mat4x4f;uniform opacityMatrix: mat4x4f;uniform emissiveMatrix: mat4x4f;uniform lightmapMatrix: mat4x4f;uniform specularMatrix: mat4x4f;uniform bumpMatrix: mat4x4f;uniform vTangentSpaceParams: vec2f;uniform pointSize: f32;uniform alphaCutOff: f32;uniform refractionMatrix: mat4x4f;uniform vRefractionInfos: vec4f;uniform vRefractionPosition: vec3f;uniform vRefractionSize: vec3f;uniform vSpecularColor: vec4f;uniform vEmissiveColor: vec3f;uniform vDiffuseColor: vec4f;uniform vAmbientColor: vec3f;uniform cameraInfo: vec4f;uniform vTextureRepetitionHexTilingParams: vec4f;uniform vReflectionInfos: vec2f;uniform reflectionMatrix: mat4x4f;uniform vReflectionPosition: vec3f;uniform vReflectionSize: vec3f;\n#define ADDITIONAL_UBO_DECLARATION\n#include<sceneUboDeclaration>\n#include<meshUboDeclaration>\n";if(!k.IncludesShadersStoreWGSL[w])k.IncludesShadersStoreWGSL[w]=C;var W={name:w,shader:C};var x="mainUVVaryingDeclaration",F=`#ifdef MAINUV{X}
varying vMainUV{X}: vec2f;
#endif
`;if(!k.IncludesShadersStoreWGSL[x])k.IncludesShadersStoreWGSL[x]=F;var Z={name:x,shader:F};var z="logDepthDeclaration",G=`#ifdef LOGARITHMICDEPTH
uniform logarithmicDepthConstant: f32;varying vFragmentDepth: f32;
#endif
`;if(!k.IncludesShadersStoreWGSL[z])k.IncludesShadersStoreWGSL[z]=G;var f={name:z,shader:G};
export{I as _,N as $,W as aa,Z as ba,f as ca};

//# debugId=462DCD188BB6501D64756E2164756E21
//# sourceMappingURL=chunk-6v249pa2.js.map
